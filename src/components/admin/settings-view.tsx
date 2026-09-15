'use client';

import React, { useState, useTransition } from 'react';
import {
  Building2,
  Printer,
  Receipt,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  Percent,
  Sparkles,
  Loader2,
  LayoutGrid,
  Columns2,
  Maximize2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { updateStoreProfile, type StoreProfileInput } from '@/actions/settings-actions';
import type { StoreProfile, ReceiptType } from '@/db/schema';

interface SettingsViewProps {
  initialProfile: StoreProfile;
}

type TabType = 'general' | 'print' | 'pos';

export function SettingsView({ initialProfile }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isPending, startTransition] = useTransition();

  // Form State
  const [storeName, setStoreName] = useState(initialProfile.storeName || '');
  const [gstin, setGstin] = useState(initialProfile.gstin || '');
  const [phone, setPhone] = useState(initialProfile.phone || '');
  const [address, setAddress] = useState(initialProfile.address || '');
  const [defaultTaxRate, setDefaultTaxRate] = useState(
    initialProfile.defaultTaxRate || '18.00'
  );
  const [receiptType, setReceiptType] = useState<ReceiptType>(
    initialProfile.receiptType || 'THERMAL_80MM'
  );
  const [defaultPosLayout, setDefaultPosLayout] = useState<'adaptive' | 'dense' | 'split'>(
    (initialProfile as any).defaultPosLayout || 'adaptive'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim()) {
      toast.error('Store Name cannot be blank');
      return;
    }

    if (!phone.trim()) {
      toast.error('Store Phone cannot be blank');
      return;
    }

    if (!address.trim()) {
      toast.error('Store Address cannot be blank');
      return;
    }

    startTransition(async () => {
      const payload: StoreProfileInput = {
        storeName: storeName.trim(),
        gstin: gstin.trim() || null,
        phone: phone.trim(),
        address: address.trim(),
        defaultTaxRate: defaultTaxRate.trim() || '18.00',
        receiptType,
        defaultPosLayout,
      };

      const result = await updateStoreProfile(payload);

      if (result.success) {
        toast.success('Store profile updated successfully!', {
          description: 'Your changes have been saved and applied across the system.',
        });
      } else {
        toast.error(result.error || 'Failed to update store profile');
      }
    });
  };

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">
      {/* ── Standardized Header Block ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>Store Settings & Print Engine</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure store identity, GST credentials, tax defaults, and hardware receipt layout preferences.
          </p>
        </div>

        {/* Save Changes Button (Desktop header action) */}
        <button
          type="button"
          data-testid="btn-save-settings"
          onClick={handleSubmit}
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b border-border gap-2 shrink-0">
        <button
          type="button"
          data-testid="tab-general-profile"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
            activeTab === 'general'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>General Profile</span>
        </button>

        <button
          type="button"
          data-testid="tab-print-config"
          onClick={() => setActiveTab('print')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
            activeTab === 'print'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Printer className="h-4 w-4" />
          <span>Print Configuration</span>
        </button>

        <button
          type="button"
          data-testid="tab-pos-layout"
          onClick={() => setActiveTab('pos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
            activeTab === 'pos'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span>POS Counter Layout</span>
        </button>
      </div>

      {/* ── Tab Content Form ── */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6">
        {/* ── Tab 1: General Profile ── */}
        {activeTab === 'general' && (
          <div className="space-y-4 max-w-3xl">
            <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                <span>Store Identity & Legal Details</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Store Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="input-store-name"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-store-name"
                    data-testid="input-store-name"
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Santhosh Optical Center"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Displayed on printed receipts, laser invoices, and workshop job tickets.
                  </p>
                </div>

                {/* GSTIN */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="input-store-gstin"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    GSTIN / Tax ID
                  </label>
                  <input
                    id="input-store-gstin"
                    data-testid="input-store-gstin"
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 29AABCS1429B1Z8"
                    maxLength={15}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono font-bold text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    15-character Goods and Services Tax Identification Number.
                  </p>
                </div>

                {/* Contact Phone */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="input-store-phone"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Contact Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      id="input-store-phone"
                      data-testid="input-store-phone"
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Primary counter telephone printed on customer invoices for customer support.
                  </p>
                </div>

                {/* Default Tax Rate */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="input-store-tax-rate"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Default Tax Rate (%)
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      id="input-store-tax-rate"
                      data-testid="input-store-tax-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={defaultTaxRate}
                      onChange={(e) => setDefaultTaxRate(e.target.value)}
                      placeholder="18.00"
                      className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs font-mono font-bold text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Standard GST rate applied to new inventory and miscellaneous products (e.g. 18.00%).
                  </p>
                </div>
              </div>

              {/* Physical Address */}
              <div className="space-y-1.5 pt-2">
                <label
                  htmlFor="input-store-address"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Store Physical Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <textarea
                    id="input-store-address"
                    data-testid="input-store-address"
                    required
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 123 Optical Plaza, MG Road, Bengaluru - 560001"
                    className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Full dispensary address displayed in the invoice header and printouts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Print Configuration ── */}
        {activeTab === 'print' && (
          <div className="space-y-4 max-w-3xl">
            <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Printer className="h-4 w-4 text-blue-500" />
                  <span>Default Receipt & Invoice Output</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose the default print format triggered when clerks click &ldquo;Print Receipt&rdquo; at the counter or in the patient history.
                </p>
              </div>

              {/* Radio Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* 1. Thermal 80mm Card */}
                <label
                  data-testid="card-receipt-thermal"
                  className={`flex flex-col rounded-xl border p-4 cursor-pointer transition relative ${
                    receiptType === 'THERMAL_80MM'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                          receiptType === 'THERMAL_80MM'
                            ? 'bg-blue-600 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          Thermal Roll (80mm)
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Width: 72mm printable
                        </div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="receipt-type"
                      data-testid="receipt-type-thermal"
                      value="THERMAL_80MM"
                      checked={receiptType === 'THERMAL_80MM'}
                      onChange={() => setReceiptType('THERMAL_80MM')}
                      className="h-4 w-4 text-blue-600 cursor-pointer mt-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    Designed for high-velocity thermal receipt printers (EPSON, TVS, Star Micronics). Produces compact, itemized slips with GST splits and advance dues.
                  </p>
                  {receiptType === 'THERMAL_80MM' && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Default POS Counter Layout</span>
                    </div>
                  )}
                </label>

                {/* 2. Laser A4 Card */}
                <label
                  data-testid="card-receipt-a4"
                  className={`flex flex-col rounded-xl border p-4 cursor-pointer transition relative ${
                    receiptType === 'A4_INVOICE'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                          receiptType === 'A4_INVOICE'
                            ? 'bg-blue-600 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          Laser Tax Invoice (A4)
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Standard A4 Sheet
                        </div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="receipt-type"
                      data-testid="receipt-type-a4"
                      value="A4_INVOICE"
                      checked={receiptType === 'A4_INVOICE'}
                      onChange={() => setReceiptType('A4_INVOICE')}
                      className="h-4 w-4 text-blue-600 cursor-pointer mt-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    Formal full-page invoice layout featuring high-contrast border collapse tables, HSN schedule, bank details, and an authorized signature block.
                  </p>
                  {receiptType === 'A4_INVOICE' && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Default POS Counter Layout</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Hardware Guidance Callout */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 mt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Workshop Lab Slip Behavior</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Workshop job slips triggered from the Lab Orders Kanban automatically render using the specialized <span className="font-semibold text-foreground">Workshop Lab Slip</span> layout with full clinical OD/OS refraction metrics and complete financial data redaction, regardless of the customer invoice default.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 3: POS Counter Layout ── */}
        {activeTab === 'pos' && (
          <div className="space-y-4 max-w-3xl">
            <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-2xs space-y-4">
              <div className="border-b border-border pb-2">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-blue-500" />
                  <span>Default Counter Billing Experience</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select how the sales counter is laid out when starting new customer orders on /pos/new-bill.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Option 1: Adaptive View Modes */}
                <div
                  data-testid="pos-layout-adaptive-card"
                  onClick={() => setDefaultPosLayout('adaptive')}
                  className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition ${
                    defaultPosLayout === 'adaptive'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                      : 'border-border bg-card hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                        <Maximize2 className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Adaptive Modes</span>
                    </div>
                    <span className="rounded-full bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[9px] font-bold text-blue-800 dark:text-blue-300 uppercase">
                      Recommended
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">
                    Dynamic 3-mode workflow. In Billing Focus, patient is summarized in a sleek 1-line strip while the Cart and Checkout Ledger expand side-by-side.
                  </p>

                  <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-foreground">Rx ↔ Split ↔ Cart</span>
                    <input
                      type="radio"
                      name="defaultPosLayout"
                      value="adaptive"
                      checked={defaultPosLayout === 'adaptive'}
                      onChange={() => setDefaultPosLayout('adaptive')}
                      className="text-blue-600"
                    />
                  </div>
                </div>

                {/* Option 2: Dense Split View */}
                <div
                  data-testid="pos-layout-dense-card"
                  onClick={() => setDefaultPosLayout('dense')}
                  className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition ${
                    defaultPosLayout === 'dense'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                      : 'border-border bg-card hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300">
                        <Columns2 className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Dense Split View</span>
                    </div>
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                      Compact
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">
                    Side-by-side 50/50 layout with compact 38px cart rows and a fixed bottom settlement bar that keeps checkout buttons always in view.
                  </p>

                  <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-foreground">Docked Bottom Bar</span>
                    <input
                      type="radio"
                      name="defaultPosLayout"
                      value="dense"
                      checked={defaultPosLayout === 'dense'}
                      onChange={() => setDefaultPosLayout('dense')}
                      className="text-blue-600"
                    />
                  </div>
                </div>

                {/* Option 3: Classic Split */}
                <div
                  data-testid="pos-layout-split-card"
                  onClick={() => setDefaultPosLayout('split')}
                  className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition ${
                    defaultPosLayout === 'split'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                      : 'border-border bg-card hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <LayoutGrid className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Classic Split</span>
                    </div>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                      Standard
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">
                    Original 7:5 side-by-side layout with full prescription matrix and vertically stacked checkout ledger.
                  </p>

                  <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-foreground">7:5 Grid Ratio</span>
                    <input
                      type="radio"
                      name="defaultPosLayout"
                      value="split"
                      checked={defaultPosLayout === 'split'}
                      onChange={() => setDefaultPosLayout('split')}
                      className="text-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Counter Terminal Info Box */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 mt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>On-the-Fly Switching at Counter</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The layout saved here sets the default across all store billing terminals. Cashiers and opticians can also toggle layout modes on-the-fly directly in the POS top bar using <span className="font-semibold text-foreground">[F4]</span> without altering store-wide defaults.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Button Strip */}
        <div className="flex items-center justify-start gap-3 max-w-3xl pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Profile Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
