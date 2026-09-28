'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Glasses,
  LayoutDashboard,
  Store,
  Users,
  BarChart3,
  ClipboardCheck,
  Settings,
  Receipt,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  Copy,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenantStore } from '@/store/tenant-store';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/layout/user-nav';
import { NotificationBellTrigger } from '@/components/notifications';
import { getStoreApprovalRequestsAction } from '@/actions/approval-actions';

export default function OwnerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    activeRoleMode,
    selectedOrganizationId,
    selectedBranchId,
    setSelectedBranch,
    branches,
    organizations,
    activeOrgCode,
  } = useTenantStore();

  const [mounted, setMounted] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeOrg = organizations.find((o) => o.id === selectedOrganizationId);
  const activeOrgName = activeOrg?.name || 'Optix Vision Practice';
  const orgCode = activeOrg?.orgCode || activeOrgCode || 'OPT-1';

  const orgBranches = React.useMemo(() => {
    return branches.filter((b) => b.organizationId === selectedOrganizationId);
  }, [branches, selectedOrganizationId]);

  // Selected branch to launch into POS
  const [launchBranchId, setLaunchBranchId] = useState<string>(
    selectedBranchId || orgBranches[0]?.id || ''
  );

  useEffect(() => {
    if (selectedBranchId) {
      setLaunchBranchId(selectedBranchId);
    } else if (orgBranches.length > 0 && !launchBranchId) {
      setLaunchBranchId(orgBranches[0].id);
    }
  }, [selectedBranchId, orgBranches, launchBranchId]);

  // RBAC Guard: Only Organization Owner and Platform Super Admin can access the Owner Portal
  useEffect(() => {
    if (!mounted) return;
    const isOwner = activeRoleMode === 'organizer' || activeRoleMode === 'super_admin';
    if (!isOwner) {
      toast.error('Access Restricted: Owner Portal is reserved for Organization Owners.');
      router.replace('/pos/new-bill');
    }
  }, [mounted, activeRoleMode, router]);

  // Load pending approvals count for badge
  useEffect(() => {
    async function loadCount() {
      try {
        const res = await getStoreApprovalRequestsAction('pending');
        if (res.success && res.requests) {
          setPendingApprovalsCount(res.requests.length);
        }
      } catch {
        // Silent catch for badge
      }
    }
    if (mounted && (activeRoleMode === 'organizer' || activeRoleMode === 'super_admin')) {
      loadCount();
    }
  }, [mounted, activeRoleMode]);

  const handleLaunchPos = () => {
    const targetBranch = launchBranchId || orgBranches[0]?.id;
    if (targetBranch) {
      setSelectedBranch(targetBranch);
      const branchName = orgBranches.find((b) => b.id === targetBranch)?.name || 'Store Counter';
      toast.success(`Entering ${branchName} POS Counter`);
      router.push('/pos/new-bill');
    } else {
      toast.error('Please create at least one store branch before launching POS');
    }
  };

  const navLinks = [
    {
      href: '/owner',
      label: 'Executive Cockpit',
      icon: LayoutDashboard,
      active: pathname === '/owner',
    },
    {
      href: '/owner/branches',
      label: 'Manage Branches',
      icon: Store,
      badge: `${orgBranches.length} Stores`,
      active: pathname?.startsWith('/owner/branches'),
    },
    {
      href: '/owner/staff',
      label: 'Staff & Access',
      icon: Users,
      active: pathname?.startsWith('/owner/staff'),
    },
    {
      href: '/owner/reports',
      label: 'Consolidated Analytics',
      icon: BarChart3,
      active: pathname?.startsWith('/owner/reports'),
    },
    {
      href: '/owner/approvals',
      label: 'Practice Approvals',
      icon: ClipboardCheck,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
      badgeColor: 'bg-amber-500 text-white',
      active: pathname?.startsWith('/owner/approvals'),
    },
    {
      href: '/owner/settings',
      label: 'Practice Settings',
      icon: Settings,
      active: pathname?.startsWith('/owner/settings'),
    },
  ];

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Glasses className="h-5 w-5 animate-pulse text-blue-400" />
          <span>Loading Practice Owner Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* ── Left Navigation Sidebar ── */}
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
        {/* Brand & Portal Header */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Shield className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Optix<span className="text-blue-600 dark:text-blue-400">OS</span>
                </span>
                <span className="rounded bg-blue-100 dark:bg-blue-950/70 px-1 py-0.2 text-[9px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Owner
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate max-w-[130px]" title={activeOrgName}>
                {activeOrgName}
              </p>
            </div>
          </div>
        </div>

        {/* Practice Identifier Pill */}
        <div className="mx-3 mt-3 mb-1 p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="text-[11px] font-mono font-bold text-purple-700 dark:text-purple-300 truncate">
              {orgCode}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(orgCode);
              toast.success(`Copied Practice ID (${orgCode})`);
            }}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 p-0.5 cursor-pointer"
            title="Copy Practice ID"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 p-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            Practice Governance
          </div>

          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-semibold transition ${
                  link.active
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 ${
                      link.active
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 dark:text-slate-400'
                    }`}
                  />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      link.badgeColor || 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Launch Callout inside sidebar */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Store POS Counter
          </div>
          <p className="text-[11px] text-muted-foreground mb-2 leading-tight">
            Launch counter billing for any branch as the Practice Owner.
          </p>
          <button
            type="button"
            onClick={handleLaunchPos}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Launch Store POS</span>
          </button>
        </div>
      </aside>

      {/* ── Main Viewport Container ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* ── Top Header Action Bar ── */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 shrink-0 z-10">
          {/* Practice Meta & Route Breadcrumb */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
              <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Practice Owner Portal</span>
            </span>
            <span className="hidden sm:inline-block text-xs text-muted-foreground">
              {activeOrgName}
            </span>
          </div>

          {/* Right Header Controls: Launch Store POS Selector + UserNav */}
          <div className="flex items-center space-x-3">
            {/* Store POS Launcher Bar */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800/70 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <select
                aria-label="Select store location for POS counter launch"
                value={launchBranchId}
                onChange={(e) => setLaunchBranchId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-foreground px-2 py-1 outline-hidden cursor-pointer"
              >
                {orgBranches.map((b) => (
                  <option key={b.id} value={b.id} className="dark:bg-slate-900">
                    {b.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleLaunchPos}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer shadow-2xs"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Launch POS Counter</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Notification Bell Trigger */}
            <NotificationBellTrigger />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile & Navigation */}
            <UserNav />
          </div>
        </header>

        {/* ── Active Route View Area ── */}
        <main className="flex-1 flex flex-col overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
