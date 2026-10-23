import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { CreateShootoutsAndShots1761177600000 } from "./migrations/1761177600000-CreateShootoutsAndShots";
import { MakeNextTeamNullable1761264000000 } from "./migrations/1761264000000-MakeNextTeamNullable";

// Le même assemblage sert à SQLite en mémoire (`:memory:`) pour les tests et à
// un fichier SQLite sinon. Dans les deux cas, le moteur SQL est réel.
export function createDataSource({
  database,
  entities = [],
}: {
  database: string;
  entities?: DataSourceOptions["entities"];
}) {
  return new DataSource({
    type: "sqljs",
    ...(database === ":memory:"
      ? {}
      : { location: database, autoSave: true }),
    entities,
    migrations: [CreateShootoutsAndShots1761177600000, MakeNextTeamNullable1761264000000],
    migrationsRun: false,
    // Le schéma est produit par les migrations, jamais implicitement.
    synchronize: false,
  });
}
