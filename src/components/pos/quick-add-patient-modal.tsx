'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Phone, User, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createPatientAction } from '@/actions/patient-actions';
import type { Patient } from '@/components/pos/patient-search';

interface QuickAddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillQuery?: string;
  onPatientCreated: (patient: Patient) => void;
}

export function QuickAddPatientModal({
  isOpen,
  onClose,
  prefillQuery = '',
  onPatientCreated,
}: QuickAddPatientModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
  const [city, setCity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const q = prefillQuery.trim();
      const isPhone = /^\d+$/.test(q);
      if (isPhone) {
        setPhone(q);
        setFullName('');
      } else {
        setFullName(q);
        setPhone('');
      }
      setAge('');
      setGender('');
      setCity('');
    }
  }, [isOpen, prefillQuery]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      toast.error('Patient name is required');
      return;
    }
    if (!trimmedPhone) {
      toast.error('Phone number is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createPatientAction({
        fullName: trimmedName,
        phone: trimmedPhone,
        age: age ? parseInt(age, 10) : null,
        gender: gender ? gender : null,
        city: city.trim() || null,
        relationType: 'Self',
      });

      if (res.success && res.patient) {
        toast.success('Patient Registered', {
          description: `${res.patient.fullName} has been added and selected.`,
        });

        const newPatient: Patient = {
          id: res.patient.id,
          fullName: res.patient.fullName,
          phone: res.patient.phone,
          age: res.patient.age,
          gender: res.patient.gender,
          relationType: res.patient.relationType,
          primaryCustomerId: res.patient.primaryCustomerId,
          advanceBalance: res.patient.advanceBalance,
          city: res.patient.city,
        };

        onPatientCreated(newPatient);
        onClose();
      } else {
        toast.error('Failed to create patient', {
          description: res.error || 'Please check the information and try again.',
        });
      }
    } catch (err) {
      console.error('[QuickAddPatientModal] Error creating patient:', err);
      toast.error('Unexpected error', {
        description: 'Failed to communicate with patient service.',
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
        aria-labelledby="quick-add-patient-title"
        className="relative z-50 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h3
                id="quick-add-patient-title"
                className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight"
              >
                Register New Patient
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quick create for POS counter billing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Full Name</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              data-testid="input-quick-patient-name"
              placeholder="e.g. Ramesh Kumar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
              autoFocus
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>Phone Number</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              data-testid="input-quick-patient-phone"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Age & Gender Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Age
              </label>
              <input
                type="number"
                min="0"
                max="130"
                placeholder="Age in yrs"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) =>
                  setGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER' | '')
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* City */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>City</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Mumbai / Bangalore"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="btn-submit-quick-patient"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Register & Select</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
