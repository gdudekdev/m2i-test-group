import type { Context } from "hono";
import { streamSSE } from "hono/streaming";

// Composant fourni : diffusion des séances aux spectateurs par Server-Sent Events
// (cahier des charges, section 5.4). Ne le modifiez pas. Votre code appelle
// seulement `publish` après chaque tir validé et `stream` depuis la route
// GET /shootouts/:id/events.

export const SHOOTOUT_UPDATED = "shootout.updated";

// Représentation publique d'une séance, telle que renvoyée par GET /shootouts/:id.
// Seuls `id` et `version` sont lus par le composant ; tout l'objet est transmis.
export type PublicShootout = { id: string; version: number };

type Listener = (shootout: PublicShootout) => void;

export class ShootoutEvents {
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly heartbeatMs: number;

  constructor({ heartbeatMs = 5000 }: { heartbeatMs?: number } = {}) {
    this.heartbeatMs = heartbeatMs;
  }

  // À appeler uniquement après la validation durable de la modification
  publish(shootout: PublicShootout): void {
    for (const listener of this.listeners.get(shootout.id) ?? []) listener(shootout);
  }

  // Ouvre le flux d'une séance : son état courant, puis chaque nouvelle version.
  // Retourne null si `loadCurrent` ne trouve pas la séance : à vous de répondre 404.
  async stream(
    c: Context,
    shootoutId: string,
    loadCurrent: () => Promise<PublicShootout | null>,
  ): Promise<Response | null> {
    // abonnement avant la lecture : aucune version ne peut être perdue entre les deux
    const pending: PublicShootout[] = [];
    let forward: Listener = (shootout) => pending.push(shootout);
    const unsubscribe = this.subscribe(shootoutId, (shootout) => forward(shootout));

    let current: PublicShootout | null;
    try {
      current = await loadCurrent();
    } catch (error) {
      unsubscribe();
      throw error;
    }
    if (current === null) {
      unsubscribe();
      return null;
    }
    const initial = current;

    // la page spectateur peut être ouverte depuis un fichier local
    c.header("Access-Control-Allow-Origin", "*");
    return streamSSE(c, async (stream) => {
      // écouteur posé avant tout envoi : une déconnexion précoce libère aussi l'abonnement
      const disconnected = new Promise<void>((resolve) => stream.onAbort(resolve));
      let lastVersion = -1;
      let queue = Promise.resolve();
      const send = (shootout: PublicShootout) => {
        queue = queue.then(async () => {
          if (shootout.version <= lastVersion) return;
          lastVersion = shootout.version;
          await stream.writeSSE({ event: SHOOTOUT_UPDATED, id: String(shootout.version), data: JSON.stringify(shootout) });
        });
        return queue;
      };

      await send(initial);
      for (const shootout of pending) await send(shootout);
      forward = (shootout) => void send(shootout);

      // un commentaire régulier garde la connexion ouverte (Bun coupe après 10 s d'inactivité)
      const heartbeat = setInterval(() => void stream.write(": ping\n\n"), this.heartbeatMs);
      await disconnected;
      clearInterval(heartbeat);
      unsubscribe();
    });
  }

  // Nombre de spectateurs connectés à une séance, utile au diagnostic
  subscriberCount(shootoutId: string): number {
    return this.listeners.get(shootoutId)?.size ?? 0;
  }

  private subscribe(shootoutId: string, listener: Listener): () => void {
    const listeners = this.listeners.get(shootoutId) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(shootoutId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(shootoutId);
    };
  }
}
