import { HttpException } from '@nestjs/common';
import { AppExceptionPayload } from './types/app-exception-payload';

export class AppException extends HttpException {
  constructor(statusCode: number, payload: AppExceptionPayload) {
    super(payload, statusCode);
  }
}
