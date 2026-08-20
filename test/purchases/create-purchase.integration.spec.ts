import BigNumber from 'bignumber.js';

import { IdempotencyRequestEntity } from '../../src/idempotency/entities/idempotency-request.entity';
import { IdempotencyRequestRepository } from '../../src/idempotency/repositories/idempotency-request.repository';
import { OutboxEventEntity } from '../../src/outbox/entities/outbox-event.entity';
import { OutboxEventRepository } from '../../src/outbox/repositories/outbox-event.repository';
import {
  createTestDatabase,
  type TestDatabase,
} from '../utils/create-test-datasource';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { AccountEntity } from '../../src/account/entities/account.entity';
import { AccountRepository } from '../../src/account/repositories/account.repository';
import { ItemEntity } from '../../src/item/entities/item.entity';
import { ItemStatus } from '../../src/item/enums/item-status';
import { ItemRepository } from '../../src/item/repositories/item.repository';
import { OutboxEventStatus } from '../../src/outbox/enums/outbox-event-status';
import { CreatePurchaseService } from '../../src/purchase/application/create-purchase.service';
import { PurchaseEntity } from '../../src/purchase/entities/purchase.entity';
import { PurchaseRepository } from '../../src/purchase/repositories/purchase.repository';
import { In } from 'typeorm';
import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../src/common/http/errors/app.exception';
import { ErrorCode } from '../../src/common/http/errors/error-code';

describe('CreatePurchaseService integration', () => {
  let database: TestDatabase;
  let service: CreatePurchaseService;

  beforeAll(async () => {
    database = await createTestDatabase();

    service = new CreatePurchaseService(
      database.dataSource,
      new AccountRepository(),
      new ItemRepository(),
      new PurchaseRepository(),
      new IdempotencyRequestRepository(),
      new OutboxEventRepository(),
    );
  });

  afterAll(async () => {
    await database.dataSource.destroy();
    await database.container.stop();
  });

  beforeEach(async () => {
    await database.dataSource.query(`
      TRUNCATE TABLE
        outbox_events,
        idempotency_requests,
        purchases,
        items,
        accounts
      CASCADE
    `);
  });

  it('creates a purchase atomically', async () => {
    const accountRepository = database.dataSource.getRepository(AccountEntity);

    const itemRepository = database.dataSource.getRepository(ItemEntity);

    const seller = await accountRepository.save(
      accountRepository.create({
        balance: new BigNumber('100.00'),
      }),
    );

    const buyer = await accountRepository.save(
      accountRepository.create({
        balance: new BigNumber('500.00'),
      }),
    );

    const item = await itemRepository.save(
      itemRepository.create({
        sellerId: seller.id,
        price: new BigNumber('150.00'),
        status: ItemStatus.AVAILABLE,
        version: 1,
      }),
    );

    const result = await service.execute({
      buyerId: buyer.id,
      itemId: item.id,
      expectedItemVersion: 1,
      idempotencyKey: 'purchase-test-001',
    });

    expect(result.itemId).toBe(item.id);
    expect(result.buyerId).toBe(buyer.id);
    expect(result.sellerId).toBe(seller.id);
    expect(result.price).toBe('150.00');

    const updatedBuyer = await accountRepository.findOneByOrFail({
      id: buyer.id,
    });

    const updatedSeller = await accountRepository.findOneByOrFail({
      id: seller.id,
    });

    expect(updatedBuyer.balance.toFixed(2)).toBe('350.00');

    expect(updatedSeller.balance.toFixed(2)).toBe('250.00');

    const updatedItem = await itemRepository.findOneByOrFail({
      id: item.id,
    });

    expect(updatedItem.status).toBe(ItemStatus.SOLD);

    expect(updatedItem.version).toBe(2);

    const purchases = await database.dataSource
      .getRepository(PurchaseEntity)
      .find();

    expect(purchases).toHaveLength(1);
    expect(purchases[0].id).toBe(result.id);

    const idempotencyRequests = await database.dataSource
      .getRepository(IdempotencyRequestEntity)
      .find();

    expect(idempotencyRequests).toHaveLength(1);
    expect(idempotencyRequests[0].purchaseId).toBe(result.id);

    const outboxEvents = await database.dataSource
      .getRepository(OutboxEventEntity)
      .find();

    expect(outboxEvents).toHaveLength(1);

    expect(outboxEvents[0].status).toBe(OutboxEventStatus.PENDING);

    expect(outboxEvents[0].aggregateId).toBe(result.id);

    expect(outboxEvents[0].eventType).toBe('purchase.completed.v1');
  });

  it('allows only one buyer to purchase an item under concurrent requests', async () => {
    const accountRepository = database.dataSource.getRepository(AccountEntity);

    const itemRepository = database.dataSource.getRepository(ItemEntity);

    const purchaseRepository =
      database.dataSource.getRepository(PurchaseEntity);

    const outboxRepository =
      database.dataSource.getRepository(OutboxEventEntity);

    const idempotencyRepository = database.dataSource.getRepository(
      IdempotencyRequestEntity,
    );

    const seller = await accountRepository.save(
      accountRepository.create({
        balance: new BigNumber('100.00'),
      }),
    );

    const buyers = await accountRepository.save(
      Array.from(
        {
          length: 50,
        },
        () =>
          accountRepository.create({
            balance: new BigNumber('500.00'),
          }),
      ),
    );

    const item = await itemRepository.save(
      itemRepository.create({
        sellerId: seller.id,
        price: new BigNumber('150.00'),
        status: ItemStatus.AVAILABLE,
        version: 1,
      }),
    );

    const results = await Promise.allSettled(
      buyers.map((buyer, index) =>
        service.execute({
          buyerId: buyer.id,
          itemId: item.id,
          expectedItemVersion: 1,
          idempotencyKey: `concurrent-purchase-${index}`,
        }),
      ),
    );

    const successfulResults = results.filter(
      (result) => result.status === 'fulfilled',
    );

    const failedResults = results.filter(
      (result) => result.status === 'rejected',
    );

    expect(successfulResults).toHaveLength(1);
    expect(failedResults).toHaveLength(49);

    const successfulResult = successfulResults[0];

    const winningBuyerId = successfulResult.value.buyerId;

    const purchases = await purchaseRepository.find();

    expect(purchases).toHaveLength(1);

    expect(purchases[0].buyerId).toBe(winningBuyerId);

    const updatedItem = await itemRepository.findOneByOrFail({
      id: item.id,
    });

    expect(updatedItem.status).toBe(ItemStatus.SOLD);

    expect(updatedItem.version).toBe(2);

    const updatedSeller = await accountRepository.findOneByOrFail({
      id: seller.id,
    });

    expect(updatedSeller.balance.toFixed(2)).toBe('250.00');

    const updatedBuyers = await accountRepository.findBy({
      id: In(buyers.map((buyer) => buyer.id)),
    });

    const debitedBuyers = updatedBuyers.filter((buyer) =>
      buyer.balance.isEqualTo(new BigNumber('350.00')),
    );

    const untouchedBuyers = updatedBuyers.filter((buyer) =>
      buyer.balance.isEqualTo(new BigNumber('500.00')),
    );

    expect(debitedBuyers).toHaveLength(1);
    expect(untouchedBuyers).toHaveLength(49);

    expect(debitedBuyers[0].id).toBe(winningBuyerId);

    const outboxEvents = await outboxRepository.find();

    expect(outboxEvents).toHaveLength(1);

    const idempotencyRequests = await idempotencyRepository.find();

    expect(idempotencyRequests).toHaveLength(1);
  });

  it('returns the same purchase for concurrent requests with the same idempotency key', async () => {
    const accountRepository = database.dataSource.getRepository(AccountEntity);

    const itemRepository = database.dataSource.getRepository(ItemEntity);

    const purchaseRepository =
      database.dataSource.getRepository(PurchaseEntity);

    const outboxRepository =
      database.dataSource.getRepository(OutboxEventEntity);

    const idempotencyRepository = database.dataSource.getRepository(
      IdempotencyRequestEntity,
    );

    const seller = await accountRepository.save(
      accountRepository.create({
        balance: new BigNumber('100.00'),
      }),
    );

    const buyer = await accountRepository.save(
      accountRepository.create({
        balance: new BigNumber('500.00'),
      }),
    );

    const item = await itemRepository.save(
      itemRepository.create({
        sellerId: seller.id,
        price: new BigNumber('150.00'),
        status: ItemStatus.AVAILABLE,
        version: 1,
      }),
    );

    const input = {
      buyerId: buyer.id,
      itemId: item.id,
      expectedItemVersion: 1,
      idempotencyKey: 'same-purchase-request-key',
    };

    const results = await Promise.all(
      Array.from({ length: 50 }, () => service.execute(input)),
    );

    const purchaseIds = new Set(results.map((result) => result.id));

    expect(purchaseIds.size).toBe(1);

    const [purchaseId] = purchaseIds;

    expect(purchaseId).toBeDefined();

    const purchases = await purchaseRepository.find();

    expect(purchases).toHaveLength(1);
    expect(purchases[0].id).toBe(purchaseId);

    const updatedBuyer = await accountRepository.findOneByOrFail({
      id: buyer.id,
    });

    expect(updatedBuyer.balance.toFixed(2)).toBe('350.00');

    const updatedSeller = await accountRepository.findOneByOrFail({
      id: seller.id,
    });

    expect(updatedSeller.balance.toFixed(2)).toBe('250.00');

    const updatedItem = await itemRepository.findOneByOrFail({
      id: item.id,
    });

    expect(updatedItem.status).toBe(ItemStatus.SOLD);

    expect(updatedItem.version).toBe(2);

    const outboxEvents = await outboxRepository.find();

    expect(outboxEvents).toHaveLength(1);

    const idempotencyRequests = await idempotencyRepository.find();

    expect(idempotencyRequests).toHaveLength(1);
    expect(idempotencyRequests[0].purchaseId).toBe(purchaseId);
  });

  it('rejects reuse of an idempotency key for a different request', async () => {
    const accountRepository = database.dataSource.getRepository(AccountEntity);

    const itemRepository = database.dataSource.getRepository(ItemEntity);

    const seller = await accountRepository.save(
      accountRepository.create({
        balance: new BigNumber('100.00'),
      }),
    );

    const buyer = await accountRepository.save(
      accountRepository.create({
        balance: new BigNumber('500.00'),
      }),
    );

    const firstItem = await itemRepository.save(
      itemRepository.create({
        sellerId: seller.id,
        price: new BigNumber('150.00'),
        status: ItemStatus.AVAILABLE,
        version: 1,
      }),
    );

    const secondItem = await itemRepository.save(
      itemRepository.create({
        sellerId: seller.id,
        price: new BigNumber('200.00'),
        status: ItemStatus.AVAILABLE,
        version: 1,
      }),
    );

    const idempotencyKey = 'reused-idempotency-key';

    await service.execute({
      buyerId: buyer.id,
      itemId: firstItem.id,
      expectedItemVersion: 1,
      idempotencyKey,
    });

    try {
      await service.execute({
        buyerId: buyer.id,
        itemId: secondItem.id,
        expectedItemVersion: 1,
        idempotencyKey,
      });

      throw new Error('Expected idempotency key reuse to fail');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AppException);

      if (!(error instanceof AppException)) {
        throw error;
      }

      expect(error.getStatus()).toBe(HttpStatus.CONFLICT);

      expect(error.getResponse()).toMatchObject({
        code: ErrorCode.IDEMPOTENCY_KEY_REUSED,
      });
    }
  });
});
