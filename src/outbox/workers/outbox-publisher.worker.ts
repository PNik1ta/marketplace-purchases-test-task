import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { DataSource } from 'typeorm';

import type { EventEnvelope } from '../../events/event-envelope';
import { RabbitMqEventPublisher } from '../../rabbitmq/rabbitmq-event.publisher';
import type { OutboxEventEntity } from '../entities/outbox-event.entity';
import { OutboxEventRepository } from '../repositories/outbox-event.repository';

const POLL_INTERVAL_MS = 1_000;
const BATCH_SIZE = 50;
const LEASE_MS = 30_000;
const MAX_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 60_000;

@Injectable()
export class OutboxPublisherWorker {
  private readonly logger = new Logger(OutboxPublisherWorker.name);

  private readonly workerId = `${hostname()}:${process.pid}:${randomUUID()}`;

  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly outboxRepository: OutboxEventRepository,
    private readonly publisher: RabbitMqEventPublisher,
  ) {}

  @Interval(POLL_INTERVAL_MS)
  async run(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const events = await this.dataSource.transaction(
        'READ COMMITTED',
        (manager) =>
          this.outboxRepository.claimBatch(manager, {
            workerId: this.workerId,
            limit: BATCH_SIZE,
            leaseMs: LEASE_MS,
          }),
      );

      for (const event of events) {
        await this.publishEvent(event);
      }
    } catch (error: unknown) {
      this.logger.error(
        'Outbox publisher iteration failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }

  private async publishEvent(event: OutboxEventEntity): Promise<void> {
    try {
      await this.publisher.publish(this.toEnvelope(event));

      const marked = await this.outboxRepository.markPublished(
        this.dataSource.manager,
        event.id,
        this.workerId,
      );

      if (!marked) {
        this.logger.warn(
          `Outbox event ${event.id} was published but could not be marked as published`,
        );
      }
    } catch (error: unknown) {
      await this.handlePublishFailure(event, error);
    }
  }

  private async handlePublishFailure(
    event: OutboxEventEntity,
    error: unknown,
  ): Promise<void> {
    const nextAttempt = event.attempts + 1;

    const delay = this.calculateRetryDelay(nextAttempt);

    const nextAttemptAt = new Date(Date.now() + delay);

    const errorMessage = error instanceof Error ? error.message : String(error);

    const updated = await this.outboxRepository.markFailedAttempt(
      this.dataSource.manager,
      {
        eventId: event.id,
        workerId: this.workerId,
        attempts: event.attempts,
        nextAttemptAt,
        error: errorMessage,
        maxAttempts: MAX_ATTEMPTS,
      },
    );

    if (!updated) {
      this.logger.warn(`Could not update failed outbox event ${event.id}`);

      return;
    }

    this.logger.warn(
      `Outbox event ${event.id} publish failed, attempt ${nextAttempt}: ${errorMessage}`,
    );
  }

  private calculateRetryDelay(attempt: number): number {
    const exponentialDelay = Math.min(
      BASE_RETRY_DELAY_MS * 2 ** Math.max(attempt - 1, 0),
      MAX_RETRY_DELAY_MS,
    );

    const jitter = Math.floor(Math.random() * 500);

    return exponentialDelay + jitter;
  }

  private toEnvelope(event: OutboxEventEntity): EventEnvelope {
    return {
      eventId: event.id,
      eventType: event.eventType,

      occurredAt: event.createdAt.toISOString(),

      aggregateType: event.aggregateType,

      aggregateId: event.aggregateId,

      payload: event.payload,
    };
  }
}
