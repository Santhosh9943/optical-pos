'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { useTenantStore } from '@/store/tenant-store';
import { getUserTenancyContext } from '@/actions/tenant-actions';
import {
  User as UserIcon,
  LogOut,
  Shield,
  Building,
  Store,
  Settings,
  ChevronDown,
  Loader2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export function UserNav() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    actualRole,
    activeRoleMode,
    branches,
    selectedBranchId,
    setTenancyData,
  } = useTenantStore();

  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
  }>({
    name: 'Administrator',
    email: 'admin@optix.com',
  });

  // Load tenancy context and user profile
  useEffect(() => {
    let mounted = true;
    getUserTenancyContext().then((ctx) => {
      if (!mounted) return;
      if (ctx.user) {
        setUserProfile({
          name: ctx.user.name || 'Staff User',
          email: ctx.user.email || 'staff@optix.com',
        });
      }
      setTenancyData({
        actualRole: ctx.role,
        activeRoleMode: ctx.role,
        organizations: ctx.organizations,
        branches: ctx.branches,
        selectedOrganizationId: ctx.activeOrganizationId,
        selectedBranchId: 'all',
      });
    });
    return () => {
      mounted = false;
    };
  }, [setTenancyData]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success('Signed out successfully');
            router.push('/auth/login');
            router.refresh();
          },
          onError: (ctx) => {
            console.error('Sign out error:', ctx.error);
            // Fallback redirect even if network glitch occurs
            router.push('/auth/login');
          },
        },
      });
    } catch (err) {
      console.error('Sign out failed:', err);
      router.push('/auth/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const roleLabels: Record<string, { label: string; badgeClass: string }> = {
    super_admin: {
      label: 'Super Admin',
      badgeClass:
        'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    },
    organizer: {
      label: 'Org Owner',
      badgeClass:
        'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    admin: {
      label: 'Store Admin',
      badgeClass:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    user: {
      label: 'Staff POS',
      badgeClass:
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    },
  };

  const currentRoleInfo = roleLabels[activeRoleMode] || roleLabels.user;

  const currentBranchName =
    selectedBranchId === 'all'
      ? 'All Stores'
      : branches.find((b) => b.id === selectedBranchId)?.name || 'Main Branch';

  const userInitials = userProfile.name
    ? userProfile.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'OP';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        type="button"
        data-testid="user-profile-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/70 transition active:scale-[0.98] cursor-pointer"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[11px] shadow-xs">
          {userInitials}
        </div>
        <div className="hidden md:flex flex-col items-start text-left">
          <span className="leading-tight font-medium truncate max-w-[120px]">
            {userProfile.name}
          </span>
          <span
            className={`text-[9px] px-1 py-0.2 rounded border font-semibold ${currentRoleInfo.badgeClass}`}
          >
            {currentRoleInfo.label}
          </span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          data-testid="user-dropdown-menu"
          className="absolute right-0 mt-1.5 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          {/* User Details Header */}
          <div className="border-b border-slate-100 dark:border-slate-800 px-2.5 py-2">
            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {userProfile.name}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {userProfile.email}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${currentRoleInfo.badgeClass}`}
              >
                {currentRoleInfo.label}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Store className="h-3 w-3" />
                {currentBranchName}
              </span>
            </div>
          </div>

          {/* Action Links */}
          <div className="py-1.5 space-y-0.5">
            {/* Super Admin Console Link (shown for super_admin or simulated super_admin) */}
            {(actualRole === 'super_admin' || activeRoleMode === 'super_admin') && (
              <Link
                href="/admin/super-admin"
                data-testid="link-super-admin-console"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition"
              >
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>Super Admin Console</span>
              </Link>
            )}

            <Link
              href="/admin/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Practice Settings</span>
            </Link>
          </div>

          {/* Sign Out Button */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <button
              type="button"
              data-testid="btn-sign-out"
              disabled={loggingOut}
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer disabled:opacity-50"
            >
              {loggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
