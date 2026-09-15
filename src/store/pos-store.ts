import { create } from 'zustand';
import Decimal from 'decimal.js';
import type { Patient } from '@/components/pos/patient-search';
import {
  initialPrescriptionValues,
  type PrescriptionValues,
} from '@/components/pos/prescription-grid';
import type { CartItem } from '@/components/pos/billing-cart';
import type { InventoryItem } from '@/components/pos/inventory-search';
import type { PaymentMode } from '@/components/pos/payment-panel';
import type { PrintOrderData } from '@/components/pos/print-layouts';
import type { PatientPrescriptionHistory } from '@/actions/patient-actions';

export type PrintMode = 'thermal' | 'workshop' | 'a4' | null;

export interface InvoiceBillingDetails {
  billingName: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  notes: string;
}

export interface POSPatient extends Patient {
  relationType?: string; // 'Current' | 'Spouse' | 'Child' | 'Parent' | 'Other'
  rawRelationType?: string | null;
  primaryCustomerId?: string | null;
  isPayer?: boolean;
}

export interface POSState {
  // Family Group State (Payer is typically activePatients[0])
  activePatients: POSPatient[];
  selectedPatient: POSPatient | null; // Currently active/primary payer
  activePrescriptionPatientId: string | null;
  prescriptions: Record<string, PrescriptionValues>; // Map of patientId -> prescription
  patientPrescriptionHistories: Record<string, PatientPrescriptionHistory[]>; // Map of patientId -> past Rx records
  isAddingNewPower: Record<string, boolean>; // Map of patientId -> boolean (manual override)

  // Clinical Prescription (for the currently selected tab patient)
  prescription: PrescriptionValues;

  // Cart & Line Items
  cartItems: CartItem[];

  // Payment & Billing
  advancePaid: string;
  paymentMode: PaymentMode;
  paymentReference: string;

  // Invoice / Recipient overrides
  invoiceBillingDetails: InvoiceBillingDetails;

  // Final Order Receipt / Completed State
  completedOrder: PrintOrderData | null;

  // Active print mode (null = not printing, 'thermal' = 80mm roll, 'a4' = A4 tax invoice, 'workshop' = job slip)
  printMode: PrintMode;

  // Layout & View Mode Architecture
  posLayoutType: 'adaptive' | 'dense' | 'split';
  posAdaptiveMode: 'split' | 'billing_focus' | 'rx_focus';

  // Actions
  setPosLayoutType: (layout: 'adaptive' | 'dense' | 'split') => void;
  setPosAdaptiveMode: (mode: 'split' | 'billing_focus' | 'rx_focus') => void;
  setActivePatients: (patients: POSPatient[]) => void;
  addFamilyMember: (patient: POSPatient) => void;
  removeFamilyMember: (patientId: string) => void;
  setPayer: (patientId: string) => void;
  setSelectedPatient: (patient: Patient | null) => void;
  setActivePrescriptionPatientId: (patientId: string | null) => void;
  setPatientPrescription: (
    patientId: string,
    prescription:
      | PrescriptionValues
      | ((prev: PrescriptionValues) => PrescriptionValues)
  ) => void;
  setPrescription: (
    prescription:
      | PrescriptionValues
      | ((prev: PrescriptionValues) => PrescriptionValues)
  ) => void;
  setPatientPrescriptionHistory: (
    patientId: string,
    history: PatientPrescriptionHistory[]
  ) => void;
  setIsAddingNewPower: (patientId: string, isAdding: boolean) => void;
  setCartItems: (
    items: CartItem[] | ((prev: CartItem[]) => CartItem[])
  ) => void;
  addInventoryItem: (item: InventoryItem, targetPatientId?: string | null) => void;
  updateQuantity: (id: string, delta: number) => void;
  updateDiscount: (id: string, discount: string) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  updateCartItemPatient: (
    id: string,
    patientId: string | null,
    prescriptionId?: string | null
  ) => void;
  updateCartItemOwnFrame: (
    id: string,
    isOwnFrame: boolean,
    fittingNote?: string | null
  ) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setAdvancePaid: (amount: string) => void;
  setPaymentMode: (mode: PaymentMode) => void;
  setPaymentReference: (ref: string) => void;
  setInvoiceBillingDetails: (details: Partial<InvoiceBillingDetails>) => void;
  setCompletedOrder: (order: PrintOrderData | null) => void;
  setPrintMode: (mode: PrintMode) => void;
  resetOrder: () => void;
}

export const initialInvoiceBillingDetails: InvoiceBillingDetails = {
  billingName: '',
  phone: '',
  email: '',
  address: '',
  gstin: '',
  notes: '',
};

export const usePOSStore = create<POSState>()((set, get) => ({
  posLayoutType: 'adaptive',
  posAdaptiveMode: 'split',
  activePatients: [],
  selectedPatient: null,
  activePrescriptionPatientId: null,
  prescriptions: {},
  patientPrescriptionHistories: {},
  isAddingNewPower: {},
  prescription: initialPrescriptionValues,
  cartItems: [],
  advancePaid: '0.00',
  paymentMode: 'CASH',
  paymentReference: '',
  invoiceBillingDetails: { ...initialInvoiceBillingDetails },
  completedOrder: null,
  printMode: null,

  setPosLayoutType: (layout) => set({ posLayoutType: layout }),
  setPosAdaptiveMode: (mode) => set({ posAdaptiveMode: mode }),

  setActivePatients: (patients) => {
    const payer = patients.find((p) => p.isPayer) || patients[0] || null;
    const initialRx: Record<string, PrescriptionValues> = {};
    patients.forEach((p) => {
      initialRx[p.id] = initialPrescriptionValues;
    });

    set((state) => ({
      activePatients: patients,
      selectedPatient: payer,
      activePrescriptionPatientId: payer ? payer.id : null,
      prescriptions: { ...state.prescriptions, ...initialRx },
      prescription: payer && state.prescriptions[payer.id]
        ? state.prescriptions[payer.id]
        : initialPrescriptionValues,
    }));
  },

  addFamilyMember: (patient) =>
    set((state) => {
      // Check if already in active list
      if (state.activePatients.some((p) => p.id === patient.id)) {
        return state;
      }
      const isFirst = state.activePatients.length === 0;
      const rawRel =
        (patient as POSPatient).rawRelationType ||
        (patient as POSPatient).relationType ||
        'Family';
      const updatedPatients = [
        ...state.activePatients,
        {
          ...patient,
          rawRelationType: rawRel,
          isPayer: isFirst || !!patient.isPayer,
        },
      ];
      const newPrescriptions = {
        ...state.prescriptions,
        [patient.id]: state.prescriptions[patient.id] || { ...initialPrescriptionValues },
      };

      return {
        activePatients: updatedPatients,
        selectedPatient: state.selectedPatient || updatedPatients[0],
        activePrescriptionPatientId:
          state.activePrescriptionPatientId || patient.id,
        prescriptions: newPrescriptions,
      };
    }),

  removeFamilyMember: (patientId) =>
    set((state) => {
      const remaining = state.activePatients.filter((p) => p.id !== patientId);
      const isRemovingPayer = state.selectedPatient?.id === patientId;
      const nextPayer = remaining.length > 0 ? { ...remaining[0], isPayer: true } : null;

      // Update remaining array to reflect new payer if changed
      const updatedRemaining = remaining.map((p, idx) =>
        idx === 0 ? { ...p, isPayer: true } : p
      );

      // Also unassign cart items assigned to this patient
      const updatedCart = state.cartItems.map((item) =>
        item.patientId === patientId ? { ...item, patientId: null } : item
      );

      const nextActiveRxId =
        state.activePrescriptionPatientId === patientId
          ? updatedRemaining[0]?.id || null
          : state.activePrescriptionPatientId;

      return {
        activePatients: updatedRemaining,
        selectedPatient: isRemovingPayer ? nextPayer : state.selectedPatient,
        activePrescriptionPatientId: nextActiveRxId,
        cartItems: updatedCart,
        prescription:
          nextActiveRxId && state.prescriptions[nextActiveRxId]
            ? state.prescriptions[nextActiveRxId]
            : initialPrescriptionValues,
      };
    }),

  setPayer: (patientId) =>
    set((state) => {
      const target = state.activePatients.find((p) => p.id === patientId);
      if (!target) return state;

      const updated = state.activePatients.map((p) => ({
        ...p,
        isPayer: p.id === patientId,
      }));

      return {
        activePatients: updated,
        selectedPatient: {
          ...target,
          relationType: 'Current',
          rawRelationType: target.rawRelationType || target.relationType,
          isPayer: true,
        },
      };
    }),

  setSelectedPatient: (patient) => {
    if (!patient) {
      set({
        selectedPatient: null,
        activePatients: [],
        prescriptions: {},
        activePrescriptionPatientId: null,
        prescription: initialPrescriptionValues,
      });
      return;
    }

    const rawRel =
      (patient as POSPatient).rawRelationType ||
      (patient as POSPatient).relationType ||
      ((patient as POSPatient).primaryCustomerId ? 'Family' : 'Self');

    const posPatient: POSPatient = {
      ...patient,
      relationType: 'Current',
      rawRelationType: rawRel,
      isPayer: true,
    };

    set((state) => ({
      selectedPatient: posPatient,
      activePatients: [posPatient],
      activePrescriptionPatientId: posPatient.id,
      prescriptions: {
        ...state.prescriptions,
        [posPatient.id]: state.prescriptions[posPatient.id] || { ...initialPrescriptionValues },
      },
      prescription:
        state.prescriptions[posPatient.id] || initialPrescriptionValues,
    }));
  },

  setActivePrescriptionPatientId: (patientId) =>
    set((state) => ({
      activePrescriptionPatientId: patientId,
      prescription:
        (patientId && state.prescriptions[patientId]) || initialPrescriptionValues,
    })),

  setPatientPrescription: (patientId, prescription) =>
    set((state) => {
      const prevRx = state.prescriptions[patientId] || initialPrescriptionValues;
      const nextRx =
        typeof prescription === 'function' ? prescription(prevRx) : prescription;

      const isCurrentActive = state.activePrescriptionPatientId === patientId;

      return {
        prescriptions: {
          ...state.prescriptions,
          [patientId]: nextRx,
        },
        prescription: isCurrentActive ? nextRx : state.prescription,
      };
    }),

  setPrescription: (prescription) =>
    set((state) => {
      const activeId =
        state.activePrescriptionPatientId ||
        state.selectedPatient?.id ||
        'primary';

      const prevRx = state.prescriptions[activeId] || state.prescription;
      const nextRx =
        typeof prescription === 'function' ? prescription(prevRx) : prescription;

      return {
        prescription: nextRx,
        prescriptions: {
          ...state.prescriptions,
          [activeId]: nextRx,
        },
      };
    }),

  setCartItems: (items) =>
    set((state) => ({
      cartItems:
        typeof items === 'function' ? items(state.cartItems) : items,
    })),

  addInventoryItem: (item, targetPatientId) =>
    set((state) => {
      // Default patient assignment: explicit target or single active patient
      const defaultPatientId =
        targetPatientId ??
        (state.activePatients.length === 1 ? state.activePatients[0].id : null);

      const existingIndex = state.cartItems.findIndex(
        (i) =>
          i.inventoryItemId === item.id &&
          i.patientId === (defaultPatientId || null)
      );

      if (existingIndex > -1) {
        const next = [...state.cartItems];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return { cartItems: next };
      }

      const isLens =
        item.category === 'OPHTHALMIC_LENS' ||
        item.category === 'CONTACT_LENS' ||
        !!item.lensType;

      const newItem: CartItem = {
        id: crypto.randomUUID(),
        inventoryItemId: item.id,
        sku: item.sku,
        description: `${item.brand ? item.brand + ' ' : ''}${
          item.model ? item.model + ' — ' : ''
        }${item.description || item.sku}`,
        category: item.category,
        hsnCode: item.hsnCode,
        quantity: 1,
        unitPrice: item.sellingPrice,
        discount: '0.00',
        taxRate: item.taxRate,
        lensType: item.lensType,
        coating: item.coating,
        lensMaterial: item.lensMaterial,
        patientId: defaultPatientId,
        isCustomerOwnFrame: false,
        fittingNote: '',
      };

      return { cartItems: [...state.cartItems, newItem] };
    }),

  setPatientPrescriptionHistory: (patientId, history) =>
    set((state) => ({
      patientPrescriptionHistories: {
        ...state.patientPrescriptionHistories,
        [patientId]: history,
      },
    })),

  setIsAddingNewPower: (patientId, isAdding) =>
    set((state) => ({
      isAddingNewPower: {
        ...state.isAddingNewPower,
        [patientId]: isAdding,
      },
    })),

  updateCartItem: (id, updates) =>
    set((state) => ({
      cartItems: state.cartItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),

  updateQuantity: (id, qty) =>
    set((state) => ({
      cartItems: state.cartItems.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, qty) } : item
      ),
    })),

  updateDiscount: (id, discount) =>
    set((state) => ({
      cartItems: state.cartItems.map((item) =>
        item.id === id ? { ...item, discount } : item
      ),
    })),

  updateCartItemPatient: (id, patientId, prescriptionId) =>
    set((state) => ({
      cartItems: state.cartItems.map((item) =>
        item.id === id
          ? {
              ...item,
              patientId,
              prescriptionId: prescriptionId ?? item.prescriptionId,
            }
          : item
      ),
    })),

  updateCartItemOwnFrame: (id, isOwnFrame, fittingNote) =>
    set((state) => ({
      cartItems: state.cartItems.map((item) =>
        item.id === id
          ? {
              ...item,
              isCustomerOwnFrame: isOwnFrame,
              fittingNote:
                fittingNote !== undefined ? fittingNote : item.fittingNote,
            }
          : item
      ),
    })),

  removeItem: (id) =>
    set((state) => ({
      cartItems: state.cartItems.filter((item) => item.id !== id),
    })),

  clearCart: () =>
    set({
      cartItems: [],
      advancePaid: '0.00',
      paymentReference: '',
    }),

  setAdvancePaid: (amount) => set({ advancePaid: amount }),

  setPaymentMode: (mode) => set({ paymentMode: mode }),

  setPaymentReference: (ref) => set({ paymentReference: ref }),

  setInvoiceBillingDetails: (details) =>
    set((state) => ({
      invoiceBillingDetails: {
        ...state.invoiceBillingDetails,
        ...details,
      },
    })),

  setCompletedOrder: (order) => set({ completedOrder: order }),

  setPrintMode: (mode) => set({ printMode: mode }),

  resetOrder: () =>
    set({
      activePatients: [],
      selectedPatient: null,
      prescriptions: {},
      activePrescriptionPatientId: null,
      prescription: initialPrescriptionValues,
      patientPrescriptionHistories: {},
      isAddingNewPower: {},
      cartItems: [],
      advancePaid: '0.00',
      paymentReference: '',
      paymentMode: 'CASH',
      completedOrder: null,
      printMode: null,
      invoiceBillingDetails: { ...initialInvoiceBillingDetails },
    }),
}));
