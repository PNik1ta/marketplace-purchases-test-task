import { createHash } from 'node:crypto';

import type { CreatePurchaseInput } from './create-purchase.types';

export const createPurchaseRequestHash = (
  input: CreatePurchaseInput,
): string => {
  const canonicalRequest = JSON.stringify({
    buyerId: input.buyerId,
    itemId: input.itemId,
    expectedItemVersion: input.expectedItemVersion,
  });

  return createHash('sha256').update(canonicalRequest).digest('hex');
};
