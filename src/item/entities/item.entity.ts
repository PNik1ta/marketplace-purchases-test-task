import BigNumber from 'bignumber.js';
import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AccountEntity } from '../../account/entities/account.entity';
import { bigNumberTransformer } from '../../database/transformers/big-number.transformer';
import { ItemStatus } from '../enums/item-status';

@Entity('items')
@Check('CHK_items_price_positive', '"price" > 0')
@Check('CHK_items_version_positive', '"version" > 0')
@Check(
  'CHK_items_status',
  `"status" IN ('${ItemStatus.AVAILABLE}', '${ItemStatus.SOLD}')`,
)
export class ItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'seller_id',
    type: 'uuid',
  })
  sellerId!: string;

  @ManyToOne(() => AccountEntity, {
    nullable: false,
  })
  @JoinColumn({
    name: 'seller_id',
  })
  seller!: AccountEntity;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 2,
    transformer: bigNumberTransformer,
  })
  price!: BigNumber;

  @Column({
    type: 'varchar',
    length: 32,
    default: ItemStatus.AVAILABLE,
  })
  status!: ItemStatus;

  @Column({
    type: 'integer',
    default: 1,
  })
  version!: number;
}
