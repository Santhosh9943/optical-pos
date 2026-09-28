'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Building2,
  Store,
  Database,
  Sliders,
  User,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getApprovalRequestsAction,
  resolveApprovalRequestAction,
  verifySuperAdminAccessAction,
  type SuperAdminAccessResult,
} from '@/actions/tenant-actions';

interface ApprovalRequest {
  id: string;
  type: 'delete_organization' | 'purge_data' | 'system_config';
  targetId: string;
  targetName: string;
  requesterId: string;
  requesterEmail: string;
  requesterName: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | Date | null;
  createdAt: string | Date;
}

export default function SuperAdminApprovalsPage() {
  const [access, setAccess] = useState<SuperAdminAccessResult | null>(null);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accessRes, requestsRes] = await Promise.all([
        verifySuperAdminAccessAction(),
        getApprovalRequestsAction(filter === 'pending' ? 'pending' : 'all'),
      ]);

      setAccess(accessRes);
      if (requestsRes.success) {
        setRequests(requestsRes.requests);
      } else {
        toast.error(requestsRes.error || 'Failed to load approvals');
      }
    } catch {
      toast.error('Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResolve = async (requestId: string, decision: 'approved' | 'rejected') => {
    if (!access?.canPerformCritical) {
      toast.error('Only Root Super Admin can approve or reject critical requests');
      return;
    }

    setResolvingId(requestId);
    try {
      const res = await resolveApprovalRequestAction(requestId, decision);
      if (res.success) {
        toast.success(
          decision === 'approved'
            ? 'Request approved and executed successfully!'
            : 'Request rejected'
        );
        loadData();
      } else {
        toast.error(res.error || `Failed to ${decision} request`);
      }
    } catch {
      toast.error(`An error occurred while trying to ${decision} request`);
    } finally {
      setResolvingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'delete_organization':
        return <Building2 className="h-4 w-4 text-rose-400" />;
      case 'purge_data':
        return <Database className="h-4 w-4 text-purple-400" />;
      case 'system_config':
        return <Sliders className="h-4 w-4 text-blue-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-slate-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'delete_organization':
        return 'Delete Practice Organization';
      case 'purge_data':
        return 'Purge Diagnostic Data';
      case 'system_config':
        return 'Global System Config';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ClipboardCheck className="h-6 w-6 text-amber-400" />
            <span>Maker-Checker Privileged Approvals</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            High-impact operational requests submitted by Platform Moderators requiring Root Super Admin review
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
        </div>
      </div>

      {/* Role Notice Banner */}
      {!access?.canPerformCritical && access?.role === 'super_moderator' && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 text-blue-200 text-xs flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div>
            <span className="font-semibold text-white">Platform Moderator View: </span>
            You can view submitted requests and monitor their review status. Only the Root Super Admin can approve and execute critical actions.
          </div>
        </div>
      )}

      {access?.role === 'super_viewer' && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-slate-300 text-xs flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-slate-400 flex-shrink-0" />
          <div>
            <span className="font-semibold text-white">Platform Auditor (Viewer): </span>
            Read-only access. You can audit governance logs and past approval history.
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
            filter === 'pending'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span>Pending Review</span>
          {pendingCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-500/30 px-1.5 py-0.2 text-[10px] font-mono text-amber-200">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
            filter === 'all'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-xs'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
          }`}
        >
          <span>All Records</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('approved')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
            filter === 'approved'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>Approved</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('rejected')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
            filter === 'rejected'
              ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 shadow-xs'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
          }`}
        >
          <XCircle className="h-3.5 w-3.5 text-rose-400" />
          <span>Rejected</span>
        </button>
      </div>

      {/* Requests Directory */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
            <span>Loading approval requests...</span>
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <ClipboardCheck className="h-10 w-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-300">No approval requests found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {filter === 'pending'
              ? 'All critical operational actions are current. When platform moderators request high-impact modifications, they will appear here.'
              : 'No requests match the selected status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isResolving = resolvingId === req.id;
            return (
              <div
                key={req.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4 hover:border-slate-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
                      {getTypeIcon(req.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {req.targetName}
                        </span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
                          {getTypeLabel(req.type)}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Target ID: {req.targetId}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {req.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/60 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-800">
                        <Clock className="h-3 w-3 animate-pulse" />
                        <span>Awaiting Root Approval</span>
                      </span>
                    ) : req.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-800">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Approved & Executed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-950/60 px-2.5 py-1 text-xs font-semibold text-rose-400 border border-rose-800">
                        <XCircle className="h-3 w-3" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Justification & Request Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/80 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Moderator Justification / Reason:
                    </div>
                    <p className="text-slate-200 leading-relaxed italic">
                      &quot;{req.reason}&quot;
                    </p>
                  </div>

                  <div className="space-y-1.5 text-slate-400 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-500" />
                        <span>Requester:</span>
                      </span>
                      <span className="font-semibold text-slate-200">
                        {req.requesterName} ({req.requesterEmail})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Submitted At:</span>
                      <span className="font-mono text-slate-300">
                        {new Date(req.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {req.reviewedBy && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span>Reviewed By:</span>
                        <span className="font-mono text-emerald-400">
                          {req.reviewedBy}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons for Root Super Admin */}
                {req.status === 'pending' && (
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                    {access?.canPerformCritical ? (
                      <>
                        <button
                          type="button"
                          disabled={isResolving}
                          onClick={() => handleResolve(req.id, 'rejected')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-900/60 bg-rose-950/30 px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition cursor-pointer disabled:opacity-50"
                        >
                          {isResolving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          <span>Reject Request</span>
                        </button>

                        <button
                          type="button"
                          disabled={isResolving}
                          onClick={() => handleResolve(req.id, 'approved')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/40 transition cursor-pointer disabled:opacity-50"
                        >
                          {isResolving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span>Approve & Execute Operation</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        <span>Awaiting Root Super Admin confirmation</span>
                      </div>
                    )}
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
