import BigNumber from 'bignumber.js';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { AccountEntity } from '../../accounts/entities/account.entity';
import { bigNumberTransformer } from '../../database/transformers/big-number.transformer';
import { ItemEntity } from '../../items/entities/item.entity';

@Entity('purchases')
@Check('CHK_purchases_price_positive', '"price" > 0')
@Unique('UQ_purchases_item_id', ['itemId'])
@Unique('UQ_purchases_idempotency_key', ['idempotencyKey'])
export class PurchaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'item_id',
    type: 'uuid',
  })
  itemId!: string;

  @ManyToOne(() => ItemEntity, {
    nullable: false,
  })
  @JoinColumn({
    name: 'item_id',
  })
  item!: ItemEntity;

  @Column({
    name: 'buyer_id',
    type: 'uuid',
  })
  buyerId!: string;

  @ManyToOne(() => AccountEntity, {
    nullable: false,
  })
  @JoinColumn({
    name: 'buyer_id',
  })
  buyer!: AccountEntity;

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
    name: 'idempotency_key',
    type: 'varchar',
    length: 255,
  })
  idempotencyKey!: string;

  @Column({
    name: 'request_hash',
    type: 'varchar',
    length: 64,
  })
  requestHash!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;
}
