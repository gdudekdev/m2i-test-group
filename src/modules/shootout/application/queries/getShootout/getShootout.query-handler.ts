import type { QueryHandler } from "../../../../../shared/application/cqrs/QueryHandler";
import { ShootoutNotFoundError } from "../../../domain/errors";
import type { ShootoutReadRepository } from "../shootoutRead.repository";
import type { GetShootoutQuery } from "./getShootout.query";
import type { ShootoutView } from "../ShootoutView";

export class GetShootoutQueryHandler implements QueryHandler<GetShootoutQuery, ShootoutView> {
    constructor(private readonly shootouts: ShootoutReadRepository) { }

    async handle(query: GetShootoutQuery): Promise<ShootoutView> {
        const shootout = await this.shootouts.findById(query.shootoutId);
        if (!shootout) throw new ShootoutNotFoundError(query.shootoutId);
        return shootout;
    }
}
