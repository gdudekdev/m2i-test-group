import type { ShootoutReadRepository } from "../../application/queries/shootoutRead.repository";
import type { ShootoutView } from "../../application/queries/ShootoutView";

export class StubShootoutReadRepository implements ShootoutReadRepository {
    private readonly views: Map<string, ShootoutView>;

    constructor(views: readonly ShootoutView[]) {
        this.views = new Map(views.map((view) => [view.id, view]));
    }

    async findById(id: string): Promise<ShootoutView | null> {
        return this.views.get(id) ?? null;
    }
}
