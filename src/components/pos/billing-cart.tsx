'use client';

import { useMemo, useState, useEffect } from 'react';
import Decimal from 'decimal.js';
import { ShoppingBag, Trash2, Plus, Minus, Tag, AlertCircle, Edit3 } from 'lucide-react';
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
  patientId?: string | null;
  prescriptionId?: string | null;
  isCustomerOwnFrame?: boolean;
  fittingNote?: string | null;
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
  activePatients?: Array<{
    id: string;
    fullName: string;
    relationType?: string;
  }>;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateDiscount: (id: string, discount: string) => void;
  onUpdatePatient?: (id: string, patientId: string | null) => void;
  onUpdateOwnFrame?: (
    id: string,
    isOwnFrame: boolean,
    fittingNote?: string | null
  ) => void;
  onEditItem?: (item: CartItem) => void;
  onRemoveItem: (id: string) => void;
  onClearCart?: () => void;
  showSummary?: boolean;
  isCompact?: boolean;
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

interface DiscountCellProps {
  itemId: string;
  subtotalDec: Decimal;
  discount: string;
  onUpdateDiscount: (id: string, discount: string) => void;
}

function DiscountCell({
  itemId,
  subtotalDec,
  discount,
  onUpdateDiscount,
}: DiscountCellProps) {
  const [amountStr, setAmountStr] = useState<string>('');
  const [percentStr, setPercentStr] = useState<string>('');
  const [activeInput, setActiveInput] = useState<'amount' | 'percent' | null>(null);

  useEffect(() => {
    const dVal = discount || '0.00';
    const dDec = new Decimal(dVal || '0');

    if (activeInput !== 'amount') {
      if (dDec.greaterThan(0)) {
        setAmountStr(dVal);
      } else {
        setAmountStr('');
      }
    }

    if (activeInput !== 'percent') {
      if (dDec.greaterThan(0) && subtotalDec.greaterThan(0)) {
        const pDec = dDec.dividedBy(subtotalDec).times(100);
        setPercentStr(pDec.toFixed(2).replace(/\.?0+$/, ''));
      } else {
        setPercentStr('');
      }
    }
  }, [discount, subtotalDec, activeInput]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!/^\d*(\.\d{0,2})?$/.test(val)) return;

    setActiveInput('amount');

    if (!val || val === '.') {
      setAmountStr(val);
      setPercentStr('');
      onUpdateDiscount(itemId, '0.00');
      return;
    }

    let amtDec = new Decimal(val);
    if (subtotalDec.greaterThan(0) && amtDec.greaterThan(subtotalDec)) {
      amtDec = subtotalDec;
      val = subtotalDec.toFixed(2);
    }
    setAmountStr(val);

    if (subtotalDec.greaterThan(0)) {
      const pDec = amtDec.dividedBy(subtotalDec).times(100);
      setPercentStr(pDec.toFixed(2).replace(/\.?0+$/, ''));
    } else {
      setPercentStr('0');
    }
    onUpdateDiscount(itemId, val);
  };

  const handlePercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!/^\d*(\.\d{0,2})?$/.test(val)) return;
    if (parseFloat(val) > 100) return;

    setActiveInput('percent');
    setPercentStr(val);

    if (!val || val === '.') {
      setAmountStr('');
      onUpdateDiscount(itemId, '0.00');
      return;
    }

    const pDec = new Decimal(val);
    if (subtotalDec.greaterThan(0)) {
      const amtDec = subtotalDec.times(pDec).dividedBy(100);
      const amtFormatted = amtDec.toFixed(2);
      setAmountStr(amtFormatted);
      onUpdateDiscount(itemId, amtFormatted);
    } else {
      setAmountStr('0.00');
      onUpdateDiscount(itemId, '0.00');
    }
  };

  const handleBlur = () => {
    setActiveInput(null);
    if (amountStr && !isNaN(parseFloat(amountStr))) {
      try {
        setAmountStr(new Decimal(amountStr).toFixed(2));
      } catch {}
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {/* Price (₹) Box */}
      <div className="flex items-center justify-end rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-500/20 w-20 h-6 transition-colors shadow-2xs">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 mr-0.5 select-none font-sans">
          ₹
        </span>
        <input
          type="text"
          inputMode="decimal"
          aria-label="Discount amount in ₹"
          title="Discount Amount in ₹"
          data-testid="item-discount-amount-input"
          value={amountStr}
          placeholder="0.00"
          onChange={handleAmountChange}
          onFocus={() => setActiveInput('amount')}
          onBlur={handleBlur}
          className="w-full bg-transparent text-right font-mono text-xs text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
        />
      </div>

      {/* Percentage (%) Box */}
      <div className="flex items-center justify-end rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-500/20 w-20 h-6 transition-colors shadow-2xs">
        <input
          type="text"
          inputMode="decimal"
          aria-label="Discount percentage %"
          title="Discount Percentage %"
          data-testid="item-discount-percent-input"
          value={percentStr}
          placeholder="0"
          onChange={handlePercentChange}
          onFocus={() => setActiveInput('percent')}
          onBlur={handleBlur}
          className="w-full bg-transparent text-right font-mono text-xs text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
        />
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 ml-0.5 select-none font-sans">
          %
        </span>
      </div>
    </div>
  );
}

export function BillingCart({
  items,
  activePatients,
  onUpdateQuantity,
  onUpdateDiscount,
  onUpdatePatient,
  onUpdateOwnFrame,
  onEditItem,
  onRemoveItem,
  onClearCart,
  showSummary = false,
  isCompact = false,
}: BillingCartProps) {
  const { lines, totals } = useMemo(() => calculateCartMetrics(items), [items]);

  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden">
      {/* Table Container */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center rounded-md border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-300">
            <ShoppingBag className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Cart is currently empty
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-300 max-w-[200px]">
              Use the inventory search above [F3] to add frames, lenses, and accessories.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  <th className="pb-2 pl-1">Item Description</th>
                  <th className="pb-2 text-center w-20">Qty</th>
                  <th className="pb-2 text-right w-20">Rate</th>
                  <th className="pb-2 text-right w-24">
                    <div className="flex flex-col items-end">
                      <span>Discount</span>
                      <span className="text-[9px] font-normal lowercase tracking-normal text-slate-500 dark:text-slate-300">
                        ₹ / %
                      </span>
                    </div>
                  </th>
                  <th className="pb-2 text-center w-14">GST</th>
                  <th className="pb-2 text-right w-24">Total</th>
                  <th className="pb-2 pr-1 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {lines.map(
                  ({
                    item,
                    unitPriceDec,
                    subtotalDec,
                    discountDec,
                    lineTotalDec,
                  }) => (
                    <tr key={item.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                      {/* Description & SKU */}
                      <td className="py-2 pl-1 pr-2 align-top">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                          {item.description}
                        </div>
                        <div className="mt-0.5 flex items-center space-x-1.5 text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                          <span className="font-bold text-blue-700 dark:text-blue-400">{item.sku}</span>
                          {item.hsnCode && <span>• HSN {item.hsnCode}</span>}
                        </div>

                        {/* Compact vs Full Family & Own Frame Assignment */}
                        {isCompact ? (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                            {item.patientId && (
                              <span className="rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 px-1.5 py-0.5 font-semibold">
                                👤 {activePatients?.find((p) => p.id === item.patientId)?.fullName || 'Patient'}
                              </span>
                            )}
                            {item.isCustomerOwnFrame && (
                              <span className="rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 font-medium">
                                👓 Own Frame{item.fittingNote ? `: ${item.fittingNote}` : ''}
                              </span>
                            )}
                            {onEditItem && (
                              <button
                                type="button"
                                onClick={() => onEditItem(item)}
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                              >
                                Edit Details
                              </button>
                            )}
                          </div>
                        ) : (
                          activePatients && activePatients.length > 0 && (
                            <div className="mt-1.5 space-y-1">
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-slate-600 dark:text-slate-300 font-medium">
                                  Assign to Patient:
                                </span>
                                <select
                                  aria-label="Assign to Patient"
                                  value={item.patientId || ''}
                                  onChange={(e) =>
                                    onUpdatePatient?.(item.id, e.target.value || null)
                                  }
                                  className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                >
                                  <option value="">Primary Customer</option>
                                  {activePatients.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.fullName} ({p.relationType || 'Current'})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Own Frame Toggle on Lenses */}
                              {(item.category === 'OPHTHALMIC_LENS' ||
                                item.category === 'LENS' ||
                                item.lensType) && (
                                <div className="pt-0.5 space-y-1">
                                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={!!item.isCustomerOwnFrame}
                                      onChange={(e) =>
                                        onUpdateOwnFrame?.(
                                          item.id,
                                          e.target.checked,
                                          item.fittingNote
                                        )
                                      }
                                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 h-3 w-3"
                                    />
                                    <span>Fit to Customer&apos;s Own Frame</span>
                                  </label>

                                  {item.isCustomerOwnFrame && (
                                    <input
                                      type="text"
                                      placeholder="Fitting note (e.g., Old brown rimless frame)"
                                      value={item.fittingNote || ''}
                                      onChange={(e) =>
                                        onUpdateOwnFrame?.(
                                          item.id,
                                          true,
                                          e.target.value
                                        )
                                      }
                                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </td>

                      {/* Quantity Stepper */}
                      <td className="py-2 px-1 text-center align-top">
                        <div className="flex items-center justify-center space-x-0.5">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() =>
                              onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))
                            }
                            className="flex h-6 w-5 items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={99999}
                            data-testid="item-quantity-input"
                            aria-label="Quantity"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              onUpdateQuantity(item.id, isNaN(val) || val < 1 ? 1 : val);
                            }}
                            className="h-6 w-14 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-center font-mono text-xs font-semibold focus:border-blue-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="flex h-6 w-5 items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-2 px-1 text-right font-mono font-medium text-slate-800 dark:text-slate-200 align-top">
                        ₹{unitPriceDec.toFixed(2)}
                      </td>

                      {/* Discount (Editable ₹ / %) */}
                      <td className="py-2 px-1 text-right align-top">
                        <DiscountCell
                          itemId={item.id}
                          subtotalDec={subtotalDec}
                          discount={item.discount ?? item.discountPerUnit ?? '0.00'}
                          onUpdateDiscount={onUpdateDiscount}
                        />
                      </td>

                      {/* Tax Rate Tag */}
                      <td className="py-2 px-1 text-center align-top">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                            item.taxRate === '5.00'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {parseInt(item.taxRate, 10)}%
                        </span>
                      </td>

                      {/* Line Total */}
                      <td className="py-2 px-1 text-right font-mono font-bold text-slate-900 dark:text-slate-100 align-top">
                        ₹{lineTotalDec.toFixed(2)}
                      </td>

                      {/* Actions (Edit / Remove) */}
                      <td className="py-2 pr-1 text-right align-top">
                        <div className="flex items-center justify-end space-x-0.5">
                          <button
                            type="button"
                            data-testid="edit-cart-item-btn"
                            aria-label="Edit item details"
                            onClick={() => onEditItem?.(item)}
                            className="rounded p-1 text-slate-500 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
                            title="Edit / View Details"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Remove item"
                            onClick={() => onRemoveItem(item.id)}
                            className="rounded p-1 text-slate-500 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition"
                            title="Remove item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-3 -mx-4 -mb-4 rounded-b-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Order Settlement Summary
            </span>
            <button
              type="button"
              onClick={onClearCart}
              className="text-[11px] text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium transition"
            >
              Clear Cart
            </button>
          </div>

          <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Subtotal ({totals.itemCount} items)</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                ₹{totals.subtotal.toFixed(2)}
              </span>
            </div>

            {totals.totalDiscount.greaterThan(0) && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Total Discount</span>
                <span className="font-mono font-medium">
                  −₹{totals.totalDiscount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span>Taxable Value</span>
              <span className="font-mono font-medium">
                ₹{totals.taxableValue.toFixed(2)}
              </span>
            </div>

            {/* Split GST breakdown */}
            <div className="flex justify-between text-slate-600 dark:text-slate-300 text-[11px]">
              <span>CGST (Output Tax)</span>
              <span className="font-mono">₹{totals.cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300 text-[11px]">
              <span>SGST (Output Tax)</span>
              <span className="font-mono">₹{totals.sgst.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 pt-1">
              <span className="font-medium">Total GST Amount</span>
              <span className="font-mono font-medium">
                ₹{totals.totalTax.toFixed(2)}
              </span>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between border-t border-slate-300 dark:border-slate-700 pt-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
              <span>Grand Total</span>
              <span className="font-mono text-base text-blue-700 dark:text-blue-400">
                ₹{totals.grandTotal.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-xs font-semibold text-amber-800 dark:text-amber-400 pt-0.5">
              <span>Balance Payable</span>
              <span className="font-mono">₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
