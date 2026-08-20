import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { IdempotencyRequestEntity } from '../idempotency/entities/idempotency-request.entity';
import { ItemEntity } from '../items/entities/item.entity';
import { OutboxEventEntity } from '../outbox/entities/outbox-event.entity';
import { PurchaseEntity } from './entities/purchase.entity';
import { PurchaseController } from './purchase.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountEntity,
      ItemEntity,
      PurchaseEntity,
      IdempotencyRequestEntity,
      OutboxEventEntity,
    ]),
  ],
  controllers: [PurchaseController],
})
export class PurchaseModule {}
