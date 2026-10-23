import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { SHOOTOUT_UPDATED, ShootoutEvents, type PublicShootout } from "../../src/sse/ShootoutEvents";

// Tests du composant fourni. Ils documentent son comportement : vous n'avez pas à les modifier.

type SseEvent = { event?: string; id?: string; data?: string };

function setup() {
  const events = new ShootoutEvents({ heartbeatMs: 20 });
  const shootouts = new Map<string, PublicShootout>([["s1", { id: "s1", version: 0 }]]);
  const app = new Hono();
  app.get("/shootouts/:id/events", async (c) => {
    const id = c.req.param("id");
    const response = await events.stream(c, id, async () => shootouts.get(id) ?? null);
    return response ?? c.json({ error: { code: "SHOOTOUT_NOT_FOUND", message: "Séance inconnue." } }, 404);
  });
  return { events, app };
}

// Lit le flux jusqu'à obtenir `count` événements, en ignorant les commentaires de maintien
async function readEvents(reader: ReadableStreamDefaultReader<Uint8Array>, count: number) {
  const decoder = new TextDecoder();
  const events: SseEvent[] = [];
  let buffer = "";
  while (events.length < count) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end: number;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (block.startsWith(":")) continue;
      const event: SseEvent = {};
      for (const line of block.split("\n")) {
        const [field, ...rest] = line.split(": ");
        event[field as keyof SseEvent] = rest.join(": ");
      }
      events.push(event);
    }
  }
  return events;
}

const settle = () => Bun.sleep(5);

describe("ShootoutEvents", () => {
  test("sends the current state first, then each published version", async () => {
    const { events, app } = setup();
    const res = await app.request("/shootouts/s1/events");
    const reader = res.body!.getReader();

    const [first] = await readEvents(reader, 1);
    events.publish({ id: "s1", version: 1 });
    events.publish({ id: "s1", version: 2 });
    const next = await readEvents(reader, 2);
    await reader.cancel();

    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    expect(first).toEqual({ event: SHOOTOUT_UPDATED, id: "0", data: JSON.stringify({ id: "s1", version: 0 }) });
    expect(next.map((e) => e.id)).toEqual(["1", "2"]);
  });

  test("never sends a version older than or equal to the last one sent", async () => {
    const { events, app } = setup();
    const reader = (await app.request("/shootouts/s1/events")).body!.getReader();
    await readEvents(reader, 1);

    events.publish({ id: "s1", version: 0 });
    events.publish({ id: "s1", version: 2 });
    events.publish({ id: "s1", version: 1 });
    events.publish({ id: "s1", version: 3 });
    const next = await readEvents(reader, 2);
    await reader.cancel();

    expect(next.map((e) => e.id)).toEqual(["2", "3"]);
  });

  test("only delivers the events of the requested shootout", async () => {
    const { events, app } = setup();
    const reader = (await app.request("/shootouts/s1/events")).body!.getReader();
    await readEvents(reader, 1);

    events.publish({ id: "other", version: 1 });
    events.publish({ id: "s1", version: 1 });
    const [next] = await readEvents(reader, 1);
    await reader.cancel();

    expect(JSON.parse(next!.data!)).toEqual({ id: "s1", version: 1 });
  });

  test("returns null for an unknown shootout and keeps no subscriber", async () => {
    const { events, app } = setup();

    const res = await app.request("/shootouts/unknown/events");

    expect(res.status).toBe(404);
    expect(events.subscriberCount("unknown")).toBe(0);
  });

  test("removes the subscriber when the spectator disconnects", async () => {
    const { events, app } = setup();
    const reader = (await app.request("/shootouts/s1/events")).body!.getReader();
    await readEvents(reader, 1);
    expect(events.subscriberCount("s1")).toBe(1);

    await reader.cancel();
    await settle();

    expect(events.subscriberCount("s1")).toBe(0);
  });

  test("allows a spectator page opened from another origin", async () => {
    const { app } = setup();
    const res = await app.request("/shootouts/s1/events");
    await res.body!.cancel();

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
