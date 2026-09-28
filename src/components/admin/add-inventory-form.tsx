'use client';

import { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Loader2,
  Package,
  Sparkles,
  Tag,
  DollarSign,
  Layers,
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  Plus,
  Percent,
  Check,
  Barcode,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  addInventoryItem,
  type InventoryRow,
} from '@/actions/inventory-actions';
import {
  inventoryCategoryValues,
  type CreateInventoryItemInput,
} from '@/lib/validators/inventory';
import { useTenantStore } from '@/store/tenant-store';
import { cleanErrorMessage } from '@/lib/action-utils';

interface AddInventoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newItem: InventoryRow) => void;
}

export function AddInventoryForm({
  isOpen,
  onClose,
  onSuccess,
}: AddInventoryFormProps) {
  const branches = useTenantStore((s) => s.branches);
  const selectedBranchId = useTenantStore((s) => s.selectedBranchId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state - Essential Fields
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<string>('FRAME');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [identifier, setIdentifier] = useState(''); // Unified SKU / Barcode input
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [taxMode, setTaxMode] = useState<'GST' | 'EXEMPT'>('GST');
  const [taxRate, setTaxRate] = useState<string>('18.00');

  // Form state - Advanced / Secondary Fields
  const [branchId, setBranchId] = useState<string>('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('0.00');
  const [mrp, setMrp] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [hsnCode, setHsnCode] = useState('9003');

  useEffect(() => {
    if (isOpen) {
      const initialBranch =
        selectedBranchId && selectedBranchId !== 'all'
          ? selectedBranchId
          : branches[0]?.id || '';
      setBranchId(initialBranch);
    }
  }, [isOpen, selectedBranchId, branches]);

  if (!isOpen) return null;

  const resetForm = () => {
    const initialBranch =
      selectedBranchId && selectedBranchId !== 'all'
        ? selectedBranchId
        : branches[0]?.id || '';
    setBranchId(initialBranch);
    setProductName('');
    setCategory('FRAME');
    setIsCustomCategory(false);
    setCustomCategoryName('');
    setIdentifier('');
    setSellingPrice('');
    setStockQuantity(1);
    setTaxMode('GST');
    setTaxRate('18.00');

    setBrand('');
    setModel('');
    setDescription('');
    setCostPrice('0.00');
    setMrp('');
    setLowStockThreshold(5);
    setHsnCode('9003');
    setValidationError(null);
    setShowAdvanced(false);
  };

  const handleCategorySelect = (val: string) => {
    if (val === 'CUSTOM') {
      setIsCustomCategory(true);
      setCategory('ACCESSORY'); // Fallback core enum
    } else {
      setIsCustomCategory(false);
      setCategory(val);
      if (val === 'OPHTHALMIC_LENS' || val === 'CONTACT_LENS') {
        setTaxRate('5.00');
        setHsnCode('9001');
      } else {
        setTaxRate('18.00');
        if (val === 'FRAME') setHsnCode('9003');
        else if (val === 'SUNGLASS') setHsnCode('9004');
        else if (val === 'ACCESSORY') setHsnCode('9003');
        else setHsnCode('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!productName.trim() && !brand.trim() && !model.trim()) {
      setValidationError('Please enter a Product Name or Brand/Model.');
      return;
    }

    if (!sellingPrice.trim() || isNaN(Number(sellingPrice)) || Number(sellingPrice) < 0) {
      setValidationError('Selling price is required and must be a valid positive amount.');
      return;
    }

    if (costPrice.trim() && (isNaN(Number(costPrice)) || Number(costPrice) < 0)) {
      setValidationError('Cost price must be a valid positive amount.');
      return;
    }

    if (mrp.trim() && (isNaN(Number(mrp)) || Number(mrp) < 0)) {
      setValidationError('MRP must be a valid positive amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine final Brand and Model:
      // If brand is empty, use productName as brand
      const finalBrand = brand.trim() || productName.trim();
      const finalModel = model.trim() || (brand.trim() ? productName.trim() : null);

      // Determine SKU and Barcode from identifier:
      // If identifier is provided, use it as SKU (and barcode if purely numeric)
      const cleanIdentifier = identifier.trim().toUpperCase();
      const skuVal = cleanIdentifier || undefined;
      const barcodeVal = /^\d+$/.test(cleanIdentifier) ? cleanIdentifier : null;

      const isExempt = taxMode === 'EXEMPT';
      const finalTaxRate = isExempt ? '0.00' : taxRate;

      const payload: CreateInventoryItemInput = {
        sku: skuVal,
        barcode: barcodeVal,
        category: (category as (typeof inventoryCategoryValues)[number]) || 'ACCESSORY',
        customCategory: isCustomCategory && customCategoryName.trim() ? customCategoryName.trim() : null,
        isGstExempt: isExempt,
        brand: finalBrand,
        model: finalModel,
        description: description.trim() || null,
        costPrice: costPrice.trim() || '0.00',
        sellingPrice: sellingPrice.trim(),
        mrp: mrp.trim() || null,
        stockQuantity: Number(stockQuantity) || 0,
        lowStockThreshold: Number(lowStockThreshold) || 5,
        taxRate: finalTaxRate,
        hsnCode: hsnCode.trim() || null,
        branchId: branchId && branchId !== 'all' ? branchId : (branches[0]?.id || null),
      };

      const result = await addInventoryItem(payload);

      if (result.success && result.item) {
        toast.success('Item Added to Inventory', {
          description: `${result.item.brand || 'Item'} ${result.item.model || ''} (${result.item.sku}) saved with ${result.item.stockQuantity} units.`,
        });
        resetForm();
        onSuccess?.(result.item);
        onClose();
      } else {
        const errorMsg = cleanErrorMessage(result.error) || 'Failed to add item. Check your inputs.';
        setValidationError(errorMsg);
        toast.error('Failed to Add Item', {
          description: errorMsg,
        });
      }
    } catch (err) {
      console.error('[AddInventoryForm] error:', err);
      const msg = cleanErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
      setValidationError(msg);
      toast.error('Unexpected Error', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 bg-slate-50/70 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Add Inventory Item
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quickly add stock with single-input identifier & custom tax
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body (Compact & Ergonomic) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {validationError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-2.5 text-xs text-red-800 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Essential Fields Grid */}
          <div className="space-y-3.5">
            {/* Row 1: Product Name */}
            <div>
              <label htmlFor="inv-product-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product Name / Title <span className="text-red-500">*</span>
              </label>
              <input
                id="inv-product-name"
                data-testid="input-inventory-product-name"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Ray-Ban Aviator RB3025 Gold or Blue Cut 1.56 AR"
                required
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/20"
              />
            </div>

            {/* Row 2: Category & Custom Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="inv-category" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category <span className="text-red-500">*</span>
                </label>
                {!isCustomCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(true);
                      setCategory('ACCESSORY');
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ Custom Category</span>
                  </button>
                )}
              </div>

              {!isCustomCategory ? (
                <select
                  id="inv-category"
                  data-testid="select-inventory-category"
                  value={category}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/20"
                >
                  <option value="FRAME">Frame (Optical Chassis)</option>
                  <option value="SUNGLASS">Sunglass</option>
                  <option value="OPHTHALMIC_LENS">Ophthalmic Lens</option>
                  <option value="CONTACT_LENS">Contact Lens</option>
                  <option value="ACCESSORY">Accessory / Solution</option>
                  <option value="SERVICE">Optometry Service / Repair</option>
                  <option value="CUSTOM">+ Add Custom Category...</option>
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="Enter custom category name (e.g. Eyewear Cleaner, Strap, Sports)"
                    className="flex-1 rounded-md border border-blue-400 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/20 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false);
                      setCustomCategoryName('');
                    }}
                    className="rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Row 3: Single Identifier (SKU / Barcode) & Price & Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="inv-identifier" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    SKU / Barcode
                  </label>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>
                <div className="relative">
                  <Barcode className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    id="inv-identifier"
                    data-testid="input-inventory-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Scan / Type SKU"
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 pl-8 pr-2 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="inv-selling-price" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selling Price (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600 dark:text-blue-400">
                    ₹
                  </span>
                  <input
                    id="inv-selling-price"
                    data-testid="input-inventory-selling-price"
                    type="text"
                    inputMode="decimal"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="1499.00"
                    required
                    className="w-full rounded-md border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-950 py-1.5 pl-6 pr-2 text-xs font-mono font-bold text-blue-700 dark:text-blue-300 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="inv-stock-qty" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Stock Units <span className="text-red-500">*</span>
                </label>
                <input
                  id="inv-stock-qty"
                  data-testid="input-inventory-stock"
                  type="number"
                  step="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Row 4: Tax Mode (GST Applicable vs Tax Exempt) */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tax Treatment
                </span>
                <div className="flex items-center gap-1 rounded-md bg-slate-200/70 dark:bg-slate-800 p-0.5 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setTaxMode('GST')}
                    className={`px-2.5 py-1 rounded transition ${
                      taxMode === 'GST'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    GST Applicable
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxMode('EXEMPT')}
                    className={`px-2.5 py-1 rounded transition ${
                      taxMode === 'EXEMPT'
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Tax Exempt (0%)
                  </button>
                </div>
              </div>

              {taxMode === 'GST' ? (
                <div className="flex items-center gap-3">
                  <label htmlFor="inv-tax-rate" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    GST Rate:
                  </label>
                  <select
                    id="inv-tax-rate"
                    data-testid="select-inventory-tax-rate"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="18.00">18% (Frames, Sunglasses, Accessories)</option>
                    <option value="12.00">12% (Standard Optical Devices)</option>
                    <option value="5.00">5% (Corrective Lenses & Prescription)</option>
                    <option value="0.00">0% (Nil Rated)</option>
                  </select>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ This product is marked as Tax Exempted under GST rules. 0.00% tax will be levied.
                </p>
              )}
            </div>
          </div>

          {/* Collapsible Advanced / Secondary Options */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <span>{showAdvanced ? '▲ Less Options' : '▼ More Options (Cost Price, MRP, HSN, Low Stock, Brand/Model)'}</span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-4 space-y-3 bg-white dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
                {/* Brand & Model (Explicit separation) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="inv-brand" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Brand Name
                    </label>
                    <input
                      id="inv-brand"
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Titan, Ray-Ban, Essilor"
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="inv-model" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Model / Variant
                    </label>
                    <input
                      id="inv-model"
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. RB3025-001"
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Cost Price & MRP */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="inv-cost-price" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Cost Price (₹)
                    </label>
                    <input
                      id="inv-cost-price"
                      type="text"
                      inputMode="decimal"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="inv-mrp" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      MRP (₹)
                    </label>
                    <input
                      id="inv-mrp"
                      type="text"
                      inputMode="decimal"
                      value={mrp}
                      onChange={(e) => setMrp(e.target.value)}
                      placeholder="1999.00"
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="inv-hsn" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      HSN Code
                    </label>
                    <input
                      id="inv-hsn"
                      type="text"
                      value={hsnCode}
                      onChange={(e) => setHsnCode(e.target.value)}
                      placeholder="9003"
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Low Stock Alert & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="inv-low-stock" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Low Stock Alert Threshold
                    </label>
                    <input
                      id="inv-low-stock"
                      type="number"
                      min="0"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 0)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {branches.length > 0 && (
                    <div>
                      <label htmlFor="inv-branch" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Store Branch
                      </label>
                      <select
                        id="inv-branch"
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Description / Notes */}
                <div>
                  <label htmlFor="inv-desc" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Notes / Description
                  </label>
                  <input
                    id="inv-desc"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional item details, material specs, or supplier notes"
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 pt-3.5 mt-2">
            <button
              type="button"
              data-testid="btn-cancel-add-inventory"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="btn-save-inventory-item"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Add Inventory Item</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
