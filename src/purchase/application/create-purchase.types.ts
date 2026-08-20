export interface CreatePurchaseInput {
  buyerId: string;
  itemId: string;
  expectedItemVersion: number;
  idempotencyKey: string;
}

export interface CreatePurchaseResult {
  id: string;
  itemId: string;
  buyerId: string;
  sellerId: string;
  price: string;
  createdAt: string;
}
