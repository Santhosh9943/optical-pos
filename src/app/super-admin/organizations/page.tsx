'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getSuperAdminPlatformMetrics,
  createOrganizationAction,
  toggleOrganizationStatusAction,
  deleteOrganizationAction,
  createApprovalRequestAction,
  verifySuperAdminAccessAction,
  type SuperAdminPlatformMetrics,
  type SuperAdminAccessResult,
} from '@/actions/tenant-actions';
import {
  Building2,
  Store,
  Plus,
  RefreshCw,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  ClipboardCheck,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminOrganizationsPage() {
  const router = useRouter();
  const [access, setAccess] = useState<SuperAdminAccessResult | null>(null);
  const [metrics, setMetrics] = useState<SuperAdminPlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // New org modal
  const [showModal, setShowModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Deletion & Maker-Checker Approval modals
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [authRes, data] = await Promise.all([
        verifySuperAdminAccessAction(),
        getSuperAdminPlatformMetrics(),
      ]);
      setAccess(authRes);
      setMetrics(data);
    } catch {
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    if (!access?.canMutate) {
      toast.error('Platform Viewers have read-only access');
      return;
    }

    setCreating(true);
    try {
      const res = await createOrganizationAction(newOrgName);
      if (res.success) {
        toast.success(`Organization "${newOrgName}" created with default Main Branch!`);
        setNewOrgName('');
        setShowModal(false);
        fetchMetrics();
      } else {
        toast.error(res.error || 'Failed to create organization');
      }
    } catch {
      toast.error('Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleOrg = async (orgId: string, currentStatus: boolean) => {
    if (!access?.canMutate) {
      toast.error('Platform Viewers have read-only access');
      return;
    }

    setTogglingId(orgId);
    try {
      const res = await toggleOrganizationStatusAction(orgId, !currentStatus);
      if (res.success) {
        toast.success(`Practice status updated`);
        fetchMetrics();
      }
    } catch {
      toast.error('Failed to update organization status');
    } finally {
      setTogglingId(null);
    }
  };

  // Handle clicking Delete button
  const handleDeleteClick = (tenant: { id: string; name: string }) => {
    if (!access?.canMutate) {
      toast.error('Platform Viewers have read-only access');
      return;
    }

    setDeleteTarget(tenant);

    if (access.canPerformCritical) {
      // Root Super Admin direct deletion
      setShowDeleteConfirm(true);
    } else {
      // Platform Moderator approval request
      setApprovalReason('');
      setShowApprovalModal(true);
    }
  };

  // Direct execution by Root Super Admin
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setProcessingAction(true);
    try {
      const res = await deleteOrganizationAction(deleteTarget.id);
      if (res.success) {
        toast.success(`Organization "${deleteTarget.name}" deleted permanently`);
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
        fetchMetrics();
      } else {
        toast.error(res.error || 'Failed to delete organization');
      }
    } catch {
      toast.error('Failed to delete organization');
    } finally {
      setProcessingAction(false);
    }
  };

  // Moderator submitting approval request
  const handleSubmitApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTarget || !approvalReason.trim()) return;

    setProcessingAction(true);
    try {
      const res = await createApprovalRequestAction({
        type: 'delete_organization',
        targetId: deleteTarget.id,
        targetName: deleteTarget.name,
        reason: approvalReason.trim(),
        organizationId: deleteTarget.id,
      });

      if (res.success) {
        toast.success('Approval request submitted to Root Super Admin!');
        setShowApprovalModal(false);
        setDeleteTarget(null);
      } else {
        toast.error(res.error || 'Failed to submit approval request');
      }
    } catch {
      toast.error('Failed to submit approval request');
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-purple-400" />
            <span>SaaS Tenant Organizations</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Registered optical practices, physical dispensary branches & assigned team members
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

          <button
            type="button"
            data-testid="btn-register-org"
            onClick={() => setShowModal(true)}
            disabled={!access?.canMutate}
            title={!access?.canMutate ? 'Read-only viewer cannot register practices' : undefined}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Register Practice</span>
          </button>
        </div>
      </div>

      {/* Role notice for Super Moderator / Viewer */}
      {access?.role === 'super_moderator' && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3 text-xs text-blue-200 flex items-center gap-2.5">
          <ClipboardCheck className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <span>
            <strong className="text-white font-semibold">Platform Moderator:</strong> Deleting a practice triggers Maker-Checker governance and submits an approval request for Root Super Admin review.
          </span>
        </div>
      )}

      {access?.role === 'super_viewer' && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-300 flex items-center gap-2.5">
          <ShieldAlert className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span>
            <strong className="text-white font-semibold">Platform Auditor (Viewer):</strong> You have read-only visibility into organizations and branches. Mutations are disabled.
          </span>
        </div>
      )}

      {/* Organizations Directory Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Practice Name & Practice ID</th>
                <th className="px-5 py-3.5 font-semibold">Onboarded</th>
                <th className="px-5 py-3.5 font-semibold">Physical Stores</th>
                <th className="px-5 py-3.5 font-semibold">Branch Staff Users</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {metrics && metrics.tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="h-8 w-8 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-300">Zero Practice Organizations</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        No optical practices currently exist on the platform. Click &ldquo;Register Practice&rdquo; above to provision the first practice.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                metrics?.tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{tenant.name}</span>
                      <span className="inline-flex items-center gap-1 rounded bg-purple-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-purple-300 border border-purple-800/80">
                        {tenant.orgCode || (tenant.orgNumber ? `OPT-${tenant.orgNumber}` : 'OPT-1')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const code = tenant.orgCode || (tenant.orgNumber ? `OPT-${tenant.orgNumber}` : 'OPT-1');
                          navigator.clipboard.writeText(code);
                          toast.success(`Copied Practice ID: ${code}`);
                        }}
                        title="Copy Practice ID"
                        className="text-slate-400 hover:text-white transition p-1 hover:bg-slate-800 rounded cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">UUID: {tenant.id}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span>{new Date(tenant.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {tenant.branches.map((b) => (
                        <span
                          key={b.id}
                          className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700"
                        >
                          <Store className="h-2.5 w-2.5 text-blue-400" />
                          <span>{b.name}</span>
                          <span className="text-[9px] text-slate-400">({b.userCount || 1} staff)</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-blue-400" />
                      <span className="font-semibold">{tenant.totalUsers}</span>
                      <span className="text-slate-400">team members</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {tenant.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-red-400 border border-red-800">
                        <XCircle className="h-3 w-3" />
                        <span>Suspended</span>
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href="/super-admin/branches"
                        className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
                      >
                        <Store className="h-3 w-3 text-emerald-400" />
                        <span>Stores</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleToggleOrg(tenant.id, tenant.isActive)}
                        disabled={togglingId === tenant.id || !access?.canMutate}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          tenant.isActive
                            ? 'bg-red-950/20 text-red-300 border-red-800/40 hover:bg-red-900/40'
                            : 'bg-emerald-950/20 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/40'
                        }`}
                      >
                        <span>{tenant.isActive ? 'Suspend' : 'Activate'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(tenant)}
                        disabled={!access?.canMutate}
                        title={
                          !access?.canMutate
                            ? 'Read-only viewer cannot delete practices'
                            : access?.canPerformCritical
                            ? 'Permanently delete practice'
                            : 'Submit deletion approval request'
                        }
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold border border-rose-900/40 bg-rose-950/20 text-rose-300 hover:bg-rose-900/40 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register Practice */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-1">
              Register New Optical Practice
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Provisions a new multi-tenant organization with an initial default Main Branch.
            </p>

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Practice / Organization Name
                </label>
                <input
                  type="text"
                  data-testid="input-new-org-name"
                  placeholder="e.g. Lens & Frames Optical Boutique"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-new-org"
                  disabled={creating || !newOrgName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 transition cursor-pointer disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Register Practice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Direct Deletion Confirmation (Root Super Admin) */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-600/40 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-950/80 border border-rose-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Practice Organization</h3>
                <span className="text-[10px] font-mono text-rose-300">Root Super Admin Execution</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white">&quot;{deleteTarget.name}&quot;</strong>? This will cascade delete its physical store branches and tenant metadata. This action is immediate and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                }}
                disabled={processingAction}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={processingAction}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition cursor-pointer disabled:opacity-50"
              >
                {processingAction ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Submit Approval Request (Platform Moderator) */}
      {showApprovalModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-blue-500/40 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-blue-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950/80 border border-blue-500/30">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Privileged Approval Request</h3>
                <span className="text-[10px] font-mono text-blue-300">Maker-Checker Policy Required</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              As a Platform Moderator, deleting{' '}
              <strong className="text-white">&quot;{deleteTarget.name}&quot;</strong> requires approval from the Root Super Admin. Please provide an operational reason for this request.
            </p>

            <form onSubmit={handleSubmitApproval} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Operational Justification / Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Tenant requested contract cancellation, practice shuttered operations..."
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setDeleteTarget(null);
                  }}
                  disabled={processingAction}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction || !approvalReason.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition cursor-pointer disabled:opacity-50"
                >
                  {processingAction ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4" />
                  )}
                  <span>Submit Approval Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
