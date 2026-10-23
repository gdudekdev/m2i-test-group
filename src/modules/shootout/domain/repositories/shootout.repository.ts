import type { Shootout } from "../aggregates/Shootout";

export interface ShootoutRepository {
    findById(id: string): Promise<Shootout | null>;
    add(shootout: Shootout): Promise<void>;
    save(shootout: Shootout, expectedVersion: number): Promise<void>;
}
