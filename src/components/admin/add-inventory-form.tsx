'use client';

import { useState } from 'react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form state
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState<(typeof inventoryCategoryValues)[number]>('FRAME');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('0.00');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [taxRate, setTaxRate] = useState<'5.00' | '18.00'>('18.00');
  const [hsnCode, setHsnCode] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setSku('');
    setBarcode('');
    setCategory('FRAME');
    setBrand('');
    setModel('');
    setDescription('');
    setCostPrice('0.00');
    setSellingPrice('');
    setMrp('');
    setStockQuantity(1);
    setLowStockThreshold(5);
    setTaxRate('18.00');
    setHsnCode('');
    setValidationError(null);
  };

  const handleCategoryChange = (newCat: (typeof inventoryCategoryValues)[number]) => {
    setCategory(newCat);
    // Auto-adjust default GST rate based on category
    if (newCat === 'OPHTHALMIC_LENS' || newCat === 'CONTACT_LENS') {
      setTaxRate('5.00');
      setHsnCode('9001');
    } else {
      setTaxRate('18.00');
      if (newCat === 'FRAME') setHsnCode('9003');
      else if (newCat === 'SUNGLASS') setHsnCode('9004');
      else if (newCat === 'ACCESSORY') setHsnCode('9003');
      else setHsnCode('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Basic frontend checks
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
      const payload: CreateInventoryItemInput = {
        sku: sku.trim() ? sku.trim().toUpperCase() : undefined,
        barcode: barcode.trim() || null,
        category,
        brand: brand.trim() || null,
        model: model.trim() || null,
        description: description.trim() || null,
        costPrice: costPrice.trim() || '0.00',
        sellingPrice: sellingPrice.trim(),
        mrp: mrp.trim() || null,
        stockQuantity: Number(stockQuantity) || 0,
        lowStockThreshold: Number(lowStockThreshold) || 5,
        taxRate,
        hsnCode: hsnCode.trim() || null,
      };

      const result = await addInventoryItem(payload);

      if (result.success && result.item) {
        toast.success('Item Added to Inventory', {
          description: `${result.item.brand || 'Item'} ${result.item.model || ''} (${result.item.sku}) added with stock of ${result.item.stockQuantity}.`,
        });
        resetForm();
        onSuccess?.(result.item);
        onClose();
      } else {
        setValidationError(result.error || 'Failed to add item. Check your inputs.');
        toast.error('Failed to Add Item', {
          description: result.error || 'Please review the form for errors.',
        });
      }
    } catch (err) {
      console.error('[AddInventoryForm] error:', err);
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setValidationError(msg);
      toast.error('Unexpected Error', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/70 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Add Inventory Item
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Create a new optical SKU, frame, lens, or accessory
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-100 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {validationError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-800 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Row 1: Category & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inv-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="inv-category"
                value={category}
                onChange={(e) =>
                  handleCategoryChange(
                    e.target.value as (typeof inventoryCategoryValues)[number]
                  )
                }
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/20"
              >
                <option value="FRAME">Frame (Optical Chassis)</option>
                <option value="SUNGLASS">Sunglass</option>
                <option value="OPHTHALMIC_LENS">Ophthalmic Lens</option>
                <option value="CONTACT_LENS">Contact Lens</option>
                <option value="ACCESSORY">Accessory / Solution</option>
                <option value="SERVICE">Optometry Service / Repair</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="inv-sku" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  SKU (Stock Keeping Unit)
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-300">
                  Optional (Auto-generated if blank)
                </span>
              </div>
              <div className="relative">
                <input
                  id="inv-sku"
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g. FRA-7X29-AB41"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/20 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Brand & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inv-brand" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Brand Name
              </label>
              <input
                id="inv-brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Titan, Ray-Ban, Essilor, Fastrack"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label htmlFor="inv-model" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Model / Variant / Chassis No.
              </label>
              <input
                id="inv-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. TI 5001 Matte Black 52-18"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/20"
              />
            </div>
          </div>

          {/* Row 3: Description / Specs */}
          <div>
            <label htmlFor="inv-desc" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes
            </label>
            <input
              id="inv-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Acetate full rim, spring hinges, demo lenses included"
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/20"
            />
          </div>

          {/* Row 4: Pricing (Cost Price, Selling Price, MRP) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3.5">
            <div>
              <label htmlFor="inv-cost-price" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cost Price (₹)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-slate-300">
                  ₹
                </span>
                <input
                  id="inv-cost-price"
                  type="text"
                  inputMode="decimal"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 pl-6 pr-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-300">Wholesale / Landed</p>
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
                  type="text"
                  inputMode="decimal"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="2499.00"
                  required
                  className="w-full rounded-md border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-950 py-1.5 pl-6 pr-2 text-xs font-mono font-bold text-blue-700 dark:text-blue-300 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[10px] text-blue-700 dark:text-blue-300">
                Billed customer rate
              </p>
            </div>

            <div>
              <label htmlFor="inv-mrp" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                MRP (₹)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-slate-300">
                  ₹
                </span>
                <input
                  id="inv-mrp"
                  type="text"
                  inputMode="decimal"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  placeholder="2999.00"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-1.5 pl-6 pr-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-300">Printed Tag Price</p>
            </div>
          </div>

          {/* Row 5: Tax Rate & Stock Qty & Low Stock Alert */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="inv-tax-rate" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GST Tax Rate <span className="text-red-500">*</span>
              </label>
              <select
                id="inv-tax-rate"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value as '5.00' | '18.00')}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-blue-600 focus:outline-none"
              >
                <option value="18.00">18.00% (Frames / Sunglasses)</option>
                <option value="5.00">5.00% (Corrective Lenses)</option>
              </select>
            </div>

            <div>
              <label htmlFor="inv-stock" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                id="inv-stock"
                type="number"
                min="0"
                step="1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="inv-low-stock" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Low Stock Threshold
              </label>
              <input
                id="inv-low-stock"
                type="number"
                min="0"
                step="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 6: Barcode & HSN Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inv-barcode" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Barcode / EAN (Optional)
              </label>
              <input
                id="inv-barcode"
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="inv-hsn" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                HSN Code (Optional)
              </label>
              <input
                id="inv-hsn"
                type="text"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="e.g. 9003 (Frames), 9001 (Lenses)"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Action Buttons inside the form */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Item...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>Save Inventory Item</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
