import { Hono } from "hono";
import type { CreateShootoutController } from "./commands/createShootout/createShootout.controller";
import type { GetShootoutController } from "./queries/getShootout/getShootout.controller";
import type { GetShootoutEventsController } from "./queries/getShootoutEvents/getShootoutEvents.controller";
import type { RecordShotController } from "./commands/recordShot/recordShot.controller";

export type ShootoutControllers = {
  createShootout: CreateShootoutController;
  getShootout: GetShootoutController;
  getShootoutEvents: GetShootoutEventsController;
  recordShot: RecordShotController;
};

export function shootoutRoutes(controllers: ShootoutControllers) {
  return new Hono()
    .post("/", (context) => controllers.createShootout.handle(context))
    .get("/:id", (context) => controllers.getShootout.handle(context))
    .get("/:id/events", (context) => controllers.getShootoutEvents.handle(context))
    .post("/:id/shots", (context) => controllers.recordShot.handle(context));
}
