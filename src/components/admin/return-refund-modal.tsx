'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Receipt,
  User,
  Package,
  CreditCard,
  Banknote,
  QrCode,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import Decimal from 'decimal.js';
import { getInvoiceForEditAction } from '@/actions/invoice-edit-actions';
import {
  processReturnRefundAction,
  type ProcessReturnRefundInput,
} from '@/actions/return-refund-actions';

interface ReturnRefundModalProps {
  isOpen: boolean;
  invoiceId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReturnRefundModal({
  isOpen,
  invoiceId,
  onClose,
  onSuccess,
}: ReturnRefundModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Form State
  const [selectedItemId, setSelectedItemId] = useState<string>('CUSTOM');
  const [returnQuantity, setReturnQuantity] = useState<number>(1);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundMode, setRefundMode] = useState<'STORE_CREDIT' | 'CASH' | 'UPI' | 'CARD'>('STORE_CREDIT');
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    if (isOpen && invoiceId) {
      setIsLoading(true);
      getInvoiceForEditAction(invoiceId)
        .then((res) => {
          if (res.success && res.data) {
            const d = res.data;
            setInvoiceData(d);
            setSelectedItemId('CUSTOM');
            setReturnQuantity(1);
            setRefundAmount(d.advancePaid || d.grandTotal || '0.00');
            setRefundMode('STORE_CREDIT');
            setReason('');
          } else {
            toast.error(res.error || 'Failed to load invoice for return');
            onClose();
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error('Unexpected error loading invoice details');
          onClose();
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, invoiceId, onClose]);

  // When selected line item changes, auto-suggest refund amount and quantity
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    if (!invoiceData || !invoiceData.items) return;

    if (itemId === 'CUSTOM') {
      setRefundAmount(invoiceData.advancePaid || invoiceData.grandTotal || '0.00');
      setReturnQuantity(1);
    } else {
      const item = invoiceData.items.find((i: any) => i.id === itemId);
      if (item) {
        setReturnQuantity(item.quantity || 1);
        setRefundAmount(item.lineTotal || '0.00');
      }
    }
  };

  const selectedItem = useMemo(() => {
    if (!invoiceData?.items || selectedItemId === 'CUSTOM') return null;
    return invoiceData.items.find((i: any) => i.id === selectedItemId);
  }, [invoiceData, selectedItemId]);

  const maxRefundAllowed = useMemo(() => {
    if (!invoiceData) return new Decimal(0);
    // Cannot refund more than what customer has paid on this invoice
    return new Decimal(invoiceData.advancePaid || invoiceData.grandTotal || '0');
  }, [invoiceData]);

  const isRefundAmountValid = useMemo(() => {
    try {
      const amt = new Decimal(refundAmount || '0');
      return amt.greaterThan(0) && amt.lessThanOrEqualTo(maxRefundAllowed);
    } catch {
      return false;
    }
  }, [refundAmount, maxRefundAllowed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || !isRefundAmountValid) {
      toast.error('Please enter a valid refund amount');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: ProcessReturnRefundInput = {
        invoiceId,
        itemId: selectedItemId === 'CUSTOM' ? undefined : selectedItemId,
        returnQuantity: selectedItemId === 'CUSTOM' ? undefined : returnQuantity,
        refundAmount: new Decimal(refundAmount).toFixed(2),
        refundMode,
        reason: reason.trim() || 'Customer return processed at counter',
      };

      const res = await processReturnRefundAction(payload);
      if (res.success) {
        if (refundMode === 'STORE_CREDIT') {
          toast.success('Store Credit Issued!', {
            description: `₹${payload.refundAmount} credited to customer wallet. New balance: ₹${res.newStoreCredit}`,
          });
        } else {
          toast.success('Return & Refund Processed', {
            description: `₹${payload.refundAmount} refunded via ${refundMode}. Ref: ${res.refundReference}`,
          });
        }
        onSuccess?.();
        onClose();
      } else {
        toast.error('Failed to process return', {
          description: res.error || 'Please verify amount and permissions.',
        });
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error('Error processing return and refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-refund-title"
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="return-refund-title"
                className="text-sm font-bold text-slate-900 dark:text-slate-100"
              >
                Process Return & Store Credit
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Invoice #{invoiceData?.invoiceNumber || '...'} • Restock inventory & issue refund
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="h-7 w-7 animate-spin text-amber-600" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loading invoice and order line items...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Customer & Invoice Summary Strip */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  <span>{invoiceData?.customerName}</span>
                  <span className="text-[11px] text-slate-400">({invoiceData?.customerPhone})</span>
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400">
                  <Receipt className="h-3.5 w-3.5" />
                  <span>#{invoiceData?.invoiceNumber}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-slate-200 dark:border-slate-800 pt-2 text-[11px]">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Grand Total</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    ₹{invoiceData?.grandTotal}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Total Paid</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    ₹{invoiceData?.advancePaid}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Balance Due</span>
                  <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                    ₹{invoiceData?.balanceDue}
                  </span>
                </div>
              </div>
            </div>

            {/* Item Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Item to Return & Restock
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => handleItemSelect(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="CUSTOM">Custom Amount / Entire Order Return</option>
                {invoiceData?.items?.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.description} (Qty: {item.quantity} • ₹{item.lineTotal})
                    {item.inventoryItemId ? ' [Restockable]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Restock Quantity (if line item selected) */}
            {selectedItem && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-600" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Restock into Inventory
                    </span>
                    <p className="text-[10px] text-slate-500">
                      {selectedItem.inventoryItemId ? 'Stock will be automatically restored.' : 'No linked SKU found.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Qty:</span>
                  <input
                    type="number"
                    min="1"
                    max={selectedItem.quantity || 1}
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-mono text-center text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Refund Amount */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Refund Amount (₹)
                </label>
                <span className="text-[11px] text-slate-500">
                  Max allowed: <strong className="font-mono text-slate-700 dark:text-slate-300">₹{maxRefundAllowed.toFixed(2)}</strong>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxRefundAllowed.toFixed(2)}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Refund Destination Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Refund Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setRefundMode('STORE_CREDIT')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    refundMode === 'STORE_CREDIT'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Wallet className="h-4 w-4 mb-1 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px]">Store Credit</span>
                  <span className="text-[9px] opacity-75 font-normal">Customer Wallet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRefundMode('CASH')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    refundMode === 'CASH'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Banknote className="h-4 w-4 mb-1 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px]">Cash Out</span>
                  <span className="text-[9px] opacity-75 font-normal">Register Till</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRefundMode('UPI')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    refundMode === 'UPI'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <QrCode className="h-4 w-4 mb-1 text-blue-600 dark:text-blue-400" />
                  <span className="text-[11px]">UPI Refund</span>
                  <span className="text-[9px] opacity-75 font-normal">Instant VPA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRefundMode('CARD')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    refundMode === 'CARD'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <CreditCard className="h-4 w-4 mb-1 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-[11px]">Card Reversal</span>
                  <span className="text-[9px] opacity-75 font-normal">POS Terminal</span>
                </button>
              </div>
            </div>

            {/* Reason / Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reason for Return
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Frame size misfit, patient requested alternative frame, prescription lens power change..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isRefundAmountValid}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Issue {refundMode === 'STORE_CREDIT' ? 'Store Credit' : 'Refund'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
