'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getSuperAdminPlatformMetrics,
  type SuperAdminPlatformMetrics,
} from '@/actions/tenant-actions';
import { useTenantStore } from '@/store/tenant-store';
import {
  Building2,
  Store,
  FileText,
  TrendingUp,
  RefreshCw,
  Eye,
  ArrowRight,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { startSimulation } = useTenantStore();
  const [metrics, setMetrics] = useState<SuperAdminPlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleQuickSimulate = (orgId: string, orgName: string) => {
    startSimulation({
      role: 'organizer',
      orgId,
      orgName,
      branchId: 'all',
      branchName: 'All Branches (Consolidated)',
    });
    toast.success(`Simulation activated: Acting as Organizer at ${orgName}`);
    router.push('/admin/branches');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Global Platform Telemetry</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Multi-Tenant SaaS Oversight, Global GMV Tracking & Physical Store Networks
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
            <span>Refresh Metrics</span>
          </button>

          <Link
            href="/super-admin/simulator"
            data-testid="btn-open-simulator"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:from-purple-500 hover:to-indigo-500 transition cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-amber-300" />
            <span>Open Simulator</span>
          </Link>
        </div>
      </div>

      {/* ── Platform Metrics Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">SaaS Tenants</span>
            <Building2 className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {metrics?.totalOrganizations ?? (loading ? '...' : 1)}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">Registered practices</p>
        </div>

        <div data-testid="metric-physical-stores" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Physical Stores</span>
            <Store className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {metrics?.totalBranches ?? (loading ? '...' : 2)}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">Branches in operation</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Orders</span>
            <FileText className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {metrics?.totalInvoices ?? (loading ? '...' : 0)}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">Completed & active bills</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Platform GMV</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            ₹{metrics?.totalGmv ? Number(metrics.totalGmv).toLocaleString('en-IN') : '0'}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">Total billed volume</p>
        </div>
      </div>

      {/* ── Interactive Simulator Callout Banner ── */}
      <div className="rounded-2xl border border-purple-800/50 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/20 text-amber-400">
              <Eye className="h-3.5 w-3.5" />
            </span>
            <span className="font-bold text-sm text-white">
              Perspective Simulator & Impersonation Engine
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Test multi-tenant isolation, role permissions, and branch scoping in real-time. Act as an
            <strong className="text-purple-300 font-semibold"> Organizer</strong> (practice owner),
            <strong className="text-emerald-300 font-semibold"> Store Admin</strong> (branch manager), or
            <strong className="text-blue-300 font-semibold"> Store Staff</strong> (counter POS operator) directly inside the live application with instant one-click exit back to root.
          </p>
        </div>

        <Link
          href="/super-admin/simulator"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 transition cursor-pointer self-start md:self-auto shrink-0"
        >
          <span>Launch Simulator</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── Registered Organizations & Branches Directory Table ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm overflow-hidden">
        <div className="border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-400" />
              <span>SaaS Tenant Organizations</span>
            </h2>
            <p className="text-xs text-slate-400">
              Active optical practices with branch breakdown and live billing volume
            </p>
          </div>

          <Link
            href="/super-admin/organizations"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <span>View All Practices</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3 font-semibold">Organization Name</th>
                <th className="px-5 py-3 font-semibold">Physical Stores</th>
                <th className="px-5 py-3 font-semibold">Total Bills</th>
                <th className="px-5 py-3 font-semibold">Billed GMV</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {metrics?.tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-white">{tenant.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">ID: {tenant.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {tenant.branches.map((b) => (
                        <span
                          key={b.id}
                          className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700"
                        >
                          <Store className="h-2.5 w-2.5 text-blue-400" />
                          {b.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-200">{tenant.totalInvoices}</td>
                  <td className="px-5 py-3.5 font-mono font-semibold text-emerald-400">
                    ₹{Number(tenant.totalRevenue).toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      data-testid={`btn-simulate-tenant-${tenant.id}`}
                      onClick={() => handleQuickSimulate(tenant.id, tenant.name)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-purple-600/30 px-2.5 py-1 text-[11px] font-semibold text-purple-300 border border-purple-500/30 hover:bg-purple-600/50 transition cursor-pointer"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Act as Owner</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
