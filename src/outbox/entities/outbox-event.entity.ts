import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { OutboxEventStatus } from '../enums/outbox-event-status';

@Entity('outbox_events')
@Check('CHK_outbox_events_attempts_non_negative', '"attempts" >= 0')
@Check(
  'CHK_outbox_events_status',
  `"status" IN ('${OutboxEventStatus.PENDING}', '${OutboxEventStatus.PUBLISHED}', '${OutboxEventStatus.FAILED}')`,
)
@Index('IDX_outbox_events_pending_next_attempt', ['nextAttemptAt'], {
  where: `"status" = 'pending'`,
})
export class OutboxEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'aggregate_type',
    type: 'varchar',
    length: 64,
  })
  aggregateType!: string;

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
    type: 'varchar',
    length: 32,
    default: OutboxEventStatus.PENDING,
  })
  status!: OutboxEventStatus;

  @Column({
    type: 'integer',
    default: 0,
  })
  attempts!: number;

  @Column({
    name: 'next_attempt_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  nextAttemptAt!: Date;

  @Column({
    name: 'locked_by',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  lockedBy!: string | null;

  @Column({
    name: 'locked_until',
    type: 'timestamptz',
    nullable: true,
  })
  lockedUntil!: Date | null;

  @Column({
    name: 'last_error',
    type: 'text',
    nullable: true,
  })
  lastError!: string | null;

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
