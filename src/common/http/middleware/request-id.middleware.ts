import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';

import type { RequestWithId } from '../types/request-with-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const incomingRequestId = request.header('x-request-id');

    request.requestId = incomingRequestId?.trim() || randomUUID();

    response.setHeader('x-request-id', request.requestId);

    next();
  }
}
