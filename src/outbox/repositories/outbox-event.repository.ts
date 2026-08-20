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
}
