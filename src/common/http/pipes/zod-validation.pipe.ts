import { Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

import { AppException } from '../errors/app.exception';
import { ErrorCode } from '../errors/types/error-code';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    throw new AppException(400, {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Request validation failed',
      details: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
}
