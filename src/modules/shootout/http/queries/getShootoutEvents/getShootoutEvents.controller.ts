import type { Context } from "hono";
import type { ShootoutEvents } from "../../../../../sse/ShootoutEvents";
import { ShootoutNotFoundError } from "../../../domain/errors";
import { GetShootoutQuery } from "../../../application/queries/getShootout/getShootout.query";
import type { GetShootoutQueryHandler } from "../../../application/queries/getShootout/getShootout.query-handler";

export class GetShootoutEventsController {
    constructor(
        private readonly sse: ShootoutEvents,
        private readonly getShootout: GetShootoutQueryHandler,
    ) { }

    async handle(context: Context): Promise<Response> {
        const shootoutId = context.req.param("id") ?? "";
        const response = await this.sse.stream(context, shootoutId, () => this.loadCurrent(shootoutId));
        if (!response) throw new ShootoutNotFoundError(shootoutId);
        return response;
    }

    private async loadCurrent(shootoutId: string) {
        try {
            return await this.getShootout.handle(new GetShootoutQuery(shootoutId));
        } catch (error) {
            if (error instanceof ShootoutNotFoundError) return null;
            throw error;
        }
    }
}
