'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTenantStore } from '@/store/tenant-store';
import { useCachedResource } from '@/hooks/use-cached-resource';
import {
  getStaffMembersAction,
  createStaffMemberAction,
  updateStaffMemberRolesAction,
  deleteStaffMemberAction,
  type StaffMember,
  type OperationalRole,
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
  Layers,
  Eye,
  Check,
  Edit2,
  Trash2,
  Lock,
  Key,
  Copy,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

export default function OwnerManageStaffPage() {
  const {
    selectedOrganizationId,
    organizations,
    branches,
    activeOrgCode,
  } = useTenantStore();

  const activeOrg = organizations.find((o) => o.id === selectedOrganizationId);
  const activeOrgName = activeOrg?.name || 'Optix Vision Care';
  const practiceId = activeOrg?.orgCode || activeOrgCode || 'OPT-1';

  const orgBranches = useMemo(() => {
    return branches.filter((b) => b.organizationId === selectedOrganizationId);
  }, [branches, selectedOrganizationId]);

  // Branch filter: 'all' or specific branchId
  const [selectedFilterBranch, setSelectedFilterBranch] = useState<string>('all');

  const {
    data: cachedStaff,
    isLoading: loading,
    isRevalidating,
    refresh: loadStaff,
  } = useCachedResource<StaffMember[]>({
    cacheKey: `owner_staff_list:${selectedOrganizationId}:${selectedFilterBranch}`,
    fetcher: async () => {
      if (!selectedOrganizationId) return [];
      const res = await getStaffMembersAction(
        selectedOrganizationId,
        selectedFilterBranch === 'all' ? undefined : selectedFilterBranch
      );
      if (res.success) {
        return res.staff;
      }
      throw new Error(res.error || 'Failed to load staff');
    },
    refreshInterval: 60000,
  });

  const staffList = useMemo(() => cachedStaff || [], [cachedStaff]);

  // Add staff modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('OptixPass@123');
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<OperationalRole[]>(['staff']);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [primaryBranchId, setPrimaryBranchId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Edit Roles modal state
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [editRoles, setEditRoles] = useState<OperationalRole[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete modal state
  const [deletingMember, setDeletingMember] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openAddModal = () => {
    setName('');
    setEmail('');
    setPassword('OptixPass@123');
    setMustChangePassword(true);
    setSelectedRoles(['staff']);
    const defaultBranchId = orgBranches[0]?.id || '';
    setSelectedBranchIds(defaultBranchId ? [defaultBranchId] : []);
    setPrimaryBranchId(defaultBranchId);
    setShowModal(true);
  };

  const handleRoleToggle = (role: OperationalRole) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((r) => r !== role);
      }
      return [...prev, role];
    });
  };

  const handleBranchToggle = (branchId: string) => {
    setSelectedBranchIds((prev) => {
      const exists = prev.includes(branchId);
      let updated: string[];
      if (exists) {
        if (prev.length === 1) return prev; // Keep at least one
        updated = prev.filter((id) => id !== branchId);
      } else {
        updated = [...prev, branchId];
      }
      if (!updated.includes(primaryBranchId)) {
        setPrimaryBranchId(updated[0] || '');
      }
      return updated;
    });
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    if (selectedBranchIds.length === 0) {
      toast.error('Please assign at least one store branch');
      return;
    }

    setCreating(true);
    try {
      const res = await createStaffMemberAction({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        organizationId: selectedOrganizationId,
        roles: selectedRoles,
        branchIds: selectedBranchIds,
        primaryBranchId: primaryBranchId || selectedBranchIds[0],
        mustChangePassword: mustChangePassword,
      });

      if (res.success) {
        toast.success(`Staff member "${name}" registered successfully!`);
        setShowModal(false);
        loadStaff();
      } else {
        toast.error(res.error || 'Failed to create staff member');
      }
    } catch {
      toast.error('Failed to create staff member');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEditRoles = async () => {
    if (!editingMember || editRoles.length === 0) return;

    setSavingEdit(true);
    try {
      const res = await updateStaffMemberRolesAction({
        userId: editingMember.id,
        organizationId: selectedOrganizationId,
        roles: editRoles,
      });

      if (res.success) {
        toast.success(`Roles updated for ${editingMember.name}`);
        setEditingMember(null);
        loadStaff();
      } else {
        toast.error(res.error || 'Failed to update roles');
      }
    } catch {
      toast.error('Failed to update staff roles');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deletingMember) return;

    setIsDeleting(true);
    try {
      const res = await deleteStaffMemberAction({
        userId: deletingMember.id,
        organizationId: selectedOrganizationId,
      });

      if (res.success) {
        toast.success(res.message || `Staff member "${deletingMember.name}" removed successfully.`);
        setDeletingMember(null);
        loadStaff();
      } else {
        toast.error(res.error || 'Failed to remove staff member');
      }
    } catch {
      toast.error('Failed to remove staff member');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Staff & Store Access Control
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Practice:</span>
            <strong className="text-foreground">{activeOrgName}</strong>
            <span className="text-muted-foreground">• Practice Owner is excluded from employee table</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Store Branch Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
            <Store className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              aria-label="Filter staff by store location"
              value={selectedFilterBranch}
              onChange={(e) => setSelectedFilterBranch(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground outline-hidden cursor-pointer"
            >
              <option value="all" className="dark:bg-slate-900">
                All Store Locations ({orgBranches.length})
              </option>
              {orgBranches.map((b) => (
                <option key={b.id} value={b.id} className="dark:bg-slate-900">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadStaff()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading || isRevalidating ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* Staff Table */}
      {loading && staffList.length === 0 ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-xs">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Loading staff directory...</span>
        </div>
      ) : staffList.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-3">
          <Users className="h-8 w-8 mx-auto text-muted-foreground" />
          <div className="font-bold text-sm text-foreground">No Store Employees Found</div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Your staff employees (optometrists, cashiers, store managers) will appear here. The organization owner has sovereign access and is not listed in this employee directory.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add First Staff Member</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Assigned Stores</th>
                  <th className="px-4 py-3">Store Roles</th>
                  <th className="px-4 py-3">Security & Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {staffList.map((member) => {
                  const roles = member.roles || [member.role as OperationalRole];

                  return (
                    <tr key={member.id} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/70 font-bold text-blue-700 dark:text-blue-300">
                            {member.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-xs">{member.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{member.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {member.stores && member.stores.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {member.stores.map((st) => (
                              <span
                                key={st.branchId}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                                  st.isPrimary
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                    : 'bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                <Store className="h-2.5 w-2.5" />
                                <span>{st.branchName}</span>
                                {st.isPrimary && <span className="text-[9px] font-bold text-blue-500">★</span>}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">
                            {member.branchName || 'Main Branch'}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {roles.map((r) => {
                            let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                            let label = 'Staff';
                            if (r === 'admin') {
                              badgeStyle = 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
                              label = 'Store Manager';
                            } else if (r === 'optometrist') {
                              badgeStyle = 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
                              label = 'Optometrist';
                            } else {
                              badgeStyle = 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
                              label = 'Sales Staff';
                            }
                            return (
                              <span key={r} className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border ${badgeStyle}`}>
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {member.mustChangePassword ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Key className="h-2.5 w-2.5" />
                            <span>Initial Password</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span>Verified</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMember(member);
                              setEditRoles(member.roles || [member.role as OperationalRole]);
                            }}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit Roles</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingMember(member)}
                            className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                            title="Remove staff member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Team Member */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <h3 className="text-base font-bold text-foreground mb-1">
              Add Store Team Member
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Add staff employees and configure their store assignments and permissions under {activeOrgName}.
            </p>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                  Staff Email (Login ID)
                </label>
                <input
                  type="email"
                  placeholder="rahul@store.optixos.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                    Temporary Password
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={mustChangePassword}
                      onChange={(e) => setMustChangePassword(e.target.checked)}
                      className="rounded border-input text-blue-600 focus:ring-blue-500"
                    />
                    <span>Force password change on 1st login</span>
                  </label>
                </div>
              </div>

              {/* Roles Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                  Operational Roles
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'admin' as OperationalRole, label: 'Store Manager', desc: 'Discounts, audits & staff' },
                    { id: 'optometrist' as OperationalRole, label: 'Optometrist', desc: 'Rx examinations' },
                    { id: 'staff' as OperationalRole, label: 'Sales Clerk', desc: 'POS billing & counter' },
                  ].map((role) => {
                    const active = selectedRoles.includes(role.id);
                    return (
                      <button
                        type="button"
                        key={role.id}
                        onClick={() => handleRoleToggle(role.id)}
                        className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                          active
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-2xs'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{role.label}</span>
                          {active && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{role.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Store Locations Assignment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                  Assigned Store Locations
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto border border-border rounded-xl p-2 bg-muted/20">
                  {orgBranches.map((branch) => {
                    const isChecked = selectedBranchIds.includes(branch.id);
                    const isPrimary = primaryBranchId === branch.id;

                    return (
                      <div
                        key={branch.id}
                        className={`flex items-center justify-between p-2 rounded-lg transition ${
                          isChecked ? 'bg-card border border-border' : 'opacity-60'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleBranchToggle(branch.id)}
                            className="rounded border-input text-blue-600 focus:ring-blue-500"
                          />
                          <span>{branch.name}</span>
                        </label>

                        {isChecked && (
                          <button
                            type="button"
                            onClick={() => setPrimaryBranchId(branch.id)}
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold transition ${
                              isPrimary
                                ? 'bg-blue-600 text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {isPrimary ? 'Primary Store ★' : 'Set as Primary'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
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
                  disabled={creating || !name.trim() || !email.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Register Employee</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Roles */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Edit Roles: {editingMember.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                Modify store operational roles for {editingMember.email}.
              </p>
            </div>

            <div className="space-y-2">
              {[
                { id: 'admin' as OperationalRole, label: 'Store Manager / Admin' },
                { id: 'optometrist' as OperationalRole, label: 'Optometrist' },
                { id: 'staff' as OperationalRole, label: 'Sales Staff / Cashier' },
              ].map((r) => {
                const checked = editRoles.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                      checked
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-foreground font-semibold'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setEditRoles((prev) => {
                            if (prev.includes(r.id)) {
                              if (prev.length === 1) return prev;
                              return prev.filter((x) => x !== r.id);
                            }
                            return [...prev, r.id];
                          });
                        }}
                        className="rounded border-input text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs">{r.label}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                disabled={savingEdit}
                className="rounded-xl border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditRoles}
                disabled={savingEdit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-200 dark:border-red-900 bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Remove Staff Member
                </h3>
                <p className="text-xs text-muted-foreground">
                  Confirm removal of store employee.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
              Are you sure you want to remove <strong>{deletingMember.name}</strong> ({deletingMember.email})? As the practice owner, this direct action removes all store access immediately.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                disabled={isDeleting}
                className="rounded-xl border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>Remove Staff</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
