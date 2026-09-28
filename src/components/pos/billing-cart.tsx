'use client';

import { useMemo, useState, useEffect } from 'react';
import Decimal from 'decimal.js';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  AlertCircle,
  Edit3,
  Eye,
  Glasses,
  Link2,
  Unlink,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  X,
  Users,
} from 'lucide-react';
import type { InventoryItem } from './inventory-search';
import type { PrescriptionValues } from './prescription-grid';

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
  prescriptionSnapshot?: PrescriptionValues | null;
  prescriptionTitle?: string | null;
  linkedFrameId?: string | null;
  linkedFrameName?: string | null;
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
  availablePrescriptions?: Record<string, PrescriptionValues>;
  patientPrescriptionHistories?: Record<string, any[]>;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateDiscount: (id: string, discount: string) => void;
  onUpdatePatient?: (id: string, patientId: string | null) => void;
  onUpdateCartItem?: (id: string, updates: Partial<CartItem>) => void;
  onUpdateCartItemRx?: (
    id: string,
    rx: PrescriptionValues | null,
    title?: string | null
  ) => void;
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
  availablePrescriptions,
  patientPrescriptionHistories,
  onUpdateQuantity,
  onUpdateDiscount,
  onUpdatePatient,
  onUpdateCartItem,
  onUpdateCartItemRx,
  onUpdateOwnFrame,
  onEditItem,
  onRemoveItem,
  onClearCart,
  showSummary = false,
  isCompact = false,
}: BillingCartProps) {
  const [inspectingRxItem, setInspectingRxItem] = useState<CartItem | null>(null);

  const candidateFrames = useMemo(() => {
    return items.filter(
      (i: CartItem) =>
        i.category === 'FRAME' ||
        i.category === 'SUNGLASS' ||
        i.category === 'SUNGLASSES' ||
        (!i.lensType && i.category !== 'OPHTHALMIC_LENS' && i.category !== 'LENS')
    );
  }, [items]);

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
                  }) => {
                    const isOphthalmicLens = item.category === 'OPHTHALMIC_LENS' || item.category === 'LENS' || !!item.lensType;
                    const isContactLens = item.category === 'CONTACT_LENS';
                    const isFrame = item.category === 'FRAME' || item.category === 'SUNGLASS' || item.category === 'SUNGLASSES' || item.isCustomerOwnFrame;
                    const hasPower = isOphthalmicLens || isContactLens;
                    const availableCandidateFrames = candidateFrames.filter(
                      (cf) => !items.some((other) => other.id !== item.id && other.linkedFrameId === cf.id)
                    );

                    return (
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

                        {/* Compact vs Full Family & Own Frame & Power Assignment */}
                        {isCompact ? (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                            {item.patientId && activePatients && activePatients.length > 1 && (
                              <span className="rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 px-1.5 py-0.5 font-semibold">
                                👤 {activePatients?.find((p) => p.id === item.patientId)?.fullName || 'Patient'}
                              </span>
                            )}
                            {item.linkedFrameId ? (
                              <span className="rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 font-medium flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                <span>Paired: {item.linkedFrameName || 'Frame'}</span>
                              </span>
                            ) : item.isCustomerOwnFrame ? (
                              <span className="rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 font-medium">
                                👓 Own Frame{item.fittingNote ? `: ${item.fittingNote}` : ''}
                              </span>
                            ) : (item.category === 'OPHTHALMIC_LENS' || item.category === 'LENS' || item.lensType) ? (
                              <span className="rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 font-semibold flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 text-amber-500" />
                                <span>⚠️ Unpaired Lens</span>
                              </span>
                            ) : isFrame ? (
                              <span className="rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 font-medium flex items-center gap-1">
                                <Glasses className="h-3 w-3 text-slate-500" />
                                <span>No Power (Frame)</span>
                              </span>
                            ) : null}

                            {/* View / Change Power button strictly for lenses and contact lenses */}
                            {hasPower && (
                              <button
                                type="button"
                                onClick={() => setInspectingRxItem(item)}
                                className="rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 px-1.5 py-0.5 font-medium flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition cursor-pointer"
                                title="Inspect or choose power without leaving cart"
                              >
                                <Eye className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                <span>{item.prescriptionTitle || (item.prescriptionSnapshot ? 'View Power' : 'Select Power')}</span>
                              </button>
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
                          <div className="mt-1.5 space-y-1.5">
                            {/* Patient & Power Quick Selection Row */}
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              {activePatients && activePatients.length > 1 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-500 dark:text-slate-400 font-medium">
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
                              )}

                              {/* Power button strictly for lenses and contact lenses - NEVER for frames */}
                              {hasPower ? (
                                <button
                                  type="button"
                                  onClick={() => setInspectingRxItem(item)}
                                  className="inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-[11px] font-medium transition cursor-pointer"
                                  title="Inspect or change prescription power right in cart"
                                >
                                  <Eye className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                  <span>
                                    {item.prescriptionTitle
                                      ? `Power: ${item.prescriptionTitle}`
                                      : item.prescriptionSnapshot
                                      ? 'Power: Assigned'
                                      : 'Choose Power'}
                                  </span>
                                </button>
                              ) : isFrame ? (
                                <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-medium">
                                  <Glasses className="h-3 w-3 text-slate-500" />
                                  <span>Frame (Zero Power Invariant)</span>
                                </span>
                              ) : null}
                            </div>

                            {/* Lens Frame Pairing Architecture */}
                            {(item.category === 'OPHTHALMIC_LENS' ||
                              item.category === 'LENS' ||
                              item.lensType) && (
                              <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                  {item.linkedFrameId ? (
                                    <div className="flex items-center gap-1.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 font-medium">
                                      <Link2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                      <span>Paired Frame: <strong>{item.linkedFrameName || 'Cart Frame'}</strong></span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onUpdateCartItem?.(item.id, {
                                            linkedFrameId: null,
                                            linkedFrameName: null,
                                          });
                                        }}
                                        className="ml-1 text-emerald-700 dark:text-emerald-300 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                                        title="Unlink frame"
                                      >
                                        <Unlink className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ) : item.isCustomerOwnFrame ? (
                                    <div className="flex items-center gap-1.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 font-medium">
                                      <Glasses className="h-3 w-3 text-amber-600" />
                                      <span>Customer&apos;s Own Frame</span>
                                      <button
                                        type="button"
                                        onClick={() => onUpdateOwnFrame?.(item.id, false)}
                                        className="ml-1 text-amber-700 hover:text-red-600 cursor-pointer"
                                        title="Change pairing"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 font-semibold text-[10px]">
                                        <AlertCircle className="h-3 w-3 text-amber-500" />
                                        <span>⚠️ Unpaired Lens</span>
                                      </span>

                                      {/* Dropdown to link existing in-cart frame with strict 1:1 enforcement */}
                                      {availableCandidateFrames.length > 0 ? (
                                        <select
                                          aria-label="Pair with Cart Frame"
                                          defaultValue=""
                                          onChange={(e) => {
                                            const frameId = e.target.value;
                                            if (frameId === '__own__') {
                                              onUpdateOwnFrame?.(item.id, true);
                                            } else if (frameId) {
                                              const fr = availableCandidateFrames.find((f) => f.id === frameId);
                                              onUpdateCartItem?.(item.id, {
                                                linkedFrameId: frameId,
                                                linkedFrameName: fr ? fr.description : 'Frame',
                                                isCustomerOwnFrame: false,
                                              });
                                            }
                                          }}
                                          className="rounded border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer"
                                        >
                                          <option value="">+ Link with Frame (1:1)...</option>
                                          {availableCandidateFrames.map((cf) => (
                                            <option key={cf.id} value={cf.id}>
                                              {cf.description} ({cf.sku})
                                            </option>
                                          ))}
                                          <option value="__own__">👓 Customer&apos;s Own Frame</option>
                                        </select>
                                      ) : (
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => onUpdateOwnFrame?.(item.id, true)}
                                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                                          >
                                            + Use Customer&apos;s Own Frame
                                          </button>
                                          {candidateFrames.length > 0 && (
                                            <span className="text-[10px] text-slate-500">
                                              (All frames in cart already paired 1:1)
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {item.isCustomerOwnFrame && (
                                  <input
                                    type="text"
                                    placeholder="Enter frame details (e.g. Ray-Ban Matte Black, Half Rim)"
                                    value={item.fittingNote || ''}
                                    onChange={(e) =>
                                      onUpdateOwnFrame?.(item.id, true, e.target.value)
                                    }
                                    className="w-full rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                                  />
                                )}
                              </div>
                            )}
                          </div>
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
                  );
                })}
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

      {/* ── Inline Prescription Power Inspector & Power Switcher Modal ── */}
      {inspectingRxItem && (
        <CartRxInspectorModal
          isOpen={!!inspectingRxItem}
          item={inspectingRxItem}
          patientName={
            activePatients?.find((p) => p.id === inspectingRxItem.patientId)?.fullName ||
            'Primary Customer'
          }
          currentAttachedRx={inspectingRxItem.prescriptionSnapshot || null}
          sessionRx={
            (inspectingRxItem.patientId && availablePrescriptions?.[inspectingRxItem.patientId]) ||
            (availablePrescriptions ? Object.values(availablePrescriptions)[0] : null)
          }
          historyRecords={
            (inspectingRxItem.patientId && patientPrescriptionHistories?.[inspectingRxItem.patientId]) ||
            []
          }
          activePatients={activePatients}
          availablePrescriptions={availablePrescriptions}
          patientPrescriptionHistories={patientPrescriptionHistories}
          onClose={() => setInspectingRxItem(null)}
          onSave={(rx, title, assignedPatientId) => {
            onUpdateCartItemRx?.(inspectingRxItem.id, rx, title);
            const updates: Partial<CartItem> = {
              prescriptionSnapshot: rx,
              prescriptionTitle: title,
              ...(assignedPatientId ? { patientId: assignedPatientId } : {}),
            };
            onUpdateCartItem?.(inspectingRxItem.id, updates);
            if (assignedPatientId && onUpdatePatient) {
              onUpdatePatient(inspectingRxItem.id, assignedPatientId);
            }
            setInspectingRxItem(null);
          }}
        />
      )}
    </div>
  );
}

interface CartRxInspectorModalProps {
  isOpen: boolean;
  item: CartItem;
  patientName: string;
  currentAttachedRx: PrescriptionValues | null;
  sessionRx: PrescriptionValues | null;
  historyRecords: any[];
  activePatients?: Array<{
    id: string;
    fullName: string;
    relationType?: string;
  }>;
  availablePrescriptions?: Record<string, PrescriptionValues>;
  patientPrescriptionHistories?: Record<string, any[]>;
  onClose: () => void;
  onSave: (
    rx: PrescriptionValues,
    title: string,
    assignedPatientId?: string | null
  ) => void;
}

function CartRxInspectorModal({
  isOpen,
  item,
  patientName,
  currentAttachedRx,
  sessionRx,
  historyRecords,
  activePatients,
  availablePrescriptions,
  patientPrescriptionHistories,
  onClose,
  onSave,
}: CartRxInspectorModalProps) {
  const [assignedPatientId, setAssignedPatientId] = useState<string | null>(
    item.patientId || (activePatients && activePatients.length > 0 ? activePatients[0].id : null)
  );

  const initialRx: PrescriptionValues =
    currentAttachedRx ||
    (assignedPatientId && availablePrescriptions?.[assignedPatientId]) ||
    sessionRx || {
      odSphere: null,
      odCylinder: null,
      odAxis: null,
      odAdd: null,
      odPd: null,
      osSphere: null,
      osCylinder: null,
      osAxis: null,
      osAdd: null,
      osPd: null,
      binocularPd: null,
    };

  const [activeRx, setActiveRx] = useState<PrescriptionValues>(initialRx);
  const [selectedTitle, setSelectedTitle] = useState<string>(
    item.prescriptionTitle || 'Prescription Power'
  );
  const [isEditingCustom, setIsEditingCustom] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleApplyPreset = (rx: PrescriptionValues, label: string) => {
    setActiveRx(rx);
    setSelectedTitle(label);
    setIsEditingCustom(false);
  };

  const formatEyePower = (
    sph?: number | null,
    cyl?: number | null,
    axis?: number | null,
    add?: number | null
  ) => {
    const parts: string[] = [];
    if (sph !== null && sph !== undefined) {
      parts.push(`SPH: ${sph > 0 ? `+${sph.toFixed(2)}` : sph.toFixed(2)}`);
    } else {
      parts.push('SPH: Plano');
    }
    if (cyl !== null && cyl !== undefined && cyl !== 0) {
      parts.push(`CYL: ${cyl > 0 ? `+${cyl.toFixed(2)}` : cyl.toFixed(2)}`);
      if (axis !== null && axis !== undefined) parts.push(`AXIS: ${axis}°`);
    }
    if (add !== null && add !== undefined && add !== 0) {
      parts.push(`ADD: +${add.toFixed(2)}`);
    }
    return parts.join(' | ');
  };

  const activeCustomerHistories =
    (assignedPatientId && patientPrescriptionHistories?.[assignedPatientId]) ||
    historyRecords;

  const currentPatientObj = activePatients?.find((p) => p.id === assignedPatientId);
  const displayPatientName = currentPatientObj?.fullName || patientName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 bg-slate-50/70 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Prescription Power Inspector & Selector
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Item: <span className="font-semibold text-slate-700 dark:text-slate-200">{item.description}</span> · Patient: <span className="font-semibold text-blue-600 dark:text-blue-400">{displayPatientName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-100 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Active Added Customers on Order & Their Powers */}
          {activePatients && activePatients.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Active Added Customers on Order & Their Powers</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-medium">
                  Click to select customer & apply power
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activePatients.map((customer) => {
                  const customerRx = availablePrescriptions?.[customer.id];
                  const isAssigned = assignedPatientId === customer.id;
                  const hasPowersEntered =
                    customerRx &&
                    (customerRx.odSphere !== null ||
                      customerRx.osSphere !== null ||
                      customerRx.odCylinder !== null ||
                      customerRx.osCylinder !== null);

                  return (
                    <div
                      key={customer.id}
                      data-testid={`customer-power-card-${customer.id}`}
                      onClick={() => {
                        if (customerRx) {
                          setActiveRx(customerRx);
                          setSelectedTitle(`${customer.fullName}'s Rx Matrix`);
                        }
                        setAssignedPatientId(customer.id);
                        setIsEditingCustom(false);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                        isAssigned
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                              {customer.fullName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {customer.fullName}
                            </span>
                            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                              {customer.relationType || 'Current'}
                            </span>
                          </div>
                          {isAssigned && (
                            <span className="rounded-full bg-blue-600 text-white p-0.5 shrink-0">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </div>

                        {/* Power details OD / OS */}
                        {hasPowersEntered && customerRx ? (
                          <div className="space-y-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between">
                              <span className="font-bold text-blue-600 dark:text-blue-400">OD:</span>
                              <span className="truncate ml-1">{formatEyePower(customerRx.odSphere, customerRx.odCylinder, customerRx.odAxis, customerRx.odAdd)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">OS:</span>
                              <span className="truncate ml-1">{formatEyePower(customerRx.osSphere, customerRx.osCylinder, customerRx.osAxis, customerRx.osAdd)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-900/40 p-1.5 rounded">
                            No refraction entered yet (Plano)
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-medium text-slate-500">
                          {isAssigned ? 'Assigned to item' : 'Click to select'}
                        </span>
                        <button
                          type="button"
                          className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                            isAssigned
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isAssigned ? 'Selected' : 'Use Power'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Power Preview Box */}
          <div className="rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/30 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-indigo-900 dark:text-indigo-300 text-xs">
                Active Power for this Line Item ({selectedTitle})
              </span>
              <button
                type="button"
                onClick={() => setIsEditingCustom(!isEditingCustom)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                {isEditingCustom ? '← Use Preset Matrix' : '✏️ Fine-tune Custom Diopters'}
              </button>
            </div>

            {/* Read-Only or Editable Matrix Table */}
            <div className="overflow-x-auto rounded border border-indigo-200/70 dark:border-indigo-900/40 bg-white dark:bg-slate-900">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-1.5 px-2 text-left">Eye</th>
                    <th className="py-1.5 px-2">SPH</th>
                    <th className="py-1.5 px-2">CYL</th>
                    <th className="py-1.5 px-2">AXIS</th>
                    <th className="py-1.5 px-2">ADD</th>
                    <th className="py-1.5 px-2">PD</th>
                  </tr>
                </thead>
                <tbody className="font-mono divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-semibold">
                  {/* Right Eye (OD) */}
                  <tr>
                    <td className="py-2 px-2 text-left font-sans font-bold text-blue-700 dark:text-blue-400">
                      OD (Right)
                    </td>
                    <td className="py-2 px-2">
                      {isEditingCustom ? (
                        <input
                          type="number"
                          step="0.25"
                          value={activeRx.odSphere ?? ''}
                          onChange={(e) => setActiveRx({ ...activeRx, odSphere: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 text-center py-0.5 bg-slate-50 dark:bg-slate-800"
                        />
                      ) : (
                        activeRx.odSphere !== null ? (activeRx.odSphere > 0 ? `+${activeRx.odSphere.toFixed(2)}` : activeRx.odSphere.toFixed(2)) : 'Plano'
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {isEditingCustom ? (
                        <input
                          type="number"
                          step="0.25"
                          value={activeRx.odCylinder ?? ''}
                          onChange={(e) => setActiveRx({ ...activeRx, odCylinder: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 text-center py-0.5 bg-slate-50 dark:bg-slate-800"
                        />
                      ) : (
                        activeRx.odCylinder ? (activeRx.odCylinder > 0 ? `+${activeRx.odCylinder.toFixed(2)}` : activeRx.odCylinder.toFixed(2)) : '0.00'
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {isEditingCustom ? (
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={activeRx.odAxis ?? ''}
                          onChange={(e) => setActiveRx({ ...activeRx, odAxis: e.target.value ? parseInt(e.target.value, 10) : null })}
                          className="w-14 rounded border border-slate-300 dark:border-slate-700 text-center py-0.5 bg-slate-50 dark:bg-slate-800"
                        />
                      ) : (
                        activeRx.odAxis ? `${activeRx.odAxis}°` : '-'
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {isEditingCustom ? (
                        <input
                          type="number"
                          step="0.25"
                          value={activeRx.odAdd ?? ''}
                          onChange={(e) => setActiveRx({ ...activeRx, odAdd: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-14 rounded border border-slate-300 dark:border-slate-700 text-center py-0.5 bg-slate-50 dark:bg-slate-800"
                        />
                      ) : (
                        activeRx.odAdd ? `+${activeRx.odAdd.toFixed(2)}` : '-'
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {isEditingCustom ? (
                        <input
                          type="number"
                          value={activeRx.odPd ?? ''}
                          onChange={(e) => setActiveRx({ ...activeRx, odPd: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-14 rounded border border-slate-300 dark:border-slate-700 text-center py-0.5 bg-slate-50 dark:bg-slate-800"
                        />
                      ) : (
                        activeRx.odPd ? `${activeRx.odPd} mm` : '-'
                      )}
                    </td>
                  </tr>

                  {/* Left Eye (OS) */}
                  <tr>
                    <td className="py-2 px-2 text-left font-sans font-bold text-emerald-700 dark:text-emerald-400">
                      OS (Left)
                    </td>
                    <td className="py-2 px-2">
                      {isEditingCustom ? (
                        <input
                          type="number"
                          step="0.25"
                          value={activeRx.osSphere ?? ''}
                          onChange={(e) => setActiveRx({ ...activeRx, osSphere: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 text-center py-0.5 bg-slate-50 dark:bg-slate-800"
                        />
                      ) : (
                        activeRx.osSphere !== null ? (activeRx.osSphere > 0 ? `+${activeRx.osSphere.toFixed(2)}` : activeRx.osSphere.toFixed(2)) : 'Plano'
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {isEditingCustom ? (
                        <input
                          type="number"
                          step="0.25"
                          value={activeRx.osCylinder ?? ''}
                          onChange={(e) => setActiveRx({ ...activeRx, osCylinder: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 text-center py-0.5 bg-slate-50 dark:bg-slate-800"
                        />
                      ) : (
                        activeRx.osCylinder ? (activeRx.osCylinder > 0 ? `+${activeRx.osCylinder.toFixed(2)}` : activeRx.osCylinder.toFixed(2)) : '0.00'
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {isEditingCustom ? (
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={activeRx.osAxis ?? ''}
                          onChange={(e) => setActiveRx({ ...activeRx, osAxis: e.target.value ? parseInt(e.target.value, 10) : null })}
                          className="w-14 rounded border border-slate-300 dark:border-slate-700 text-center py-0.5 bg-slate-50 dark:bg-slate-800"
                        />
                      ) : (
                        activeRx.osAxis ? `${activeRx.osAxis}°` : '-'
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {isEditingCustom ? (
                        <input
                          type="number"
                          step="0.25"
                          value={activeRx.osAdd ?? ''}
                          onChange={(e) => setActiveRx({ ...activeRx, osAdd: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-14 rounded border border-slate-300 dark:border-slate-700 text-center py-0.5 bg-slate-50 dark:bg-slate-800"
                        />
                      ) : (
                        activeRx.osAdd ? `+${activeRx.osAdd.toFixed(2)}` : '-'
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {isEditingCustom ? (
                        <input
                          type="number"
                          value={activeRx.osPd ?? ''}
                          onChange={(e) => setActiveRx({ ...activeRx, osPd: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-14 rounded border border-slate-300 dark:border-slate-700 text-center py-0.5 bg-slate-50 dark:bg-slate-800"
                        />
                      ) : (
                        activeRx.osPd ? `${activeRx.osPd} mm` : '-'
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Preset Selector: Prescriptions on File */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Available Prescriptions on File for {displayPatientName}
            </h3>

            {/* Session Current Rx */}
            {sessionRx && (
              <div
                onClick={() => handleApplyPreset(sessionRx, 'Current Session Rx')}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 cursor-pointer transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-700 dark:text-blue-400">Current Session Rx</span>
                    <span className="rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px] px-1.5 py-0.2 font-semibold">Active Matrix</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    OD: {formatEyePower(sessionRx.odSphere, sessionRx.odCylinder, sessionRx.odAxis, sessionRx.odAdd)}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded bg-blue-600 text-white px-2 py-1 text-[11px] font-semibold hover:bg-blue-700 transition"
                >
                  Choose
                </button>
              </div>
            )}

            {/* Past Prescription Records */}
            {activeCustomerHistories.length > 0 ? (
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {activeCustomerHistories.map((rec: any, idx: number) => {
                  const dateStr = rec.prescribedAt ? new Date(rec.prescribedAt).toLocaleDateString('en-IN') : 'Past Rx';
                  const title = `Historical Rx (${dateStr})`;
                  const converted: PrescriptionValues = {
                    odSphere: rec.odSphere ? parseFloat(rec.odSphere) : null,
                    odCylinder: rec.odCylinder ? parseFloat(rec.odCylinder) : null,
                    odAxis: rec.odAxis ?? null,
                    odAdd: rec.odAdd ? parseFloat(rec.odAdd) : null,
                    odPd: rec.odPd ? parseFloat(rec.odPd) : null,
                    osSphere: rec.osSphere ? parseFloat(rec.osSphere) : null,
                    osCylinder: rec.osCylinder ? parseFloat(rec.osCylinder) : null,
                    osAxis: rec.osAxis ?? null,
                    osAdd: rec.osAdd ? parseFloat(rec.osAdd) : null,
                    osPd: rec.osPd ? parseFloat(rec.osPd) : null,
                    binocularPd: rec.binocularPd ? parseFloat(rec.binocularPd) : null,
                  };

                  return (
                    <div
                      key={rec.id || idx}
                      onClick={() => handleApplyPreset(converted, title)}
                      className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 cursor-pointer transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{title}</span>
                          {rec.prescribedByName && (
                            <span className="text-[10px] text-slate-500">Dr. {rec.prescribedByName}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          OD: {formatEyePower(converted.odSphere, converted.odCylinder, converted.odAxis, converted.odAdd)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 transition"
                      >
                        Choose
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              !sessionRx && (
                <div className="rounded border border-dashed border-slate-200 dark:border-slate-800 p-3 text-center text-slate-500 text-xs">
                  No prior prescriptions on file. You can enter diopters directly above.
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-5 py-3 bg-slate-50/80 dark:bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(activeRx, selectedTitle, assignedPatientId)}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            Attach Power to Item
          </button>
        </div>
      </div>
    </div>
  );
}
