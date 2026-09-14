'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import Decimal from 'decimal.js';
import {
  Users,
  Search,
  RefreshCw,
  Eye,
  FileText,
  TrendingUp,
  Receipt,
  Calendar,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  Loader2,
  X,
  UserCheck,
  UserPlus,
  Edit,
  Trash2,
  AlertTriangle,
  Building2,
  Store,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getPatients,
  deletePatientAction,
  type PatientSummary,
} from '@/actions/patient-actions';
import { useTenantStore } from '@/store/tenant-store';
import { PatientDetailSheet } from '@/components/admin/patient-detail-sheet';
import { AddPatientModal } from '@/components/admin/add-patient-modal';
import { EditPatientModal } from '@/components/admin/edit-patient-modal';

export function PatientsView() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedBranchIds = useTenantStore((state) => state.selectedBranchIds);
  const branches = useTenantStore((state) => state.branches);

  // CRUD Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientSummary | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<PatientSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPatients = async (branchIds?: string[]) => {
    try {
      setIsLoading(true);
      const res = await getPatients(branchIds);
      if (res.success && res.patients) {
        setPatients(res.patients);
      } else {
        toast.error('Failed to load patient directory', {
          description: res.error || 'Could not fetch patients.',
        });
      }
    } catch (err) {
      console.error('[PatientsView] fetch error:', err);
      toast.error('Connection error', {
        description: 'Failed to connect to patient service.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients(selectedBranchIds);
  }, [selectedBranchIds]);

  const activeBranchLabel = useMemo(() => {
    if (!selectedBranchIds || selectedBranchIds.includes('all') || selectedBranchIds.length === 0) {
      return 'All Branches';
    }
    if (selectedBranchIds.length === 1) {
      const match = branches.find((b) => b.id === selectedBranchIds[0]);
      return match ? match.name : 'Selected Store';
    }
    return `${selectedBranchIds.length} Stores Selected`;
  }, [selectedBranchIds, branches]);

  const handleRefresh = () => {
    startTransition(async () => {
      await fetchPatients();
      toast.info('Patient directory refreshed', { duration: 1500 });
    });
  };

  // Filtered list based on Search Input (name or phone)
  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.city && p.city.toLowerCase().includes(q))
    );
  }, [patients, searchQuery]);

  // Aggregate KPI summary metrics using Decimal.js
  const metrics = useMemo(() => {
    let totalOrders = 0;
    let totalLtvDec = new Decimal(0);
    let activePatients = 0;

    for (const p of patients) {
      totalOrders += p.totalOrders;
      totalLtvDec = totalLtvDec.plus(new Decimal(p.lifetimeValue || '0.00'));
      if (p.totalOrders > 0 || p.lastVisitDate) {
        activePatients++;
      }
    }

    return {
      totalPatients: patients.length,
      totalOrders,
      totalLtv: totalLtvDec.toFixed(2),
      activePatients,
    };
  }, [patients]);

  const handleOpenDetail = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsSheetOpen(true);
  };

  const handleCloseDetail = () => {
    setIsSheetOpen(false);
    setSelectedPatientId(null);
  };

  const handlePatientAdded = (newPatient: PatientSummary) => {
    setPatients((prev) => [newPatient, ...prev.filter((p) => p.id !== newPatient.id)]);
  };

  const handlePatientUpdated = (updated: PatientSummary) => {
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleConfirmDelete = async () => {
    if (!deletingPatient) return;
    try {
      setIsDeleting(true);
      const res = await deletePatientAction(deletingPatient.id);
      if (res.success) {
        setPatients((prev) => prev.filter((p) => p.id !== deletingPatient.id));
        toast.success('Patient Removed', {
          description: `${deletingPatient.fullName} has been removed from active records.`,
        });
        setDeletingPatient(null);
      } else {
        toast.error('Failed to delete patient', {
          description: res.error || 'Please try again.',
        });
      }
    } catch (err) {
      console.error('[PatientsView] delete error:', err);
      toast.error('Error removing patient');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">
      {/* ── Page Header & Controls ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Patient Directory
            </h1>
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {patients.length} Records
            </span>
            <span
              data-testid="patients-scope-badge"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
            >
              {selectedBranchIds?.includes('all') || !selectedBranchIds?.length ? (
                <Layers className="h-3 w-3" />
              ) : selectedBranchIds.length === 1 ? (
                <Store className="h-3 w-3" />
              ) : (
                <Building2 className="h-3 w-3" />
              )}
              <span>{activeBranchLabel}</span>
              {isLoading && <span className="animate-pulse">...</span>}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-300 mt-0.5">
            Clinical history, longitudinal refractions (OD/OS), and customer lifetime value
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Search Bar */}
          <div className="relative min-w-[240px] sm:min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-300" />
            <input
              type="text"
              aria-label="Search patients by name or phone"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear patient search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending || isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition active:scale-95 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Refresh Directory"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                isPending || isLoading ? 'animate-spin text-blue-600' : ''
              }`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Add Patient Button */}
          <button
            type="button"
            data-testid="btn-add-patient"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Patient</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
              Total Patients
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {metrics.totalPatients}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
            Registered customer accounts
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
              Active Visitors
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {metrics.activePatients}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
            Patients with recorded visits
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
              Cumulative Orders
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {metrics.totalOrders}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
            Dispensed optical invoices
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
              Total Customer LTV
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            ₹{Number(metrics.totalLtv).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
            Sum of all historical sales
          </div>
        </div>
      </div>

      {/* ── Patient Directory Data Table ── */}
      <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 text-[10px]">
              <tr>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4 text-center">Total Orders</th>
                <th className="py-3 px-4">Last Visit Date</th>
                <th className="py-3 px-4 text-right">Lifetime Spend</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Loading patient records...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No Patients Found
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      {searchQuery
                        ? `No match found for "${searchQuery}". Try a different name or phone.`
                        : 'No patients have been registered in the system yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const lastVisit = patient.lastVisitDate
                    ? new Date(patient.lastVisitDate)
                    : null;

                  return (
                    <tr
                      key={patient.id}
                      onClick={() => handleOpenDetail(patient.id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group cursor-pointer"
                    >
                      {/* Patient Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {patient.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                              {patient.fullName}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-300">
                              {patient.gender && <span>{patient.gender}</span>}
                              {patient.age && <span>• {patient.age} yrs</span>}
                              {patient.city && <span>• {patient.city}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-slate-400 dark:text-slate-300" />
                          {patient.phone}
                        </span>
                      </td>

                      {/* Total Orders */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                            patient.totalOrders > 0
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {patient.totalOrders}
                        </span>
                      </td>

                      {/* Last Visit Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {lastVisit ? (
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {lastVisit.toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-300 font-mono">
                              {lastVisit.toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-300 italic text-[11px]">
                            No orders yet
                          </span>
                        )}
                      </td>

                      {/* Lifetime Spend (LTV) */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        ₹{Number(patient.lifetimeValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Action Column */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            data-testid="btn-view-patient-history"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(patient.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:border-blue-300 dark:hover:border-blue-800 shadow-2xs transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                            title="View Clinical Profile & Orders"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </button>

                          <button
                            type="button"
                            data-testid="btn-edit-patient"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPatient(patient);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:border-amber-300 dark:hover:border-amber-800 shadow-2xs transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                            title="Edit Patient Details"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>

                          <button
                            type="button"
                            data-testid="btn-delete-patient"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingPatient(patient);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 hover:border-red-300 dark:hover:border-red-800 shadow-2xs transition active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                            title="Delete Patient"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Directory Table Footer Info */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 shrink-0">
          <div>
            Showing <span className="font-bold text-slate-700 dark:text-slate-300">{filteredPatients.length}</span> of{' '}
            <span className="font-bold text-slate-700 dark:text-slate-300">{patients.length}</span> patients
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* ── Slide-out Sheet for Clinical History ── */}
      <PatientDetailSheet
        patientId={selectedPatientId}
        isOpen={isSheetOpen}
        onClose={handleCloseDetail}
      />

      {/* ── Add Patient Modal ── */}
      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onPatientAdded={handlePatientAdded}
      />

      {/* ── Edit Patient Modal ── */}
      <EditPatientModal
        isOpen={!!editingPatient}
        onClose={() => setEditingPatient(null)}
        patient={editingPatient}
        onPatientUpdated={handlePatientUpdated}
      />

      {/* ── Delete Confirmation Modal ── */}
      {deletingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity"
            onClick={() => !isDeleting && setDeletingPatient(null)}
            aria-hidden="true"
          />

          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-patient-dialog-title"
            className="relative z-50 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 font-sans space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3
                  id="delete-patient-dialog-title"
                  className="text-base font-bold text-slate-900 dark:text-slate-100"
                >
                  Delete Patient Record?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {deletingPatient.fullName} ({deletingPatient.phone})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove this patient? This will remove them from active directories and POS search. Historical invoices and optical prescriptions will remain preserved for legal and financial audit logs.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingPatient(null)}
                disabled={isDeleting}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-patient"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
