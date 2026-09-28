'use client';

import React, { useState, useEffect } from 'react';
import { useTenantStore } from '@/store/tenant-store';
import { useCachedResource } from '@/hooks/use-cached-resource';
import {
  getStaffMembersAction,
  createStaffMemberAction,
  updateStaffMemberRolesAction,
  deleteStaffMemberAction,
  getUserTenancyContext,
  type StaffMember,
  type OperationalRole,
} from '@/actions/tenant-actions';
import Link from 'next/link';
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
} from 'lucide-react';
import { toast } from 'sonner';

export default function ManageStaffPage() {
  const {
    activeRoleMode,
    selectedOrganizationId,
    selectedBranchId,
    organizations,
    branches,
    activeOrgCode,
  } = useTenantStore();

  const isOrganizer = activeRoleMode === 'organizer' || activeRoleMode === 'super_admin';
  const activeOrg = organizations.find((o) => o.id === selectedOrganizationId);
  const activeOrgName = activeOrg?.name || 'Optix Vision Care';
  const practiceId = activeOrg?.orgCode || activeOrgCode || 'OPT-1';

  const orgBranches = React.useMemo(() => {
    return branches.filter((b) => b.organizationId === selectedOrganizationId);
  }, [branches, selectedOrganizationId]);

  const effectiveBranchId = selectedBranchId || orgBranches[0]?.id || '';

  const {
    data: cachedStaff,
    isLoading: loading,
    isRevalidating,
    refresh: loadStaff,
  } = useCachedResource<StaffMember[]>({
    cacheKey: `staff_list:${selectedOrganizationId}:${effectiveBranchId}`,
    fetcher: async () => {
      if (!selectedOrganizationId) return [];
      const res = await getStaffMembersAction(selectedOrganizationId, effectiveBranchId);
      if (res.success) {
        return res.staff;
      }
      throw new Error(res.error || 'Failed to load staff');
    },
    refreshInterval: 60000,
  });

  const staffList = React.useMemo(() => cachedStaff || [], [cachedStaff]);

  // Invite modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('OptixPass@123');
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<OperationalRole[]>(['staff']);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [primaryBranchId, setPrimaryBranchId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Edit Roles modal
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [editRoles, setEditRoles] = useState<OperationalRole[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    getUserTenancyContext().then((ctx) => {
      if (ctx.user?.id) {
        setCurrentUserId(ctx.user.id);
      }
    });
  }, []);

  const activeBranchLabel = React.useMemo(() => {
    const match = branches.find((b) => b.id === effectiveBranchId);
    return match ? match.name : 'Selected Store';
  }, [effectiveBranchId, branches]);

  const openAddModal = () => {
    setName('');
    setEmail('');
    setPassword('OptixPass@123');
    setMustChangePassword(true);
    setSelectedRoles(['staff']);
    const defaultBranch = effectiveBranchId || orgBranches[0]?.id || '';
    setSelectedBranchIds(defaultBranch ? [defaultBranch] : []);
    setPrimaryBranchId(defaultBranch);
    setShowModal(true);
  };

  const toggleAddRole = (role: OperationalRole) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        if (prev.length === 1) {
          toast.warning('Staff member must have at least one role assigned');
          return prev;
        }
        return prev.filter((r) => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranchIds((prev) => {
      if (prev.includes(branchId)) {
        if (prev.length === 1) {
          toast.warning('Staff member must be assigned to at least one store');
          return prev;
        }
        const updated = prev.filter((id) => id !== branchId);
        if (primaryBranchId === branchId) {
          setPrimaryBranchId(updated[0]);
        }
        return updated;
      } else {
        return [...prev, branchId];
      }
    });
  };

  const toggleEditRole = (role: OperationalRole) => {
    setEditRoles((prev) => {
      if (prev.includes(role)) {
        if (prev.length === 1) {
          toast.warning('Staff member must have at least one role assigned');
          return prev;
        }
        return prev.filter((r) => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (selectedRoles.length === 0) {
      toast.error('Please select at least one role');
      return;
    }
    if (selectedBranchIds.length === 0) {
      toast.error('Please assign the staff member to at least one store');
      return;
    }

    setCreating(true);
    try {
      const res = await createStaffMemberAction({
        name,
        email,
        password,
        mustChangePassword,
        roles: selectedRoles,
        role: selectedRoles[0],
        organizationId: selectedOrganizationId,
        branchIds: selectedBranchIds,
        primaryBranchId: primaryBranchId || selectedBranchIds[0],
      });

      if (res.success) {
        toast.success(`Staff member "${name}" registered successfully! Initial password: ${password}`);
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

  const openEditModal = (member: StaffMember) => {
    setEditingMember(member);
    setEditRoles(member.roles && member.roles.length > 0 ? [...member.roles] : ['staff']);
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
        toast.success(`Updated roles for ${editingMember.name}`);
        setEditingMember(null);
        await loadStaff();
      } else {
        toast.error(res.error || 'Failed to update roles');
      }
    } catch {
      toast.error('Failed to update staff roles');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteStaff = async (member: StaffMember) => {
    const actionDesc = isOrganizer ? 'permanently remove' : 'request removal of';
    if (!confirm(`Are you sure you want to ${actionDesc} ${member.name} from ${activeOrgName}?`)) {
      return;
    }

    try {
      const res = await deleteStaffMemberAction({
        userId: member.id,
        organizationId: selectedOrganizationId,
      });

      if (res.success) {
        if (res.requiresApproval) {
          toast.info(res.message || 'Staff removal request submitted to Practice Owner for approval.');
        } else {
          toast.success(res.message || `Removed ${member.name}`);
        }
        await loadStaff();
      } else {
        toast.error(res.error || 'Failed to remove staff member');
      }
    } catch {
      toast.error('Failed to remove staff member');
    }
  };

  const roleDefinitions: {
    id: OperationalRole;
    title: string;
    badge: string;
    description: string;
    badgeClass: string;
    cardBorder: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'admin',
      title: 'Store Admin (Manager)',
      badge: 'Store Admin',
      description: 'Inventory management, store oversight, price & discount overrides',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      cardBorder: 'border-emerald-500/50 bg-emerald-500/5',
      icon: Shield,
    },
    {
      id: 'optometrist',
      title: 'Optometrist (Clinical)',
      badge: 'Optometrist',
      description: 'Refraction eye examinations, visual acuity, optical prescription prescribing',
      badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      cardBorder: 'border-purple-500/50 bg-purple-500/5',
      icon: Eye,
    },
    {
      id: 'staff',
      title: 'Store Staff (Cashier)',
      badge: 'Store Staff',
      description: 'Counter POS checkout, billing, order delivery, patient registration',
      badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      cardBorder: 'border-blue-500/50 bg-blue-500/5',
      icon: Users,
    },
  ];

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
              Store Staff & Team Members
            </h1>
            <span
              data-testid="staff-scope-badge"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
            >
              <Store className="h-3 w-3" />
              <span>{activeBranchLabel}</span>
              {loading && <span className="animate-pulse">...</span>}
            </span>
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

          {isOrganizer ? (
            <button
              type="button"
              data-testid="btn-add-staff"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Staff Member</span>
            </button>
          ) : (
            <Link
              href="/owner/staff"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Owner Portal Staff HQ</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Practice Staff Portal Login Credentials Banner ── */}
      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Key className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-foreground">
                Staff Portal Login Credentials
              </h2>
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 dark:bg-purple-950/70 px-2.5 py-0.5 text-xs font-mono font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Practice ID: {practiceId}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Store staff access POS counter operations via the dedicated Staff Portal using your Practice ID (<span className="font-mono font-semibold text-foreground">{practiceId}</span>), their registered email, and password.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(practiceId);
              toast.success(`Copied Practice ID (${practiceId}) to clipboard!`);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>Copy Practice ID</span>
          </button>
          <a
            href="/auth/staff-login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Staff Portal</span>
          </a>
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {loading && staffList.length === 0 ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="space-y-1">
                    <div className="h-3.5 w-28 bg-muted rounded" />
                    <div className="h-2.5 w-36 bg-muted/60 rounded" />
                  </div>
                </div>
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-5 w-20 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-7 w-20 bg-muted rounded-lg" />
              </div>
            ))}
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
                  <th className="px-5 py-3.5 font-semibold">Assigned Operational Roles</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staffList.map((member) => {
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
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-foreground font-medium text-xs">
                            <Store className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>{member.branchName || 'Main Branch'}</span>
                            {member.stores && member.stores.length > 1 && (
                              <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                                +{member.stores.length - 1} more
                              </span>
                            )}
                          </div>
                          {member.stores && member.stores.length > 1 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {member.stores.map((st) => (
                                <span
                                  key={st.branchId}
                                  className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded"
                                >
                                  {st.branchName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {member.roles && member.roles.length > 0 ? (
                            member.roles.map((r) => {
                              const def = roleDefinitions.find((d) => d.id === r);
                              return (
                                <span
                                  key={r}
                                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                                    def?.badgeClass || 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {def?.icon && <def.icon className="h-3 w-3" />}
                                  <span>{def?.badge || r}</span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground">
                              Staff POS
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span>Active Access</span>
                          </span>
                          {member.mustChangePassword && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Key className="h-2.5 w-2.5" />
                              <span>1st Login Pending</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isOrganizer && member.id !== currentUserId && (
                            <button
                              type="button"
                              onClick={() => openEditModal(member)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                            >
                              <Edit2 className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                              <span>Edit Roles</span>
                            </button>
                          )}
                          {member.id !== currentUserId && (isOrganizer || activeRoleMode === 'admin') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(member)}
                              className="rounded-lg p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                              title={isOrganizer ? "Remove staff member" : "Request staff removal"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {member.id === currentUserId && (
                            <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded bg-muted">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal with Multi-Role Assignment */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-foreground mb-1">
              Add Store Staff Member
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Add a team member to {activeOrgName} and assign single or multiple operational roles.
            </p>

            {/* Practice ID reminder callout */}
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 mb-4 flex items-center justify-between gap-2">
              <div className="text-xs">
                <span className="text-muted-foreground block text-[11px]">Practice ID for this staff member to log in:</span>
                <span className="font-mono font-bold text-foreground text-sm">{practiceId}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(practiceId);
                  toast.success(`Copied Practice ID (${practiceId}) to clipboard!`);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                <Copy className="h-3 w-3" />
                <span>Copy ID</span>
              </button>
            </div>

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

              {/* Multi-Role Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                  Assign Operational Roles <span className="text-purple-600 font-normal lowercase">(select one or multiple)</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {roleDefinitions.map((roleDef) => {
                    const isSelected = selectedRoles.includes(roleDef.id);
                    const Icon = roleDef.icon;
                    return (
                      <div
                        key={roleDef.id}
                        onClick={() => toggleAddRole(roleDef.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? `${roleDef.cardBorder} ring-1 ring-purple-500`
                            : 'border-border bg-background hover:bg-muted/40'
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                            isSelected
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-muted-foreground/40 bg-card'
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                            <span className="font-semibold text-xs text-foreground">
                              {roleDef.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                            {roleDef.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Temporary Password & Governance */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5 flex items-center justify-between">
                  <span>Initial Password</span>
                  <span className="text-[10px] text-muted-foreground font-normal lowercase">for Staff Portal login</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="e.g. OptixPass@123"
                    className="w-full rounded-xl border border-input bg-background pl-9 pr-3.5 py-2.5 text-xs text-foreground font-mono focus:border-purple-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* First-login password change checkbox */}
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 p-3">
                <input
                  type="checkbox"
                  id="mustChangePassword"
                  checked={mustChangePassword}
                  onChange={(e) => setMustChangePassword(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="mustChangePassword" className="text-xs text-foreground cursor-pointer">
                  <span className="font-semibold block">Require password reset on first login</span>
                  <span className="text-[11px] text-muted-foreground">Staff will be prompted to set their own secure password immediately upon first sign-in.</span>
                </label>
              </div>

              {/* Multi-Store Assignment Checkboxes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5 flex items-center justify-between">
                  <span>Assigned Store Locations</span>
                  <span className="text-purple-600 font-normal lowercase">(select one or multiple)</span>
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {orgBranches.map((b) => {
                    const isChecked = selectedBranchIds.includes(b.id);
                    return (
                      <div
                        key={b.id}
                        onClick={() => toggleBranchSelection(b.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer text-xs ${
                          isChecked
                            ? 'border-purple-500/50 bg-purple-500/5'
                            : 'border-border bg-background hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                              isChecked
                                ? 'bg-purple-600 border-purple-600 text-white'
                                : 'border-muted-foreground/40 bg-card'
                            }`}
                          >
                            {isChecked && <Check className="h-3 w-3" />}
                          </div>
                          <span className="font-medium text-foreground">{b.name}</span>
                        </div>
                        {selectedBranchIds.length > 1 && isChecked && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrimaryBranchId(b.id);
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition ${
                              primaryBranchId === b.id
                                ? 'bg-purple-600 text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {primaryBranchId === b.id ? 'Primary Store' : 'Make Primary'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                  disabled={creating || !name.trim() || !email.trim() || selectedRoles.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 transition cursor-pointer disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Add Staff Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Roles Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-foreground mb-1">
              Edit Operational Roles
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Configure multiple roles for <strong>{editingMember.name}</strong> ({editingMember.email}).
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {roleDefinitions.map((roleDef) => {
                  const isSelected = editRoles.includes(roleDef.id);
                  const Icon = roleDef.icon;
                  return (
                    <div
                      key={roleDef.id}
                      onClick={() => toggleEditRole(roleDef.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? `${roleDef.cardBorder} ring-1 ring-purple-500`
                          : 'border-border bg-background hover:bg-muted/40'
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                          isSelected
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-muted-foreground/40 bg-card'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                          <span className="font-semibold text-xs text-foreground">
                            {roleDef.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {roleDef.description}
                        </p>
                      </div>
                    </div>
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
                  disabled={savingEdit || editRoles.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 transition cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>Save Role Assignments</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
