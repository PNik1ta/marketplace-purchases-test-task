import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { PurchaseEntity } from '../../purchases/entities/purchase.entity';

@Entity('idempotency_requests')
@Unique('UQ_idempotency_requests_buyer_key', ['buyerId', 'key'])
export class IdempotencyRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'buyer_id',
    type: 'uuid',
  })
  buyerId!: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  key!: string;

  @Column({
    name: 'request_hash',
    type: 'varchar',
    length: 64,
  })
  requestHash!: string;

  @Column({
    name: 'purchase_id',
    type: 'uuid',
    nullable: true,
  })
  purchaseId!: string | null;

  @OneToOne(() => PurchaseEntity, {
    nullable: true,
  })
  @JoinColumn({
    name: 'purchase_id',
  })
  purchase!: PurchaseEntity | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;
}
