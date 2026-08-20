import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

import { IdempotencyRequestEntity } from '../entities/idempotency-request.entity';

interface AcquireIdempotencyInput {
  buyerId: string;
  key: string;
  requestHash: string;
}

interface InsertedIdempotencyRow {
  id: string;
}

@Injectable()
export class IdempotencyRequestRepository {
  async acquire(
    manager: EntityManager,
    input: AcquireIdempotencyInput,
  ): Promise<string | null> {
    const rows = await manager.query<InsertedIdempotencyRow[]>(
      `
        INSERT INTO idempotency_requests (
          buyer_id,
          key,
          request_hash
        )
        VALUES ($1::uuid, $2, $3)
        ON CONFLICT (buyer_id, key)
        DO NOTHING
        RETURNING id
      `,
      [input.buyerId, input.key, input.requestHash],
    );

    return rows[0]?.id ?? null;
  }

  findByBuyerAndKey(
    manager: EntityManager,
    buyerId: string,
    key: string,
  ): Promise<IdempotencyRequestEntity | null> {
    return manager.findOne(IdempotencyRequestEntity, {
      where: {
        buyerId,
        key,
      },
    });
  }

  async linkPurchase(
    manager: EntityManager,
    idempotencyRequestId: string,
    purchaseId: string,
  ): Promise<boolean> {
    const result = await manager.update(
      IdempotencyRequestEntity,
      {
        id: idempotencyRequestId,
      },
      {
        purchaseId,
      },
    );

    return result.affected === 1;
  }
}
