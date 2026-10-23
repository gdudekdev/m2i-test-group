import type { Context } from "hono";
import { z } from "zod";
import { parseJsonBody } from "../../../../../shared/http/parseJsonBody";
import type { RecordShotCommandHandler } from "../../../application/commands/recordShot/recordShot.command-handler";
import { RecordShotCommand } from "../../../application/commands/recordShot/recordShot.command";
import type { GetShootoutQueryHandler } from "../../../application/queries/getShootout/getShootout.query-handler";
import { GetShootoutQuery } from "../../../application/queries/getShootout/getShootout.query";
import { SHOT_OUTCOMES } from "../../../domain/types/ShotOutcome";
import { TEAMS } from "../../../domain/types/Team";
import { PLAYER_NAME_MAX_LENGTH } from "../../../domain/value-objects/PlayerName";

const recordShotSchema = z.object({
  team: z.enum(TEAMS),
  shooter: z.string().trim().min(1).max(PLAYER_NAME_MAX_LENGTH),
  goalkeeper: z.string().trim().min(1).max(PLAYER_NAME_MAX_LENGTH),
  outcome: z.enum(SHOT_OUTCOMES),
  clientShotId: z.string().min(1).max(80),
  expectedVersion: z.number().int().min(0),
});

export class RecordShotController {
  constructor(
    private readonly recordShot: RecordShotCommandHandler,
    private readonly getShootout: GetShootoutQueryHandler,
  ) { }

  async handle(context: Context): Promise<Response> {
    const body = await parseJsonBody(context, recordShotSchema);
    const shootoutId = context.req.param("id") ?? "";
    await this.recordShot.handle(
      new RecordShotCommand(
        shootoutId,
        body.team,
        body.shooter,
        body.goalkeeper,
        body.outcome,
        body.clientShotId,
        body.expectedVersion,
      ),
    );
    const shootout = await this.getShootout.handle(new GetShootoutQuery(shootoutId));
    return context.json(shootout, 201);
  }
}
