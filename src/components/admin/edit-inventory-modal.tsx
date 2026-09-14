'use client';

import { useState, useEffect } from 'react';
import { X, Edit3, Package, Tag, Layers, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  updateInventoryItem,
  type InventoryRow,
} from '@/actions/inventory-actions';
import type { CreateInventoryItemInput } from '@/lib/validators/inventory';

interface EditInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryRow | null;
  onItemUpdated: (updatedItem: InventoryRow) => void;
}

export function EditInventoryModal({
  isOpen,
  onClose,
  item,
  onItemUpdated,
}: EditInventoryModalProps) {
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState<CreateInventoryItemInput['category']>('FRAME');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [stockQuantity, setStockQuantity] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [taxRate, setTaxRate] = useState<'5.00' | '18.00'>('18.00');
  const [hsnCode, setHsnCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setSku(item.sku || '');
      setBarcode(item.barcode || '');
      setCategory(item.category as CreateInventoryItemInput['category']);
      setBrand(item.brand || '');
      setModel(item.model || '');
      setDescription(item.description || '');
      setCostPrice(item.costPrice || '0.00');
      setSellingPrice(item.sellingPrice || '');
      setMrp(item.mrp || '');
      setStockQuantity(item.stockQuantity ?? 0);
      setLowStockThreshold(item.lowStockThreshold ?? 5);
      setTaxRate((item.taxRate as any) || '18.00');
      setHsnCode(item.hsnCode || '');
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sku.trim()) {
      toast.error('SKU is required');
      return;
    }
    if (!sellingPrice.trim() || isNaN(Number(sellingPrice)) || Number(sellingPrice) < 0) {
      toast.error('Valid selling price is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await updateInventoryItem(item.id, {
        sku: sku.trim(),
        barcode: barcode.trim() || null,
        category,
        brand: brand.trim() || null,
        model: model.trim() || null,
        description: description.trim() || null,
        costPrice: costPrice.trim() || '0.00',
        sellingPrice: sellingPrice.trim(),
        mrp: mrp.trim() || null,
        stockQuantity,
        lowStockThreshold,
        taxRate,
        hsnCode: hsnCode.trim() || null,
      });

      if (res.success && res.item) {
        toast.success('Inventory Item Updated', {
          description: `${res.item.sku} (${res.item.brand || ''} ${res.item.model || ''}) updated successfully.`,
        });
        onItemUpdated(res.item);
        onClose();
      } else {
        toast.error('Failed to update item', {
          description: res.error || 'Please check the values and try again.',
        });
      }
    } catch (err) {
      console.error('[EditInventoryModal] Error:', err);
      toast.error('Error updating item', {
        description: 'Failed to connect to inventory service.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-inventory-title"
        className="relative z-50 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <h3
                id="edit-inventory-title"
                className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight"
              >
                Edit Inventory Item
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Update stock levels, pricing, category, and optical specs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Row 1: SKU & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span>SKU Code</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                data-testid="input-edit-inventory-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. RAY-RB3025-58"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <span>Category</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="FRAME">Frames</option>
                <option value="SUNGLASS">Sunglasses</option>
                <option value="OPHTHALMIC_LENS">Lenses</option>
                <option value="CONTACT_LENS">Contact Lenses</option>
                <option value="ACCESSORY">Accessories</option>
                <option value="SERVICE">Services</option>
              </select>
            </div>
          </div>

          {/* Row 2: Brand & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Brand
              </label>
              <input
                type="text"
                data-testid="input-edit-inventory-brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Ray-Ban, Oakley, Titan"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Model / Variant
              </label>
              <input
                type="text"
                data-testid="input-edit-inventory-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Aviator Classic Gunmetal"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 3: Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product details, material specs, dimensions"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Row 4: Pricing Grid (Cost Price, Selling Price, MRP) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                <span>Selling Price (₹)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                data-testid="input-edit-inventory-price"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Cost Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                MRP (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 5: Stock Quantities & Threshold */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Package className="h-3.5 w-3.5 text-slate-400" />
                <span>Current Stock Qty</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                data-testid="input-edit-inventory-stock"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 6: Tax Rate, HSN & Barcode */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                GST Tax Rate
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="18.00">18% (Frames / Sunglasses)</option>
                <option value="5.00">5% (Lenses)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                HSN Code
              </label>
              <input
                type="text"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="e.g. 9003"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Barcode
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan / Barcode"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="btn-submit-edit-inventory"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Update Product</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
