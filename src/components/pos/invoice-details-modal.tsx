'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Save, RotateCcw, Building2, User, Phone, Mail, MapPin, Hash } from 'lucide-react';
import type { InvoiceBillingDetails } from '@/store/pos-store';

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: InvoiceBillingDetails;
  defaultCustomerName?: string;
  defaultPhone?: string;
  onSave: (details: Partial<InvoiceBillingDetails>) => void;
}

export function InvoiceDetailsModal({
  isOpen,
  onClose,
  details,
  defaultCustomerName = '',
  defaultPhone = '',
  onSave,
}: InvoiceDetailsModalProps) {
  const [billingName, setBillingName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setBillingName(details.billingName || defaultCustomerName || '');
      setPhone(details.phone || defaultPhone || '');
      setEmail(details.email || '');
      setAddress(details.address || '');
      setGstin(details.gstin || '');
      setNotes(details.notes || '');
    }
  }, [isOpen, details, defaultCustomerName, defaultPhone]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      billingName,
      phone,
      email,
      address,
      gstin: gstin.toUpperCase(),
      notes,
    });
    onClose();
  };

  const handleReset = () => {
    setBillingName(defaultCustomerName);
    setPhone(defaultPhone);
    setEmail('');
    setAddress('');
    setGstin('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Invoice & Billing Customer Details
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Customize billing recipient name, contact, GSTIN and notes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {/* Billing Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Billing Recipient / Corporate Name</span>
            </label>
            <input
              type="text"
              data-testid="input-invoice-billing-name"
              placeholder="e.g. Ramesh Kumar or TechCorp Pvt Ltd"
              value={billingName}
              onChange={(e) => setBillingName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>Invoice Contact Phone</span>
              </label>
              <input
                type="text"
                data-testid="input-invoice-phone"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>Email (for E-Invoice)</span>
              </label>
              <input
                type="email"
                data-testid="input-invoice-email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* GSTIN & Address */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Customer GSTIN (B2B)</span>
              </label>
              <input
                type="text"
                data-testid="input-invoice-gstin"
                placeholder="15-digit GSTIN"
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-mono uppercase text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>Billing Address / City</span>
              </label>
              <input
                type="text"
                data-testid="input-invoice-address"
                placeholder="Street address, City"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Notes & Special Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Order Notes & Custom Invoicing Remarks
            </label>
            <textarea
              rows={2}
              data-testid="input-invoice-notes"
              placeholder="e.g. Corporate reimbursement bill; urgent delivery requested by Saturday."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-5 py-3 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset to Patient Profile</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="btn-save-invoice-details"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Apply to Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
