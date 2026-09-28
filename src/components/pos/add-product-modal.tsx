'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Search,
  Loader2,
  Package,
  LayoutGrid,
  List,
  Glasses,
  Check,
  AlertCircle,
  Tag,
  Sparkles,
  SlidersHorizontal,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { getInventoryList, type InventoryRow } from '@/actions/inventory-actions';
import { AddInventoryForm } from '@/components/admin/add-inventory-form';
import type { InventoryItem } from './inventory-search';
import type { POSPatient } from '@/store/pos-store';
import type { PrescriptionValues } from './prescription-grid';
import type { CartItem } from './billing-cart';
import type { SpectaclePairConfig } from './spectacle-wizard-modal';
import { useTenantStore } from '@/store/tenant-store';
import { toast } from 'sonner';

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

export function AddProductModal({
  isOpen,
  onClose,
  activePatients,
  selectedPatient,
  onAddCartItem,
  onAddInventoryItem,
  onConfigureSpectaclePair,
}: AddProductModalProps) {
  const selectedBranchId = useTenantStore((s) => s.selectedBranchId);

  // Data state
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Multi-patient selection
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Modals state
  const [isCreateInventoryOpen, setIsCreateInventoryOpen] = useState(false);
  const [isOwnFrameModalOpen, setIsOwnFrameModalOpen] = useState(false);
  const [ownFrameMake, setOwnFrameMake] = useState('');
  const [ownFrameNotes, setOwnFrameNotes] = useState('');
  const [ownFrameLensPrice, setOwnFrameLensPrice] = useState('1500.00');

  // Load preferred layout from localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('optixos_catalog_view_mode') as 'grid' | 'list' | null;
      if (savedMode === 'grid' || savedMode === 'list') {
        setViewMode(savedMode);
      }
    } catch {}
  }, []);

  const handleToggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('optixos_catalog_view_mode', mode);
    } catch {}
  };

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch active inventory on open
  useEffect(() => {
    if (!isOpen) return;

    const pid = selectedPatient?.id || activePatients[0]?.id || '';
    setSelectedPatientId(pid);
    setSearchQuery('');
    setSelectedCategory('ALL');
    setStockFilter('ALL');

    setIsLoading(true);
    const branchIds = selectedBranchId && selectedBranchId !== 'all' ? [selectedBranchId] : undefined;
    getInventoryList(branchIds)
      .then((res) => {
        if (res.success && res.items) {
          setItems(res.items);
        } else {
          setItems([]);
        }
      })
      .catch((err) => {
        console.error('[AddProductModal] Failed to load inventory:', err);
        setItems([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, selectedBranchId, selectedPatient, activePatients]);

  // Compute categories dynamically 100% from actual active inventory
  const dynamicCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      if (item.category) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([catKey, count]) => ({
      key: catKey,
      label: formatCategoryLabel(catKey),
      count,
    }));
  }, [items]);

  // Filter items in real time
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Category Filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      // 2. Stock Filter
      if (stockFilter === 'IN_STOCK' && item.stockQuantity <= 0) {
        return false;
      }
      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSku = item.sku?.toLowerCase().includes(q);
        const matchBarcode = item.barcode?.toLowerCase().includes(q);
        const matchBrand = item.brand?.toLowerCase().includes(q);
        const matchModel = item.model?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchCategory = item.category?.toLowerCase().includes(q);
        if (!matchSku && !matchBarcode && !matchBrand && !matchModel && !matchDesc && !matchCategory) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedCategory, stockFilter, searchQuery]);

  if (!isOpen) return null;

  const handleAddToCart = (item: InventoryRow) => {
    const invItem: InventoryItem = {
      id: item.id,
      sku: item.sku,
      barcode: item.barcode,
      branchId: item.branchId,
      branchName: item.branchName,
      category: item.category as any,
      brand: item.brand,
      model: item.model,
      description: item.description,
      sellingPrice: item.sellingPrice,
      mrp: item.mrp,
      stockQuantity: item.stockQuantity,
      lowStockThreshold: item.lowStockThreshold,
      taxRate: item.taxRate,
      hsnCode: item.hsnCode,
      lensType: null,
      coating: null,
      lensMaterial: null,
    };
    onAddInventoryItem(invItem, selectedPatientId || null);
    toast.success('Added to Cart', {
      description: `${item.brand || ''} ${item.model || item.sku} (₹${item.sellingPrice})`,
    });
  };

  const handlePairLenses = (item: InventoryRow) => {
    const invItem: InventoryItem = {
      id: item.id,
      sku: item.sku,
      barcode: item.barcode,
      branchId: item.branchId,
      branchName: item.branchName,
      category: item.category as any,
      brand: item.brand,
      model: item.model,
      description: item.description,
      sellingPrice: item.sellingPrice,
      mrp: item.mrp,
      stockQuantity: item.stockQuantity,
      lowStockThreshold: item.lowStockThreshold,
      taxRate: item.taxRate,
      hsnCode: item.hsnCode,
      lensType: null,
      coating: null,
      lensMaterial: null,
    };
    onConfigureSpectaclePair({
      frameItem: invItem,
      targetPatientId: selectedPatientId || activePatients[0]?.id || '',
      includeLenses: true,
    });
    onClose();
  };

  const handleConfirmOwnFrame = () => {
    if (!ownFrameMake.trim()) {
      toast.error('Please enter customer frame details');
      return;
    }
    const lensPriceNum = parseFloat(ownFrameLensPrice);
    if (isNaN(lensPriceNum) || lensPriceNum <= 0) {
      toast.error('Please enter a valid lens price');
      return;
    }

    // 1. Frame item (₹0.00)
    const frameCartItem: CartItem = {
      id: crypto.randomUUID(),
      inventoryItemId: null,
      sku: `CUST-FRAME-${Date.now().toString(36).toUpperCase()}`,
      description: `Customer Frame: ${ownFrameMake.trim()}`,
      category: 'FRAME',
      hsnCode: '9003',
      quantity: 1,
      unitPrice: '0.00',
      discount: '0.00',
      taxRate: '0.00',
      patientId: selectedPatientId || null,
      isCustomerOwnFrame: true,
      fittingNote: ownFrameNotes.trim() || 'Customer own frame; fitting required',
    };

    // 2. Lens item
    const lensCartItem: CartItem = {
      id: crypto.randomUUID(),
      inventoryItemId: null,
      sku: `LENS-${Date.now().toString(36).toUpperCase()}`,
      description: `Prescription Lens (${ownFrameMake.trim()})`,
      category: 'OPHTHALMIC_LENS',
      hsnCode: '9001',
      quantity: 1,
      unitPrice: lensPriceNum.toFixed(2),
      discount: '0.00',
      taxRate: '5.00',
      patientId: selectedPatientId || null,
      linkedFrameId: frameCartItem.id,
      linkedFrameName: frameCartItem.description,
      fittingNote: ownFrameNotes.trim() || null,
    };

    onAddCartItem(frameCartItem);
    onAddCartItem(lensCartItem);
    toast.success('Customer Frame & Lenses Added to Bill');
    setIsOwnFrameModalOpen(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl h-[88vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3 bg-slate-50/80 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Add Product to Cart</span>
                <span className="rounded-full bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                  {items.length} {items.length === 1 ? 'Item' : 'Items'} Active
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Browse dynamic store inventory or quickly create and dispense new items.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Target Patient Selector (if multi-member family account) */}
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

            {/* View Mode Switcher: Box / Grid vs List */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 p-0.5">
              <button
                type="button"
                data-testid="btn-view-mode-grid"
                onClick={() => handleToggleViewMode('grid')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Box / Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                data-testid="btn-view-mode-list"
                onClick={() => handleToggleViewMode('list')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="List Table View"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

            {/* Clean Single Plus Create Inventory Button */}
            <button
              type="button"
              data-testid="btn-add-product-create-inventory"
              onClick={() => setIsCreateInventoryOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-2xs transition active:scale-95 cursor-pointer"
              title="Quick create new inventory item"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Inventory</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              data-testid="btn-close-add-product-modal"
              aria-label="Close modal"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Top Search & Dynamic Filter Chips Bar ── */}
        <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                data-testid="input-modal-catalog-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search inventory by name, SKU, brand, model, or barcode..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Stock Availability Filter */}
            <select
              aria-label="Stock Availability"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shrink-0"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN_STOCK">In Stock Only (&gt;0)</option>
            </select>

            {/* Special Action: Customer's Own Frame */}
            <button
              type="button"
              data-testid="btn-customer-own-frame"
              onClick={() => setIsOwnFrameModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 px-3 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition cursor-pointer shrink-0"
              title="Add customer's own frame with custom prescription lenses"
            >
              <Glasses className="h-3.5 w-3.5" />
              <span>Customer&apos;s Own Frame</span>
            </button>
          </div>

          {/* Dynamic Category Filter Chips */}
          {dynamicCategories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                data-testid="chip-category-all"
                onClick={() => setSelectedCategory('ALL')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition shrink-0 cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>All Products</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  selectedCategory === 'ALL' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {items.length}
                </span>
              </button>

              {dynamicCategories.map((cat) => {
                const isActive = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    data-testid={`chip-category-${cat.key.toLowerCase()}`}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-2xs font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Main Catalog Body ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              <span className="text-xs font-medium text-slate-500">Loading store inventory...</span>
            </div>
          ) : items.length === 0 ? (
            /* ── Case 1: Zero Items in Store Inventory ── */
            <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto">
                <Package className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  No Inventory Items in Store Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your store catalog is currently empty. Categories and products are created on demand. Click below to add your first product or optical frame.
                </p>
              </div>
              <button
                type="button"
                data-testid="btn-empty-catalog-create-inventory"
                onClick={() => setIsCreateInventoryOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Inventory</span>
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            /* ── Case 2: Search/Filter Yields No Results ── */
            <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 mx-auto">
                <Search className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  No Products Found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No active products match your search query &quot;{searchQuery}&quot; or filter criteria.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                    setStockFilter('ALL');
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  data-testid="btn-filter-empty-create-inventory"
                  onClick={() => setIsCreateInventoryOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Inventory Item &quot;{searchQuery}&quot;</span>
                </button>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            /* ── Case 3: Box / Grid View ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredItems.map((item) => {
                const isFrame = item.category === 'FRAME' || item.category === 'SUNGLASS';
                return (
                  <div
                    key={item.id}
                    data-testid={`product-card-${item.sku}`}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                          {item.brand ? `${item.brand} ` : ''}{item.model || item.sku}
                        </span>
                        <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                          {formatCategoryLabel(item.category)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description || 'Optical inventory product'}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="font-mono text-[10px] text-slate-400">
                          SKU: {item.sku}
                        </span>
                        {getStockBadge(item.stockQuantity, item.lowStockThreshold)}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                          ₹{item.sellingPrice}
                        </span>
                        {item.mrp && parseFloat(item.mrp) > parseFloat(item.sellingPrice) && (
                          <span className="font-mono text-[10px] text-slate-400 line-through ml-1.5">
                            ₹{item.mrp}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isFrame && (
                          <button
                            type="button"
                            data-testid={`btn-pair-frame-${item.sku}`}
                            onClick={() => handlePairLenses(item)}
                            className="flex items-center gap-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition cursor-pointer"
                            title="Pair Frame with Prescription Lenses"
                          >
                            <Glasses className="h-3 w-3" />
                            <span>Pair</span>
                          </button>
                        )}
                        <button
                          type="button"
                          data-testid={`btn-add-cart-${item.sku}`}
                          onClick={() => handleAddToCart(item)}
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-2xs hover:bg-blue-700 transition cursor-pointer active:scale-95"
                          title="Add Directly to Cart"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Case 4: Compact List View ── */
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-3.5 py-2.5">SKU / Barcode</th>
                    <th className="px-3.5 py-2.5">Product &amp; Details</th>
                    <th className="px-3.5 py-2.5">Category</th>
                    <th className="px-3.5 py-2.5">Stock</th>
                    <th className="px-3.5 py-2.5 text-right">Selling Price</th>
                    <th className="px-3.5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredItems.map((item) => {
                    const isFrame = item.category === 'FRAME' || item.category === 'SUNGLASS';
                    return (
                      <tr
                        key={item.id}
                        data-testid={`product-row-${item.sku}`}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="px-3.5 py-2 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          <div>{item.sku}</div>
                          {item.barcode && (
                            <div className="text-[10px] text-slate-400">{item.barcode}</div>
                          )}
                        </td>
                        <td className="px-3.5 py-2">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {item.brand ? `${item.brand} ` : ''}{item.model || item.sku}
                          </div>
                          {item.description && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-2">
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            {formatCategoryLabel(item.category)}
                          </span>
                        </td>
                        <td className="px-3.5 py-2">
                          {getStockBadge(item.stockQuantity, item.lowStockThreshold)}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₹{item.sellingPrice}
                        </td>
                        <td className="px-3.5 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isFrame && (
                              <button
                                type="button"
                                data-testid={`btn-list-pair-frame-${item.sku}`}
                                onClick={() => handlePairLenses(item)}
                                className="flex items-center gap-1 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition cursor-pointer"
                                title="Pair Frame with Prescription Lenses"
                              >
                                <Glasses className="h-3 w-3" />
                                <span>Pair</span>
                              </button>
                            )}
                            <button
                              type="button"
                              data-testid={`btn-list-add-cart-${item.sku}`}
                              onClick={() => handleAddToCart(item)}
                              className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-2xs hover:bg-blue-700 transition cursor-pointer active:scale-95"
                              title="Add Directly to Cart"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Sub-Modal: Customer's Own Frame Dispensing ── */}
      {isOwnFrameModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Glasses className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Customer&apos;s Own Frame (Lens Only)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOwnFrameModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Frame Brand &amp; Model Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  data-testid="input-customer-frame-make"
                  value={ownFrameMake}
                  onChange={(e) => setOwnFrameMake(e.target.value)}
                  placeholder="e.g. Ray-Ban Wayfarer Black (Customer Owned)"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Fitting &amp; Laboratory Instructions
                </label>
                <textarea
                  rows={2}
                  data-testid="input-customer-frame-notes"
                  value={ownFrameNotes}
                  onChange={(e) => setOwnFrameNotes(e.target.value)}
                  placeholder="e.g. Customer brought own frame. Rimless groove fitting required."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Prescription Lens Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  data-testid="input-lens-only-price"
                  value={ownFrameLensPrice}
                  onChange={(e) => setOwnFrameLensPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-3 py-2 font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsOwnFrameModalOpen(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="btn-confirm-lens-only"
                onClick={handleConfirmOwnFrame}
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs"
              >
                Add Lens Only to Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Modal: Quick Create Inventory Form ── */}
      <AddInventoryForm
        isOpen={isCreateInventoryOpen}
        onClose={() => setIsCreateInventoryOpen(false)}
        initialIdentifier={searchQuery.trim() || undefined}
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

function formatCategoryLabel(cat?: string | null): string {
  if (!cat) return 'Uncategorized';
  switch (cat) {
    case 'FRAME':
      return 'Frames';
    case 'SUNGLASS':
      return 'Sunglasses';
    case 'OPHTHALMIC_LENS':
      return 'Ophthalmic Lenses';
    case 'CONTACT_LENS':
      return 'Contact Lenses';
    case 'ACCESSORY':
      return 'Accessories';
    case 'SERVICE':
      return 'Services';
    default:
      return cat
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function getStockBadge(qty: number, threshold: number) {
  if (qty <= 0) {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200/80 dark:border-red-900">
        Out of Stock (0)
      </span>
    );
  }
  if (qty <= threshold) {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900">
        Low ({qty})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900">
      Stock: {qty}
    </span>
  );
}

export default AddProductModal;
