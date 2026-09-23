'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Phone,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  Save,
  AlertCircle,
  Users,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface IFarmer {
  _id: string;
  farmerCode: string;
  name: string;
  phone?: string;
  address?: string;
  defaultRate: number;
  isActive: boolean;
}

interface FarmerModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editFarmer?: IFarmer | null;
}

function FarmerModal({ open, onClose, onSaved, editFarmer }: FarmerModalProps) {
  const isEdit = !!editFarmer;
  const [form, setForm] = useState({
    farmerCode: '',
    name: '',
    phone: '',
    address: '',
    defaultRate: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editFarmer) {
      setForm({
        farmerCode: editFarmer.farmerCode,
        name: editFarmer.name,
        phone: editFarmer.phone ?? '',
        address: editFarmer.address ?? '',
        defaultRate: String(editFarmer.defaultRate),
        isActive: editFarmer.isActive,
      });
    } else {
      setForm({ farmerCode: '', name: '', phone: '', address: '', defaultRate: '0', isActive: true });
    }
    setError('');
  }, [editFarmer, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        defaultRate: parseFloat(form.defaultRate) || 0,
      };
      const res = await fetch(isEdit ? `/api/farmers/${editFarmer!._id}` : '/api/farmers', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save farmer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden safe-area-pb">
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">{isEdit ? 'Edit Farmer' : 'Add Farmer'}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Farmer Code *</label>
              <input
                required
                value={form.farmerCode}
                onChange={(e) => setForm({ ...form, farmerCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="F001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Default Rate (Rs./L)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.defaultRate}
                onChange={(e) => setForm({ ...form, defaultRate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Farmer name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="98XXXXXXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Village / Ward"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">Active Status</p>
              <p className="text-xs text-slate-500">
                {form.isActive ? 'Farmer is active for milk collection' : 'Farmer is currently inactive'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
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

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-green-400 text-white font-bold rounded-xl transition text-sm min-h-[44px] shadow-xs active:scale-95"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'Save Changes' : 'Add Farmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FarmersPage() {
  const router = useRouter();
  const [farmers, setFarmers] = useState<IFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [filtersMinimized, setFiltersMinimized] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editFarmer, setEditFarmer] = useState<IFarmer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/farmers');
      if (!res.ok) throw new Error('Failed to fetch farmers');
      const data = await res.json();
      const list: IFarmer[] = Array.isArray(data) ? data : data?.farmers || [];
      setFarmers(list.sort((a, b) => (a.farmerCode || '').localeCompare(b.farmerCode || '', undefined, { numeric: true })));
    } catch (err) {
      console.error('Error fetching farmers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFarmers(); }, []);

  const activeCount = farmers.filter((f) => f.isActive).length;
  const inactiveCount = farmers.length - activeCount;

  const filtered = farmers.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.farmerCode.toLowerCase().includes(search.toLowerCase()) ||
      (f.phone && f.phone.includes(search));
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? f.isActive
        : !f.isActive;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (farmer: IFarmer) => {
    if (!window.confirm(`Delete farmer "${farmer.name}"? This cannot be undone.`)) return;
    setDeletingId(farmer._id);
    try {
      const res = await fetch(`/api/farmers/${farmer._id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to delete farmer');
      }
      await fetchFarmers();
    } catch {
      alert('Failed to delete farmer. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const openAdd = () => { setEditFarmer(null); setModalOpen(true); };
  const openEdit = (f: IFarmer) => { setEditFarmer(f); setModalOpen(true); };

  return (
    <div className="space-y-5 max-w-5xl">
      <FarmerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchFarmers}
        editFarmer={editFarmer}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Farmers</h1>
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {farmers.length} total
          </span>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Farmer
        </button>
      </div>

      {/* 1. SEARCH BAR (ALWAYS VISIBLE OUTSIDE FILTER BAR) */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="किसान खोज्नुहोस् (Search by name, code or phone)…"
          className="w-full pl-9 pr-9 py-2 bg-white hover:bg-slate-50/70 focus:bg-white text-base sm:text-sm font-medium text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-2xs transition"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. COLLAPSIBLE STATUS FILTER (MINIMIZED BY DEFAULT, ALL FILTER CHOSEN) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Bar with quick status and Minimize/Expand toggle */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50/80 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>स्थिति फिल्टर (Status Filters)</span>
            </div>
            {/* Active summary badges */}
            <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              स्थिति: <strong className="text-slate-900 capitalize">{statusFilter === 'all' ? 'सबै (All)' : statusFilter === 'active' ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'}</strong>
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              ({filtered.length}/{farmers.length})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setFiltersMinimized((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer flex-shrink-0"
            title={filtersMinimized ? 'फिल्टर खोल्नुहोस् (Expand Filters)' : 'फिल्टर लुकाउनुहोस् (Minimize Filters)'}
          >
            {filtersMinimized ? (
              <>
                <span>Expand</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Minimize</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Expandable Filter Controls */}
        {!filtersMinimized && (
          <div className="p-2.5 sm:p-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-600">किसान स्थिति (Farmer Status):</span>
              {/* Status Filter Tabs: All, Active, Inactive */}
              <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`py-1 px-2.5 text-xs font-bold rounded-lg text-center transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({farmers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`py-1 px-2.5 text-xs font-bold rounded-lg text-center transition-all cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('inactive')}
                  className={`py-1 px-2.5 text-xs font-bold rounded-lg text-center transition-all cursor-pointer ${
                    statusFilter === 'inactive'
                      ? 'bg-slate-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Inactive ({inactiveCount})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading farmers…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No farmers found</p>
            {search && <p className="text-sm mt-1">Try a different search term.</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate (Rs./L)</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((farmer) => (
                <tr
                  key={farmer._id}
                  onClick={() => router.push(`/dashboard/records?farmerId=${farmer._id}&preset=30days`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200">
                      {farmer.farmerCode}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-900">
                    {farmer.name}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {farmer.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> {farmer.phone}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-700 font-medium">Rs. {farmer.defaultRate.toFixed(2)}</td>
                  <td className="px-5 py-3">
                    {farmer.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
                        <XCircle className="w-3 h-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/dashboard/records?farmerId=${farmer._id}&preset=30days`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        ३० दिन रेकर्ड
                      </button>
                      <button
                        onClick={() => openEdit(farmer)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(farmer)}
                        disabled={deletingId === farmer._id}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 cursor-pointer"
                        title="Delete"
                      >
                        {deletingId === farmer._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p>No farmers found</p>
          </div>
        ) : (
          filtered.map((farmer) => (
            <div
              key={farmer._id}
              onClick={() => router.push(`/dashboard/records?farmerId=${farmer._id}&preset=30days`)}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm active:bg-slate-50 transition cursor-pointer space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded border border-slate-200">
                    {farmer.farmerCode}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{farmer.name}</p>
                    {farmer.phone && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {farmer.phone}
                      </p>
                    )}
                  </div>
                </div>
                {farmer.isActive ? (
                  <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Active</span>
                ) : (
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">Inactive</span>
                )}
              </div>
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => router.push(`/dashboard/records?farmerId=${farmer._id}&preset=30days`)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-green-800 bg-green-50 hover:bg-green-100 active:bg-green-200 border border-green-200 rounded-xl transition min-h-[40px] cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-green-700" />
                  ३० दिनको रेकर्ड
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-slate-500 mr-0.5">Rs. {farmer.defaultRate.toFixed(2)}/L</span>
                  <button
                    onClick={() => openEdit(farmer)}
                    className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-xl transition min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer border border-blue-100"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(farmer)}
                    disabled={deletingId === farmer._id}
                    className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-xl disabled:opacity-50 transition min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer border border-red-100"
                    title="Delete"
                  >
                    {deletingId === farmer._id ? <Loader2 className="w-4 h-4 animate-spin text-red-600" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
