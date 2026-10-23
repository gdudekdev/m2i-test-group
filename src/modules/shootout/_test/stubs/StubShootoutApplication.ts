import type { Shootout } from "../../domain/aggregates/Shootout";
import type { ShootoutSnapshot } from "../../domain/types/ShootoutSnapshot";
import type { CreateShootoutCommand } from "../../application/commands/createShootout/createShootout.command";
import { CreateShootoutCommandHandler } from "../../application/commands/createShootout/createShootout.command-handler";
import type { RecordShotCommand } from "../../application/commands/recordShot/recordShot.command";
import { RecordShotCommandHandler } from "../../application/commands/recordShot/recordShot.command-handler";
import type { GetShootoutQuery } from "../../application/queries/getShootout/getShootout.query";
import { GetShootoutQueryHandler } from "../../application/queries/getShootout/getShootout.query-handler";
import type { ShootoutView } from "../../application/queries/ShootoutView";
import { CREATED_AT, RECORDED_AT } from "../fixtures/shootout.fixtures";
import { StubEventPublisher, type PublishedEvent } from "./StubEventPublisher";
import { StubShootoutReadRepository } from "./StubShootoutReadRepository";
import { StubShootoutRepository } from "./StubShootoutRepository";

type Handler<TInput> = { handle(input: TInput): Promise<unknown> };

export const given = (...shootouts: Shootout[]) => new StubShootoutApplication(shootouts, []);

export const givenViews = (...views: ShootoutView[]) => new StubShootoutApplication([], views);

export class StubShootoutApplication {
    result: unknown;
    error: unknown;

    private readonly repository: StubShootoutRepository;
    private readonly events: StubEventPublisher;
    private readonly handlers;

    constructor(shootouts: readonly Shootout[], views: readonly ShootoutView[]) {
        let nextId = 0;
        this.repository = new StubShootoutRepository(shootouts);
        this.events = new StubEventPublisher((id) => this.repository.current(id)?.version);
        this.handlers = {
            createShootout: new CreateShootoutCommandHandler(this.repository, this.events, () => CREATED_AT, () => `shootout-${++nextId}`),
            recordShot: new RecordShotCommandHandler(this.repository, this.events, () => RECORDED_AT),
            getShootout: new GetShootoutQueryHandler(new StubShootoutReadRepository(views)),
        };
    }

    createShootout(command: CreateShootoutCommand): Promise<void> {
        return this.run(this.handlers.createShootout, command);
    }

    recordShot(command: RecordShotCommand): Promise<void> {
        return this.run(this.handlers.recordShot, command);
    }

    getShootout(query: GetShootoutQuery): Promise<void> {
        return this.run(this.handlers.getShootout, query);
    }

    withConcurrentWrite(write: (found: Shootout) => Shootout): this {
        this.repository.concurrentWriteAfterNextRead(write);
        return this;
    }

    stored(id = "shootout-1"): ShootoutSnapshot | undefined {
        return this.repository.current(id)?.toSnapshot();
    }

    published(): PublishedEvent[] {
        return this.events.published;
    }

    hasNoSideEffect(): boolean {
        return this.repository.writeCount === 0 && this.events.published.length === 0;
    }

    private async run<TInput>(handler: Handler<TInput>, input: TInput): Promise<void> {
        this.result = undefined;
        this.error = undefined;
        try {
            this.result = await handler.handle(input);
        } catch (error) {
            this.error = error;
        }
    }
}
