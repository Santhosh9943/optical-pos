'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Glasses,
  Receipt,
  Package,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  Clock,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isPos = pathname?.startsWith('/pos');
  const isInventory = pathname?.startsWith('/admin/inventory');
  const isReports = pathname?.startsWith('/admin/reports');
  const isPatients = pathname?.startsWith('/admin/patients');
  const isLabOrders = pathname?.startsWith('/admin/lab-orders');
  const isSettings = pathname?.startsWith('/admin/settings');

  // Global Keyboard Shortcuts (F1 for POS Billing, F3 for Inventory)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (e.key === 'F1' && !isInput) {
        e.preventDefault();
        router.push('/pos/new-bill');
      } else if (e.key === 'F3' && !isInput) {
        e.preventDefault();
        router.push('/admin/inventory');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* ── Persistent Left Navigation Sidebar ── */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
        {/* Brand Header */}
        <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Glasses className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Optix<span className="text-blue-600 dark:text-blue-400">OS</span>
            </span>
            <span className="ml-1.5 rounded bg-blue-50 dark:bg-blue-950/60 px-1 py-0.2 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
              SPA
            </span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 space-y-1 p-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
            Operations
          </div>

          {/* POS Billing Nav Link */}
          <Link
            href="/pos/new-bill"
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
              isPos
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Receipt
                className={`h-4 w-4 ${
                  isPos
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-400'
                }`}
              />
              <span>Billing (POS)</span>
            </div>
            <span className="rounded bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-600 dark:text-slate-300">
              F1
            </span>
          </Link>

          {/* Inventory Catalog Nav Link */}
          <Link
            href="/admin/inventory"
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
              isInventory
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package
                className={`h-4 w-4 ${
                  isInventory
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-400'
                }`}
              />
              <span>Inventory</span>
            </div>
            <span className="rounded bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-600 dark:text-slate-300">
              F3
            </span>
          </Link>

          {/* Patients Nav Link */}
          <Link
            href="/admin/patients"
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
              isPatients
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users
                className={`h-4 w-4 ${
                  isPatients
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-400'
                }`}
              />
              <span>Patients</span>
            </div>
            <span className="rounded bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-600 dark:text-slate-300">
              Rx
            </span>
          </Link>

          {/* Lab Orders Nav Link */}
          <Link
            href="/admin/lab-orders"
            data-testid="nav-lab-orders"
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
              isLabOrders
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClipboardList
                className={`h-4 w-4 ${
                  isLabOrders
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-400'
                }`}
              />
              <span>Lab Orders</span>
            </div>
            <span className="rounded bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-600 dark:text-slate-300">
              Lab
            </span>
          </Link>

          <div className="pt-3">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
              Management
            </div>
            <Link
              href="/admin/reports"
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isReports
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3
                  className={`h-4 w-4 ${
                    isReports
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-400'
                  }`}
                />
                <span>Daily Z-Report</span>
              </div>
              <span className="rounded bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-600 dark:text-slate-300">
                Audit
              </span>
            </Link>
            <Link
              href="/admin/settings"
              data-testid="nav-settings"
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isSettings
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings
                  className={`h-4 w-4 ${
                    isSettings
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-400'
                  }`}
                />
                <span>Settings</span>
              </div>
              <span className="rounded bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-600 dark:text-slate-300">
                Cfg
              </span>
            </Link>
          </div>
        </nav>

        {/* Function Keys Cheatsheet (Footer of Sidebar) */}
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

      {/* ── Persistent Main Viewport Container ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* ── Persistent Top Global Action Bar ── */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 shrink-0 z-10">
          {/* Navigation Tabs / Link Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <Link
              href="/pos/new-bill"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isPos
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Billing (POS)</span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-300">F1</span>
            </Link>

            <Link
              href="/admin/inventory"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isInventory
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>Inventory Catalog</span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-300">F3</span>
            </Link>

            <Link
              href="/admin/reports"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isReports
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Daily Reports</span>
            </Link>

            <Link
              href="/admin/patients"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isPatients
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Patients</span>
            </Link>
          </div>

          {/* Store / Shift Meta & Theme Toggle */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Shift Active
            </div>

            <div className="hidden md:flex text-xs text-slate-600 dark:text-slate-300 font-mono items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
              Counter 01
            </div>

            <ThemeToggle />
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
