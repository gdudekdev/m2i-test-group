import type { Shootout } from "../../domain/aggregates/Shootout";
import { VersionConflictError } from "../../application/errors";
import type { ShootoutRepository } from "../../domain/repositories/shootout.repository";

export class StubShootoutRepository implements ShootoutRepository {
    private readonly store: Map<string, Shootout>;
    private writeAfterNextRead: ((found: Shootout) => Shootout) | null = null;
    writeCount = 0;

    constructor(shootouts: readonly Shootout[]) {
        this.store = new Map(shootouts.map((shootout) => [shootout.id, shootout]));
    }

    async findById(id: string): Promise<Shootout | null> {
        const found = this.store.get(id) ?? null;
        if (found && this.writeAfterNextRead) {
            this.store.set(id, this.writeAfterNextRead(found));
            this.writeAfterNextRead = null;
        }
        return found;
    }

    async add(shootout: Shootout): Promise<void> {
        this.write(shootout);
    }

    async save(shootout: Shootout, expectedVersion: number): Promise<void> {
        if (this.store.get(shootout.id)?.version !== expectedVersion) throw new VersionConflictError();
        this.write(shootout);
    }

    current(id: string): Shootout | undefined {
        return this.store.get(id);
    }

    concurrentWriteAfterNextRead(write: (found: Shootout) => Shootout): void {
        this.writeAfterNextRead = write;
    }

    private write(shootout: Shootout): void {
        this.store.set(shootout.id, shootout);
        this.writeCount++;
    }
}
