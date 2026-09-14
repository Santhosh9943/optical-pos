'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTenantStore, type RoleMode } from '@/store/tenant-store';
import {
  ShieldAlert,
  LogOut,
  Building2,
  Store,
  Users,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

export function SimulationBanner() {
  const router = useRouter();
  const {
    isSimulating,
    activeRoleMode,
    selectedOrganizationId,
    selectedBranchId,
    simulatedOrgName,
    simulatedBranchName,
    organizations,
    branches,
    exitSimulation,
    updateSimulatedRole,
    updateSimulatedBranch,
  } = useTenantStore();

  if (!isSimulating) {
    return null;
  }

  const roleLabels: Record<RoleMode, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    super_admin: { label: 'Super Admin', icon: ShieldAlert },
    organizer: { label: 'Organizer (Org Owner)', icon: Building2 },
    admin: { label: 'Store Admin', icon: Store },
    user: { label: 'Store Staff (POS)', icon: Users },
  };

  const currentRole = roleLabels[activeRoleMode] || roleLabels.user;
  const RoleIcon = currentRole.icon;

  const currentOrg =
    organizations.find((o) => o.id === selectedOrganizationId)?.name ||
    simulatedOrgName ||
    'Optix Vision Care';

  const orgBranches = branches.filter(
    (b) => b.organizationId === selectedOrganizationId
  );

  const handleExit = () => {
    exitSimulation();
    toast.success('Exited simulation mode. Returned to Super Admin Console.');
    router.push('/super-admin/simulator');
  };

  const handleRoleChange = (newRole: RoleMode) => {
    updateSimulatedRole(newRole);
    toast.success(`Switched simulation perspective to: ${roleLabels[newRole].label}`);
  };

  const handleBranchChange = (newBranchId: string) => {
    const branchName =
      newBranchId === 'all'
        ? 'All Branches (Consolidated)'
        : orgBranches.find((b) => b.id === newBranchId)?.name || 'Main Branch';

    updateSimulatedBranch(newBranchId, branchName);
    toast.success(`Switched simulated store location to: ${branchName}`);
  };

  return (
    <div
      data-testid="simulation-banner"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-600 via-purple-700 to-indigo-700 px-4 py-2 text-white shadow-md text-xs font-sans border-b border-amber-400/40"
    >
      {/* Left: Simulation Alert Badge & Active Persona Info */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-xs px-2.5 py-0.5 font-bold tracking-wider uppercase text-[10px] text-amber-300 border border-amber-400/30">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
          <span>Simulation Active</span>
        </div>

        <div className="flex items-center gap-1.5 text-white/90">
          <RoleIcon className="h-4 w-4 text-amber-200" />
          <span>Acting as:</span>
          <span className="font-bold text-white underline decoration-amber-300 decoration-2 underline-offset-2">
            {currentRole.label}
          </span>
          <ChevronRight className="h-3 w-3 text-white/60" />
          <span className="font-semibold text-amber-100">{currentOrg}</span>
          <span className="text-white/60">•</span>
          <span className="font-medium text-purple-200">
            {selectedBranchId === 'all'
              ? 'All Branches'
              : orgBranches.find((b) => b.id === selectedBranchId)?.name ||
                simulatedBranchName ||
                'Main Branch'}
          </span>
        </div>
      </div>

      {/* Center / Controls: Instant Role & Branch Switcher Dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Quick Role Switcher */}
        <div className="flex items-center gap-1 bg-black/25 px-2 py-1 rounded-md border border-white/10">
          <span className="text-[10px] uppercase font-bold text-white/70">Role:</span>
          <select
            data-testid="sim-quick-role-select"
            value={activeRoleMode}
            onChange={(e) => handleRoleChange(e.target.value as RoleMode)}
            className="bg-transparent text-white font-semibold text-xs focus:outline-hidden cursor-pointer"
          >
            <option value="organizer" className="bg-slate-900 text-white">
              Organizer (Owner)
            </option>
            <option value="admin" className="bg-slate-900 text-white">
              Store Admin
            </option>
            <option value="user" className="bg-slate-900 text-white">
              Store Staff (POS)
            </option>
          </select>
        </div>

        {/* Quick Store Switcher (if available) */}
        {orgBranches.length > 0 && (
          <div className="flex items-center gap-1 bg-black/25 px-2 py-1 rounded-md border border-white/10">
            <span className="text-[10px] uppercase font-bold text-white/70">Store:</span>
            <select
              data-testid="sim-quick-branch-select"
              value={selectedBranchId}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-hidden cursor-pointer max-w-[140px] truncate"
            >
              {(activeRoleMode === 'organizer' || activeRoleMode === 'super_admin') && (
                <option value="all" className="bg-slate-900 text-white">
                  All Branches
                </option>
              )}
              {orgBranches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Exit Simulation Button */}
        <button
          type="button"
          data-testid="btn-exit-simulation"
          onClick={handleExit}
          className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1 text-slate-950 font-bold text-xs shadow-sm hover:bg-amber-300 transition cursor-pointer active:scale-95"
        >
          <LogOut className="h-3.5 w-3.5 text-slate-950" />
          <span>Exit Simulation & Return</span>
        </button>
      </div>
    </div>
  );
}
