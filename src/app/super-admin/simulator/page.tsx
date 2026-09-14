'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTenantStore, type RoleMode } from '@/store/tenant-store';
import {
  getUserTenancyContext,
  type TenancyContext,
} from '@/actions/tenant-actions';
import {
  Eye,
  Building2,
  Store,
  Users,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Layers,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PerspectiveSimulatorPage() {
  const router = useRouter();
  const { startSimulation } = useTenantStore();

  const [tenancy, setTenancy] = useState<TenancyContext | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected simulation parameters
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    () => useTenantStore.getState().selectedOrganizationId || '00000000-0000-0000-0000-000000000001'
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<RoleMode>('organizer');

  useEffect(() => {
    getUserTenancyContext().then((ctx) => {
      setTenancy(ctx);
      if (ctx.organizations.length > 0) {
        setSelectedOrgId((prev) => {
          if (prev && ctx.organizations.some((o) => o.id === prev)) return prev;
          return ctx.organizations[0].id;
        });
      }
      setLoading(false);
    });
  }, []);

  const currentOrg = tenancy?.organizations.find((o) => o.id === selectedOrgId);
  const availableBranches = tenancy?.branches.filter(
    (b) => b.organizationId === selectedOrgId
  ) || [];

  const handleLaunch = () => {
    const orgId =
      selectedOrgId ||
      useTenantStore.getState().selectedOrganizationId ||
      '00000000-0000-0000-0000-000000000001';
    const orgName = currentOrg?.name || tenancy?.organizations[0]?.name || 'Optix Vision Care';
    const branchName =
      selectedBranchId === 'all'
        ? 'All Branches (Consolidated)'
        : availableBranches.find((b) => b.id === selectedBranchId)?.name || 'Main Branch';

    startSimulation({
      role: selectedRole,
      orgId,
      orgName,
      branchId: selectedBranchId,
      branchName,
    });

    toast.success(`Simulation started! Acting as ${selectedRole.toUpperCase()} at ${orgName}`);

    // Direct to appropriate landing route based on role with full layout remount
    const targetUrl =
      selectedRole === 'organizer'
        ? '/admin/branches'
        : selectedRole === 'admin'
        ? '/admin/inventory'
        : '/pos/new-bill';

    window.location.href = targetUrl;
  };

  const roleConfigs: {
    id: RoleMode;
    label: string;
    badge: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    features: string[];
  }[] = [
    {
      id: 'organizer',
      label: 'Organizer (Practice Owner)',
      badge: 'Full Practice Scope',
      color: 'border-purple-500 bg-purple-950/30 text-purple-200',
      icon: Building2,
      description:
        'Acts as the business owner with multi-store oversight, financial reporting, and practice management.',
      features: [
        'Consolidated multi-branch view + switch between any physical store',
        'Exclusive access to "Manage Branches" (/admin/branches)',
        'Exclusive access to "Manage Staff & Roles" (/admin/staff)',
        'Full financial Z-Reports, ledger audits, and store settings',
      ],
    },
    {
      id: 'admin',
      label: 'Store Admin (Branch Manager)',
      badge: 'Single Store Scoped',
      color: 'border-emerald-500 bg-emerald-950/30 text-emerald-200',
      icon: Store,
      description:
        'Acts as the physical store manager. Locked to the selected branch, managing local stock and store staff.',
      features: [
        'Branch Switcher locked to the assigned store location',
        'Store Staff Management (/admin/staff restricted to this store)',
        'Local inventory management, stock intake, and local reports',
        'No multi-organization switching or physical branch creation',
      ],
    },
    {
      id: 'user',
      label: 'Store Staff (POS Cashier / Optician)',
      badge: 'Counter Operator',
      color: 'border-blue-500 bg-blue-950/30 text-blue-200',
      icon: Users,
      description:
        'Acts as a counter operator. Streamlined for fast optical sales, dispensing, and customer service.',
      features: [
        'Rapid POS Billing (F1) and Optical Prescription entry',
        'Patient search, family linking, and lab order checking',
        'Branch Switcher locked to the assigned counter store',
        'All financial audit reports, settings, and staff controls hidden',
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Perspective Simulator & Impersonation Engine
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
              Launch into the live application under different tenant and role perspectives with live data
            </p>
          </div>
        </div>
      </div>

      {/* ── Selection Workflow Card ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-md space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Step 1: Select Organization */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-purple-400" />
              <span>1. Select Target Practice (Organization)</span>
            </label>
            <select
              data-testid="sim-org-select"
              value={selectedOrgId}
              onChange={(e) => {
                setSelectedOrgId(e.target.value);
                setSelectedBranchId('all');
              }}
              disabled={loading}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-white focus:border-purple-500 focus:outline-hidden"
            >
              {tenancy?.organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              The SaaS tenant practice whose data and settings will be loaded.
            </p>
          </div>

          {/* Step 2: Select Physical Branch */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-emerald-400" />
              <span>2. Select Physical Store Location</span>
            </label>
            <select
              data-testid="sim-branch-select"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={loading || availableBranches.length === 0}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-white focus:border-purple-500 focus:outline-hidden"
            >
              <option value="all">🏢 All Branches (Consolidated View)</option>
              {availableBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  🏬 {b.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              Choose &quot;All Branches&quot; for practice owners, or pick a specific branch for Store Admin/Staff.
            </p>
          </div>
        </div>

        {/* Step 3: Choose Role Perspective */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>3. Choose Operating Persona</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roleConfigs.map((cfg) => {
              const isSelected = selectedRole === cfg.id;
              const Icon = cfg.icon;

              return (
                <button
                  key={cfg.id}
                  type="button"
                  data-testid={`btn-select-role-${cfg.id}`}
                  onClick={() => setSelectedRole(cfg.id)}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition cursor-pointer relative ${
                    isSelected
                      ? `${cfg.color} border-2 shadow-md`
                      : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-3 right-3">
                      <CheckCircle2 className="h-4 w-4 text-amber-400" />
                    </span>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-white" />
                    <span className="font-bold text-xs text-white">{cfg.label}</span>
                  </div>

                  <span className="inline-block rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-300 mb-2">
                    {cfg.badge}
                  </span>

                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                    {cfg.description}
                  </p>

                  <div className="mt-auto w-full pt-2 border-t border-slate-800/80 space-y-1">
                    {cfg.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Trigger Bar */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            <span>Ready to act as: </span>
            <strong className="text-white font-bold capitalize">{selectedRole}</strong>
            <span> at </span>
            <strong className="text-purple-300 font-bold">{currentOrg?.name || 'Practice'}</strong>
          </div>

          <button
            type="button"
            data-testid="btn-launch-simulation"
            onClick={handleLaunch}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg hover:from-amber-400 hover:via-purple-500 hover:to-indigo-500 transition cursor-pointer active:scale-95"
          >
            <Sparkles className="h-4 w-4 text-amber-200" />
            <span>Launch Simulated Session</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
