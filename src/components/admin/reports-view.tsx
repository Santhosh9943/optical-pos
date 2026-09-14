'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
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
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  SlidersHorizontal,
  PackageCheck,
  Wrench,
  Glasses,
  ListFilter,
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

  // State: Date Filtering
  const [preset, setPreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>(getSevenDaysAgoStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());

  // State: Granular Ledger Filters
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // State: Pagination & Layout
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false);

  // State: Report Data & Fetch Status
  const [report, setReport] = useState<DailyFinancialsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Scroll Container & Popover Refs
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const outerContainerRef = useRef<HTMLDivElement>(null);
  const customPickerRef = useRef<HTMLDivElement>(null);
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);

  // Close custom date range popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customPickerRef.current &&
        !customPickerRef.current.contains(event.target as Node)
      ) {
        setIsCustomPickerOpen(false);
      }
    };
    if (isCustomPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCustomPickerOpen]);

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

  // Fetch report whenever main filters change
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
    setCurrentPage(1);
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
    setIsCustomPickerOpen(false);
    setCurrentPage(1);
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
    if (selectedPreset === 'custom') {
      setIsCustomPickerOpen((prev) => !prev);
      return;
    }
    setIsCustomPickerOpen(false);
    setPreset(selectedPreset);
    setCurrentPage(1);
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
    setCurrentPage(1);
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

  // Pagination calculation
  const totalItems = filteredTransactions.length;
  const isAllPages = pageSize === -1;
  const totalPages = isAllPages ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = isAllPages ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = isAllPages ? totalItems : Math.min(startIndex + pageSize, totalItems);
  const paginatedTransactions = isAllPages
    ? filteredTransactions
    : filteredTransactions.slice(startIndex, endIndex);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    paymentStatusFilter !== 'ALL' ||
    paymentModeFilter !== 'ALL' ||
    orderStatusFilter !== 'ALL' ||
    preset !== 'all';

  return (
    <div
      ref={outerContainerRef}
      className="flex flex-col w-full h-full flex-1 p-2.5 sm:p-3 md:p-4 overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 gap-2 sm:gap-2.5"
    >
      {/* ── Top Header & Action Controls ── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Financial Reports & Order Audit Ledger
            </h1>
            <span className="rounded bg-blue-100 dark:bg-blue-950/70 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Active Register
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-300">
            Audit store revenue, payment splits, and order transactions for{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {report?.date || 'Selected Period'}
            </strong>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Collapse/Expand Summary Toggle */}
          <button
            type="button"
            data-testid="btn-toggle-summary"
            onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-2xs cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            title={isSummaryCollapsed ? 'Expand Metric Cards' : 'Collapse Metric Cards'}
          >
            {isSummaryCollapsed ? (
              <>
                <ChevronDown className="h-3.5 w-3.5 text-blue-600" />
                <span>Show Metrics</span>
              </>
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-slate-400 dark:text-slate-300" />
                <span>Compact View</span>
              </>
            )}
          </button>

          <button
            type="button"
            data-testid="btn-refresh-report"
            onClick={handleRefresh}
            disabled={isLoading || isPending}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed shadow-2xs cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
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
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Printer className="h-3.5 w-3.5 text-emerald-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ── Date Preset & Custom Range Selection Bar ── */}
      <div className="shrink-0 flex items-center justify-between gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-2xs no-print">
        {/* Presets Pills */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mr-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Range:</span>
          </span>

          <button
            type="button"
            data-testid="preset-all"
            onClick={() => handlePresetSelect('all')}
            className={`px-2 py-0.5 text-xs font-bold rounded-lg transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
              preset === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            All Time ({report?.totalOrders || 0})
          </button>

          <button
            type="button"
            data-testid="preset-today"
            onClick={() => handlePresetSelect('today')}
            className={`px-2 py-0.5 text-xs font-bold rounded-lg transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
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
            className={`px-2 py-0.5 text-xs font-bold rounded-lg transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
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
            className={`px-2 py-0.5 text-xs font-bold rounded-lg transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
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
            className={`px-2 py-0.5 text-xs font-bold rounded-lg transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
              preset === 'thisMonth'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            This Month
          </button>

          {/* Custom Range Button with Popover */}
          <div className="relative inline-block" ref={customPickerRef}>
            <button
              type="button"
              data-testid="preset-custom"
              onClick={() => handlePresetSelect('custom')}
              className={`px-2.5 py-0.5 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                preset === 'custom'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>
                {preset === 'custom' && startDate && endDate
                  ? `Custom (${new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})`
                  : 'Custom Range'}
              </span>
              <ChevronDown className={`h-3 w-3 transition-transform ${isCustomPickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Custom Range Popover Dropdown */}
            {isCustomPickerOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Select Custom Date Range</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomPickerOpen(false)}
                    aria-label="Close custom date picker"
                    className="rounded p-0.5 text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-100 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <form onSubmit={handleApplyCustomRange} className="space-y-2.5">
                  <div className="space-y-1">
                    <label htmlFor="report-start-date" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      From (Start Date)
                    </label>
                    <input
                      id="report-start-date"
                      data-testid="input-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-600 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="report-end-date" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      To (End Date)
                    </label>
                    <input
                      id="report-end-date"
                      data-testid="input-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-600 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsCustomPickerOpen(false)}
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      data-testid="btn-apply-custom-range"
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      Apply Range
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading && !report ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
          <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
            Calculating Financial Metrics...
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
            Aggregating orders, tax liabilities, and payment tenders
          </p>
        </div>
      ) : (
        <>
          {/* ── TOP ROW: METRIC CARDS (Collapsible & Ultra-Compact Single Row) ── */}
          {!isSummaryCollapsed && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 shrink-0 animate-in fade-in duration-200">
              {/* Total Revenue */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 shadow-2xs flex flex-col justify-center">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 truncate">
                    Gross Rev
                  </span>
                  <TrendingUp className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                </div>
                <div className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  ₹{Number(report?.totalRevenue || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              {/* Total Invoices Count */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 shadow-2xs flex flex-col justify-center">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 truncate">
                    Invoices
                  </span>
                  <Receipt className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>
                <div className="flex items-baseline gap-1 font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  <span data-testid="total-orders-metric">
                    {report?.totalOrders || 0}
                  </span>
                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-300 font-sans">orders</span>
                </div>
              </div>

              {/* Total Collected */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 shadow-2xs flex flex-col justify-center">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 truncate">
                    Collected
                  </span>
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>
                <div className="font-mono text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                  ₹{Number(report?.totalAdvancePaid || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              {/* Pending Balance Due */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 shadow-2xs flex flex-col justify-center">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 truncate">
                    Pending Due
                  </span>
                  <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                </div>
                <div className="font-mono text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 truncate">
                  ₹{Number(report?.totalBalanceDue || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              {/* Cash Tender */}
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 px-2.5 py-1.5 shadow-2xs flex flex-col justify-center">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 truncate">
                    Cash
                  </span>
                  <Banknote className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>
                <div className="font-mono text-xs sm:text-sm font-bold text-foreground truncate">
                  ₹{Number(report?.paymentSplits?.cash || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              {/* UPI Tender */}
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 px-2.5 py-1.5 shadow-2xs flex flex-col justify-center">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 truncate">
                    UPI Digital
                  </span>
                  <QrCode className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                </div>
                <div className="font-mono text-xs sm:text-sm font-bold text-foreground truncate">
                  ₹{Number(report?.paymentSplits?.upi || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              {/* Card Tender */}
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20 px-2.5 py-1.5 shadow-2xs flex flex-col justify-center">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 truncate">
                    Card Terminal
                  </span>
                  <CreditCard className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
                </div>
                <div className="font-mono text-xs sm:text-sm font-bold text-foreground truncate">
                  ₹{Number(report?.paymentSplits?.card || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── BOTTOM SECTION: TRANSACTION AUDIT LEDGER ── */}
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            {/* Header & Action Toolbar */}
            <div className="shrink-0 flex flex-col gap-2.5 border-b border-slate-100 dark:border-slate-800 p-3 sm:p-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      Daily Order & Payment Audit Ledger
                    </h2>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {filteredTransactions.length} Orders
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-300">
                    Granular itemization of invoices · Showing {paginatedTransactions.length} on this page
                  </p>
                </div>

                {/* Action Controls: Quick Search */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-60">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-300" />
                    <input
                      type="text"
                      data-testid="input-ledger-search"
                      aria-label="Search ledger transactions by invoice, patient, or phone"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search invoice, patient, phone..."
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 pl-8 pr-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Granular Filter Selectors */}
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5 no-print">
                {/* Payment Status Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">Payment:</span>
                  <select
                    aria-label="Payment Status"
                    data-testid="filter-payment-status"
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <option value="ALL">All Payment Statuses</option>
                    <option value="PAID">Paid in Full</option>
                    <option value="PARTIAL">Partial Advance</option>
                    <option value="UNPAID">Unpaid (Zero Advance)</option>
                  </select>
                </div>

                {/* Payment Mode Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">Mode:</span>
                  <select
                    aria-label="Payment Mode"
                    data-testid="filter-payment-mode"
                    value={paymentModeFilter}
                    onChange={(e) => setPaymentModeFilter(e.target.value)}
                    className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <option value="ALL">All Modes</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>

                {/* Order Status Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">Order:</span>
                  <select
                    aria-label="Order Status"
                    data-testid="filter-order-status"
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
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
                    className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline px-1.5 py-1 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                  >
                    <X className="h-3 w-3" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Table Container with Sticky Header */}
            <div
              ref={tableContainerRef}
              data-testid="audit-ledger-table-container"
              className="flex-1 min-h-0 relative overflow-x-auto overflow-y-auto scroll-smooth"
            >
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs">
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-900">Invoice #</th>
                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-900">Date & Time</th>
                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-900">Patient Name</th>
                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-900">Payment Mode</th>
                    <th className="py-2.5 px-3 text-center bg-slate-100 dark:bg-slate-900">Order Status</th>
                    <th className="py-2.5 px-3 text-center bg-slate-100 dark:bg-slate-900">Payment Status</th>
                    <th className="py-2.5 px-3 text-right bg-slate-100 dark:bg-slate-900">Advance Paid</th>
                    <th className="py-2.5 px-3 text-right bg-slate-100 dark:bg-slate-900">Balance Due</th>
                    <th className="py-2.5 px-3 text-right bg-slate-100 dark:bg-slate-900">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <Receipt className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <p className="mt-2 font-medium text-slate-600 dark:text-slate-300 text-xs">
                          No transactions match the selected filters
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
                          Try switching to &quot;All Time&quot; or selecting a broader custom date range.
                        </p>
                        <button
                          type="button"
                          onClick={() => handlePresetSelect('all')}
                          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <span>Switch to All Time</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => {
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
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-900 dark:text-slate-100 transition"
                        >
                          {/* Invoice # */}
                          <td className="py-2 px-3 font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                            {tx.invoiceNumber}
                          </td>

                          {/* Date & Time */}
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
                            <span>{dateStr}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-300 block">{timeStr}</span>
                          </td>

                          {/* Patient Name */}
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                              {tx.customerName}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-300 font-mono">
                              {tx.customerPhone}
                            </span>
                          </td>

                          {/* Payment Mode */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                                tx.paymentMode.includes('CASH')
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : tx.paymentMode.includes('UPI')
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {tx.paymentMode}
                            </span>
                          </td>

                          {/* Order Status */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
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
                          <td className="py-2 px-3 text-center whitespace-nowrap">
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
                          <td className="py-2 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            ₹{Number(tx.advancePaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Balance Due */}
                          <td className="py-2 px-3 text-right font-mono font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            ₹{Number(tx.balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Grand Total */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            ₹{Number(tx.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── PAGINATION & LEDGER CONTROLS FOOTER ── */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-200 dark:border-slate-800 px-3.5 py-2 bg-slate-50/70 dark:bg-slate-950/40 text-xs text-slate-600 dark:text-slate-300 gap-2 no-print">
              <div className="flex items-center gap-3 flex-wrap">
                <span>
                  Showing <strong className="text-slate-800 dark:text-slate-200">{totalItems > 0 ? startIndex + 1 : 0}</strong> to{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{endIndex}</strong> of{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{totalItems}</strong> matching orders
                </span>

                {/* Rows per page selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-300">Rows:</span>
                  <select
                    data-testid="select-page-size"
                    aria-label="Rows per page"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={-1}>All ({totalItems})</option>
                  </select>
                </div>
              </div>

              {/* Navigation Pagination Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="btn-prev-page"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>

                <span className="px-2 font-mono font-semibold text-slate-700 dark:text-slate-300">
                  Page {safeCurrentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  data-testid="btn-next-page"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ReportsView;
