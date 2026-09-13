'use client';

import { useState, useEffect } from 'react';
import {
  Eye,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Copy,
  Info,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowLeft,
  Calendar,
  Save,
  Check,
  Clock,
  Loader2,
} from 'lucide-react';
import { isQuarterStep } from '@/lib/validators/prescription';
import type { PatientPrescriptionHistory } from '@/actions/patient-actions';

export interface PrescriptionValues {
  odSphere: number | null;
  odCylinder: number | null;
  odAxis: number | null;
  odAdd: number | null;
  odPd: number | null;
  osSphere: number | null;
  osCylinder: number | null;
  osAxis: number | null;
  osAdd: number | null;
  osPd: number | null;
  binocularPd: number | null;
  prismNotes?: string;
  visualAcuityNotes?: string;
  clinicalRemarks?: string;
}

export function historyToPrescriptionValues(
  item: PatientPrescriptionHistory
): PrescriptionValues {
  return {
    odSphere: item.odSphere ? parseFloat(item.odSphere) : null,
    odCylinder: item.odCylinder ? parseFloat(item.odCylinder) : null,
    odAxis: item.odAxis ?? null,
    odAdd: item.odAdd ? parseFloat(item.odAdd) : null,
    odPd: item.odPd ? parseFloat(item.odPd) : null,
    osSphere: item.osSphere ? parseFloat(item.osSphere) : null,
    osCylinder: item.osCylinder ? parseFloat(item.osCylinder) : null,
    osAxis: item.osAxis ?? null,
    osAdd: item.osAdd ? parseFloat(item.osAdd) : null,
    osPd: item.osPd ? parseFloat(item.osPd) : null,
    binocularPd: item.binocularPd ? parseFloat(item.binocularPd) : null,
    prismNotes: '',
    visualAcuityNotes: '',
    clinicalRemarks: item.clinicalRemarks || '',
  };
}

interface PrescriptionGridProps {
  value: PrescriptionValues;
  onChange: (value: PrescriptionValues) => void;
  patients?: Array<{
    id: string;
    fullName: string;
    relationType?: string;
  }>;
  activePatientId?: string | null;
  onSelectPatientTab?: (patientId: string) => void;
  prescriptionsMap?: Record<string, PrescriptionValues>;
  // Prescription history & Add new power props
  patientPrescriptionHistory?: PatientPrescriptionHistory[];
  isLoadingHistory?: boolean;
  isAddingNewPower?: boolean;
  onToggleAddNewPower?: (isAdding: boolean) => void;
  onSaveNewPower?: (rx: PrescriptionValues) => Promise<void>;
  onUsePrescriptionHistory?: (historyItem: PatientPrescriptionHistory) => void;
}

export const initialPrescriptionValues: PrescriptionValues = {
  odSphere: null,
  odCylinder: null,
  odAxis: null,
  odAdd: null,
  odPd: null,
  osSphere: null,
  osCylinder: null,
  osAxis: null,
  osAdd: null,
  osPd: null,
  binocularPd: null,
  prismNotes: '',
  visualAcuityNotes: '',
  clinicalRemarks: '',
};

function formatDioptre(val: number | null): string {
  if (val === null || isNaN(val)) return '';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}`;
}

function parseDioptre(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed === '+' || trimmed === '-') return null;
  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? null : parsed;
}

interface StepFieldProps {
  label?: string;
  value: number | null;
  onChange: (val: number | null) => void;
  step: number;
  min: number;
  max: number;
  placeholder?: string;
  isAxis?: boolean;
  isPd?: boolean;
  disabled?: boolean;
  dataTestId?: string;
  ariaLabel?: string;
}

function StepField({
  value,
  onChange,
  step,
  min,
  max,
  placeholder = '0.00',
  isAxis = false,
  isPd = false,
  disabled = false,
  dataTestId,
  ariaLabel,
}: StepFieldProps) {
  const [text, setText] = useState<string>('');

  useEffect(() => {
    if (value === null) {
      setText('');
    } else if (isAxis) {
      setText(value.toString());
    } else if (isPd) {
      setText(value.toFixed(1));
    } else {
      setText(formatDioptre(value));
    }
  }, [value, isAxis, isPd]);

  const handleIncrement = () => {
    if (disabled) return;
    let next: number;
    if (value === null) {
      next = isAxis ? 90 : isPd ? 32 : step;
    } else {
      next = Math.round((value + step) * 100) / 100;
    }
    if (next <= max) {
      onChange(next);
    }
  };

  const handleDecrement = () => {
    if (disabled) return;
    let next: number;
    if (value === null) {
      next = isAxis ? 90 : isPd ? 32 : -step;
    } else {
      next = Math.round((value - step) * 100) / 100;
    }
    if (next >= min) {
      onChange(next);
    }
  };

  const handleBlur = () => {
    if (!text.trim()) {
      onChange(null);
      return;
    }
    const parsed = parseDioptre(text);
    if (parsed !== null && !isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      const rounded = Math.round(clamped / step) * step;
      const finalVal = Math.round(rounded * 100) / 100;
      onChange(finalVal);
    } else {
      onChange(null);
    }
  };

  return (
    <div className="flex items-center space-x-1">
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={handleDecrement}
        className="flex h-7 w-6 items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 active:bg-slate-200 dark:active:bg-slate-600 disabled:opacity-40"
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        data-testid={dataTestId}
        aria-label={ariaLabel}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        className={`h-7 w-16 rounded border px-1 text-center font-mono text-xs font-semibold transition focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/20 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 bg-white dark:bg-slate-900 ${
          value !== null && !isAxis && !isPd && value < 0
            ? 'text-red-600 dark:text-red-400 border-slate-300 dark:border-slate-700'
            : value !== null && !isAxis && !isPd && value > 0
            ? 'text-blue-700 dark:text-blue-400 border-slate-300 dark:border-slate-700'
            : 'text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700'
        }`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={handleIncrement}
        className="flex h-7 w-6 items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 active:bg-slate-200 dark:active:bg-slate-600 disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

export function PrescriptionGrid({
  value,
  onChange,
  patients,
  activePatientId,
  onSelectPatientTab,
  prescriptionsMap,
  patientPrescriptionHistory,
  isLoadingHistory = false,
  isAddingNewPower = false,
  onToggleAddNewPower,
  onSaveNewPower,
  onUsePrescriptionHistory,
}: PrescriptionGridProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasHistory = !!(
    patientPrescriptionHistory && patientPrescriptionHistory.length > 0
  );
  // Show history view if history exists and user has not clicked "+ Add New Power"
  const showHistoryView = hasHistory && !isAddingNewPower;

  const updateField = <K extends keyof PrescriptionValues>(
    field: K,
    val: PrescriptionValues[K]
  ) => {
    const updated = { ...value, [field]: val };

    // Auto-fill AXIS to 180 if CYL is changed from 0/null to non-zero and AXIS is empty
    if (field === 'odCylinder' && val !== null && val !== 0 && !value.odAxis) {
      updated.odAxis = 180;
    }
    if (field === 'osCylinder' && val !== null && val !== 0 && !value.osAxis) {
      updated.osAxis = 180;
    }

    // Auto-clear AXIS if CYL is set to 0 or null
    if (field === 'odCylinder' && (val === 0 || val === null)) {
      updated.odAxis = null;
    }
    if (field === 'osCylinder' && (val === 0 || val === null)) {
      updated.osAxis = null;
    }

    // Recalculate binocular PD if both monoculars exist
    if (field === 'odPd' || field === 'osPd') {
      const od = field === 'odPd' ? (val as number | null) : value.odPd;
      const os = field === 'osPd' ? (val as number | null) : value.osPd;
      if (od !== null && os !== null) {
        updated.binocularPd = Math.round((od + os) * 10) / 10;
      }
    }

    onChange(updated);
  };

  const copyODtoOS = () => {
    onChange({
      ...value,
      osSphere: value.odSphere,
      osCylinder: value.odCylinder,
      osAxis: value.odAxis,
      osAdd: value.odAdd,
      osPd: value.odPd,
    });
  };

  const clearGrid = () => {
    onChange(initialPrescriptionValues);
  };

  const handleSaveNewPower = async () => {
    if (!onSaveNewPower) return;
    setIsSaving(true);
    try {
      await onSaveNewPower(value);
    } finally {
      setIsSaving(false);
    }
  };

  // Validation feedback
  const odCylHasError =
    value.odCylinder !== null && value.odCylinder !== 0 && !value.odAxis;
  const osCylHasError =
    value.osCylinder !== null && value.osCylinder !== 0 && !value.osAxis;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
      {/* Multi-Family Patient Tabs (Always accessible) */}
      {patients && patients.length > 1 && (
        <div className="flex items-center gap-1.5 p-1 mb-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
          {patients.map((p) => {
            const isActive = p.id === activePatientId;
            const rx = prescriptionsMap?.[p.id];
            const isFilled =
              rx &&
              (rx.odSphere !== null ||
                rx.osSphere !== null ||
                rx.odCylinder !== null ||
                rx.osCylinder !== null);

            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-testid="rx-patient-tab"
                onClick={() => onSelectPatientTab?.(p.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span>{p.fullName}</span>
                <span className="text-[10px] opacity-75 font-normal">
                  ({p.relationType || 'Current'})
                </span>
                {isFilled && (
                  <span
                    className="h-2 w-2 rounded-full bg-emerald-500"
                    title="Prescription entered"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODE A: Prescription History List View
          ───────────────────────────────────────────────────────────── */}
      {showHistoryView ? (
        <div data-testid="prescription-history-container" className="space-y-3">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Prescription History
              </h3>
              <span className="rounded bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 text-[10px] font-mono text-blue-700 dark:text-blue-300">
                {patientPrescriptionHistory?.length}{' '}
                {patientPrescriptionHistory?.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            <button
              type="button"
              data-testid="btn-add-new-power"
              onClick={() => onToggleAddNewPower?.(true)}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add New Power</span>
            </button>
          </div>

          {/* History Cards List */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
            {patientPrescriptionHistory?.map((item, idx) => {
              const isFirst = idx === 0;
              const formattedDate = new Date(item.prescribedAt).toLocaleDateString(
                'en-IN',
                {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }
              );

              return (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 transition ${
                    isFirst
                      ? 'border-blue-200 dark:border-blue-800/80 bg-blue-50/20 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {formattedDate}
                      </span>
                      {isFirst && (
                        <span className="rounded bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          #1 Latest Rx
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      data-testid="btn-use-rx-history"
                      onClick={() => onUsePrescriptionHistory?.(item)}
                      className="flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition active:scale-95"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Use in Order</span>
                    </button>
                  </div>

                  {/* OD/OS Compact Metric Table */}
                  <div className="mt-2 text-xs">
                    <div className="grid grid-cols-6 text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                      <span>Eye</span>
                      <span className="text-center">SPH</span>
                      <span className="text-center">CYL</span>
                      <span className="text-center">AXIS</span>
                      <span className="text-center">ADD</span>
                      <span className="text-center">PD</span>
                    </div>

                    {/* OD Row */}
                    <div className="grid grid-cols-6 items-center py-1 text-xs font-mono">
                      <span className="font-bold text-blue-600 dark:text-blue-400 font-sans text-[11px]">
                        OD (Right)
                      </span>
                      <span className="text-center font-semibold text-slate-800 dark:text-slate-200">
                        {item.odSphere ? (parseFloat(item.odSphere) > 0 ? `+${item.odSphere}` : item.odSphere) : '0.00'}
                      </span>
                      <span className="text-center text-slate-700 dark:text-slate-300">
                        {item.odCylinder ? (parseFloat(item.odCylinder) > 0 ? `+${item.odCylinder}` : item.odCylinder) : '—'}
                      </span>
                      <span className="text-center text-slate-700 dark:text-slate-300">
                        {item.odAxis ? `${item.odAxis}°` : '—'}
                      </span>
                      <span className="text-center text-slate-700 dark:text-slate-300">
                        {item.odAdd ? `+${item.odAdd}` : '—'}
                      </span>
                      <span className="text-center text-slate-700 dark:text-slate-300">
                        {item.odPd ? `${item.odPd}mm` : '—'}
                      </span>
                    </div>

                    {/* OS Row */}
                    <div className="grid grid-cols-6 items-center py-1 text-xs font-mono border-t border-slate-100 dark:border-slate-800/40">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 font-sans text-[11px]">
                        OS (Left)
                      </span>
                      <span className="text-center font-semibold text-slate-800 dark:text-slate-200">
                        {item.osSphere ? (parseFloat(item.osSphere) > 0 ? `+${item.osSphere}` : item.osSphere) : '0.00'}
                      </span>
                      <span className="text-center text-slate-700 dark:text-slate-300">
                        {item.osCylinder ? (parseFloat(item.osCylinder) > 0 ? `+${item.osCylinder}` : item.osCylinder) : '—'}
                      </span>
                      <span className="text-center text-slate-700 dark:text-slate-300">
                        {item.osAxis ? `${item.osAxis}°` : '—'}
                      </span>
                      <span className="text-center text-slate-700 dark:text-slate-300">
                        {item.osAdd ? `+${item.osAdd}` : '—'}
                      </span>
                      <span className="text-center text-slate-700 dark:text-slate-300">
                        {item.osPd ? `${item.osPd}mm` : '—'}
                      </span>
                    </div>
                  </div>

                  {item.clinicalRemarks && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400 italic">
                      Remarks: {item.clinicalRemarks}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
           MODE B: Clinical Refraction Matrix (OD / OS Input)
           ───────────────────────────────────────────────────────────── */
        <div data-testid="prescription-matrix">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                {hasHistory ? 'Record New Clinical Refraction' : 'Clinical Refraction Matrix (OD / OS)'}
              </h3>
              <span className="rounded bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 text-[10px] font-mono text-blue-700 dark:text-blue-300">
                0.25 D Step
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {hasHistory && (
                <button
                  type="button"
                  data-testid="btn-back-to-history"
                  onClick={() => onToggleAddNewPower?.(false)}
                  className="flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 active:scale-95"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>View History ({patientPrescriptionHistory.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={copyODtoOS}
                title="Copy Right Eye (OD) values to Left Eye (OS)"
                className="flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 active:scale-95"
              >
                <Copy className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                <span>Copy OD → OS</span>
              </button>
              <button
                type="button"
                onClick={clearGrid}
                title="Reset prescription values"
                className="flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-400 active:scale-95"
              >
                <RotateCcw className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Prescription Tabular Grid */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  <th className="pb-2 pl-1 w-28">Eye</th>
                  <th className="pb-2 text-center">Sphere (SPH)</th>
                  <th className="pb-2 text-center">Cylinder (CYL)</th>
                  <th className="pb-2 text-center">Axis (1–180°)</th>
                  <th className="pb-2 text-center">Addition (ADD)</th>
                  <th className="pb-2 text-center">Mono PD (mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* ROW 1: OD (Right Eye) */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-2 pl-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="flex h-5 w-7 items-center justify-center rounded bg-blue-100 dark:bg-blue-950 font-mono text-[10px] font-bold text-blue-800 dark:text-blue-300">
                        OD
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Right Eye
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-1 text-center">
                    <StepField
                      value={value.odSphere}
                      onChange={(v) => updateField('odSphere', v)}
                      step={0.25}
                      min={-20}
                      max={20}
                      placeholder="0.00"
                      dataTestId="od-sphere-input"
                      ariaLabel="Right Eye Sphere"
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <StepField
                      value={value.odCylinder}
                      onChange={(v) => updateField('odCylinder', v)}
                      step={0.25}
                      min={-6}
                      max={6}
                      placeholder="0.00"
                      dataTestId="od-cylinder-input"
                      ariaLabel="Right Eye Cylinder"
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <div className="relative inline-block">
                      <StepField
                        value={value.odAxis}
                        onChange={(v) => updateField('odAxis', v)}
                        step={1}
                        min={1}
                        max={180}
                        placeholder="—"
                        isAxis
                        disabled={value.odCylinder === null || value.odCylinder === 0}
                        dataTestId="od-axis-input"
                        ariaLabel="Right Eye Axis"
                      />
                      {odCylHasError && (
                        <span
                          title="Axis is required when Cylinder is non-zero"
                          className="absolute -top-1 -right-1 text-red-500"
                        >
                          <AlertCircle className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-1 text-center">
                    <StepField
                      value={value.odAdd}
                      onChange={(v) => updateField('odAdd', v)}
                      step={0.25}
                      min={0.75}
                      max={4.0}
                      placeholder="—"
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <StepField
                      value={value.odPd}
                      onChange={(v) => updateField('odPd', v)}
                      step={0.5}
                      min={20}
                      max={45}
                      placeholder="31.5"
                      isPd
                    />
                  </td>
                </tr>

                {/* ROW 2: OS (Left Eye) */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-2 pl-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="flex h-5 w-7 items-center justify-center rounded bg-indigo-100 dark:bg-indigo-950 font-mono text-[10px] font-bold text-indigo-800 dark:text-indigo-300">
                        OS
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Left Eye
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-1 text-center">
                    <StepField
                      value={value.osSphere}
                      onChange={(v) => updateField('osSphere', v)}
                      step={0.25}
                      min={-20}
                      max={20}
                      placeholder="0.00"
                      dataTestId="os-sphere-input"
                      ariaLabel="Left Eye Sphere"
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <StepField
                      value={value.osCylinder}
                      onChange={(v) => updateField('osCylinder', v)}
                      step={0.25}
                      min={-6}
                      max={6}
                      placeholder="0.00"
                      dataTestId="os-cylinder-input"
                      ariaLabel="Left Eye Cylinder"
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <div className="relative inline-block">
                      <StepField
                        value={value.osAxis}
                        onChange={(v) => updateField('osAxis', v)}
                        step={1}
                        min={1}
                        max={180}
                        placeholder="—"
                        isAxis
                        disabled={value.osCylinder === null || value.osCylinder === 0}
                        dataTestId="os-axis-input"
                        ariaLabel="Left Eye Axis"
                      />
                      {osCylHasError && (
                        <span
                          title="Axis is required when Cylinder is non-zero"
                          className="absolute -top-1 -right-1 text-red-500"
                        >
                          <AlertCircle className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-1 text-center">
                    <StepField
                      value={value.osAdd}
                      onChange={(v) => updateField('osAdd', v)}
                      step={0.25}
                      min={0.75}
                      max={4.0}
                      placeholder="—"
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <StepField
                      value={value.osPd}
                      onChange={(v) => updateField('osPd', v)}
                      step={0.5}
                      min={20}
                      max={45}
                      placeholder="31.5"
                      isPd
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Binocular PD & Secondary Metrics */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5">
            <div className="flex items-center space-x-3 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Binocular PD:
              </span>
              <div className="w-32">
                <StepField
                  value={value.binocularPd}
                  onChange={(v) => updateField('binocularPd', v)}
                  step={0.5}
                  min={40}
                  max={80}
                  placeholder="63.0"
                  isPd
                />
              </div>
              <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                mm
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
              >
                <span>{showNotes ? 'Hide Clinical Notes' : 'Add Clinical Notes'}</span>
                {showNotes ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {onSaveNewPower && activePatientId && (
                <button
                  type="button"
                  data-testid="btn-save-new-power"
                  disabled={isSaving}
                  onClick={handleSaveNewPower}
                  className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>Save & Apply New Power</span>
                </button>
              )}
            </div>
          </div>

          {/* Expandable Clinical Notes & Remarks */}
          {showNotes && (
            <div className="mt-3 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                    Visual Acuity Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. OD 6/6, OS 6/9"
                    value={value.visualAcuityNotes || ''}
                    onChange={(e) => updateField('visualAcuityNotes', e.target.value)}
                    className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                    Prism Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1.5Δ Base Out OD"
                    value={value.prismNotes || ''}
                    onChange={(e) => updateField('prismNotes', e.target.value)}
                    className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                  Clinical Remarks & Dispensing Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Patient prefers progressive corridor height 17mm; high photophobia, blue-cut recommended."
                  value={value.clinicalRemarks || ''}
                  onChange={(e) => updateField('clinicalRemarks', e.target.value)}
                  className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
