'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Glasses,
  Sun,
  Eye,
  Layers,
  ArrowLeft,
  Check,
  Search,
  Plus,
  Loader2,
  Sparkles,
  ShieldCheck,
  Package,
  FileText,
  AlertCircle,
  Monitor,
} from 'lucide-react';
import Decimal from 'decimal.js';
import type { InventoryItem } from './inventory-search';
import type { POSPatient } from '@/store/pos-store';
import type { PrescriptionValues } from './prescription-grid';
import type { CartItem } from './billing-cart';
import type { SpectaclePairConfig } from './spectacle-wizard-modal';

export type ProductCategory =
  | 'POWER_GLASSES'
  | 'BLUE_CUT'
  | 'SUNGLASSES'
  | 'CONTACT_LENSES'
  | 'LENS_ONLY'
  | 'FRAME_ONLY';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePatients: POSPatient[];
  selectedPatient: POSPatient | null;
  currentPrescriptions: Record<string, PrescriptionValues>;
  onAddCartItem: (item: CartItem) => void;
  onAddInventoryItem: (item: InventoryItem, targetPatientId?: string | null) => void;
  onConfigureSpectaclePair: (config: SpectaclePairConfig) => void;
}

const CATEGORIES: Array<{
  id: ProductCategory;
  title: string;
  subtitle: string;
  badge: string;
  icon: typeof Glasses;
  color: string;
}> = [
  {
    id: 'POWER_GLASSES',
    title: 'Power Glasses',
    subtitle: 'Frame + Prescription Lenses (Single Vision, Progressive, Bifocal)',
    badge: 'Complete Spectacles',
    icon: Glasses,
    color: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'BLUE_CUT',
    title: 'Blue-Cut Glasses',
    subtitle: 'Screen & anti-fatigue lenses (Zero power plano or prescription)',
    badge: 'Digital Defense',
    icon: Monitor,
    color: 'from-cyan-600 to-blue-600',
  },
  {
    id: 'SUNGLASSES',
    title: 'Sunglasses',
    subtitle: 'UV400 & Polarized designer sunglasses from active catalog',
    badge: 'Direct Add',
    icon: Sun,
    color: 'from-amber-600 to-orange-600',
  },
  {
    id: 'CONTACT_LENSES',
    title: 'Contact Lenses',
    subtitle: 'Daily, bi-weekly & monthly packs with BC, DIA & dioptres',
    badge: 'Clinical Fit',
    icon: Eye,
    color: 'from-emerald-600 to-teal-600',
  },
  {
    id: 'LENS_ONLY',
    title: 'Lens Only (Customer Frame)',
    subtitle: 'Customer brings own frame; customize lenses and fitting notes',
    badge: 'Re-glaze / Custom',
    icon: Layers,
    color: 'from-purple-600 to-indigo-600',
  },
  {
    id: 'FRAME_ONLY',
    title: 'Frame Only (Plano / Direct)',
    subtitle: 'Direct frame purchase without prescription lenses',
    badge: 'No Power',
    icon: Package,
    color: 'from-slate-700 to-slate-900',
  },
];

export function AddProductModal({
  isOpen,
  onClose,
  activePatients,
  selectedPatient,
  currentPrescriptions,
  onAddCartItem,
  onAddInventoryItem,
  onConfigureSpectaclePair,
}: AddProductModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);

  // Search & Catalog State
  const [catalogItems, setCatalogItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Target patient assignment
  const [targetPatientId, setTargetPatientId] = useState<string>(
    selectedPatient?.id || activePatients[0]?.id || ''
  );

  // Workflow states
  // 1. Power Glasses / Blue-cut
  const [selectedFrame, setSelectedFrame] = useState<InventoryItem | null>(null);
  const [lensType, setLensType] = useState<string>('SINGLE_VISION');
  const [lensMaterial, setLensMaterial] = useState<string>('CR39');
  const [lensCoating, setLensCoating] = useState<string>('ANTI_REFLECTIVE');
  const [lensPrice, setLensPrice] = useState<string>('1200.00');
  const [isPlano, setIsPlano] = useState<boolean>(false);

  // 2. Lens Only (Customer's Own Frame)
  const [customerFrameMake, setCustomerFrameMake] = useState('');
  const [fittingInstructions, setFittingInstructions] = useState('');

  // 3. Contact Lens
  const [selectedContactLens, setSelectedContactLens] = useState<InventoryItem | null>(null);
  const [clOdSphere, setClOdSphere] = useState<string>('-2.00');
  const [clOsSphere, setClOsSphere] = useState<string>('-2.00');
  const [clBaseCurve, setClBaseCurve] = useState<string>('8.5');
  const [clDiameter, setClDiameter] = useState<string>('14.2');
  const [clBoxes, setClBoxes] = useState<number>(1);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(null);
      setSelectedFrame(null);
      setSelectedContactLens(null);
      setSearchQuery('');
      setCustomerFrameMake('');
      setFittingInstructions('');
      setTargetPatientId(selectedPatient?.id || activePatients[0]?.id || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Load catalog items when a category requiring catalog browsing is chosen
  useEffect(() => {
    if (!selectedCategory) return;

    let catFilter = '';
    if (selectedCategory === 'POWER_GLASSES' || selectedCategory === 'FRAME_ONLY' || selectedCategory === 'BLUE_CUT') {
      catFilter = 'FRAME';
    } else if (selectedCategory === 'SUNGLASSES') {
      catFilter = 'SUNGLASS';
    } else if (selectedCategory === 'CONTACT_LENSES') {
      catFilter = 'CONTACT_LENS';
    }

    if (!catFilter) return;

    const fetchCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        const queryParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : '';
        const res = await fetch(`/api/inventory/search?category=${catFilter}${queryParam}`);
        if (res.ok) {
          const data = await res.json();
          setCatalogItems(data.items || []);
        }
      } catch (err) {
        console.error('[AddProductModal] Catalog fetch error:', err);
      } finally {
        setIsLoadingCatalog(false);
      }
    };

    fetchCatalog();
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  // ── CONFIRM ACTIONS ──

  // 1. Sunglasses direct add
  const handleAddSunglass = (item: InventoryItem) => {
    onAddInventoryItem(item, targetPatientId || null);
    onClose();
  };

  // 2. Frame only direct add
  const handleAddFrameOnly = (item: InventoryItem) => {
    onAddInventoryItem(item, targetPatientId || null);
    onClose();
  };

  // 3. Power Glasses confirm
  const handleConfirmPowerGlasses = () => {
    if (!selectedFrame) return;

    const config: SpectaclePairConfig = {
      frameItem: selectedFrame,
      targetPatientId: targetPatientId || selectedPatient?.id || '',
      includeLenses: true,
      lensSpecification: {
        category: 'OPHTHALMIC_LENS',
        lensType: lensType as any,
        coating: lensCoating as any,
        lensMaterial: lensMaterial as any,
        description: `${lensType.replace('_', ' ')} (${lensMaterial}) - ${lensCoating.replace('_', ' ')}`,
        unitPrice: lensPrice,
        taxRate: '5.00',
        hsnCode: '9001',
      },
      prescription: targetPatientId ? currentPrescriptions[targetPatientId] : undefined,
    };

    onConfigureSpectaclePair(config);
    onClose();
  };

  // 4. Blue-Cut confirm
  const handleConfirmBlueCut = () => {
    if (!selectedFrame) return;

    const config: SpectaclePairConfig = {
      frameItem: selectedFrame,
      targetPatientId: targetPatientId || selectedPatient?.id || '',
      includeLenses: true,
      lensSpecification: {
        category: 'OPHTHALMIC_LENS',
        lensType: isPlano ? 'PLANO' : 'BLUE_CUT',
        coating: 'BLUE_FILTER',
        lensMaterial: lensMaterial as any,
        description: `Blue-Cut Digital Protection Lens (${isPlano ? 'Plano 0.00' : 'Powered'})`,
        unitPrice: lensPrice || '1800.00',
        taxRate: '5.00',
        hsnCode: '9001',
      },
      prescription: !isPlano && targetPatientId ? currentPrescriptions[targetPatientId] : undefined,
    };

    onConfigureSpectaclePair(config);
    onClose();
  };

  // 5. Lens Only (Customer's Own Frame) confirm
  const handleConfirmLensOnly = () => {
    const frameId = crypto.randomUUID();
    const customerFrameItem: CartItem = {
      id: frameId,
      inventoryItemId: null,
      sku: 'CUST-FRAME',
      description: `Customer Frame: ${customerFrameMake || 'Own Frame'} [Glazing / Fit]`,
      category: 'FRAME',
      hsnCode: '9003',
      quantity: 1,
      unitPrice: '0.00',
      discount: '0.00',
      taxRate: '0.00',
      patientId: targetPatientId || null,
      isCustomerOwnFrame: true,
      fittingNote: fittingInstructions || 'Customer own frame re-glaze',
    };

    const lensItem: CartItem = {
      id: crypto.randomUUID(),
      inventoryItemId: null,
      sku: `LENS-${lensType}-${lensMaterial}`,
      description: `Lab Custom: ${lensType.replace('_', ' ')} (${lensMaterial}) — ${lensCoating.replace('_', ' ')}`,
      category: 'OPHTHALMIC_LENS',
      hsnCode: '9001',
      quantity: 1,
      unitPrice: lensPrice || '1500.00',
      discount: '0.00',
      taxRate: '5.00',
      lensType,
      coating: lensCoating,
      lensMaterial,
      patientId: targetPatientId || null,
      prescriptionId: targetPatientId || null,
    };

    onAddCartItem(customerFrameItem);
    onAddCartItem(lensItem);
    onClose();
  };

  // 6. Contact Lens confirm
  const handleConfirmContactLens = () => {
    if (!selectedContactLens) return;

    const item: CartItem = {
      id: crypto.randomUUID(),
      inventoryItemId: selectedContactLens.id,
      sku: selectedContactLens.sku,
      description: `${selectedContactLens.brand || ''} ${selectedContactLens.model || 'Contact Lens'} (OD: ${clOdSphere}, OS: ${clOsSphere}, BC: ${clBaseCurve}, DIA: ${clDiameter})`,
      category: 'CONTACT_LENS',
      hsnCode: selectedContactLens.hsnCode || '9001',
      quantity: clBoxes,
      unitPrice: selectedContactLens.sellingPrice,
      discount: '0.00',
      taxRate: selectedContactLens.taxRate || '18.00',
      patientId: targetPatientId || null,
      fittingNote: `BC ${clBaseCurve} | DIA ${clDiameter} | OD ${clOdSphere} | OS ${clOsSphere}`,
    };

    onAddCartItem(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center space-x-3">
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {selectedCategory
                  ? CATEGORIES.find((c) => c.id === selectedCategory)?.title
                  : 'Add Product to Cart'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedCategory
                  ? CATEGORIES.find((c) => c.id === selectedCategory)?.subtitle
                  : 'Select a product category to launch its specialized dispensing flow'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Target Patient Selector */}
            {activePatients.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">For:</span>
                <select
                  value={targetPatientId}
                  onChange={(e) => setTargetPatientId(e.target.value)}
                  className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  {activePatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.relationType || 'Current'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ─────────────────────────────────────────────────────────────
              VIEW 1: Category Dispatcher Grid
              ───────────────────────────────────────────────────────────── */}
          {!selectedCategory && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    data-testid={`category-btn-${cat.id.toLowerCase()}`}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      if (cat.id === 'BLUE_CUT') {
                        setLensType('BLUE_CUT');
                        setLensCoating('BLUE_FILTER');
                        setLensPrice('1800.00');
                      } else if (cat.id === 'POWER_GLASSES') {
                        setLensType('SINGLE_VISION');
                        setLensCoating('ANTI_REFLECTIVE');
                        setLensPrice('1200.00');
                      }
                    }}
                    className="group relative flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left transition hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} text-white shadow-sm group-hover:scale-110 transition`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {cat.badge}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {cat.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {cat.subtitle}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <span>Launch Step Flow</span>
                      <span>→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW 2: Category Workflows
              ───────────────────────────────────────────────────────────── */}

          {/* 1. POWER GLASSES FLOW */}
          {selectedCategory === 'POWER_GLASSES' && (
            <div className="space-y-6">
              {/* Step 1: Select Frame */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-2">
                  Step 1: Select Spectacle Frame from Inventory
                </label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search frames by brand, model or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {isLoadingCatalog ? (
                    <div className="col-span-2 py-6 text-center text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </div>
                  ) : catalogItems.length > 0 ? (
                    catalogItems.map((item) => {
                      const isSelected = selectedFrame?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedFrame(item)}
                          className={`cursor-pointer rounded-lg border p-3 flex items-center justify-between transition ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                              {item.brand} {item.model}
                            </span>
                            <span className="block text-[11px] font-mono text-slate-400">
                              SKU: {item.sku} · Stock: {item.stockQuantity}
                            </span>
                          </div>
                          <span className="font-bold font-mono text-xs text-blue-600 dark:text-blue-400">
                            ₹{item.sellingPrice}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 py-6 text-center text-xs text-slate-400">
                      No frames found.
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Lens Specification */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block">
                  Step 2: Choose Prescription Lens Type & Material
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Lens Type
                    </label>
                    <select
                      value={lensType}
                      onChange={(e) => setLensType(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="SINGLE_VISION">Single Vision (₹1,200)</option>
                      <option value="PROGRESSIVE">Progressive (₹3,500)</option>
                      <option value="BIFOCAL">D-Bifocal (₹2,000)</option>
                      <option value="PHOTOCHROMIC">Photochromic (₹2,800)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Material Index
                    </label>
                    <select
                      value={lensMaterial}
                      onChange={(e) => setLensMaterial(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="CR39">CR-39 Standard (1.50)</option>
                      <option value="POLYCARBONATE">Polycarbonate (1.59)</option>
                      <option value="HIGH_INDEX_167">High Index (1.67)</option>
                      <option value="HIGH_INDEX_174">Ultra Thin (1.74)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Lens Price (₹)
                    </label>
                    <input
                      type="text"
                      value={lensPrice}
                      onChange={(e) => setLensPrice(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-power-glasses"
                  disabled={!selectedFrame}
                  onClick={handleConfirmPowerGlasses}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>Add Frame + Lenses to Cart</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. BLUE-CUT GLASSES FLOW */}
          {selectedCategory === 'BLUE_CUT' && (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-2">
                  Select Frame for Blue-Cut Glasses
                </label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search frames..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {catalogItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedFrame(item)}
                      className={`cursor-pointer rounded-lg border p-3 flex items-center justify-between transition ${
                        selectedFrame?.id === item.id
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {item.brand} {item.model}
                        </span>
                        <span className="block text-[11px] font-mono text-slate-400">
                          SKU: {item.sku}
                        </span>
                      </div>
                      <span className="font-bold font-mono text-xs text-blue-600">
                        ₹{item.sellingPrice}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Power Mode Toggle */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-3">
                  Lens Power Mode
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="bluecut_mode"
                      checked={isPlano}
                      onChange={() => setIsPlano(true)}
                      className="text-blue-600"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Plano (Zero Power) — Screen Protection Only
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="bluecut_mode"
                      checked={!isPlano}
                      onChange={() => setIsPlano(false)}
                      className="text-blue-600"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      With Prescription Power (OD/OS Refraction)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-bluecut"
                  disabled={!selectedFrame}
                  onClick={handleConfirmBlueCut}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>Add Blue-Cut Glasses</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. SUNGLASSES FLOW */}
          {selectedCategory === 'SUNGLASSES' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search sunglasses by brand or model..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {isLoadingCatalog ? (
                  <div className="col-span-2 py-8 text-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </div>
                ) : catalogItems.length > 0 ? (
                  catalogItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 flex flex-col justify-between hover:border-blue-400 transition"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {item.brand} {item.model}
                          </span>
                          <span className="rounded bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            UV400
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {item.description || 'Designer Sunglasses with Polarized Protection'}
                        </p>
                        <span className="block mt-2 font-mono text-xs text-slate-400">
                          SKU: {item.sku} · Stock: {item.stockQuantity}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700/60">
                        <span className="font-bold font-mono text-sm text-slate-900 dark:text-slate-100">
                          ₹{item.sellingPrice}
                        </span>
                        <button
                          type="button"
                          data-testid="btn-add-sunglass-direct"
                          onClick={() => handleAddSunglass(item)}
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>1-Click Add</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-8 text-center text-xs text-slate-400">
                    No sunglasses found in inventory.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. CONTACT LENSES FLOW */}
          {selectedCategory === 'CONTACT_LENSES' && (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-2">
                  Select Contact Lens Pack
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-40 overflow-y-auto pr-1">
                  {catalogItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedContactLens(item)}
                      className={`cursor-pointer rounded-lg border p-3 flex items-center justify-between transition ${
                        selectedContactLens?.id === item.id
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {item.brand} {item.model}
                        </span>
                        <span className="block text-[11px] font-mono text-slate-400">
                          SKU: {item.sku}
                        </span>
                      </div>
                      <span className="font-bold font-mono text-xs text-blue-600">
                        ₹{item.sellingPrice}/box
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Lens Clinical Parameters */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block">
                  Contact Lens Prescription & Pack Parameters
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Right Eye (OD) Power
                    </label>
                    <input
                      type="text"
                      value={clOdSphere}
                      onChange={(e) => setClOdSphere(e.target.value)}
                      placeholder="-2.00"
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Left Eye (OS) Power
                    </label>
                    <input
                      type="text"
                      value={clOsSphere}
                      onChange={(e) => setClOsSphere(e.target.value)}
                      placeholder="-2.00"
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Base Curve (BC)
                    </label>
                    <input
                      type="text"
                      value={clBaseCurve}
                      onChange={(e) => setClBaseCurve(e.target.value)}
                      placeholder="8.5"
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Boxes Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={clBoxes}
                      onChange={(e) => setClBoxes(parseInt(e.target.value) || 1)}
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-contact-lens"
                  disabled={!selectedContactLens}
                  onClick={handleConfirmContactLens}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>Add Contact Lenses to Cart</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. LENS ONLY (CUSTOMER FRAME) FLOW */}
          {selectedCategory === 'LENS_ONLY' && (
            <div className="space-y-6">
              {/* Frame Glazing Details */}
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/30 dark:bg-amber-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-amber-800 dark:text-amber-300">
                  <FileText className="h-4 w-4" />
                  <span>Step 1: Customer Frame Intake & Workshop Glazing Notes</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Customer Frame Make / Model / Brand
                    </label>
                    <input
                      type="text"
                      data-testid="input-customer-frame-make"
                      placeholder="e.g. Ray-Ban Wayfarer, Matte Black"
                      value={customerFrameMake}
                      onChange={(e) => setCustomerFrameMake(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Fitting Instructions & Frame Condition
                    </label>
                    <input
                      type="text"
                      data-testid="input-customer-frame-notes"
                      placeholder="e.g. Re-glaze progressive; frame in good condition"
                      value={fittingInstructions}
                      onChange={(e) => setFittingInstructions(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  ℹ️ A ₹0.00 line item (`CUST-FRAME`) will be added to the invoice and lab job sheet to record the patient's own frame intake.
                </p>
              </div>

              {/* Step 2: Lens Specifications */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block">
                  Step 2: Choose Custom Lab Lenses
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Lens Type
                    </label>
                    <select
                      value={lensType}
                      onChange={(e) => setLensType(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                    >
                      <option value="SINGLE_VISION">Single Vision (Distance/Reading)</option>
                      <option value="PROGRESSIVE">Progressive (Corridor fit)</option>
                      <option value="BIFOCAL">Bifocal (D-Segment)</option>
                      <option value="BLUE_CUT">Blue-Cut Digital</option>
                      <option value="PHOTOCHROMIC">Photochromic Transition</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Material Index
                    </label>
                    <select
                      value={lensMaterial}
                      onChange={(e) => setLensMaterial(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs"
                    >
                      <option value="CR39">CR-39 Standard (1.50)</option>
                      <option value="POLYCARBONATE">Polycarbonate Impact (1.59)</option>
                      <option value="HIGH_INDEX_167">High Index (1.67)</option>
                      <option value="HIGH_INDEX_174">Ultra Thin (1.74)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Lens Selling Price (₹)
                    </label>
                    <input
                      type="text"
                      data-testid="input-lens-only-price"
                      value={lensPrice}
                      onChange={(e) => setLensPrice(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-lens-only"
                  onClick={handleConfirmLensOnly}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  <Check className="h-4 w-4" />
                  <span>Add Customer Frame + Lenses to Cart</span>
                </button>
              </div>
            </div>
          )}

          {/* 6. FRAME ONLY FLOW */}
          {selectedCategory === 'FRAME_ONLY' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search frames by brand or model..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {isLoadingCatalog ? (
                  <div className="col-span-2 py-8 text-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </div>
                ) : catalogItems.length > 0 ? (
                  catalogItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 flex flex-col justify-between hover:border-blue-400 transition"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {item.brand} {item.model}
                          </span>
                          <span className="rounded bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            Frame Only
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {item.description || 'Optical frame direct purchase without lenses'}
                        </p>
                        <span className="block mt-2 font-mono text-xs text-slate-400">
                          SKU: {item.sku} · Stock: {item.stockQuantity}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700/60">
                        <span className="font-bold font-mono text-sm text-slate-900 dark:text-slate-100">
                          ₹{item.sellingPrice}
                        </span>
                        <button
                          type="button"
                          data-testid="btn-add-frame-only-direct"
                          onClick={() => handleAddFrameOnly(item)}
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>1-Click Add</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-8 text-center text-xs text-slate-400">
                    No frames found in inventory.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
