import { Column, Entity, OneToMany, PrimaryColumn, type Relation } from "typeorm";
import { ShotRecord } from "./ShotRecord";

@Entity("shootouts")
export class ShootoutRecord {
    @PrimaryColumn({ type: "varchar", length: 40 })
    id!: string;

    @Column({ type: "varchar", length: 80 })
    homeTeam!: string;

    @Column({ type: "varchar", length: 80 })
    awayTeam!: string;

    @Column({ type: "varchar", length: 10 })
    startingTeam!: string;

    @Column({ type: "varchar", length: 20 })
    status!: string;

    @Column({ type: "varchar", length: 10, nullable: true })
    winner!: string | null;

    @Column({ type: "simple-json" })
    score!: { home: number; away: number };

    @Column({ type: "varchar", length: 10, nullable: true })
    nextTeam!: string | null;

    @Column({ type: "integer", default: 0 })
    version!: number;

    @Column({ type: "datetime" })
    createdAt!: Date;

    @OneToMany(() => ShotRecord, (shot) => shot.shootout)
    shots!: Relation<ShotRecord[]>;
}
