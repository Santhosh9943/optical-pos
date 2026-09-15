'use client';

import React from 'react';
import {
  Crown,
  User,
  Phone,
  Eye,
  UserPlus,
  Receipt,
  ChevronDown,
  Edit3,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import type { POSPatient } from '@/store/pos-store';
import type { PrescriptionValues } from './prescription-grid';

interface CompactPatientStripProps {
  selectedPatient: POSPatient | null;
  activePatients: POSPatient[];
  dynamicActivePatients: POSPatient[];
  currentRx?: PrescriptionValues | null;
  orderCount: number;
  onSwitchInvoiceAccount: (patientId: string) => void;
  onOpenAddFamilyModal: () => void;
  onExpandRx: () => void;
  onViewOrders: () => void;
}

export function CompactPatientStrip({
  selectedPatient,
  activePatients,
  dynamicActivePatients,
  currentRx,
  orderCount,
  onSwitchInvoiceAccount,
  onOpenAddFamilyModal,
  onExpandRx,
  onViewOrders,
}: CompactPatientStripProps) {
  if (!selectedPatient) {
    return (
      <div
        data-testid="compact-patient-strip-empty"
        className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 px-4 py-2.5 shadow-2xs backdrop-blur-xs transition"
      >
        <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          <span className="font-medium">No patient selected</span>
          <span className="hidden sm:inline text-slate-400 dark:text-slate-600">•</span>
          <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500">
            Search customer above or type mobile number to begin order
          </span>
        </div>
        <button
          type="button"
          onClick={onExpandRx}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition active:scale-95"
          title="Open Clinical Refraction workspace"
        >
          <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>Clinical Rx Matrix</span>
        </button>
      </div>
    );
  }

  // Format compact refraction string
  const formatEyePower = (
    sph?: number | string | null,
    cyl?: number | string | null,
    axis?: number | string | null
  ) => {
    if (sph === null && cyl === null && axis === null) return 'Plano';
    if (sph === undefined && cyl === undefined && axis === undefined) return 'Plano';
    const s =
      sph !== null && sph !== undefined
        ? Number(sph) > 0
          ? `+${sph}`
          : `${sph}`
        : '0.00';
    const c =
      cyl !== null && cyl !== undefined && Number(cyl) !== 0
        ? ` / ${Number(cyl) > 0 ? `+${cyl}` : cyl}`
        : '';
    const a = axis !== null && axis !== undefined && c ? `x${axis}°` : '';
    return `${s}${c}${a ? ` ${a}` : ''}`;
  };

  const odStr = formatEyePower(currentRx?.odSphere, currentRx?.odCylinder, currentRx?.odAxis);
  const osStr = formatEyePower(currentRx?.osSphere, currentRx?.osCylinder, currentRx?.osAxis);

  return (
    <div
      data-testid="compact-patient-strip"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 shadow-2xs transition"
    >
      {/* Left: Customer Info & Invoice Account */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Customer Badge */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 font-bold text-xs text-blue-700 dark:text-blue-300">
            {selectedPatient.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">
                {selectedPatient.fullName}
              </span>
              {selectedPatient.gender && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  ({selectedPatient.gender.charAt(0)}
                  {selectedPatient.age ? `, ${selectedPatient.age}` : ''})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-0.5">
                <Phone className="h-2.5 w-2.5" />
                <span>{selectedPatient.phone}</span>
              </span>
              {selectedPatient.city && (
                <>
                  <span>•</span>
                  <span>{selectedPatient.city}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Account Selector (Family Support) */}
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-1 text-xs">
          <Crown className="h-3 w-3 text-amber-500 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 hidden sm:inline">
            Invoice To:
          </span>
          {activePatients.length > 1 ? (
            <select
              id="select-invoice-account"
              data-testid="select-invoice-account"
              value={selectedPatient.id}
              onChange={(e) => onSwitchInvoiceAccount(e.target.value)}
              className="rounded-md border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-xs font-bold text-slate-900 dark:text-slate-100 shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              title="Change invoice account"
            >
              {dynamicActivePatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.relationType})
                </option>
              ))}
            </select>
          ) : (
            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
              {selectedPatient.fullName}
            </span>
          )}
        </div>

        {/* Prescription Summary Pill */}
        <button
          type="button"
          data-testid="btn-compact-rx-pill"
          onClick={onExpandRx}
          className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/40 px-2.5 py-1 text-xs text-blue-950 dark:text-blue-200 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 transition cursor-pointer"
          title="Click to view full Prescription Refraction Matrix"
        >
          <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium">
            <span className="font-semibold text-blue-700 dark:text-blue-300">OD:</span>
            <span>{odStr}</span>
            <span className="text-blue-300 dark:text-blue-700">|</span>
            <span className="font-semibold text-blue-700 dark:text-blue-300">OS:</span>
            <span>{osStr}</span>
            {currentRx?.odAdd && (
              <>
                <span className="text-blue-300 dark:text-blue-700">|</span>
                <span className="text-amber-700 dark:text-amber-400 font-bold">
                  Add +{currentRx.odAdd}
                </span>
              </>
            )}
          </div>
          <Edit3 className="h-3 w-3 text-blue-500 ml-0.5" />
        </button>
      </div>

      {/* Right: Actions & Past Purchases */}
      <div className="flex items-center gap-2">
        {/* Past Purchases Quick Trigger */}
        <button
          type="button"
          data-testid="btn-patient-past-purchases"
          onClick={onViewOrders}
          className="flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/60 dark:bg-purple-950/40 px-2.5 py-1 text-xs font-semibold text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition active:scale-95"
          title="View customer purchase history"
        >
          <Receipt className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <span>{orderCount} Orders</span>
        </button>

        {/* Add Family Member Button */}
        <button
          type="button"
          data-testid="add-family-member-btn"
          onClick={onOpenAddFamilyModal}
          className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition active:scale-95"
          title="Add family member to this bill"
        >
          <UserPlus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span className="hidden md:inline">+ Family Member</span>
        </button>

        {/* Expand / Open Full Clinical View Button */}
        <button
          type="button"
          data-testid="btn-expand-rx"
          onClick={onExpandRx}
          className="flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 transition active:scale-95"
          title="Switch to Split View or Clinical Rx Mode"
        >
          <Maximize2 className="h-3 w-3" />
          <span className="hidden lg:inline">Split / Rx View</span>
        </button>
      </div>
    </div>
  );
}
