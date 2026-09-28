'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import { SETTINGS_NAV_GROUPS, type SettingsNavItem } from '@/lib/settings-registry';
import { useTenantStore } from '@/store/tenant-store';

export function SettingsSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'general';

  const { activeRoleMode } = useTenantStore();

  const isItemActive = (item: SettingsNavItem): boolean => {
    return pathname === '/admin/settings' && currentTab === item.tabKey;
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
      detail: { tabKey: item.tabKey },
    });
    const dispatched = window.dispatchEvent(event);
    if (!dispatched) {
      e.preventDefault();
    }
  };

  return (
    <aside
      data-testid="settings-navigation-sidebar"
      className="flex w-56 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20 h-full overflow-hidden"
    >
      {/* ── Top Header: Back to POS Action ── */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-3 shrink-0">
        <Link
          href="/pos/new-bill"
          data-testid="btn-back-to-pos"
          onClick={handleBackToPos}
          className="flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition active:scale-95 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs group"
          title="Return to Active Sales Billing Counter [F1]"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>POS Billing</span>
          <span className="rounded bg-blue-200/80 dark:bg-blue-900 px-1 py-0.2 font-mono text-[9px] font-bold text-blue-800 dark:text-blue-200">
            F1
          </span>
        </Link>

        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <Settings className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>Settings</span>
        </div>
      </div>

      {/* ── Scrollable Categorized Navigation List ── */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-3 text-xs font-medium text-slate-600 dark:text-slate-300">
        {SETTINGS_NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (!item.roles) return true;
            return item.roles.includes(activeRoleMode as any);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.id} className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                {group.label}
              </div>

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item);
                  const targetHref = `/admin/settings?tab=${item.tabKey}`;

                  return (
                    <Link
                      key={item.id}
                      href={targetHref}
                      data-testid={item.testId}
                      onClick={(e) => handleItemClick(e, item)}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-400 dark:text-slate-400'
                          }`}
                        />
                        <span className="truncate text-xs">{item.title}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`ml-1.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold ${
                            active
                              ? 'bg-blue-200/70 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
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

      {/* ── Function Keys Cheatsheet (Footer of Sidebar, matching Operations sidebar) ── */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
          Keyboard Shortcuts
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
          <div className="rounded bg-white dark:bg-slate-900 px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="font-bold text-blue-600 dark:text-blue-400">F1</span> Bill
          </div>
          <div className="rounded bg-white dark:bg-slate-900 px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="font-bold text-blue-600 dark:text-blue-400">F3</span> Stock
          </div>
          <div className="rounded bg-white dark:bg-slate-900 px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="font-bold text-blue-600 dark:text-blue-400">F10</span> Pay
          </div>
          <div className="rounded bg-white dark:bg-slate-900 px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="font-bold text-blue-600 dark:text-blue-400">F5</span> Print
          </div>
        </div>
      </div>
    </aside>
  );
}
