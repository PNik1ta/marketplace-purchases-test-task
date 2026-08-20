import 'dotenv/config';
import { DataSource } from 'typeorm';
import { postgresOptions } from './postgres.options';
import { AccountEntity } from '../account/entities/account.entity';
import { IdempotencyRequestEntity } from '../idempotency/entities/idempotency-request.entity';
import { ItemEntity } from '../item/entities/item.entity';
import { OutboxEventEntity } from '../outbox/entities/outbox-event.entity';
import { PurchaseEntity } from '../purchase/entities/purchase.entity';
import { join } from 'node:path';

const dataSource = new DataSource({
  ...postgresOptions,
  entities: [
    AccountEntity,
    ItemEntity,
    PurchaseEntity,
    IdempotencyRequestEntity,
    OutboxEventEntity,
  ],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
});

export default dataSource;
