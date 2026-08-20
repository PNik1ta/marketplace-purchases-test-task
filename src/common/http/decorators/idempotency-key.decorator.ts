import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): unknown => {
    const request = context.switchToHttp().getRequest<Request>();

    return request.headers['idempotency-key'];
  },
);
