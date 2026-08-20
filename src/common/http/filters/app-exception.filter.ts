import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { ErrorCode } from '../errors/error-code';
import type { RequestWithId } from '../types/request-with-id';
import { AppExceptionPayload } from '../errors/app-exception-payload';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();

    const request = context.getRequest<RequestWithId>();

    const response = context.getResponse<Response>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'code' in exceptionResponse
      ) {
        const payload = exceptionResponse as AppExceptionPayload;

        response.status(statusCode).json({
          statusCode,
          code: payload.code,
          message: payload.message,
          details: payload.details,
          requestId: request.requestId,
          path: request.originalUrl,
        });

        return;
      }

      response.status(statusCode).json({
        statusCode,
        code: ErrorCode.INTERNAL_ERROR,
        message: exception.message,
        requestId: request.requestId,
        path: request.originalUrl,
      });

      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
      requestId: request.requestId,
      path: request.originalUrl,
    });
  }
}
