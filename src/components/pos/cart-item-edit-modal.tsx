'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Edit3, Save, Trash2, Check, User, Info } from 'lucide-react';
import Decimal from 'decimal.js';
import type { CartItem } from './billing-cart';

interface CartItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CartItem | null;
  activePatients: Array<{
    id: string;
    fullName: string;
    relationType?: string;
  }>;
  onSave: (id: string, updates: Partial<CartItem>) => void;
}

export function CartItemEditModal({
  isOpen,
  onClose,
  item,
  activePatients,
  onSave,
}: CartItemEditModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<string>('0.00');
  const [discount, setDiscount] = useState<string>('0.00');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [patientId, setPatientId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [lensType, setLensType] = useState<string>('');
  const [coating, setCoating] = useState<string>('');
  const [lensMaterial, setLensMaterial] = useState<string>('');
  const [isCustomerOwnFrame, setIsCustomerOwnFrame] = useState<boolean>(false);
  const [fittingNote, setFittingNote] = useState<string>('');

  useEffect(() => {
    if (item) {
      const q = item.quantity || 1;
      const p = item.unitPrice || '0.00';
      const d = item.discount || item.discountPerUnit || '0.00';
      setQuantity(q);
      setUnitPrice(p);
      setDiscount(d);
      setPatientId(item.patientId || '');
      setDescription(item.description || '');
      setLensType(item.lensType || '');
      setCoating(item.coating || '');
      setLensMaterial(item.lensMaterial || '');
      setIsCustomerOwnFrame(!!item.isCustomerOwnFrame);
      setFittingNote(item.fittingNote || '');

      try {
        const sub = new Decimal(p).times(q);
        const dDec = new Decimal(d);
        if (sub.greaterThan(0) && dDec.greaterThan(0)) {
          setDiscountPercent(dDec.dividedBy(sub).times(100).toFixed(2).replace(/\.?0+$/, ''));
        } else {
          setDiscountPercent('');
        }
      } catch {
        setDiscountPercent('');
      }
    }
  }, [item]);

  const handleDiscountAmountChange = (val: string) => {
    if (!/^\d*(\.\d{0,2})?$/.test(val)) return;
    setDiscount(val);
    try {
      const sub = new Decimal(unitPrice || '0').times(quantity || 1);
      if (!val || val === '.') {
        setDiscountPercent('');
      } else if (sub.greaterThan(0)) {
        const dDec = new Decimal(val);
        const pDec = dDec.dividedBy(sub).times(100);
        setDiscountPercent(pDec.toFixed(2).replace(/\.?0+$/, ''));
      } else {
        setDiscountPercent('');
      }
    } catch {
      setDiscountPercent('');
    }
  };

  const handleDiscountPercentChange = (val: string) => {
    if (!/^\d*(\.\d{0,2})?$/.test(val)) return;
    if (parseFloat(val) > 100) return;
    setDiscountPercent(val);
    try {
      const sub = new Decimal(unitPrice || '0').times(quantity || 1);
      if (!val || val === '.') {
        setDiscount('0.00');
      } else if (sub.greaterThan(0)) {
        const pDec = new Decimal(val);
        const amtDec = sub.times(pDec).dividedBy(100);
        setDiscount(amtDec.toFixed(2));
      } else {
        setDiscount('0.00');
      }
    } catch {
      setDiscount('0.00');
    }
  };

  // Live line calculation using decimal.js
  const liveTotal = useMemo(() => {
    try {
      const q = new Decimal(quantity > 0 ? quantity : 1);
      const p = new Decimal(unitPrice || '0.00');
      const d = new Decimal(discount || '0.00');
      const tRate = new Decimal(item?.taxRate || '0.00');

      const subtotal = p.times(q);
      const taxable = subtotal.minus(d).clamp(0, Infinity);
      const tax = taxable.times(tRate).dividedBy(100);
      const lineTotal = taxable.plus(tax);

      return {
        subtotal: subtotal.toFixed(2),
        taxable: taxable.toFixed(2),
        tax: tax.toFixed(2),
        total: lineTotal.toFixed(2),
      };
    } catch {
      return { subtotal: '0.00', taxable: '0.00', tax: '0.00', total: '0.00' };
    }
  }, [quantity, unitPrice, discount, item?.taxRate]);

  if (!isOpen || !item) return null;

  const isLens =
    item.category === 'OPHTHALMIC_LENS' ||
    item.category === 'CONTACT_LENS' ||
    !!item.lensType;
  const isFrame = item.category === 'FRAME' || item.isCustomerOwnFrame;

  const handleSave = () => {
    onSave(item.id, {
      quantity,
      unitPrice,
      discount,
      patientId: patientId || null,
      description,
      lensType: lensType || null,
      coating: coating || null,
      lensMaterial: lensMaterial || null,
      isCustomerOwnFrame,
      fittingNote,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Edit Cart Line Item
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                SKU: {item.sku} {item.hsnCode ? `· HSN ${item.hsnCode}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Item Description
            </label>
            <input
              type="text"
              data-testid="edit-cart-item-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Pricing & Qty Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min={1}
                data-testid="edit-cart-item-qty"
                value={quantity}
                onChange={(e) => {
                  const newQty = Math.max(1, parseInt(e.target.value) || 1);
                  setQuantity(newQty);
                  try {
                    const sub = new Decimal(unitPrice || '0').times(newQty);
                    const dDec = new Decimal(discount || '0');
                    if (sub.greaterThan(0) && dDec.greaterThan(0)) {
                      setDiscountPercent(dDec.dividedBy(sub).times(100).toFixed(2).replace(/\.?0+$/, ''));
                    }
                  } catch {}
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit Price (₹)
              </label>
              <input
                type="text"
                data-testid="edit-cart-item-price"
                value={unitPrice}
                onChange={(e) => {
                  const newPrice = e.target.value;
                  setUnitPrice(newPrice);
                  try {
                    const sub = new Decimal(newPrice || '0').times(quantity || 1);
                    const dDec = new Decimal(discount || '0');
                    if (sub.greaterThan(0) && dDec.greaterThan(0)) {
                      setDiscountPercent(dDec.dividedBy(sub).times(100).toFixed(2).replace(/\.?0+$/, ''));
                    }
                  } catch {}
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Discount (₹)
              </label>
              <input
                type="text"
                data-testid="edit-cart-item-discount"
                value={discount}
                onChange={(e) => handleDiscountAmountChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Discount (%)
              </label>
              <input
                type="text"
                data-testid="edit-cart-item-discount-percent"
                value={discountPercent}
                placeholder="0%"
                onChange={(e) => handleDiscountPercentChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Patient Assignment */}
          {activePatients.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assign to Family Member / Patient
              </label>
              <select
                data-testid="edit-cart-item-patient"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="">Unassigned (Invoice Level)</option>
                {activePatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.relationType || 'Current'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lens Attributes (If lens) */}
          {isLens && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 block">
                Lens Technical Specifications
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Type</label>
                  <input
                    type="text"
                    value={lensType}
                    onChange={(e) => setLensType(e.target.value)}
                    placeholder="e.g. SINGLE_VISION"
                    className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Coating</label>
                  <input
                    type="text"
                    value={coating}
                    onChange={(e) => setCoating(e.target.value)}
                    placeholder="e.g. BLUE_FILTER"
                    className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Material</label>
                  <input
                    type="text"
                    value={lensMaterial}
                    onChange={(e) => setLensMaterial(e.target.value)}
                    placeholder="e.g. CR39"
                    className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Frame Notes / Customer Frame (If frame) */}
          {isFrame && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                  Frame & Workshop Instructions
                </span>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCustomerOwnFrame}
                    onChange={(e) => setIsCustomerOwnFrame(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Customer's Own Frame</span>
                </label>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Glazing & Fitting Instructions
                </label>
                <input
                  type="text"
                  data-testid="edit-cart-item-fitting-note"
                  value={fittingNote}
                  onChange={(e) => setFittingNote(e.target.value)}
                  placeholder="e.g. Bevel fit, frame in good condition"
                  className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Live Line Total Calculation Summary */}
          <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 p-3 text-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                Calculated Line Total ({item.taxRate}% GST)
              </span>
              <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                Taxable: ₹{liveTotal.taxable} + Tax: ₹{liveTotal.tax}
              </span>
            </div>
            <span className="text-base font-bold font-mono text-blue-700 dark:text-blue-300">
              ₹{liveTotal.total}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-3 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="btn-save-cart-item-edit"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
