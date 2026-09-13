'use client';

import { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Users,
  Search,
  Loader2,
  Check,
  UserCheck,
  Phone,
} from 'lucide-react';
import type { POSPatient } from '@/store/pos-store';
import { linkExistingCustomerToFamily } from '@/actions/patient-actions';
import { getDynamicRelationship } from '@/lib/patient-relationship';
import { toast } from 'sonner';

interface AddFamilyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryPatient: POSPatient | null;
  availableFamilyMembers?: POSPatient[];
  activePatients?: POSPatient[];
  onAddMember: (member: POSPatient) => void;
}

const RELATION_OPTIONS = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Grandparent',
  'Other',
];

export function AddFamilyMemberModal({
  isOpen,
  onClose,
  primaryPatient,
  availableFamilyMembers = [],
  activePatients = [],
  onAddMember,
}: AddFamilyMemberModalProps) {
  const unaddedLinkedMembers = availableFamilyMembers.filter(
    (m) =>
      m.id !== primaryPatient?.id &&
      !activePatients.some((ap) => ap.id === m.id)
  );

  const [activeTab, setActiveTab] = useState<'linked' | 'new' | 'existing'>('new');
  const [tabManuallySelected, setTabManuallySelected] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTabManuallySelected(false);
      return;
    }
    if (!tabManuallySelected) {
      if (unaddedLinkedMembers.length > 0) {
        setActiveTab('linked');
      } else {
        setActiveTab('new');
      }
    }
  }, [isOpen, unaddedLinkedMembers.length, tabManuallySelected]);

  // New Member Form State
  const [fullName, setFullName] = useState('');
  const [relationType, setRelationType] = useState('Spouse');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('FEMALE');
  const [phone, setPhone] = useState(primaryPatient?.phone || '');
  const [error, setError] = useState<string | null>(null);

  // Existing Patient Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<POSPatient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [existingRelation, setExistingRelation] = useState('Family');
  const [linkingId, setLinkingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearchExisting = async (q: string) => {
    setSearchQuery(q);
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/patients/search?q=${encodeURIComponent(trimmed)}`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const patients: POSPatient[] = (data.patients || []).filter(
        (p: POSPatient) => p.id !== primaryPatient?.id
      );
      setSearchResults(patients);
    } catch (err) {
      console.error('[AddFamilyMemberModal] Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLinkExisting = async (patient: POSPatient) => {
    if (!primaryPatient) return;
    setLinkingId(patient.id);

    try {
      const res = await linkExistingCustomerToFamily(
        primaryPatient.id,
        patient.id,
        existingRelation
      );

      if (res.success) {
        const linkedMember: POSPatient = {
          ...patient,
          primaryCustomerId: primaryPatient.id,
          relationType: existingRelation,
          isPayer: false,
        };
        onAddMember(linkedMember);
        toast.success(`Linked ${patient.fullName} to family group`);
        onClose();
      } else {
        setError(res.error || 'Failed to link customer.');
      }
    } catch (err) {
      console.error('[handleLinkExisting] Error:', err);
      setError('An unexpected error occurred while linking customer.');
    } finally {
      setLinkingId(null);
    }
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please enter the family member full name.');
      return;
    }

    const newMember: POSPatient = {
      id: crypto.randomUUID(),
      fullName: fullName.trim(),
      phone: phone.trim() || primaryPatient?.phone || '0000000000',
      age: age ? parseInt(age, 10) : null,
      gender,
      relationType,
      primaryCustomerId: primaryPatient?.id || null,
      isPayer: false,
    };

    onAddMember(newMember);
    onClose();
    // Reset fields
    setFullName('');
    setAge('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-50 w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden font-sans text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Family Group Management
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Link members to {primaryPatient?.fullName || 'primary account'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900 p-1">
          {unaddedLinkedMembers.length > 0 && (
            <button
              type="button"
              data-testid="tab-existing-family-members"
              onClick={() => {
                setTabManuallySelected(true);
                setActiveTab('linked');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === 'linked'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Existing Family ({unaddedLinkedMembers.length})
            </button>
          )}
          <button
            type="button"
            data-testid="tab-create-new-member"
            onClick={() => {
              setTabManuallySelected(true);
              setActiveTab('new');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'new'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            + Create New Member
          </button>
          <button
            type="button"
            data-testid="tab-link-existing-member"
            onClick={() => {
              setTabManuallySelected(true);
              setActiveTab('existing');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'existing'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Link Existing Patient
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-md bg-red-50 dark:bg-red-950/50 p-2.5 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        {/* ── MODE 0: ADD EXISTING LINKED MEMBER TO CURRENT ORDER ── */}
        {activeTab === 'linked' && (
          <div className="p-5 space-y-3.5">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Select an existing family member linked to {primaryPatient?.fullName || 'this account'} to add them to the current order:
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {unaddedLinkedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 transition hover:border-blue-300 dark:hover:border-blue-700"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {member.fullName}
                      </span>
                      <span className="rounded bg-purple-100 dark:bg-purple-950/80 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:text-purple-300 uppercase">
                        {getDynamicRelationship(member, primaryPatient)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{member.phone}</span>
                      </span>
                      {(member.gender || member.age) && (
                        <span>
                          {member.gender || '—'}, {member.age ? `${member.age} yrs` : '—'}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="btn-add-existing-to-order"
                    onClick={() => {
                      const dynamicMember: POSPatient = {
                        ...member,
                        relationType: getDynamicRelationship(member, primaryPatient),
                        rawRelationType: member.rawRelationType || member.relationType || 'Family',
                      };
                      onAddMember(dynamicMember);
                      toast.success(`Added ${member.fullName} to Order`);
                      if (unaddedLinkedMembers.length <= 1) {
                        onClose();
                      }
                    }}
                    className="flex items-center gap-1 shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>+ Add to Order</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="text-[11px] text-slate-400">
                Want to register someone new?
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Create New Member
              </button>
            </div>
          </div>
        )}

        {/* ── MODE 1: CREATE NEW DEPENDENT FORM ── */}
        {activeTab === 'new' && (
          <form onSubmit={handleCreateNew} className="p-5 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                autoFocus
                data-testid="family-member-name-input"
                aria-label="Full Name"
                placeholder="e.g. Priya Sharma / Rohan Kumar"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Relationship *
                </label>
                <select
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {RELATION_OPTIONS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) =>
                    setGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER')
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Age (years)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="e.g. 28"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="Inherits Link Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              💡 If contact phone is left empty, the primary account phone ({primaryPatient?.phone}) is used as the link number. If the person acquires their own number later, it can be updated anytime without altering historical invoices.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="add-family-member-submit"
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-2xs"
              >
                Add to Family Group
              </button>
            </div>
          </form>
        )}

        {/* ── MODE 2: LINK EXISTING PATIENT ── */}
        {activeTab === 'existing' && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Search Patient
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  data-testid="search-existing-patient-input"
                  placeholder="Search by name or phone (e.g. Priya, 9812345678)..."
                  value={searchQuery}
                  onChange={(e) => handleSearchExisting(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 animate-spin text-blue-600" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Link Relationship:
              </label>
              <select
                value={existingRelation}
                onChange={(e) => setExistingRelation(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                {RELATION_OPTIONS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
            </div>

            {/* Results List */}
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {searchResults.length > 0 ? (
                searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {patient.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {patient.phone} · {patient.gender || '—'}, {patient.age ? `${patient.age}y` : '—'}
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid="link-existing-submit"
                      data-patient-id={patient.id}
                      disabled={linkingId === patient.id}
                      onClick={() => handleLinkExisting(patient)}
                      className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {linkingId === patient.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      <span>Link Member</span>
                    </button>
                  </div>
                ))
              ) : searchQuery.length >= 2 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching patients found.
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  Type at least 2 characters to search existing patients.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
