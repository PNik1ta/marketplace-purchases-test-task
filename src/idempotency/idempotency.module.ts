import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IdempotencyRequestEntity } from './entities/idempotency-request.entity';
import { IdempotencyRequestRepository } from './repositories/idempotency-request.repository';

@Module({
  imports: [TypeOrmModule.forFeature([IdempotencyRequestEntity])],
  providers: [IdempotencyRequestRepository],
  exports: [IdempotencyRequestRepository],
})
export class IdempotencyModule {}
