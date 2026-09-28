// src/lib/errors.ts

export class InsufficientStockError extends Error {
  constructor(
    public inventoryItemId: string,
    public sku: string,
    public available: number,
    public requested: number
  ) {
    super(`Insufficient stock for ${sku}: ${available} < ${requested}`);
    this.name = 'InsufficientStockError';
  }
}

export class NegativeBalanceError extends Error {
  constructor(public amount: string) {
    super(`Negative balance after advance: ${amount}`);
    this.name = 'NegativeBalanceError';
  }
}

/** Thrown inside checkout when a STORE CREDIT payment exceeds the customer's wallet balance. */
export class InsufficientStoreCreditError extends Error {
  constructor(public amount: string) {
    super(`Insufficient store credit for ${amount}`);
    this.name = 'InsufficientStoreCreditError';
  }
}
