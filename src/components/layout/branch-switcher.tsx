'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTenantStore } from '@/store/tenant-store';
import {
  Store,
  Building2,
  ChevronDown,
  Check,
  Lock,
  Layers,
  CheckSquare,
  Square,
  RotateCcw,
} from 'lucide-react';

export function BranchSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    activeRoleMode,
    branches,
    selectedBranchId,
    selectedBranchIds,
    setSelectedBranch,
    setSelectedBranches,
    toggleBranchSelection,
    selectAllBranches,
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

  const isAllSelected =
    selectedBranchIds.includes('all') ||
    selectedBranchIds.length === 0;

  const selectedCount = isAllSelected ? branches.length : selectedBranchIds.length;

  // Compute trigger label & icon
  let displayLabel = 'All Branches (Consolidated)';
  let triggerIcon = <Layers className="h-3.5 w-3.5" />;

  if (!isAllSelected) {
    if (selectedCount === 1) {
      const singleId = selectedBranchIds[0] || selectedBranchId;
      const b = branches.find((item) => item.id === singleId);
      displayLabel = b?.name || 'Store Location';
      triggerIcon = <Store className="h-3.5 w-3.5" />;
    } else if (selectedCount > 1) {
      displayLabel = `${selectedCount} Branches Selected`;
      triggerIcon = <Building2 className="h-3.5 w-3.5" />;
    }
  }

  const handleSelectOnly = (e: React.MouseEvent, branchId: string) => {
    e.stopPropagation();
    setSelectedBranch(branchId);
    setIsOpen(false);
  };

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
            ? 'Click to switch single, multiple, or all branch views'
            : 'Locked to your assigned store'
        }
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
          {triggerIcon}
        </div>

        <div className="flex flex-col items-start leading-tight">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1">
            <span>Store Location</span>
            {!isAllSelected && selectedCount > 1 && (
              <span className="inline-flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 px-1 text-[9px] font-mono font-bold text-blue-700 dark:text-blue-300">
                {selectedCount}
              </span>
            )}
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 max-w-[140px] truncate">
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
          {/* Header & Quick Action Shortcuts */}
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Select Store / Branch View
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="branch-btn-select-all"
                onClick={() => {
                  selectAllBranches();
                  setIsOpen(false);
                }}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline px-1 py-0.5 rounded cursor-pointer"
                title="Select all physical stores"
              >
                All
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                type="button"
                data-testid="branch-btn-reset"
                onClick={() => {
                  if (branches.length > 0) {
                    setSelectedBranch(branches[0].id);
                    setIsOpen(false);
                  }
                }}
                className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-1 py-0.5 rounded cursor-pointer"
                title="Reset to main store"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Option: All Branches Consolidated */}
          <button
            type="button"
            data-testid="branch-option-all"
            onClick={() => {
              selectAllBranches();
              setIsOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 font-medium transition cursor-pointer mb-1 ${
              isAllSelected
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>All Branches (Consolidated)</span>
            </div>
            {isAllSelected && (
              <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
          </button>

          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            Physical Store Locations
          </div>

          {/* List of Individual Branches with Checkboxes and "Only" shortcut */}
          <div className="space-y-0.5 max-h-56 overflow-y-auto pr-0.5">
            {branches.map((branch) => {
              const isChecked =
                isAllSelected || selectedBranchIds.includes(branch.id);
              const isSingleActive =
                !isAllSelected &&
                selectedBranchIds.length === 1 &&
                selectedBranchIds[0] === branch.id;

              return (
                <div
                  key={branch.id}
                  onClick={() => toggleBranchSelection(branch.id)}
                  data-testid={`branch-option-${branch.id}`}
                  className={`group flex items-center justify-between rounded-lg px-2.5 py-2 transition cursor-pointer ${
                    isChecked
                      ? 'bg-blue-50/50 dark:bg-blue-950/40 text-slate-900 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Checkbox Icon */}
                    <div
                      data-testid={`branch-checkbox-${branch.id}`}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        isChecked
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>

                    <div className="flex flex-col min-w-0 leading-tight">
                      <span
                        className={`truncate text-xs ${
                          isChecked ? 'font-semibold' : 'font-medium'
                        }`}
                      >
                        {branch.name}
                      </span>
                    </div>
                  </div>

                  {/* "Only" Focus Pill on Hover or Single Active Indicator */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      data-testid={`branch-only-${branch.id}`}
                      onClick={(e) => handleSelectOnly(e, branch.id)}
                      className="opacity-80 hover:opacity-100 group-hover:opacity-100 rounded px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/60 hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                      title={`View only ${branch.name}`}
                    >
                      Only
                    </button>
                    {isSingleActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Multi-Select Indicator */}
          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 px-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>
              {isAllSelected
                ? 'All stores loaded'
                : `${selectedCount} of ${branches.length} stores active`}
            </span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              Live Unified View
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
