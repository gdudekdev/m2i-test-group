import type { DataSource } from "typeorm";
import type { Clock } from "../../shared/ports/Clock";
import type { IdGenerator } from "../../shared/ports/IdGenerator";
import type { ShootoutEvents } from "../../sse/ShootoutEvents";
import { CreateShootoutCommandHandler } from "./application/commands/createShootout/createShootout.command-handler";
import { RecordShotCommandHandler } from "./application/commands/recordShot/recordShot.command-handler";
import { GetShootoutQueryHandler } from "./application/queries/getShootout/getShootout.query-handler";
import { SseEventPublisher } from "./adapters/sse/SseEventPublisher";
import { TypeOrmShootoutRepository } from "./adapters/typeorm/TypeOrmShootout.repository";
import { TypeOrmShootoutReadRepository } from "./adapters/typeorm/TypeOrmShootoutRead.repository";
import { ShootoutRecord } from "./adapters/typeorm/entities/ShootoutRecord";
import { ShotRecord } from "./adapters/typeorm/entities/ShotRecord";
import { CreateShootoutController } from "./http/commands/createShootout/createShootout.controller";
import { GetShootoutController } from "./http/queries/getShootout/getShootout.controller";
import { GetShootoutEventsController } from "./http/queries/getShootoutEvents/getShootoutEvents.controller";
import { RecordShotController } from "./http/commands/recordShot/recordShot.controller";
import { shootoutRoutes } from "./http/shootout.routes";

export const shootoutEntities = [ShootoutRecord, ShotRecord];

export type ShootoutModuleDependencies = {
    dataSource: DataSource;
    sse: ShootoutEvents;
    clock: Clock;
    newId: IdGenerator;
};

export function createShootoutModule({ dataSource, sse, clock, newId }: ShootoutModuleDependencies) {
    const shootouts = new TypeOrmShootoutRepository(dataSource);
    const shootoutViews = new TypeOrmShootoutReadRepository(dataSource);
    const events = new SseEventPublisher(sse, shootoutViews);

    const getShootout = new GetShootoutQueryHandler(shootoutViews);
    const createShootout = new CreateShootoutCommandHandler(shootouts, events, clock, newId);
    const recordShot = new RecordShotCommandHandler(shootouts, events, clock);

    return shootoutRoutes({
        createShootout: new CreateShootoutController(createShootout, getShootout),
        getShootout: new GetShootoutController(getShootout),
        getShootoutEvents: new GetShootoutEventsController(sse, getShootout),
        recordShot: new RecordShotController(recordShot, getShootout),
    });
}
