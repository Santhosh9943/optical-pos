'use client';

import { useState, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import {
  Search,
  User,
  Phone,
  MapPin,
  Loader2,
  X,
  AlertCircle,
  Users,
  Plus,
  HeartHandshake,
} from 'lucide-react';

export interface Patient {
  id: string;
  fullName: string;
  phone: string;
  age: number | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  relationType?: string; // 'Self' | 'Spouse' | 'Child' | 'Parent' | 'Other'
  primaryCustomerId?: string | null;
  advanceBalance?: string;
  city?: string | null;
}

interface PatientSearchProps {
  onPatientSelect: (patient: Patient, familyGroup?: Patient[]) => void;
  selectedPatient?: Patient | null;
  onClearPatient?: () => void;
  onOpenAddFamilyModal?: () => void;
}

export function PatientSearch({
  onPatientSelect,
  selectedPatient,
  onClearPatient,
  onOpenAddFamilyModal,
}: PatientSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = useDebouncedCallback(async (phone: string) => {
    const trimmed = phone.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setIsSearching(false);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/patients/search?phone=${encodeURIComponent(trimmed)}`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const patients: Patient[] = data.patients || [];
      setResults(patients);
      setIsOpen(true);

      // Auto-select if exactly one match occurs on full 10-digit number
      if (patients.length === 1 && trimmed.length === 10) {
        handleSelect(patients[0], patients);
      }
    } catch (err) {
      console.error('[patient-search] Failed to search:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, 150);

  const handleSelect = (patient: Patient, allResults = results) => {
    // Collect all family members in this search matching the same phone or primaryCustomerId
    const primaryId = patient.primaryCustomerId || patient.id;
    const familyGroup = allResults.filter(
      (p) =>
        p.id === patient.id ||
        p.primaryCustomerId === primaryId ||
        p.id === primaryId ||
        p.phone === patient.phone
    );

    onPatientSelect(patient, familyGroup.length > 0 ? familyGroup : [patient]);
    setQuery(patient.phone);
    setIsOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    if (onClearPatient) onClearPatient();
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3 flex items-center text-slate-500 dark:text-slate-300">
          <Search className="h-4 w-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          data-testid="patient-search-input"
          aria-label="Search patient by name or phone"
          autoFocus
          value={
            selectedPatient
              ? `${selectedPatient.fullName} (${selectedPatient.phone})`
              : query
          }
          onChange={(e) => {
            if (selectedPatient && onClearPatient) {
              onClearPatient();
            }
            setQuery(e.target.value);
            search(e.target.value);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search patient by name or phone (e.g. Rajesh, 9876543210)... [F2]"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-9 pr-10 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-2xs transition placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20"
        />

        <div className="absolute right-3 flex items-center space-x-1">
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          )}
          {(query || selectedPatient) && !isSearching && (
            <button
              type="button"
              aria-label="Clear patient search"
              onClick={handleClear}
              className="rounded p-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Clear Search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
          {results.length > 0 ? (
            <div className="p-1">
              <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                <span>Matching Patients ({results.length})</span>
                <span className="text-[10px] lowercase text-slate-500 dark:text-slate-300">
                  family group linked
                </span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {results.map((patient) => {
                  const isDependent = !!patient.primaryCustomerId;
                  return (
                    <li
                      key={patient.id}
                      onClick={() => handleSelect(patient)}
                      className="flex cursor-pointer items-center justify-between rounded-md p-3 transition hover:bg-blue-50 dark:hover:bg-slate-800/70"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full font-semibold ${
                            isDependent
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {patient.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {patient.fullName}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                isDependent
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              {patient.relationType && patient.relationType !== 'Self'
                                ? patient.relationType
                                : isDependent
                                  ? 'Dependent'
                                  : 'Primary Account'}
                            </span>
                            {patient.gender && (
                              <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                                {patient.gender}
                                {patient.age ? `, ${patient.age}y` : ''}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-slate-600 dark:text-slate-300">
                            <span className="flex items-center font-mono">
                              <Phone className="mr-1 h-3 w-3 text-slate-500 dark:text-slate-300" />
                              {patient.phone}
                            </span>
                            {patient.city && (
                              <span className="flex items-center">
                                <MapPin className="mr-1 h-3 w-3 text-slate-500 dark:text-slate-300" />
                                {patient.city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {patient.advanceBalance && Number(patient.advanceBalance) > 0 ? (
                          <div className="text-xs">
                            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              Credit: ₹{patient.advanceBalance}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : query.trim().length >= 3 && !isSearching ? (
            <div className="p-4 text-center">
              <AlertCircle className="mx-auto h-5 w-5 text-slate-500 dark:text-slate-300" />
              <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                No patient found with phone matching &quot;{query}&quot;
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
                Click &quot;+ Add Family Member&quot; or register a new patient below.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
