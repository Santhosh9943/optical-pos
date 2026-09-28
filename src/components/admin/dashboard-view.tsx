'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Users,
  Clock,
  AlertTriangle,
  Package,
  Glasses,
  Plus,
  ArrowUpRight,
  ExternalLink,
  Store,
  RefreshCw,
  Sparkles,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { useTenantStore } from '@/store/tenant-store';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR } from '@/lib/format';
import { useCachedResource } from '@/hooks/use-cached-resource';
import {
  getDashboardOperationalMetricsAction,
  type DashboardOperationalMetrics,
} from '@/actions/dashboard-actions';

/**
 * @description Placeholder KPI card rendered while dashboard metrics are loading, so zeros are
 * never shown as if they were real figures.
 * @returns A skeleton KPI card matching the live card footprint.
 */
function KpiCardSkeleton(): React.JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <div className="mt-2 space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

/**
 * @description Skeleton rows used inside dashboard list widgets while metrics are loading.
 * @param props.rows - Number of placeholder rows to render.
 * @returns A stack of skeleton list rows.
 */
function WidgetRowsSkeleton({ rows }: { rows: number }): React.JSX.Element {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="p-3 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * @description Operational cockpit for store staff: live KPIs, recent orders, lab order status,
 * tender split and low-stock alerts. Shows skeletons until the first payload arrives and an
 * inline retryable error card if the metrics request fails.
 * @returns The dashboard view.
 */
export function DashboardView() {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const { selectedBranchId, branches } = useTenantStore();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // When no branch is selected yet, the server action falls back to the session's branch.
  const effectiveBranchId: string | undefined = selectedBranchId || branches[0]?.id || undefined;

  const fetcher = useCallback(async () => {
    return await getDashboardOperationalMetricsAction(effectiveBranchId);
  }, [effectiveBranchId]);

  const { data, error, isRevalidating, refresh } = useCachedResource<DashboardOperationalMetrics>({
    cacheKey: `dashboard_metrics:${effectiveBranchId ?? 'session-branch'}`,
    fetcher,
    refreshInterval: 15000, // 15 seconds auto-refresh
    revalidateOnFocus: true,
  });

  /** True until the first real metrics payload (cached or fresh) is available. */
  const isPending = !data && !error;

  const kpis = data?.kpis || {
    todayRevenue: '0.00',
    revenueChangePct: 0,
    orderCount: 0,
    balanceDue: '0.00',
    activeLabOrders: 0,
    lowStockCount: 0,
  };
  const recentOrders = data?.recentOrders || [];
  const labOrders = data?.labOrderSummary || [];
  const paymentSplit = data?.paymentModeSplit || [];
  const lowStock = data?.lowStockItems || [];
  const currentBranch = branches.find((b) => b.id === effectiveBranchId);
  const activeBranchName = currentBranch?.name || data?.activeBranchName || 'Store Location';
  const displayBranchName = mounted ? activeBranchName : 'Store Location';

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6" data-testid="operational-dashboard">
      {/* ── TOP OPERATIONAL HEADER BAR ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground">Operational Cockpit</h1>
              <span
                suppressHydrationWarning
                className="rounded bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              >
                {displayBranchName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live 15s SWR Telemetry
              </span>
              <span>•</span>
              <button
                type="button"
                onClick={() => refresh()}
                className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                title="Refresh metrics immediately"
              >
                <RefreshCw className={`h-3 w-3 ${isRevalidating ? 'animate-spin text-blue-500' : ''}`} />
                <span>{isRevalidating ? 'Syncing…' : 'Sync Now'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons Bar */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/pos/new-bill"
            data-testid="dashboard-quick-bill-btn"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Bill</span>
            <span className="ml-1 rounded bg-blue-700 px-1 py-0.2 text-[9px] font-mono">F1</span>
          </Link>

          <Link
            href="/admin/inventory"
            data-testid="dashboard-quick-stock-btn"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 text-xs font-semibold shadow-2xs transition"
          >
            <Package className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Stock</span>
            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.2 text-[9px] font-mono">F3</span>
          </Link>

          <Link
            href="/admin/patients"
            data-testid="dashboard-quick-patient-btn"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 text-xs font-semibold shadow-2xs transition"
          >
            <Users className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden md:inline">Patients</span>
          </Link>

          <Link
            href="/admin/lab-orders"
            data-testid="dashboard-quick-lab-btn"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 text-xs font-semibold shadow-2xs transition"
          >
            <Glasses className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden md:inline">Lab Kanban</span>
          </Link>
        </div>
      </div>

      {/* ── METRICS LOAD FAILURE (inline, retryable) ── */}
      {error && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {data ? 'Live metrics could not be refreshed' : 'Dashboard metrics failed to load'}
              </p>
              <p className="text-xs text-muted-foreground">
                {data
                  ? 'Showing the last synced figures. Check your connection and retry.'
                  : 'Figures are unavailable right now. Check your connection and retry.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isRevalidating}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRevalidating ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ── TOP KPI METRIC CARDS STRIP ── */}
      {!data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-busy={isPending}>
          <span className="sr-only" role="status">
            {isPending ? 'Loading dashboard metrics…' : 'Dashboard metrics unavailable'}
          </span>
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
      ) : (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Today's Revenue */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Today's Revenue</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
              {formatINR(kpis.todayRevenue)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px]">
              {kpis.revenueChangePct >= 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" />
                  +{kpis.revenueChangePct}%
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-0.5">
                  <TrendingDown className="h-3 w-3" />
                  {kpis.revenueChangePct}%
                </span>
              )}
              <span className="text-muted-foreground">vs yesterday</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Completed Orders Today */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Orders Completed</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
              {kpis.orderCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Invoices billed on shift
            </div>
          </div>
        </div>

        {/* KPI 3: Outstanding Balance Due */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Pending Balance</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
              {formatINR(kpis.balanceDue)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Pending collection at delivery
            </div>
          </div>
        </div>

        {/* KPI 4: Active Workshop Lab Orders */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Workshop Lab Orders</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
              {kpis.activeLabOrders}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
              <span>Fitting & mounting</span>
              <Link href="/admin/lab-orders" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                View Kanban →
              </Link>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── MAIN COCKPIT SECTION: DUAL COLUMN FLUID LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT / CENTER COLUMN (2/3 width): Live Recent Orders & Workshop Orders */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Widget 1: Live Recent Orders Feed */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-bold text-foreground">Live Orders & Settlements</h2>
              </div>
              <Link
                href="/admin/reports"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Full Ledger</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {isPending ? (
              <WidgetRowsSkeleton rows={4} />
            ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 px-4 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs font-bold">
                        #{order.invoiceNumber.slice(-4)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">
                          {order.patientName}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {order.phone || 'Walk-in Customer'} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-bold font-mono tabular-nums text-foreground">
                          {formatINR(order.total)}
                        </div>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                            order.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : order.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>

                      <Link
                        href={`/receipt/${order.id}`}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="View receipt"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No orders billed yet on this shift. Use{' '}
                  <Link href="/pos/new-bill" className="text-blue-600 font-semibold hover:underline">
                    New Bill (F1)
                  </Link>{' '}
                  to start billing.
                </div>
              )}
            </div>
            )}
          </div>

          {/* Widget 2: Workshop Lab Orders Snapshot */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Glasses className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h2 className="text-sm font-bold text-foreground">Workshop Lab Orders Status</h2>
              </div>
              <Link
                href="/admin/lab-orders"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Kanban Board</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {isPending ? (
              <WidgetRowsSkeleton rows={3} />
            ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {labOrders.length > 0 ? (
                labOrders.map((lo) => (
                  <div
                    key={lo.id}
                    className="p-3 px-4 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate block">
                          {lo.patientName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Promised: {lo.promisedDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {lo.isOverdue && (
                        <span className="rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-[9px] font-bold px-1.5 py-0.5">
                          SLA Overdue
                        </span>
                      )}
                      <span className="rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold px-2 py-0.5">
                        {lo.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Zero pending lab workshop orders. All lens mountings completed.
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (1/3 width): Payment Splits & Low Stock Alerts */}
        <div className="flex flex-col gap-5">
          {/* Widget 3: Payment Modes Breakdown Today */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Tender Settlement Split</span>
            </h2>

            <div className="space-y-3">
              {isPending &&
                Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))}
              {paymentSplit.map((item) => (
                <div key={item.mode} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {item.mode === 'UPI'
                        ? 'UPI QR Code'
                        : item.mode === 'CARD'
                        ? 'Debit / Credit Card'
                        : item.mode === 'CASH'
                        ? 'Cash Counter'
                        : 'Store Credit'}
                    </span>
                    <span className="font-mono font-bold tabular-nums text-foreground">
                      {formatINR(item.total)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.mode === 'UPI'
                          ? 'bg-blue-600'
                          : item.mode === 'CARD'
                          ? 'bg-purple-600'
                          : item.mode === 'CASH'
                          ? 'bg-emerald-600'
                          : 'bg-amber-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 4: Low Stock Warnings */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-500" />
                <span>Low Stock Warnings</span>
              </h2>
              <Link href="/admin/inventory" className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Reorder →
              </Link>
            </div>

            <div className="space-y-2.5">
              {isPending ? (
                <>
                  <Skeleton className="h-11 w-full rounded-lg" />
                  <Skeleton className="h-11 w-full rounded-lg" />
                </>
              ) : lowStock.length > 0 ? (
                lowStock.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-foreground truncate">
                        {item.itemName}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        SKU: {item.sku}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-red-600 dark:text-red-400">
                        {item.stockQuantity}
                      </span>
                      <span className="text-[10px] text-muted-foreground"> / {item.threshold} min</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-lg border border-emerald-200/50 dark:border-emerald-900/30">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>All store inventory is above minimum reorder thresholds.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
