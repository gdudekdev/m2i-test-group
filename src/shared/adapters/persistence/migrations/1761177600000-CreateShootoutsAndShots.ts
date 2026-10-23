import type { MigrationInterface, QueryRunner } from "typeorm";

// Schéma initial : une séance (`shootouts`) et ses tirs (`shots`).
export class CreateShootoutsAndShots1761177600000 implements MigrationInterface {
  name = "CreateShootoutsAndShots1761177600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "shootouts" ("id" varchar(40) PRIMARY KEY NOT NULL, "homeTeam" varchar(80) NOT NULL, "awayTeam" varchar(80) NOT NULL, "startingTeam" varchar(10) NOT NULL, "status" varchar(20) NOT NULL, "winner" varchar(10), "score" text NOT NULL, "nextTeam" varchar(10) NOT NULL, "version" integer NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE "shots" ("shootoutId" varchar(40) NOT NULL, "sequence" integer NOT NULL, "team" varchar(10) NOT NULL, "shooter" varchar(80) NOT NULL, "goalkeeper" varchar(80) NOT NULL, "outcome" varchar(20) NOT NULL, "clientShotId" varchar(80) NOT NULL, "recordedAt" datetime NOT NULL, CONSTRAINT "FK_288b04face1ddadd70e5c2603a4" FOREIGN KEY ("shootoutId") REFERENCES "shootouts" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, PRIMARY KEY ("shootoutId", "sequence"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "shots"`);
    await queryRunner.query(`DROP TABLE "shootouts"`);
  }
}
