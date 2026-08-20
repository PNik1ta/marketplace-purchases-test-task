import { z } from 'zod';

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(255)
  .regex(
    /^[A-Za-z0-9._:-]+$/,
    'Idempotency-Key contains unsupported characters',
  );
