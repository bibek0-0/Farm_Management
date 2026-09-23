'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Filter,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  User,
  Check,
  ShoppingCart,
  Printer,
  Clock,
  ArrowRight,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import NepaliDatePicker from '@/components/NepaliDatePicker';
import {
  getTodayBS,
  formatNepaliDate,
  getCurrentBSMonth15DaysRange,
  getCurrentBSMonthFullRange,
} from '@/lib/nepaliDate';

interface IFarmer {
  _id: string;
  farmerCode: string;
  name: string;
  defaultRate: number;
}

interface IEntry {
  _id: string;
  date: string;
  shift: 'morning' | 'evening';
  farmerId: { _id: string; farmerCode: string; name: string } | string;
  quantity: number;
  rate: number;
  amount: number;
  fat?: number | null;
  snf?: number | null;
}

interface ISaleRecord {
  _id: string;
  buyerName: string;
  date: string;
  shift: 'morning' | 'evening';
  quantityLiters: number;
  ratePerLiter: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending';
  notes?: string;
  createdAt?: string;
}

function formatRs(amount: number) {
  return `Rs. ${(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string) {
  return formatNepaliDate(dateStr, 'devanagari');
}

const PAGE_SIZE = 20;

function RecordsContent() {
  const searchParams = useSearchParams();
  const farmerParam = searchParams.get('farmerId') || '';
  const presetParam = searchParams.get('preset') || '';
  const tabParam = searchParams.get('tab') || 'farmers';

  const today = getTodayBS();

  // Mode Switcher: 'farmers' (किसान दूध संकलन) vs 'buyers' (दूध बिक्री / ग्राहक हिसाब)
  const [activeTab, setActiveTab] = useState<'farmers' | 'buyers'>(
    tabParam === 'buyers' ? 'buyers' : 'farmers'
  );

  // ----------------------------------------------------
  // 1. FARMER COLLECTION RECORDS STATE
  // ----------------------------------------------------
  const [farmers, setFarmers] = useState<IFarmer[]>([]);
  const [entries, setEntries] = useState<IEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initial filter state from searchParams
  const getInitialValues = useCallback(() => {
    let p: 'today' | '15days' | '30days' | 'custom' = 'today';
    let s = today;
    let e = today;
    if (presetParam === '30days' || presetParam === 'month') {
      p = '30days';
      const range = getCurrentBSMonthFullRange();
      s = range.startDate;
      e = range.endDate;
    } else if (presetParam === '15days' || presetParam === 'week') {
      p = '15days';
      const range = getCurrentBSMonth15DaysRange();
      s = range.startDate;
      e = range.endDate;
    } else if (presetParam === 'custom') {
      p = 'custom';
    }
    return { preset: p, startDate: s, endDate: e, farmer: farmerParam };
  }, [presetParam, farmerParam, today]);

  const [preset, setPreset] = useState<'today' | '15days' | '30days' | 'custom'>(() => getInitialValues().preset);
  const [startDate, setStartDate] = useState(() => getInitialValues().startDate);
  const [endDate, setEndDate] = useState(() => getInitialValues().endDate);
  const [farmerFilter, setFarmerFilter] = useState(() => getInitialValues().farmer);
  const [shiftFilter, setShiftFilter] = useState<'all' | 'morning' | 'evening'>('all');
  const [farmerFiltersMinimized, setFarmerFiltersMinimized] = useState(false);
  const [buyerFiltersMinimized, setBuyerFiltersMinimized] = useState(false);

  // Searchable farmer filter state
  const [farmerSearchQuery, setFarmerSearchQuery] = useState('');
  const [isFarmerDropdownOpen, setIsFarmerDropdownOpen] = useState(false);
  const farmerDropdownRef = useRef<HTMLDivElement>(null);

  // Pagination for farmer entries
  const [page, setPage] = useState(1);

  // Farmer inline edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Farmer delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Print ref
  const printRef = useRef<HTMLDivElement>(null);

  // Close farmer typeahead dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (farmerDropdownRef.current && !farmerDropdownRef.current.contains(event.target as Node)) {
        setIsFarmerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reactively sync with searchParams on client-side router navigation
  useEffect(() => {
    const vals = getInitialValues();
    setFarmerFilter(vals.farmer);
    setPreset(vals.preset);
    setStartDate(vals.startDate);
    setEndDate(vals.endDate);
  }, [getInitialValues]);

  useEffect(() => {
    fetch('/api/farmers')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.farmers || [];
        setFarmers(list);
      })
      .catch((err) => console.error('Error fetching farmers in records:', err));
  }, []);

  const handleSelectPreset = (p: 'today' | '15days' | '30days' | 'custom') => {
    setPreset(p);
    if (p === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (p === '15days') {
      const range = getCurrentBSMonth15DaysRange();
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    } else if (p === '30days') {
      const range = getCurrentBSMonthFullRange();
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  };

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (shiftFilter !== 'all') params.set('shift', shiftFilter);
      if (farmerFilter) params.set('farmerId', farmerFilter);
      const res = await fetch(`/api/entries?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const list: IEntry[] = Array.isArray(data) ? data : data?.entries || [];
      setEntries(list);
      setPage(1);
    } catch {
      setError('Failed to load records.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, shiftFilter, farmerFilter]);

  useEffect(() => {
    if (activeTab === 'farmers') {
      fetchEntries();
    }
  }, [activeTab, fetchEntries]);

  const safeFarmers = Array.isArray(farmers) ? farmers : [];
  const safeEntries = Array.isArray(entries) ? entries : [];

  const sortedFarmers = [...safeFarmers].sort((a, b) => {
    const numA = parseInt(a.farmerCode.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.farmerCode.replace(/\D/g, ''), 10) || 0;
    return numA !== numB ? numA - numB : a.farmerCode.localeCompare(b.farmerCode);
  });

  const matchingFarmers = sortedFarmers.filter((f) => {
    if (!farmerSearchQuery.trim()) return true;
    const q = farmerSearchQuery.trim().toLowerCase();
    const digitsQ = q.replace(/\D/g, '');
    const digitsCode = f.farmerCode.replace(/\D/g, '');
    const codeMatch = f.farmerCode.toLowerCase().includes(q) || (digitsQ.length > 0 && digitsCode.includes(digitsQ));
    const nameMatch = f.name.toLowerCase().includes(q);
    return codeMatch || nameMatch;
  });

  const totalLiters = safeEntries.reduce((s, e) => s + (e.quantity ?? 0), 0);
  const totalAmount = safeEntries.reduce((s, e) => s + (e.amount ?? (e.quantity ?? 0) * (e.rate ?? 0)), 0);

  const totalPages = Math.ceil(safeEntries.length / PAGE_SIZE);
  const paged = safeEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const farmerOf = (e: IEntry) => {
    if (e.farmerId && typeof e.farmerId === 'object') return e.farmerId;
    return safeFarmers.find((f) => f._id === e.farmerId) || null;
  };

  const startEdit = (e: IEntry) => {
    setEditId(e._id);
    setEditQty(String(e.quantity));
    setEditRate(String(e.rate));
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  const saveEdit = async (id: string) => {
    setEditSaving(true);
    try {
      const qty = parseFloat(editQty);
      const rate = parseFloat(editRate);
      const res = await fetch(`/api/entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty, rate }),
      });
      if (!res.ok) throw new Error('Save failed');
      setEditId(null);
      await fetchEntries();
    } catch {
      alert('Failed to save changes.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to delete entry');
      }
      await fetchEntries();
    } catch {
      alert('Failed to delete entry. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const selectedFarmerEntries = farmerFilter
    ? safeEntries.filter((e) => {
        const f = farmerOf(e);
        return f ? f._id === farmerFilter : e.farmerId === farmerFilter;
      })
    : safeEntries;

  const selectedFarmerObj = safeFarmers.find((f) => f._id === farmerFilter);

  // ----------------------------------------------------
  // 2. MILK BUYER (DAILY & MONTHLY RENTAL) RECORDS STATE
  // ----------------------------------------------------
  const [buyerSales, setBuyerSales] = useState<ISaleRecord[]>([]);
  const [buyerNames, setBuyerNames] = useState<string[]>([]);
  const [loadingBuyerSales, setLoadingBuyerSales] = useState(false);
  const [buyerError, setBuyerError] = useState('');

  // Default to Full Month (३० दिन / महिनाभरि) for buyers as requested for monthly payers
  const [buyerPreset, setBuyerPreset] = useState<'today' | '30days' | 'custom'>('30days');
  const [buyerStartDate, setBuyerStartDate] = useState(() => getCurrentBSMonthFullRange().startDate);
  const [buyerEndDate, setBuyerEndDate] = useState(() => getCurrentBSMonthFullRange().endDate);
  const [buyerFilter, setBuyerFilter] = useState('');
  const [buyerShiftFilter, setBuyerShiftFilter] = useState<'all' | 'morning' | 'evening'>('all');
  const [buyerStatusFilter, setBuyerStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  // Search & typeahead for buyers
  const [buyerSearchQuery, setBuyerSearchQuery] = useState('');
  const [isBuyerDropdownOpen, setIsBuyerDropdownOpen] = useState(false);
  const buyerDropdownRef = useRef<HTMLDivElement>(null);

  // Pagination for buyer sales
  const [buyerPage, setBuyerPage] = useState(1);
  const BUYER_PAGE_SIZE = 25;

  // Inline edit for buyer sale
  const [editSaleId, setEditSaleId] = useState<string | null>(null);
  const [editSaleQty, setEditSaleQty] = useState('');
  const [editSaleRate, setEditSaleRate] = useState('');
  const [editSaleSaving, setEditSaleSaving] = useState(false);

  // Buyer actions
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [togglingSaleId, setTogglingSaleId] = useState<string | null>(null);
  const [markingAllPaid, setMarkingAllPaid] = useState(false);

  // Close buyer dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (buyerDropdownRef.current && !buyerDropdownRef.current.contains(event.target as Node)) {
        setIsBuyerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBuyerPreset = (p: 'today' | '30days' | 'custom') => {
    setBuyerPreset(p);
    if (p === 'today') {
      setBuyerStartDate(today);
      setBuyerEndDate(today);
    } else if (p === '30days') {
      const range = getCurrentBSMonthFullRange();
      setBuyerStartDate(range.startDate);
      setBuyerEndDate(range.endDate);
    }
  };

  const fetchBuyerSales = useCallback(async () => {
    setLoadingBuyerSales(true);
    setBuyerError('');
    try {
      const params = new URLSearchParams({
        startDate: buyerStartDate,
        endDate: buyerEndDate,
      });
      if (buyerShiftFilter !== 'all') params.set('shift', buyerShiftFilter);
      if (buyerFilter) params.set('buyerName', buyerFilter);
      if (buyerStatusFilter !== 'all') params.set('paymentStatus', buyerStatusFilter);

      const res = await fetch(`/api/sales?${params}`);
      if (!res.ok) throw new Error('Failed to load buyer records');
      const data = await res.json();
      setBuyerSales(data.sales || []);
      if (Array.isArray(data.buyerNames)) {
        setBuyerNames(data.buyerNames);
      }
      setBuyerPage(1);
    } catch {
      setBuyerError('Failed to load milk sales records.');
    } finally {
      setLoadingBuyerSales(false);
    }
  }, [buyerStartDate, buyerEndDate, buyerShiftFilter, buyerFilter, buyerStatusFilter]);

  useEffect(() => {
    if (activeTab === 'buyers') {
      fetchBuyerSales();
    }
  }, [activeTab, fetchBuyerSales]);

  // Buyer calculations & aggregates
  const totalBuyerLiters = buyerSales.reduce((s, b) => s + (b.quantityLiters || 0), 0);
  const totalBuyerAmount = buyerSales.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const totalBuyerPaid = buyerSales
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((s, b) => s + (b.totalAmount || 0), 0);
  const totalBuyerPending = buyerSales
    .filter((b) => b.paymentStatus === 'pending')
    .reduce((s, b) => s + (b.totalAmount || 0), 0);

  const pendingBuyerEntries = buyerSales.filter((b) => b.paymentStatus === 'pending');

  // Customer Grouped Summary (for monthly balance settlement overview)
  const buyerSummaryList = useMemo(() => {
    const map: Record<
      string,
      {
        buyerName: string;
        totalLiters: number;
        totalAmount: number;
        paidAmount: number;
        pendingAmount: number;
        count: number;
      }
    > = {};

    buyerSales.forEach((s) => {
      const name = s.buyerName?.trim() || 'ग्राहक';
      if (!map[name]) {
        map[name] = {
          buyerName: name,
          totalLiters: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          count: 0,
        };
      }
      map[name].totalLiters += s.quantityLiters || 0;
      map[name].totalAmount += s.totalAmount || 0;
      if (s.paymentStatus === 'paid') {
        map[name].paidAmount += s.totalAmount || 0;
      } else {
        map[name].pendingAmount += s.totalAmount || 0;
      }
      map[name].count += 1;
    });

    return Object.values(map).sort(
      (a, b) => b.pendingAmount - a.pendingAmount || b.totalAmount - a.totalAmount
    );
  }, [buyerSales]);

  const matchingBuyerNames = buyerNames.filter((name) => {
    if (!buyerSearchQuery.trim()) return true;
    return name.toLowerCase().includes(buyerSearchQuery.trim().toLowerCase());
  });

  const totalBuyerPages = Math.ceil(buyerSales.length / BUYER_PAGE_SIZE);
  const pagedBuyerSales = buyerSales.slice((buyerPage - 1) * BUYER_PAGE_SIZE, buyerPage * BUYER_PAGE_SIZE);

  // 1-click status toggle for a sale record
  const handleToggleSalePaymentStatus = async (sale: ISaleRecord) => {
    setTogglingSaleId(sale._id);
    const nextStatus = sale.paymentStatus === 'paid' ? 'pending' : 'paid';
    try {
      const res = await fetch(`/api/sales/${sale._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: nextStatus }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      setBuyerSales((prev) =>
        prev.map((s) => (s._id === sale._id ? { ...s, paymentStatus: nextStatus } : s))
      );
    } catch {
      alert('भुक्तानी स्थिति परिवर्तन गर्न सकिएन');
    } finally {
      setTogglingSaleId(null);
    }
  };

  // Mark all pending sales for current filtered buyer as paid
  const handleMarkAllBuyerPaid = async () => {
    const pendingIds = pendingBuyerEntries.map((b) => b._id);
    if (pendingIds.length === 0) return;

    const confirmMsg = buyerFilter
      ? `के तपाईं '${buyerFilter}' को यो अवधिका सबै ${pendingIds.length} वटा बाँकी बिक्रीलाई 'चुक्ता' बनाउन चाहनुहुन्छ?`
      : `के तपाईं यो अवधिका सबै ${pendingIds.length} वटा बाँकी बिक्रीलाई 'चुक्ता' बनाउन चाहनुहुन्छ?`;

    if (!window.confirm(confirmMsg)) return;

    setMarkingAllPaid(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: pendingIds, paymentStatus: 'paid' }),
      });
      if (!res.ok) throw new Error('Bulk pay failed');
      setBuyerSales((prev) =>
        prev.map((s) => (pendingIds.includes(s._id) ? { ...s, paymentStatus: 'paid' } : s))
      );
    } catch {
      alert('सबै चुक्ता गर्न सकिएन। पुनः प्रयास गर्नुहोस्।');
    } finally {
      setMarkingAllPaid(false);
    }
  };

  // Inline edit for buyer sales
  const startEditSale = (s: ISaleRecord) => {
    setEditSaleId(s._id);
    setEditSaleQty(String(s.quantityLiters));
    setEditSaleRate(String(s.ratePerLiter));
  };

  const cancelEditSale = () => {
    setEditSaleId(null);
  };

  const saveEditSale = async (id: string) => {
    setEditSaleSaving(true);
    try {
      const qty = parseFloat(editSaleQty);
      const rate = parseFloat(editSaleRate);
      if (isNaN(qty) || qty <= 0 || isNaN(rate) || rate < 0) {
        alert('कृपया परिमाण र दर सही प्रविष्ट गर्नुहोस्');
        return;
      }
      const res = await fetch(`/api/sales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantityLiters: qty, ratePerLiter: rate }),
      });
      if (!res.ok) throw new Error('Failed to update sale');
      const data = await res.json();
      setBuyerSales((prev) => prev.map((s) => (s._id === id ? data.sale : s)));
      setEditSaleId(null);
    } catch {
      alert('सच्याउन सकिएन।');
    } finally {
      setEditSaleSaving(false);
    }
  };

  // Delete buyer sale
  const handleDeleteSale = async (id: string) => {
    if (!window.confirm('यो बिक्री रेकर्ड मेटाउन निश्चित हुनुहुन्छ? यो पूर्ववत गर्न सकिँदैन।')) return;
    setDeletingSaleId(id);
    try {
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setBuyerSales((prev) => prev.filter((s) => s._id !== id));
    } catch {
      alert('मेटाउन सकिएन।');
    } finally {
      setDeletingSaleId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 max-w-6xl">
      {/* ======================================================= */}
      {/* PRINT-ONLY PAYMENT SLIP FOR FARMERS */}
      {/* ======================================================= */}
      {activeTab === 'farmers' && (
        <div className="print-only" ref={printRef}>
          <div style={{ fontFamily: 'serif', padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Lawanyabati Krishi Farm</h1>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>Payment Slip</p>
              {selectedFarmerObj && (
                <p style={{ margin: '4px 0', fontSize: '13px' }}>
                  Farmer: <strong>{selectedFarmerObj.name}</strong> (Code: {selectedFarmerObj.farmerCode})
                </p>
              )}
              <p style={{ margin: '4px 0', fontSize: '12px', color: '#555' }}>
                Period: {formatDate(startDate)} – {formatDate(endDate)}
              </p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Shift</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Qty (L)</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Rate</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedFarmerEntries.map((e) => (
                  <tr key={e._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px 8px' }}>{formatDate(e.date)}</td>
                    <td style={{ padding: '4px 8px', textTransform: 'capitalize' }}>{e.shift}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{e.quantity.toFixed(2)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>Rs. {e.rate.toFixed(2)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{formatRs(e.amount ?? e.quantity * e.rate)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ padding: '6px 8px' }}>Total</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                    {selectedFarmerEntries.reduce((s, e) => s + e.quantity, 0).toFixed(2)} L
                  </td>
                  <td />
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                    {formatRs(selectedFarmerEntries.reduce((s, e) => s + (e.amount ?? e.quantity * e.rate), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <div>Farmer Signature: _______________</div>
              <div>Authorized by: _______________</div>
            </div>
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#888' }}>
              Printed on {new Date().toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* PRINT-ONLY MONTHLY CUSTOMER STATEMENT BILL FOR BUYERS */}
      {/* ======================================================= */}
      {activeTab === 'buyers' && (
        <div className="print-only">
          <div style={{ fontFamily: 'serif', padding: '24px', maxWidth: '700px', margin: '0 auto', color: '#111' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>लावन्यवती कृषि फर्म</h1>
              <p style={{ margin: '4px 0', fontSize: '14px', fontWeight: '600' }}>मासिक दूध बिक्री हिसाब बिल (Customer Statement)</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '13px', borderTop: '1px dashed #ccc', paddingTop: '8px' }}>
                <div>
                  ग्राहक / डेरी: <strong>{buyerFilter || 'सबै ग्राहक'}</strong>
                </div>
                <div>
                  अवधि: <strong>{formatDate(buyerStartDate)} देखि {formatDate(buyerEndDate)}</strong>
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #000', background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'center', padding: '6px 8px', width: '35px' }}>क्र.सं.</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>मिति</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>शिफ्ट</th>
                  {!buyerFilter && <th style={{ textAlign: 'left', padding: '6px 8px' }}>ग्राहक</th>}
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>परिमाण (L)</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>दर (Rs.)</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>जम्मा (Rs.)</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px' }}>भुक्तानी</th>
                </tr>
              </thead>
              <tbody>
                {buyerSales.map((s, idx) => (
                  <tr key={s._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 8px' }}>{formatDate(s.date)}</td>
                    <td style={{ padding: '6px 8px' }}>{s.shift === 'morning' ? 'बिहान' : 'बेलुका'}</td>
                    {!buyerFilter && <td style={{ padding: '6px 8px' }}>{s.buyerName}</td>}
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{s.quantityLiters.toFixed(1)} L</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>Rs. {s.ratePerLiter.toFixed(2)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatRs(s.totalAmount)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '11px' }}>
                      {s.paymentStatus === 'paid' ? 'चुक्ता' : 'बाँकी'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold', background: '#fafafa' }}>
                  <td colSpan={buyerFilter ? 3 : 4} style={{ padding: '8px' }}>जम्मा (Grand Total)</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{totalBuyerLiters.toFixed(1)} L</td>
                  <td />
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '14px' }}>{formatRs(totalBuyerAmount)}</td>
                  <td />
                </tr>
                <tr style={{ fontWeight: 'bold', fontSize: '13px' }}>
                  <td colSpan={buyerFilter ? 5 : 6} style={{ padding: '4px 8px', textAlign: 'right' }}>चुक्ता रकम (Total Paid):</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', color: '#16a34a' }}>{formatRs(totalBuyerPaid)}</td>
                  <td />
                </tr>
                <tr style={{ fontWeight: 'bold', fontSize: '14px', borderTop: '1px solid #ddd' }}>
                  <td colSpan={buyerFilter ? 5 : 6} style={{ padding: '6px 8px', textAlign: 'right' }}>बाँकी भुक्तानी रकम (Balance Due):</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: totalBuyerPending > 0 ? '#dc2626' : '#16a34a' }}>
                    {formatRs(totalBuyerPending)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>

            <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <div>ग्राहकको हस्ताक्षर: ___________________</div>
              <div>डेरी / प्रशासक हस्ताक्षर: ___________________</div>
            </div>
            <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: '#888' }}>
              लावन्यवती कृषि फर्म • बिल प्रिन्ट मिति: {formatDate(today)}
            </p>
          </div>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="no-print">
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('farmers')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'farmers'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>किसान संकलन (Farmers)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('buyers')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'buyers'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>दूध बिक्री / ग्राहक हिसाब (Buyers)</span>
          </button>
        </div>
      </div>

      {/* ======================================================= */}
      {/* TAB 1: FARMER MILK COLLECTION RECORDS */}
      {/* ======================================================= */}
      {activeTab === 'farmers' && (
        <>
          {/* Filters (Collapsible / Minimizable) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden no-print">
            {/* Filter Header with Summary and Minimize Toggle */}
            <div className="flex items-center justify-between p-3 sm:px-4 bg-slate-50/80 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>फिल्टर (Filters)</span>
                </div>
                {/* Active filter summary tags */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                    {preset === 'today' ? 'आज (Today)' : preset === '15days' ? '१५ दिन (15d)' : preset === '30days' ? '३० दिन (30d)' : `${startDate} देखि ${endDate}`}
                  </span>
                  <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md truncate max-w-[130px]">
                    {selectedFarmerObj ? selectedFarmerObj.name : 'सबै किसान'}
                  </span>
                  <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                    {shiftFilter === 'all' ? 'सबै शिफ्ट' : shiftFilter === 'morning' ? 'बिहान' : 'बेलुका'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFarmerFiltersMinimized((prev) => !prev)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer flex-shrink-0"
                title={farmerFiltersMinimized ? 'फिल्टर खोल्नुहोस् (Expand Filters)' : 'फिल्टर लुकाउनुहोस् (Minimize Filters)'}
              >
                {farmerFiltersMinimized ? (
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

            {/* Expandable Filter Body */}
            {!farmerFiltersMinimized && (
              <div className="p-3 sm:p-4">
                <div className="flex flex-wrap gap-3">
                  {/* Presets */}
                  <div className="flex rounded-xl overflow-hidden border border-slate-200">
                    {(['today', '15days', '30days', 'custom'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => handleSelectPreset(p)}
                        className={`px-3 py-1.5 text-xs font-semibold capitalize border-r border-slate-200 last:border-0 transition-colors cursor-pointer ${
                          preset === p ? 'bg-green-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p === 'today' ? 'आज (Today)' : p === '15days' ? '१५ दिन (15d)' : p === '30days' ? '३० दिन (30d)' : 'कस्टम (Custom)'}
                      </button>
                    ))}
                  </div>

                  {/* Custom date range with Nepali BS Date Pickers */}
                  {preset === 'custom' && (
                    <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <NepaliDatePicker label="सुरु मिति (From)" value={startDate} onChange={setStartDate} />
                      <NepaliDatePicker label="अन्त्य मिति (To)" value={endDate} onChange={setEndDate} />
                    </div>
                  )}

                  {/* Searchable Farmer Selector */}
                  {farmerFilter ? (
                    <div className="flex items-center gap-1.5 bg-green-50 border border-green-300 text-green-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-xs">
                      <User className="w-3.5 h-3.5 text-green-700 flex-shrink-0" />
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-green-200 text-green-900 font-bold">
                        {selectedFarmerObj?.farmerCode ?? 'Farmer'}
                      </span>
                      <span className="truncate max-w-[120px] sm:max-w-[180px] text-green-950 font-bold">
                        {selectedFarmerObj?.name ?? 'Selected'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFarmerFilter('');
                          setFarmerSearchQuery('');
                        }}
                        className="p-1 hover:bg-green-200 rounded-md text-green-900 transition ml-0.5 cursor-pointer"
                        title="Clear farmer filter"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative min-w-[200px]" ref={farmerDropdownRef}>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="खोज्नुहोस् वा छान्नुहोस्..."
                          value={farmerSearchQuery}
                          onChange={(e) => {
                            setFarmerSearchQuery(e.target.value);
                            setIsFarmerDropdownOpen(true);
                          }}
                          onFocus={() => setIsFarmerDropdownOpen(true)}
                          className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 shadow-xs"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        {farmerSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setFarmerSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {isFarmerDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-72 max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 divide-y divide-slate-100 animate-in fade-in-50 zoom-in-95">
                          <button
                            type="button"
                            onClick={() => {
                              setFarmerFilter('');
                              setFarmerSearchQuery('');
                              setIsFarmerDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                          >
                            <span>सबै किसान (All Farmers)</span>
                            {!farmerFilter && <Check className="w-3.5 h-3.5 text-green-600" />}
                          </button>

                          {matchingFarmers.length === 0 ? (
                            <div className="px-3 py-3 text-center text-xs text-slate-400">
                              कुनै किसान भेटिएन (No farmers found)
                            </div>
                          ) : (
                            matchingFarmers.map((f) => (
                              <button
                                key={f._id}
                                type="button"
                                onClick={() => {
                                  setFarmerFilter(f._id);
                                  setFarmerSearchQuery('');
                                  setIsFarmerDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-green-50/80 flex items-center justify-between transition-colors"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="font-mono font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded text-[11px]">
                                    {f.farmerCode}
                                  </span>
                                  <span className="font-bold text-slate-900 truncate">{f.name}</span>
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono flex-shrink-0 ml-2">
                                  Rs. {f.defaultRate}/L
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Shift */}
                  <div className="flex rounded-xl overflow-hidden border border-slate-200">
                    {(['all', 'morning', 'evening'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setShiftFilter(s)}
                        className={`px-3 py-1.5 text-xs font-semibold capitalize border-r border-slate-200 last:border-0 transition-colors cursor-pointer ${
                          shiftFilter === s ? 'bg-green-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {s === 'all' ? 'सबै' : s === 'morning' ? 'बिहान' : 'बेलुका'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">कुल परिमाण (Total Liters)</p>
              <p className="text-2xl font-bold text-green-600 mt-1 font-mono">{totalLiters.toFixed(1)} L</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">कुल रकम (Total Amount)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{formatRs(totalAmount)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">औसत दर (Avg Rate)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {totalLiters > 0 ? `Rs. ${(totalAmount / totalLiters).toFixed(2)}` : '—'}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">कुल इन्ट्री (Entries)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{safeEntries.length}</p>
            </div>
          </div>

          {/* Table / Error */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden no-print">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">लोड हुँदैछ...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                <p className="font-medium text-sm">{error}</p>
              </div>
            ) : safeEntries.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm">कुनै अभिलेख फेला परेन।</p>
              </div>
            ) : (
              <>
                {/* Mobile Entry Cards (< md) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {paged.map((entry) => {
                    const farmer = farmerOf(entry);
                    const isEditing = editId === entry._id;
                    return (
                      <div
                        key={`mob-entry-${entry._id}`}
                        className="p-3.5 sm:p-4 space-y-2.5 bg-white hover:bg-slate-50/50 transition-colors"
                      >
                        {/* Header: Code + Name, Shift */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200">
                              {farmer?.farmerCode ?? '—'}
                            </span>
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {farmer?.name ?? '—'}
                            </span>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${
                              entry.shift === 'morning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {entry.shift === 'morning' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                            {entry.shift === 'morning' ? 'बिहान' : 'बेलुका'}
                          </span>
                        </div>

                        {/* Date & Rate */}
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{formatDate(entry.date)}</span>
                          <span className="font-mono font-semibold text-slate-700">
                            दर: Rs. {entry.rate.toFixed(2)}/L
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  परिमाण (L)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editQty}
                                  onChange={(e) => setEditQty(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  दर (Rs/L)
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={editRate}
                                  onChange={(e) => setEditRate(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold bg-white"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg min-h-[40px] cursor-pointer"
                              >
                                रद्द गर्नुहोस्
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEdit(entry._id)}
                                disabled={editSaving}
                                className="px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-1.5 min-h-[40px] cursor-pointer"
                              >
                                {editSaving ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Save className="w-3.5 h-3.5" />
                                )}
                                <span>सुरक्षित</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div>
                              <span className="text-xs text-slate-400">जम्मा: </span>
                              <span className="font-mono font-black text-sm text-green-700">
                                {formatRs(entry.amount ?? entry.quantity * entry.rate)}
                              </span>
                              <span className="text-xs font-mono text-slate-500 ml-1.5 font-bold">
                                ({entry.quantity.toFixed(1)} L)
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEdit(entry)}
                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-xl transition min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer border border-slate-200 sm:border-transparent"
                                title="Edit entry"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(entry._id)}
                                disabled={deletingId === entry._id}
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl transition disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer border border-slate-200 sm:border-transparent"
                                title="Delete entry"
                              >
                                {deletingId === entry._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">मिति (Date)</th>
                        <th className="py-3 px-4">शिफ्ट</th>
                        <th className="py-3 px-4">किसान (Farmer)</th>
                        <th className="py-3 px-4 text-right">परिमाण (L)</th>
                        <th className="py-3 px-4 text-right">दर (Rate)</th>
                        <th className="py-3 px-4 text-right">जम्मा (Amount)</th>
                        <th className="py-3 px-4 text-right">कार्य</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paged.map((entry) => {
                        const farmer = farmerOf(entry);
                        const isEditing = editId === entry._id;
                        return (
                          <tr key={entry._id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {formatDate(entry.date)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                  entry.shift === 'morning'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {entry.shift === 'morning' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                                {entry.shift === 'morning' ? 'बिहान' : 'बेलुका'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-1.5 font-bold">
                                {farmer?.farmerCode ?? '—'}
                              </span>
                              <span className="font-medium text-slate-900">{farmer?.name ?? '—'}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editQty}
                                  onChange={(e) => setEditQty(e.target.value)}
                                  className="w-20 px-2 py-1 text-right border border-slate-300 rounded text-sm font-mono"
                                />
                              ) : (
                                `${entry.quantity.toFixed(1)} L`
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.5"
                                  value={editRate}
                                  onChange={(e) => setEditRate(e.target.value)}
                                  className="w-20 px-2 py-1 text-right border border-slate-300 rounded text-sm font-mono"
                                />
                              ) : (
                                `Rs. ${entry.rate.toFixed(2)}`
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-green-700">
                              {formatRs(entry.amount ?? entry.quantity * entry.rate)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => saveEdit(entry._id)}
                                    disabled={editSaving}
                                    className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition"
                                  >
                                    {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                  </button>
                                  <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => startEdit(entry)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    title="Edit entry"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(entry._id)}
                                    disabled={deletingId === entry._id}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                    title="Delete entry"
                                  >
                                    {deletingId === entry._id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Farmer Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, entries.length)} of {entries.length}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg disabled:opacity-40 transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-3 py-1 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg">
                        {page} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg disabled:opacity-40 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ======================================================= */}
      {/* TAB 2: MILK BUYER (DAILY & MONTHLY RENTAL) RECORDS */}
      {/* ======================================================= */}
      {activeTab === 'buyers' && (
        <>
          {/* Buyer Filters */}
          {/* Buyer Filters (Collapsible / Minimizable) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden no-print">
            {/* Header with summary and minimize toggle */}
            <div className="flex items-center justify-between p-3 sm:px-4 bg-slate-50/80 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  <span>बिक्री तथा ग्राहक फिल्टर (Filters)</span>
                </div>
                {/* Active filter summary tags */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                    {buyerPreset === 'today' ? 'आज (Today)' : buyerPreset === '30days' ? 'महिनाभरि (Month)' : `${buyerStartDate} देखि ${buyerEndDate}`}
                  </span>
                  <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md truncate max-w-[130px]">
                    {buyerFilter || 'सबै ग्राहक'}
                  </span>
                  <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                    {buyerShiftFilter === 'all' ? 'सबै शिफ्ट' : buyerShiftFilter === 'morning' ? 'बिहान' : 'बेलुका'}
                  </span>
                  <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                    {buyerStatusFilter === 'all' ? 'सबै स्थिति' : buyerStatusFilter === 'pending' ? 'बाँकी' : 'चुक्ता'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {buyerFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setBuyerFilter('');
                      setBuyerSearchQuery('');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>सबै ग्राहक</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setBuyerFiltersMinimized((prev) => !prev)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title={buyerFiltersMinimized ? 'फिल्टर खोल्नुहोस् (Expand Filters)' : 'फिल्टर लुकाउनुहोस् (Minimize Filters)'}
                >
                  {buyerFiltersMinimized ? (
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
            </div>

            {/* Expandable Filter Controls */}
            {!buyerFiltersMinimized && (
              <div className="p-3 sm:p-4 space-y-3">
                <div className="flex flex-wrap gap-2.5 items-center">
                  {/* Presets - Defaults to 30 days for monthly settlement */}
                  <div className="flex rounded-xl overflow-hidden border border-slate-200">
                    {(['today', '30days', 'custom'] as const).map((p) => (
                      <button
                        key={`buyer-p-${p}`}
                        type="button"
                        onClick={() => handleSelectBuyerPreset(p)}
                        className={`px-3 py-1.5 text-xs font-semibold capitalize border-r border-slate-200 last:border-0 transition-colors cursor-pointer ${
                          buyerPreset === p ? 'bg-blue-600 text-white shadow-2xs' : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p === 'today'
                          ? 'आज (Today)'
                          : p === '30days'
                          ? 'महिनाभरि (Month)'
                          : 'कस्टम (Custom)'}
                      </button>
                    ))}
                  </div>

                  {/* Custom Date Range */}
                  {buyerPreset === 'custom' && (
                    <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                      <NepaliDatePicker label="सुरु (From)" value={buyerStartDate} onChange={setBuyerStartDate} compact />
                      <NepaliDatePicker label="अन्त्य (To)" value={buyerEndDate} onChange={setBuyerEndDate} compact />
                    </div>
                  )}

                  {/* Searchable / Selectable Buyer Selector */}
                  {buyerFilter ? (
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-300 text-blue-900 rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-2xs">
                      <ShoppingCart className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span className="font-bold">{buyerFilter}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setBuyerFilter('');
                          setBuyerSearchQuery('');
                        }}
                        className="p-0.5 hover:bg-blue-200 rounded text-blue-900 transition ml-0.5"
                        title="Remove customer filter"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative min-w-[200px]" ref={buyerDropdownRef}>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="ग्राहक / डेरी छान्नुहोस्..."
                          value={buyerSearchQuery}
                          onChange={(e) => {
                            setBuyerSearchQuery(e.target.value);
                            setIsBuyerDropdownOpen(true);
                          }}
                          onFocus={() => setIsBuyerDropdownOpen(true)}
                          className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        {buyerSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setBuyerSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {isBuyerDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-64 max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 divide-y divide-slate-100 animate-in fade-in-50 zoom-in-95">
                          <button
                            type="button"
                            onClick={() => {
                              setBuyerFilter('');
                              setBuyerSearchQuery('');
                              setIsBuyerDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                          >
                            <span>सबै ग्राहक (All Buyers)</span>
                            {!buyerFilter && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </button>

                          {matchingBuyerNames.length === 0 ? (
                            <div className="px-3 py-3 text-center text-xs text-slate-400">
                              कुनै ग्राहक भेटिएन (No buyers found)
                            </div>
                          ) : (
                            matchingBuyerNames.map((name) => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => {
                                  setBuyerFilter(name);
                                  setBuyerSearchQuery('');
                                  setIsBuyerDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50/80 flex items-center justify-between transition-colors"
                              >
                                <span className="font-bold text-slate-900 truncate">{name}</span>
                                {buyerFilter === name && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Shift Filter */}
                  <div className="flex rounded-xl overflow-hidden border border-slate-200">
                    {(['all', 'morning', 'evening'] as const).map((s) => (
                      <button
                        key={`buyer-shift-${s}`}
                        type="button"
                        onClick={() => setBuyerShiftFilter(s)}
                        className={`px-3 py-1.5 text-xs font-semibold capitalize border-r border-slate-200 last:border-0 transition-colors cursor-pointer ${
                          buyerShiftFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {s === 'all' ? 'सबै शिफ्ट' : s === 'morning' ? 'बिहान' : 'बेलुका'}
                      </button>
                    ))}
                  </div>

                  {/* Payment Status Filter */}
                  <div className="flex rounded-xl overflow-hidden border border-slate-200">
                    {(['all', 'pending', 'paid'] as const).map((status) => (
                      <button
                        key={`buyer-status-${status}`}
                        type="button"
                        onClick={() => setBuyerStatusFilter(status)}
                        className={`px-3 py-1.5 text-xs font-semibold capitalize border-r border-slate-200 last:border-0 transition-colors cursor-pointer ${
                          buyerStatusFilter === status
                            ? status === 'pending'
                              ? 'bg-amber-500 text-amber-950 font-black'
                              : 'bg-blue-600 text-white font-bold'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {status === 'all' ? 'सबै स्थिति' : status === 'pending' ? 'बाँकी (Pending)' : 'चुक्ता (Paid)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Monthly Aggregates Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">जम्मा बिक्री दूध (Total Sold)</p>
              <p className="text-2xl font-bold text-blue-600 mt-1 font-mono">
                {totalBuyerLiters.toFixed(1)} <span className="text-xs font-normal text-slate-400">L</span>
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">जम्मा बिल रकम (Total Billing)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{formatRs(totalBuyerAmount)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">चुक्ता रकम (Total Paid)</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1 font-mono">{formatRs(totalBuyerPaid)}</p>
            </div>
            <div
              className={`rounded-2xl border p-4 shadow-sm transition-all ${
                totalBuyerPending > 0
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-600">बाँकी रकम (Pending Balance)</p>
                {totalBuyerPending > 0 && <Clock className="w-3.5 h-3.5 text-amber-600" />}
              </div>
              <p
                className={`text-2xl font-bold mt-1 font-mono ${
                  totalBuyerPending > 0 ? 'text-amber-800' : 'text-slate-400'
                }`}
              >
                {formatRs(totalBuyerPending)}
              </p>
            </div>
          </div>

          {/* Customer Specific Action Bar (When a buyer is selected) */}
          {buyerFilter && (
            <div className="bg-blue-50/70 border border-blue-200 p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-blue-950">{buyerFilter} को हिसाब विवरण</h3>
                  <p className="text-xs text-blue-700">
                    अवधि: {formatDate(buyerStartDate)} देखि {formatDate(buyerEndDate)} सम्म
                    {totalBuyerPending > 0 && (
                      <span className="ml-1 text-amber-800 font-bold">
                        (बाँकी बक्यौता: {formatRs(totalBuyerPending)})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* 1-Click Mark All Paid Button */}
                {pendingBuyerEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllBuyerPaid}
                    disabled={markingAllPaid}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {markingAllPaid ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                    <span>सबै चुक्ता चिन्ह लगाउनुहोस् (Mark Month Paid)</span>
                  </button>
                )}

                {/* Print Customer Monthly Statement Button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
                  title="Print customer statement slip"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>ग्राहक बिल प्रिन्ट (Print Bill Slip)</span>
                </button>
              </div>
            </div>
          )}

          {/* Grouped Customer Balance Overview Table (Shown when ALL BUYERS are selected) */}
          {!buyerFilter && buyerSummaryList.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 no-print space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    ग्राहकगत मासिक हिसाब सारांश (Customer Monthly Ledger)
                  </h3>
                  <p className="text-xs text-slate-500">
                    छानिएको अवधिमा नियमित दूध किन्ने प्रत्येक ग्राहकको कुल परिमाण र बाँकी रकम
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {buyerSummaryList.length} ग्राहकहरू
                </span>
              </div>

              {/* Mobile Buyer Summary Cards (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {buyerSummaryList.map((item) => (
                  <div key={`mob-summary-${item.buyerName}`} className="py-3 px-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{item.buyerName}</span>
                      <span className="text-xs font-mono text-slate-500">{item.count} पटक</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-blue-900">{item.totalLiters.toFixed(1)} L</span>
                      <span className="font-mono text-slate-700">कुल: {formatRs(item.totalAmount)}</span>
                      {item.pendingAmount > 0 ? (
                        <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                          बाँकी: {formatRs(item.pendingAmount)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold">चुक्ता</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setBuyerFilter(item.buyerName)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 active:bg-blue-100 rounded-xl transition min-h-[40px] cursor-pointer"
                    >
                      <span>हिसाब हेर्नुहोस्</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                      <th className="py-2.5 px-3">ग्राहक / डेरी</th>
                      <th className="py-2.5 px-3 text-center">पटक</th>
                      <th className="py-2.5 px-3 text-right">जम्मा दूध (L)</th>
                      <th className="py-2.5 px-3 text-right">कुल रकम</th>
                      <th className="py-2.5 px-3 text-right">चुक्ता</th>
                      <th className="py-2.5 px-3 text-right">बाँकी बक्यौता (Due)</th>
                      <th className="py-2.5 px-3 text-center">विवरण</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {buyerSummaryList.map((item) => (
                      <tr key={item.buyerName} className="hover:bg-blue-50/40 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {item.buyerName}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                          {item.count}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                          {item.totalLiters.toFixed(1)} L
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatRs(item.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                          {formatRs(item.paidAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black">
                          {item.pendingAmount > 0 ? (
                            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-bold">
                              {formatRs(item.pendingAmount)}
                            </span>
                          ) : (
                            <span className="text-emerald-700 text-xs font-bold">०.००</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setBuyerFilter(item.buyerName)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                          >
                            <span>हिसाब हेर्नुहोस्</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/80 border-t-2 border-slate-200 font-bold text-slate-900">
                      <td className="py-2.5 px-3 font-bold">कुल जम्मा (Total)</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">{buyerSales.length}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900">
                        {totalBuyerLiters.toFixed(1)} L
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black">{formatRs(totalBuyerAmount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                        {formatRs(totalBuyerPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-800">
                        {formatRs(totalBuyerPending)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Transactions List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden no-print">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  {buyerFilter ? `${buyerFilter} को बिक्री रेकर्ड सूची` : 'सबै बिक्री रेकर्ड सूची (Sales Transactions)'}
                </h3>
                <p className="text-xs text-slate-500">
                  प्रति शिफ्ट बिक्री विवरण र १-क्लिक भुक्तानी चुक्ता स्थिति
                </p>
              </div>

              {buyerFilter && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>प्रिन्ट</span>
                </button>
              )}
            </div>

            {loadingBuyerSales ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">लोड हुँदैछ...</p>
              </div>
            ) : buyerError ? (
              <div className="p-8 text-center text-red-600">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                <p className="font-medium text-sm">{buyerError}</p>
              </div>
            ) : buyerSales.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm">कुनै बिक्री रेकर्ड फेला परेन।</p>
              </div>
            ) : (
              <>
                {/* Mobile Buyer Sales Cards (< md) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {pagedBuyerSales.map((sale) => {
                    const isEditing = editSaleId === sale._id;
                    return (
                      <div
                        key={`mob-sale-${sale._id}`}
                        className="p-3.5 sm:p-4 space-y-2.5 bg-white hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {sale.buyerName}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${
                              sale.shift === 'morning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {sale.shift === 'morning' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                            {sale.shift === 'morning' ? 'बिहान' : 'बेलुका'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{formatDate(sale.date)}</span>
                          <span className="font-mono font-semibold text-slate-700">
                            दर: Rs. {sale.ratePerLiter.toFixed(2)}/L
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  परिमाण (L)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editSaleQty}
                                  onChange={(e) => setEditSaleQty(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  दर (Rs/L)
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={editSaleRate}
                                  onChange={(e) => setEditSaleRate(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold bg-white"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={cancelEditSale}
                                className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg min-h-[40px] cursor-pointer"
                              >
                                रद्द गर्नुहोस्
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEditSale(sale._id)}
                                disabled={editSaleSaving}
                                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 min-h-[40px] cursor-pointer"
                              >
                                {editSaleSaving ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Save className="w-3.5 h-3.5" />
                                )}
                                <span>सुरक्षित</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                              <div>
                                <span className="font-mono font-black text-sm text-slate-900">
                                  {formatRs(sale.totalAmount)}
                                </span>
                                <span className="text-xs font-mono text-slate-500 ml-1.5 font-bold">
                                  ({sale.quantityLiters.toFixed(1)} L)
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleSalePaymentStatus(sale)}
                                disabled={togglingSaleId === sale._id}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                                  sale.paymentStatus === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {sale.paymentStatus === 'paid' ? (
                                  <>
                                    <Check className="w-3 h-3" /> चुक्ता
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3" /> बाँकी
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditSale(sale)}
                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-xl transition min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer border border-slate-200 sm:border-transparent"
                                title="Edit sale"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSale(sale._id)}
                                disabled={deletingSaleId === sale._id}
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl transition disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer border border-slate-200 sm:border-transparent"
                                title="Delete sale"
                              >
                                {deletingSaleId === sale._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-4 w-12 text-center">#</th>
                        <th className="py-2.5 px-4">मिति</th>
                        <th className="py-2.5 px-4">शिफ्ट</th>
                        {!buyerFilter && <th className="py-2.5 px-4">ग्राहक (Buyer)</th>}
                        <th className="py-2.5 px-4 text-right">परिमाण (Liters)</th>
                        <th className="py-2.5 px-4 text-right">दर (Rate)</th>
                        <th className="py-2.5 px-4 text-right">जम्मा रकम</th>
                        <th className="py-2.5 px-4 text-center">भुक्तानी स्थिति</th>
                        <th className="py-2.5 px-4 text-right">कार्य</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedBuyerSales.map((sale, idx) => {
                        const isEditing = editSaleId === sale._id;
                        return (
                          <tr key={sale._id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4 text-center text-xs font-mono text-slate-400 font-bold">
                              {(buyerPage - 1) * BUYER_PAGE_SIZE + idx + 1}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                              {formatDate(sale.date)}
                            </td>
                            <td className="py-2.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                  sale.shift === 'morning'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {sale.shift === 'morning' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                                {sale.shift === 'morning' ? 'बिहान' : 'बेलुका'}
                              </span>
                            </td>
                            {!buyerFilter && (
                              <td className="py-2.5 px-4 font-bold text-slate-900">
                                <button
                                  type="button"
                                  onClick={() => setBuyerFilter(sale.buyerName)}
                                  className="hover:text-blue-600 hover:underline cursor-pointer"
                                  title="Filter to this buyer"
                                >
                                  {sale.buyerName}
                                </button>
                              </td>
                            )}
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-900">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editSaleQty}
                                  onChange={(e) => setEditSaleQty(e.target.value)}
                                  className="w-20 px-2 py-1 text-right border border-slate-300 rounded text-sm font-mono"
                                />
                              ) : (
                                `${sale.quantityLiters.toFixed(1)} L`
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.5"
                                  value={editSaleRate}
                                  onChange={(e) => setEditSaleRate(e.target.value)}
                                  className="w-20 px-2 py-1 text-right border border-slate-300 rounded text-sm font-mono"
                                />
                              ) : (
                                `Rs. ${sale.ratePerLiter.toFixed(2)}`
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900">
                              {formatRs(sale.totalAmount)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSalePaymentStatus(sale)}
                                disabled={togglingSaleId === sale._id}
                                title="Click to toggle Paid / Pending"
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                                  sale.paymentStatus === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                                }`}
                              >
                                {sale.paymentStatus === 'paid' ? (
                                  <>
                                    <Check className="w-3 h-3" /> चुक्ता
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3" /> बाँकी
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => saveEditSale(sale._id)}
                                    disabled={editSaleSaving}
                                    className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                                  >
                                    {editSaleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                  </button>
                                  <button onClick={cancelEditSale} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => startEditSale(sale)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                    title="Edit entry"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSale(sale._id)}
                                    disabled={deletingSaleId === sale._id}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 cursor-pointer"
                                    title="Delete entry"
                                  >
                                    {deletingSaleId === sale._id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Buyer Pagination */}
                {totalBuyerPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      Showing {(buyerPage - 1) * BUYER_PAGE_SIZE + 1}–
                      {Math.min(buyerPage * BUYER_PAGE_SIZE, buyerSales.length)} of {buyerSales.length}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBuyerPage((p) => Math.max(1, p - 1))}
                        disabled={buyerPage === 1}
                        className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg disabled:opacity-40 transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-3 py-1 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg">
                        {buyerPage} / {totalBuyerPages}
                      </span>
                      <button
                        onClick={() => setBuyerPage((p) => Math.min(totalBuyerPages, p + 1))}
                        disabled={buyerPage === totalBuyerPages}
                        className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg disabled:opacity-40 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function RecordsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading records…</p>
        </div>
      }
    >
      <RecordsContent />
    </Suspense>
  );
}
