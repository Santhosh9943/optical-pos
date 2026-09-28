'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  LayoutDashboard,
  Eye,
  Building2,
  Store,
  Settings,
  ExternalLink,
  LogOut,
  Sparkles,
  Server,
  Clock,
  ClipboardCheck,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { authClient } from '@/lib/auth-client';
import { clearClientStorageCaches } from '@/hooks/use-cached-resource';
import { toast } from 'sonner';
import {
  verifySuperAdminAccessAction,
  getApprovalRequestsAction,
  type SuperAdminAccessResult,
} from '@/actions/tenant-actions';
import { superAdminSignOutAction } from '@/actions/super-admin-auth-actions';
import { useIdleTimeout } from '@/hooks/use-idle-timeout';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);
  const [accessResult, setAccessResult] = React.useState<SuperAdminAccessResult | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = React.useState<number>(0);

  React.useEffect(() => {
    if (pathname === '/super-admin/login') {
      setIsAuthorized(true);
      return;
    }

    async function checkAuth() {
      try {
        const check = await verifySuperAdminAccessAction();
        setIsAuthorized(check.isSuperAdmin);
        setAccessResult(check);

        if (check.isSuperAdmin) {
          // Fetch pending approvals count for badge
          try {
            const approvalsRes = await getApprovalRequestsAction('pending');
            if (approvalsRes.success) {
              setPendingApprovalsCount(approvalsRes.requests.length);
            }
          } catch {
            // Non-critical badge count
          }
        }
      } catch {
        setIsAuthorized(false);
      }
    }
    checkAuth();
  }, [pathname]);

  const isDashboard = pathname === '/super-admin/dashboard' || pathname === '/super-admin';
  const isApprovals = pathname === '/super-admin/approvals';
  const isOrganizations = pathname === '/super-admin/organizations';
  const isBranches = pathname === '/super-admin/branches';
  const isSettings = pathname === '/super-admin/settings';

  const isProtectedSuperAdmin = isAuthorized === true && pathname !== '/super-admin/login';
  const { showWarning, secondsRemaining, extendSession, logoutNow } = useIdleTimeout({
    enabled: isProtectedSuperAdmin,
    timeoutMs: 15 * 60 * 1000,
    warningMs: 60 * 1000,
  });

  const handleSignOut = async () => {
    try {
      await superAdminSignOutAction();
      clearClientStorageCaches();
      await authClient.signOut().catch(() => {});
      toast.success('Signed out of root console');
      router.push('/super-admin/login');
      router.refresh();
    } catch {
      router.push('/super-admin/login');
      router.refresh();
    }
  };

  // Login page renders without the root dashboard sidebar
  if (pathname === '/super-admin/login') {
    return <>{children}</>;
  }

  // Loading state
  if (isAuthorized === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-8 w-8 text-purple-500 animate-pulse" />
          <p className="text-xs font-mono uppercase tracking-wider">Verifying Root Authorization...</p>
        </div>
      </div>
    );
  }

  // Unauthorized barrier
  if (isAuthorized === false) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
        <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-950/80 text-red-400 border border-red-500/40 mb-4">
            <Shield className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white mb-2">Platform Root Access Denied</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            This console is strictly reserved for platform governance. Your active account does not have Root Super Administrator privileges.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/pos/new-bill"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 py-2.5 text-xs font-semibold text-white shadow-xs transition"
            >
              <span>Return to Practice Counter</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 hover:bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Switch / Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* ── Persistent Super Admin Sidebar ── */}
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur-md z-20">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          <Link href="/super-admin/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-900/30">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white tracking-tight">Optix OS</span>
                {accessResult?.role === 'super_moderator' ? (
                  <span className="rounded bg-blue-500/20 px-1.5 py-0.2 text-[9px] font-mono font-bold text-blue-300 border border-blue-500/30">
                    MODERATOR
                  </span>
                ) : accessResult?.role === 'super_viewer' ? (
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-mono font-bold text-emerald-300 border border-emerald-500/30">
                    VIEWER
                  </span>
                ) : (
                  <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[9px] font-mono font-bold text-purple-300 border border-purple-500/30">
                    ROOT
                  </span>
                )}
              </div>
              <div className="text-[10px] text-purple-300/70 font-medium">
                Platform Governance
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-3 text-xs">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Platform Core
          </div>

          {/* Dashboard */}
          <Link
            href="/super-admin/dashboard"
            data-testid="nav-super-dashboard"
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 font-semibold transition ${
              isDashboard
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="h-4 w-4 text-purple-400" />
              <span>Global Overview</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Live</span>
          </Link>

          {/* Privileged Approvals (Maker-Checker Governance) */}
          <Link
            href="/super-admin/approvals"
            data-testid="nav-super-approvals"
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 font-semibold transition ${
              isApprovals
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ClipboardCheck className="h-4 w-4 text-amber-400" />
              <span>Privileged Approvals</span>
            </div>
            {pendingApprovalsCount > 0 ? (
              <span className="rounded-full bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[9px] font-mono font-bold border border-amber-500/40">
                {pendingApprovalsCount}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-500">Queue</span>
            )}
          </Link>

          <div className="pt-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Multi-Tenant Management
          </div>

          {/* Organizations / Practices */}
          <Link
            href="/super-admin/organizations"
            data-testid="nav-super-organizations"
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 font-semibold transition ${
              isOrganizations
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-blue-400" />
              <span>SaaS Organizations</span>
            </div>
          </Link>

          {/* Physical Stores Directory */}
          <Link
            href="/super-admin/branches"
            data-testid="nav-super-branches"
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 font-semibold transition ${
              isBranches
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Store className="h-4 w-4 text-emerald-400" />
              <span>Physical Stores</span>
            </div>
          </Link>

          {/* Platform Settings */}
          <Link
            href="/super-admin/settings"
            data-testid="nav-super-settings"
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 font-semibold transition ${
              isSettings
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Platform Settings</span>
            </div>
          </Link>
        </nav>

        {/* Footer: User Info & Sign Out */}
        <div className="border-t border-slate-800 p-3 space-y-2 bg-slate-950/60">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-white font-bold text-[10px] ${
                accessResult?.role === 'super_moderator'
                  ? 'bg-blue-600'
                  : accessResult?.role === 'super_viewer'
                  ? 'bg-emerald-600'
                  : 'bg-purple-600'
              }`}>
                {(accessResult?.name || accessResult?.email || 'SA').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col text-[11px] leading-tight truncate max-w-[125px]">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-white truncate">
                    {accessResult?.name || 'Platform Officer'}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-slate-400 truncate">
                  {accessResult?.role === 'super_moderator'
                    ? 'Platform Moderator'
                    : accessResult?.role === 'super_viewer'
                    ? 'Platform Viewer'
                    : 'Root Super Admin'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              className="rounded-md p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Super Admin Content Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-950">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-purple-400 font-semibold">Super Admin Platform</span>
              <span>/</span>
              <span className="text-white font-medium capitalize">
                {pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-800/60">
              <Server className="h-3.5 w-3.5 text-emerald-400" />
              <span>Neon Postgres Connected</span>
            </div>

            <ThemeToggle />
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950 text-slate-100">
          {children}
        </main>
      </div>

      {/* ── 15-Minute Inactivity Warning Modal ── */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-4 animate-bounce">
              <Clock className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Super Admin Session Expiring
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              For platform security compliance, inactive root sessions terminate automatically. Your session will lock in{' '}
              <span className="font-mono font-bold text-amber-400 text-sm">{secondsRemaining}s</span>.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={logoutNow}
                className="flex-1 rounded-xl border border-slate-700 hover:bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 transition cursor-pointer"
              >
                Sign Out Now
              </button>
              <button
                type="button"
                onClick={extendSession}
                className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-700 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 transition cursor-pointer"
              >
                Stay Signed In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
