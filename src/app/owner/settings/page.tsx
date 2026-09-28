'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenantStore } from '@/store/tenant-store';
import { requestOrganizationDeletionAction } from '@/actions/tenant-actions';
import { clearApplicationCacheAction } from '@/actions/settings-actions';
import { getCurrentPlanAction } from '@/actions/plan-actions';
import {
  Settings,
  Building2,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Loader2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

export default function OwnerSettingsPage() {
  const { selectedOrganizationId, organizations, activeOrgCode } = useTenantStore();

  const activeOrg = organizations.find((o) => o.id === selectedOrganizationId);
  const activeOrgName = activeOrg?.name || 'Optix Vision Practice';
  const orgCode = activeOrg?.orgCode || activeOrgCode || 'OPT-1';

  const [planName, setPlanName] = useState('Starter Practice');
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Cache clearing state
  const [clearingCache, setClearingCache] = useState(false);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  useEffect(() => {
    async function loadPlan() {
      try {
        const res = await getCurrentPlanAction();
        if (res?.planName) {
          setPlanName(res.planName);
        }
      } catch (e) {
        console.error('Failed to load plan:', e);
      } finally {
        setLoadingPlan(false);
      }
    }
    loadPlan();
  }, []);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const res = await clearApplicationCacheAction();
      if (res.success) {
        toast.success(res.message || 'All application caches purged successfully.');
        window.location.reload();
      }
    } catch {
      toast.error('Failed to clear application cache');
    } finally {
      setClearingCache(false);
    }
  };

  const handleRequestDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteReason.trim() || !selectedOrganizationId) return;

    setSubmittingDelete(true);
    try {
      const res = await requestOrganizationDeletionAction({
        organizationId: selectedOrganizationId,
        reason: deleteReason.trim(),
      });

      if (res.success) {
        toast.success('Organization deletion request submitted to SaaS Super Admin for final review.');
        setShowDeleteModal(false);
        setDeleteReason('');
      } else {
        toast.error(res.error || 'Failed to submit deletion request');
      }
    } catch (e) {
      console.error('Deletion request error:', e);
      toast.error('Failed to submit deletion request');
    } finally {
      setSubmittingDelete(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Settings className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Practice Settings & Governance
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Practice:</span>
            <strong className="text-foreground">{activeOrgName}</strong>
            <span className="text-muted-foreground">• Practice Profile, SaaS Subscription & Danger Zone</span>
          </p>
        </div>
      </div>

      {/* Practice Identity Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span>Practice Profile & Identity</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl border border-border bg-muted/20">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Practice Name
            </div>
            <div className="text-sm font-bold text-foreground mt-1">{activeOrgName}</div>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Practice ID (SaaS Tenant)
              </div>
              <div className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400 mt-1">
                {orgCode}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(orgCode);
                toast.success(`Copied Practice ID (${orgCode})`);
              }}
              className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition cursor-pointer"
              title="Copy Practice ID"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SaaS Subscription Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>SaaS Plan & Subscription</span>
          </h2>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-bold transition"
          >
            <span>Upgrade Plan</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Active Tier
            </div>
            <div className="text-xl font-extrabold text-foreground mt-0.5">
              {loadingPlan ? 'Loading...' : planName}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Provides multi-branch management, keyboard POS billing, and real-time inventory synchronization.
            </p>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Active Subscription</span>
          </span>
        </div>
      </div>

      {/* System Cache Maintenance Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-blue-600" />
          <span>System Cache Maintenance</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          Purge all server-side Redis and browser memory caches across inventory, patients, and staff.
        </p>

        <button
          type="button"
          onClick={handleClearCache}
          disabled={clearingCache}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${clearingCache ? 'animate-spin' : ''}`} />
          <span>{clearingCache ? 'Purging Caches...' : 'Purge All Application Caches'}</span>
        </button>
      </div>

      {/* Danger Zone: Request Organization Deletion */}
      <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/10 p-6 shadow-2xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-red-900 dark:text-red-200">
              Danger Zone: Organization Deletion
            </h2>
            <p className="text-xs text-red-700 dark:text-red-300/80 mt-1 max-w-xl">
              As the Practice Owner, you hold sovereign authority over all internal stores and staff. The <strong>only</strong> action requiring SaaS Super Admin approval is requesting the permanent deletion of your entire organization from the OptixOS platform.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Request Organization Deletion</span>
          </button>
        </div>
      </div>

      {/* Modal: Request Organization Deletion */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-200 dark:border-red-900 bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Request Organization Deletion
                </h3>
                <p className="text-xs text-muted-foreground">
                  SaaS Super Admin approval required.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Please provide a reason for requesting the deletion of <strong>{activeOrgName}</strong> ({orgCode}). This request will be routed to the Root Super Admin for approval and permanent data de-provisioning.
            </p>

            <form onSubmit={handleRequestDeletion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                  Reason for Deletion
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Practice acquired / Closing operations / Transitioning to new practice..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground placeholder-muted-foreground focus:border-red-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={submittingDelete}
                  className="rounded-xl border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDelete || !deleteReason.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingDelete ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span>Submit to Super Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
