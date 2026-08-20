import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

import { IdempotencyRequestEntity } from '../../src/idempotency/entities/idempotency-request.entity';
import { OutboxEventEntity } from '../../src/outbox/entities/outbox-event.entity';
import { AccountEntity } from '../../src/account/entities/account.entity';
import { ItemEntity } from '../../src/item/entities/item.entity';
import { PurchaseEntity } from '../../src/purchase/entities/purchase.entity';

export interface TestDatabase {
  container: StartedPostgreSqlContainer;
  dataSource: DataSource;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();

  const dataSource = new DataSource({
    type: 'postgres',
    host: container.getHost(),
    port: container.getPort(),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
    entities: [
      AccountEntity,
      ItemEntity,
      PurchaseEntity,
      IdempotencyRequestEntity,
      OutboxEventEntity,
    ],
    synchronize: true,
  });

  await dataSource.initialize();

  return {
    container,
    dataSource,
  };
}
