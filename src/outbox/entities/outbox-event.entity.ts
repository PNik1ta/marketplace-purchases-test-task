import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('outbox_events')
@Check('CHK_outbox_events_attempts_non_negative', '"attempts" >= 0')
@Index('IDX_outbox_events_unpublished', ['publishedAt'], {
  where: '"published_at" IS NULL',
})
export class OutboxEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'aggregate_id',
    type: 'uuid',
  })
  aggregateId!: string;

  @Column({
    name: 'event_type',
    type: 'varchar',
    length: 128,
  })
  eventType!: string;

  @Column({
    type: 'jsonb',
  })
  payload!: Record<string, unknown>;

  @Column({
    type: 'integer',
    default: 0,
  })
  attempts!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @Column({
    name: 'published_at',
    type: 'timestamptz',
    nullable: true,
  })
  publishedAt!: Date | null;
}
