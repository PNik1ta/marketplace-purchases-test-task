import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import type { EntityManager } from 'typeorm';

import { AccountEntity } from '../entities/account.entity';

@Injectable()
export class AccountRepository {
  findForUpdate(
    manager: EntityManager,
    accountIds: string[],
  ): Promise<AccountEntity[]> {
    return manager
      .createQueryBuilder(AccountEntity, 'account')
      .setLock('pessimistic_write')
      .where('account.id IN (:...accountIds)', {
        accountIds,
      })
      .orderBy('account.id', 'ASC')
      .getMany();
  }

  async debitIfEnough(
    manager: EntityManager,
    accountId: string,
    amount: BigNumber,
  ): Promise<boolean> {
    const result = await manager
      .createQueryBuilder()
      .update(AccountEntity)
      .set({
        balance: () => '"balance" - :amount',
      })
      .where('id = :accountId', {
        accountId,
      })
      .andWhere('balance >= :amount')
      .setParameter('amount', amount.toFixed(2))
      .execute();

    return result.affected === 1;
  }

  async credit(
    manager: EntityManager,
    accountId: string,
    amount: BigNumber,
  ): Promise<boolean> {
    const result = await manager
      .createQueryBuilder()
      .update(AccountEntity)
      .set({
        balance: () => '"balance" + :amount',
      })
      .where('id = :accountId', {
        accountId,
      })
      .setParameter('amount', amount.toFixed(2))
      .execute();

    return result.affected === 1;
  }
}
