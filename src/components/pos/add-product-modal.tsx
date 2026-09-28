'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Glasses,
  Sun,
  Eye,
  Layers,
  Monitor,
  Package,
  Sparkles,
  ShieldCheck,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Link2,
  Unlink,
  FileText,
  ArrowLeft,
  Calculator,
} from 'lucide-react';
import Decimal from 'decimal.js';
import {
  convertSpectacleToContactLens,
  formatDiopter,
} from '@/lib/vertex-converter';
import {
  getEnabledProductTypesAction,
  type ProductTypeItem,
  type WorkflowStep,
  type StepOption,
} from '@/actions/product-type-actions';
import { getInventoryList, type InventoryRow } from '@/actions/inventory-actions';
import { AddInventoryForm } from '@/components/admin/add-inventory-form';
import type { InventoryItem } from './inventory-search';
import type { POSPatient } from '@/store/pos-store';
import type { PrescriptionValues } from './prescription-grid';
import type { CartItem } from './billing-cart';
import type { SpectaclePairConfig } from './spectacle-wizard-modal';
import { toast } from 'sonner';

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
  patientPrescriptionHistories?: Record<string, any[]>;
  cartItems?: CartItem[];
  onAddCartItem: (item: CartItem) => void;
  onAddInventoryItem: (item: InventoryItem, targetPatientId?: string | null) => void;
  onConfigureSpectaclePair: (config: SpectaclePairConfig) => void;
}

const CATEGORY_INFO: Record<ProductCategory, { title: string; subtitle: string }> = {
  POWER_GLASSES: {
    title: 'Power Glasses',
    subtitle: 'Frame + Prescription Lenses (Single Vision, Progressive, Bifocal)',
  },
  BLUE_CUT: {
    title: 'Blue-Cut Screen Defense',
    subtitle: 'Screen & anti-fatigue lenses for digital device users',
  },
  SUNGLASSES: {
    title: 'Sunglasses Catalog',
    subtitle: 'UV400 & Polarized designer sunglasses from active catalog',
  },
  CONTACT_LENSES: {
    title: 'Contact Lenses Dispensing',
    subtitle: 'Daily, bi-weekly & monthly packs with dioptres',
  },
  LENS_ONLY: {
    title: 'Lens Only (Customer Frame)',
    subtitle: 'Customer brings own frame; customize lenses and fitting notes',
  },
  FRAME_ONLY: {
    title: 'Frame Only (Plano / Direct)',
    subtitle: 'Direct frame purchase without prescription lenses',
  },
};

const ICON_MAP: Record<string, typeof Glasses> = {
  Glasses,
  Sun,
  Eye,
  Layers,
  Monitor,
  Package,
  Sparkles,
  ShieldCheck,
};

function getStepName(step: any, index: number): string {
  return step?.stepName || step?.step_name || `Step ${index + 1}`;
}

function getInputType(step: any): 'single_select' | 'multi_select' | 'text' {
  return step?.inputType || step?.input_type || 'single_select';
}

function getStepOptions(step: any, allSelections: Record<string, string | string[]>): StepOption[] {
  if (!step) return [];
  const baseOptions: StepOption[] = (step.options || step.options_array || []) as StepOption[];

  const dep = step.dependency || step.dependency_logic;
  if (dep) {
    const parentVal = dep.stepId
      ? allSelections[dep.stepId]
      : dep.dependsOnStepName
      ? allSelections[dep.dependsOnStepName]
      : undefined;

    if (parentVal && dep.whenValueEquals) {
      const matchValues = Array.isArray(dep.whenValueEquals)
        ? dep.whenValueEquals
        : [dep.whenValueEquals];
      const isParentMatched = Array.isArray(parentVal)
        ? parentVal.some((v) => matchValues.includes(v))
        : matchValues.includes(parentVal);

      if (isParentMatched && Array.isArray(dep.showOptions) && dep.showOptions.length > 0) {
        return [...baseOptions, ...dep.showOptions];
      }
    }
  }

  return baseOptions.filter((opt) => {
    if (!opt.showIfParent || opt.showIfParent.length === 0) return true;
    return Object.values(allSelections).some((sel) => {
      if (Array.isArray(sel)) return sel.some((v) => opt.showIfParent?.includes(v));
      return opt.showIfParent?.includes(sel as string);
    });
  });
}

export function AddProductModal({
  isOpen,
  onClose,
  activePatients,
  selectedPatient,
  currentPrescriptions,
  patientPrescriptionHistories = {},
  cartItems = [],
  onAddCartItem,
  onAddInventoryItem,
  onConfigureSpectaclePair,
}: AddProductModalProps) {
  const [productTypes, setProductTypes] = useState<ProductTypeItem[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [selectedType, setSelectedType] = useState<ProductTypeItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);

  // Global modal product search state
  const [mainSearchQuery, setMainSearchQuery] = useState('');
  const [mainSearchResults, setMainSearchResults] = useState<InventoryRow[]>([]);
  const [isSearchingMain, setIsSearchingMain] = useState(false);
  const [hasSearchedMain, setHasSearchedMain] = useState(false);

  // Dynamic Wizard State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepSelections, setStepSelections] = useState<Record<string, string | string[]>>({});
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedRx, setSelectedRx] = useState<PrescriptionValues | null>(null);
  const [selectedRxTitle, setSelectedRxTitle] = useState<string>('');
  const [pairedFrameId, setPairedFrameId] = useState<string>('');
  const [isCustomerOwnFrame, setIsCustomerOwnFrame] = useState(false);
  const [ownFrameNote, setOwnFrameNote] = useState('');

  // Catalog State for Direct Add & Category Workflows
  const [catalogItems, setCatalogItems] = useState<InventoryRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Category Specific States
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
  const [isCreateInventoryOpen, setIsCreateInventoryOpen] = useState(false);

  // Reset & Initialize on open
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(null);
      setSelectedType(null);
      setSelectedFrame(null);
      setSelectedContactLens(null);
      setSearchQuery('');
      setMainSearchQuery('');
      setMainSearchResults([]);
      setIsSearchingMain(false);
      setHasSearchedMain(false);
      setCustomerFrameMake('');
      setFittingInstructions('');
      setCurrentStepIndex(0);
      setStepSelections({});
      setPairedFrameId('');
      setIsCustomerOwnFrame(false);
      setOwnFrameNote('');
      setSelectedRx(null);
      setSelectedRxTitle('');

      const pid = selectedPatient?.id || activePatients[0]?.id || '';
      setSelectedPatientId(pid);

      setIsLoadingTypes(true);
      getEnabledProductTypesAction()
        .then((res) => {
          if (res.success && res.data) {
            setProductTypes(res.data);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingTypes(false));
    }
  }, [isOpen, selectedPatient, activePatients]);

  // Sync default Rx when selectedPatientId changes
  useEffect(() => {
    if (selectedPatientId && currentPrescriptions[selectedPatientId]) {
      setSelectedRx(currentPrescriptions[selectedPatientId]);
      setSelectedRxTitle('Current Session Rx');
    }
  }, [selectedPatientId, currentPrescriptions]);

  // Load catalog items when a category or direct type is chosen
  useEffect(() => {
    let catFilter = '';
    if (selectedCategory === 'POWER_GLASSES' || selectedCategory === 'FRAME_ONLY' || selectedCategory === 'BLUE_CUT') {
      catFilter = 'FRAME';
    } else if (selectedCategory === 'SUNGLASSES') {
      catFilter = 'SUNGLASS';
    } else if (selectedCategory === 'CONTACT_LENSES') {
      catFilter = 'CONTACT_LENS';
    } else if (selectedType && selectedType.workflowSteps.length === 0) {
      catFilter = selectedType.code === 'FRAME' ? 'FRAME' : selectedType.code === 'SUNGLASS' ? 'SUNGLASS' : selectedType.code === 'CONTACT_LENS' ? 'CONTACT_LENS' : '';
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
        } else {
          // Fallback to Server Action
          const actionRes = await getInventoryList();
          if (actionRes.success && actionRes.items) {
            let filtered = actionRes.items.filter((i) => i.category === catFilter);
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              filtered = filtered.filter(
                (i) =>
                  i.brand?.toLowerCase().includes(q) ||
                  i.model?.toLowerCase().includes(q) ||
                  i.sku?.toLowerCase().includes(q)
              );
            }
            setCatalogItems(filtered.slice(0, 30));
          }
        }
      } catch (err) {
        console.error('[AddProductModal] Catalog fetch error:', err);
      } finally {
        setIsLoadingCatalog(false);
      }
    };

    fetchCatalog();
  }, [selectedCategory, selectedType, searchQuery]);

  // Main modal global inventory search
  const handleMainSearch = async () => {
    if (!mainSearchQuery.trim()) {
      setMainSearchResults([]);
      setHasSearchedMain(false);
      return;
    }
    setIsSearchingMain(true);
    setHasSearchedMain(true);
    try {
      const res = await fetch(`/api/inventory/search?q=${encodeURIComponent(mainSearchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setMainSearchResults(data.items || []);
      } else {
        const actionRes = await getInventoryList();
        if (actionRes.success && actionRes.items) {
          const q = mainSearchQuery.toLowerCase().trim();
          const filtered = actionRes.items.filter(
            (i) =>
              i.brand?.toLowerCase().includes(q) ||
              i.model?.toLowerCase().includes(q) ||
              i.sku?.toLowerCase().includes(q) ||
              i.barcode?.toLowerCase().includes(q) ||
              i.description?.toLowerCase().includes(q)
          );
          setMainSearchResults(filtered.slice(0, 40));
        }
      }
    } catch (err) {
      console.error('[AddProductModal] Main search error:', err);
    } finally {
      setIsSearchingMain(false);
    }
  };

  // Candidate frames in cart for lens pairing (strictly 1:1, excluding already paired frames)
  const candidateFrames = useMemo(() => {
    const alreadyPairedFrameIds = new Set(
      cartItems
        .filter((i) => i.linkedFrameId)
        .map((i) => i.linkedFrameId)
    );
    return cartItems.filter(
      (i) =>
        (i.category === 'FRAME' ||
          i.category === 'SUNGLASS' ||
          i.category === 'SUNGLASSES' ||
          (!i.lensType && i.category !== 'OPHTHALMIC_LENS' && i.category !== 'LENS')) &&
        !alreadyPairedFrameIds.has(i.id)
    );
  }, [cartItems]);

  // Contact Lens Vertex Distance Converter state
  const [clVertexDistanceMm, setClVertexDistanceMm] = useState<number>(12);
  const [clPreferSphericalEquivalent, setClPreferSphericalEquivalent] = useState<boolean>(true);

  // Active spectacle prescription for the selected patient
  const activePatientSpectacleRx = useMemo(() => {
    if (!selectedPatientId) return null;
    return currentPrescriptions[selectedPatientId] || null;
  }, [selectedPatientId, currentPrescriptions]);

  // Converted contact lens power via vertex distance formula
  const convertedClResult = useMemo(() => {
    if (!activePatientSpectacleRx) return null;
    return convertSpectacleToContactLens(activePatientSpectacleRx, {
      vertexDistanceMm: clVertexDistanceMm,
      useSphericalEquivalent: clPreferSphericalEquivalent,
    });
  }, [activePatientSpectacleRx, clVertexDistanceMm, clPreferSphericalEquivalent]);

  const handleApplyConvertedClPower = () => {
    if (!convertedClResult) return;
    const odPower = clPreferSphericalEquivalent && convertedClResult.od.sphericalEquivalent !== null
      ? formatDiopter(convertedClResult.od.clSphericalEquivalent)
      : formatDiopter(convertedClResult.od.clSphere);
    const osPower = clPreferSphericalEquivalent && convertedClResult.os.sphericalEquivalent !== null
      ? formatDiopter(convertedClResult.os.clSphericalEquivalent)
      : formatDiopter(convertedClResult.os.clSphere);

    setClOdSphere(odPower);
    setClOsSphere(osPower);
    toast.success('Applied Converted Contact Lens Power', {
      description: `OD: ${odPower}, OS: ${osPower} (Corneal Vertex: ${clVertexDistanceMm}mm)`,
    });
  };

  if (!isOpen) return null;

  // ── CONFIRM ACTIONS ──

  // 1. Sunglasses direct add
  const handleAddSunglass = (item: any) => {
    onAddInventoryItem(item, selectedPatientId || null);
    onClose();
  };

  // 2. Frame only direct add
  const handleAddFrameOnly = (item: any) => {
    onAddInventoryItem(item, selectedPatientId || null);
    onClose();
  };

  // 3. Power Glasses confirm
  const handleConfirmPowerGlasses = () => {
    if (!selectedFrame) return;

    const config: SpectaclePairConfig = {
      frameItem: selectedFrame,
      targetPatientId: selectedPatientId || selectedPatient?.id || '',
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
      prescription: selectedPatientId ? currentPrescriptions[selectedPatientId] : undefined,
    };

    onConfigureSpectaclePair(config);
    onClose();
  };

  // 4. Blue-Cut confirm
  const handleConfirmBlueCut = () => {
    if (!selectedFrame) return;

    const config: SpectaclePairConfig = {
      frameItem: selectedFrame,
      targetPatientId: selectedPatientId || selectedPatient?.id || '',
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
      prescription: !isPlano && selectedPatientId ? currentPrescriptions[selectedPatientId] : undefined,
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
      patientId: selectedPatientId || null,
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
      patientId: selectedPatientId || null,
      prescriptionId: selectedPatientId || null,
      linkedFrameId: frameId,
      linkedFrameName: customerFrameItem.description,
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
      patientId: selectedPatientId || null,
      fittingNote: `BC ${clBaseCurve} | DIA ${clDiameter} | OD ${clOdSphere} | OS ${clOsSphere}`,
    };

    onAddCartItem(item);
    onClose();
  };

  // ── DYNAMIC WIZARD PRICE & FINISH ──
  const calculateWizardPrice = () => {
    if (!selectedType) return new Decimal(0);
    let total = new Decimal(selectedType.basePrice || '0.00');

    selectedType.workflowSteps.forEach((step, idx) => {
      const stepName = getStepName(step, idx);
      const sel = stepSelections[stepName] || stepSelections[step.step_name] || stepSelections[(step as any).stepName];
      if (!sel) return;

      const opts = getStepOptions(step, stepSelections);
      if (Array.isArray(sel)) {
        sel.forEach((val) => {
          const opt = opts.find((o) => o.value === val);
          if (opt?.surcharge) {
            total = total.plus(opt.surcharge);
          }
        });
      } else {
        const opt = opts.find((o) => o.value === sel);
        if (opt?.surcharge) {
          total = total.plus(opt.surcharge);
        }
      }
    });

    return total;
  };

  const handleFinishWizard = () => {
    if (!selectedType) return;
    const finalPrice = calculateWizardPrice().toFixed(2);
    const summaryParts: string[] = [];

    selectedType.workflowSteps.forEach((step, idx) => {
      const stepName = getStepName(step, idx);
      const sel = stepSelections[stepName] || stepSelections[step.step_name] || stepSelections[(step as any).stepName];
      if (sel) {
        const opts = getStepOptions(step, stepSelections);
        if (Array.isArray(sel)) {
          const labels = sel
            .map((v) => opts.find((o) => o.value === v)?.label || v)
            .join(' + ');
          summaryParts.push(labels);
        } else {
          const opt = opts.find((o) => o.value === sel);
          summaryParts.push(opt?.label || sel);
        }
      }
    });

    const isLens = selectedType.code === 'LENS' || selectedType.requiresPrescription;
    const description = summaryParts.length > 0 ? summaryParts.join(' • ') : selectedType.name;
    const pairedFrame = pairedFrameId ? candidateFrames.find((f) => f.id === pairedFrameId) : null;

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      inventoryItemId: null,
      sku: `${selectedType.code}-${Date.now().toString(36).toUpperCase()}`,
      description,
      category: isLens ? 'OPHTHALMIC_LENS' : selectedType.code,
      hsnCode: isLens ? '9001' : '9003',
      quantity: 1,
      unitPrice: finalPrice,
      discount: '0.00',
      taxRate: isLens ? '5.00' : '18.00',
      patientId: selectedPatientId || null,
      prescriptionSnapshot: selectedRx,
      prescriptionTitle: selectedRxTitle || (selectedRx ? 'Assigned Power' : null),
      linkedFrameId: pairedFrame?.id || null,
      linkedFrameName: pairedFrame?.description || null,
      isCustomerOwnFrame: isCustomerOwnFrame,
      fittingNote: isCustomerOwnFrame ? ownFrameNote : null,
      lensType: typeof stepSelections['Focus Type'] === 'string' ? (stepSelections['Focus Type'] as string) : undefined,
    };

    onAddCartItem(newItem);
    toast.success('Product Added to Cart', {
      description: `${description} (₹${finalPrice}) added to billing session.`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-3.5 bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            {(selectedCategory || selectedType) && (
              <button
                type="button"
                aria-label="Back to categories"
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedType(null);
                  setCurrentStepIndex(0);
                  setStepSelections({});
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {selectedCategory
                  ? CATEGORY_INFO[selectedCategory]?.title
                  : selectedType
                  ? selectedType.name
                  : 'Add Product to Cart'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedCategory
                  ? CATEGORY_INFO[selectedCategory]?.subtitle
                  : selectedType
                  ? selectedType.description || 'Sequential configuration workflow'
                  : 'Select an optical product category or dynamic builder workflow'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Target Patient Selector */}
            {activePatients.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">For:</span>
                <select
                  aria-label="Target Patient"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {activePatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.relationType || 'Current'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Create Inventory Button */}
            <button
              type="button"
              data-testid="btn-add-product-create-inventory"
              onClick={() => setIsCreateInventoryOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-2xs transition active:scale-95 cursor-pointer"
              title="Create new inventory item and add to cart"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Inventory</span>
            </button>

            <button
              type="button"
              aria-label="Close add product modal"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ─────────────────────────────────────────────────────────────
              VIEW 1: Main Category Dispatcher Grid
              ───────────────────────────────────────────────────────────── */}
          {!selectedCategory && !selectedType && (
            <div className="space-y-6">
              {/* Main Modal Global Search Bar */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    data-testid="input-modal-global-search"
                    value={mainSearchQuery}
                    onChange={(e) => setMainSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleMainSearch();
                      }
                    }}
                    placeholder="Search all inventory by SKU, brand, model, barcode or frame name..."
                    className="w-full bg-transparent pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  data-testid="btn-modal-global-search"
                  onClick={handleMainSearch}
                  disabled={isSearchingMain}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isSearchingMain ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  <span>Search</span>
                </button>
                <button
                  type="button"
                  data-testid="btn-quick-create-inventory-search"
                  onClick={() => setIsCreateInventoryOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer shrink-0"
                  title="Quick create new inventory item"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Create Inventory</span>
                </button>
                {hasSearchedMain && (
                  <button
                    type="button"
                    onClick={() => {
                      setMainSearchQuery('');
                      setMainSearchResults([]);
                      setHasSearchedMain(false);
                    }}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Global Search Results Panel */}
              {hasSearchedMain && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/20 dark:bg-blue-950/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                      Search Results ({mainSearchResults.length} items found)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMainSearchQuery('');
                        setMainSearchResults([]);
                        setHasSearchedMain(false);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                    >
                      Dismiss Results
                    </button>
                  </div>
                  {isSearchingMain ? (
                    <div className="py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                    </div>
                  ) : mainSearchResults.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                      {mainSearchResults.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex flex-col justify-between shadow-2xs hover:border-blue-400 transition"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                                {item.brand} {item.model}
                              </span>
                              <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                {item.category}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                              {item.description || 'Inventory item'}
                            </p>
                            <span className="block mt-1 font-mono text-[10px] text-slate-400">
                              SKU: {item.sku} · Qty: {item.stockQuantity}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="font-bold font-mono text-xs text-slate-900 dark:text-slate-100">
                              ₹{item.sellingPrice}
                            </span>
                            <div className="flex items-center gap-1">
                              {(item.category === 'FRAME' || item.category === 'SUNGLASS') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFrame(item as any);
                                    setSelectedCategory('POWER_GLASSES');
                                  }}
                                  className="flex items-center gap-0.5 rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 cursor-pointer"
                                  title="Pair with Prescription Lenses"
                                >
                                  <span>👓 Pair</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  onAddInventoryItem(item as any, selectedPatientId || null);
                                  onClose();
                                }}
                                className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-2xs hover:bg-blue-700 cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No products found matching &quot;{mainSearchQuery}&quot;.
                      </p>
                      <button
                        type="button"
                        data-testid="btn-modal-empty-create-inventory"
                        onClick={() => setIsCreateInventoryOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Create Inventory Item &quot;{mainSearchQuery}&quot;</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isLoadingTypes ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-xs text-slate-500">Loading store product types...</span>
                </div>
              ) : productTypes.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Configured Store Product Types
                    </h3>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                      {productTypes.length} Active Workflows
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {productTypes.map((type) => {
                      const IconComponent =
                        (type.icon && ICON_MAP[type.icon]) ||
                        (type.code === 'LENS'
                          ? Glasses
                          : type.code === 'SUNGLASS'
                          ? Sun
                          : type.code === 'CONTACT_LENS'
                          ? Eye
                          : type.code === 'BLUE_CUT'
                          ? Monitor
                          : type.code === 'LENS_ONLY'
                          ? Layers
                          : type.code === 'ACCESSORY'
                          ? Package
                          : type.code === 'SERVICE'
                          ? ShieldCheck
                          : Package);

                      const colorClass =
                        type.code === 'LENS'
                          ? 'from-blue-600 to-indigo-600'
                          : type.code === 'SUNGLASS'
                          ? 'from-amber-600 to-orange-600'
                          : type.code === 'CONTACT_LENS'
                          ? 'from-emerald-600 to-teal-600'
                          : type.code === 'FRAME'
                          ? 'from-slate-700 to-slate-900'
                          : type.code === 'BLUE_CUT'
                          ? 'from-cyan-600 to-blue-600'
                          : type.code === 'LENS_ONLY'
                          ? 'from-purple-600 to-indigo-600'
                          : type.code === 'ACCESSORY'
                          ? 'from-amber-600 to-yellow-600'
                          : type.code === 'SERVICE'
                          ? 'from-teal-600 to-emerald-600'
                          : 'from-purple-600 to-indigo-600';

                      const hasSteps = type.workflowSteps && type.workflowSteps.length > 0;

                      // Backward-compatible testids for E2E suites
                      const testId =
                        type.code === 'LENS'
                          ? 'category-btn-power_glasses'
                          : type.code === 'SUNGLASS'
                          ? 'category-btn-sunglasses'
                          : type.code === 'CONTACT_LENS'
                          ? 'category-btn-contact_lenses'
                          : type.code === 'FRAME'
                          ? 'category-btn-frame_only'
                          : type.code === 'BLUE_CUT'
                          ? 'category-btn-blue_cut'
                          : type.code === 'LENS_ONLY'
                          ? 'category-btn-lens_only'
                          : type.code === 'ACCESSORY'
                          ? 'category-btn-accessories'
                          : type.code === 'SERVICE'
                          ? 'category-btn-services'
                          : `category-btn-${type.code.toLowerCase()}`;

                      return (
                        <button
                          key={type.id}
                          type="button"
                          data-testid={testId}
                          onClick={() => {
                            if (type.code === 'LENS') {
                              setSelectedType(type);
                              setCurrentStepIndex(0);
                              setStepSelections({});
                            } else if (type.code === 'BLUE_CUT') {
                              setSelectedCategory('BLUE_CUT');
                              setLensType('BLUE_CUT');
                              setLensCoating('BLUE_FILTER');
                              setLensPrice('1800.00');
                            } else if (type.code === 'SUNGLASS') {
                              setSelectedCategory('SUNGLASSES');
                            } else if (type.code === 'CONTACT_LENS') {
                              setSelectedCategory('CONTACT_LENSES');
                            } else if (type.code === 'FRAME') {
                              setSelectedCategory('FRAME_ONLY');
                            } else if (type.code === 'LENS_ONLY') {
                              setSelectedCategory('LENS_ONLY');
                            } else if (hasSteps) {
                              setSelectedType(type);
                              setCurrentStepIndex(0);
                              setStepSelections({});
                            } else {
                              setSelectedType(type);
                              setCurrentStepIndex(0);
                              setStepSelections({});
                            }
                          }}
                          className="group relative flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left transition hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md active:scale-[0.99] cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${colorClass} text-white shadow-xs group-hover:scale-105 transition`}
                            >
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                {hasSteps ? `${type.workflowSteps.length} Steps Wizard` : 'Direct Catalog'}
                              </span>
                              {type.requiresPrescription && (
                                <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2 py-0.2 text-[9px] font-bold text-blue-700 dark:text-blue-300">
                                  Rx Required
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-4">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                              {type.name}
                            </h4>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {type.description || `${type.name} dispensing workflow`}
                            </p>
                          </div>

                          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-800/80">
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              {Number(type.basePrice) > 0 ? `From ₹${type.basePrice}` : 'Catalog Rate'}
                            </span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                              <span>{hasSteps ? 'Configure' : 'Open Flow'}</span>
                              <span>→</span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
                  <Package className="h-10 w-10 mx-auto text-slate-400 mb-3" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Active Product Types Configured
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Configure your practice product types and workflow steps in Settings &gt; Product Types.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW 2: CATEGORY WORKFLOWS (Direct / Fast Dispensing)
              ───────────────────────────────────────────────────────────── */}

          {/* 1. POWER GLASSES FLOW */}
          {selectedCategory === 'POWER_GLASSES' && (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-2">
                  Step 1: Select Spectacle Frame from Inventory
                </label>
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search frames by brand, model or SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer shrink-0"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Search</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {isLoadingCatalog ? (
                    <div className="col-span-2 py-6 text-center text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-600" />
                    </div>
                  ) : catalogItems.length > 0 ? (
                    catalogItems.map((item) => {
                      const isSelected = selectedFrame?.id === item.id;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setSelectedFrame(item as any)}
                          aria-pressed={isSelected}
                          className={`w-full text-left cursor-pointer rounded-lg border p-3 flex items-center justify-between transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <span className="block">
                            <span className="block font-bold text-xs text-slate-900 dark:text-slate-100">
                              {item.brand} {item.model}
                            </span>
                            <span className="block text-[11px] font-mono text-slate-500 dark:text-slate-300">
                              SKU: {item.sku} · Stock: {item.stockQuantity}
                            </span>
                          </span>
                          <span className="font-bold font-mono tabular-nums text-xs text-blue-600 dark:text-blue-400">
                            ₹{item.sellingPrice}
                          </span>
                        </button>
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
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
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
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
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
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
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
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-power-glasses"
                  disabled={!selectedFrame}
                  onClick={handleConfirmPowerGlasses}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
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
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search frames..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer shrink-0"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Search</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {catalogItems.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setSelectedFrame(item as any)}
                      aria-pressed={selectedFrame?.id === item.id}
                      className={`w-full text-left cursor-pointer rounded-lg border p-3 flex items-center justify-between transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        selectedFrame?.id === item.id
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <span className="block">
                        <span className="block font-bold text-xs text-slate-900 dark:text-slate-100">
                          {item.brand} {item.model}
                        </span>
                        <span className="block text-[11px] font-mono text-slate-500 dark:text-slate-300">
                          SKU: {item.sku}
                        </span>
                      </span>
                      <span className="font-bold font-mono tabular-nums text-xs text-blue-600 dark:text-blue-400">
                        ₹{item.sellingPrice}
                      </span>
                    </button>
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
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-bluecut"
                  disabled={!selectedFrame}
                  onClick={handleConfirmBlueCut}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
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
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search sunglasses by brand or model..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer shrink-0"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Search</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {isLoadingCatalog ? (
                  <div className="col-span-2 py-8 text-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-600" />
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
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
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
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
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
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search contact lenses by brand, model or SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer shrink-0"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Search</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-40 overflow-y-auto pr-1">
                  {catalogItems.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setSelectedContactLens(item as any)}
                      aria-pressed={selectedContactLens?.id === item.id}
                      className={`w-full text-left cursor-pointer rounded-lg border p-3 flex items-center justify-between transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        selectedContactLens?.id === item.id
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <span className="block">
                        <span className="block font-bold text-xs text-slate-900 dark:text-slate-100">
                          {item.brand} {item.model}
                        </span>
                        <span className="block text-[11px] font-mono text-slate-500 dark:text-slate-300">
                          SKU: {item.sku}
                        </span>
                      </span>
                      <span className="font-bold font-mono tabular-nums text-xs text-blue-600 dark:text-blue-400">
                        ₹{item.sellingPrice}/box
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Spectacle Rx to Contact Lens Vertex Converter (Default Accessible Option) */}
              <div className="rounded-xl border border-teal-200 dark:border-teal-800/80 bg-teal-50/40 dark:bg-teal-950/30 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
                      Spectacle Rx → Contact Lens Power Converter
                    </span>
                    <span className="rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-[10px] font-mono px-1.5 py-0.5 font-bold">
                      Vertex {clVertexDistanceMm}mm
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500 font-medium">Corneal Apex:</span>
                    <select
                      value={clVertexDistanceMm}
                      onChange={(e) => setClVertexDistanceMm(parseInt(e.target.value) || 12)}
                      className="rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <option value={10}>10 mm (Deep)</option>
                      <option value={12}>12 mm (Standard)</option>
                      <option value={14}>14 mm (Shallow)</option>
                    </select>

                    <label className="flex items-center gap-1 cursor-pointer ml-1">
                      <input
                        type="checkbox"
                        checked={clPreferSphericalEquivalent}
                        onChange={(e) => setClPreferSphericalEquivalent(e.target.checked)}
                        className="rounded text-teal-600"
                      />
                      <span className="text-[10px] text-slate-600 dark:text-slate-400">Spherical Equivalent (SE)</span>
                    </label>
                  </div>
                </div>

                {activePatientSpectacleRx && convertedClResult ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* OD Comparison */}
                      <div className="rounded-lg border border-teal-100 dark:border-teal-900/60 bg-white/80 dark:bg-slate-900/80 p-2.5">
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-sky-600 dark:text-sky-400 text-[11px]">OD (Right Eye)</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            Raw Spectacle: {formatDiopter(activePatientSpectacleRx.odSphere)}
                            {activePatientSpectacleRx.odCylinder ? ` / ${formatDiopter(activePatientSpectacleRx.odCylinder)} × ${activePatientSpectacleRx.odAxis || 0}°` : ''}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] text-slate-500">Converted CL Power:</span>
                          <span className="font-bold font-mono text-sm text-teal-700 dark:text-teal-300">
                            {clPreferSphericalEquivalent && convertedClResult.od.sphericalEquivalent !== null
                              ? formatDiopter(convertedClResult.od.clSphericalEquivalent)
                              : formatDiopter(convertedClResult.od.clSphere)} D
                          </span>
                        </div>
                        {convertedClResult.od.isToricRecommended && !clPreferSphericalEquivalent && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                            Toric: {convertedClResult.od.formattedClPower}
                          </div>
                        )}
                      </div>

                      {/* OS Comparison */}
                      <div className="rounded-lg border border-teal-100 dark:border-teal-900/60 bg-white/80 dark:bg-slate-900/80 p-2.5">
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-violet-600 dark:text-violet-400 text-[11px]">OS (Left Eye)</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            Raw Spectacle: {formatDiopter(activePatientSpectacleRx.osSphere)}
                            {activePatientSpectacleRx.osCylinder ? ` / ${formatDiopter(activePatientSpectacleRx.osCylinder)} × ${activePatientSpectacleRx.osAxis || 0}°` : ''}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] text-slate-500">Converted CL Power:</span>
                          <span className="font-bold font-mono text-sm text-teal-700 dark:text-teal-300">
                            {clPreferSphericalEquivalent && convertedClResult.os.sphericalEquivalent !== null
                              ? formatDiopter(convertedClResult.os.clSphericalEquivalent)
                              : formatDiopter(convertedClResult.os.clSphere)} D
                          </span>
                        </div>
                        {convertedClResult.os.isToricRecommended && !clPreferSphericalEquivalent && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                            Toric: {convertedClResult.os.formattedClPower}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-teal-700 dark:text-teal-300">
                        {convertedClResult.notes[0] || 'Vertex conversion adjusted for corneal plane.'}
                      </span>
                      <button
                        type="button"
                        data-testid="btn-apply-converted-cl-power"
                        onClick={handleApplyConvertedClPower}
                        className="flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>⚡ Apply Converted Power to OD / OS</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 py-1 flex items-center justify-between">
                    <span>
                      ℹ️ No recorded spectacle refraction for this patient. You can enter contact lens powers directly below, or record an Rx in the Prescription tab.
                    </span>
                  </div>
                )}
              </div>

              {/* Contact Lens Clinical Parameters */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block">
                  Contact Lens Prescription & Pack Parameters
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
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
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
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
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
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
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
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
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-contact-lens"
                  disabled={!selectedContactLens}
                  onClick={handleConfirmContactLens}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
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
                  ℹ️ A ₹0.00 line item (<code>CUST-FRAME</code>) will be added to the invoice and lab job sheet to record the patient&apos;s own frame intake.
                </p>
              </div>

              {/* Step 2: Lens Specifications */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block">
                  Step 2: Choose Custom Lab Lenses
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Lens Type
                    </label>
                    <select
                      value={lensType}
                      onChange={(e) => setLensType(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="SINGLE_VISION">Single Vision (Distance/Reading)</option>
                      <option value="PROGRESSIVE">Progressive (Corridor fit)</option>
                      <option value="BIFOCAL">Bifocal (D-Segment)</option>
                      <option value="BLUE_CUT">Blue-Cut Digital</option>
                      <option value="PHOTOCHROMIC">Photochromic Transition</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Material Index
                    </label>
                    <select
                      value={lensMaterial}
                      onChange={(e) => setLensMaterial(e.target.value)}
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="CR39">CR-39 Standard (1.50)</option>
                      <option value="POLYCARBONATE">Polycarbonate Impact (1.59)</option>
                      <option value="HIGH_INDEX_167">High Index (1.67)</option>
                      <option value="HIGH_INDEX_174">Ultra Thin (1.74)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
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
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-lens-only"
                  onClick={handleConfirmLensOnly}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
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
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search frames by brand or model..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer shrink-0"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Search</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {isLoadingCatalog ? (
                  <div className="col-span-2 py-8 text-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-600" />
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
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
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
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
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

          {/* ─────────────────────────────────────────────────────────────
              VIEW 3: DYNAMIC SEQUENTIAL STEP WIZARD
              ───────────────────────────────────────────────────────────── */}
          {selectedType && selectedType.workflowSteps && selectedType.workflowSteps.length > 0 && (
            <div className="space-y-5">
              {/* Wizard Step Progress Tracker */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {selectedType.workflowSteps.map((step, idx) => {
                    const stepName = getStepName(step, idx);
                    return (
                      <button
                        type="button"
                        key={stepName + idx}
                        onClick={() => idx <= currentStepIndex && setCurrentStepIndex(idx)}
                        disabled={idx > currentStepIndex}
                        aria-current={idx === currentStepIndex ? 'step' : undefined}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          idx === currentStepIndex
                            ? 'bg-blue-600 text-white shadow-xs'
                            : idx < currentStepIndex
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <span className="h-4 w-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{stepName}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                  ₹{calculateWizardPrice().toFixed(2)}
                </div>
              </div>

              {/* Current Step Content */}
              {selectedType.workflowSteps[currentStepIndex] && (() => {
                const curStep = selectedType.workflowSteps[currentStepIndex];
                const curStepName = getStepName(curStep, currentStepIndex);
                const curInputType = getInputType(curStep);
                const curOptions = getStepOptions(curStep, stepSelections);
                const isMulti = curInputType === 'multi_select';
                const currentVal = stepSelections[curStepName] || stepSelections[curStep.step_name] || stepSelections[(curStep as any).stepName];

                return (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Step {currentStepIndex + 1}: {curStepName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isMulti ? 'Select all applicable options' : 'Choose one option to proceed'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {curOptions.map((opt) => {
                        const isSelected = isMulti
                          ? Array.isArray(currentVal) && currentVal.includes(opt.value)
                          : currentVal === opt.value;

                        return (
                          <button
                            type="button"
                            key={opt.value}
                            aria-pressed={isSelected}
                            onClick={() => {
                              if (isMulti) {
                                const arr = Array.isArray(currentVal) ? [...currentVal] : [];
                                if (arr.includes(opt.value)) {
                                  setStepSelections((prev) => ({
                                    ...prev,
                                    [curStepName]: arr.filter((v) => v !== opt.value),
                                  }));
                                } else {
                                  setStepSelections((prev) => ({
                                    ...prev,
                                    [curStepName]: [...arr, opt.value],
                                  }));
                                }
                              } else {
                                setStepSelections((prev) => {
                                  const next = { ...prev, [curStepName]: opt.value };
                                  if (selectedType && selectedType.workflowSteps) {
                                    for (let i = currentStepIndex + 1; i < selectedType.workflowSteps.length; i++) {
                                      const futureStepName = getStepName(selectedType.workflowSteps[i], i);
                                      delete next[futureStepName];
                                    }
                                  }
                                  return next;
                                });
                              }
                            }}
                            className={`w-full text-left rounded-xl border p-4 flex items-center justify-between transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <span className="block">
                              <span className="block font-semibold text-xs text-slate-900 dark:text-slate-100">
                                {opt.label}
                              </span>
                              {opt.description && (
                                <span className="block text-[11px] text-slate-500 dark:text-slate-300 line-clamp-1 mt-0.5">
                                  {opt.description}
                                </span>
                              )}
                            </span>
                            <span className="font-mono tabular-nums text-xs font-bold text-slate-700 dark:text-slate-300">
                              {Number(opt.surcharge) > 0 ? `+₹${opt.surcharge}` : 'Included'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Frame & Power Pairing when configuring Spectacle Lenses */}
              {(selectedType.code === 'LENS' || selectedType.requiresFrame) && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-800 dark:text-blue-300">
                    <Glasses className="h-4 w-4" />
                    <span>Frame Pairing & Fitting</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Pair with Frame in Cart:
                      </label>
                      <select
                        value={isCustomerOwnFrame ? '__own__' : pairedFrameId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__own__') {
                            setIsCustomerOwnFrame(true);
                            setPairedFrameId('');
                          } else {
                            setIsCustomerOwnFrame(false);
                            setPairedFrameId(val);
                          }
                        }}
                        className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-200"
                      >
                        <option value="">⚠️ Unpaired Lens</option>
                        {candidateFrames.map((cf) => (
                          <option key={cf.id} value={cf.id}>
                            🔗 {cf.description} ({cf.sku})
                          </option>
                        ))}
                        <option value="__own__">👓 Customer&apos;s Own Frame</option>
                      </select>
                    </div>

                    {isCustomerOwnFrame && (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Own Frame Notes:
                        </label>
                        <input
                          type="text"
                          value={ownFrameNote}
                          onChange={(e) => setOwnFrameNote(e.target.value)}
                          placeholder="Frame brand, color, condition..."
                          className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Wizard Nav Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
                  disabled={currentStepIndex === 0}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  Previous Step
                </button>

                {currentStepIndex < selectedType.workflowSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStepIndex((i) => i + 1)}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishWizard}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
                  >
                    <Check className="h-4 w-4" />
                    <span>Add to Cart (₹{calculateWizardPrice().toFixed(2)})</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Inventory Modal */}
      <AddInventoryForm
        isOpen={isCreateInventoryOpen}
        onClose={() => setIsCreateInventoryOpen(false)}
        initialIdentifier={mainSearchQuery.trim() || undefined}
        onSuccess={(newItem) => {
          setIsCreateInventoryOpen(false);
          const itemToAdd: InventoryItem = {
            id: newItem.id,
            sku: newItem.sku,
            barcode: newItem.barcode,
            branchId: newItem.branchId,
            branchName: newItem.branchName,
            category: newItem.category as any,
            brand: newItem.brand,
            model: newItem.model,
            description: newItem.description,
            sellingPrice: newItem.sellingPrice,
            mrp: newItem.mrp,
            stockQuantity: newItem.stockQuantity,
            lowStockThreshold: newItem.lowStockThreshold,
            taxRate: newItem.taxRate,
            hsnCode: newItem.hsnCode,
            lensType: null,
            coating: null,
            lensMaterial: null,
          };
          onAddInventoryItem(itemToAdd, selectedPatientId || null);
          toast.success(`Inventory Item Created & Added to Cart: ${newItem.sku}`);
          onClose();
        }}
      />
    </div>
  );
}
