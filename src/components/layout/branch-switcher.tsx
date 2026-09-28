'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTenantStore } from '@/store/tenant-store';
import {
  Store,
  ChevronDown,
  Check,
  Lock,
  BarChart3,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

export function BranchSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    activeRoleMode,
    branches,
    selectedBranchId,
    setSelectedBranch,
    activeOrgCode,
  } = useTenantStore();

  const isMultiBranchAllowed =
    mounted && branches.length > 1;

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

  // Compute active branch info
  const activeBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const displayLabel = mounted ? (activeBranch?.name || 'Main Branch') : 'Store Location';

  const handleSelectBranch = (branchId: string, branchName: string) => {
    setSelectedBranch(branchId);
    setIsOpen(false);
    toast.success(`Switched active store to: ${branchName}`);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        data-testid="branch-switcher-btn"
        suppressHydrationWarning
        onClick={() => {
          if (isMultiBranchAllowed) {
            setIsOpen(!isOpen);
          }
        }}
        className={`flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs transition ${
          isMultiBranchAllowed
            ? 'hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer active:scale-[0.98]'
            : 'cursor-default opacity-90'
        }`}
        title={
          isMultiBranchAllowed
            ? 'Click to switch active store location'
            : 'Locked to your assigned store'
        }
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
          <Store className="h-3.5 w-3.5" />
        </div>

        <div className="flex flex-col items-start leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400">
              Active Store
            </span>
            {activeOrgCode && (
              <span className="inline-flex items-center rounded bg-purple-100 dark:bg-purple-950/70 px-1 py-0.2 text-[9px] font-mono font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {activeOrgCode}
              </span>
            )}
          </div>
          <span
            suppressHydrationWarning
            data-testid="branch-switcher-active-name"
            className="font-semibold text-slate-900 dark:text-slate-100 max-w-[140px] truncate"
          >
            {displayLabel}
          </span>
        </div>

        {isMultiBranchAllowed ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
        ) : (
          <Lock className="h-3 w-3 text-slate-400 ml-0.5" />
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && isMultiBranchAllowed && (
        <div
          data-testid="branch-switcher-popover"
          className="absolute left-0 mt-1.5 w-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl z-50 text-xs animate-in fade-in zoom-in-95 duration-100 font-sans"
        >
          {/* Header */}
          <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Switch Physical Store
              </span>
              {activeOrgCode && (
                <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                  {activeOrgCode}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Select a store to manage inventory, POS, and local staff.
            </p>
          </div>

          {/* List of Individual Physical Stores */}
          <div className="space-y-0.5 max-h-56 overflow-y-auto pr-0.5">
            {branches.map((branch) => {
              const isSelected = branch.id === (activeBranch?.id || selectedBranchId);

              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => handleSelectBranch(branch.id, branch.name)}
                  data-testid={`branch-option-${branch.id}`}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Store className={`h-4 w-4 shrink-0 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="truncate text-xs">{branch.name}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        <span>Store Location</span>
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Action: Link to Consolidated Multi-Store Reports (Org Owner / Super Admin only) */}
          {(activeRoleMode === 'super_admin' || activeRoleMode === 'organizer') && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 px-2">
              <Link
                href="/admin/reports"
                data-testid="link-consolidated-reports"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Multi-Store Practice Reports</span>
                </span>
                <span>→</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
