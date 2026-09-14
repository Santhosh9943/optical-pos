'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTenantStore } from '@/store/tenant-store';
import { Store, Building2, ChevronDown, Check, Lock, Layers } from 'lucide-react';

export function BranchSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    activeRoleMode,
    branches,
    selectedBranchId,
    setSelectedBranch,
  } = useTenantStore();

  const isMultiBranchAllowed =
    activeRoleMode === 'super_admin' || activeRoleMode === 'organizer';

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

  const activeBranch = branches.find((b) => b.id === selectedBranchId);
  const displayLabel =
    selectedBranchId === 'all'
      ? 'All Branches'
      : activeBranch?.name || 'Main Branch';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        data-testid="branch-switcher-btn"
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
            ? 'Click to switch active branch view'
            : 'Locked to your assigned store'
        }
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
          {selectedBranchId === 'all' ? (
            <Layers className="h-3.5 w-3.5" />
          ) : (
            <Store className="h-3.5 w-3.5" />
          )}
        </div>

        <div className="flex flex-col items-start leading-tight">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400">
            Store Location
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 max-w-[130px] truncate">
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
          className="absolute left-0 mt-1.5 w-60 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Select Store / Branch View
            </span>
          </div>

          {/* Option: All Branches Consolidated */}
          <button
            type="button"
            data-testid="branch-option-all"
            onClick={() => {
              setSelectedBranch('all');
              setIsOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 font-medium transition cursor-pointer ${
              selectedBranchId === 'all'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>All Branches (Consolidated)</span>
            </div>
            {selectedBranchId === 'all' && (
              <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            )}
          </button>

          {/* List of Individual Branches */}
          <div className="mt-1 space-y-0.5">
            {branches.map((branch) => {
              const isSelected = selectedBranchId === branch.id;
              return (
                <button
                  key={branch.id}
                  type="button"
                  data-testid={`branch-option-${branch.id}`}
                  onClick={() => {
                    setSelectedBranch(branch.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 font-medium transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate max-w-[150px]">{branch.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
