import type { Context } from "hono";
import type { GetShootoutQueryHandler } from "../../../application/queries/getShootout/getShootout.query-handler";
import { GetShootoutQuery } from "../../../application/queries/getShootout/getShootout.query";

export class GetShootoutController {
    constructor(private readonly getShootout: GetShootoutQueryHandler) { }

    async handle(context: Context): Promise<Response> {
        const shootout = await this.getShootout.handle(new GetShootoutQuery(context.req.param("id") ?? ""));
        return context.json(shootout, 200);
    }
}
