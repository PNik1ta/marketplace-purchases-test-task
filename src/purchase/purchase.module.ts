import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseEntity } from './entities/purchase.entity';
import { PurchaseController } from './purchase.controller';
import { AccountModule } from '../account/account.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { ItemModule } from '../item/item.module';
import { OutboxModule } from '../outbox/outbox.module';
import { PurchaseRepository } from './repositories/purchase.repository';
import { CreatePurchaseService } from './application/create-purchase.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseEntity]),
    AccountModule,
    ItemModule,
    IdempotencyModule,
    OutboxModule,
  ],
  controllers: [PurchaseController],
  providers: [PurchaseRepository, CreatePurchaseService],
  exports: [PurchaseRepository, CreatePurchaseService],
})
export class PurchaseModule {}
