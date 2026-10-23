import type { ShootoutView } from "./ShootoutView";

export interface ShootoutReadRepository {
    findById(id: string): Promise<ShootoutView | null>;
}
