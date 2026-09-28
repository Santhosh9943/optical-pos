'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { useTenantStore } from '@/store/tenant-store';
import {
  getFinancialsReport,
  type DailyFinancialsReport,
  type DatePreset,
} from '@/actions/report-actions';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  RefreshCw,
  Printer,
  Download,
  Store,
  Building2,
  Loader2,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import Decimal from 'decimal.js';

export default function OwnerConsolidatedReportsPage() {
  const { selectedOrganizationId, organizations, branches, activeOrgCode } = useTenantStore();

  const activeOrg = organizations.find((o) => o.id === selectedOrganizationId);
  const activeOrgName = activeOrg?.name || 'Optix Vision Practice';
  const orgCode = activeOrg?.orgCode || activeOrgCode || 'OPT-1';

  const orgBranches = React.useMemo(() => {
    return branches.filter((b) => b.organizationId === selectedOrganizationId);
  }, [branches, selectedOrganizationId]);

  const [branchScope, setBranchScope] = useState<string>('all');
  const [preset, setPreset] = useState<DatePreset>('all');
  const [report, setReport] = useState<DailyFinancialsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadReport = useCallback(() => {
    if (!selectedOrganizationId) return;
    setLoading(true);

    startTransition(async () => {
      try {
        const res = await getFinancialsReport({
          branchScope: branchScope === 'all' ? 'all' : branchScope,
          preset,
        });

        if (res.success && res.data) {
          setReport(res.data);
        } else {
          toast.error(res.error || 'Failed to load report data');
        }
      } catch (e) {
        console.error('Report error:', e);
        toast.error('Failed to load consolidated reports');
      } finally {
        setLoading(false);
      }
    });
  }, [selectedOrganizationId, branchScope, preset]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const transactions = report?.transactions || [];

  const totalSales = report?.totalRevenue
    ? new Decimal(report.totalRevenue).toFixed(2)
    : '0.00';
  const totalTax = report?.totalTax
    ? new Decimal(report.totalTax).toFixed(2)
    : '0.00';
  const cashTotal = report?.paymentSplits?.cash
    ? new Decimal(report.paymentSplits.cash).toFixed(2)
    : '0.00';
  const upiTotal = report?.paymentSplits?.upi
    ? new Decimal(report.paymentSplits.upi).toFixed(2)
    : '0.00';
  const cardTotal = report?.paymentSplits?.card
    ? new Decimal(report.paymentSplits.card).toFixed(2)
    : '0.00';

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Consolidated Practice Analytics
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Practice:</span>
            <strong className="text-foreground">{activeOrgName}</strong>
            <span className="text-muted-foreground">• Cross-store aggregated financials & audits</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Store Branch Scope Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
            <Store className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              aria-label="Filter report by store location"
              value={branchScope}
              onChange={(e) => setBranchScope(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground outline-hidden cursor-pointer"
            >
              <option value="all" className="dark:bg-slate-900">
                All Stores Consolidated ({orgBranches.length})
              </option>
              {orgBranches.map((b) => (
                <option key={b.id} value={b.id} className="dark:bg-slate-900">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Presets */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              aria-label="Select report date range preset"
              value={preset}
              onChange={(e) => setPreset(e.target.value as DatePreset)}
              className="bg-transparent text-xs font-semibold text-foreground outline-hidden cursor-pointer"
            >
              <option value="all" className="dark:bg-slate-900">All Time Ledger</option>
              <option value="today" className="dark:bg-slate-900">Today</option>
              <option value="yesterday" className="dark:bg-slate-900">Yesterday</option>
              <option value="last7" className="dark:bg-slate-900">Last 7 Days</option>
              <option value="thisMonth" className="dark:bg-slate-900">Month-to-Date</option>
            </select>
          </div>

          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Gross Sales */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>Gross Revenue</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">
            ₹{totalSales}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {report?.totalOrders || 0} total invoices
          </div>
        </div>

        {/* GST / Tax Collected */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>GST / Tax</span>
            <Receipt className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">
            ₹{totalTax}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Prescription & frames tax
          </div>
        </div>

        {/* Cash Collected */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>Cash Tendered</span>
            <Banknote className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">
            ₹{cashTotal}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Physical counter drawer
          </div>
        </div>

        {/* UPI / QR Payments */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>UPI Payments</span>
            <QrCode className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">
            ₹{upiTotal}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Instant digital receipts
          </div>
        </div>

        {/* Card Payments */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <span>Card POS</span>
            <CreditCard className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-foreground">
            ₹{cardTotal}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Credit / Debit swipes
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden flex flex-col flex-1">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Consolidated Audit Ledger
            </h2>
            <p className="text-xs text-muted-foreground">
              {branchScope === 'all'
                ? `Showing transactions across all ${orgBranches.length} stores`
                : `Showing transactions for ${orgBranches.find((b) => b.id === branchScope)?.name || 'Store'}`}
            </p>
          </div>

          <span className="text-xs font-mono font-semibold text-muted-foreground">
            {transactions.length} record{transactions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground text-xs">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Compiling consolidated report...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-xs">
            No transactions found for the selected period and store scope.
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Time & Invoice #</th>
                  <th className="px-4 py-3">Store Location</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-foreground">{tx.invoiceNumber}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border">
                        <Store className="h-2.5 w-2.5" />
                        <span>{tx.branchName || 'Main Store'}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground">{tx.customerName}</div>
                      <div className="text-[10px] text-muted-foreground">{tx.customerPhone}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {tx.paymentMode}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {tx.paymentStatus}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                      ₹{new Decimal(tx.grandTotal).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
