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
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isDashboard = pathname === '/super-admin/dashboard' || pathname === '/super-admin';
  const isSimulator = pathname === '/super-admin/simulator';
  const isOrganizations = pathname === '/super-admin/organizations';
  const isBranches = pathname === '/super-admin/branches';
  const isSettings = pathname === '/super-admin/settings';

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success('Signed out successfully');
      router.push('/auth/login');
    } catch {
      router.push('/auth/login');
    }
  };

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
                <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[9px] font-mono font-bold text-purple-300 border border-purple-500/30">
                  ROOT
                </span>
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

          {/* Perspective Simulator */}
          <Link
            href="/super-admin/simulator"
            data-testid="nav-super-simulator"
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 font-semibold transition ${
              isSimulator
                ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-purple-200 border border-purple-500/40 shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Eye className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="font-bold">Perspective Simulator</span>
            </div>
            <span className="rounded bg-amber-400/20 px-1 py-0.2 text-[9px] font-mono font-bold text-amber-300 border border-amber-400/30">
              Act As
            </span>
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

        {/* Footer: Return to Live POS App & User Info */}
        <div className="border-t border-slate-800 p-3 space-y-2 bg-slate-950/60">
          <Link
            href="/pos/new-bill"
            data-testid="link-back-to-pos"
            className="flex w-full items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span>Live POS Workspace</span>
            </span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </Link>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-[10px]">
                SA
              </div>
              <div className="flex flex-col text-[11px] leading-tight">
                <span className="font-semibold text-white">Root Admin</span>
                <span className="text-[9px] text-slate-400">admin@optix.com</span>
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
    </div>
  );
}
