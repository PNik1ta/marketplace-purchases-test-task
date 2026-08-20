import { Body, Controller, Post } from '@nestjs/common';

import { IdempotencyKey } from '../common/http/decorators/idempotency-key.decorator';
import { ZodValidationPipe } from '../common/http/pipes/zod-validation.pipe';

import {
  createPurchaseSchema,
  type CreatePurchaseDto,
} from './dto/create-purchase.schema';

import { idempotencyKeySchema } from './dto/idempotency-key.schema';

@Controller('purchases')
export class PurchaseController {
  @Post()
  createPurchase(
    @Body(new ZodValidationPipe(createPurchaseSchema))
    body: CreatePurchaseDto,

    @IdempotencyKey(undefined, new ZodValidationPipe(idempotencyKeySchema))
    idempotencyKey: string,
  ) {
    return {
      body,
      idempotencyKey,
    };
  }
}
