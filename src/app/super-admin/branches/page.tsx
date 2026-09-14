'use client';

import React, { useState, useEffect } from 'react';
import {
  getUserTenancyContext,
  createBranchAction,
  toggleBranchStatusAction,
  type TenancyContext,
} from '@/actions/tenant-actions';
import {
  Store,
  Building2,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminBranchesPage() {
  const [tenancy, setTenancy] = useState<TenancyContext | null>(null);
  const [loading, setLoading] = useState(true);

  // Add store modal
  const [showModal, setShowModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [targetOrgId, setTargetOrgId] = useState('');
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const ctx = await getUserTenancyContext();
      setTenancy(ctx);
      if (ctx.organizations.length > 0 && !targetOrgId) {
        setTargetOrgId(ctx.organizations[0].id);
      }
    } catch {
      toast.error('Failed to load physical store directory');
    } finally {
      setLoading(false);
    }
  }, [targetOrgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim() || !targetOrgId) return;

    setCreating(true);
    try {
      const res = await createBranchAction(newBranchName, targetOrgId);
      if (res.success) {
        toast.success(`Store "${newBranchName}" added successfully!`);
        setNewBranchName('');
        setShowModal(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to create branch');
      }
    } catch {
      toast.error('Failed to create branch');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (branchId: string, currentStatus: boolean) => {
    setTogglingId(branchId);
    try {
      const res = await toggleBranchStatusAction(branchId, !currentStatus);
      if (res.success) {
        toast.success(`Branch status updated!`);
        loadData();
      } else {
        toast.error(res.error || 'Failed to update status');
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const orgMap = new Map(tenancy?.organizations.map((o) => [o.id, o.name]));

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Store className="h-6 w-6 text-emerald-400" />
            <span>Physical Store Locations Directory</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Global network of optical dispensary branches across all tenant practices
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            data-testid="btn-add-store"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Physical Store</span>
          </button>
        </div>
      </div>

      {/* Branches Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Store / Branch Name</th>
                <th className="px-5 py-3.5 font-semibold">Owning Practice</th>
                <th className="px-5 py-3.5 font-semibold">Store Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Status Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {tenancy?.branches.map((branch) => {
                const orgName = orgMap.get(branch.organizationId) || 'Unknown Practice';
                const isToggling = togglingId === branch.id;

                return (
                  <tr key={branch.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-emerald-400" />
                        <div>
                          <div className="font-semibold text-white text-sm">{branch.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">ID: {branch.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Building2 className="h-3.5 w-3.5 text-purple-400" />
                        <span className="font-medium">{orgName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {branch.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Active Dispensing</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-red-400 border border-red-800">
                          <XCircle className="h-3 w-3" />
                          <span>Suspended / Closed</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggleStatus(branch.id, branch.isActive)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                          branch.isActive
                            ? 'bg-red-950/30 text-red-300 hover:bg-red-900/50 border border-red-800/40'
                            : 'bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-800/40'
                        }`}
                      >
                        {isToggling && <Loader2 className="h-3 w-3 animate-spin" />}
                        <span>{branch.isActive ? 'Deactivate Store' : 'Activate Store'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Store Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-1">
              Add New Physical Store
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Create a new physical dispensary location for an existing practice.
            </p>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Target Practice (Organization)
                </label>
                <select
                  value={targetOrgId}
                  onChange={(e) => setTargetOrgId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                >
                  {tenancy?.organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Store / Branch Name
                </label>
                <input
                  type="text"
                  data-testid="input-new-branch-name"
                  placeholder="e.g. Indiranagar 100ft Road Flagship"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden"
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
                  data-testid="btn-submit-new-branch"
                  disabled={creating || !newBranchName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition cursor-pointer disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Add Store</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
