'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Server,
  Zap,
  Mail,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserPlus,
  RefreshCw,
  Loader2,
  Trash2,
  Shield,
  Eye,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  verifySuperAdminAccessAction,
  getPlatformTeamAction,
  assignPlatformRoleAction,
  type SuperAdminAccessResult,
} from '@/actions/tenant-actions';

interface PlatformMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export default function SuperAdminSettingsPage() {
  const [access, setAccess] = useState<SuperAdminAccessResult | null>(null);
  const [team, setTeam] = useState<PlatformMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignRole, setAssignRole] = useState<'super_moderator' | 'super_viewer' | 'super_admin'>('super_moderator');
  const [assigning, setAssigning] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setTeamLoading(true);
    try {
      const [authRes, teamRes] = await Promise.all([
        verifySuperAdminAccessAction(),
        getPlatformTeamAction(),
      ]);
      setAccess(authRes);
      if (teamRes.success) {
        setTeam(teamRes.team);
      }
    } catch {
      toast.error('Failed to load platform settings');
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignEmail.trim()) return;

    if (!access?.canPerformCritical) {
      toast.error('Only Root Super Admin can assign platform roles');
      return;
    }

    setAssigning(true);
    try {
      const res = await assignPlatformRoleAction(assignEmail.trim(), assignRole);
      if (res.success) {
        toast.success(`Assigned role ${assignRole} to ${assignEmail}`);
        setAssignEmail('');
        setShowAssignModal(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to assign platform role');
      }
    } catch {
      toast.error('Failed to assign platform role');
    } finally {
      setAssigning(false);
    }
  };

  const handleRevokeRole = async (member: PlatformMember) => {
    if (!access?.canPerformCritical) {
      toast.error('Only Root Super Admin can revoke platform roles');
      return;
    }

    if (member.email.toLowerCase() === access.email?.toLowerCase()) {
      toast.error('Cannot revoke your own root access');
      return;
    }

    setRevokingId(member.id);
    try {
      const res = await assignPlatformRoleAction(member.email, 'user');
      if (res.success) {
        toast.success(`Removed platform privileges from ${member.name}`);
        loadData();
      } else {
        toast.error(res.error || 'Failed to revoke role');
      }
    } catch {
      toast.error('Failed to revoke role');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Platform Global Configuration
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
              SaaS engine defaults, tax parameters, and 3-tier governance delegation
            </p>
          </div>
        </div>
      </div>

      {/* ── 3-Tier Platform Governance Team Card ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-950/60 border border-purple-800 text-purple-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Platform Governance Team (3-Tier RBAC)
              </h2>
              <p className="text-[11px] text-slate-400">
                Multi-tier privilege hierarchy: Root Admin, Platform Moderator, and Platform Auditor (Viewer)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={teamLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${teamLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {access?.canPerformCritical && (
              <button
                type="button"
                data-testid="btn-assign-platform-role"
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-500 transition cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Delegate Platform Role</span>
              </button>
            )}
          </div>
        </div>

        {/* 3-Tier Roles Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-purple-800/40 bg-purple-950/20 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-purple-300 font-semibold text-xs">
              <Shield className="h-3.5 w-3.5" />
              <span>1. Root Super Admin</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Full platform sovereignty. Direct critical executions, approval review authority, and governance delegation.
            </p>
          </div>

          <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-blue-300 font-semibold text-xs">
              <Sliders className="h-3.5 w-3.5" />
              <span>2. Platform Moderator</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Day-to-day operations & tenant management. Destructive operations automatically trigger Maker-Checker approval requests.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-xs">
              <Eye className="h-3.5 w-3.5" />
              <span>3. Platform Viewer</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Strictly read-only auditor. Observation of platform health, practice directories, and telemetry with mutation locks.
            </p>
          </div>
        </div>

        {/* Team Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Platform Tier</th>
                <th className="px-4 py-3 font-semibold">Joined Platform</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {team.map((member) => {
                const isRoot = member.role === 'super_admin';
                const isMod = member.role === 'super_moderator';
                const isViewer = member.role === 'super_viewer';
                const isRevoking = revokingId === member.id;

                return (
                  <tr key={member.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{member.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{member.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {isRoot ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-800">
                          <Shield className="h-2.5 w-2.5" />
                          <span>Root Super Admin</span>
                        </span>
                      ) : isMod ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-800">
                          <Sliders className="h-2.5 w-2.5" />
                          <span>Platform Moderator</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-800">
                          <Eye className="h-2.5 w-2.5" />
                          <span>Platform Viewer</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(member.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {access?.canPerformCritical && !isRoot && (
                        <button
                          type="button"
                          disabled={isRevoking}
                          onClick={() => handleRevokeRole(member)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-rose-400 border border-rose-900/40 bg-rose-950/20 hover:bg-rose-900/40 transition cursor-pointer disabled:opacity-50"
                        >
                          {isRevoking ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          <span>Revoke</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* System Infrastructure */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Server className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Infrastructure Stack</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Primary Database</span>
              <span className="font-semibold text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Neon Serverless Postgres
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Cache & Search Layer</span>
              <span className="font-semibold text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                Upstash Redis (TTL 24h)
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">SMTP Email Gateway</span>
              <span className="font-semibold text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                smtp.gmail.com:587 (TLS)
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Authentication Driver</span>
              <span className="font-semibold text-purple-300 font-mono">
                Better Auth + Org Plugin
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Application Architecture</span>
              <span className="font-semibold text-slate-200">
                Next.js 15 App Router + Drizzle ORM
              </span>
            </div>
          </div>
        </div>

        {/* Optical GST Tax Defaults */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Zap className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Indian GST Optical Defaults</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Spectacle Lenses (HSN 9001)</span>
              <span className="font-bold text-emerald-400 font-mono">
                5% (2.5% CGST + 2.5% SGST)
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Spectacle Frames (HSN 9003)</span>
              <span className="font-bold text-emerald-400 font-mono">
                5% (2.5% CGST + 2.5% SGST)
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Sunglasses & Accessories (HSN 9004)</span>
              <span className="font-bold text-amber-400 font-mono">
                18% (9% CGST + 9% SGST)
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Contact Lenses & Soln</span>
              <span className="font-bold text-amber-400 font-mono">
                18% (9% CGST + 9% SGST)
              </span>
            </div>
          </div>
        </div>

        {/* Transactional Email & Messaging */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Mail className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Gmail SMTP Mail Server Relay</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">SMTP Host</span>
              <span className="font-semibold text-white font-mono">smtp.gmail.com</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Ports & Protocol</span>
              <span className="font-semibold text-white">Port 587 (TLS/STARTTLS)</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Relay Account</span>
              <span className="font-semibold text-blue-300 font-mono">msanthosh9943@gmail.com</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Transactional Scope</span>
              <span className="font-semibold text-emerald-400">Optical Tax Receipts + Diagnostics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Delegate Platform Role */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-purple-500/40 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-purple-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-950/80 border border-purple-500/30">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delegate Platform Role</h3>
                <span className="text-[10px] font-mono text-purple-300">Root Super Admin Authority</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Assign platform governance privileges to a registered OptixOS user account.
            </p>

            <form onSubmit={handleAssignRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  User Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. officer@optixos.com"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Platform Tier *
                </label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-hidden"
                >
                  <option value="super_moderator">Platform Moderator (Routine operations + Approvals)</option>
                  <option value="super_viewer">Platform Viewer (Read-only auditor)</option>
                  <option value="super_admin">Root Super Admin (Unrestricted sovereignty)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  disabled={assigning}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || !assignEmail.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 transition cursor-pointer disabled:opacity-50"
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  <span>Assign Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
