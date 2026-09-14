'use client';

import React, { useState, useEffect } from 'react';
import { useTenantStore } from '@/store/tenant-store';
import {
  getStaffMembersAction,
  createStaffMemberAction,
  type StaffMember,
} from '@/actions/tenant-actions';
import {
  Users,
  Plus,
  RefreshCw,
  Store,
  Building2,
  Mail,
  Shield,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ManageStaffPage() {
  const {
    activeRoleMode,
    selectedOrganizationId,
    selectedBranchId,
    organizations,
    branches,
  } = useTenantStore();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'staff' | 'optometrist'>('staff');
  const [targetBranchId, setTargetBranchId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const isOrganizer = activeRoleMode === 'organizer' || activeRoleMode === 'super_admin';
  const activeOrg = organizations.find((o) => o.id === selectedOrganizationId);
  const activeOrgName = activeOrg?.name || 'Optix Vision Care';

  const orgBranches = React.useMemo(() => {
    return branches.filter((b) => b.organizationId === selectedOrganizationId);
  }, [branches, selectedOrganizationId]);

  const loadStaff = React.useCallback(async () => {
    if (!selectedOrganizationId) return;
    setLoading(true);
    try {
      // If store admin, filter by assigned store; if organizer and specific store chosen, filter too
      const filterBranch = !isOrganizer
        ? selectedBranchId === 'all'
          ? orgBranches[0]?.id
          : selectedBranchId
        : selectedBranchId;

      const res = await getStaffMembersAction(selectedOrganizationId, filterBranch);
      if (res.success) {
        setStaffList(res.staff);
      }
    } catch {
      toast.error('Failed to load staff directory');
    } finally {
      setLoading(false);
    }
  }, [selectedOrganizationId, selectedBranchId, isOrganizer, orgBranches]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const openAddModal = () => {
    setName('');
    setEmail('');
    setRole('staff');
    if (orgBranches.length > 0) {
      setTargetBranchId(orgBranches[0].id);
    }
    setShowModal(true);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const assignedBranch = targetBranchId || orgBranches[0]?.id || (selectedBranchId !== 'all' ? selectedBranchId : '');

    setCreating(true);
    try {
      const res = await createStaffMemberAction({
        name,
        email,
        role,
        organizationId: selectedOrganizationId,
        branchId: assignedBranch,
      });

      if (res.success) {
        toast.success(`Staff member "${name}" registered successfully!`);
        setName('');
        setEmail('');
        setShowModal(false);
        await loadStaff();
      } else {
        toast.error(res.error || 'Failed to add staff member');
      }
    } catch {
      toast.error('Failed to add staff member');
    } finally {
      setCreating(false);
    }
  };

  const roleBadges: Record<string, { label: string; class: string }> = {
    admin: {
      label: 'Store Admin',
      class: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    optometrist: {
      label: 'Optometrist / Refractionist',
      class: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    },
    staff: {
      label: 'Store Staff (POS)',
      class: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Store Staff & Team Members
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Practice:</span>
            <strong className="text-foreground">{activeOrgName}</strong>
            {!isOrganizer && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                (Store Admin Scope)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadStaff}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            data-testid="btn-add-staff"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground text-xs">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Loading staff team...</span>
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Users className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="font-bold text-sm text-foreground">No Staff Members Found</div>
            <p className="text-xs text-muted-foreground">
              Click &quot;Add Staff Member&quot; to assign staff to this dispensary.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Staff Member</th>
                  <th className="px-5 py-3.5 font-semibold">Assigned Branch</th>
                  <th className="px-5 py-3.5 font-semibold">Permission Role</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staffList.map((member) => {
                  const badge = roleBadges[member.role] || roleBadges.staff;

                  return (
                    <tr key={member.id} className="hover:bg-muted/30 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 font-bold text-xs">
                            {member.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm">
                              {member.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{member.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <Store className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span>{member.branchName || 'Main Branch'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.class}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>Active Access</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-foreground mb-1">
              Add Store Staff Member
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Add a team member to {activeOrgName}.
            </p>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  data-testid="input-staff-name"
                  placeholder="e.g. Ramesh Chandra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-purple-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  data-testid="input-staff-email"
                  placeholder="e.g. ramesh.optix@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-purple-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                  Operational Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'staff' | 'optometrist')}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-purple-600 focus:outline-hidden"
                >
                  <option value="staff">Store Staff / POS Cashier (Counter Sales)</option>
                  <option value="optometrist">Optometrist (Clinical Refraction)</option>
                  {isOrganizer && (
                    <option value="admin">Store Admin (Branch Manager)</option>
                  )}
                </select>
              </div>

              {/* Branch Selector (Visible to Organizer; locked for Store Admin) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                  Assigned Store Location
                </label>
                {isOrganizer ? (
                  <select
                    value={targetBranchId}
                    onChange={(e) => setTargetBranchId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-purple-600 focus:outline-hidden"
                  >
                    {orgBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        🏬 {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-xl border border-input bg-muted/40 px-3.5 py-2.5 text-xs font-semibold text-foreground flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-blue-600" />
                    <span>
                      {orgBranches.find((b) => b.id === selectedBranchId)?.name || 'Current Store'}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">(Assigned Branch)</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                  className="rounded-xl border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-staff"
                  disabled={creating || !name.trim() || !email.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 transition cursor-pointer disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Add Staff</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
