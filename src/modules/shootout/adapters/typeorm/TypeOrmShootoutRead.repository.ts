import type { DataSource } from "typeorm";
import type { ShootoutReadRepository } from "../../application/queries/shootoutRead.repository";
import type { ShootoutView } from "../../application/queries/ShootoutView";
import { ShootoutRecord } from "./entities/ShootoutRecord";
import { toView } from "./ShootoutMapper";

export class TypeOrmShootoutReadRepository implements ShootoutReadRepository {
    constructor(private readonly dataSource: DataSource) { }

    async findById(id: string): Promise<ShootoutView | null> {
        const record = await this.dataSource.getRepository(ShootoutRecord).findOne({
            where: { id },
            relations: { shots: true },
        });
        return record ? toView(record) : null;
    }
}
