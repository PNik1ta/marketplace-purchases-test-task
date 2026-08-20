import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import type { EntityManager } from 'typeorm';

import { PurchaseEntity } from '../entities/purchase.entity';

interface CreatePurchaseInput {
  itemId: string;
  buyerId: string;
  sellerId: string;
  price: BigNumber;
}

@Injectable()
export class PurchaseRepository {
  create(
    manager: EntityManager,
    input: CreatePurchaseInput,
  ): Promise<PurchaseEntity> {
    const purchase = manager.create(PurchaseEntity, {
      itemId: input.itemId,
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      price: input.price,
    });

    return manager.save(purchase);
  }

  findById(
    manager: EntityManager,
    purchaseId: string,
  ): Promise<PurchaseEntity | null> {
    return manager.findOneBy(PurchaseEntity, {
      id: purchaseId,
    });
  }
}
