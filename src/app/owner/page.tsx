'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Receipt,
  Users,
  Store,
  ArrowRight,
  Plus,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ClipboardCheck,
  Building2,
  RefreshCw,
  ExternalLink,
  Loader2,
  BarChart3,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenantStore } from '@/store/tenant-store';
import { getOrganizationBranchesAction } from '@/actions/tenant-actions';
import { getStoreApprovalRequestsAction } from '@/actions/approval-actions';
import { getFinancialsReport } from '@/actions/report-actions';
import Decimal from 'decimal.js';

export default function OwnerCockpitPage() {
  const router = useRouter();
  const {
    selectedOrganizationId,
    organizations,
    setSelectedBranch,
    activeOrgCode,
  } = useTenantStore();

  const [branches, setBranches] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const activeOrg = organizations.find((o) => o.id === selectedOrganizationId);
  const activeOrgName = activeOrg?.name || 'Optix Vision Practice';
  const orgCode = activeOrg?.orgCode || activeOrgCode || 'OPT-1';

  const loadCockpit = React.useCallback(async () => {
    if (!selectedOrganizationId) return;
    setLoading(true);
    try {
      const [branchesRes, approvalsRes, reportsRes] = await Promise.all([
        getOrganizationBranchesAction(selectedOrganizationId),
        getStoreApprovalRequestsAction('pending'),
        getFinancialsReport({
          branchScope: 'all',
          preset: 'all',
        }),
      ]);

      if (branchesRes.success && branchesRes.branches) {
        setBranches(branchesRes.branches);
      }
      if (approvalsRes.success && approvalsRes.requests) {
        setPendingApprovals(approvalsRes.requests);
      }
      if (reportsRes.success && reportsRes.data) {
        setReportData(reportsRes.data);
      }
    } catch (e) {
      console.error('Failed to load owner cockpit data:', e);
      toast.error('Failed to load practice cockpit metrics');
    } finally {
      setLoading(false);
    }
  }, [selectedOrganizationId]);

  useEffect(() => {
    loadCockpit();
  }, [loadCockpit]);

  const handleLaunchStoreCounter = (branchId: string, branchName: string) => {
    setSelectedBranch(branchId);
    toast.success(`Launching ${branchName} POS Counter`);
    router.push('/pos/new-bill');
  };

  const totalSales = reportData?.totalRevenue
    ? new Decimal(reportData.totalRevenue).toFixed(2)
    : '0.00';
  const totalOrders = reportData?.totalOrders || 0;
  const activeBranchesCount = branches.filter((b) => b.isActive).length;

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">
      {/* ── Executive Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 text-white p-6 md:p-8 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md border border-white/20">
              <Shield className="h-3.5 w-3.5 text-blue-300" />
              <span>Practice Owner Headquarters</span>
              <span className="font-mono text-blue-200">({orgCode})</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {activeOrgName}
            </h1>
            <p className="text-xs md:text-sm text-blue-100/90 max-w-xl">
              Consolidated governance cockpit across all physical optical dispensary locations and workshop labs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={loadCockpit}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white border border-white/20 transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>

            <Link
              href="/owner/branches"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 px-4 py-2 text-xs font-bold transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Store Branch</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Pending Maker-Checker Approvals Alert (if any) ── */}
      {pendingApprovals.length > 0 && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {pendingApprovals.length} Internal Store Approval Request{pendingApprovals.length > 1 ? 's' : ''} Awaiting Review
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                Store managers and staff have submitted critical requests (customer/inventory/staff removals) requiring your authorization.
              </p>
            </div>
          </div>

          <Link
            href="/owner/approvals"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 text-xs font-bold transition shrink-0 shadow-xs"
          >
            <span>Review Approvals</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* ── Consolidated KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Practice Sales */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Practice Sales
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
              ₹{totalSales}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Combined gross revenue across all stores
            </p>
          </div>
        </div>

        {/* Total Completed Orders */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Invoices Billed
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {totalOrders}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Spectacle and optical dispensary orders
            </p>
          </div>
        </div>

        {/* Physical Store Branches */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Physical Branches
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {branches.length}
            </div>
            <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {activeBranchesCount} active store location{activeBranchesCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Internal Approvals Status */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Internal Governance
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {pendingApprovals.length} Pending
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Maker-checker requests from store staff
            </p>
          </div>
        </div>
      </div>

      {/* ── Physical Stores & Quick Launch POS Counter Section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Your Physical Stores & POS Launchers
            </h2>
            <p className="text-xs text-muted-foreground">
              Click any store below to enter its POS billing and counter workspace as the Practice Owner.
            </p>
          </div>

          <Link
            href="/owner/branches"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Manage All Stores</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground text-xs">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Loading store branches...</span>
          </div>
        ) : branches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-3">
            <Store className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="font-bold text-sm text-foreground">No Physical Stores Found</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create your first store branch to start counter billing and dispensing.
            </p>
            <Link
              href="/owner/branches"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add First Branch</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition">
                        <Store className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{b.name}</h3>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          ID: {b.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>

                    {b.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/60 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                        <span>Closed</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Optical Dispensary, Prescription Refraction & Workshop
                  </p>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Counter Ready
                  </span>

                  <button
                    type="button"
                    onClick={() => handleLaunchStoreCounter(b.id, b.name)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Launch Store POS</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Governance Action Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <Link
          href="/owner/staff"
          className="rounded-2xl border border-border bg-card p-5 hover:border-blue-500/50 hover:shadow-sm transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">Staff & Store Access</div>
              <div className="text-xs text-muted-foreground">Assign employees to stores</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
        </Link>

        <Link
          href="/owner/reports"
          className="rounded-2xl border border-border bg-card p-5 hover:border-blue-500/50 hover:shadow-sm transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">Consolidated Analytics</div>
              <div className="text-xs text-muted-foreground">Cross-store financial breakdown</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
        </Link>

        <Link
          href="/owner/settings"
          className="rounded-2xl border border-border bg-card p-5 hover:border-blue-500/50 hover:shadow-sm transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">Practice Governance</div>
              <div className="text-xs text-muted-foreground">Branding, tax, and SaaS tier</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
        </Link>
      </div>
    </div>
  );
}
