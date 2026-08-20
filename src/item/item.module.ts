import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ItemEntity } from './entities/item.entity';
import { ItemRepository } from './repositories/item.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ItemEntity])],
  providers: [ItemRepository],
  exports: [ItemRepository],
})
export class ItemModule {}
