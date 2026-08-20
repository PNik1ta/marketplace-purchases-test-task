import { ErrorCode } from './error-code';

export interface AppExceptionPayload {
  code: ErrorCode;
  message: string;
  details?: unknown;
}
