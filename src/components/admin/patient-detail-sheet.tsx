'use client';

import { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  Receipt,
  FileText,
  Eye,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  DollarSign,
  Sparkles,
  Users,
  Edit3,
  Check,
  Crown,
  Plus,
  Banknote,
  Printer,
} from 'lucide-react';
import {
  getPatientHistory,
  updateCustomerPhone,
  type PatientDetailHistory,
  type PatientPrescriptionHistory,
} from '@/actions/patient-actions';
import { getInvoicePrintData } from '@/actions/settings-actions';
import { ThermalReceipt, A4TaxInvoice } from '@/components/print';
import type { PrintOrderData } from '@/components/pos/print-layouts';
import { toast } from 'sonner';
import { SettleBalanceModal, type SettleInvoiceData } from './settle-balance-modal';

interface PatientDetailSheetProps {
  patientId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PatientDetailSheet({
  patientId,
  isOpen,
  onClose,
}: PatientDetailSheetProps) {
  const [data, setData] = useState<PatientDetailHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'orders' | 'family'>(
    'personal'
  );

  // Phone editing state for current patient
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Phone editing state for family members in Tab 3
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberPhoneInput, setMemberPhoneInput] = useState('');

  // Balance settlement modal state
  const [selectedOrderForSettlement, setSelectedOrderForSettlement] =
    useState<SettleInvoiceData | null>(null);

  // Printing state for past invoices
  const [printableOrder, setPrintableOrder] = useState<PrintOrderData | null>(null);
  const [printReceiptType, setPrintReceiptType] = useState<'THERMAL_80MM' | 'A4_INVOICE'>('THERMAL_80MM');
  const [isPrintingInvoiceId, setIsPrintingInvoiceId] = useState<string | null>(null);

  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      setIsPrintingInvoiceId(invoiceId);
      const res = await getInvoicePrintData(invoiceId);
      if (res.success && res.order) {
        setPrintableOrder(res.order);
        const mode = res.receiptType || 'THERMAL_80MM';
        setPrintReceiptType(mode);

        const className = mode === 'THERMAL_80MM' ? 'print-mode-thermal' : 'print-mode-a4';
        document.body.classList.add(className);

        const styleEl = document.createElement('style');
        styleEl.id = 'print-page-style';
        styleEl.innerHTML =
          mode === 'THERMAL_80MM'
            ? '@page { size: 80mm auto; margin: 0; }'
            : '@page { size: A4; margin: 15mm; }';
        document.head.appendChild(styleEl);

        const handleAfterPrint = () => {
          document.body.classList.remove(className);
          const s = document.getElementById('print-page-style');
          if (s) s.remove();
          setPrintableOrder(null);
          window.removeEventListener('afterprint', handleAfterPrint);
        };
        window.addEventListener('afterprint', handleAfterPrint);

        setTimeout(() => {
          window.print();
        }, 100);
      } else {
        toast.error(res.error || 'Failed to prepare invoice for printing');
      }
    } catch (err) {
      console.error('Error preparing invoice print:', err);
      toast.error('Could not load invoice print data');
    } finally {
      setIsPrintingInvoiceId(null);
    }
  };

  const handleBalanceSettled = () => {
    if (patientId) {
      getPatientHistory(patientId)
        .then((res) => {
          if (res.success && res.data) {
            setData(res.data);
          }
        })
        .catch((err) => console.error('Failed to reload patient history:', err));
    }
  };
  const [isSavingMemberPhone, setIsSavingMemberPhone] = useState(false);

  useEffect(() => {
    if (!isOpen || !patientId) {
      setData(null);
      setError(null);
      setIsEditingPhone(false);
      setEditingMemberId(null);
      return;
    }

    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getPatientHistory(patientId);
        if (isMounted) {
          if (res.success && res.data) {
            setData(res.data);
            setPhoneInput(res.data.patient.ownPhone || res.data.patient.phone);
          } else {
            setError(res.error || 'Failed to load patient history.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'An unexpected error occurred.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, patientId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSavePhone = async () => {
    if (!data || !phoneInput.trim()) return;
    setIsSavingPhone(true);
    try {
      const trimmed = phoneInput.trim();
      const res = await updateCustomerPhone(data.patient.id, trimmed);
      if (res.success) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                patient: {
                  ...prev.patient,
                  phone: trimmed,
                  ownPhone: trimmed,
                  hasOwnPhone: true,
                },
                familyMembers: prev.familyMembers.map((m) =>
                  m.id === prev.patient.id ? { ...m, phone: trimmed } : m
                ),
              }
            : null
        );
        setIsEditingPhone(false);
        toast.success('Phone Number Updated', {
          description:
            'Personal number updated. Both personal and linked family numbers remain on file.',
        });
      } else {
        toast.error(res.error || 'Failed to update phone number');
      }
    } catch (err) {
      console.error('Error updating phone:', err);
      toast.error('An unexpected error occurred while updating phone.');
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleSaveMemberPhone = async (memberId: string) => {
    if (!data || !memberPhoneInput.trim()) return;
    setIsSavingMemberPhone(true);
    try {
      const trimmed = memberPhoneInput.trim();
      const res = await updateCustomerPhone(memberId, trimmed);
      if (res.success) {
        setData((prev) => {
          if (!prev) return null;
          const updatedMembers = prev.familyMembers.map((m) =>
            m.id === memberId ? { ...m, phone: trimmed } : m
          );
          const isCurrentPatient = prev.patient.id === memberId;
          return {
            ...prev,
            familyMembers: updatedMembers,
            patient: isCurrentPatient
              ? {
                  ...prev.patient,
                  phone: trimmed,
                  ownPhone: trimmed,
                  hasOwnPhone: true,
                }
              : prev.patient,
          };
        });
        setEditingMemberId(null);
        toast.success('Family Member Phone Updated', {
          description: 'Personal phone updated on family account record.',
        });
      } else {
        toast.error(res.error || 'Failed to update phone number');
      }
    } catch (err) {
      console.error('Error updating member phone:', err);
      toast.error('An unexpected error occurred while updating member phone.');
    } finally {
      setIsSavingMemberPhone(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Sheet Panel */}
      <aside
        data-testid="patient-detail-sheet"
        className="relative z-50 flex h-full w-full max-w-4xl lg:max-w-5xl flex-col bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out font-sans text-slate-900 dark:text-slate-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-sheet-title"
      >
        {/* Header Bar */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 shrink-0 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="patient-sheet-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight"
              >
                Clinical History & Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Patient record & segregated family longitudinal history
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-patient-sheet"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close sheet"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sheet Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Loading clinical records...
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/40 p-5 text-red-800 dark:text-red-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span>Error Loading Patient History</span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => {
                  if (patientId) {
                    setIsLoading(true);
                    getPatientHistory(patientId).then((res) => {
                      if (res.success && res.data) {
                        setData(res.data);
                        setPhoneInput(res.data.patient.phone);
                      } else {
                        setError(res.error || 'Failed again');
                      }
                      setIsLoading(false);
                    });
                  }
                }}
                className="mt-2 text-xs font-semibold underline hover:no-underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 rounded"
              >
                Try Again
              </button>
            </div>
          )}

          {data && !isLoading && (
            <>
              {/* ── Section 1: Profile & Metrics ── */}
              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {data.patient.fullName}
                      </h3>
                      {data.patient.gender && (
                        <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:text-slate-300">
                          {data.patient.gender}
                        </span>
                      )}
                      {data.patient.age !== null && (
                        <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                          {data.patient.age} yrs
                        </span>
                      )}
                      <span className="rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold">
                        {data.patient.relationType || 'Primary'}
                      </span>
                    </div>

                    {/* Phone Section: Segregated Personal & Linked Family Account Numbers */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                      {/* 1. Linked Family Account Number (if dependent) */}
                      {data.patient.primaryCustomerId && (
                        <div className="flex items-center gap-1.5 rounded-md bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200">
                          <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                          <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">
                            Linked Family:
                          </span>
                          <span className="font-mono font-bold text-xs">
                            {data.patient.linkedPrimaryPhone || data.patient.phone}
                          </span>
                          {data.patient.linkedPrimaryName && (
                            <span className="text-[10px] text-purple-700 dark:text-purple-300">
                              ({data.patient.linkedPrimaryName})
                            </span>
                          )}
                        </div>
                      )}

                      {/* 2. Own Personal Number */}
                      {isEditingPhone ? (
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-md border border-blue-400 shadow-xs">
                          <Phone className="h-3.5 w-3.5 text-blue-600 ml-1" />
                          <input
                            type="tel"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            placeholder="Enter personal phone"
                            className="w-32 px-1.5 py-0.5 text-xs font-mono font-semibold bg-transparent focus:outline-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                            autoFocus
                          />
                          <button
                            type="button"
                            disabled={isSavingPhone}
                            onClick={handleSavePhone}
                            className="rounded bg-blue-600 p-1 text-white hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                            title="Save Phone"
                          >
                            {isSavingPhone ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingPhone(false);
                              setPhoneInput(data.patient.ownPhone || data.patient.phone);
                            }}
                            className="rounded bg-slate-200 dark:bg-slate-700 p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-300 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : data.patient.primaryCustomerId ? (
                        // Dependent Own Phone Status
                        data.patient.hasOwnPhone && data.patient.ownPhone ? (
                          <div className="flex items-center gap-1.5 rounded-md bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 border border-slate-200 dark:border-slate-700">
                            <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-300" />
                            <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                              Own Number:
                            </span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {data.patient.ownPhone}
                            </span>
                            <button
                              type="button"
                              data-testid="btn-edit-own-phone"
                              onClick={() => {
                                setPhoneInput(data.patient.ownPhone || '');
                                setIsEditingPhone(true);
                              }}
                              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition ml-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                              title="Edit personal phone number"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 dark:text-slate-300 italic">
                              No own phone registered
                            </span>
                            <button
                              type="button"
                              data-testid="btn-update-own-phone"
                              onClick={() => {
                                setPhoneInput('');
                                setIsEditingPhone(true);
                              }}
                              className="flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              <Plus className="h-3 w-3" />
                              <span>+ Update Own Number</span>
                            </button>
                          </div>
                        )
                      ) : (
                        // Primary Account Phone
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-300" />
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                              {data.patient.phone}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPhoneInput(data.patient.phone);
                              setIsEditingPhone(true);
                            }}
                            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                            title="Update patient contact number safely"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Change</span>
                          </button>
                        </div>
                      )}

                      {data.patient.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-300" />
                          <span>
                            {data.patient.city}
                            {data.patient.state ? `, ${data.patient.state}` : ''}
                          </span>
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-300" />
                        <span>
                          Since{' '}
                          {new Date(data.patient.createdAt).toLocaleDateString(
                            'en-IN',
                            {
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* LTV & Balance Badges */}
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-3.5 py-2 text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Lifetime Value
                      </div>
                      <div className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-300">
                        ₹{Number(data.lifetimeValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-metrics strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-xs">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider block">
                      Total Orders
                    </span>
                    <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                      {data.orders.length}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider block">
                      Advance Credit
                    </span>
                    <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                      ₹{Number(data.patient.advanceBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider block">
                      Outstanding Due
                    </span>
                    <span
                      className={`text-sm font-bold font-mono ${
                        Number(data.totalBalanceDue) > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      ₹{Number(data.totalBalanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider block">
                      Linked Family
                    </span>
                    <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                      {data.familyMembers.length} Members
                    </span>
                  </div>
                </div>
              </section>

              {/* ── Segregated History Tabs ── */}
              <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  data-testid="tab-personal-rx"
                  onClick={() => setActiveTab('personal')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    activeTab === 'personal'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  <span>Personal Rx ({data.personalPrescriptions.length})</span>
                </button>

                <button
                  type="button"
                  data-testid="tab-patient-orders"
                  onClick={() => setActiveTab('orders')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    activeTab === 'orders'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  <Receipt className="h-4 w-4" />
                  <span>Order Invoices ({data.orders.length})</span>
                </button>

                <button
                  type="button"
                  data-testid="tab-family-history"
                  onClick={() => setActiveTab('family')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 ${
                    activeTab === 'family'
                      ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                      : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Linked Family ({data.familyMembers.length})</span>
                </button>
              </div>

              {/* ── Tab 1: Personal Prescriptions ── */}
              {activeTab === 'personal' && (
                <div className="space-y-4">
                  {data.personalPrescriptions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center">
                      <FileText className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
                      <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No Personal Prescriptions On File
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        This patient has not yet had an eye examination recorded under their personal account.
                      </p>
                    </div>
                  ) : (
                    data.personalPrescriptions.map((rx, idx) => (
                      <PrescriptionCard
                        key={rx.id}
                        rx={rx}
                        index={data.personalPrescriptions.length - idx}
                        isLatest={idx === 0}
                      />
                    ))
                  )}
                </div>
              )}

              {/* ── Tab 2: Order History ── */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {data.orders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center">
                      <Receipt className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
                      <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No Invoices Found
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        This patient has not completed any retail or optical purchases yet.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Invoice #</th>
                              <th className="py-2.5 px-3">Items Purchased</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Total</th>
                              <th className="py-2.5 px-3 text-right">Due</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {data.orders.map((order) => {
                              const orderDate = new Date(order.createdAt);
                              const isPaid = order.paymentStatus === 'PAID';
                              return (
                                <tr
                                  key={order.id}
                                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition"
                                >
                                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                    {orderDate.toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </td>
                                  <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                    <div>{order.invoiceNumber}</div>
                                    {order.branchName && (
                                      <div className="mt-0.5">
                                        <span
                                          data-testid="patient-order-branch-badge"
                                          className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[10px] font-normal text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                        >
                                          <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                          <span className="truncate max-w-[120px]">{order.branchName}</span>
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3">
                                    {order.itemDescriptions.length > 0 ? (
                                      <div className="space-y-0.5">
                                        {order.itemDescriptions.map((desc, i) => (
                                          <div
                                            key={i}
                                            className="text-slate-700 dark:text-slate-300 line-clamp-1"
                                          >
                                            • {desc}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-slate-500 dark:text-slate-300 italic">
                                        Standard Optical Dispense
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                        isPaid
                                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                      }`}
                                    >
                                      {isPaid ? (
                                        <CheckCircle2 className="h-3 w-3" />
                                      ) : (
                                        <Clock className="h-3 w-3" />
                                      )}
                                      {order.paymentStatus}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                    ₹{Number(order.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-medium whitespace-nowrap">
                                    {Number(order.balanceDue) > 0 ? (
                                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                                        ₹{Number(order.balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </span>
                                    ) : (
                                      <span className="text-emerald-600 dark:text-emerald-400">
                                        ₹0.00
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        data-testid="btn-print-invoice"
                                        onClick={() => handlePrintInvoice(order.id)}
                                        disabled={isPrintingInvoiceId === order.id}
                                        className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 px-2 py-1 text-[10px] font-bold transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                                        title="Print Receipt / Invoice"
                                      >
                                        {isPrintingInvoiceId === order.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Printer className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                        )}
                                        <span>Print</span>
                                      </button>

                                      {order.paymentStatus === 'PARTIAL' ||
                                      order.paymentStatus === 'UNPAID' ||
                                      Number(order.balanceDue) > 0 ? (
                                        <button
                                          type="button"
                                          data-testid="btn-collect-balance"
                                          onClick={() =>
                                            setSelectedOrderForSettlement({
                                              id: order.id,
                                              invoiceNumber: order.invoiceNumber,
                                              customerName:
                                                order.billedToName || data.patient.fullName,
                                              grandTotal: order.grandTotal,
                                              advancePaid: order.advancePaid,
                                              balanceDue: order.balanceDue,
                                              orderStatus: order.orderStatus,
                                              paymentStatus: order.paymentStatus,
                                            })
                                          }
                                          className="inline-flex items-center gap-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-2 py-1 text-[10px] font-bold transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
                                        >
                                          <Banknote className="h-3 w-3" />
                                          <span>Collect Balance</span>
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-1">
                                          Settled
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab 3: Segregated Linked Family Accounts & History ── */}
              {activeTab === 'family' && (
                <div className="space-y-5">
                  {/* Linked Members Roster */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Connected Family Members ({data.familyMembers.length})</span>
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-300">
                        Linked via account hierarchy
                      </span>
                    </div>

                    {data.familyMembers.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-300 text-xs">
                        No family members or dependents are linked to this customer account yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {data.familyMembers.map((member, idx) => {
                          const primaryMember = data.familyMembers.find((m) => m.isPrimary);
                          const primaryPhone = primaryMember?.phone || '';
                          const isDependent = !member.isPrimary;
                          const hasOwnNumber = Boolean(
                            member.phone &&
                              member.phone !== primaryPhone &&
                              member.phone !== '0000000000'
                          );

                          // Find latest prescription for this family member
                          const memberRx = data.prescriptions.find(
                            (rx) => rx.patientId === member.id
                          );

                          return (
                            <div
                              key={member.id}
                              data-testid={`family-member-card-${idx}`}
                              className={`rounded-xl border p-4 space-y-3 transition shadow-2xs ${
                                member.id === data.patient.id
                                  ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 ring-1 ring-blue-400/30'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {/* Member Header: Name-wise Numbering & Relation */}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                    <span className="text-purple-600 dark:text-purple-400 font-mono text-xs">
                                      #{idx + 1}.
                                    </span>
                                    <span>{member.fullName}</span>
                                    {member.isPrimary && (
                                      <span title="Primary Account Holder">
                                        <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {member.gender || '—'} {member.age ? `• ${member.age} yrs` : ''}
                                  </div>
                                </div>
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                    member.isPrimary
                                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                      : 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300'
                                  }`}
                                >
                                  {member.relationType || (member.isPrimary ? 'Primary' : 'Family')}
                                </span>
                              </div>

                              {/* Phone details for member */}
                              <div className="space-y-1 text-xs">
                                {editingMemberId === member.id ? (
                                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-md border border-blue-400">
                                    <Phone className="h-3 w-3 text-blue-600" />
                                    <input
                                      type="tel"
                                      value={memberPhoneInput}
                                      onChange={(e) => setMemberPhoneInput(e.target.value)}
                                      placeholder="Enter phone"
                                      aria-label="Enter member phone"
                                      className="w-28 px-1 py-0.5 text-[11px] font-mono font-semibold bg-transparent focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      disabled={isSavingMemberPhone}
                                      onClick={() => handleSaveMemberPhone(member.id)}
                                      className="rounded bg-blue-600 p-0.5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                                      aria-label="Save member phone"
                                      title="Save Phone"
                                    >
                                      {isSavingMemberPhone ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Check className="h-3 w-3" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingMemberId(null)}
                                      className="rounded bg-slate-200 dark:bg-slate-700 p-0.5 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-400"
                                      aria-label="Cancel editing phone"
                                      title="Cancel"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : isDependent ? (
                                  <div className="space-y-1">
                                    {/* Linked primary number */}
                                    <div className="flex items-center gap-1.5 text-[11px] text-purple-700 dark:text-purple-300">
                                      <Users className="h-3 w-3" />
                                      <span className="text-[10px] text-purple-600 dark:text-purple-400">Linked Primary:</span>
                                      <span className="font-mono font-semibold">{primaryPhone || member.phone}</span>
                                    </div>
                                    {/* Personal number */}
                                    <div className="flex items-center justify-between gap-1 text-[11px]">
                                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                        <Phone className="h-3 w-3 text-slate-400" />
                                        <span>Own Number:</span>
                                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                                          {hasOwnNumber ? member.phone : 'Not set'}
                                        </span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingMemberId(member.id);
                                          setMemberPhoneInput(hasOwnNumber ? member.phone : '');
                                        }}
                                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                                      >
                                        {hasOwnNumber ? 'Edit' : '+ Add Number'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                      <Phone className="h-3 w-3 text-slate-400" />
                                      <span className="text-[10px] text-slate-500">Primary Phone:</span>
                                      <span className="font-mono font-semibold">{member.phone}</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMemberId(member.id);
                                        setMemberPhoneInput(member.phone);
                                      }}
                                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Embedded Optical Powers for Family Member */}
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                                    <Eye className="h-3 w-3" />
                                    <span>Optical Powers</span>
                                  </span>
                                  {memberRx ? (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      Rx: {new Date(memberRx.prescribedAt).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">
                                      No Rx on file
                                    </span>
                                  )}
                                </div>

                                {memberRx ? (
                                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                                    {/* OD (Right Eye) */}
                                    <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/30 p-2 border border-blue-200/50 dark:border-blue-900/40">
                                      <div className="font-bold text-blue-600 dark:text-blue-400 mb-0.5">
                                        OD (Right)
                                      </div>
                                      <div>SPH: <span className="font-bold text-slate-800 dark:text-slate-200">{memberRx.odSphere || 'Plano'}</span></div>
                                      <div>CYL: <span className="text-slate-800 dark:text-slate-200">{memberRx.odCylinder || '0.00'}</span></div>
                                      {memberRx.odAxis && <div>AXIS: <span className="text-slate-800 dark:text-slate-200">{memberRx.odAxis}°</span></div>}
                                      {memberRx.odAdd && <div>ADD: <span className="text-slate-800 dark:text-slate-200">{memberRx.odAdd}</span></div>}
                                      {memberRx.odPd && <div>PD: <span className="text-slate-800 dark:text-slate-200">{memberRx.odPd}mm</span></div>}
                                    </div>

                                    {/* OS (Left Eye) */}
                                    <div className="rounded-lg bg-purple-50/50 dark:bg-purple-950/30 p-2 border border-purple-200/50 dark:border-purple-900/40">
                                      <div className="font-bold text-purple-600 dark:text-purple-400 mb-0.5">
                                        OS (Left)
                                      </div>
                                      <div>SPH: <span className="font-bold text-slate-800 dark:text-slate-200">{memberRx.osSphere || 'Plano'}</span></div>
                                      <div>CYL: <span className="text-slate-800 dark:text-slate-200">{memberRx.osCylinder || '0.00'}</span></div>
                                      {memberRx.osAxis && <div>AXIS: <span className="text-slate-800 dark:text-slate-200">{memberRx.osAxis}°</span></div>}
                                      {memberRx.osAdd && <div>ADD: <span className="text-slate-800 dark:text-slate-200">{memberRx.osAdd}</span></div>}
                                      {memberRx.osPd && <div>PD: <span className="text-slate-800 dark:text-slate-200">{memberRx.osPd}mm</span></div>}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 p-2 text-center text-[10px] text-slate-400 dark:text-slate-500 italic">
                                    No clinical refraction recorded yet
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Family Clinical Prescriptions Partition */}
                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Family Clinical Refractions ({data.familyPrescriptions.length})</span>
                    </h4>

                    {data.familyPrescriptions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-300 text-xs">
                        No clinical refraction records found for linked family members.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.familyPrescriptions.map((rx, idx) => (
                          <PrescriptionCard
                            key={rx.id}
                            rx={rx}
                            index={data.familyPrescriptions.length - idx}
                            isLatest={idx === 0}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 px-6 py-3 shrink-0 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-300 font-mono">
            Press ESC to close
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-200 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            Close Sheet
          </button>
        </div>
      </aside>

      {/* ── Balance Settlement Modal ── */}
      <SettleBalanceModal
        isOpen={!!selectedOrderForSettlement}
        onClose={() => setSelectedOrderForSettlement(null)}
        invoice={selectedOrderForSettlement}
        onSuccess={handleBalanceSettled}
      />

      {/* ── Mounted Print Template for Past Invoices ── */}
      {printableOrder && (
        <>
          {printReceiptType === 'THERMAL_80MM' ? (
            <ThermalReceipt order={printableOrder} />
          ) : (
            <A4TaxInvoice order={printableOrder} />
          )}
        </>
      )}
    </div>
  );
}

function PrescriptionCard({
  rx,
  index,
  isLatest,
}: {
  rx: PatientPrescriptionHistory;
  index: number;
  isLatest: boolean;
}) {
  const rxDate = new Date(rx.prescribedAt);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
      {/* Rx Header Strip */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 px-4 py-2.5 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-[10px] font-bold text-blue-700 dark:text-blue-300">
            #{index}
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Exam Date:{' '}
            {rxDate.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {/* Patient / Family Member Badge */}
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border flex items-center gap-1 ${
              rx.isDependent
                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
            }`}
          >
            <User className="h-2.5 w-2.5" />
            <span>{rx.patientName}</span>
            <span className="text-[9px] uppercase tracking-wider font-mono">
              ({rx.relationType && rx.relationType !== 'Self' ? rx.relationType : (rx.isDependent ? 'Dependent' : 'Primary Account')})
            </span>
          </span>
          {isLatest && (
            <span className="rounded bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Latest Rx
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-300">
          {rxDate.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* OD/OS Refraction Matrix Table */}
      <div className="p-4 space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300">
                <th className="py-1.5 px-2 font-mono">Eye</th>
                <th className="py-1.5 px-2 font-mono text-center">SPH</th>
                <th className="py-1.5 px-2 font-mono text-center">CYL</th>
                <th className="py-1.5 px-2 font-mono text-center">AXIS</th>
                <th className="py-1.5 px-2 font-mono text-center">ADD</th>
                <th className="py-1.5 px-2 font-mono text-center">PD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-300">
              {/* OD - Right Eye */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                <td className="py-2 px-2 font-bold text-blue-600 dark:text-blue-400">
                  OD (Right)
                </td>
                <td className="py-2 px-2 text-center font-medium">
                  {rx.odSphere ? (rx.odSphere.startsWith('-') || rx.odSphere.startsWith('+') ? rx.odSphere : `+${rx.odSphere}`) : '0.00'}
                </td>
                <td className="py-2 px-2 text-center font-medium">
                  {rx.odCylinder ? (rx.odCylinder.startsWith('-') || rx.odCylinder.startsWith('+') ? rx.odCylinder : `+${rx.odCylinder}`) : '0.00'}
                </td>
                <td className="py-2 px-2 text-center font-medium">
                  {rx.odAxis ? `${rx.odAxis}°` : '—'}
                </td>
                <td className="py-2 px-2 text-center font-medium">
                  {rx.odAdd ? (rx.odAdd.startsWith('+') ? rx.odAdd : `+${rx.odAdd}`) : '—'}
                </td>
                <td className="py-2 px-2 text-center font-medium">
                  {rx.odPd ? `${rx.odPd} mm` : '—'}
                </td>
              </tr>

              {/* OS - Left Eye */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                <td className="py-2 px-2 font-bold text-indigo-600 dark:text-indigo-400">
                  OS (Left)
                </td>
                <td className="py-2 px-2 text-center font-medium">
                  {rx.osSphere ? (rx.osSphere.startsWith('-') || rx.osSphere.startsWith('+') ? rx.osSphere : `+${rx.osSphere}`) : '0.00'}
                </td>
                <td className="py-2 px-2 text-center font-medium">
                  {rx.osCylinder ? (rx.osCylinder.startsWith('-') || rx.osCylinder.startsWith('+') ? rx.osCylinder : `+${rx.osCylinder}`) : '0.00'}
                </td>
                <td className="py-2 px-2 text-center font-medium">
                  {rx.osAxis ? `${rx.osAxis}°` : '—'}
                </td>
                <td className="py-2 px-2 text-center font-medium">
                  {rx.osAdd ? (rx.osAdd.startsWith('+') ? rx.osAdd : `+${rx.osAdd}`) : '—'}
                </td>
                <td className="py-2 px-2 text-center font-medium">
                  {rx.osPd ? `${rx.osPd} mm` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Additional metadata: Binocular PD & Clinical Remarks */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
          {rx.binocularPd && (
            <div className="text-slate-500 dark:text-slate-300">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Binocular PD:
              </span>{' '}
              <span className="font-mono">{rx.binocularPd} mm</span>
            </div>
          )}
          {rx.clinicalRemarks && (
            <div className="w-full rounded-md bg-slate-50 dark:bg-slate-950 p-2 text-slate-700 dark:text-slate-300 italic">
              &ldquo;{rx.clinicalRemarks}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
