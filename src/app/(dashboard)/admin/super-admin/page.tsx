'use client';

import React, { useState, useEffect } from 'react';
import { useTenantStore, type RoleMode } from '@/store/tenant-store';
import {
  getSuperAdminPlatformMetrics,
  createBranchAction,
  type SuperAdminPlatformMetrics,
} from '@/actions/tenant-actions';
import {
  Shield,
  Building2,
  Store,
  Users,
  Layers,
  ArrowRight,
  TrendingUp,
  Plus,
  CheckCircle2,
  Eye,
  RefreshCw,
  Loader2,
  DollarSign,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminPage() {
  const {
    activeRoleMode,
    setRoleMode,
    selectedOrganizationId,
    selectedBranchId,
    setSelectedOrganization,
    setSelectedBranch,
    organizations,
    branches,
  } = useTenantStore();

  const [metrics, setMetrics] = useState<SuperAdminPlatformMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // New branch modal state
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [selectedOrgForNewBranch, setSelectedOrgForNewBranch] = useState('');
  const [creatingBranch, setCreatingBranch] = useState(false);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const data = await getSuperAdminPlatformMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load super admin metrics:', err);
      toast.error('Failed to load platform metrics');
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim() || !selectedOrgForNewBranch) {
      toast.error('Please fill all required fields');
      return;
    }

    setCreatingBranch(true);
    try {
      const res = await createBranchAction(newBranchName, selectedOrgForNewBranch);
      if (res.success) {
        toast.success(`Branch "${newBranchName}" created successfully!`);
        setNewBranchName('');
        setShowAddBranch(false);
        fetchMetrics();
      } else {
        toast.error(res.error || 'Failed to create branch');
      }
    } catch (err) {
      toast.error('Failed to create branch');
    } finally {
      setCreatingBranch(false);
    }
  };

  const handleSimulateTenant = (orgId: string) => {
    setSelectedOrganization(orgId);
    setRoleMode('organizer');
    toast.success(`Switched perspective to Organizer mode for selected practice.`);
  };

  const roleModes: {
    id: RoleMode;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }[] = [
    {
      id: 'super_admin',
      label: 'Super Admin',
      description: 'Global cross-tenant oversight, multi-org metrics, platform administration',
      icon: Shield,
      color: 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300',
    },
    {
      id: 'organizer',
      label: 'Organizer (Org Owner)',
      description: 'Practice owner view, consolidated multi-branch inventory and sales',
      icon: Building2,
      color: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300',
    },
    {
      id: 'admin',
      label: 'Store Admin',
      description: 'Branch manager privileges, local stock control, staff shift oversight',
      icon: Store,
      color: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
    },
    {
      id: 'user',
      label: 'Staff / POS Clerk',
      description: 'Single-counter POS billing operator, patient registration, optical dispensing',
      icon: Users,
      color: 'border-slate-400 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
    },
  ];

  const currentOrgName =
    organizations.find((o) => o.id === selectedOrganizationId)?.name ||
    'Optix Vision Care';

  const currentBranchName =
    selectedBranchId === 'all'
      ? 'All Branches (Consolidated)'
      : branches.find((b) => b.id === selectedBranchId)?.name || 'Main Branch';

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <Shield className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Super Admin Governance Console
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            3-Tier Hierarchical Governance, Multi-Tenant Stores, and 4-Mode Perspective Simulator
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchMetrics}
            disabled={loadingMetrics}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingMetrics ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <button
            type="button"
            data-testid="btn-add-store"
            onClick={() => {
              if (organizations.length > 0) {
                setSelectedOrgForNewBranch(organizations[0].id);
              }
              setShowAddBranch(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Physical Store</span>
          </button>
        </div>
      </div>

      {/* ── 4 Operating Perspective Modes Section ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span>4-Mode Operating Perspective Simulator</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Switch between user perspectives to test security, scoping, and multi-tenant isolation in real time.
            </p>
          </div>

          <span
            data-testid="active-perspective-indicator"
            className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
          >
            Active: {activeRoleMode.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {roleModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = activeRoleMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                data-testid={`mode-tab-${mode.id}`}
                onClick={() => {
                  setRoleMode(mode.id);
                  toast.success(`Operating mode changed to ${mode.label}`);
                }}
                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition cursor-pointer relative ${
                  isSelected
                    ? `${mode.color} border-2 shadow-xs`
                    : 'border-border bg-background hover:bg-muted/50 text-foreground'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5">
                    <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="h-4 w-4" />
                  <span className="font-bold text-xs">{mode.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {mode.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Live Filter Controls Bar */}
        <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-3 rounded-xl">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Target Organization Selector */}
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-foreground">Target Org:</span>
              <select
                value={selectedOrganizationId}
                data-testid="select-target-org"
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground focus:border-purple-600 focus:outline-hidden"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Branch Selector */}
            <div className="flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-foreground">Target Store:</span>
              <select
                value={selectedBranchId}
                data-testid="select-target-branch"
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground focus:border-purple-600 focus:outline-hidden"
              >
                <option value="all">🏢 All Branches (Consolidated)</option>
                {branches
                  .filter((b) => b.organizationId === selectedOrganizationId)
                  .map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      🏬 {branch.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Current Perspective Indicator Pill */}
          <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Simulating:</span>
            <span className="font-bold text-foreground">
              {currentOrgName} ({currentBranchName})
            </span>
          </div>
        </div>
      </div>

      {/* ── Platform Metrics Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">SaaS Tenants</span>
            <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {metrics?.totalOrganizations ?? (loadingMetrics ? '...' : 1)}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Registered practices</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Physical Stores</span>
            <Store className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {metrics?.totalBranches ?? (loadingMetrics ? '...' : 2)}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Branches in operation</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Orders</span>
            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {metrics?.totalInvoices ?? (loadingMetrics ? '...' : 0)}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Completed & active bills</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Platform GMV</span>
            <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            ₹{metrics?.totalGmv ? Number(metrics.totalGmv).toLocaleString('en-IN') : '0'}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Total billed volume</p>
        </div>
      </div>

      {/* ── Organizations & Physical Stores Table ── */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Tenant Practices & Store Hierarchy
            </h3>
            <p className="text-xs text-muted-foreground">
              Manage optical practice tenants, branch distribution, and operational metrics.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {metrics?.tenants.length || 1} Practices
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Practice Organization</th>
                <th className="py-3 px-4">Stores (Branches)</th>
                <th className="py-3 px-4">Billed Invoices</th>
                <th className="py-3 px-4">Total Revenue</th>
                <th className="py-3 px-4 text-right">Perspective Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {metrics?.tenants.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition">
                  <td className="py-3.5 px-4 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>{t.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    <div className="flex flex-wrap gap-1.5">
                      {t.branches.map((b) => (
                        <span
                          key={b.id}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                        >
                          <Store className="h-3 w-3 text-slate-400" />
                          <span>{b.name}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-foreground">
                    {t.totalInvoices}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                    ₹{Number(t.totalRevenue).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      data-testid={`btn-simulate-${t.id}`}
                      onClick={() => handleSimulateTenant(t.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-muted transition cursor-pointer"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Simulate Org View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Branch Modal ── */}
      {showAddBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-base font-bold text-foreground mb-1">
              Add New Physical Store Location
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Add a branch to an existing optical practice organization.
            </p>

            <form onSubmit={handleCreateBranch} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Target Organization
                </label>
                <select
                  value={selectedOrgForNewBranch}
                  onChange={(e) => setSelectedOrgForNewBranch(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground focus:border-purple-600 focus:outline-hidden"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Branch Store Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Koramangala 5th Block Branch"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground focus:border-purple-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranch(false)}
                  className="rounded-lg border border-border px-3 py-1.5 font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBranch}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-purple-700 cursor-pointer disabled:opacity-50"
                >
                  {creatingBranch ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Store</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
