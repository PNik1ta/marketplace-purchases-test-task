import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1787217223384 implements MigrationInterface {
  name = 'InitialSchema1787217223384';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "balance" numeric(20,2) NOT NULL, CONSTRAINT "CHK_accounts_balance_non_negative" CHECK ("balance" >= 0), CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seller_id" uuid NOT NULL, "price" numeric(20,2) NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'available', CONSTRAINT "CHK_items_status" CHECK ("status" IN ('available', 'sold')), CONSTRAINT "CHK_items_price_positive" CHECK ("price" > 0), CONSTRAINT "PK_ba5885359424c15ca6b9e79bcf6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "outbox_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "aggregate_id" uuid NOT NULL, "event_type" character varying(128) NOT NULL, "payload" jsonb NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "published_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_outbox_events_attempts_non_negative" CHECK ("attempts" >= 0), CONSTRAINT "PK_6689a16c00d09b8089f6237f1d2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbox_events_unpublished" ON "outbox_events"  ("published_at") WHERE "published_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "purchases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "item_id" uuid NOT NULL, "buyer_id" uuid NOT NULL, "seller_id" uuid NOT NULL, "price" numeric(20,2) NOT NULL, "idempotency_key" character varying(255) NOT NULL, "request_hash" character varying(64) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_purchases_idempotency_key" UNIQUE ("idempotency_key"), CONSTRAINT "UQ_purchases_item_id" UNIQUE ("item_id"), CONSTRAINT "CHK_purchases_price_positive" CHECK ("price" > 0), CONSTRAINT "PK_1d55032f37a34c6eceacbbca6b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" ADD CONSTRAINT "FK_20719f5611327abb661f3cccb9a" FOREIGN KEY ("seller_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" ADD CONSTRAINT "FK_1064c04bd5a56289865700b2403" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" ADD CONSTRAINT "FK_a3886ad6e415bce0b2f25c136bc" FOREIGN KEY ("buyer_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" ADD CONSTRAINT "FK_f301deca5d711b59d71038bf44b" FOREIGN KEY ("seller_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchases" DROP CONSTRAINT "FK_f301deca5d711b59d71038bf44b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" DROP CONSTRAINT "FK_a3886ad6e415bce0b2f25c136bc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" DROP CONSTRAINT "FK_1064c04bd5a56289865700b2403"`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" DROP CONSTRAINT "FK_20719f5611327abb661f3cccb9a"`,
    );
    await queryRunner.query(`DROP TABLE "purchases"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_outbox_events_unpublished"`,
    );
    await queryRunner.query(`DROP TABLE "outbox_events"`);
    await queryRunner.query(`DROP TABLE "items"`);
    await queryRunner.query(`DROP TABLE "accounts"`);
  }
}
