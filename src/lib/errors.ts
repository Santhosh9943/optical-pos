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
