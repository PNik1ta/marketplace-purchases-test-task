import { z } from 'zod';

const uuidSchema = z.uuid().transform((value) => value.toLowerCase());

export const createPurchaseSchema = z.object({
  buyerId: uuidSchema,

  itemId: uuidSchema,

  expectedItemVersion: z.number().int().positive(),
});

export type CreatePurchaseDto = z.infer<typeof createPurchaseSchema>;
