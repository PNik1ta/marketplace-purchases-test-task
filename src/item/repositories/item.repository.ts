import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

import { ItemEntity } from '../entities/item.entity';
import { ItemStatus } from '../enums/item-status';

@Injectable()
export class ItemRepository {
  findForUpdate(
    manager: EntityManager,
    itemId: string,
  ): Promise<ItemEntity | null> {
    return manager
      .createQueryBuilder(ItemEntity, 'item')
      .setLock('pessimistic_write')
      .where('item.id = :itemId', {
        itemId,
      })
      .getOne();
  }

  async markAsSold(manager: EntityManager, itemId: string): Promise<boolean> {
    const result = await manager
      .createQueryBuilder()
      .update(ItemEntity)
      .set({
        status: ItemStatus.SOLD,
        version: () => '"version" + 1',
      })
      .where('id = :itemId', {
        itemId,
      })
      .andWhere('status = :status', {
        status: ItemStatus.AVAILABLE,
      })
      .execute();

    return result.affected === 1;
  }
}
