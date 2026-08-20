import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

import { OutboxEventEntity } from '../entities/outbox-event.entity';
import { OutboxEventStatus } from '../enums/outbox-event-status';

interface PurchaseCompletedEventInput {
  purchaseId: string;
  itemId: string;
  buyerId: string;
  sellerId: string;
  amount: string;
}

interface ClaimOutboxEventsInput {
  workerId: string;
  limit: number;
  leaseMs: number;
}

interface MarkFailedAttemptInput {
  eventId: string;
  workerId: string;
  attempts: number;
  nextAttemptAt: Date;
  error: string;
  maxAttempts: number;
}

@Injectable()
export class OutboxEventRepository {
  async createPurchaseCompleted(
    manager: EntityManager,
    purchase: PurchaseCompletedEventInput,
  ): Promise<OutboxEventEntity> {
    const event = manager.create(OutboxEventEntity, {
      aggregateType: 'purchase',
      aggregateId: purchase.purchaseId,
      eventType: 'purchase.completed.v1',
      payload: {
        purchaseId: purchase.purchaseId,
        itemId: purchase.itemId,
        buyerId: purchase.buyerId,
        sellerId: purchase.sellerId,
        amount: purchase.amount,
      },
      status: OutboxEventStatus.PENDING,
      attempts: 0,
    });

    return manager.save(event);
  }

  async claimBatch(
    manager: EntityManager,
    input: ClaimOutboxEventsInput,
  ): Promise<OutboxEventEntity[]> {
    const now = new Date();

    const events = await manager
      .createQueryBuilder(OutboxEventEntity, 'event')
      .where('event.status = :status', {
        status: OutboxEventStatus.PENDING,
      })
      .andWhere('event.nextAttemptAt <= :now', { now })
      .andWhere(
        `(
        event.lockedUntil IS NULL
        OR event.lockedUntil < :now
      )`,
        { now },
      )
      .orderBy('event.nextAttemptAt', 'ASC')
      .addOrderBy('event.createdAt', 'ASC')
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .take(input.limit)
      .getMany();

    if (events.length === 0) {
      return [];
    }

    const lockedUntil = new Date(now.getTime() + input.leaseMs);

    for (const event of events) {
      event.lockedBy = input.workerId;
      event.lockedUntil = lockedUntil;
    }

    await manager.save(OutboxEventEntity, events);

    return events;
  }

  async markPublished(
    manager: EntityManager,
    eventId: string,
    workerId: string,
  ): Promise<boolean> {
    const result = await manager
      .createQueryBuilder()
      .update(OutboxEventEntity)
      .set({
        status: OutboxEventStatus.PUBLISHED,
        publishedAt: new Date(),

        lockedBy: null,
        lockedUntil: null,
        lastError: null,
      })
      .where('id = :eventId', {
        eventId,
      })
      .andWhere('status = :status', {
        status: OutboxEventStatus.PENDING,
      })
      .andWhere('"locked_by" = :workerId', {
        workerId,
      })
      .execute();

    return result.affected === 1;
  }

  async markFailedAttempt(
    manager: EntityManager,
    input: MarkFailedAttemptInput,
  ): Promise<boolean> {
    const nextAttempts = input.attempts + 1;

    const nextStatus =
      nextAttempts >= input.maxAttempts
        ? OutboxEventStatus.FAILED
        : OutboxEventStatus.PENDING;

    const result = await manager
      .createQueryBuilder()
      .update(OutboxEventEntity)
      .set({
        status: nextStatus,
        attempts: nextAttempts,

        nextAttemptAt: input.nextAttemptAt,

        lastError: input.error,

        lockedBy: null,
        lockedUntil: null,
      })
      .where('id = :eventId', {
        eventId: input.eventId,
      })
      .andWhere('status = :status', {
        status: OutboxEventStatus.PENDING,
      })
      .andWhere('"locked_by" = :workerId', {
        workerId: input.workerId,
      })
      .execute();

    return result.affected === 1;
  }
}
