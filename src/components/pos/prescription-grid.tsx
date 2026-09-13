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
} from 'lucide-react';
import { isQuarterStep } from '@/lib/validators/prescription';

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

interface PrescriptionGridProps {
  value: PrescriptionValues;
  onChange: (value: PrescriptionValues) => void;
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
        className="flex h-7 w-6 items-center justify-center rounded border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 disabled:opacity-40"
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        className={`h-7 w-16 rounded border px-1 text-center font-mono text-xs font-semibold transition focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/20 disabled:bg-slate-50 disabled:text-slate-400 ${
          value !== null && !isAxis && !isPd && value < 0
            ? 'text-red-600 border-slate-300'
            : value !== null && !isAxis && !isPd && value > 0
            ? 'text-blue-700 border-slate-300'
            : 'text-slate-900 border-slate-200'
        }`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={handleIncrement}
        className="flex h-7 w-6 items-center justify-center rounded border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

export function PrescriptionGrid({ value, onChange }: PrescriptionGridProps) {
  const [showNotes, setShowNotes] = useState(false);

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

  // Validation feedback
  const odCylHasError = value.odCylinder !== null && value.odCylinder !== 0 && !value.odAxis;
  const osCylHasError = value.osCylinder !== null && value.osCylinder !== 0 && !value.osAxis;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center space-x-2">
          <Eye className="h-4 w-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Clinical Refraction Matrix (OD / OS)
          </h3>
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono text-blue-700">
            0.25 D Step
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={copyODtoOS}
            title="Copy Right Eye (OD) values to Left Eye (OS)"
            className="flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
          >
            <Copy className="h-3 w-3 text-slate-500" />
            <span>Copy OD → OS</span>
          </button>
          <button
            type="button"
            onClick={clearGrid}
            title="Reset prescription values"
            className="flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700 active:scale-95"
          >
            <RotateCcw className="h-3 w-3 text-slate-500" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Prescription Tabular Grid */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
              <th className="pb-2 pl-1 w-28">Eye</th>
              <th className="pb-2 text-center">Sphere (SPH)</th>
              <th className="pb-2 text-center">Cylinder (CYL)</th>
              <th className="pb-2 text-center">Axis (1–180°)</th>
              <th className="pb-2 text-center">Addition (ADD)</th>
              <th className="pb-2 text-center">Mono PD (mm)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* ROW 1: OD (Right Eye) */}
            <tr className="hover:bg-slate-50/50 transition">
              <td className="py-2 pl-1">
                <div className="flex items-center space-x-1.5">
                  <span className="flex h-5 w-7 items-center justify-center rounded bg-blue-100 font-mono text-[10px] font-bold text-blue-800">
                    OD
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
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
            <tr className="hover:bg-slate-50/50 transition">
              <td className="py-2 pl-1">
                <div className="flex items-center space-x-1.5">
                  <span className="flex h-5 w-7 items-center justify-center rounded bg-indigo-100 font-mono text-[10px] font-bold text-indigo-800">
                    OS
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
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
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
        <div className="flex items-center space-x-3 text-xs">
          <span className="font-semibold text-slate-700">Binocular PD:</span>
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
          <span className="text-slate-400 text-[11px]">mm</span>
        </div>

        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition"
        >
          <span>{showNotes ? 'Hide Clinical Notes' : 'Add Clinical Notes'}</span>
          {showNotes ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Expandable Clinical Notes & Remarks */}
      {showNotes && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-slate-700">
                Visual Acuity Notes
              </label>
              <input
                type="text"
                placeholder="e.g. OD 6/6, OS 6/9"
                value={value.visualAcuityNotes || ''}
                onChange={(e) => updateField('visualAcuityNotes', e.target.value)}
                className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">
                Prism Notes
              </label>
              <input
                type="text"
                placeholder="e.g. 1.5Δ Base Out OD"
                value={value.prismNotes || ''}
                onChange={(e) => updateField('prismNotes', e.target.value)}
                className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Clinical Remarks & Dispensing Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Patient prefers progressive corridor height 17mm; high photophobia, blue-cut recommended."
              value={value.clinicalRemarks || ''}
              onChange={(e) => updateField('clinicalRemarks', e.target.value)}
              className="w-full rounded border border-slate-200 p-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
