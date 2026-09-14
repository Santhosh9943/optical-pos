'use client';

import React, { useState, useEffect } from 'react';
import { useTenantStore, type BranchOption } from '@/store/tenant-store';
import {
  getOrganizationBranchesAction,
  createBranchAction,
  toggleBranchStatusAction,
} from '@/actions/tenant-actions';
import {
  Store,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Building2,
  MapPin,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ManageBranchesPage() {
  const { selectedOrganizationId, organizations } = useTenantStore();
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Add branch modal
  const [showModal, setShowModal] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const activeOrg = organizations.find((o) => o.id === selectedOrganizationId);
  const activeOrgName = activeOrg?.name || 'Optix Vision Care';

  const loadBranches = React.useCallback(async () => {
    if (!selectedOrganizationId) return;
    setLoading(true);
    try {
      const res = await getOrganizationBranchesAction(selectedOrganizationId);
      if (res.success && res.branches) {
        setBranches(res.branches);
      }
    } catch {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, [selectedOrganizationId]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    setCreating(true);
    try {
      const res = await createBranchAction(branchName, selectedOrganizationId);
      if (res.success) {
        toast.success(`Store "${branchName}" added to ${activeOrgName}!`);
        setBranchName('');
        setShowModal(false);
        loadBranches();
      } else {
        toast.error(res.error || 'Failed to create branch');
      }
    } catch {
      toast.error('Failed to create branch');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (branchId: string, currentStatus: boolean) => {
    setTogglingId(branchId);
    try {
      const res = await toggleBranchStatusAction(branchId, !currentStatus);
      if (res.success) {
        toast.success('Store status updated');
        loadBranches();
      } else {
        toast.error(res.error || 'Failed to update status');
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Store className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Manage Physical Branches
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>Practice:</span>
            <strong className="text-foreground">{activeOrgName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadBranches}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            data-testid="btn-add-branch"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Store Branch</span>
          </button>
        </div>
      </div>

      {/* Branches Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-xs">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Loading physical branches...</span>
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-3">
          <Store className="h-8 w-8 mx-auto text-muted-foreground" />
          <div className="font-bold text-sm text-foreground">No Physical Stores Found</div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click &quot;Add Store Branch&quot; to register your first dispensary location.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => {
            const isToggling = togglingId === branch.id;

            return (
              <div
                key={branch.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:shadow-sm transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                        <Store className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{branch.name}</h3>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          ID: {branch.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>

                    {branch.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/60 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                        <XCircle className="h-2.5 w-2.5" />
                        <span>Closed</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span>Physical Optical Dispensary & Workshop</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Store Operations
                  </span>

                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={() => handleToggle(branch.id, branch.isActive)}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                      branch.isActive
                        ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                        : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    }`}
                  >
                    {isToggling && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span>{branch.isActive ? 'Deactivate' : 'Activate'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Branch */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-foreground mb-1">
              Add New Physical Store Branch
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Register a physical dispensary location under {activeOrgName}.
            </p>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                  Store / Branch Name
                </label>
                <input
                  type="text"
                  data-testid="input-branch-name"
                  placeholder="e.g. Koramangala 5th Block Branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-blue-600 focus:outline-hidden"
                />
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
                  data-testid="btn-submit-branch"
                  disabled={creating || !branchName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Add Branch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
