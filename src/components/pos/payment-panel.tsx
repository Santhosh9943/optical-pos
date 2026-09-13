// src/components/pos/payment-panel.tsx
'use client';

import { useMemo } from 'react';
import Decimal from 'decimal.js';
import { Banknote, QrCode, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';

export type PaymentMode = 'CASH' | 'UPI' | 'CARD';

interface PaymentPanelProps {
  grandTotal: Decimal;
  advancePaid: string;
  onAdvancePaidChange: (amount: string) => void;
  paymentMode: PaymentMode;
  onPaymentModeChange: (mode: PaymentMode) => void;
  reference: string;
  onReferenceChange: (ref: string) => void;
  disabled?: boolean;
}

export function PaymentPanel({
  grandTotal,
  advancePaid,
  onAdvancePaidChange,
  paymentMode,
  onPaymentModeChange,
  reference,
  onReferenceChange,
  disabled = false,
}: PaymentPanelProps) {
  const { balanceDue, isOverpaid, isFullyPaid } = useMemo(() => {
    const total = grandTotal instanceof Decimal ? grandTotal : new Decimal(grandTotal || '0.00');
    const advance = new Decimal(advancePaid || '0.00');
    const bal = total.minus(advance);
    return {
      balanceDue: bal,
      isOverpaid: bal.isNegative(),
      isFullyPaid: bal.isZero() && total.greaterThan(0),
    };
  }, [grandTotal, advancePaid]);

  const handleQuickFullPay = () => {
    onAdvancePaidChange(grandTotal.toFixed(2));
  };

  const handleQuickZeroPay = () => {
    onAdvancePaidChange('0.00');
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-1.5">
          <CreditCard className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Payment & Settlement
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handleQuickFullPay}
            disabled={disabled || grandTotal.isZero()}
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition"
          >
            Pay Full
          </button>
          <span className="text-slate-300">·</span>
          <button
            type="button"
            onClick={handleQuickZeroPay}
            disabled={disabled}
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-200 disabled:opacity-50 transition"
          >
            Zero Adv
          </button>
        </div>
      </div>

      {/* Grand Total Display */}
      <div className="flex items-center justify-between rounded-md bg-blue-50/70 px-2.5 py-1.5 border border-blue-100">
        <span className="text-xs font-semibold text-blue-900">Grand Total</span>
        <span className="font-mono text-sm font-bold text-blue-700">
          ₹{grandTotal.toFixed(2)}
        </span>
      </div>

      {/* Payment Mode Selector Tabs */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
          Payment Mode
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onPaymentModeChange('CASH')}
            disabled={disabled}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold border transition ${
              paymentMode === 'CASH'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Banknote className="h-3.5 w-3.5" />
            <span>Cash</span>
          </button>
          <button
            type="button"
            onClick={() => onPaymentModeChange('UPI')}
            disabled={disabled}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold border transition ${
              paymentMode === 'UPI'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>UPI</span>
          </button>
          <button
            type="button"
            onClick={() => onPaymentModeChange('CARD')}
            disabled={disabled}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold border transition ${
              paymentMode === 'CARD'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Card</span>
          </button>
        </div>
      </div>

      {/* Advance Paid Input & Transaction Ref */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
            Advance Paid (₹)
          </label>
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-2.5 text-xs text-slate-400 font-mono">
              ₹
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={advancePaid}
              disabled={disabled}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*(\.\d{0,2})?$/.test(val)) {
                  onAdvancePaidChange(val);
                }
              }}
              placeholder="0.00"
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-6 pr-2 text-xs font-mono font-bold text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
            {paymentMode === 'CASH' ? 'Note (Optional)' : 'Transaction Ref'}
          </label>
          <input
            type="text"
            value={reference}
            disabled={disabled}
            onChange={(e) => onReferenceChange(e.target.value)}
            placeholder={
              paymentMode === 'UPI'
                ? 'UPI Ref / UTR'
                : paymentMode === 'CARD'
                  ? 'Card Last 4'
                  : 'Cash remarks'
            }
            className="w-full rounded-md border border-slate-300 bg-white py-1.5 px-2 text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Balance Due Readout */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
        <span className="text-xs font-bold text-slate-700">Balance Due</span>
        {isOverpaid ? (
          <div className="flex items-center gap-1 text-xs font-semibold text-red-600 font-mono">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Overpaid (−₹{balanceDue.abs().toFixed(2)})</span>
          </div>
        ) : isFullyPaid ? (
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 font-mono">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>₹0.00 (Settled)</span>
          </div>
        ) : (
          <span className="font-mono text-sm font-bold text-amber-700">
            ₹{balanceDue.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
