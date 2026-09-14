'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Glasses,
  Layers,
  Eye,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import type { InventoryItem } from './inventory-search';
import type { POSPatient } from '@/store/pos-store';
import type { PrescriptionValues } from './prescription-grid';
import Decimal from 'decimal.js';

export interface SpectaclePairConfig {
  frameItem: InventoryItem;
  targetPatientId: string;
  isCustomerOwnFrame?: boolean;
  fittingNote?: string;
  includeLenses: boolean;
  lensSpecification?: {
    category?: 'OPHTHALMIC_LENS';
    lensType: 'SINGLE_VISION' | 'BIFOCAL' | 'PROGRESSIVE' | 'PHOTOCHROMIC' | 'BLUE_CUT' | 'PLANO';
    coating: 'NONE' | 'ANTI_REFLECTIVE' | 'SCRATCH_RESISTANT' | 'UV400' | 'HYDROPHOBIC' | 'BLUE_FILTER';
    lensMaterial: 'CR39' | 'POLYCARBONATE' | 'TRIVEX' | 'HIGH_INDEX_167' | 'HIGH_INDEX_174';
    description: string;
    unitPrice: string;
    taxRate: '5.00';
    hsnCode: '9001';
  };
  prescription?: PrescriptionValues;
}

interface SpectacleWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  frameItem: InventoryItem | null;
  activePatients: POSPatient[];
  selectedPatient: POSPatient | null;
  currentPrescriptions: Record<string, PrescriptionValues>;
  onConfirm: (config: SpectaclePairConfig) => void;
}

const LENS_TYPES = [
  {
    id: 'SINGLE_VISION',
    label: 'Single Vision',
    desc: 'For distance, reading, or computer viewing',
    basePrice: '1200.00',
  },
  {
    id: 'BLUE_CUT',
    label: 'Blue-Cut Digital',
    desc: 'UV400 + Blue light filter for screen work',
    basePrice: '1800.00',
  },
  {
    id: 'PROGRESSIVE',
    label: 'Progressive',
    desc: 'Seamless multi-focus: distance, intermediate & near',
    basePrice: '3500.00',
  },
  {
    id: 'BIFOCAL',
    label: 'D-Bifocal',
    desc: 'Traditional split vision with visible reading segment',
    basePrice: '2000.00',
  },
  {
    id: 'PHOTOCHROMIC',
    label: 'Photochromic',
    desc: 'Transitions: clear indoors, darkens in sunlight',
    basePrice: '2800.00',
  },
  {
    id: 'PLANO',
    label: 'Plano (Zero Power)',
    desc: 'Fashion & protective blue-filter lenses without correction',
    basePrice: '800.00',
  },
] as const;

const LENS_MATERIALS = [
  { id: 'CR39', label: 'CR-39 Standard (1.50)', index: '1.50' },
  { id: 'POLYCARBONATE', label: 'Polycarbonate (1.59)', index: '1.59' },
  { id: 'TRIVEX', label: 'Trivex Impact (1.53)', index: '1.53' },
  { id: 'HIGH_INDEX_167', label: 'High Index (1.67)', index: '1.67' },
  { id: 'HIGH_INDEX_174', label: 'Ultra Thin (1.74)', index: '1.74' },
] as const;

const LENS_COATINGS = [
  { id: 'ANTI_REFLECTIVE', label: 'Anti-Reflective (AR)' },
  { id: 'BLUE_FILTER', label: 'Blue Light Filter' },
  { id: 'UV400', label: 'UV400 Protection' },
  { id: 'HYDROPHOBIC', label: 'Hydrophobic (Water/Dust Repellent)' },
  { id: 'SCRATCH_RESISTANT', label: 'Scratch-Resistant Hard Coat' },
  { id: 'NONE', label: 'Standard Coating' },
] as const;

export function SpectacleWizardModal({
  isOpen,
  onClose,
  frameItem,
  activePatients,
  selectedPatient,
  currentPrescriptions,
  onConfirm,
}: SpectacleWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 State: Frame & Patient Assignment
  const [targetPatientId, setTargetPatientId] = useState<string>('');
  const [isCustomerOwnFrame, setIsCustomerOwnFrame] = useState(false);
  const [fittingNote, setFittingNote] = useState('');

  // Step 2 State: Lens Specs
  const [lensType, setLensType] = useState<typeof LENS_TYPES[number]['id']>('SINGLE_VISION');
  const [lensMaterial, setLensMaterial] = useState<typeof LENS_MATERIALS[number]['id']>('CR39');
  const [coating, setCoating] = useState<typeof LENS_COATINGS[number]['id']>('ANTI_REFLECTIVE');
  const [lensPrice, setLensPrice] = useState('1200.00');

  // Step 3 State: Power
  const [odSphere, setOdSphere] = useState<string>('0.00');
  const [odCylinder, setOdCylinder] = useState<string>('0.00');
  const [odAxis, setOdAxis] = useState<string>('');
  const [odAdd, setOdAdd] = useState<string>('');
  const [odPd, setOdPd] = useState<string>('31.5');

  const [osSphere, setOsSphere] = useState<string>('0.00');
  const [osCylinder, setOsCylinder] = useState<string>('0.00');
  const [osAxis, setOsAxis] = useState<string>('');
  const [osAdd, setOsAdd] = useState<string>('');
  const [osPd, setOsPd] = useState<string>('31.5');

  // Initialize target patient when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      const defaultPatientId = selectedPatient?.id || (activePatients[0]?.id ?? '');
      setTargetPatientId(defaultPatientId);
      setIsCustomerOwnFrame(false);
      setFittingNote('');

      // Populate Rx if patient already has one
      if (defaultPatientId && currentPrescriptions[defaultPatientId]) {
        loadPrescriptionIntoState(currentPrescriptions[defaultPatientId]);
      }
    }
  }, [isOpen, frameItem?.id]);

  const loadPrescriptionIntoState = (rx: PrescriptionValues) => {
    if (rx.odSphere !== null) setOdSphere(rx.odSphere.toFixed(2));
    if (rx.odCylinder !== null) setOdCylinder(rx.odCylinder.toFixed(2));
    if (rx.odAxis !== null) setOdAxis(rx.odAxis.toString());
    if (rx.odAdd !== null) setOdAdd(rx.odAdd.toFixed(2));
    if (rx.odPd !== null) setOdPd(rx.odPd.toFixed(1));

    if (rx.osSphere !== null) setOsSphere(rx.osSphere.toFixed(2));
    if (rx.osCylinder !== null) setOsCylinder(rx.osCylinder.toFixed(2));
    if (rx.osAxis !== null) setOsAxis(rx.osAxis.toString());
    if (rx.osAdd !== null) setOsAdd(rx.osAdd.toFixed(2));
    if (rx.osPd !== null) setOsPd(rx.osPd.toFixed(1));
  };

  if (!isOpen || !frameItem) return null;

  const handlePatientChange = (patientId: string) => {
    setTargetPatientId(patientId);
    if (currentPrescriptions[patientId]) {
      loadPrescriptionIntoState(currentPrescriptions[patientId]);
    }
  };

  const handleLensTypeChange = (typeId: typeof LENS_TYPES[number]['id']) => {
    setLensType(typeId);
    const found = LENS_TYPES.find((t) => t.id === typeId);
    if (found) setLensPrice(found.basePrice);
  };

  const handleAddFrameOnly = () => {
    onConfirm({
      frameItem,
      targetPatientId: targetPatientId || selectedPatient?.id || activePatients[0]?.id || '',
      isCustomerOwnFrame,
      fittingNote: isCustomerOwnFrame ? fittingNote : undefined,
      includeLenses: false,
    });
    onClose();
  };

  const handleFinishWizard = () => {
    const parseNum = (val: string) => {
      const p = parseFloat(val);
      return isNaN(p) ? null : p;
    };

    const parseIntNum = (val: string) => {
      const p = parseInt(val, 10);
      return isNaN(p) ? null : p;
    };

    const rxValues: PrescriptionValues = {
      odSphere: parseNum(odSphere),
      odCylinder: parseNum(odCylinder),
      odAxis: parseIntNum(odAxis),
      odAdd: parseNum(odAdd),
      odPd: parseNum(odPd),
      osSphere: parseNum(osSphere),
      osCylinder: parseNum(osCylinder),
      osAxis: parseIntNum(osAxis),
      osAdd: parseNum(osAdd),
      osPd: parseNum(osPd),
      binocularPd:
        parseNum(odPd) && parseNum(osPd)
          ? Math.round(((parseNum(odPd) || 0) + (parseNum(osPd) || 0)) * 10) / 10
          : null,
    };

    const selectedTypeObj = LENS_TYPES.find((t) => t.id === lensType);
    const selectedMatObj = LENS_MATERIALS.find((m) => m.id === lensMaterial);

    onConfirm({
      frameItem,
      targetPatientId: targetPatientId || selectedPatient?.id || activePatients[0]?.id || '',
      isCustomerOwnFrame,
      fittingNote: isCustomerOwnFrame ? fittingNote : undefined,
      includeLenses: true,
      lensSpecification: {
        category: 'OPHTHALMIC_LENS',
        lensType,
        coating,
        lensMaterial,
        description: `${selectedTypeObj?.label || 'Lens'} (${selectedMatObj?.index || '1.50'}) with ${coating.replace(/_/g, ' ')}`,
        unitPrice: new Decimal(lensPrice || '1200.00').toFixed(2),
        taxRate: '5.00',
        hsnCode: '9001',
      },
      prescription: rxValues,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        data-testid="spectacle-wizard-modal"
        className="relative z-50 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden font-sans text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header with 3-Step Wizard Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/80 dark:bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Glasses className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Spectacle Pair Builder
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Step {step} of 3: {step === 1 ? 'Frame & Patient' : step === 2 ? 'Lens Type & Coatings' : 'Refraction Power'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close wizard dialog"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shrink-0">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold transition border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              step === 1
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[10px]">
              1
            </span>
            <span>Frame Details</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold transition border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              step === 2
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[10px]">
              2
            </span>
            <span>Choose Lenses</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold transition border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              step === 3
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[10px]">
              3
            </span>
            <span>Refraction Power</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── STEP 1: FRAME & PATIENT SELECTION ── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Frame Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {frameItem.sku}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {frameItem.brand} {frameItem.model}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {frameItem.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                      ₹{Number(frameItem.sellingPrice).toFixed(2)}
                    </span>
                    <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Frame Price
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  <span>
                    SKU: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{frameItem.sku}</span>
                  </span>
                  <span>
                    In stock: <strong className="text-slate-900 dark:text-slate-100">{frameItem.stockQuantity}</strong>
                  </span>
                  {frameItem.hsnCode && (
                    <span>HSN: {frameItem.hsnCode}</span>
                  )}
                </div>
              </div>

              {/* Patient assignment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Assign to Family Member / Patient *
                </label>
                <select
                  data-testid="wizard-patient-select"
                  value={targetPatientId}
                  onChange={(e) => handlePatientChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {activePatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.relationType || (p.isPayer ? 'Current' : 'Family')})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  The spectacle pair and fitted lenses will be billed under this patient&apos;s record.
                </p>
              </div>

              {/* Customer's Own Frame Toggle */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isCustomerOwnFrame}
                    onChange={(e) => setIsCustomerOwnFrame(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Fit to Customer&apos;s Own Frame (Glazing / Lens Only)
                  </span>
                </label>

                {isCustomerOwnFrame && (
                  <input
                    type="text"
                    placeholder="Describe frame condition (e.g. Vintage rimless, slight scratch on left hinge)"
                    value={fittingNote}
                    onChange={(e) => setFittingNote(e.target.value)}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: LENS SELECTION & COATINGS ── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Lens Type Grid */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Select Lens Type *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {LENS_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleLensTypeChange(t.id)}
                      className={`flex flex-col text-left p-3 rounded-xl border transition ${
                        lensType === t.id
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{t.label}</span>
                        <span className="font-mono text-xs font-semibold">
                          ₹{t.basePrice}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                        {t.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lens Material / Index */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Lens Material & Refractive Index
                </label>
                <div className="flex flex-wrap gap-2">
                  {LENS_MATERIALS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setLensMaterial(m.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        lensMaterial === m.id
                          ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lens Coating */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Optical Coating
                </label>
                <div className="flex flex-wrap gap-2">
                  {LENS_COATINGS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCoating(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        coating === c.id
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3 flex items-center justify-between border border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Custom Lens Pair Price (₹):
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-mono">₹</span>
                  <input
                    type="number"
                    value={lensPrice}
                    onChange={(e) => setLensPrice(e.target.value)}
                    className="w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: REFRACTION POWER & CLINICAL MATRIX ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Entering Refraction for:{' '}
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {activePatients.find((p) => p.id === targetPatientId)?.fullName || 'Patient'}
                  </span>
                </div>
                {targetPatientId && currentPrescriptions[targetPatientId] && (
                  <button
                    type="button"
                    onClick={() =>
                      loadPrescriptionIntoState(currentPrescriptions[targetPatientId])
                    }
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Auto-fill from Clinical Matrix</span>
                  </button>
                )}
              </div>

              {/* Prescription Input Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 font-bold uppercase text-[10px] text-slate-500">
                      <th className="py-2 px-2 text-left">Eye</th>
                      <th className="py-2 px-1">Sphere (SPH)</th>
                      <th className="py-2 px-1">Cylinder (CYL)</th>
                      <th className="py-2 px-1">Axis (°)</th>
                      <th className="py-2 px-1">Add (ADD)</th>
                      <th className="py-2 px-1">Mono PD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {/* OD */}
                    <tr>
                      <td className="py-2.5 px-3 text-left font-bold text-blue-700 dark:text-blue-400 font-mono">
                        OD (Right)
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          data-testid="wizard-od-sphere"
                          value={odSphere}
                          onChange={(e) => setOdSphere(e.target.value)}
                          placeholder="0.00"
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-1 text-center font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          value={odCylinder}
                          onChange={(e) => setOdCylinder(e.target.value)}
                          placeholder="0.00"
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-1 text-center font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={odAxis}
                          onChange={(e) => setOdAxis(e.target.value)}
                          placeholder="180"
                          className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-1 text-center font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          value={odAdd}
                          onChange={(e) => setOdAdd(e.target.value)}
                          placeholder="—"
                          className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-1 text-center font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          value={odPd}
                          onChange={(e) => setOdPd(e.target.value)}
                          placeholder="31.5"
                          className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-1 text-center font-mono text-xs"
                        />
                      </td>
                    </tr>

                    {/* OS */}
                    <tr>
                      <td className="py-2.5 px-3 text-left font-bold text-indigo-700 dark:text-indigo-400 font-mono">
                        OS (Left)
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          data-testid="wizard-os-sphere"
                          value={osSphere}
                          onChange={(e) => setOsSphere(e.target.value)}
                          placeholder="0.00"
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-1 text-center font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          value={osCylinder}
                          onChange={(e) => setOsCylinder(e.target.value)}
                          placeholder="0.00"
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-1 text-center font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={osAxis}
                          onChange={(e) => setOsAxis(e.target.value)}
                          placeholder="180"
                          className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-1 text-center font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          value={osAdd}
                          onChange={(e) => setOsAdd(e.target.value)}
                          placeholder="—"
                          className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-1 text-center font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          value={osPd}
                          onChange={(e) => setOsPd(e.target.value)}
                          placeholder="31.5"
                          className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-1 text-center font-mono text-xs"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/40 p-3 text-[11px] text-blue-900 dark:text-blue-300 flex items-center gap-2 border border-blue-200 dark:border-blue-900">
                <Sparkles className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>
                  Adding this complete spectacle will bind the selected frame and optical lenses to the patient and auto-update the Clinical Matrix.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-3.5 bg-slate-50/90 dark:bg-slate-950/80 shrink-0">
          <div>
            {step === 1 && (
              <button
                type="button"
                data-testid="wizard-add-frame-only-btn"
                onClick={handleAddFrameOnly}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Add Frame Only (No Rx)
              </button>
            )}
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Cancel
            </button>

            {step < 3 ? (
              <button
                type="button"
                data-testid="wizard-next-step-btn"
                onClick={() => setStep((s) => (s + 1) as 2 | 3)}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-2xs"
              >
                <span>{step === 1 ? 'Next: Choose Lenses' : 'Next: Assign Power'}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                data-testid="confirm-spectacle-pair-btn"
                onClick={handleFinishWizard}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
              >
                <Check className="h-4 w-4" />
                <span>Add Spectacle Pair to Cart</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
