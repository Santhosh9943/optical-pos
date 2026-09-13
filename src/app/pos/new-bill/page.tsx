'use client';

import { useState, useMemo, useEffect } from 'react';
import Decimal from 'decimal.js';
import { toast } from 'sonner';
import { PatientSearch, type Patient } from '@/components/pos/patient-search';
import {
  PrescriptionGrid,
  initialPrescriptionValues,
  type PrescriptionValues,
} from '@/components/pos/prescription-grid';
import {
  InventorySearch,
  type InventoryItem,
} from '@/components/pos/inventory-search';
import {
  BillingCart,
  type CartItem,
} from '@/components/pos/billing-cart';
import {
  PaymentPanel,
  type PaymentMode,
} from '@/components/pos/payment-panel';
import { processOpticalOrder } from '@/actions/process-optical-order';
import {
  ThermalReceipt,
  WorkshopSlip,
  type PrintOrderData,
} from '@/components/pos/print-layouts';
import { A4Invoice } from '@/components/pos/print-a4-invoice';
import {
  Glasses,
  Receipt,
  Users,
  Package,
  ClipboardList,
  BarChart3,
  Settings,
  PlusCircle,
  Clock,
  UserCheck,
  CreditCard,
  Printer,
  Sparkles,
  ShoppingBag,
  Check,
  Loader2,
  CheckCircle2,
  FileText,
  RotateCcw,
} from 'lucide-react';

export type PrintMode = 'thermal' | 'workshop' | 'a4' | null;

export default function NewBillPage() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [prescription, setPrescription] = useState<PrescriptionValues>(initialPrescriptionValues);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [advancePaid, setAdvancePaid] = useState('0.00');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<PrintOrderData | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>(null);

  // Monetary calculations strictly using decimal.js
  const totals = useMemo(() => {
    let subtotal = new Decimal(0);
    let totalDiscount = new Decimal(0);
    let taxableValue = new Decimal(0);
    let totalTax = new Decimal(0);
    let cgst = new Decimal(0);
    let sgst = new Decimal(0);
    let grandTotal = new Decimal(0);
    let totalItems = 0;

    for (const item of cartItems) {
      const qty = new Decimal(item.quantity > 0 ? item.quantity : 1);
      const unitPrice = new Decimal(item.unitPrice || '0.00');
      const discount = new Decimal(item.discount || item.discountPerUnit || '0.00');
      const taxRate = new Decimal(item.taxRate || '0.00');

      // Line Subtotal = Unit Price × Qty
      const lineSubtotal = unitPrice.times(qty);
      // Line Taxable Value = Line Subtotal - Discount (clamped to 0)
      const diff = lineSubtotal.minus(discount);
      const lineTaxableValue = diff.isNegative() ? new Decimal(0) : diff;
      // Line Tax = Line Taxable Value × (Tax Rate / 100)
      const lineTax = lineTaxableValue.times(taxRate).dividedBy(100);
      const lineCgst = lineTax.dividedBy(2);
      const lineSgst = lineTax.dividedBy(2);
      const lineTotal = lineTaxableValue.plus(lineTax);

      subtotal = subtotal.plus(lineSubtotal);
      totalDiscount = totalDiscount.plus(discount);
      taxableValue = taxableValue.plus(lineTaxableValue);
      totalTax = totalTax.plus(lineTax);
      cgst = cgst.plus(lineCgst);
      sgst = sgst.plus(lineSgst);
      grandTotal = grandTotal.plus(lineTotal);
      totalItems += item.quantity;
    }

    return {
      subtotal,
      totalDiscount,
      taxableValue,
      totalTax,
      cgst,
      sgst,
      grandTotal,
      totalItems,
    };
  }, [cartItems]);

  const handleAddInventoryItem = (item: InventoryItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.inventoryItemId === item.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return next;
      }

      const newItem: CartItem = {
        id: crypto.randomUUID(),
        inventoryItemId: item.id,
        sku: item.sku,
        description: `${item.brand ? item.brand + ' ' : ''}${item.model ? item.model + ' — ' : ''}${item.description || item.sku}`,
        category: item.category,
        hsnCode: item.hsnCode,
        quantity: 1,
        unitPrice: item.sellingPrice,
        discount: '0.00',
        taxRate: item.taxRate,
        lensType: item.lensType,
        coating: item.coating,
        lensMaterial: item.lensMaterial,
      };
      return [...prev, newItem];
    });
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, qty) } : item
      )
    );
  };

  const handleUpdateDiscount = (id: string, discount: string) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, discount } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleNewOrder = () => {
    setSelectedPatient(null);
    setPrescription(initialPrescriptionValues);
    setCartItems([]);
    setAdvancePaid('0.00');
    setPaymentReference('');
    setPaymentMode('CASH');
    setCompletedOrder(null);
  };

  // ───────────────────────────────────────────────────────────
  // STAGE 4: PRINT ACTIONS & PRINT-MODE BODY CLASS MANAGEMENT
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!printMode) return;

    const className = `print-mode-${printMode}`;
    document.body.classList.add(className);

    // Dynamic @page rule for 80mm thermal roll vs A4 workshop slip
    const styleEl = document.createElement('style');
    styleEl.id = 'print-page-style';
    styleEl.innerHTML =
      printMode === 'thermal'
        ? '@page { size: 80mm auto; margin: 0; }'
        : '@page { size: A4; margin: 15mm; }';
    document.head.appendChild(styleEl);

    const handleAfterPrint = () => {
      document.body.classList.remove(className);
      const s = document.getElementById('print-page-style');
      if (s) s.remove();
      setPrintMode(null);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    const timer = setTimeout(() => {
      window.print();
    }, 100);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove(className);
      const s = document.getElementById('print-page-style');
      if (s) s.remove();
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [printMode]);

  const handleClearCart = () => {
    setCartItems([]);
    setAdvancePaid('0.00');
    setPaymentReference('');
  };

  const handleCheckout = async () => {
    if (isSubmitting) return;

    if (!selectedPatient) {
      toast.error('Patient Required', {
        description: 'Please search and select a patient before completing checkout.',
      });
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Cart Empty', {
        description: 'Please add at least one inventory item to the cart before checkout.',
      });
      return;
    }

    const total = totals.grandTotal;
    const advance = new Decimal(advancePaid || '0.00');
    if (advance.greaterThan(total)) {
      toast.error('Invalid Advance Amount', {
        description: `Advance payment (₹${advance.toFixed(2)}) cannot exceed Grand Total (₹${total.toFixed(2)}).`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItems = cartItems.map((item) => {
        const lineDiscountDec = new Decimal(item.discount || '0.00');
        const discountPerUnit =
          item.quantity > 0
            ? lineDiscountDec.dividedBy(item.quantity).toFixed(2)
            : '0.00';

        return {
          inventoryItemId: item.inventoryItemId,
          description: item.description,
          hsnCode: item.hsnCode ?? null,
          quantity: item.quantity,
          unitPrice: new Decimal(item.unitPrice || '0.00').toFixed(2),
          discountPerUnit,
          taxRate: (item.taxRate === '5.00' ? '5.00' : '18.00') as '5.00' | '18.00',
          lensType: (item.lensType as any) ?? null,
          coating: (item.coating as any) ?? null,
          lensMaterial: (item.lensMaterial as any) ?? null,
        };
      });

      const hasPrescription =
        prescription.odSphere !== 0 ||
        prescription.odCylinder !== 0 ||
        prescription.osSphere !== 0 ||
        prescription.osCylinder !== 0 ||
        prescription.odAdd !== 0 ||
        prescription.osAdd !== 0;

      const payload = {
        customerId: selectedPatient.id,
        prescription: hasPrescription
          ? {
              customerId: selectedPatient.id,
              odSphere: prescription.odSphere,
              odCylinder: prescription.odCylinder,
              odAxis: prescription.odAxis,
              odAdd: prescription.odAdd,
              odPd: prescription.odPd,
              osSphere: prescription.osSphere,
              osCylinder: prescription.osCylinder,
              osAxis: prescription.osAxis,
              osAdd: prescription.osAdd,
              osPd: prescription.osPd,
              binocularPd: prescription.binocularPd,
            }
          : undefined,
        items: orderItems,
        advancePayment: advance.greaterThan(0)
          ? {
              amount: advance.toFixed(2),
              mode: paymentMode,
              reference: paymentReference.trim() || undefined,
            }
          : undefined,
      };

      const result = await processOpticalOrder(payload);

      if (result.success) {
        const finalizedOrder: PrintOrderData = {
          invoiceNumber: result.invoiceNumber,
          invoiceId: result.invoiceId,
          createdAt: new Date().toISOString(),
          customer: {
            name: selectedPatient.fullName,
            phone: selectedPatient.phone,
            age: selectedPatient.age,
            gender: selectedPatient.gender,
            address: selectedPatient.city ?? null,
          },
          items: cartItems.map((item) => ({
            id: item.id,
            inventoryItemId: item.inventoryItemId,
            sku: item.sku,
            description: item.description,
            hsnCode: item.hsnCode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            discountPerUnit: item.discountPerUnit,
            taxRate: item.taxRate,
            category: item.category,
            lensType: item.lensType,
            coating: item.coating,
            lensMaterial: item.lensMaterial,
          })),
          prescription: hasPrescription ? prescription : null,
          grandTotal: result.grandTotal,
          advancePaid: advance.toFixed(2),
          balanceDue: result.balanceDue,
          paymentMode,
          paymentReference,
        };

        setCompletedOrder(finalizedOrder);
        toast.success(`Order Placed: ${result.invoiceNumber}`, {
          description: `Grand Total: ₹${result.grandTotal} · Balance Due: ₹${result.balanceDue}`,
          duration: 7000,
        });
      } else {
        toast.error(`Checkout Failed: ${result.error}`, {
          description: result.message,
          duration: 7000,
        });
      }
    } catch (err) {
      console.error('[checkout] Unexpected error:', err);
      toast.error('Unexpected Checkout Error', {
        description: 'Failed to process order. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        handleCheckout();
      } else if (e.key === 'F1') {
        e.preventDefault();
        handleNewOrder();
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (completedOrder) {
          setPrintMode('thermal');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      {/* ── POS Left Navigation Sidebar ── */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        {/* Brand Header */}
        <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Glasses className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-slate-900">
              Optix<span className="text-blue-600">OS</span>
            </span>
            <span className="ml-1.5 rounded bg-blue-50 px-1 py-0.2 text-[10px] font-semibold text-blue-700">
              POS
            </span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 space-y-0.5 p-2 text-xs font-medium text-slate-600">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Operations
          </div>
          <a
            href="/pos/new-bill"
            className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 font-semibold text-blue-700"
          >
            <Receipt className="h-4 w-4 text-blue-600" />
            <span>New Bill (F1)</span>
          </a>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Users className="h-4 w-4 text-slate-400" />
            <span>Patients</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Package className="h-4 w-4 text-slate-400" />
            <span>Inventory (F3)</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <span>Lab Orders</span>
          </button>

          <div className="pt-3">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Management
            </div>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <span>Reports</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Settings</span>
            </button>
          </div>
        </nav>

        {/* Function Keys Cheatsheet (Footer of Sidebar) */}
        <div className="border-t border-slate-200 bg-slate-50 p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Keyboard Shortcuts
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-600">
            <div className="rounded bg-white px-1.5 py-0.5 border border-slate-200 shadow-2xs">
              <span className="font-bold text-blue-600">F1</span> New Bill
            </div>
            <div className="rounded bg-white px-1.5 py-0.5 border border-slate-200 shadow-2xs">
              <span className="font-bold text-blue-600">F2</span> Find
            </div>
            <div className="rounded bg-white px-1.5 py-0.5 border border-slate-200 shadow-2xs">
              <span className="font-bold text-blue-600">F3</span> Catalog
            </div>
            <div className="rounded bg-white px-1.5 py-0.5 border border-slate-200 shadow-2xs">
              <span className="font-bold text-blue-600">F4</span> Pay
            </div>
            <div className="rounded bg-white px-1.5 py-0.5 border border-slate-200 shadow-2xs">
              <span className="font-bold text-blue-600">F5</span> Print
            </div>
            <div className="rounded bg-white px-1.5 py-0.5 border border-slate-200 shadow-2xs">
              <span className="font-bold text-blue-600">F6</span> Lab Slip
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Application Workspace ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Operational Bar */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          {/* Top-Left: Mounted Patient Search Component */}
          <div className="w-96 max-w-md">
            <PatientSearch
              onPatientSelect={(patient) => setSelectedPatient(patient)}
              selectedPatient={selectedPatient}
              onClearPatient={() => setSelectedPatient(null)}
            />
          </div>

          {/* Top-Right: Shift / Store Status & Actions */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Shift Active
            </div>
            <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Counter 01
            </div>
            <button
              type="button"
              onClick={handleNewOrder}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Order [F1]
            </button>
          </div>
        </header>

        {/* ── POS Two-Column Split Layout ── */}
        <main className="grid flex-1 grid-cols-12 gap-3 overflow-hidden p-3">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT WORKSPACE PANE (Cols 1-7): Patient Summary & Clinical Specs
              ══════════════════════════════════════════════════════════════════ */}
          <div className="col-span-7 flex flex-col gap-3 overflow-y-auto">
            {/* Patient Header / Card */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Patient Profile
                  </h2>
                </div>
                {selectedPatient ? (
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                    Selected Patient
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
                    Search or enter phone to populate
                  </span>
                )}
              </div>

              {selectedPatient ? (
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-md bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[10px] uppercase font-medium text-slate-400 block">
                      Name
                    </span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {selectedPatient.fullName}
                    </span>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[10px] uppercase font-medium text-slate-400 block">
                      Phone Number
                    </span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {selectedPatient.phone}
                    </span>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2 border border-slate-100">
                    <span className="text-[10px] uppercase font-medium text-slate-400 block">
                      Demographics
                    </span>
                    <span className="font-semibold text-slate-900">
                      {selectedPatient.gender ?? '—'}
                      {selectedPatient.age ? `, ${selectedPatient.age} yrs` : ''}
                    </span>
                  </div>
                  {selectedPatient.city && (
                    <div className="rounded-md bg-slate-50 p-2 border border-slate-100">
                      <span className="text-[10px] uppercase font-medium text-slate-400 block">
                        Location
                      </span>
                      <span className="font-medium text-slate-800">
                        {selectedPatient.city}
                      </span>
                    </div>
                  )}
                  {selectedPatient.advanceBalance && (
                    <div className="rounded-md bg-emerald-50/60 p-2 border border-emerald-100">
                      <span className="text-[10px] uppercase font-medium text-emerald-600 block">
                        Available Credit
                      </span>
                      <span className="font-bold text-emerald-700 font-mono">
                        ₹{selectedPatient.advanceBalance}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center justify-center rounded-md border border-dashed border-slate-200 py-6 text-center text-slate-400">
                  <UserCheck className="h-8 w-8 text-slate-300" />
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    No patient selected
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Search above or type phone to lookup previous prescriptions & orders
                  </p>
                </div>
              )}
            </div>

            {/* Prescription Matrix: Synchronised OD/OS Grid */}
            <PrescriptionGrid
              value={prescription}
              onChange={setPrescription}
            />

            {/* Placeholder Pane: Lens Specification */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Ophthalmic Lens Specification
                  </h3>
                </div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-500">
                  Type · Coating · Material
                </span>
              </div>
              <div className="mt-3 flex items-center justify-center py-4 text-xs text-slate-400 italic">
                Lens type selection (Single Vision, Progressive, Blue-Cut) and lab attributes
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT CHECKOUT LEDGER (Cols 8-12): Billing Cart & Payment Settlement
              ══════════════════════════════════════════════════════════════════ */}
          <div className="col-span-5 flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0">
              {/* Cart Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="h-4 w-4 text-blue-600" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Invoice Cart
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="text-[11px] font-medium text-slate-400 hover:text-red-600 transition"
                    >
                      Clear
                    </button>
                  )}
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {totals.totalItems} {totals.totalItems === 1 ? 'Item' : 'Items'}
                  </span>
                </div>
              </div>

              {/* Mounted Debounced Inventory Search Component */}
              <div className="mt-3">
                <InventorySearch onAdd={handleAddInventoryItem} />
              </div>

              {/* Line Items Container / Billing Cart Table */}
              <div className="mt-3 flex-1 min-h-0 overflow-y-auto">
                <BillingCart
                  items={cartItems}
                  onUpdateQuantity={handleUpdateQuantity}
                  onUpdateDiscount={handleUpdateDiscount}
                  onRemoveItem={handleRemoveItem}
                  onClearCart={handleClearCart}
                  showSummary={false}
                />
              </div>
            </div>

            {/* Financial Totals & Summary Breakdown */}
            <div className="border-t border-slate-200 pt-3 mt-3 flex-shrink-0">
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Cart Subtotal</span>
                  <span className="font-mono font-medium text-slate-800">
                    ₹{totals.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cart Total Discount</span>
                  <span
                    className={`font-mono font-medium ${
                      totals.totalDiscount.greaterThan(0)
                        ? 'text-emerald-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {totals.totalDiscount.greaterThan(0)
                      ? `−₹${totals.totalDiscount.toFixed(2)}`
                      : '₹0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Taxable Value</span>
                  <span className="font-mono font-medium text-slate-800">
                    ₹{totals.taxableValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>CGST</span>
                  <span className="font-mono">₹{totals.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>SGST</span>
                  <span className="font-mono">₹{totals.sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="font-medium">Cart Total Tax</span>
                  <span className="font-mono font-medium">
                    ₹{totals.totalTax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span className="font-mono text-base text-blue-600">
                    ₹{totals.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Mounted Payment Panel */}
              <div className="mt-2.5">
                <PaymentPanel
                  grandTotal={totals.grandTotal}
                  advancePaid={advancePaid}
                  onAdvancePaidChange={setAdvancePaid}
                  paymentMode={paymentMode}
                  onPaymentModeChange={setPaymentMode}
                  reference={paymentReference}
                  onReferenceChange={setPaymentReference}
                  disabled={isSubmitting || cartItems.length === 0}
                />
              </div>

              {/* Checkout Action Button & Post-Order Print Flow */}
              <div className="mt-2.5 space-y-2">
                {completedOrder ? (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50/70 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Order #{completedOrder.invoiceNumber} Placed!</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPrintMode('thermal')}
                          className="flex items-center justify-center gap-1.5 rounded-md bg-slate-900 py-2 px-2 text-[11px] font-bold text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] transition"
                        >
                          <Printer className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Print Thermal</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPrintMode('a4')}
                          className="flex items-center justify-center gap-1.5 rounded-md bg-blue-600 py-2 px-2 text-[11px] font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] transition"
                        >
                          <FileText className="h-3.5 w-3.5 text-white" />
                          <span>Print A4 Invoice</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPrintMode('workshop')}
                        className="w-full flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white py-1.5 px-2 text-[11px] font-bold text-slate-800 shadow-sm hover:bg-slate-100 active:scale-[0.99] transition"
                      >
                        <ClipboardList className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Print Lab Slip</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleNewOrder}
                      className="w-full flex items-center justify-center gap-1.5 rounded-md bg-blue-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] transition"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Start New Order (F1)</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={cartItems.length === 0 || !selectedPatient || isSubmitting}
                    onClick={handleCheckout}
                    className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 transition"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing Order...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Complete Order (F10)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── STAGE 4: ORDER SUCCESS MODAL OVERLAY (PRD SECTION 3.4) ── */}
      {completedOrder && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Order Successfully Completed
                </h3>
                <p className="text-xs text-slate-500">
                  Invoice <span className="font-mono font-bold text-blue-600">{completedOrder.invoiceNumber}</span> generated and inventory updated.
                </p>
              </div>
            </div>

            {/* Quick Financial Summary */}
            <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-800">{completedOrder.customer.name} ({completedOrder.customer.phone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Items Ordered:</span>
                <span className="font-semibold text-slate-800">{completedOrder.items.length} line item(s)</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500">Grand Total:</span>
                <span className="font-mono font-bold text-slate-900">₹{completedOrder.grandTotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Advance Paid:</span>
                <span className="font-mono font-semibold text-emerald-600">₹{completedOrder.advancePaid}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-700">Balance Due:</span>
                <span className="font-mono text-amber-700">₹{completedOrder.balanceDue}</span>
              </div>
            </div>

            {/* Print Action Buttons (Thermal, A4 Invoice, Lab Slip) */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrintMode('thermal')}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 px-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition active:scale-[0.98]"
                >
                  <Printer className="h-4 w-4 text-emerald-400" />
                  <span>Print Thermal Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintMode('a4')}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 px-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-[0.98]"
                >
                  <FileText className="h-4 w-4 text-white" />
                  <span>Print A4 Invoice</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPrintMode('workshop')}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 transition active:scale-[0.98]"
              >
                <ClipboardList className="h-4 w-4 text-indigo-600" />
                <span>Print Lab Slip</span>
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={handleNewOrder}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Start New Order (F1)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STAGE 4: MOUNTED PRINT TEMPLATES (Hidden on screen via @media screen, active on print) ── */}
      {completedOrder && (
        <>
          <ThermalReceipt order={completedOrder} />
          <WorkshopSlip order={completedOrder} />
          <A4Invoice order={completedOrder} />
        </>
      )}
    </div>
  );
}
