import { z } from 'zod';

export const createPurchaseSchema = z.object({
  buyerId: z.uuid(),
  itemId: z.uuid(),
  expectedItemVersion: z.number().int().positive(),
});

export type CreatePurchaseDto = z.infer<typeof createPurchaseSchema>;
