import { createDataSource } from "./shared/adapters/persistence/data-source";

const dataSource = createDataSource({
  database: process.env.DATABASE_PATH ?? "./extra-time.sqlite",
});
await dataSource.initialize();
await dataSource.runMigrations();
await dataSource.destroy();
