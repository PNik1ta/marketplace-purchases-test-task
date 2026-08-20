import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError, type EntityManager } from 'typeorm';

import { AppException } from '../../common/http/errors/app.exception';
import { ErrorCode } from '../../common/http/errors/error-code';
import { IdempotencyRequestRepository } from '../../idempotency/repositories/idempotency-request.repository';
import { OutboxEventRepository } from '../../outbox/repositories/outbox-event.repository';
import type { PurchaseEntity } from '../entities/purchase.entity';
import { PurchaseRepository } from '../repositories/purchase.repository';
import { createPurchaseRequestHash } from './create-purchase-request-hash';
import type {
  CreatePurchaseInput,
  CreatePurchaseResult,
} from './create-purchase.types';
import { AccountEntity } from '../../account/entities/account.entity';
import { AccountRepository } from '../../account/repositories/account.repository';
import { ItemEntity } from '../../item/entities/item.entity';
import { ItemStatus } from '../../item/enums/item-status';
import { ItemRepository } from '../../item/repositories/item.repository';

type IdempotencyResult =
  | {
      type: 'acquired';
      requestId: string;
    }
  | {
      type: 'replay';
      purchase: PurchaseEntity;
    };

const PURCHASE_LOCK_TIMEOUT_MS = 500;
const POSTGRES_LOCK_NOT_AVAILABLE = '55P03';

@Injectable()
export class CreatePurchaseService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly accountRepository: AccountRepository,
    private readonly itemRepository: ItemRepository,
    private readonly purchaseRepository: PurchaseRepository,
    private readonly idempotencyRepository: IdempotencyRequestRepository,
    private readonly outboxRepository: OutboxEventRepository,
  ) {}

  async execute(input: CreatePurchaseInput): Promise<CreatePurchaseResult> {
    const requestHash = createPurchaseRequestHash(input);

    try {
      return await this.dataSource.transaction(
        'READ COMMITTED',
        async (manager) => {
          const idempotency = await this.handleIdempotency(
            manager,
            input,
            requestHash,
          );

          if (idempotency.type === 'replay') {
            return this.toResult(idempotency.purchase);
          }

          await this.setLockTimeout(manager);

          const item = await this.getItemForPurchase(manager, input);

          const accounts = await this.getAccountsForPurchase(
            manager,
            input.buyerId,
            item.sellerId,
          );

          const buyer = accounts.find(
            (account) => account.id === input.buyerId,
          );

          if (!buyer) {
            throw new AppException(HttpStatus.NOT_FOUND, {
              code: ErrorCode.BUYER_NOT_FOUND,
              message: 'Buyer was not found',
            });
          }

          this.ensureSufficientBalance(buyer, item);

          const debited = await this.accountRepository.debitIfEnough(
            manager,
            buyer.id,
            item.price,
          );

          if (!debited) {
            throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, {
              code: ErrorCode.INSUFFICIENT_FUNDS,
              message: 'Buyer has insufficient funds',
            });
          }

          const credited = await this.accountRepository.credit(
            manager,
            item.sellerId,
            item.price,
          );

          if (!credited) {
            throw new Error('Invariant violation: seller credit failed');
          }

          const sold = await this.itemRepository.markAsSold(manager, item.id);

          if (!sold) {
            throw new Error(
              'Invariant violation: locked item could not be marked as sold',
            );
          }

          const purchase = await this.purchaseRepository.create(manager, {
            itemId: item.id,
            buyerId: input.buyerId,
            sellerId: item.sellerId,
            price: item.price,
          });

          await this.outboxRepository.createPurchaseCompleted(manager, {
            purchaseId: purchase.id,
            itemId: purchase.itemId,
            buyerId: purchase.buyerId,
            sellerId: purchase.sellerId,
            amount: purchase.price.toFixed(2),
          });

          const linked = await this.idempotencyRepository.linkPurchase(
            manager,
            idempotency.requestId,
            purchase.id,
          );

          if (!linked) {
            throw new Error(
              'Invariant violation: idempotency request could not be linked to purchase',
            );
          }

          return this.toResult(purchase);
        },
      );
    } catch (error: unknown) {
      if (this.isLockTimeoutError(error)) {
        throw new AppException(HttpStatus.CONFLICT, {
          code: ErrorCode.PURCHASE_BUSY,
          message: 'Purchase is currently being processed',
        });
      }

      throw error;
    }
  }

  private async handleIdempotency(
    manager: EntityManager,
    input: CreatePurchaseInput,
    requestHash: string,
  ): Promise<IdempotencyResult> {
    const requestId = await this.idempotencyRepository.acquire(manager, {
      buyerId: input.buyerId,
      key: input.idempotencyKey,
      requestHash,
    });

    if (requestId) {
      return {
        type: 'acquired',
        requestId,
      };
    }

    const existing = await this.idempotencyRepository.findByBuyerAndKey(
      manager,
      input.buyerId,
      input.idempotencyKey,
    );

    if (!existing) {
      throw new Error(
        'Invariant violation: conflicting idempotency request was not found',
      );
    }

    if (existing.requestHash !== requestHash) {
      throw new AppException(HttpStatus.CONFLICT, {
        code: ErrorCode.IDEMPOTENCY_KEY_REUSED,
        message: 'Idempotency key was already used for a different request',
      });
    }

    if (!existing.purchaseId) {
      throw new Error(
        'Invariant violation: committed idempotency request has no purchase',
      );
    }

    const purchase = await this.purchaseRepository.findById(
      manager,
      existing.purchaseId,
    );

    if (!purchase) {
      throw new Error(
        'Invariant violation: purchase referenced by idempotency request was not found',
      );
    }

    return {
      type: 'replay',
      purchase,
    };
  }

  private async getItemForPurchase(
    manager: EntityManager,
    input: CreatePurchaseInput,
  ): Promise<ItemEntity> {
    const item = await this.itemRepository.findForUpdate(manager, input.itemId);

    if (!item) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        code: ErrorCode.ITEM_NOT_FOUND,
        message: 'Item was not found',
      });
    }

    if (item.status !== ItemStatus.AVAILABLE) {
      throw new AppException(HttpStatus.CONFLICT, {
        code: ErrorCode.ITEM_ALREADY_SOLD,
        message: 'Item has already been sold',
      });
    }

    if (item.version !== input.expectedItemVersion) {
      throw new AppException(HttpStatus.CONFLICT, {
        code: ErrorCode.ITEM_CHANGED,
        message: 'Item has changed since it was viewed',
      });
    }

    if (item.sellerId === input.buyerId) {
      throw new AppException(HttpStatus.CONFLICT, {
        code: ErrorCode.SELF_PURCHASE_NOT_ALLOWED,
        message: 'Buyer cannot purchase their own item',
      });
    }

    return item;
  }

  private async getAccountsForPurchase(
    manager: EntityManager,
    buyerId: string,
    sellerId: string,
  ): Promise<AccountEntity[]> {
    const accountIds = [buyerId, sellerId].sort();

    const accounts = await this.accountRepository.findForUpdate(
      manager,
      accountIds,
    );

    const sellerExists = accounts.some((account) => account.id === sellerId);

    if (!sellerExists) {
      throw new Error('Invariant violation: seller account was not found');
    }

    return accounts;
  }

  private ensureSufficientBalance(
    buyer: AccountEntity,
    item: ItemEntity,
  ): void {
    if (buyer.balance.isLessThan(item.price)) {
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ErrorCode.INSUFFICIENT_FUNDS,
        message: 'Buyer has insufficient funds',
      });
    }
  }

  private toResult(purchase: PurchaseEntity): CreatePurchaseResult {
    return {
      id: purchase.id,
      itemId: purchase.itemId,
      buyerId: purchase.buyerId,
      sellerId: purchase.sellerId,
      price: purchase.price.toFixed(2),
      createdAt: purchase.createdAt.toISOString(),
    };
  }

  private async setLockTimeout(manager: EntityManager): Promise<void> {
    await manager.query(`SELECT set_config('lock_timeout', $1, true)`, [
      `${PURCHASE_LOCK_TIMEOUT_MS}ms`,
    ]);
  }

  private isLockTimeoutError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError: unknown = error.driverError;

    return (
      typeof driverError === 'object' &&
      driverError !== null &&
      'code' in driverError &&
      driverError.code === POSTGRES_LOCK_NOT_AVAILABLE
    );
  }
}
