import { createShootoutModule, shootoutEntities } from "./modules/shootout/shootout.module";
import { createDataSource } from "./shared/adapters/persistence/data-source";
import { createApp } from "./shared/http/app";
import { ShootoutEvents } from "./sse/ShootoutEvents";

const dataSource = createDataSource({
    database: process.env.DATABASE_PATH ?? "./extra-time.sqlite",
    entities: [...shootoutEntities],
});
await dataSource.initialize();

const app = createApp({
    "/shootouts": createShootoutModule({
        dataSource,
        sse: new ShootoutEvents(),
        clock: () => new Date(),
        newId: () => crypto.randomUUID(),
    }),
}, { publicDir: "./public" });

const server = Bun.serve({
    port: Number(process.env.PORT ?? 3000),
    fetch: app.fetch,
});

console.log(`Extra Time API: http://localhost:${server.port}`);

const shutdown = async () => {
    await server.stop(true);
    await dataSource.destroy();
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
