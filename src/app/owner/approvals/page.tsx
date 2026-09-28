'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTenantStore } from '@/store/tenant-store';
import {
  getStoreApprovalRequestsAction,
  resolveStoreApprovalRequestAction,
} from '@/actions/approval-actions';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Building2,
  Store,
  User,
  Package,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

export default function OwnerApprovalsPage() {
  const { selectedOrganizationId, organizations, activeOrgCode } = useTenantStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const activeOrg = organizations.find((o) => o.id === selectedOrganizationId);
  const activeOrgName = activeOrg?.name || 'Optix Vision Practice';

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStoreApprovalRequestsAction(filter);
      if (res.success && res.requests) {
        setRequests(res.requests);
      } else {
        toast.error(res.error || 'Failed to load approvals');
      }
    } catch {
      toast.error('Failed to load store approval requests');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleResolve = async (requestId: string, decision: 'approved' | 'rejected') => {
    setResolvingId(requestId);
    try {
      const res = await resolveStoreApprovalRequestAction(
        requestId,
        decision,
        `Resolved by Practice Owner (${decision})`
      );

      if (res.success) {
        toast.success(`Request ${decision === 'approved' ? 'Approved & Executed' : 'Rejected'}`);
        loadRequests();
      } else {
        toast.error(res.error || `Failed to ${decision} request`);
      }
    } catch {
      toast.error('Error resolving request');
    } finally {
      setResolvingId(null);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'delete_customer':
      case 'disable_customer':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <User className="h-3 w-3" />
            <span>Patient Removal</span>
          </span>
        );
      case 'delete_inventory':
      case 'disable_inventory':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Package className="h-3 w-3" />
            <span>Inventory Deletion</span>
          </span>
        );
      case 'delete_staff':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <User className="h-3 w-3" />
            <span>Staff Removal</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border">
            <span>{type}</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Internal Practice Approvals
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Practice:</span>
            <strong className="text-foreground">{activeOrgName}</strong>
            <span className="text-muted-foreground">• Maker-checker governance for store staff actions</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-md transition ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All History
            </button>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-xs">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Loading approval queue...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-3">
          <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
          <div className="font-bold text-sm text-foreground">No Pending Approval Requests</div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            All internal store actions submitted by cashiers and store managers have been reviewed and resolved.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const isResolving = resolvingId === req.id;

            return (
              <div
                key={req.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getTypeBadge(req.type)}

                    <span className="font-bold text-sm text-foreground">
                      {req.targetName}
                    </span>

                    {req.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="h-2.5 w-2.5" />
                        <span>Pending Review</span>
                      </span>
                    ) : req.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        <span>Approved</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/60 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                        <XCircle className="h-2.5 w-2.5" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground font-medium">
                    <strong>Reason:</strong> {req.reason}
                  </p>

                  <div className="text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span>
                      Requested by: <strong>{req.requesterName}</strong> ({req.requesterEmail})
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(req.createdAt).toLocaleDateString()} at{' '}
                      {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {req.reviewedBy && (
                      <>
                        <span>•</span>
                        <span>Reviewed by: {req.reviewedBy}</span>
                      </>
                    )}
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                    <button
                      type="button"
                      disabled={isResolving}
                      onClick={() => handleResolve(req.id, 'rejected')}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      disabled={isResolving}
                      onClick={() => handleResolve(req.id, 'approved')}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
                    >
                      {isResolving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>Approve & Execute</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
