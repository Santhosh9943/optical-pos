'use client';

import React from 'react';
import Decimal from 'decimal.js';
import {
  CreditCard,
  ShoppingBag,
  CheckCircle2,
  Printer,
  FileText,
  ClipboardList,
  PlusCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import type { PaymentMode } from './payment-panel';
import type { PrintOrderData } from './print-layouts';

interface DenseBottomBarProps {
  totalItems: number;
  subtotal: Decimal;
  totalDiscount: Decimal;
  totalTax: Decimal;
  grandTotal: Decimal;
  advancePaid: string;
  onAdvancePaidChange: (amount: string) => void;
  paymentMode: PaymentMode;
  onPaymentModeChange: (mode: PaymentMode) => void;
  reference: string;
  onReferenceChange: (ref: string) => void;
  balanceDue: Decimal;
  isSubmitting: boolean;
  canCheckout: boolean;
  onCheckout: () => void;
  completedOrder: PrintOrderData | null;
  onPrintThermal: () => void;
  onPrintA4: () => void;
  onPrintWorkshop: () => void;
  onResetOrder: () => void;
}

export function DenseBottomBar({
  totalItems,
  subtotal,
  totalDiscount,
  totalTax,
  grandTotal,
  advancePaid,
  onAdvancePaidChange,
  paymentMode,
  onPaymentModeChange,
  reference,
  onReferenceChange,
  balanceDue,
  isSubmitting,
  canCheckout,
  onCheckout,
  completedOrder,
  onPrintThermal,
  onPrintA4,
  onPrintWorkshop,
  onResetOrder,
}: DenseBottomBarProps) {
  if (completedOrder) {
    return (
      <div
        data-testid="dense-bottom-bar-completed"
        className="sticky bottom-0 z-30 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-300 dark:border-emerald-700 bg-emerald-50/95 dark:bg-emerald-950/90 px-4 py-2.5 shadow-lg backdrop-blur-md transition"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Order #{completedOrder.invoiceNumber} Finalized!</span>
          <span className="font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
            (Total: ₹{completedOrder.grandTotal} · Balance Due: ₹{completedOrder.balanceDue})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrintThermal}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-emerald-400" />
            <span>Thermal</span>
          </button>
          <button
            type="button"
            onClick={onPrintA4}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>A4 Invoice</span>
          </button>
          <button
            type="button"
            onClick={onPrintWorkshop}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 px-3 py-1.5 text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <ClipboardList className="h-3.5 w-3.5 text-indigo-500" />
            <span>Lab Slip</span>
          </button>
          <button
            type="button"
            onClick={onResetOrder}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Order (F1)</span>
          </button>
        </div>
      </div>
    );
  }

  const handleFullPayment = () => {
    onAdvancePaidChange(grandTotal.toFixed(2));
  };

  const handleZeroPayment = () => {
    onAdvancePaidChange('0.00');
  };

  return (
    <div
      data-testid="dense-bottom-bar"
      className="sticky bottom-0 z-30 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 py-2.5 shadow-lg backdrop-blur-md transition"
    >
      {/* 1. Cart Metrics Quick Summary */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <span>Subtotal: ₹{subtotal.toFixed(2)}</span>
          {totalDiscount.greaterThan(0) && (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Dis: -₹{totalDiscount.toFixed(2)}
            </span>
          )}
          <span>Tax: ₹{totalTax.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total:
          </span>
          <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400">
            ₹{grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 2. Inline Settlement Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Advance Payment Input */}
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mr-1.5">
            Advance:
          </span>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mr-0.5">₹</span>
          <input
            type="number"
            min={0}
            max={grandTotal.toNumber() || 999999}
            step="0.01"
            data-testid="dense-advance-paid-input"
            value={advancePaid}
            onChange={(e) => onAdvancePaidChange(e.target.value)}
            className="w-20 bg-transparent text-right font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
            placeholder="0.00"
          />
          <div className="flex items-center gap-1 ml-2 border-l border-slate-200 dark:border-slate-700 pl-1.5">
            <button
              type="button"
              onClick={handleFullPayment}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 px-1 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
              title="Pay full amount"
            >
              Full
            </button>
            <button
              type="button"
              onClick={handleZeroPayment}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 px-1 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Zero advance"
            >
              Zero
            </button>
          </div>
        </div>

        {/* Payment Mode Selector */}
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs">
          <CreditCard className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 mr-1.5 shrink-0" />
          <select
            data-testid="dense-payment-mode-select"
            value={paymentMode}
            onChange={(e) => onPaymentModeChange(e.target.value as PaymentMode)}
            className="bg-transparent font-semibold text-xs text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
          >
            <option value="CASH">Cash</option>
            <option value="UPI">UPI / QR</option>
            <option value="CARD">Debit / Credit Card</option>
          </select>
        </div>

        {/* Payment Reference (for UPI/Card) */}
        {(paymentMode === 'UPI' || paymentMode === 'CARD') && (
          <input
            type="text"
            placeholder="Txn Ref #"
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
            className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
          />
        )}

        {/* Balance Due Pill */}
        <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-[11px]">
          <span className="text-amber-800 dark:text-amber-300 font-medium">Balance:</span>
          <span className="font-mono font-bold text-amber-900 dark:text-amber-200">
            ₹{balanceDue.toFixed(2)}
          </span>
        </div>

        {/* Complete Order Primary Button */}
        <button
          type="button"
          data-testid="btn-complete-order"
          disabled={!canCheckout || isSubmitting}
          onClick={onCheckout}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-bold shadow-md hover:shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              <span>Complete Order [F10]</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
