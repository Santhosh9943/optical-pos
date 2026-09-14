'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSuperAdminPlatformMetrics,
  createOrganizationAction,
  type SuperAdminPlatformMetrics,
} from '@/actions/tenant-actions';
import { useTenantStore } from '@/store/tenant-store';
import {
  Building2,
  Store,
  Plus,
  RefreshCw,
  Eye,
  Calendar,
  Layers,
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminOrganizationsPage() {
  const router = useRouter();
  const { startSimulation } = useTenantStore();
  const [metrics, setMetrics] = useState<SuperAdminPlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // New org modal
  const [showModal, setShowModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await getSuperAdminPlatformMetrics();
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

  const handleActAsOwner = (orgId: string, orgName: string) => {
    startSimulation({
      role: 'organizer',
      orgId,
      orgName,
      branchId: 'all',
      branchName: 'All Branches (Consolidated)',
    });
    toast.success(`Simulation started: Acting as Owner of ${orgName}`);
    router.push('/admin/branches');
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
            Registered optical practices, subscription tiers, and physical store networks
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Register Practice</span>
          </button>
        </div>
      </div>

      {/* Organizations Directory Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Practice Name</th>
                <th className="px-5 py-3.5 font-semibold">Onboarded</th>
                <th className="px-5 py-3.5 font-semibold">Physical Stores</th>
                <th className="px-5 py-3.5 font-semibold">Invoices</th>
                <th className="px-5 py-3.5 font-semibold">Billed GMV</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {metrics?.tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white text-sm">{tenant.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">ID: {tenant.id}</div>
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
                          {b.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-200">
                    <span className="font-semibold">{tenant.totalInvoices}</span> bills
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-emerald-400 text-sm">
                    ₹{Number(tenant.totalRevenue).toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      data-testid={`btn-act-as-${tenant.id}`}
                      onClick={() => handleActAsOwner(tenant.id, tenant.name)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600/20 px-3 py-1.5 text-xs font-semibold text-purple-300 border border-purple-500/30 hover:bg-purple-600/40 transition cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-amber-300" />
                      <span>Act as Owner</span>
                    </button>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
