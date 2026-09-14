'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PackageCheck,
  Receipt,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { collectBalance } from '@/actions/payment-actions';
import type { PaymentMode } from '@/db/schema';
import Decimal from 'decimal.js';

export interface SettleInvoiceData {
  id: string;
  invoiceNumber: string;
  customerName?: string;
  payerName?: string;
  grandTotal: string;
  advancePaid?: string;
  balanceDue: string;
  orderStatus?: string;
  paymentStatus?: string;
}

interface SettleBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SettleInvoiceData | null;
  onSuccess?: (result: {
    invoiceId: string;
    newBalance: string;
    isDelivered: boolean;
  }) => void;
}

export function SettleBalanceModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: SettleBalanceModalProps) {
  const router = useRouter();

  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [reference, setReference] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync state whenever selected invoice changes
  useEffect(() => {
    if (invoice) {
      setAmount(invoice.balanceDue || '0.00');
      setPaymentMode('UPI');
      setReference('');
      setIsSubmitting(false);
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const payerDisplayName = invoice.customerName || invoice.payerName || 'Customer';
  const balanceDueNum = Number(invoice.balanceDue || 0);

  const handleFullBalance = () => {
    setAmount(invoice.balanceDue || '0.00');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amtDec = new Decimal(amount || '0.00');
    if (amtDec.lessThanOrEqualTo(0) || amtDec.isNaN()) {
      toast.error('Please enter a valid amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await collectBalance(
        invoice.id,
        amount,
        paymentMode,
        reference.trim() || undefined
      );

      if (result.success) {
        toast.success(
          `Payment of ₹${Number(amount).toFixed(2)} collected successfully!`,
          {
            description: `Invoice ${invoice.invoiceNumber} delivered & closed.`,
          }
        );

        router.refresh();

        if (onSuccess) {
          onSuccess({
            invoiceId: invoice.id,
            newBalance: result.newBalance || '0.00',
            isDelivered: (result.orderStatus || '') === 'DELIVERED_AND_CLOSED',
          });
        }

        onClose();
      } else {
        toast.error(result.error || 'Failed to collect balance.');
      }
    } catch (err) {
      console.error('Error settling balance:', err);
      toast.error('An unexpected error occurred while collecting balance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedAmount = Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });

  return (
    <div
      data-testid="settle-balance-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="flex flex-col w-full max-w-lg rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/40">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Settle Balance & Deliver Order
              </h3>
              <p className="text-[11px] font-mono text-muted-foreground">
                Invoice #{invoice.invoiceNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-settle-modal"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Order Details Grid */}
          <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Payer Name:</span>
              </span>
              <span className="font-semibold text-foreground">
                {payerDisplayName}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Invoice Number:</span>
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {invoice.invoiceNumber}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Grand Total:</span>
              <span className="font-mono font-semibold text-foreground">
                ₹{Number(invoice.grandTotal).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            {invoice.advancePaid && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Advance Already Paid:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  ₹{Number(invoice.advancePaid).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Prominent Balance Due Banner */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/40 p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Pending Balance Due
              </span>
              <p className="text-[11px] text-muted-foreground">
                Required for handover
              </p>
            </div>
            <div
              data-testid="settle-modal-balance-due"
              className="text-2xl font-black font-mono text-amber-700 dark:text-amber-400"
            >
              ₹{balanceDueNum.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          {/* Collection Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="settle-amount-input"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Collection Amount (₹)
              </label>
              <button
                type="button"
                onClick={handleFullBalance}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Full Balance
              </button>
            </div>
            <input
              id="settle-amount-input"
              data-testid="input-settle-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          {/* Payment Mode Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Payment Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                data-testid="payment-mode-cash"
                onClick={() => setPaymentMode('CASH')}
                disabled={isSubmitting}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold border transition cursor-pointer ${
                  paymentMode === 'CASH'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <Banknote className="h-4 w-4" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                data-testid="payment-mode-upi"
                onClick={() => setPaymentMode('UPI')}
                disabled={isSubmitting}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold border transition cursor-pointer ${
                  paymentMode === 'UPI'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <QrCode className="h-4 w-4" />
                <span>UPI</span>
              </button>

              <button
                type="button"
                data-testid="payment-mode-card"
                onClick={() => setPaymentMode('CARD')}
                disabled={isSubmitting}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold border transition cursor-pointer ${
                  paymentMode === 'CARD'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span>Card</span>
              </button>
            </div>
          </div>

          {/* Optional Reference Input */}
          <div>
            <label
              htmlFor="settle-ref-input"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block"
            >
              Transaction Reference / UPI UTR (Optional)
            </label>
            <input
              id="settle-ref-input"
              data-testid="input-settle-reference"
              type="text"
              placeholder={paymentMode === 'UPI' ? 'e.g. UPI Ref / UTR #' : 'e.g. Auth Code / Note'}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Settlement Info Note */}
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-blue-900 dark:text-blue-300">
              Collecting this balance will mark the invoice payment status as{' '}
              <span className="font-bold">PAID</span> and transition the order status to{' '}
              <span className="font-bold">DELIVERED & CLOSED</span>.
            </p>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              data-testid="btn-cancel-settle"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-border bg-background hover:bg-muted px-4 py-2 text-xs font-bold text-foreground transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="btn-confirm-settle-balance"
              disabled={isSubmitting || !amount || Number(amount) <= 0}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="h-3.5 w-3.5" />
                  <span>Collect ₹{formattedAmount} & Deliver Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
