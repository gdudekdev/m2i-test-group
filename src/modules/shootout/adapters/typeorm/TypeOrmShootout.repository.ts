import type { DataSource } from "typeorm";
import { VersionConflictError } from "../../application/errors";
import type { ShootoutRepository } from "../../domain/repositories/shootout.repository";
import type { Shootout } from "../../domain/aggregates/Shootout";
import { ShootoutRecord } from "./entities/ShootoutRecord";
import { ShotRecord } from "./entities/ShotRecord";
import { toDomain, toShootoutRow, toShotRows } from "./ShootoutMapper";

export class TypeOrmShootoutRepository implements ShootoutRepository {
    constructor(private readonly dataSource: DataSource) { }

    async findById(id: string): Promise<Shootout | null> {
        const record = await this.dataSource.getRepository(ShootoutRecord).findOne({
            where: { id },
            relations: { shots: true },
        });
        return record ? toDomain(record) : null;
    }

    async add(shootout: Shootout): Promise<void> {
        const snapshot = shootout.toSnapshot();
        await this.dataSource.transaction(async (manager) => {
            await manager.insert(ShootoutRecord, toShootoutRow(snapshot));
            const shots = toShotRows(snapshot);
            if (shots.length > 0) await manager.insert(ShotRecord, shots);
        });
    }

    async save(shootout: Shootout, expectedVersion: number): Promise<void> {
        const snapshot = shootout.toSnapshot();
        await this.dataSource.transaction(async (manager) => {
            const { id, ...changes } = toShootoutRow(snapshot);
            const result = await manager.update(ShootoutRecord, { id, version: expectedVersion }, changes);
            if (result.affected !== 1) throw new VersionConflictError();

            const stored = await manager.count(ShotRecord, { where: { shootoutId: id } });
            const newShots = toShotRows(snapshot).slice(stored);
            if (newShots.length > 0) await manager.insert(ShotRecord, newShots);
        });
    }
}
