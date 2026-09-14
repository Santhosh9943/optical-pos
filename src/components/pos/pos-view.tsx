'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Decimal from 'decimal.js';
import { toast } from 'sonner';
import { PatientSearch, type Patient } from '@/components/pos/patient-search';
import {
  PrescriptionGrid,
  historyToPrescriptionValues,
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
import { type PrintOrderData } from '@/components/pos/print-layouts';
import {
  ThermalReceipt,
  A4TaxInvoice,
  WorkshopLabSlip,
} from '@/components/print';
import { usePOSStore, type POSPatient } from '@/store/pos-store';
import { AddFamilyMemberModal } from '@/components/pos/add-family-member-modal';
import {
  SpectacleWizardModal,
  type SpectaclePairConfig,
} from '@/components/pos/spectacle-wizard-modal';
import {
  getLinkedFamilyGroup,
  getPatientPrescriptions,
  getPatientOrderHistory,
  saveNewPrescription,
  type PatientOrderHistoryItem,
} from '@/actions/patient-actions';
import { AddProductModal } from '@/components/pos/add-product-modal';
import { CartItemEditModal } from '@/components/pos/cart-item-edit-modal';
import { InvoiceDetailsModal } from '@/components/pos/invoice-details-modal';
import { QuickAddPatientModal } from '@/components/pos/quick-add-patient-modal';
import { getDynamicRelationship } from '@/lib/patient-relationship';
import {
  PlusCircle,
  Clock,
  UserCheck,
  ShoppingBag,
  Check,
  Loader2,
  CheckCircle2,
  Printer,
  FileText,
  ClipboardList,
  Sparkles,
  Users,
  UserPlus,
  Trash2,
  Crown,
  Edit3,
  Plus,
  Receipt,
  Eye,
  AlertCircle,
} from 'lucide-react';

export function PosView() {
  const {
    activePatients,
    selectedPatient,
    prescriptions,
    activePrescriptionPatientId,
    prescription,
    patientPrescriptionHistories,
    isAddingNewPower,
    cartItems,
    setCartItems,
    advancePaid,
    paymentMode,
    paymentReference,
    completedOrder,
    printMode,
    invoiceBillingDetails,
    setActivePatients,
    addFamilyMember,
    removeFamilyMember,
    setPayer,
    setSelectedPatient,
    setActivePrescriptionPatientId,
    setPatientPrescription,
    setPrescription,
    setPatientPrescriptionHistory,
    setIsAddingNewPower,
    addInventoryItem,
    updateQuantity,
    updateDiscount,
    updateCartItem,
    updateCartItemPatient,
    updateCartItemOwnFrame,
    removeItem,
    clearCart,
    setAdvancePaid,
    setPaymentMode,
    setPaymentReference,
    setInvoiceBillingDetails,
    setCompletedOrder,
    setPrintMode,
    resetOrder,
  } = usePOSStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddFamilyModalOpen, setIsAddFamilyModalOpen] = useState(false);
  const [selectedFrameForWizard, setSelectedFrameForWizard] = useState<InventoryItem | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [isInvoiceDetailsModalOpen, setIsInvoiceDetailsModalOpen] = useState(false);
  const [isQuickAddPatientOpen, setIsQuickAddPatientOpen] = useState(false);
  const [quickAddPrefill, setQuickAddPrefill] = useState('');

  // Clean family members cluster & purchase history states
  const [availableFamilyMembers, setAvailableFamilyMembers] = useState<POSPatient[]>([]);
  const [patientOrderHistories, setPatientOrderHistories] = useState<Record<string, PatientOrderHistoryItem[]>>({});
  const [activeLeftTab, setActiveLeftTab] = useState<'rx' | 'orders'>('rx');
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Dynamically resolved patient relations based on the currently selected account
  const dynamicActivePatients = useMemo(
    () =>
      activePatients.map((p) => ({
        ...p,
        relationType: getDynamicRelationship(p, selectedPatient),
      })),
    [activePatients, selectedPatient]
  );

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

  // ───────────────────────────────────────────────────────────
  // PRINT ACTIONS & PRINT-MODE BODY CLASS MANAGEMENT
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!printMode) return;

    const className = `print-mode-${printMode}`;
    document.body.classList.add(className);

    // Dynamic @page rule for 80mm thermal roll vs A4 invoice / workshop slip
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
  }, [printMode, setPrintMode]);

  const currentActivePatient =
    activePatients.find(
      (p) => p.id === (activePrescriptionPatientId || selectedPatient?.id)
    ) || selectedPatient;

  useEffect(() => {
    if (!currentActivePatient?.id) return;
    const patientId = currentActivePatient.id;
    if (!patientPrescriptionHistories[patientId]) {
      getPatientPrescriptions(patientId)
        .then((res) => {
          if (res.success && res.prescriptions) {
            setPatientPrescriptionHistory(patientId, res.prescriptions);
          }
        })
        .catch((err) => {
          console.error('[PosView] Failed to fetch patient prescriptions:', err);
        });
    }
    if (!patientOrderHistories[patientId]) {
      setIsLoadingOrders(true);
      getPatientOrderHistory(patientId)
        .then((res) => {
          if (res.success && res.orders) {
            setPatientOrderHistories((prev) => ({
              ...prev,
              [patientId]: res.orders,
            }));
          }
        })
        .catch((err) => {
          console.error('[PosView] Failed to fetch patient order history:', err);
        })
        .finally(() => {
          setIsLoadingOrders(false);
        });
    }
  }, [currentActivePatient?.id, patientPrescriptionHistories, setPatientPrescriptionHistory, patientOrderHistories]);

  const handleSwitchInvoiceAccount = (newPayerId: string) => {
    setPayer(newPayerId);
    setActivePrescriptionPatientId(newPayerId);
    const target = activePatients.find((p) => p.id === newPayerId);
    if (target) {
      toast.success(`Invoice Account: ${target.fullName}`, {
        description: 'All billing charges will be registered to this account.',
      });
    }
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
          patientId: item.patientId ?? null,
          prescriptionId: item.prescriptionId ?? null,
          isCustomerOwnFrame: item.isCustomerOwnFrame ?? false,
          fittingNote: item.fittingNote ?? null,
        };
      });

      // Collect all filled prescriptions across family members
      const hasAnyRxValues = (rx: PrescriptionValues) =>
        (rx.odSphere !== null && rx.odSphere !== undefined) ||
        (rx.odCylinder !== null && rx.odCylinder !== undefined && rx.odCylinder !== 0) ||
        (rx.osSphere !== null && rx.osSphere !== undefined) ||
        (rx.osCylinder !== null && rx.osCylinder !== undefined && rx.osCylinder !== 0) ||
        (rx.odAdd !== null && rx.odAdd !== undefined && rx.odAdd !== 0) ||
        (rx.osAdd !== null && rx.osAdd !== undefined && rx.osAdd !== 0) ||
        (rx.odPd !== null && rx.odPd !== undefined && rx.odPd !== 0) ||
        (rx.osPd !== null && rx.osPd !== undefined && rx.osPd !== 0) ||
        (rx.binocularPd !== null && rx.binocularPd !== undefined && rx.binocularPd !== 0);

      const sanitizeRx = (customerId: string, rx: PrescriptionValues) => {
        const hasOdCyl = rx.odCylinder !== null && rx.odCylinder !== undefined && rx.odCylinder !== 0;
        const hasOsCyl = rx.osCylinder !== null && rx.osCylinder !== undefined && rx.osCylinder !== 0;

        return {
          customerId,
          odSphere: rx.odSphere != null ? rx.odSphere : null,
          odCylinder: rx.odCylinder != null ? rx.odCylinder : null,
          odAxis: hasOdCyl && rx.odAxis != null && rx.odAxis >= 1 && rx.odAxis <= 180 ? rx.odAxis : null,
          odAdd: rx.odAdd != null && rx.odAdd >= 0.75 && rx.odAdd <= 4.0 ? rx.odAdd : null,
          odPd: rx.odPd != null && rx.odPd >= 20 && rx.odPd <= 80 ? rx.odPd : null,
          osSphere: rx.osSphere != null ? rx.osSphere : null,
          osCylinder: rx.osCylinder != null ? rx.osCylinder : null,
          osAxis: hasOsCyl && rx.osAxis != null && rx.osAxis >= 1 && rx.osAxis <= 180 ? rx.osAxis : null,
          osAdd: rx.osAdd != null && rx.osAdd >= 0.75 && rx.osAdd <= 4.0 ? rx.osAdd : null,
          osPd: rx.osPd != null && rx.osPd >= 20 && rx.osPd <= 80 ? rx.osPd : null,
          binocularPd: rx.binocularPd != null && rx.binocularPd >= 20 && rx.binocularPd <= 80 ? rx.binocularPd : null,
        };
      };

      const allPrescriptionsList = Object.entries(prescriptions)
        .filter(([_, rx]) => hasAnyRxValues(rx))
        .map(([patientId, rx]) => sanitizeRx(patientId, rx));

      const primaryRx =
        allPrescriptionsList.find((rx) => rx.customerId === selectedPatient.id) ||
        (hasAnyRxValues(prescription)
          ? sanitizeRx(selectedPatient.id, prescription)
          : undefined);

      const billingDetailsPayload =
        invoiceBillingDetails.billingName ||
        invoiceBillingDetails.phone ||
        invoiceBillingDetails.email ||
        invoiceBillingDetails.address ||
        invoiceBillingDetails.gstin ||
        invoiceBillingDetails.notes
          ? {
              billingName: invoiceBillingDetails.billingName?.trim() || undefined,
              phone: invoiceBillingDetails.phone?.trim() || undefined,
              email: invoiceBillingDetails.email?.trim() || undefined,
              address: invoiceBillingDetails.address?.trim() || undefined,
              gstin: invoiceBillingDetails.gstin?.trim() || undefined,
              notes: invoiceBillingDetails.notes?.trim() || undefined,
            }
          : undefined;

      const payload = {
        customerId: selectedPatient.id,
        patients: activePatients.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          phone: p.phone,
          age: p.age,
          gender: p.gender,
          relationType: getDynamicRelationship(p, selectedPatient),
          primaryCustomerId: p.primaryCustomerId || selectedPatient.id,
        })),
        prescription: allPrescriptionsList.length > 0 ? undefined : primaryRx,
        prescriptions:
          allPrescriptionsList.length > 0 ? allPrescriptionsList : undefined,
        items: orderItems,
        billingDetails: billingDetailsPayload,
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
            name: invoiceBillingDetails.billingName?.trim() || selectedPatient.fullName,
            phone: invoiceBillingDetails.phone?.trim() || selectedPatient.phone,
            age: selectedPatient.age,
            gender: selectedPatient.gender,
            address: invoiceBillingDetails.address?.trim() || (selectedPatient.city ?? null),
            email: invoiceBillingDetails.email?.trim() || undefined,
            gstin: invoiceBillingDetails.gstin?.trim() || undefined,
          },
          items: cartItems.map((item) => {
            const assignedPatient = activePatients.find(
              (p) => p.id === item.patientId
            );
            return {
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
              patientId: item.patientId,
              patientName: assignedPatient?.fullName || null,
              isCustomerOwnFrame: item.isCustomerOwnFrame,
              fittingNote: item.fittingNote,
            };
          }),
          prescription: primaryRx ? (primaryRx as any) : null,
          prescriptions: allPrescriptionsList.map((rx) => {
            const p = activePatients.find((pt) => pt.id === rx.customerId);
            return {
              patientId: rx.customerId,
              patientName: p?.fullName || 'Patient',
              relationType: p ? getDynamicRelationship(p, selectedPatient) : 'Family',
              isCustomerOwnFrame: cartItems.some(
                (ci) => ci.patientId === rx.customerId && ci.isCustomerOwnFrame
              ),
              odSphere: rx.odSphere,
              odCylinder: rx.odCylinder,
              odAxis: rx.odAxis,
              odAdd: rx.odAdd,
              odPd: rx.odPd,
              osSphere: rx.osSphere,
              osCylinder: rx.osCylinder,
              osAxis: rx.osAxis,
              osAdd: rx.osAdd,
              osPd: rx.osPd,
              binocularPd: rx.binocularPd,
            };
          }),
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

  const handleCheckoutRef = useRef(handleCheckout);
  handleCheckoutRef.current = handleCheckout;
  const resetOrderRef = useRef(resetOrder);
  resetOrderRef.current = resetOrder;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        handleCheckoutRef.current();
      } else if (e.key === 'F1') {
        e.preventDefault();
        resetOrderRef.current();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setIsAddProductModalOpen(true);
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (completedOrder) {
          setPrintMode('thermal');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [completedOrder, setPrintMode]);

  const handleConfigureSpectaclePair = (config: SpectaclePairConfig) => {
    // 1. If prescription was entered/confirmed, save to store
    if (config.prescription && config.targetPatientId) {
      setPatientPrescription(config.targetPatientId, config.prescription);
    }

    // 2. Build frame CartItem
    const frameCartItem: CartItem = {
      id: crypto.randomUUID(),
      inventoryItemId: config.isCustomerOwnFrame ? null : config.frameItem.id,
      sku: config.isCustomerOwnFrame ? 'CUST-FRAME' : config.frameItem.sku,
      description: config.isCustomerOwnFrame
        ? `Customer Frame: ${config.frameItem.description || config.frameItem.brand || 'Own Frame'}`
        : `${config.frameItem.brand ? config.frameItem.brand + ' ' : ''}${
            config.frameItem.model ? config.frameItem.model + ' — ' : ''
          }${config.frameItem.description || config.frameItem.sku}`,
      category: 'FRAME',
      hsnCode: config.frameItem.hsnCode,
      quantity: 1,
      unitPrice: config.isCustomerOwnFrame ? '0.00' : config.frameItem.sellingPrice,
      discount: '0.00',
      taxRate: config.frameItem.taxRate,
      patientId: config.targetPatientId,
      isCustomerOwnFrame: !!config.isCustomerOwnFrame,
      fittingNote: config.fittingNote || '',
    };

    const itemsToAdd: CartItem[] = [frameCartItem];

    // 3. Build lens CartItem if included
    if (config.includeLenses && config.lensSpecification) {
      const lensCartItem: CartItem = {
        id: crypto.randomUUID(),
        inventoryItemId: null,
        sku: `LENS-${config.lensSpecification.lensType.slice(0, 4)}`,
        description: config.lensSpecification.description,
        category: 'OPHTHALMIC_LENS',
        hsnCode: config.lensSpecification.hsnCode,
        quantity: 1,
        unitPrice: config.lensSpecification.unitPrice,
        discount: '0.00',
        taxRate: config.lensSpecification.taxRate,
        lensType: config.lensSpecification.lensType,
        coating: config.lensSpecification.coating,
        lensMaterial: config.lensSpecification.lensMaterial,
        patientId: config.targetPatientId,
        isCustomerOwnFrame: false,
        fittingNote: '',
      };
      itemsToAdd.push(lensCartItem);
    }

    // 4. Update cart in store
    setCartItems((prev) => [...prev, ...itemsToAdd]);

    // 5. Select this patient in the prescription grid
    setActivePrescriptionPatientId(config.targetPatientId);

    // 6. Close wizard and notify
    setSelectedFrameForWizard(null);
    toast.success('Spectacle Pair Added to Cart', {
      description: `${config.isCustomerOwnFrame ? 'Customer Own Frame' : config.frameItem.sku} & ${
        config.includeLenses ? 'Custom Lenses' : 'Frame Only'
      } assigned to patient`,
    });
  };

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-4 md:gap-6">
      {/* ── POS Sub-header: Quick Patient Search & New Order Action ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0">
        {/* Mounted Patient Search Component & Quick Register Button */}
        <div className="flex items-center gap-2 w-full max-w-lg">
          <div className="flex-1">
            <PatientSearch
              onPatientSelect={async (patient) => {
                const rawRel =
                  patient.relationType ||
                  (patient.primaryCustomerId ? 'Family' : 'Self');

                const currentPatient: POSPatient = {
                  id: patient.id,
                  fullName: patient.fullName,
                  phone: patient.phone,
                  age: patient.age,
                  gender: patient.gender,
                  relationType: 'Current',
                  rawRelationType: rawRel,
                  primaryCustomerId: patient.primaryCustomerId,
                  advanceBalance: patient.advanceBalance || '0.00',
                  city: patient.city,
                  isPayer: true,
                };

                // Clean single customer load: ONLY selected patient on current order!
                setActivePatients([currentPatient]);
                setSelectedPatient(currentPatient);
                setActivePrescriptionPatientId(currentPatient.id);
                setActiveLeftTab('rx');

                // Background fetch: linked family cluster (for Add Family modal)
                try {
                  const familyRes = await getLinkedFamilyGroup(patient.id);
                  if (familyRes.success && familyRes.members) {
                    setAvailableFamilyMembers(familyRes.members);
                  }
                } catch (e) {
                  console.error('[PosView] Error resolving linked family cluster:', e);
                }

                // Background fetch: purchase order history
                try {
                  setIsLoadingOrders(true);
                  const orderRes = await getPatientOrderHistory(patient.id);
                  if (orderRes.success && orderRes.orders) {
                    setPatientOrderHistories((prev) => ({
                      ...prev,
                      [patient.id]: orderRes.orders,
                    }));
                  }
                } catch (e) {
                  console.error('[PosView] Error fetching order history:', e);
                } finally {
                  setIsLoadingOrders(false);
                }
              }}
              selectedPatient={selectedPatient}
              onClearPatient={() => {
                setSelectedPatient(null);
                setAvailableFamilyMembers([]);
              }}
              onOpenAddPatientModal={(prefill) => {
                setQuickAddPrefill(prefill || '');
                setIsQuickAddPatientOpen(true);
              }}
            />
          </div>
          <button
            type="button"
            data-testid="btn-pos-add-patient"
            onClick={() => {
              setQuickAddPrefill('');
              setIsQuickAddPatientOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2.5 text-xs font-semibold text-white shadow-2xs transition active:scale-95 shrink-0"
            title="Register New Patient"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">New Patient</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={resetOrder}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Order [F1]</span>
          </button>
        </div>
      </div>

      {/* ── POS Two-Column Split Layout ── */}
      <div className="grid flex-1 grid-cols-12 gap-4 md:gap-6 overflow-hidden min-h-0 w-full">
        {/* ══════════════════════════════════════════════════════════════════
            LEFT WORKSPACE PANE (Cols 1-7): Patient Summary & Clinical Specs
            ══════════════════════════════════════════════════════════════════ */}
        <div className="col-span-7 flex flex-col gap-4 overflow-y-auto">
          {/* Patient Header / Card with Family Support */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              {selectedPatient ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-1 text-xs">
                    <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Invoice Account:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {selectedPatient.fullName}
                    </span>

                    {activePatients.length > 1 ? (
                      <select
                        id="select-invoice-account"
                        data-testid="select-invoice-account"
                        value={selectedPatient.id}
                        onChange={(e) => handleSwitchInvoiceAccount(e.target.value)}
                        className="rounded-md border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-900 dark:text-slate-100 shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer ml-1"
                        title="Change invoice account"
                      >
                        {dynamicActivePatients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} ({p.relationType})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        id="select-invoice-account"
                        disabled
                        data-testid="select-invoice-account"
                        className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/60 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-300 cursor-not-allowed ml-1"
                        title="Only 1 member on order. Add family members to change invoice account."
                      >
                        <option value="">(Only 1 Member)</option>
                      </select>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-300">
                  <UserCheck className="h-4 w-4" />
                  <span>Search or enter phone to populate patient</span>
                </div>
              )}

              {selectedPatient && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="add-family-member-btn"
                    onClick={() => setIsAddFamilyModalOpen(true)}
                    className="flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition active:scale-95"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>+ Add Family Member</span>
                  </button>
                </div>
              )}
            </div>

            {selectedPatient ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 p-2 border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-slate-300 block">
                      Active Customer
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate block">
                      {selectedPatient.fullName}
                    </span>
                  </div>
                  <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 p-2 border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-slate-300 block">
                      Contact Phone
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                      {selectedPatient.phone}
                    </span>
                  </div>
                  <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 p-2 border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-slate-300 block">
                      Demographics
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedPatient.gender ?? '—'}
                      {selectedPatient.age ? `, ${selectedPatient.age} yrs` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    data-testid="btn-patient-past-purchases"
                    onClick={() => setActiveLeftTab('orders')}
                    className="rounded-md bg-purple-50/80 dark:bg-purple-950/40 p-2 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500"
                    title="Click to view purchase order history"
                  >
                    <span className="text-[10px] uppercase font-medium text-purple-600 dark:text-purple-400 flex items-center justify-between">
                      <span>Past Purchases</span>
                      <Receipt className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    </span>
                    <span className="font-bold text-purple-800 dark:text-purple-200 font-mono text-sm block mt-0.5">
                      {(patientOrderHistories[selectedPatient.id] || []).length} Orders
                    </span>
                  </button>
                  {selectedPatient.city && (
                    <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 p-2 border border-slate-100 dark:border-slate-700/60">
                      <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-slate-300 block">
                        Location
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {selectedPatient.city}
                      </span>
                    </div>
                  )}
                  {selectedPatient.advanceBalance && (
                    <div className="rounded-md bg-emerald-50/60 dark:bg-emerald-950/40 p-2 border border-emerald-100 dark:border-emerald-800/60">
                      <span className="text-[10px] uppercase font-medium text-emerald-600 dark:text-emerald-400 block">
                        Available Credit
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                        ₹{selectedPatient.advanceBalance}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center justify-center rounded-md border border-dashed border-slate-200 dark:border-slate-800 py-6 text-center text-slate-500 dark:text-slate-300">
                <UserCheck className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  No patient selected
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-300">
                  Search above or type phone to lookup previous prescriptions & orders
                </p>
              </div>
            )}
          </div>

          {/* ── View Switcher: Clinical Refraction Power vs. Purchase Order History ── */}
          {selectedPatient && (
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-lg overflow-hidden shrink-0 shadow-xs">
              <button
                type="button"
                data-testid="tab-view-clinical-power"
                onClick={() => setActiveLeftTab('rx')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                  activeLeftTab === 'rx'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/30'
                    : 'border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                <Eye className="h-4 w-4" />
                <span>Clinical Refraction & Rx Matrix</span>
              </button>

              <button
                type="button"
                data-testid="tab-view-purchase-history"
                onClick={() => setActiveLeftTab('orders')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                  activeLeftTab === 'orders'
                    ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400 bg-purple-50/40 dark:bg-purple-950/30'
                    : 'border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                <Receipt className="h-4 w-4" />
                <span>
                  Purchase Order History (
                  {(patientOrderHistories[selectedPatient.id] || []).length})
                </span>
              </button>
            </div>
          )}

          {/* ── Tab 1: Clinical Prescription Matrix (Default) ── */}
          {(activeLeftTab === 'rx' || !selectedPatient) && (
            <PrescriptionGrid
              value={
                activePrescriptionPatientId && prescriptions[activePrescriptionPatientId]
                  ? prescriptions[activePrescriptionPatientId]
                  : prescription
              }
              onChange={(newVal) => {
                if (activePrescriptionPatientId) {
                  setPatientPrescription(activePrescriptionPatientId, newVal);
                } else {
                  setPrescription(newVal);
                }
              }}
              patients={dynamicActivePatients}
              activePatientId={activePrescriptionPatientId || selectedPatient?.id}
              onSelectPatientTab={(pId) => setActivePrescriptionPatientId(pId)}
              prescriptionsMap={prescriptions}
              patientPrescriptionHistory={
                currentActivePatient?.id
                  ? patientPrescriptionHistories[currentActivePatient.id]
                  : []
              }
              isAddingNewPower={
                currentActivePatient?.id
                  ? !!isAddingNewPower[currentActivePatient.id]
                  : false
              }
              onToggleAddNewPower={(isAdding) => {
                if (currentActivePatient?.id) {
                  setIsAddingNewPower(currentActivePatient.id, isAdding);
                }
              }}
              onUsePrescriptionHistory={(historyItem) => {
                if (!currentActivePatient?.id) return;
                const rxVals = historyToPrescriptionValues(historyItem);
                setPatientPrescription(currentActivePatient.id, rxVals);
                toast.info('Prescription Loaded', {
                  description: `Applied ${new Date(historyItem.prescribedAt).toLocaleDateString('en-IN')} refraction to order.`,
                });
              }}
              onSaveNewPower={async (rx) => {
                if (!currentActivePatient?.id) return;
                const patientId = currentActivePatient.id;
                const res = await saveNewPrescription(patientId, {
                  odSphere: rx.odSphere,
                  odCylinder: rx.odCylinder,
                  odAxis: rx.odAxis,
                  odAdd: rx.odAdd,
                  odPd: rx.odPd,
                  osSphere: rx.osSphere,
                  osCylinder: rx.osCylinder,
                  osAxis: rx.osAxis,
                  osAdd: rx.osAdd,
                  osPd: rx.osPd,
                  binocularPd: rx.binocularPd,
                  clinicalRemarks: rx.clinicalRemarks,
                });
                if (res.success && res.prescription) {
                  const prevHist = patientPrescriptionHistories[patientId] || [];
                  setPatientPrescriptionHistory(patientId, [res.prescription, ...prevHist]);
                  setIsAddingNewPower(patientId, false);
                  setPatientPrescription(patientId, rx);
                  toast.success('New Prescription Saved', {
                    description: 'Saved to patient record & applied to current order.',
                  });
                } else {
                  toast.error('Failed to Save Prescription', {
                    description: res.error || 'Please check input values.',
                  });
                }
              }}
            />
          )}

          {/* ── Tab 2: Purchase Order History Panel ── */}
          {activeLeftTab === 'orders' && selectedPatient && (
            <div className="rounded-b-lg border border-t-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Receipt className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Purchase Invoices for {selectedPatient.fullName}
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  {(patientOrderHistories[selectedPatient.id] || []).length} Past Invoices
                </span>
              </div>

              {isLoadingOrders ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  <span className="text-xs">Loading order invoices...</span>
                </div>
              ) : (patientOrderHistories[selectedPatient.id] || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-6">
                  <Receipt className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No Previous Purchase Orders
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-300">
                    This customer does not have any prior purchase invoices on record.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {(patientOrderHistories[selectedPatient.id] || []).map((order) => {
                    const orderDate = new Date(order.createdAt);
                    return (
                      <div
                        key={order.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3.5 space-y-2.5 transition hover:border-slate-300 dark:hover:border-slate-700"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                              {order.invoiceNumber}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                                order.paymentStatus === 'PAID'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                  : order.paymentStatus === 'PARTIAL'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                  : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                            <span className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600 dark:text-slate-300 uppercase">
                              {order.orderStatus.replace(/_/g, ' ')}
                            </span>
                            {order.isWearerOnly && (
                              <span className="rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 text-[9px] font-bold">
                                Wearer on Family Bill
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                            {orderDate.toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* Items preview */}
                        {order.itemDescriptions.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300 tracking-wider">
                              Purchased Items ({order.itemDescriptions.length})
                            </span>
                            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5 pl-3 list-disc">
                              {order.itemDescriptions.map((desc, idx) => (
                                <li key={idx} className="text-[11px]">
                                  {desc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Amounts Strip */}
                        <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-600 dark:text-slate-300">
                              Total:{' '}
                              <strong className="text-slate-900 dark:text-slate-100 font-mono">
                                ₹{order.grandTotal}
                              </strong>
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                              Advance:{' '}
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                                ₹{order.advancePaid}
                              </span>
                            </span>
                          </div>
                          <span className="text-slate-600 dark:text-slate-300">
                            Balance:{' '}
                            <span
                              className={`font-mono font-bold ${
                                Number(order.balanceDue) > 0
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              ₹{order.balanceDue}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Placeholder Pane: Lens Specification */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Ophthalmic Lens Specification
                </h3>
              </div>
              <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                Type · Coating · Material
              </span>
            </div>
            <div className="mt-3 flex items-center justify-center py-4 text-xs text-slate-500 dark:text-slate-300 italic">
              Lens type selection (Single Vision, Progressive, Blue-Cut) and lab attributes
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT CHECKOUT LEDGER (Cols 8-12): Billing Cart & Payment Settlement
            ══════════════════════════════════════════════════════════════════ */}
        <div className="col-span-5 flex flex-col gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm overflow-y-auto">
          <div className="flex flex-col">
            {/* Cart Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Invoice Cart
                </h2>
                <span className="rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                  {totals.totalItems} {totals.totalItems === 1 ? 'Item' : 'Items'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  data-testid="add-product-btn"
                  onClick={() => setIsAddProductModalOpen(true)}
                  className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Product [F2]</span>
                </button>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] font-medium text-slate-400 hover:text-red-600 transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Mounted Debounced Inventory Search Component */}
            <div className="mt-3">
              <InventorySearch
                onAdd={addInventoryItem}
                onSelectFrame={(item) => setSelectedFrameForWizard(item)}
              />
            </div>

            {/* Line Items Container / Billing Cart Table */}
            <div className="mt-3 min-h-[140px]">
              <BillingCart
                items={cartItems}
                activePatients={dynamicActivePatients}
                onUpdateQuantity={updateQuantity}
                onUpdateDiscount={updateDiscount}
                onUpdatePatient={updateCartItemPatient}
                onUpdateOwnFrame={updateCartItemOwnFrame}
                onEditItem={(item) => setEditingCartItem(item)}
                onRemoveItem={removeItem}
                onClearCart={clearCart}
                showSummary={false}
              />
            </div>
          </div>

          {/* Financial Totals & Summary Breakdown */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-3 flex-shrink-0">
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Cart Subtotal</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  ₹{totals.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cart Total Discount</span>
                <span
                  className={`font-mono font-medium ${
                    totals.totalDiscount.greaterThan(0)
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {totals.totalDiscount.greaterThan(0)
                    ? `−₹${totals.totalDiscount.toFixed(2)}`
                    : '₹0.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Taxable Value</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  ₹{totals.taxableValue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300 text-[11px]">
                <span>CGST</span>
                <span className="font-mono">₹{totals.cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300 text-[11px]">
                <span>SGST</span>
                <span className="font-mono">₹{totals.sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span className="font-medium">Cart Total Tax</span>
                <span className="font-mono font-medium">
                  ₹{totals.totalTax.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                <span>Grand Total</span>
                <span className="font-mono text-base text-blue-600 dark:text-blue-400">
                  ₹{totals.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Custom Invoice / Billing Details Bar */}
            <div className="mt-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
              <div className="flex flex-col text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-600 dark:text-slate-300">Invoice To:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {invoiceBillingDetails.billingName || selectedPatient?.fullName || 'Primary Patient'}
                  </span>
                  {invoiceBillingDetails.gstin && (
                    <span className="rounded bg-blue-100 dark:bg-blue-950 px-1 py-0.5 text-[10px] font-mono font-bold text-blue-800 dark:text-blue-300">
                      GSTIN: {invoiceBillingDetails.gstin}
                    </span>
                  )}
                </div>
                {invoiceBillingDetails.notes && (
                  <span className="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-[280px]">
                    Note: {invoiceBillingDetails.notes}
                  </span>
                )}
              </div>
              <button
                type="button"
                data-testid="edit-invoice-details-btn"
                onClick={() => setIsInvoiceDetailsModalOpen(true)}
                className="flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
              >
                <Edit3 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <span>Edit Invoice Details</span>
              </button>
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
                <div className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
                        <span>Print Thermal Receipt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrintMode('a4')}
                        className="flex items-center justify-center gap-1.5 rounded-md bg-blue-600 py-2 px-2 text-[11px] font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] transition"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Print A4 Invoice</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPrintMode('workshop')}
                      className="w-full flex items-center justify-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 px-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-[0.99] transition"
                    >
                      <ClipboardList className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Print Lab / Workshop Slip</span>
                    </button>

                    <button
                      type="button"
                      onClick={resetOrder}
                      className="w-full flex items-center justify-center gap-1 rounded-md bg-emerald-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99] transition"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>Start New Order (F1)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="btn-complete-order"
                  disabled={cartItems.length === 0 || !selectedPatient || isSubmitting}
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-300 transition"
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
      </div>

      {/* ── ORDER SUCCESS MODAL OVERLAY (PRD SECTION 3.4) ── */}
      {completedOrder && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Order Successfully Completed
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Invoice <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{completedOrder.invoiceNumber}</span> generated and inventory updated.
                </p>
              </div>
            </div>

            {/* Quick Financial Summary */}
            <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3 text-xs space-y-1.5 border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Patient:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{completedOrder.customer.name} ({completedOrder.customer.phone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Items Ordered:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{completedOrder.items.length} line item(s)</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1.5">
                <span className="text-slate-600 dark:text-slate-300">Grand Total:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">₹{completedOrder.grandTotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Advance Paid:</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">₹{completedOrder.advancePaid}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-700 dark:text-slate-300">Balance Due:</span>
                <span className="font-mono text-amber-700 dark:text-amber-400">₹{completedOrder.balanceDue}</span>
              </div>
            </div>

            {/* Print Action Buttons (Primary Print Receipt, Thermal, A4 Invoice, Lab Slip) */}
            <div className="space-y-2">
              <button
                type="button"
                data-testid="btn-print-receipt"
                onClick={() => setPrintMode('thermal')}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 py-3 px-4 text-xs font-bold text-white shadow-md transition active:scale-[0.98] cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Receipt</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="btn-print-thermal-receipt"
                  onClick={() => setPrintMode('thermal')}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 py-2 px-3 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition active:scale-[0.98] cursor-pointer"
                >
                  <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Thermal (80mm)</span>
                </button>

                <button
                  type="button"
                  data-testid="btn-print-a4-invoice"
                  onClick={() => setPrintMode('a4')}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 px-3 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-[0.98] cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-white" />
                  <span>A4 Invoice</span>
                </button>
              </div>

              <button
                type="button"
                data-testid="btn-print-lab-slip"
                onClick={() => setPrintMode('workshop')}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted py-2 px-3 text-xs font-bold text-foreground transition active:scale-[0.98] cursor-pointer"
              >
                <ClipboardList className="h-4 w-4 text-indigo-500" />
                <span>Print Lab Slip</span>
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={resetOrder}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Start New Order (F1)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Family Member Modal ── */}
      <AddFamilyMemberModal
        isOpen={isAddFamilyModalOpen}
        onClose={() => setIsAddFamilyModalOpen(false)}
        primaryPatient={selectedPatient}
        availableFamilyMembers={availableFamilyMembers}
        activePatients={activePatients}
        onAddMember={(member) => {
          addFamilyMember(member);
          toast.success(`Family Member Added: ${member.fullName}`, {
            description: `Relationship: ${member.relationType || 'Family'}`,
          });
        }}
      />
      {/* ── Spectacle Pair Guided Wizard Modal ── */}
      <SpectacleWizardModal
        isOpen={!!selectedFrameForWizard}
        onClose={() => setSelectedFrameForWizard(null)}
        frameItem={selectedFrameForWizard}
        activePatients={dynamicActivePatients}
        selectedPatient={selectedPatient}
        currentPrescriptions={prescriptions}
        onConfirm={handleConfigureSpectaclePair}
      />

      {/* ── Guided Add Product Category Dispatcher Modal ── */}
      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        activePatients={dynamicActivePatients}
        selectedPatient={selectedPatient}
        currentPrescriptions={prescriptions}
        onAddCartItem={(item) => setCartItems((prev) => [...prev, item])}
        onAddInventoryItem={(item, pId) => addInventoryItem(item, pId)}
        onConfigureSpectaclePair={handleConfigureSpectaclePair}
      />

      {/* ── Cart Item Detail Inspector & Editor Modal ── */}
      <CartItemEditModal
        isOpen={!!editingCartItem}
        onClose={() => setEditingCartItem(null)}
        item={editingCartItem}
        activePatients={dynamicActivePatients}
        onSave={(id, updates) => updateCartItem(id, updates)}
      />

      {/* ── Invoice Custom Recipient & Details Modal ── */}
      <InvoiceDetailsModal
        isOpen={isInvoiceDetailsModalOpen}
        onClose={() => setIsInvoiceDetailsModalOpen(false)}
        details={invoiceBillingDetails}
        defaultCustomerName={selectedPatient?.fullName || ''}
        defaultPhone={selectedPatient?.phone || ''}
        onSave={(details) => setInvoiceBillingDetails(details)}
      />

      {/* ── Quick Register Patient Modal ── */}
      <QuickAddPatientModal
        isOpen={isQuickAddPatientOpen}
        onClose={() => setIsQuickAddPatientOpen(false)}
        prefillQuery={quickAddPrefill}
        onPatientCreated={(newPatient) => {
          const posPatient: POSPatient = {
            id: newPatient.id,
            fullName: newPatient.fullName,
            phone: newPatient.phone,
            age: newPatient.age,
            gender: newPatient.gender,
            relationType: 'Current',
            rawRelationType: newPatient.relationType || 'Self',
            primaryCustomerId: newPatient.primaryCustomerId,
            advanceBalance: newPatient.advanceBalance || '0.00',
            city: newPatient.city,
            isPayer: true,
          };
          setActivePatients([posPatient]);
          setSelectedPatient(posPatient);
          setActivePrescriptionPatientId(posPatient.id);
          setActiveLeftTab('rx');
        }}
      />

      {/* ── MOUNTED PRINT TEMPLATES (Hidden on screen via @media screen, active on print) ── */}
      {completedOrder && (
        <>
          <ThermalReceipt order={completedOrder} />
          <WorkshopLabSlip order={completedOrder} />
          <A4TaxInvoice order={completedOrder} />
        </>
      )}
    </div>
  );
}

export default PosView;
