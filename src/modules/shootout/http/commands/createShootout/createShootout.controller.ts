import type { Context } from "hono";
import { z } from "zod";
import { parseJsonBody } from "../../../../../shared/http/parseJsonBody";
import { CreateShootoutCommand } from "../../../application/commands/createShootout/createShootout.command";
import type { CreateShootoutCommandHandler } from "../../../application/commands/createShootout/createShootout.command-handler";
import type { GetShootoutQueryHandler } from "../../../application/queries/getShootout/getShootout.query-handler";
import { GetShootoutQuery } from "../../../application/queries/getShootout/getShootout.query";
import { TEAMS } from "../../../domain/types/Team";
import { TEAM_NAME_MAX_LENGTH } from "../../../domain/value-objects/TeamName";

const createShootoutSchema = z.object({
  homeTeam: z.string().trim().min(1).max(TEAM_NAME_MAX_LENGTH),
  awayTeam: z.string().trim().min(1).max(TEAM_NAME_MAX_LENGTH),
  startingTeam: z.enum(TEAMS),
});

export class CreateShootoutController {
  constructor(
    private readonly createShootout: CreateShootoutCommandHandler,
    private readonly getShootout: GetShootoutQueryHandler,
  ) { }

  async handle(context: Context): Promise<Response> {
    const body = await parseJsonBody(context, createShootoutSchema);
    const { id } = await this.createShootout.handle(
      new CreateShootoutCommand(body.homeTeam, body.awayTeam, body.startingTeam),
    );
    const shootout = await this.getShootout.handle(new GetShootoutQuery(id));
    context.header("Location", `/shootouts/${id}`);
    return context.json(shootout, 201);
  }
}
