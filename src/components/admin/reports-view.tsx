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
  FileCheck,
  Search,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getDailyFinancials,
  type DailyFinancialsReport,
  type DailyReportTransaction,
} from '@/actions/report-actions';

export function ReportsView() {
  // Today's date formatted as YYYY-MM-DD in local time
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [report, setReport] = useState<DailyFinancialsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const fetchReport = async (dateStr: string) => {
    try {
      setIsLoading(true);
      const res = await getDailyFinancials(dateStr);
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        toast.error('Failed to load financials', {
          description: res.error || 'Could not fetch daily report.',
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

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  const handleRefresh = () => {
    startTransition(async () => {
      await fetchReport(selectedDate);
      toast.info('Report refreshed', { duration: 2000 });
    });
  };

  const handlePrintZReport = () => {
    window.print();
  };

  // Filter transactions in ledger by invoice #, customer name, phone, or mode
  const filteredTransactions = (report?.transactions || []).filter((tx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      tx.invoiceNumber.toLowerCase().includes(q) ||
      tx.customerName.toLowerCase().includes(q) ||
      tx.customerPhone.includes(q) ||
      tx.paymentMode.toLowerCase().includes(q) ||
      tx.paymentStatus.toLowerCase().includes(q)
    );
  });

  const formattedDateHeader = new Date(selectedDate + 'T00:00:00').toLocaleDateString(
    'en-IN',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  return (
    <div className="flex flex-col w-full h-full flex-1 p-4 md:p-6 overflow-auto bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 space-y-6">
      {/* ── Top Header & Date Selection Toolbar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Daily Z-Report & Financials
            </h1>
            <span className="rounded bg-blue-100 dark:bg-blue-950/70 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Closing Register
            </span>
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Audit register collections, tax liabilities, and transaction ledger for{' '}
            <strong className="text-slate-800 dark:text-slate-200">{formattedDateHeader}</strong>
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleDateChange(getTodayStr())}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                selectedDate === getTodayStr()
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleDateChange(getYesterdayStr())}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                selectedDate === getYesterdayStr()
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Yesterday
            </button>
          </div>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-2xs focus:border-blue-600 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isPending}
            className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 shadow-2xs"
            title="Refresh Report"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading || isPending ? 'animate-spin text-blue-600' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handlePrintZReport}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95"
          >
            <Printer className="h-3.5 w-3.5 text-emerald-400" />
            <span>Print Z-Report</span>
          </button>
        </div>
      </div>

      {isLoading && !report ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center">
          <Loader2 className="h-9 w-9 animate-spin text-blue-600 mb-3" />
          <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
            Calculating Daily Financial Metrics...
          </p>
          <p className="text-xs text-slate-400 mt-1">Aggregating invoices, taxes, and payment tenders</p>
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
                Gross value of all billed sales today
              </p>
            </div>

            {/* Total Orders */}
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
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {report?.totalOrders || 0}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  orders placed
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Avg order: ₹
                {report && report.totalOrders > 0
                  ? (Number(report.totalRevenue) / report.totalOrders).toFixed(2)
                  : '0.00'}
              </p>
            </div>

            {/* Total Tax Collected (CGST + SGST) */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total GST Collected
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <FileCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1 font-mono">
                <span className="text-sm font-bold text-slate-400">₹</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {Number(report?.totalTax || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                CGST: ₹
                {report
                  ? (Number(report.totalTax) / 2).toFixed(2)
                  : '0.00'}{' '}
                · SGST: ₹
                {report
                  ? (Number(report.totalTax) / 2).toFixed(2)
                  : '0.00'}
              </p>
            </div>

            {/* Balance Pending / Due */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Outstanding Receivables
                </span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    Number(report?.totalBalanceDue || 0) > 0
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1 font-mono">
                <span className="text-sm font-bold text-slate-400">₹</span>
                <span
                  className={`text-2xl font-bold ${
                    Number(report?.totalBalanceDue || 0) > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {Number(report?.totalBalanceDue || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Advances collected: ₹
                {Number(report?.totalAdvancePaid || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* ── MIDDLE ROW: PAYMENT SPLITS / TENDER BREAKDOWN ── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Payment Mode Reconciliation (Cash vs Digital)
                </h2>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
                Total Realized Collections: ₹{report?.paymentSplits.totalCollected}
              </span>
            </div>

            {/* Visual Tender Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Cash in Hand */}
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Cash Tendered
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Physical
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1 font-mono">
                  <span className="text-xs font-bold text-emerald-600">₹</span>
                  <span className="text-xl font-bold text-emerald-950 dark:text-emerald-100">
                    {Number(report?.paymentSplits.cash || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                  Physical currency counted in drawer
                </p>
              </div>

              {/* UPI / QR Payments */}
              <div className="rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      <QrCode className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      UPI / QR Code
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                    Direct Bank
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1 font-mono">
                  <span className="text-xs font-bold text-blue-600">₹</span>
                  <span className="text-xl font-bold text-blue-950 dark:text-blue-100">
                    {Number(report?.paymentSplits.upi || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-blue-700/80 dark:text-blue-400/80">
                  PhonePe, GPay, Paytm, BharatPe
                </p>
              </div>

              {/* Card / POS Machines */}
              <div className="rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                      Credit / Debit Card
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400">
                    Terminal
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1 font-mono">
                  <span className="text-xs font-bold text-purple-600">₹</span>
                  <span className="text-xl font-bold text-purple-950 dark:text-purple-100">
                    {Number(report?.paymentSplits.card || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-purple-700/80 dark:text-purple-400/80">
                  Swiped on card terminal machines
                </p>
              </div>
            </div>
          </div>

          {/* ── BOTTOM SECTION: TRANSACTION LEDGER ── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden space-y-3 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Daily Order & Payment Audit Ledger
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Granular itemization of invoices issued on this date
                </p>
              </div>

              {/* Quick Search inside today's ledger */}
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter invoice, patient..."
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-1 pl-8 pr-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Patient Name</th>
                    <th className="py-2.5 px-3">Payment Mode</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Advance Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance Due</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <Receipt className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <p className="mt-2 font-medium text-slate-600 dark:text-slate-300 text-xs">
                          No transactions found for {formattedDateHeader}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {selectedDate === getTodayStr()
                            ? 'Complete orders in Billing POS to see them populate here, or switch to Yesterday.'
                            : 'Try selecting a different date from the date picker above.'}
                        </p>
                        {selectedDate === getTodayStr() && (
                          <button
                            type="button"
                            onClick={() => handleDateChange(getYesterdayStr())}
                            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            <span>View Yesterday's Transactions</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const timeStr = new Date(tx.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      const isPaid = tx.paymentStatus === 'PAID';
                      const isPartial = tx.paymentStatus === 'PARTIAL';

                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-slate-900 dark:text-slate-100 transition"
                        >
                          {/* Invoice # */}
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                            {tx.invoiceNumber}
                          </td>

                          {/* Time */}
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {timeStr}
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
                          <td className="py-2.5 px-3">
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

                          {/* Payment Status */}
                          <td className="py-2.5 px-3 text-center">
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
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            ₹{Number(tx.advancePaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Balance Due */}
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-amber-600 dark:text-amber-400">
                            ₹{Number(tx.balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Grand Total */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
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
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing <strong className="text-slate-800 dark:text-slate-200">{filteredTransactions.length}</strong> orders for {formattedDateHeader}
                </span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  Total Day Billed: ₹{report?.totalRevenue}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ReportsView;
