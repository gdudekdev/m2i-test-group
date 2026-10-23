import type { MigrationInterface, QueryRunner } from "typeorm";

export class MakeNextTeamNullable1761264000000 implements MigrationInterface {
  name = "MakeNextTeamNullable1761264000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_shootouts" ("id" varchar(40) PRIMARY KEY NOT NULL, "homeTeam" varchar(80) NOT NULL, "awayTeam" varchar(80) NOT NULL, "startingTeam" varchar(10) NOT NULL, "status" varchar(20) NOT NULL, "winner" varchar(10), "score" text NOT NULL, "nextTeam" varchar(10), "version" integer NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_shootouts"("id", "homeTeam", "awayTeam", "startingTeam", "status", "winner", "score", "nextTeam", "version", "createdAt") SELECT "id", "homeTeam", "awayTeam", "startingTeam", "status", "winner", "score", "nextTeam", "version", "createdAt" FROM "shootouts"`,
    );
    await queryRunner.query(`DROP TABLE "shootouts"`);
    await queryRunner.query(`ALTER TABLE "temporary_shootouts" RENAME TO "shootouts"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_shootouts" ("id" varchar(40) PRIMARY KEY NOT NULL, "homeTeam" varchar(80) NOT NULL, "awayTeam" varchar(80) NOT NULL, "startingTeam" varchar(10) NOT NULL, "status" varchar(20) NOT NULL, "winner" varchar(10), "score" text NOT NULL, "nextTeam" varchar(10) NOT NULL, "version" integer NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_shootouts"("id", "homeTeam", "awayTeam", "startingTeam", "status", "winner", "score", "nextTeam", "version", "createdAt") SELECT "id", "homeTeam", "awayTeam", "startingTeam", "status", "winner", "score", COALESCE("nextTeam", 'HOME'), "version", "createdAt" FROM "shootouts"`,
    );
    await queryRunner.query(`DROP TABLE "shootouts"`);
    await queryRunner.query(`ALTER TABLE "temporary_shootouts" RENAME TO "shootouts"`);
  }
}
