import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from './entities/account.entity';
import { AccountRepository } from './repositories/account.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AccountEntity])],
  providers: [AccountRepository],
  exports: [AccountRepository],
})
export class AccountModule {}
