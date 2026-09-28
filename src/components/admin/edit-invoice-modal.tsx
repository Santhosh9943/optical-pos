'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileEdit,
  Loader2,
  Check,
  AlertCircle,
  Calculator,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Receipt,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import Decimal from 'decimal.js';
import {
  getInvoiceForEditAction,
  updateInvoiceDetailsAction,
} from '@/actions/invoice-edit-actions';

interface EditInvoiceModalProps {
  isOpen: boolean;
  invoiceId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditInvoiceModal({
  isOpen,
  invoiceId,
  onClose,
  onSuccess,
}: EditInvoiceModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [includeGst, setIncludeGst] = useState(true);

  useEffect(() => {
    if (isOpen && invoiceId) {
      setIsLoading(true);
      getInvoiceForEditAction(invoiceId)
        .then((res) => {
          if (res.success && res.data) {
            const d = res.data;
            setInvoiceData(d);
            setCustomerName(d.customerName || '');
            setCustomerPhone(d.customerPhone || '');
            setCustomerAddress(d.customerAddress || '');
            setGstin(d.customerGstin || '');
            setNotes(d.notes || '');
            setDeliveryDate(
              d.promisedDeliveryDate
                ? new Date(d.promisedDeliveryDate).toISOString().split('T')[0]
                : ''
            );
            setIncludeGst(d.hasGst);
          } else {
            toast.error(res.error || 'Failed to load invoice');
            onClose();
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error('Unexpected error loading invoice');
          onClose();
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, invoiceId, onClose]);

  // Live recalculated preview using decimal.js
  const previewTotals = useMemo(() => {
    if (!invoiceData || !invoiceData.items) {
      return {
        subtotal: new Decimal(0),
        taxable: new Decimal(0),
        tax: new Decimal(0),
        grandTotal: new Decimal(0),
        advancePaid: new Decimal(0),
        balanceDue: new Decimal(0),
      };
    }

    let subtotal = new Decimal(0);
    let taxable = new Decimal(0);
    let totalTax = new Decimal(0);
    let grandTotal = new Decimal(0);

    for (const item of invoiceData.items) {
      const qty = new Decimal(item.quantity > 0 ? item.quantity : 1);
      const unitPrice = new Decimal(item.unitPrice || '0.00');
      const discountPerUnit = new Decimal(item.discountPerUnit || '0.00');
      const lineSubtotal = unitPrice.times(qty);
      const lineTaxable = lineSubtotal.minus(discountPerUnit.times(qty));
      const lineTaxableClamped = lineTaxable.isNegative() ? new Decimal(0) : lineTaxable;

      let lineTax = new Decimal(0);
      if (includeGst) {
        const rate = new Decimal(item.taxRate || '0.00');
        lineTax = lineTaxableClamped.times(rate).dividedBy(100);
      }

      subtotal = subtotal.plus(lineSubtotal);
      taxable = taxable.plus(lineTaxableClamped);
      totalTax = totalTax.plus(lineTax);
      grandTotal = grandTotal.plus(lineTaxableClamped.plus(lineTax));
    }

    const advancePaid = new Decimal(invoiceData.advancePaid || '0.00');
    const balanceDue = grandTotal.minus(advancePaid);

    return {
      subtotal,
      taxable,
      tax: totalTax,
      grandTotal,
      advancePaid,
      balanceDue: balanceDue.isNegative() ? new Decimal(0) : balanceDue,
    };
  }, [invoiceData, includeGst]);

  if (!isOpen || !invoiceId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Customer name and phone number are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateInvoiceDetailsAction({
        invoiceId,
        customerName,
        customerPhone,
        customerAddress: customerAddress.trim() || null,
        gstin: gstin.trim() || null,
        notes: notes.trim() || null,
        promisedDeliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
        includeGst,
      });

      if (res.success && 'data' in res && res.data) {
        toast.success(`Invoice ${res.data.invoiceNumber} Updated!`, {
          description: `New Grand Total: ₹${res.data.newGrandTotal} · Balance: ₹${res.data.newBalanceDue}`,
        });
        onSuccess?.();
        onClose();
      } else {
        toast.error(('error' in res && res.error) || 'Failed to update invoice');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error updating invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/70 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <FileEdit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit Invoice Details & GST Status
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Invoice #{invoiceData?.invoiceNumber || '...'} · Modify customer details, notes, or toggle GST tax
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-600" />
            <p className="text-xs font-semibold">Loading invoice details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            {/* 1. GST Customization Control */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-blue-900 dark:text-blue-300 text-xs">
                    GST Tax Inclusion Setting
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Decide whether this invoice includes statutory GST (CGST + SGST) or is a zero-tax / composition bill.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeGst}
                    onChange={(e) => setIncludeGst(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Live Preview Box */}
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-blue-200/60 dark:border-blue-900/40 font-mono text-center">
                <div className="bg-white/80 dark:bg-slate-900 p-2 rounded border border-blue-100 dark:border-blue-950">
                  <span className="text-[10px] text-slate-400 font-sans block">Taxable</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{previewTotals.taxable.toFixed(2)}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900 p-2 rounded border border-blue-100 dark:border-blue-950">
                  <span className="text-[10px] text-slate-400 font-sans block">GST Tax</span>
                  <span className={`font-bold ${includeGst ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                    ₹{previewTotals.tax.toFixed(2)}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900 p-2 rounded border border-blue-100 dark:border-blue-950">
                  <span className="text-[10px] text-slate-400 font-sans block">Grand Total</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">₹{previewTotals.grandTotal.toFixed(2)}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900 p-2 rounded border border-blue-100 dark:border-blue-950">
                  <span className="text-[10px] text-slate-400 font-sans block">Balance Due</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">₹{previewTotals.balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 2. Customer Billing Recipient Details */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                Customer & Billing Recipient Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer GSTIN
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="29AAAAA0000A1Z5"
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-mono uppercase text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Billing Address
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Street, City, Pincode"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* 3. Delivery Date & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Promised Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Notes & Terms
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions or fitting notes"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save & Update Invoice</span>
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
