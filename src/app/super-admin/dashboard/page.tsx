'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getSuperAdminPlatformMetrics,
  toggleOrganizationStatusAction,
  type SuperAdminPlatformMetrics,
} from '@/actions/tenant-actions';
import {
  Building2,
  Store,
  Users,
  ShieldCheck,
  RefreshCw,
  Plus,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Server,
  Layers,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<SuperAdminPlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingOrgId, setTogglingOrgId] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await getSuperAdminPlatformMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load super admin metrics:', err);
      toast.error('Failed to load platform metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleToggleOrg = async (orgId: string, currentStatus: boolean) => {
    setTogglingOrgId(orgId);
    try {
      const res = await toggleOrganizationStatusAction(orgId, !currentStatus);
      if (res.success) {
        toast.success(`Practice status updated`);
        fetchMetrics();
      }
    } catch {
      toast.error('Failed to update organization status');
    } finally {
      setTogglingOrgId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-purple-400" />
            <span>Platform Tenant & Store Governance</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            SaaS Practice Management, Physical Dispensary Network & Branch User Directory
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchMetrics}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/super-admin/organizations"
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Register Practice</span>
          </Link>
        </div>
      </div>

      {/* ── Platform Governance Telemetry Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: SaaS Tenants */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">SaaS Tenants</span>
            <Building2 className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {metrics?.totalOrganizations ?? (loading ? '...' : 0)}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">Registered practices</p>
        </div>

        {/* Metric 2: Physical Stores */}
        <div data-testid="metric-physical-stores" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Physical Stores</span>
            <Store className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {metrics?.totalBranches ?? (loading ? '...' : 0)}
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-400 font-medium">
            {metrics?.activeBranches ?? 0} active dispensaries
          </p>
        </div>

        {/* Metric 3: Branch Users & Staff */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Branch Staff & Users</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {metrics?.totalUsers ?? (loading ? '...' : 0)}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">Managers, Optometrists, Staff</p>
        </div>

        {/* Metric 4: Platform Infrastructure */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Platform Infrastructure</span>
            <Server className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-base font-bold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Operational</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">Neon PgBouncer & Redis REST</p>
        </div>
      </div>

      {/* ── Registered Practice Organizations & Store Branches Directory Table ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm overflow-hidden">
        <div className="border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-400" />
              <span>SaaS Tenant Organizations & Branch Networks</span>
            </h2>
            <p className="text-xs text-slate-400">
              Overview of physical branches and assigned users per optical practice
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/super-admin/branches"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Store className="h-3.5 w-3.5" />
              <span>Store Directory</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3 font-semibold">Practice Name</th>
                <th className="px-5 py-3 font-semibold">Physical Store Branches</th>
                <th className="px-5 py-3 font-semibold">Branch Staff Users</th>
                <th className="px-5 py-3 font-semibold">Practice Status</th>
                <th className="px-5 py-3 font-semibold text-right">Governance Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {metrics && metrics.tenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="h-8 w-8 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-300">Zero Practice Organizations Registered</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Platform currently has 0 stores and 0 tenant practices. When new optical practices register, their stores and staff will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                metrics?.tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-white">{tenant.name}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded bg-purple-950/60 px-2 py-0.5 text-[11px] font-mono font-bold text-purple-300 border border-purple-800">
                        Practice ID: {tenant.orgCode || `OPT-${tenant.orgNumber || 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const code = tenant.orgCode || `OPT-${tenant.orgNumber || 1}`;
                          navigator.clipboard.writeText(code);
                          toast.success(`Copied Practice ID (${code}) to clipboard`);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                        title="Copy Practice ID"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {tenant.branches.map((b) => (
                        <span
                          key={b.id}
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium border ${
                            b.isActive
                              ? 'bg-slate-800 text-slate-200 border-slate-700'
                              : 'bg-red-950/40 text-red-300 border-red-800/40'
                          }`}
                        >
                          <Store className="h-2.5 w-2.5 text-blue-400" />
                          <span>{b.name}</span>
                          <span className="text-[9px] text-slate-400">({b.userCount || 1} staff)</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-blue-400" />
                      <span className="font-semibold">{tenant.totalUsers}</span>
                      <span className="text-slate-500">active users</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {tenant.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        <span>Active Practice</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-950/60 px-2 py-0.5 text-[10px] font-semibold text-red-400 border border-red-800">
                        <XCircle className="h-2.5 w-2.5" />
                        <span>Suspended</span>
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href="/super-admin/branches"
                        className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
                      >
                        <Store className="h-3 w-3 text-emerald-400" />
                        <span>Manage Stores</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleToggleOrg(tenant.id, tenant.isActive)}
                        disabled={togglingOrgId === tenant.id}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold border transition cursor-pointer ${
                          tenant.isActive
                            ? 'bg-red-950/20 text-red-300 border-red-800/40 hover:bg-red-900/40'
                            : 'bg-emerald-950/20 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/40'
                        }`}
                      >
                        <span>{tenant.isActive ? 'Suspend' : 'Activate'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
