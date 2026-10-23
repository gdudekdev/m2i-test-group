import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from "typeorm";
import { ShootoutRecord } from "./ShootoutRecord";

@Entity("shots")
export class ShotRecord {
    @PrimaryColumn({ type: "varchar", length: 40 })
    shootoutId!: string;

    @PrimaryColumn({ type: "integer" })
    sequence!: number;

    @Column({ type: "varchar", length: 10 })
    team!: string;

    @Column({ type: "varchar", length: 80 })
    shooter!: string;

    @Column({ type: "varchar", length: 80 })
    goalkeeper!: string;

    @Column({ type: "varchar", length: 20 })
    outcome!: string;

    @Column({ type: "varchar", length: 80 })
    clientShotId!: string;

    @Column({ type: "datetime" })
    recordedAt!: Date;

    @ManyToOne(() => ShootoutRecord, (shootout) => shootout.shots, { nullable: false })
    @JoinColumn({ name: "shootoutId" })
    shootout!: Relation<ShootoutRecord>;
}
