'use client';

import { useState, useEffect, useRef } from 'react';
import { X, User, Phone, Hash, DollarSign, FileText, Loader2, AlertCircle } from 'lucide-react';

interface FarmerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  farmer?: {
    _id: string;
    farmerCode: string;
    name: string;
    phone?: string;
    defaultRate: number;
    isActive: boolean;
    notes?: string;
  } | null;
}

interface FormState {
  farmerCode: string;
  name: string;
  phone: string;
  defaultRate: string;
  isActive: boolean;
  notes: string;
}

const DEFAULT_FORM: FormState = {
  farmerCode: '',
  name: '',
  phone: '',
  defaultRate: '0.00',
  isActive: true,
  notes: '',
};

export default function FarmerModal({ isOpen, onClose, onSave, farmer }: FarmerModalProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!farmer;

  // Populate form when farmer prop changes
  useEffect(() => {
    if (farmer) {
      setForm({
        farmerCode: farmer.farmerCode,
        name: farmer.name,
        phone: farmer.phone ?? '',
        defaultRate: farmer.defaultRate.toFixed(2),
        isActive: farmer.isActive,
        notes: farmer.notes ?? '',
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setErrors({});
    setApiError('');
  }, [farmer, isOpen]);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.farmerCode.trim()) {
      newErrors.farmerCode = 'Farmer code is required';
    } else if (!/^[A-Z0-9-]+$/.test(form.farmerCode.trim())) {
      newErrors.farmerCode = 'Only letters, numbers, and hyphens allowed';
    }

    if (!form.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    const rate = parseFloat(form.defaultRate);
    if (isNaN(rate) || rate < 0) {
      newErrors.defaultRate = 'Rate must be a non-negative number';
    }

    if (form.phone.trim() && !/^[\d\s+\-()]+$/.test(form.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFarmerCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const upper = e.target.value.toUpperCase();
    setForm((prev) => ({ ...prev, farmerCode: upper }));
    if (errors.farmerCode) setErrors((prev) => ({ ...prev, farmerCode: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError('');

    try {
      const payload = {
        farmerCode: form.farmerCode.trim(),
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        defaultRate: parseFloat(form.defaultRate),
        isActive: form.isActive,
        notes: form.notes.trim() || undefined,
      };

      const url = isEditMode ? `/api/farmers/${farmer._id}` : '/api/farmers';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      onSave();
      onClose();
    } catch {
      setApiError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="farmer-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 id="farmer-modal-title" className="text-lg font-bold text-slate-900">
              {isEditMode ? 'Edit Farmer' : 'Add Farmer'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditMode ? 'Update farmer details' : 'Register a new farmer'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* API Error */}
        {apiError && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 flex-1">
          {/* Farmer Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Farmer Code <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Hash
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                ref={firstInputRef}
                type="text"
                name="farmerCode"
                value={form.farmerCode}
                onChange={handleFarmerCodeChange}
                placeholder="e.g. F001"
                maxLength={20}
                className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.farmerCode
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              />
            </div>
            {errors.farmerCode && (
              <p className="mt-1 text-xs text-red-600">{errors.farmerCode}</p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Farmer's full name"
                maxLength={100}
                className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.name
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Phone{' '}
              <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <div className="relative">
              <Phone
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. 9841000000"
                maxLength={20}
                className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.phone
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Default Rate */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Default Rate per Liter (Rs.)
            </label>
            <div className="relative">
              <DollarSign
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="number"
                name="defaultRate"
                value={form.defaultRate}
                onChange={handleChange}
                min="0"
                step="0.5"
                className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.defaultRate
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              />
            </div>
            {errors.defaultRate && (
              <p className="mt-1 text-xs text-red-600">{errors.defaultRate}</p>
            )}
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-700">Status</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {form.isActive ? 'Farmer is active and can submit entries' : 'Farmer is inactive'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                form.isActive ? 'bg-green-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  form.isActive ? 'translate-x-5.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Notes{' '}
              <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <div className="relative">
              <FileText
                size={15}
                className="absolute left-3 top-3 text-slate-400 pointer-events-none"
              />
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any additional notes..."
                rows={3}
                maxLength={500}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm resize-none transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 pb-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Saving…
                </>
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Add Farmer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
