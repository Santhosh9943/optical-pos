'use client';

import { useMemo } from 'react';
import Decimal from 'decimal.js';
import { ShoppingBag, Trash2, Plus, Minus, Tag, AlertCircle } from 'lucide-react';
import type { InventoryItem } from './inventory-search';

export interface CartItem {
  id: string; // unique row key
  inventoryItemId: string | null;
  sku: string;
  description: string;
  category?: string;
  hsnCode: string | null;
  quantity: number;
  unitPrice: string; // "2500.00"
  discount: string; // "0.00" (line discount)
  discountPerUnit?: string; // fallback/compat
  taxRate: string; // "5.00" or "18.00"
  lensType?: string | null;
  coating?: string | null;
  lensMaterial?: string | null;
}

export interface CalculatedCartLine {
  item: CartItem;
  unitPriceDec: Decimal;
  subtotalDec: Decimal;
  discountDec: Decimal;
  taxableValueDec: Decimal;
  taxDec: Decimal;
  cgstDec: Decimal;
  sgstDec: Decimal;
  lineTotalDec: Decimal;
}

export interface CartTotals {
  itemCount: number;
  subtotal: Decimal;
  totalDiscount: Decimal;
  taxableValue: Decimal;
  cgst: Decimal;
  sgst: Decimal;
  totalTax: Decimal;
  grandTotal: Decimal;
}

interface BillingCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateDiscount: (id: string, discount: string) => void;
  onRemoveItem: (id: string) => void;
  onClearCart?: () => void;
  showSummary?: boolean;
}

/**
 * Pure calculation helper using strictly decimal.js
 */
export function calculateCartMetrics(items: CartItem[]): {
  lines: CalculatedCartLine[];
  totals: CartTotals;
} {
  let subtotal = new Decimal(0);
  let totalDiscount = new Decimal(0);
  let taxableValue = new Decimal(0);
  let totalCgst = new Decimal(0);
  let totalSgst = new Decimal(0);
  let totalTax = new Decimal(0);
  let grandTotal = new Decimal(0);
  let itemCount = 0;

  const lines: CalculatedCartLine[] = items.map((item) => {
    const qty = new Decimal(item.quantity > 0 ? item.quantity : 1);
    const unitPriceDec = new Decimal(item.unitPrice || '0.00');
    // Discount on the line
    const discountRaw = item.discount ?? item.discountPerUnit ?? '0.00';
    const discountDec = new Decimal(discountRaw || '0.00');
    const taxRateDec = new Decimal(item.taxRate || '0.00');

    // 1. Line Subtotal = Unit Price × Qty
    const subtotalDec = unitPriceDec.times(qty);
    // 2. Line Taxable Value = Line Subtotal - Discount (clamped to 0)
    const diff = subtotalDec.minus(discountDec);
    const taxableValueDec = diff.isNegative() ? new Decimal(0) : diff;

    // 3. Line Tax = Line Taxable Value × (Tax Rate / 100)
    const taxDec = taxableValueDec.times(taxRateDec).dividedBy(100);
    const cgstDec = taxDec.dividedBy(2);
    const sgstDec = taxDec.dividedBy(2);
    const lineTotalDec = taxableValueDec.plus(taxDec);

    subtotal = subtotal.plus(subtotalDec);
    totalDiscount = totalDiscount.plus(discountDec);
    taxableValue = taxableValue.plus(taxableValueDec);
    totalCgst = totalCgst.plus(cgstDec);
    totalSgst = totalSgst.plus(sgstDec);
    totalTax = totalTax.plus(taxDec);
    grandTotal = grandTotal.plus(lineTotalDec);
    itemCount += item.quantity;

    return {
      item,
      unitPriceDec,
      subtotalDec,
      discountDec,
      taxableValueDec,
      taxDec,
      cgstDec,
      sgstDec,
      lineTotalDec,
    };
  });

  return {
    lines,
    totals: {
      itemCount,
      subtotal,
      totalDiscount,
      taxableValue,
      cgst: totalCgst,
      sgst: totalSgst,
      totalTax,
      grandTotal,
    },
  };
}

export function BillingCart({
  items,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemoveItem,
  onClearCart,
  showSummary = false,
}: BillingCartProps) {
  const { lines, totals } = useMemo(() => calculateCartMetrics(items), [items]);

  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden">
      {/* Table Container */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center rounded-md border border-dashed border-slate-200 p-6 text-center text-slate-400">
            <ShoppingBag className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-600">
              Cart is currently empty
            </p>
            <p className="text-[11px] text-slate-400 max-w-[200px]">
              Use the inventory search above [F3] to add frames, lenses, and accessories.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-2 pl-1">Item Description</th>
                  <th className="pb-2 text-center w-20">Qty</th>
                  <th className="pb-2 text-right w-20">Rate</th>
                  <th className="pb-2 text-right w-20">Discount</th>
                  <th className="pb-2 text-center w-14">GST</th>
                  <th className="pb-2 text-right w-24">Total</th>
                  <th className="pb-2 pr-1 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {lines.map(
                  ({
                    item,
                    unitPriceDec,
                    discountDec,
                    lineTotalDec,
                  }) => (
                    <tr key={item.id} className="group hover:bg-slate-50/70 transition">
                      {/* Description & SKU */}
                      <td className="py-2 pl-1 pr-2 align-top">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {item.description}
                        </div>
                        <div className="mt-0.5 flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono">
                          <span className="font-bold text-blue-700">{item.sku}</span>
                          {item.hsnCode && <span>• HSN {item.hsnCode}</span>}
                        </div>
                      </td>

                      {/* Quantity Stepper */}
                      <td className="py-2 px-1 text-center align-top">
                        <div className="flex items-center justify-center space-x-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))
                            }
                            className="flex h-6 w-5 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={999}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              onUpdateQuantity(item.id, isNaN(val) || val < 1 ? 1 : val);
                            }}
                            className="h-6 w-10 rounded border border-slate-200 text-center font-mono text-xs font-semibold focus:border-blue-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="flex h-6 w-5 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-2 px-1 text-right font-mono font-medium text-slate-800 align-top">
                        ₹{unitPriceDec.toFixed(2)}
                      </td>

                      {/* Discount (Editable) */}
                      <td className="py-2 px-1 text-right align-top">
                        <div className="flex items-center justify-end space-x-0.5">
                          <span className="text-[10px] text-slate-400">₹</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.discount ?? item.discountPerUnit ?? ''}
                            placeholder="0.00"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^\d*(\.\d{0,2})?$/.test(val)) {
                                onUpdateDiscount(item.id, val);
                              }
                            }}
                            className="h-6 w-14 rounded border border-slate-200 px-1 text-right font-mono text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      </td>

                      {/* Tax Rate Tag */}
                      <td className="py-2 px-1 text-center align-top">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                            item.taxRate === '5.00'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {parseInt(item.taxRate, 10)}%
                        </span>
                      </td>

                      {/* Line Total */}
                      <td className="py-2 px-1 text-right font-mono font-bold text-slate-900 align-top">
                        ₹{lineTotalDec.toFixed(2)}
                      </td>

                      {/* Remove Button */}
                      <td className="py-2 pr-1 text-right align-top">
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Financial Ledger Calculation Summary (Optional internal) */}
      {showSummary && items.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50/70 p-3 -mx-4 -mb-4 rounded-b-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Order Settlement Summary
            </span>
            <button
              type="button"
              onClick={onClearCart}
              className="text-[11px] text-red-600 hover:text-red-800 font-medium transition"
            >
              Clear Cart
            </button>
          </div>

          <div className="mt-2 space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal ({totals.itemCount} items)</span>
              <span className="font-mono font-medium text-slate-800">
                ₹{totals.subtotal.toFixed(2)}
              </span>
            </div>

            {totals.totalDiscount.greaterThan(0) && (
              <div className="flex justify-between text-emerald-600">
                <span>Total Discount</span>
                <span className="font-mono font-medium">
                  −₹{totals.totalDiscount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-700">
              <span>Taxable Value</span>
              <span className="font-mono font-medium">
                ₹{totals.taxableValue.toFixed(2)}
              </span>
            </div>

            {/* Split GST breakdown */}
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>CGST (Output Tax)</span>
              <span className="font-mono">₹{totals.cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>SGST (Output Tax)</span>
              <span className="font-mono">₹{totals.sgst.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-1">
              <span className="font-medium">Total GST Amount</span>
              <span className="font-mono font-medium">
                ₹{totals.totalTax.toFixed(2)}
              </span>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-bold text-slate-900">
              <span>Grand Total</span>
              <span className="font-mono text-base text-blue-700">
                ₹{totals.grandTotal.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-xs font-semibold text-amber-800 pt-0.5">
              <span>Balance Payable</span>
              <span className="font-mono">₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
