import { Body, Controller, Post } from '@nestjs/common';

import { IdempotencyKey } from '../common/http/decorators/idempotency-key.decorator';
import { ZodValidationPipe } from '../common/http/pipes/zod-validation.pipe';

import {
  createPurchaseSchema,
  type CreatePurchaseDto,
} from './dto/create-purchase.schema';

import { idempotencyKeySchema } from './dto/idempotency-key.schema';
import { CreatePurchaseService } from './application/create-purchase.service';

@Controller('purchases')
export class PurchaseController {
  constructor(private readonly createPurchaseService: CreatePurchaseService) {}

  @Post()
  createPurchase(
    @Body(new ZodValidationPipe(createPurchaseSchema))
    body: CreatePurchaseDto,

    @IdempotencyKey(undefined, new ZodValidationPipe(idempotencyKeySchema))
    idempotencyKey: string,
  ) {
    return this.createPurchaseService.execute({
      buyerId: body.buyerId,
      itemId: body.itemId,
      expectedItemVersion: body.expectedItemVersion,
      idempotencyKey,
    });
  }
}
