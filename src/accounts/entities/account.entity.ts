import BigNumber from 'bignumber.js';
import { Check, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { bigNumberTransformer } from '../../database/transformers/big-number.transformer';

@Entity('accounts')
@Check('CHK_accounts_balance_non_negative', '"balance" >= 0')
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 2,
    transformer: bigNumberTransformer,
  })
  balance!: BigNumber;
}
