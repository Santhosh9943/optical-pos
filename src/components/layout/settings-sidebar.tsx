'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Receipt,
  Settings,
  Copy,
  RotateCw,
  Building,
} from 'lucide-react';
import { SETTINGS_NAV_GROUPS, type SettingsNavItem } from '@/lib/settings-registry';
import { useTenantStore } from '@/store/tenant-store';
import { toast } from 'sonner';

export function SettingsSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab') || 'general';

  const { activeOrgCode, activeRoleMode } = useTenantStore();

  const isItemActive = (item: SettingsNavItem): boolean => {
    if (item.href) {
      return pathname === item.href;
    }
    if (item.tabKey) {
      return pathname === '/admin/settings' && currentTab === item.tabKey;
    }
    return false;
  };

  const handleCopyPracticeId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeOrgCode) return;
    navigator.clipboard.writeText(activeOrgCode);
    toast.success(`Copied Practice ID (${activeOrgCode}) to clipboard`);
  };

  const handleBackToPos = (e: React.MouseEvent) => {
    const event = new CustomEvent('optixos:settings-nav-intercept', {
      bubbles: true,
      cancelable: true,
      detail: { href: '/pos/new-bill' },
    });
    const dispatched = window.dispatchEvent(event);
    if (!dispatched) {
      e.preventDefault();
    }
  };

  const handleItemClick = (e: React.MouseEvent, item: SettingsNavItem) => {
    const event = new CustomEvent('optixos:settings-nav-intercept', {
      bubbles: true,
      cancelable: true,
      detail: { tabKey: item.tabKey, href: item.href },
    });
    const dispatched = window.dispatchEvent(event);
    if (!dispatched) {
      e.preventDefault();
    }
  };

  return (
    <aside
      data-testid="settings-navigation-sidebar"
      className="flex w-64 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20 h-full overflow-hidden"
    >
      {/* ── Top Header: Back to POS Action ── */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-3 shrink-0">
        <Link
          href="/pos/new-bill"
          data-testid="btn-back-to-pos"
          onClick={handleBackToPos}
          className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition active:scale-95 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs group"
          title="Return to Active Sales Billing Counter [F1]"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <div className="flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            <span>POS Billing</span>
          </div>
          <span className="ml-1 rounded bg-blue-200/80 dark:bg-blue-900 px-1 py-0.2 font-mono text-[9px] font-bold text-blue-800 dark:text-blue-200">
            F1
          </span>
        </Link>

        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <Settings className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>Settings</span>
        </div>
      </div>

      {/* ── Scrollable Categorized Navigation List ── */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-4 text-xs font-medium text-slate-600 dark:text-slate-300">
        {SETTINGS_NAV_GROUPS.map((group) => {
          // Filter items based on user role if required
          const visibleItems = group.items.filter((item) => {
            if (!item.roles) return true;
            return item.roles.includes(activeRoleMode as any);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.id} className="space-y-1">
              <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>{group.label}</span>
              </div>

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item);
                  const targetHref = item.href || `/admin/settings?tab=${item.tabKey}`;

                  return (
                    <Link
                      key={item.id}
                      href={targetHref}
                      data-testid={item.testId}
                      onClick={(e) => handleItemClick(e, item)}
                      className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left font-medium transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/80 dark:border-blue-800/80 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-md shrink-0 transition ${
                            active
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-slate-900 dark:group-hover:text-slate-100'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="truncate">
                          <span className="block truncate text-xs">{item.title}</span>
                        </div>
                      </div>

                      {item.badge && (
                        <span
                          className={`ml-1.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold ${
                            active
                              ? 'bg-blue-200/70 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer: Practice Context & Quick Actions ── */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-2.5 space-y-2 shrink-0">
        {activeOrgCode && (
          <div className="flex items-center justify-between rounded-lg bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Building className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="text-[10px] font-semibold">Practice ID:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                {activeOrgCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyPracticeId}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Copy Practice ID"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
          <Link
            href="/admin/dashboard"
            className="hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition"
          >
            Dashboard
          </Link>
          <span>·</span>
          <Link
            href="/admin/inventory"
            className="hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition"
          >
            Stock [F3]
          </Link>
          <span>·</span>
          <Link
            href="/admin/reports"
            className="hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition"
          >
            Z-Report
          </Link>
        </div>
      </div>
    </aside>
  );
}
