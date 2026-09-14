'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Receipt,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  X,
  ChevronRight,
  Loader2,
  SlidersHorizontal,
  PackageCheck,
  Wrench,
  Glasses,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getFinancialsReport,
  type DailyFinancialsReport,
  type DailyReportTransaction,
  type DatePreset,
  type FinancialsReportFilter,
} from '@/actions/report-actions';

export function ReportsView() {
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getSevenDaysAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [preset, setPreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>(getSevenDaysAgoStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());

  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [report, setReport] = useState<DailyFinancialsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fetchReport = async (filterConfig: FinancialsReportFilter) => {
    try {
      setIsLoading(true);
      const res = await getFinancialsReport(filterConfig);
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        toast.error('Failed to load financials', {
          description: res.error || 'Could not fetch report data.',
        });
      }
    } catch (err) {
      console.error('[ReportsView] fetch error:', err);
      toast.error('Connection error', {
        description: 'Failed to connect to reporting server.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch report whenever filters change
  useEffect(() => {
    const filterConfig: FinancialsReportFilter = {
      preset,
      startDate: preset === 'custom' ? startDate : undefined,
      endDate: preset === 'custom' ? endDate : undefined,
      paymentStatus: paymentStatusFilter,
      paymentMode: paymentModeFilter,
      orderStatus: orderStatusFilter,
    };

    fetchReport(filterConfig);
  }, [preset, paymentStatusFilter, paymentModeFilter, orderStatusFilter]);

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error('Please select both Start Date and End Date.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start Date cannot be later than End Date.');
      return;
    }
    setPreset('custom');
    fetchReport({
      preset: 'custom',
      startDate,
      endDate,
      paymentStatus: paymentStatusFilter,
      paymentMode: paymentModeFilter,
      orderStatus: orderStatusFilter,
    });
  };

  const handlePresetSelect = (selectedPreset: DatePreset) => {
    setPreset(selectedPreset);
  };

  const handleRefresh = () => {
    startTransition(async () => {
      await fetchReport({
        preset,
        startDate: preset === 'custom' ? startDate : undefined,
        endDate: preset === 'custom' ? endDate : undefined,
        paymentStatus: paymentStatusFilter,
        paymentMode: paymentModeFilter,
        orderStatus: orderStatusFilter,
      });
      toast.info('Report refreshed', { duration: 2000 });
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setPaymentStatusFilter('ALL');
    setPaymentModeFilter('ALL');
    setOrderStatusFilter('ALL');
    setPreset('all');
  };

  const handlePrintZReport = () => {
    window.print();
  };

  // Client-side text search within currently fetched ledger
  const filteredTransactions = (report?.transactions || []).filter((tx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      tx.invoiceNumber.toLowerCase().includes(q) ||
      tx.customerName.toLowerCase().includes(q) ||
      tx.customerPhone.includes(q) ||
      tx.paymentMode.toLowerCase().includes(q) ||
      tx.paymentStatus.toLowerCase().includes(q) ||
      tx.orderStatus.toLowerCase().includes(q)
    );
  });

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    paymentStatusFilter !== 'ALL' ||
    paymentModeFilter !== 'ALL' ||
    orderStatusFilter !== 'ALL' ||
    preset !== 'all';

  return (
    <div className="flex flex-col w-full h-full flex-1 p-4 md:p-6 overflow-auto bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 space-y-6">
      {/* ── Top Header & Range Selection Toolbar ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Financial Reports & Order Audit Ledger
            </h1>
            <span className="rounded bg-blue-100 dark:bg-blue-950/70 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Active Register
            </span>
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Audit store revenue, payment splits, and order transactions for{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {report?.date || 'Selected Period'}
            </strong>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="btn-refresh-report"
            onClick={handleRefresh}
            disabled={isLoading || isPending}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 shadow-2xs cursor-pointer"
            title="Refresh Report Data"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading || isPending ? 'animate-spin text-blue-600' : ''}`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            data-testid="btn-print-z-report"
            onClick={handlePrintZReport}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-emerald-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ── Date Preset & Custom Range Selection Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs no-print">
        {/* Presets Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>Range:</span>
          </span>

          <button
            type="button"
            data-testid="preset-all"
            onClick={() => handlePresetSelect('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              preset === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            All Time
          </button>

          <button
            type="button"
            data-testid="preset-today"
            onClick={() => handlePresetSelect('today')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              preset === 'today'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Today
          </button>

          <button
            type="button"
            data-testid="preset-yesterday"
            onClick={() => handlePresetSelect('yesterday')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              preset === 'yesterday'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Yesterday
          </button>

          <button
            type="button"
            data-testid="preset-7days"
            onClick={() => handlePresetSelect('last7days')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              preset === 'last7days'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Last 7 Days
          </button>

          <button
            type="button"
            data-testid="preset-month"
            onClick={() => handlePresetSelect('thisMonth')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              preset === 'thisMonth'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            This Month
          </button>

          <button
            type="button"
            data-testid="preset-custom"
            onClick={() => handlePresetSelect('custom')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              preset === 'custom'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Custom Range Picker Controls */}
        <form
          onSubmit={handleApplyCustomRange}
          className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-1.5">
            <label htmlFor="report-start-date" className="text-[11px] font-semibold text-slate-500">
              From:
            </label>
            <input
              id="report-start-date"
              data-testid="input-start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('custom');
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="report-end-date" className="text-[11px] font-semibold text-slate-500">
              To:
            </label>
            <input
              id="report-end-date"
              data-testid="input-end-date"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('custom');
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            data-testid="btn-apply-custom-range"
            className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1 text-xs font-bold text-white shadow-2xs transition active:scale-95 cursor-pointer"
          >
            Apply Range
          </button>
        </form>
      </div>

      {isLoading && !report ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center">
          <Loader2 className="h-9 w-9 animate-spin text-blue-600 mb-3" />
          <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
            Calculating Financial Metrics...
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Aggregating orders, tax liabilities, and payment tenders
          </p>
        </div>
      ) : (
        <>
          {/* ── TOP ROW: METRIC CARDS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Gross Revenue
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1 font-mono">
                <span className="text-sm font-bold text-slate-400">₹</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {Number(report?.totalRevenue || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Gross value of all billed sales in selected range
              </p>
            </div>

            {/* Total Invoices Count */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Invoices
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Receipt className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  data-testid="total-orders-metric"
                  className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100"
                >
                  {report?.totalOrders || 0}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  orders placed
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Cumulative optical dispensing orders
              </p>
            </div>

            {/* Collections / Advance Paid */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Collected
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1 font-mono">
                <span className="text-sm font-bold text-slate-400">₹</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {Number(report?.totalAdvancePaid || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Cash, UPI & Card payments received
              </p>
            </div>

            {/* Pending Balance Due */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pending Balance Due
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1 font-mono">
                <span className="text-sm font-bold text-slate-400">₹</span>
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {Number(report?.totalBalanceDue || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Receivables upon order collection & delivery
              </p>
            </div>
          </div>

          {/* ── PAYMENT TENDER SPLITS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cash Tender */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <Banknote className="h-4 w-4" />
                  <span>Cash Collections</span>
                </div>
                <div className="mt-1 font-mono text-xl font-bold text-foreground">
                  ₹{Number(report?.paymentSplits?.cash || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Physical currency register
                </p>
              </div>
            </div>

            {/* UPI Tender */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                  <QrCode className="h-4 w-4" />
                  <span>UPI / QR Digital</span>
                </div>
                <div className="mt-1 font-mono text-xl font-bold text-foreground">
                  ₹{Number(report?.paymentSplits?.upi || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Direct bank instant settlements
                </p>
              </div>
            </div>

            {/* Card Tender */}
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20 p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
                  <CreditCard className="h-4 w-4" />
                  <span>Card POS Terminal</span>
                </div>
                <div className="mt-1 font-mono text-xl font-bold text-foreground">
                  ₹{Number(report?.paymentSplits?.card || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Swiped on card terminal machines
                </p>
              </div>
            </div>
          </div>

          {/* ── BOTTOM SECTION: TRANSACTION AUDIT LEDGER ── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden space-y-3 p-4">
            {/* Header & Granular Filters Toolbar */}
            <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Daily Order & Payment Audit Ledger
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Granular itemization of invoices issued ({filteredTransactions.length} records matching)
                  </p>
                </div>

                {/* Quick Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    data-testid="input-ledger-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search invoice, patient, phone..."
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 pl-8 pr-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Granular Filter Selectors */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1 no-print">
                {/* Payment Status Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400">Payment:</span>
                  <select
                    aria-label="Payment Status"
                    data-testid="filter-payment-status"
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer"
                  >
                    <option value="ALL">All Payment Statuses</option>
                    <option value="PAID">Paid in Full</option>
                    <option value="PARTIAL">Partial Advance</option>
                    <option value="UNPAID">Unpaid (Zero Advance)</option>
                  </select>
                </div>

                {/* Payment Mode Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400">Mode:</span>
                  <select
                    aria-label="Payment Mode"
                    data-testid="filter-payment-mode"
                    value={paymentModeFilter}
                    onChange={(e) => setPaymentModeFilter(e.target.value)}
                    className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer"
                  >
                    <option value="ALL">All Modes</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>

                {/* Order Status Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400">Order:</span>
                  <select
                    aria-label="Order Status"
                    data-testid="filter-order-status"
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer"
                  >
                    <option value="ALL">All Order Statuses</option>
                    <option value="ORDERED">Action Required</option>
                    <option value="IN_FITTING">At Lab / Fitting</option>
                    <option value="READY_FOR_COLLECTION">Ready for Pickup</option>
                    <option value="DELIVERED_AND_CLOSED">Delivered & Closed</option>
                  </select>
                </div>

                {/* Clear / Reset button */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    data-testid="btn-reset-filters"
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline px-1.5 py-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Patient Name</th>
                    <th className="py-2.5 px-3">Payment Mode</th>
                    <th className="py-2.5 px-3 text-center">Order Status</th>
                    <th className="py-2.5 px-3 text-center">Payment Status</th>
                    <th className="py-2.5 px-3 text-right">Advance Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance Due</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <Receipt className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <p className="mt-2 font-medium text-slate-600 dark:text-slate-300 text-xs">
                          No transactions match the selected date range and filter criteria
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Try switching to &quot;All Time&quot; or selecting a broader custom date range.
                        </p>
                        <button
                          type="button"
                          onClick={() => handlePresetSelect('all')}
                          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                        >
                          <span>Switch to All Time</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const createdDate = new Date(tx.createdAt);
                      const dateStr = createdDate.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      });
                      const timeStr = createdDate.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      const isPaid = tx.paymentStatus === 'PAID';
                      const isPartial = tx.paymentStatus === 'PARTIAL';

                      return (
                        <tr
                          key={tx.id}
                          data-testid="audit-ledger-row"
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-slate-900 dark:text-slate-100 transition"
                        >
                          {/* Invoice # */}
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                            {tx.invoiceNumber}
                          </td>

                          {/* Date & Time */}
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            <span>{dateStr}</span>
                            <span className="text-[10px] text-muted-foreground block">{timeStr}</span>
                          </td>

                          {/* Patient Name */}
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                              {tx.customerName}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              {tx.customerPhone}
                            </span>
                          </td>

                          {/* Payment Mode */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                                tx.paymentMode.includes('CASH')
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : tx.paymentMode.includes('UPI')
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {tx.paymentMode}
                            </span>
                          </td>

                          {/* Order Status */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                tx.orderStatus === 'DELIVERED_AND_CLOSED'
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  : tx.orderStatus === 'READY_FOR_COLLECTION'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                              }`}
                            >
                              {tx.orderStatus === 'DELIVERED_AND_CLOSED'
                                ? 'Delivered'
                                : tx.orderStatus === 'READY_FOR_COLLECTION'
                                  ? 'Ready for Pickup'
                                  : tx.orderStatus === 'ORDERED'
                                    ? 'Action Req'
                                    : 'In Fitting'}
                            </span>
                          </td>

                          {/* Payment Status */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isPaid
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : isPartial
                                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                    : 'bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                              }`}
                            >
                              {tx.paymentStatus}
                            </span>
                          </td>

                          {/* Advance Paid */}
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            ₹{Number(tx.advancePaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Balance Due */}
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            ₹{Number(tx.balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Grand Total */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            ₹{Number(tx.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Ledger Footer */}
            {filteredTransactions.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400 gap-2">
                <span>
                  Showing <strong className="text-slate-800 dark:text-slate-200">{filteredTransactions.length}</strong> of{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{report?.totalOrders || 0}</strong> orders in this period
                </span>
                <div className="flex items-center gap-3 font-mono">
                  <span>
                    Collected: <strong className="text-emerald-600 dark:text-emerald-400">₹{report?.totalAdvancePaid}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Total Value: <strong className="text-slate-900 dark:text-slate-100">₹{report?.totalRevenue}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ReportsView;
