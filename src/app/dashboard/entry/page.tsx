'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sun,
  Moon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FlaskConical,
  Settings2,
  X,
  HelpCircle,
  Search,
  Users,
  Check,
  ShoppingCart,
  TrendingUp,
  Pencil,
  Trash2,
  Clock,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import NepaliDatePicker from '@/components/NepaliDatePicker';
import { getTodayBS } from '@/lib/nepaliDate';
import {
  QualityPricingSettings,
  DEFAULT_QUALITY_SETTINGS,
  getStoredQualitySettings,
  saveStoredQualitySettings,
} from '@/lib/offlineDb';

interface IFarmer {
  _id: string;
  farmerCode: string;
  name: string;
  phone?: string;
  defaultRate: number;
  isActive: boolean;
}

interface ISale {
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

interface EntryRow {
  quantity: string;
  fat: string;
  snf: string;
  rate: string;
  isCustomRate?: boolean;
}

interface ExistingEntry {
  _id: string;
  farmerId?: string | { _id?: string };
  farmer?: string | { _id?: string };
  quantity?: number;
  rate?: number;
  quantityLiters?: number;
  ratePerLiter?: number;
  fat?: number | null;
  snf?: number | null;
}

function detectShift(): 'morning' | 'evening' {
  return new Date().getHours() < 12 ? 'morning' : 'evening';
}

function formatRs(amount: number) {
  return `Rs. ${(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function OnePageGridEntry() {
  const [farmers, setFarmers] = useState<IFarmer[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayBS());
  const [selectedShift, setSelectedShift] = useState<'morning' | 'evening'>(detectShift());
  const [entries, setEntries] = useState<Record<string, EntryRow>>({});
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingFarmers, setLoadingFarmers] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);

  // Auto-Save status & tracking
  const [globalSaveStatus, setGlobalSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savingFarmerIds, setSavingFarmerIds] = useState<Set<string>>(new Set());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'entered'>('all');
  const [filtersMinimized, setFiltersMinimized] = useState(true);

  // Entry Mode: 'collection' (दूध संकलन) vs 'sales' (दूध बिक्री)
  const [entryMode, setEntryMode] = useState<'collection' | 'sales'>('collection');

  // Sales state & handlers
  const [sales, setSales] = useState<ISale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [saleForm, setSaleForm] = useState({
    buyerName: '',
    quantityLiters: '',
    ratePerLiter: '',
    paymentStatus: 'paid' as 'paid' | 'pending',
    notes: '',
  });
  const [submittingSale, setSubmittingSale] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);

  // Load Sales for date & shift
  const loadSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const res = await fetch(`/api/sales?date=${selectedDate}&shift=${selectedShift}`);
      if (!res.ok) throw new Error('Failed to load sales');
      const data = await res.json();
      setSales(data.sales || []);
    } catch (err) {
      console.error('Error loading sales:', err);
    } finally {
      setLoadingSales(false);
    }
  }, [selectedDate, selectedShift]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Quality Mode & Pricing Settings
  const [qualitySettings, setQualitySettings] = useState<QualityPricingSettings>(DEFAULT_QUALITY_SETTINGS);
  const [isQualityMode, setIsQualityMode] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Refs for auto-save and keyboard navigation
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const fatRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const snfRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const existingIdsRef = useRef(existingIds);
  existingIdsRef.current = existingIds;
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Focus and scroll into view helper (vital for mobile keyboard navigation)
  const focusAndCenter = (el: HTMLInputElement | null) => {
    if (!el) return;
    el.focus();
    el.select();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // 1. Load Quality Pricing Settings from LocalStorage on mount
  useEffect(() => {
    const saved = getStoredQualitySettings();
    setQualitySettings(saved);
    setIsQualityMode(saved.enableQualityMode);
  }, []);

  const handleToggleQualityMode = () => {
    setIsQualityMode((prev) => {
      const next = !prev;
      saveStoredQualitySettings({ enableQualityMode: next });
      return next;
    });
  };

  // 2. Fetch active farmers sorted by farmerCode (ID)
  useEffect(() => {
    async function fetchFarmers() {
      setLoadingFarmers(true);
      try {
        const res = await fetch('/api/farmers?active=true');
        if (!res.ok) throw new Error('Failed to fetch farmers');
        const data = await res.json();
        const list: IFarmer[] = Array.isArray(data) ? data : data?.farmers || [];
        // Sort strictly by farmer ID/code numerically (e.g., F-01, F-02, F-10, etc.)
        const sorted = list.sort((a, b) =>
          (a.farmerCode || '').localeCompare(b.farmerCode || '', undefined, { numeric: true })
        );
        setFarmers(sorted);

        // Pre-fill entries state
        const init: Record<string, EntryRow> = {};
        sorted.forEach((f) => {
          init[f._id] = {
            quantity: '',
            fat: '',
            snf: '',
            rate: String(f.defaultRate ?? 0),
            isCustomRate: false,
          };
        });
        setEntries(init);
      } catch (err) {
        console.error('Error loading farmers:', err);
      } finally {
        setLoadingFarmers(false);
      }
    }
    fetchFarmers();
  }, []);

  // 3. Fetch existing entries when date/shift changes
  const loadExistingEntries = useCallback(async () => {
    if (farmers.length === 0) return;
    setLoadingEntries(true);
    try {
      const res = await fetch(`/api/entries?startDate=${selectedDate}&endDate=${selectedDate}&shift=${selectedShift}`);
      if (!res.ok) throw new Error('Failed to load existing entries');
      const data = await res.json();
      const list: ExistingEntry[] = Array.isArray(data) ? data : data?.entries || [];

      const getFid = (e: ExistingEntry): string => {
        if (typeof e.farmerId === 'string') return e.farmerId;
        if (e.farmerId && typeof e.farmerId === 'object' && e.farmerId._id) return e.farmerId._id;
        if (typeof e.farmer === 'string') return e.farmer;
        if (e.farmer && typeof e.farmer === 'object' && e.farmer._id) return e.farmer._id;
        return '';
      };

      const ids = new Set(list.map(getFid).filter(Boolean));
      setExistingIds(ids);
      existingIdsRef.current = ids;

      // Check if any existing entry has FAT/SNF recorded; if so, enable Quality Mode automatically
      const hasQualityData = list.some(
        (e) => (e.fat !== null && e.fat !== undefined && e.fat > 0) ||
               (e.snf !== null && e.snf !== undefined && e.snf > 0)
      );
      if (hasQualityData && !isQualityMode) {
        setIsQualityMode(true);
      }

      setEntries((prev) => {
        const next = { ...prev };
        // Reset all to default rate + blank qty/fat/snf
        farmers.forEach((f) => {
          next[f._id] = {
            quantity: '',
            fat: '',
            snf: '',
            rate: String(f.defaultRate ?? 0),
            isCustomRate: false,
          };
        });
        // Pre-fill existing entries
        list.forEach((e) => {
          const fid = getFid(e);
          if (fid) {
            next[fid] = {
              quantity: String(e.quantity ?? e.quantityLiters ?? ''),
              fat: e.fat !== null && e.fat !== undefined ? String(e.fat) : '',
              snf: e.snf !== null && e.snf !== undefined ? String(e.snf) : '',
              rate: String(e.rate ?? e.ratePerLiter ?? ''),
              isCustomRate: false,
            };
          }
        });
        entriesRef.current = next;
        return next;
      });
    } catch (err) {
      console.error('Error loading existing entries:', err);
    } finally {
      setLoadingEntries(false);
    }
  }, [selectedDate, selectedShift, farmers, isQualityMode]);

  useEffect(() => {
    loadExistingEntries();
  }, [loadExistingEntries]);

  // Focus the first farmer's quantity input on initial load
  useEffect(() => {
    if (farmers.length > 0 && !loadingFarmers) {
      const firstId = farmers[0]?._id;
      if (firstId) {
        setTimeout(() => {
          const el = qtyRefs.current[firstId];
          if (el) focusAndCenter(el);
        }, 200);
      }
    }
  }, [farmers.length, loadingFarmers]);

  // Compute calculated rate for a given farmer and row
  const calculateRate = useCallback(
    (farmer: IFarmer, row?: EntryRow): number => {
      const defaultRate = farmer.defaultRate ?? 0;
      if (!row) return defaultRate;

      // If user explicitly typed a custom rate in standard mode or manually overridden
      if (row.isCustomRate && row.rate !== '') {
        const custom = parseFloat(row.rate);
        return isNaN(custom) ? defaultRate : custom;
      }

      // If in Quality Mode and both FAT and SNF are entered (> 0)
      if (isQualityMode) {
        const fatNum = parseFloat(row.fat);
        const snfNum = parseFloat(row.snf);
        if (!isNaN(fatNum) && fatNum > 0 && !isNaN(snfNum) && snfNum > 0) {
          let computed = fatNum * qualitySettings.fatFactor + snfNum * qualitySettings.snfFactor;
          if (qualitySettings.minBaseRate > 0 && computed < qualitySettings.minBaseRate) {
            computed = qualitySettings.minBaseRate;
          }
          return Number(computed.toFixed(2));
        }
      }

      // Fallback: row's current rate string or farmer default rate
      const parsedRate = parseFloat(row.rate);
      return !isNaN(parsedRate) && parsedRate > 0 ? parsedRate : defaultRate;
    },
    [isQualityMode, qualitySettings]
  );

  // Auto-Save single farmer entry or delete if cleared
  const saveSingleFarmer = useCallback(
    async (farmerId: string) => {
      // Clear pending debounce timer
      if (debounceTimers.current[farmerId]) {
        clearTimeout(debounceTimers.current[farmerId]);
        delete debounceTimers.current[farmerId];
      }

      const farmer = farmers.find((f) => f._id === farmerId);
      if (!farmer) return;

      const todayBS = getTodayBS();
      if (selectedDate > todayBS) {
        setSavedMessage({
          type: 'error',
          text: 'भोलि वा भविष्यको मितिमा दूधको विवरण इन्ट्री गर्न मिल्दैन (Future date entries are not allowed).',
        });
        return;
      }

      const row = entriesRef.current[farmerId];
      if (!row) return;

      const qty = parseFloat(row.quantity) || 0;

      if (qty > 0) {
        const effectiveRate = calculateRate(farmer, row);
        const fatNum = parseFloat(row.fat);
        const snfNum = parseFloat(row.snf);

        setSavingFarmerIds((prev) => new Set(prev).add(farmerId));
        setGlobalSaveStatus('saving');

        try {
          const res = await fetch('/api/entries/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entries: [
                {
                  farmerId,
                  date: selectedDate,
                  shift: selectedShift,
                  quantity: qty,
                  quantityLiters: qty,
                  rate: effectiveRate,
                  ratePerLiter: effectiveRate,
                  fat: !isNaN(fatNum) && fatNum > 0 ? fatNum : null,
                  snf: !isNaN(snfNum) && snfNum > 0 ? snfNum : null,
                },
              ],
            }),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Auto-save failed');
          }

          setExistingIds((prev) => {
            const next = new Set(prev);
            next.add(farmerId);
            existingIdsRef.current = next;
            return next;
          });
          setGlobalSaveStatus('saved');
        } catch (e: unknown) {
          console.error('Auto-save error for farmer', farmer.farmerCode, e);
          setGlobalSaveStatus('error');
        } finally {
          setSavingFarmerIds((prev) => {
            const next = new Set(prev);
            next.delete(farmerId);
            return next;
          });
        }
      } else if (existingIdsRef.current.has(farmerId)) {
        // Quantity cleared back to 0/empty, remove entry from DB
        setSavingFarmerIds((prev) => new Set(prev).add(farmerId));
        try {
          await fetch(
            `/api/entries?farmerId=${farmerId}&date=${selectedDate}&shift=${selectedShift}`,
            { method: 'DELETE' }
          );
          setExistingIds((prev) => {
            const next = new Set(prev);
            next.delete(farmerId);
            existingIdsRef.current = next;
            return next;
          });
          setGlobalSaveStatus('saved');
        } catch (e) {
          console.error('Failed to delete cleared entry', e);
        } finally {
          setSavingFarmerIds((prev) => {
            const next = new Set(prev);
            next.delete(farmerId);
            return next;
          });
        }
      }
    },
    [farmers, selectedDate, selectedShift, calculateRate]
  );

  const triggerAutoSave = useCallback(
    (farmerId: string, delayMs = 600) => {
      if (debounceTimers.current[farmerId]) {
        clearTimeout(debounceTimers.current[farmerId]);
      }
      debounceTimers.current[farmerId] = setTimeout(() => {
        saveSingleFarmer(farmerId);
      }, delayMs);
    },
    [saveSingleFarmer]
  );

  // Clean up debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  // Field change handlers with immediate debounce auto-save
  const handleQtyChange = (farmerId: string, value: string) => {
    setEntries((prev) => {
      const next = {
        ...prev,
        [farmerId]: {
          ...(prev[farmerId] ?? { fat: '', snf: '', rate: '0' }),
          quantity: value,
        },
      };
      entriesRef.current = next;
      return next;
    });
    triggerAutoSave(farmerId, 600);
  };

  const handleFatChange = (farmer: IFarmer, value: string) => {
    setEntries((prev) => {
      const currentRow = prev[farmer._id] ?? { quantity: '', fat: '', snf: '', rate: String(farmer.defaultRate) };
      const updatedRow = { ...currentRow, fat: value, isCustomRate: false };
      const newRate = calculateRate(farmer, updatedRow);
      const next = {
        ...prev,
        [farmer._id]: {
          ...updatedRow,
          rate: String(newRate),
        },
      };
      entriesRef.current = next;
      return next;
    });
    triggerAutoSave(farmer._id, 600);
  };

  const handleSnfChange = (farmer: IFarmer, value: string) => {
    setEntries((prev) => {
      const currentRow = prev[farmer._id] ?? { quantity: '', fat: '', snf: '', rate: String(farmer.defaultRate) };
      const updatedRow = { ...currentRow, snf: value, isCustomRate: false };
      const newRate = calculateRate(farmer, updatedRow);
      const next = {
        ...prev,
        [farmer._id]: {
          ...updatedRow,
          rate: String(newRate),
        },
      };
      entriesRef.current = next;
      return next;
    });
    triggerAutoSave(farmer._id, 600);
  };

  const handleRateChange = (farmerId: string, value: string) => {
    setEntries((prev) => {
      const next = {
        ...prev,
        [farmerId]: {
          ...(prev[farmerId] ?? { quantity: '', fat: '', snf: '' }),
          rate: value,
          isCustomRate: true,
        },
      };
      entriesRef.current = next;
      return next;
    });
    triggerAutoSave(farmerId, 600);
  };

  // Row Amount calculation
  const computeAmount = (farmer: IFarmer): number => {
    const row = entries[farmer._id];
    if (!row) return 0;
    const qty = parseFloat(row.quantity) || 0;
    const rate = calculateRate(farmer, row);
    return qty * rate;
  };

  // Aggregates for Sticky Bar and Progress
  const { totalLiters, totalAmount, farmersEntered, avgFat, avgSnf } = useMemo(() => {
    let liters = 0;
    let amount = 0;
    let filled = 0;
    let fatSum = 0;
    let fatCount = 0;
    let snfSum = 0;
    let snfCount = 0;

    farmers.forEach((f) => {
      const row = entries[f._id];
      if (!row) return;
      const qty = parseFloat(row.quantity) || 0;
      if (qty > 0) {
        filled++;
        liters += qty;
        amount += qty * calculateRate(f, row);
      }

      const fatVal = parseFloat(row.fat);
      if (!isNaN(fatVal) && fatVal > 0) {
        fatSum += fatVal;
        fatCount++;
      }

      const snfVal = parseFloat(row.snf);
      if (!isNaN(snfVal) && snfVal > 0) {
        snfSum += snfVal;
        snfCount++;
      }
    });

    return {
      totalLiters: liters,
      totalAmount: amount,
      farmersEntered: filled,
      avgFat: fatCount > 0 ? (fatSum / fatCount).toFixed(2) : '—',
      avgSnf: snfCount > 0 ? (snfSum / snfCount).toFixed(2) : '—',
    };
  }, [farmers, entries, calculateRate]);

  // Sales Aggregates & Stock Calculation
  const { totalSoldLiters, totalSalesAmount, pendingSalesAmount } = useMemo(() => {
    let soldL = 0;
    let totalAmt = 0;
    let pendingAmt = 0;
    sales.forEach((s) => {
      soldL += s.quantityLiters;
      totalAmt += s.totalAmount;
      if (s.paymentStatus === 'pending') {
        pendingAmt += s.totalAmount;
      }
    });
    return {
      totalSoldLiters: soldL,
      totalSalesAmount: totalAmt,
      pendingSalesAmount: pendingAmt,
    };
  }, [sales]);

  const stockRemainingLiters = totalLiters - totalSoldLiters;

  // Handle Save / Update Milk Sale
  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.buyerName.trim()) {
      setSavedMessage({ type: 'error', text: 'खरिदकर्ताको नाम अनिवार्य छ (Buyer name is required).' });
      return;
    }
    const qty = parseFloat(saleForm.quantityLiters);
    if (isNaN(qty) || qty <= 0) {
      setSavedMessage({ type: 'error', text: 'दूधको परिमाण मान्य हुनुपर्छ (Valid liters required).' });
      return;
    }
    const rate = parseFloat(saleForm.ratePerLiter);
    if (isNaN(rate) || rate < 0) {
      setSavedMessage({ type: 'error', text: 'बिक्री दर मान्य हुनुपर्छ (Valid rate required).' });
      return;
    }

    const todayBS = getTodayBS();
    if (selectedDate > todayBS) {
      setSavedMessage({
        type: 'error',
        text: 'भोलि वा भविष्यको मितिमा दूध बिक्री इन्ट्री गर्न मिल्दैन (Cannot record sales for future dates).',
      });
      return;
    }

    setSubmittingSale(true);
    setSavedMessage(null);

    try {
      const payload = {
        buyerName: saleForm.buyerName.trim(),
        date: selectedDate,
        shift: selectedShift,
        quantityLiters: qty,
        ratePerLiter: rate,
        paymentStatus: saleForm.paymentStatus,
        notes: saleForm.notes.trim(),
      };

      if (editingSaleId) {
        const res = await fetch(`/api/sales/${editingSaleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update sale');
        }
        setSavedMessage({ type: 'success', text: '✓ बिक्री रेकर्ड अद्यावधिक भयो (Sale updated successfully)!' });
      } else {
        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to record sale');
        }
        setSavedMessage({
          type: 'success',
          text: `✓ ${saleForm.buyerName} लाई ${qty} L बिक्री सुरक्षित भयो (Sale recorded)!`,
        });
      }

      setSaleForm({
        buyerName: '',
        quantityLiters: '',
        ratePerLiter: '',
        paymentStatus: 'paid',
        notes: '',
      });
      setEditingSaleId(null);
      await loadSales();
    } catch (err: unknown) {
      setSavedMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error saving sale' });
    } finally {
      setSubmittingSale(false);
      setTimeout(() => setSavedMessage(null), 4000);
    }
  };

  const handleTogglePaymentStatus = async (sale: ISale) => {
    const nextStatus = sale.paymentStatus === 'paid' ? 'pending' : 'paid';
    try {
      const res = await fetch(`/api/sales/${sale._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      await loadSales();
    } catch (err) {
      console.error('Error toggling payment status:', err);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('के तपाईं यो बिक्री रेकर्ड मेटाउन निश्चित हुनुहुन्छ? (Are you sure you want to delete this sale record?)')) return;
    setDeletingSaleId(saleId);
    try {
      const res = await fetch(`/api/sales/${saleId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete sale');
      await loadSales();
    } catch (err) {
      console.error('Error deleting sale:', err);
    } finally {
      setDeletingSaleId(null);
    }
  };

  const startEditSale = (sale: ISale) => {
    setEditingSaleId(sale._id);
    setSaleForm({
      buyerName: sale.buyerName,
      quantityLiters: String(sale.quantityLiters),
      ratePerLiter: String(sale.ratePerLiter),
      paymentStatus: sale.paymentStatus,
      notes: sale.notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditSale = () => {
    setEditingSaleId(null);
    setSaleForm({
      buyerName: '',
      quantityLiters: '',
      ratePerLiter: '',
      paymentStatus: 'paid',
      notes: '',
    });
  };

  // Filtered & Searched Farmers List
  const filteredFarmers = useMemo(() => {
    return farmers.filter((farmer) => {
      // 1. Status Filter
      const qty = parseFloat(entries[farmer._id]?.quantity) || 0;
      if (statusFilter === 'pending' && qty > 0) return false;
      if (statusFilter === 'entered' && qty <= 0) return false;

      // 2. Search query filter (by Code or by Name)
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const code = (farmer.farmerCode || '').toLowerCase();
      const name = (farmer.name || '').toLowerCase();

      // Check direct substring in code or name
      if (code.includes(q) || name.includes(q)) return true;

      // Smart numerical matching: "5" matches "F-05", "F-5", "05"
      const cleanFarmerNum = code.replace(/\D/g, '');
      const cleanQueryNum = q.replace(/\D/g, '');
      if (cleanQueryNum && cleanFarmerNum) {
        if (cleanFarmerNum.includes(cleanQueryNum) || parseInt(cleanFarmerNum, 10) === parseInt(cleanQueryNum, 10)) {
          return true;
        }
      }

      return false;
    });
  }, [farmers, entries, searchQuery, statusFilter]);

  // Bulk Save handler
  const handleSave = async () => {
    const toSave = farmers
      .filter((f) => (parseFloat(entries[f._id]?.quantity) || 0) > 0)
      .map((f) => {
        const row = entries[f._id];
        const qty = parseFloat(row.quantity);
        const effectiveRate = calculateRate(f, row);
        const fatNum = parseFloat(row.fat);
        const snfNum = parseFloat(row.snf);

        return {
          farmerId: f._id,
          date: selectedDate,
          shift: selectedShift,
          quantity: qty,
          quantityLiters: qty,
          rate: effectiveRate,
          ratePerLiter: effectiveRate,
          fat: !isNaN(fatNum) && fatNum > 0 ? fatNum : null,
          snf: !isNaN(snfNum) && snfNum > 0 ? snfNum : null,
        };
      });

    const todayBS = getTodayBS();
    if (selectedDate > todayBS) {
      setSavedMessage({
        type: 'error',
        text: 'भोलि वा भविष्यको मितिमा दूधको विवरण इन्ट्री गर्न मिल्दैन (Cannot enter milk details for future dates).',
      });
      setTimeout(() => setSavedMessage(null), 4000);
      return;
    }

    if (toSave.length === 0) {
      setSavedMessage({ type: 'error', text: 'Please enter milk quantity for at least one farmer.' });
      setTimeout(() => setSavedMessage(null), 3500);
      return;
    }

    setSaving(true);
    setSavedMessage(null);
    try {
      const res = await fetch('/api/entries/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: toSave }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      setSavedMessage({
        type: 'success',
        text: `✓ Saved entries for ${toSave.length} farmer${toSave.length === 1 ? '' : 's'}! Total: ${totalLiters.toFixed(2)} L (${formatRs(totalAmount)})`,
      });
      await loadExistingEntries();
    } catch (e: unknown) {
      setSavedMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to save entries.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMessage(null), 5000);
    }
  };

  // Keyboard shortcut:
  // - Ctrl+S / Cmd+S -> save all
  // - '/' -> focus search box
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const progressPercentage = farmers.length > 0 ? Math.round((farmersEntered / farmers.length) * 100) : 0;
  const pendingCount = farmers.length - farmersEntered;

  return (
    <div className="space-y-3 max-w-4xl mx-auto pb-24 sm:pb-8">
      {/* MODE SWITCHER: दूध संकलन (Collection) vs दूध बिक्री (Sell Milk) */}
      {/* MODE SWITCHER: दूध संकलन (Collection) vs दूध बिक्री (Sell Milk) */}
      <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200 shadow-2xs w-full max-w-full">
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl w-full">
          <button
            type="button"
            onClick={() => setEntryMode('collection')}
            className={`flex items-center justify-center gap-1 sm:gap-2 px-2 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer min-w-0 ${
              entryMode === 'collection'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">दूध संकलन (Collection)</span>
              <span className="sm:hidden">दूध संकलन</span>
            </span>
            <span
              className={`font-mono text-[10px] sm:text-[11px] px-1 sm:px-1.5 py-0.5 rounded font-black flex-shrink-0 ${
                entryMode === 'collection'
                  ? 'bg-emerald-700/60 text-white'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              {totalLiters.toFixed(1)} L
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEntryMode('sales')}
            className={`flex items-center justify-center gap-1 sm:gap-2 px-2 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer min-w-0 ${
              entryMode === 'sales'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">दूध बिक्री (Sell Milk)</span>
              <span className="sm:hidden">दूध बिक्री</span>
            </span>
            <span
              className={`font-mono text-[10px] sm:text-[11px] px-1 sm:px-1.5 py-0.5 rounded font-black flex-shrink-0 ${
                entryMode === 'sales'
                  ? 'bg-blue-700/60 text-white'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              {totalSoldLiters.toFixed(1)} L
            </span>
          </button>
        </div>
      </div>

      {/* TOP CONTROL BAR: Shifts + FAT/SNF + Date Picker */}
      <div className="bg-white p-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-2 w-full max-w-full">
        {/* Row 1 on mobile, Left on desktop: Shift & Quality Toggle */}
        <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 w-full sm:w-auto">
          {/* Shift Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedShift('morning')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-md transition-all min-h-[34px] cursor-pointer ${
                selectedShift === 'morning'
                  ? 'bg-amber-400 text-amber-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-900" />
              <span>बिहानी</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedShift('evening')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-md transition-all min-h-[34px] cursor-pointer ${
                selectedShift === 'evening'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-200" />
              <span>बेलुकी</span>
            </button>
          </div>

          {/* Compact FAT & SNF Mode Toggle (Shown only in Collection Mode) */}
          {entryMode === 'collection' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleQualityMode}
                title={isQualityMode ? 'Click to disable FAT & SNF inputs' : 'Click to enable FAT & SNF quality testing'}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all min-h-[34px] cursor-pointer ${
                  isQualityMode
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FlaskConical className={`w-3.5 h-3.5 ${isQualityMode ? 'text-amber-300' : 'text-slate-500'}`} />
                <span>{isQualityMode ? 'FAT/SNF: ON' : 'FAT & SNF'}</span>
              </button>

              {/* Compact Pricing Factors Settings Button */}
              {isQualityMode && (
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="flex items-center gap-1 p-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition min-h-[34px] cursor-pointer"
                  title="Configure Quality Pricing Factors"
                >
                  <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Row 2 on mobile, Right on desktop: Inline Date Picker & Refresh Button */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto">
          <NepaliDatePicker
            value={selectedDate}
            onChange={(newDate) => setSelectedDate(newDate)}
            compact
            className="flex-1 sm:flex-initial"
          />

          <button
            type="button"
            onClick={() => {
              loadExistingEntries();
              loadSales();
            }}
            disabled={loadingEntries || loadingSales}
            title="Reload data for this date & shift"
            className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition min-h-[34px] min-w-[34px] flex items-center justify-center cursor-pointer flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingEntries || loadingSales ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {entryMode === 'collection' ? (
        <>
      {/* 1. INSTANT SEARCH BAR (ALWAYS VISIBLE OUTSIDE FILTER BAR) */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSearchQuery('');
              searchInputRef.current?.blur();
            } else if (e.key === 'Enter') {
              e.preventDefault();
              // Focus first matched farmer's input
              if (filteredFarmers.length > 0) {
                const firstFarmerId = filteredFarmers[0]._id;
                focusAndCenter(qtyRefs.current[firstFarmerId]);
              }
            }
          }}
          placeholder="किसान खोज्नुहोस् वा कोड टाइप गर्नुहोस् (Search by ID or Name, e.g. '05', 'Ram')..."
          className="w-full pl-9 pr-14 py-2 sm:py-2.5 bg-white hover:bg-slate-50/70 focus:bg-white text-base sm:text-sm font-medium text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-2xs transition"
        />
        {/* Search Clear Icon */}
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="hidden sm:inline text-[11px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
              /
            </span>
          )}
        </div>
      </div>

      {/* 2. COLLAPSIBLE FILTER BAR (MINIMIZED BY DEFAULT, ALL FILTER CHOSEN) */}
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
              स्थिति: <strong className="text-slate-900 capitalize">{statusFilter}</strong>
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              ({filteredFarmers.length}/{farmers.length})
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
          <div className="p-2.5 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-600">इन्ट्री स्थिति (Entry Status):</span>
              {/* Status Filter Chips: All, Pending, Entered */}
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
                  onClick={() => setStatusFilter('pending')}
                  className={`py-1 px-2.5 text-xs font-bold rounded-lg text-center transition-all cursor-pointer ${
                    statusFilter === 'pending'
                      ? 'bg-amber-500 text-amber-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('entered')}
                  className={`py-1 px-2.5 text-xs font-bold rounded-lg text-center transition-all cursor-pointer ${
                    statusFilter === 'entered'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Entered ({farmersEntered})
                </button>
              </div>
            </div>

            {/* Live Progress Bar & Quick Stats */}
            <div className="flex items-center justify-between gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 font-medium truncate">
                <Users className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="truncate">
                  <strong>{filteredFarmers.length}</strong> of <strong>{farmers.length}</strong> farmers
                </span>
              </div>

              {/* Mini completion progress */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-20 sm:w-32 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-slate-700 text-[11px]">
                  {progressPercentage}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alert / Notification */}
      {savedMessage && (
        <div
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
            savedMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200 shadow-xs'
              : 'bg-red-50 text-red-800 border border-red-200 shadow-xs'
          }`}
        >
          {savedMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{savedMessage.text}</span>
        </div>
      )}

      {/* Future date warning */}
      {selectedDate > getTodayBS() && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs sm:text-sm font-semibold shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>⚠️ भोलि वा भविष्यको मितिमा दूधको विवरण इन्ट्री गर्न मिल्दैन (Future date entries are not allowed).</span>
        </div>
      )}

      {/* CONTENT AREA: MOBILE CARD LIST & DESKTOP TABLE */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loadingFarmers ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
            <p className="text-slate-500 text-xs sm:text-sm font-medium">Loading farmers list...</p>
          </div>
        ) : farmers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="font-semibold text-base text-slate-700">No active farmers found.</p>
            <p className="text-xs mt-1">Please add farmers from the Farmers page first.</p>
          </div>
        ) : filteredFarmers.length === 0 ? (
          <div className="p-10 text-center text-slate-500 space-y-2">
            <p className="font-bold text-slate-700 text-sm">No farmers match your filter</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition"
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
          <>
            {/* 1. MOBILE VIEW (< md): Clean Touch-Friendly Cards (No Sideways Scrolling!) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredFarmers.map((farmer, filteredIdx) => {
                const row = entries[farmer._id] ?? {
                  quantity: '',
                  fat: '',
                  snf: '',
                  rate: String(farmer.defaultRate ?? 0),
                  isCustomRate: false,
                };
                const amount = computeAmount(farmer);
                const effectiveRate = calculateRate(farmer, row);
                const hasQty = (parseFloat(row.quantity) || 0) > 0;
                const hasEntry = existingIds.has(farmer._id);
                const overallIdx = farmers.findIndex((f) => f._id === farmer._id);

                return (
                  <div
                    key={`mobile-${farmer._id}`}
                    className={`p-2.5 sm:p-3 transition-colors ${
                      hasQty
                        ? 'bg-green-50/70 border-l-[3px] border-l-green-500'
                        : hasEntry
                        ? 'bg-amber-50/30 border-l-[3px] border-l-amber-400'
                        : 'bg-white'
                    }`}
                  >
                    {/* Header Row: Farmer Code, Name, Amount/Rate Status */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          #{overallIdx >= 0 ? overallIdx + 1 : filteredIdx + 1}
                        </span>
                        <span className="inline-block bg-slate-100 text-slate-800 font-mono font-bold text-xs px-1.5 py-0.5 rounded border border-slate-200">
                          {farmer.farmerCode}
                        </span>
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                          {farmer.name}
                        </span>
                      </div>

                      {/* Status / Rate Display */}
                      <div className="text-right flex-shrink-0">
                        {savingFarmerIds.has(farmer._id) ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-mono animate-pulse">
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-600" /> बचत...
                          </span>
                        ) : isQualityMode && hasQty ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100/90 border border-green-200 px-2 py-0.5 rounded-full font-mono">
                            <Check className="w-2.5 h-2.5 stroke-[3]" /> {formatRs(amount)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono font-semibold text-slate-500">
                            दर: Rs. {effectiveRate.toFixed(2)}/L
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Inputs Row: Liters + Quality Mode inputs */}
                    <div className="grid grid-cols-12 gap-2 items-center">
                      {/* Liters Input - Medium Touch Target */}
                      <div className={isQualityMode ? 'col-span-6' : 'col-span-7'}>
                        <div className="relative">
                          <input
                            ref={(el) => {
                              qtyRefs.current[farmer._id] = el;
                            }}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.1"
                            value={row.quantity}
                            placeholder="0.0"
                            onChange={(e) => handleQtyChange(farmer._id, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => saveSingleFarmer(farmer._id)}
                            onKeyDown={(e) => {
                              // Enter jumps to next farmer's Liters input and smoothly centers it on mobile screen!
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveSingleFarmer(farmer._id);
                                if (filteredIdx + 1 < filteredFarmers.length) {
                                  const nextId = filteredFarmers[filteredIdx + 1]._id;
                                  focusAndCenter(qtyRefs.current[nextId]);
                                } else {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }
                            }}
                            className={`w-full text-base font-bold h-10 pl-3 pr-7 border rounded-lg focus:outline-none transition-all ${
                              hasQty
                                ? 'border-green-600 bg-white text-green-950 ring-1 ring-green-100 shadow-2xs'
                                : 'border-slate-300 bg-white text-slate-900 focus:border-green-500 focus:ring-1 focus:ring-green-100'
                            }`}
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
                            <span className={`text-[11px] font-bold font-mono transition-colors ${hasQty ? 'text-green-700' : 'text-slate-400'}`}>
                              L
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quality Mode: FAT & SNF Inputs side-by-side */}
                      {isQualityMode ? (
                        <>
                          <div className="col-span-3">
                            <div className="relative">
                              <input
                                ref={(el) => {
                                  fatRefs.current[farmer._id] = el;
                                }}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                max="15"
                                step="0.1"
                                value={row.fat}
                                placeholder="FAT"
                                onChange={(e) => handleFatChange(farmer, e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onBlur={() => saveSingleFarmer(farmer._id)}
                                className={`w-full text-center font-mono font-bold text-xs h-10 px-1 border rounded-lg focus:outline-none transition-all ${
                                  row.fat
                                    ? 'border-amber-500 bg-amber-50/60 text-amber-950 font-bold ring-1 ring-amber-200'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:border-amber-500'
                                }`}
                              />
                            </div>
                          </div>
                          <div className="col-span-3">
                            <div className="relative">
                              <input
                                ref={(el) => {
                                  snfRefs.current[farmer._id] = el;
                                }}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                max="15"
                                step="0.1"
                                value={row.snf}
                                placeholder="SNF"
                                onChange={(e) => handleSnfChange(farmer, e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onBlur={() => saveSingleFarmer(farmer._id)}
                                className={`w-full text-center font-mono font-bold text-xs h-10 px-1 border rounded-lg focus:outline-none transition-all ${
                                  row.snf
                                    ? 'border-indigo-500 bg-indigo-50/60 text-indigo-950 font-bold ring-1 ring-indigo-200'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:border-indigo-500'
                                }`}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Standard Mode Rate Info */
                        <div className="col-span-5 flex items-center justify-end">
                          <div className="text-right">
                            {hasQty ? (
                              <div>
                                <div className="text-xs sm:text-sm font-bold font-mono text-green-700 leading-tight">
                                  {formatRs(amount)}
                                </div>
                                <div className="text-[9px] text-green-600 font-bold flex items-center justify-end gap-0.5 mt-0.5">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" /> भरियो
                                </div>
                              </div>
                            ) : (
                              <div className="text-[11px] font-mono font-medium text-slate-400">
                                Rs. 0.00
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. DESKTOP VIEW (>= md): Clean Medium-Sized Grid Table with Sticky Header */}
            <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-270px)] overflow-y-auto relative">
              <table className="w-full text-left border-collapse text-xs">
                {/* STICKY TABLE HEADER */}
                <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 shadow-2xs z-10">
                  <tr className="text-slate-600 text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-2 px-2.5 w-10 text-center">#</th>
                    <th className="py-2 px-2.5 w-24">Farmer ID</th>
                    <th className="py-2 px-2.5 min-w-[130px]">Farmer Name</th>
                    <th className="py-2 px-2.5 w-32 text-green-800">
                      Liters (L)
                    </th>

                    {/* Quality Mode Columns */}
                    {isQualityMode ? (
                      <>
                        <th className="py-2 px-2 w-20 text-amber-800 text-center">
                          FAT %
                        </th>
                        <th className="py-2 px-2 w-20 text-indigo-800 text-center">
                          SNF %
                        </th>
                        <th className="py-2 px-2 w-24 text-slate-600 text-center">
                          Rate (Rs/L)
                        </th>
                      </>
                    ) : (
                      <th className="py-2 px-2.5 w-24 text-slate-500">
                        Rate (Rs/L)
                      </th>
                    )}

                    <th className="py-2 px-3 w-28 text-right">Amount (Rs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFarmers.map((farmer, filteredIdx) => {
                    const row = entries[farmer._id] ?? {
                      quantity: '',
                      fat: '',
                      snf: '',
                      rate: String(farmer.defaultRate ?? 0),
                      isCustomRate: false,
                    };
                    const amount = computeAmount(farmer);
                    const effectiveRate = calculateRate(farmer, row);
                    const hasEntry = existingIds.has(farmer._id);
                    const hasQty = (parseFloat(row.quantity) || 0) > 0;
                    const hasTestedQuality =
                      (parseFloat(row.fat) || 0) > 0 && (parseFloat(row.snf) || 0) > 0;
                    const overallIdx = farmers.findIndex((f) => f._id === farmer._id);

                    return (
                      <tr
                        key={`desktop-${farmer._id}`}
                        className={`transition-colors duration-100 ${
                          hasQty
                            ? 'bg-green-50/80 hover:bg-green-50'
                            : hasEntry
                            ? 'bg-amber-50/40 hover:bg-amber-50/70'
                            : filteredIdx % 2 === 0
                            ? 'bg-white hover:bg-slate-50'
                            : 'bg-slate-50/50 hover:bg-slate-50'
                        }`}
                      >
                        {/* Row # */}
                        <td className="py-1.5 px-2.5 text-center font-mono text-[11px] text-slate-400 font-medium">
                          {overallIdx >= 0 ? overallIdx + 1 : filteredIdx + 1}
                        </td>

                        {/* Farmer ID / Code Badge */}
                        <td className="py-1.5 px-2.5 font-mono">
                          <span className="inline-block bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] font-bold shadow-2xs">
                            {farmer.farmerCode}
                          </span>
                        </td>

                        {/* Farmer Name (Clean, NO phone number) */}
                        <td className="py-1.5 px-2.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">{farmer.name}</span>
                            {savingFarmerIds.has(farmer._id) ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1 py-0.2 rounded-full animate-pulse flex-shrink-0">
                                <Loader2 className="w-2 h-2 animate-spin" /> बचत
                              </span>
                            ) : hasQty ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-green-700 bg-green-100 border border-green-200 px-1 py-0.2 rounded-full flex-shrink-0">
                                <Check className="w-2 h-2 stroke-[3]" /> saved
                              </span>
                            ) : hasEntry ? (
                              <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-1 py-0.2 rounded-full flex-shrink-0">
                                saved
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Liters Input Box */}
                        <td className="py-1 px-2.5">
                          <div className="relative">
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.1"
                              value={row.quantity}
                              placeholder="0.0"
                              onChange={(e) => handleQtyChange(farmer._id, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => saveSingleFarmer(farmer._id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveSingleFarmer(farmer._id);
                                  if (filteredIdx + 1 < filteredFarmers.length) {
                                    const nextId = filteredFarmers[filteredIdx + 1]._id;
                                    focusAndCenter(qtyRefs.current[nextId]);
                                  } else {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                } else if (e.key === 'Tab') {
                                  if (!e.shiftKey) {
                                    if (isQualityMode) {
                                      e.preventDefault();
                                      fatRefs.current[farmer._id]?.focus();
                                      fatRefs.current[farmer._id]?.select();
                                    } else {
                                      e.preventDefault();
                                      saveSingleFarmer(farmer._id);
                                      if (filteredIdx + 1 < filteredFarmers.length) {
                                        const nextId = filteredFarmers[filteredIdx + 1]._id;
                                        focusAndCenter(qtyRefs.current[nextId]);
                                      } else {
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }
                                  } else {
                                    if (isQualityMode && filteredIdx > 0) {
                                      e.preventDefault();
                                      const prevId = filteredFarmers[filteredIdx - 1]._id;
                                      focusAndCenter(snfRefs.current[prevId]);
                                    } else if (!isQualityMode && filteredIdx > 0) {
                                      e.preventDefault();
                                      const prevId = filteredFarmers[filteredIdx - 1]._id;
                                      focusAndCenter(qtyRefs.current[prevId]);
                                    }
                                  }
                                }
                              }}
                              className={`w-full text-xs sm:text-sm font-bold pl-2.5 pr-5 py-1 border rounded-lg focus:outline-none transition-all ${
                                hasQty
                                  ? 'border-green-600 bg-white text-green-950 shadow-2xs ring-1 ring-green-100'
                                  : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 focus:border-green-500 focus:ring-1 focus:ring-green-100'
                              }`}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                              <span className={`text-[10px] font-bold font-mono transition-colors ${hasQty ? 'text-green-700' : 'text-slate-400'}`}>
                                L
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Quality Mode: FAT & SNF Inputs */}
                        {isQualityMode ? (
                          <>
                            {/* FAT % Input */}
                            <td className="py-1 px-1.5 text-center">
                              <div className="relative">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min="0"
                                  max="15"
                                  step="0.1"
                                  value={row.fat}
                                  placeholder="0.0"
                                  onChange={(e) => handleFatChange(farmer, e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onBlur={() => saveSingleFarmer(farmer._id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                                      e.preventDefault();
                                      snfRefs.current[farmer._id]?.focus();
                                      snfRefs.current[farmer._id]?.select();
                                    } else if (e.key === 'Tab' && e.shiftKey) {
                                      e.preventDefault();
                                      focusAndCenter(qtyRefs.current[farmer._id]);
                                    }
                                  }}
                                  className={`w-full text-center font-mono font-bold text-xs px-1.5 py-1 border rounded-md focus:outline-none transition-all ${
                                    row.fat
                                      ? 'border-amber-500 bg-amber-50/60 text-amber-950 font-black ring-1 ring-amber-200'
                                      : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 focus:bg-white focus:border-amber-500'
                                  }`}
                                />
                              </div>
                            </td>

                            {/* SNF % Input */}
                            <td className="py-1 px-1.5 text-center">
                              <div className="relative">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min="0"
                                  max="15"
                                  step="0.1"
                                  value={row.snf}
                                  placeholder="0.0"
                                  onChange={(e) => handleSnfChange(farmer, e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onBlur={() => saveSingleFarmer(farmer._id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                                      e.preventDefault();
                                      saveSingleFarmer(farmer._id);
                                      if (filteredIdx + 1 < filteredFarmers.length) {
                                        const nextId = filteredFarmers[filteredIdx + 1]._id;
                                        focusAndCenter(qtyRefs.current[nextId]);
                                      } else {
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    } else if (e.key === 'Tab' && e.shiftKey) {
                                      e.preventDefault();
                                      fatRefs.current[farmer._id]?.focus();
                                      fatRefs.current[farmer._id]?.select();
                                    }
                                  }}
                                  className={`w-full text-center font-mono font-bold text-xs px-1.5 py-1 border rounded-md focus:outline-none transition-all ${
                                    row.snf
                                      ? 'border-indigo-500 bg-indigo-50/60 text-indigo-950 font-black ring-1 ring-indigo-200'
                                      : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 focus:bg-white focus:border-indigo-500'
                                  }`}
                                />
                              </div>
                            </td>

                            {/* Calculated Rate Box with Testing Status Tag */}
                            <td className="py-1 px-2 text-center font-mono">
                              <div className="flex flex-col items-center">
                                <span
                                  className={`text-xs font-bold ${
                                    hasTestedQuality
                                      ? 'text-emerald-700 font-black'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  Rs. {effectiveRate.toFixed(2)}
                                </span>
                                <span
                                  className={`text-[9px] tracking-tight ${
                                    hasTestedQuality
                                      ? 'text-emerald-600 font-semibold'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {hasTestedQuality ? '🧪 tested' : 'standard'}
                                </span>
                              </div>
                            </td>
                          </>
                        ) : (
                          /* Standard Mode Rate Input */
                          <td className="py-1 px-2.5">
                            <div className="relative">
                              <input
                                type="number"
                                inputMode="decimal"
                                tabIndex={-1}
                                min="0"
                                step="0.5"
                                value={row.rate}
                                onChange={(e) => handleRateChange(farmer._id, e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onBlur={() => saveSingleFarmer(farmer._id)}
                                placeholder="0.00"
                                className="w-full text-xs font-mono text-slate-600 px-2 py-1 border border-slate-200 bg-slate-50/50 rounded-md hover:bg-white hover:border-slate-300 focus:bg-white focus:border-slate-400 focus:outline-none transition"
                              />
                            </div>
                          </td>
                        )}

                        {/* Row Amount */}
                        <td className="py-1 px-3 text-right font-mono">
                          <div className="flex items-center justify-end gap-1.5">
                            {savingFarmerIds.has(farmer._id) && (
                              <Loader2 className="w-3 h-3 animate-spin text-amber-600 flex-shrink-0" />
                            )}
                            <span className={`font-bold text-xs sm:text-sm ${hasQty ? 'text-green-700 font-black' : 'text-slate-300'}`}>
                              {hasQty ? formatRs(amount) : '—'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
        {/* Sticky Mobile Floating Save Bar (Phone only: Realme 10 Pro+) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3 safe-area-pb">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <span className="text-slate-900 font-black">{farmersEntered}</span>/{farmers.length} भरियो
              <span className="text-slate-300">•</span>
              <span className="font-mono text-emerald-700 font-bold">{totalLiters.toFixed(1)} L</span>
            </div>
            <div className="text-sm font-black font-mono text-slate-900 truncate">
              {formatRs(totalAmount)}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || farmersEntered === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-xs transition-all active:scale-95 min-h-[44px] flex-shrink-0 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>बचत हुँदैछ...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>सबै सुरक्षित</span>
              </>
            )}
          </button>
        </div>
      </>
    ) : (
      <div className="space-y-4">
        {/* SELL MILK (दूध बिक्री) SECTION */}
        {/* Alert / Notification for sales */}
        {savedMessage && (
          <div
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              savedMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200 shadow-xs'
                : 'bg-red-50 text-red-800 border border-red-200 shadow-xs'
            }`}
          >
            {savedMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{savedMessage.text}</span>
          </div>
        )}

        {/* Future date warning */}
        {selectedDate > getTodayBS() && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs sm:text-sm font-semibold shadow-2xs">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>⚠️ भोलि वा भविष्यको मितिमा दूध बिक्री इन्ट्री गर्न मिल्दैन (Future date sales are not allowed).</span>
          </div>
        )}

        {/* RECORD MILK SALE FORM */}
        <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-4">
          {editingSaleId && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl text-xs">
              <span className="font-bold text-blue-900">बिक्री विवरण सम्पादन गर्दै... (Editing Sale)</span>
              <button
                type="button"
                onClick={cancelEditSale}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                रद्द गर्नुहोस् (Cancel)
              </button>
            </div>
          )}

          <form onSubmit={handleSaveSale} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* 1. Buyer Name */}
              <div className="lg:col-span-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  खरिदकर्ताको नाम (Buyer / Dairy) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={saleForm.buyerName}
                  onChange={(e) => setSaleForm((prev) => ({ ...prev, buyerName: e.target.value }))}
                  placeholder="e.g. Chilling Center, Hotel, Ram Dai"
                  className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* 2. Quantity (Liters) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  दूध परिमाण (Liters) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0.1"
                    required
                    value={saleForm.quantityLiters}
                    onChange={(e) => setSaleForm((prev) => ({ ...prev, quantityLiters: e.target.value }))}
                    placeholder="0.0"
                    className="w-full pl-3 pr-8 py-2 text-base font-black border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    L
                  </span>
                </div>
              </div>

              {/* 3. Selling Rate (Rs/L) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  बिक्री दर (Rate Rs./L) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    required
                    value={saleForm.ratePerLiter}
                    onChange={(e) => setSaleForm((prev) => ({ ...prev, ratePerLiter: e.target.value }))}
                    placeholder="0.00"
                    className="w-full pl-3 pr-10 py-2 text-base font-black border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    Rs/L
                  </span>
                </div>
              </div>

              {/* 4. Live Calculated Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  जम्मा रकम (Total Amount)
                </label>
                <div className="h-[42px] px-3 py-2 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-blue-700 font-semibold">रकम:</span>
                  <span className="font-mono font-black text-blue-950 text-base">
                    {formatRs((parseFloat(saleForm.quantityLiters) || 0) * (parseFloat(saleForm.ratePerLiter) || 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2: Payment Status and Submit Button (Remarks removed) */}
            <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
              {/* Payment Status Toggle */}
              <div className="w-full sm:w-auto">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                  भुक्तानी स्थिति
                </label>
                <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 min-w-[200px]">
                  <button
                    type="button"
                    onClick={() => setSaleForm((prev) => ({ ...prev, paymentStatus: 'paid' }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      saleForm.paymentStatus === 'paid'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>चुक्ता</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleForm((prev) => ({ ...prev, paymentStatus: 'pending' }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-3 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      saleForm.paymentStatus === 'pending'
                        ? 'bg-amber-500 text-amber-950 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>बाँकी</span>
                  </button>
                </div>
              </div>

              {/* Submit Action */}
              <div className="w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={submittingSale || selectedDate > getTodayBS()}
                  className="w-full sm:w-auto min-w-[200px] h-[36px] inline-flex items-center justify-center gap-1.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition cursor-pointer"
                >
                  {submittingSale ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>बचत गर्दै...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{editingSaleId ? 'अपडेट गर्नुहोस्' : 'बिक्री सुरक्षित गर्नुहोस्'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* SALES LIST / HISTORY FOR THIS SHIFT */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-sm text-slate-900">
                बिक्री सूची (Sales for this Shift)
              </h4>
              <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {sales.length}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {selectedDate} • {selectedShift === 'morning' ? 'बिहानी' : 'बेलुकी'}
            </span>
          </div>

          {loadingSales ? (
            <div className="p-10 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">बिक्री विवरण लोड हुँदैछ...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">
                यो मिति र सिफ्टमा अहिलेसम्म कुनै दूध बिक्री रेकर्ड गरिएको छैन।
              </p>
              <p className="text-xs text-slate-400">
                माथिको फारम प्रयोग गरेर खरिदकर्तालाई बेचेको दूधको विवरण सुरक्षित गर्नुहोस्।
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Sales Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-4 w-12 text-center">#</th>
                      <th className="py-2.5 px-4 font-bold">खरिदकर्ता (Buyer)</th>
                      <th className="py-2.5 px-4 font-bold text-blue-800">परिमाण (Liters)</th>
                      <th className="py-2.5 px-4 font-bold">बिक्री दर (Rate)</th>
                      <th className="py-2.5 px-4 font-bold text-right">जम्मा रकम (Total)</th>
                      <th className="py-2.5 px-4 font-bold text-center">भुक्तानी</th>
                      <th className="py-2.5 px-4 text-right">कार्य (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales.map((sale, idx) => (
                      <tr key={sale._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 text-center text-xs font-mono text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {sale.buyerName}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-900">
                          {sale.quantityLiters.toFixed(1)} L
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          Rs. {sale.ratePerLiter.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-right text-slate-900 text-base">
                          {formatRs(sale.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePaymentStatus(sale)}
                            title="Click to toggle Paid / Pending"
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition cursor-pointer ${
                              sale.paymentStatus === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
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
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditSale(sale)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Edit sale"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSale(sale._id)}
                              disabled={deletingSaleId === sale._id}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 cursor-pointer"
                              title="Delete sale"
                            >
                              {deletingSaleId === sale._id ? (
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
                  <tfoot>
                    <tr className="bg-slate-100/70 border-t-2 border-slate-200 font-bold text-slate-900">
                      <td colSpan={2} className="py-3 px-4">
                        जम्मा (Total Sold)
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-blue-900">
                        {totalSoldLiters.toFixed(1)} L
                      </td>
                      <td />
                      <td className="py-3 px-4 font-mono font-black text-right text-base text-slate-950">
                        {formatRs(totalSalesAmount)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Sales Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {sales.map((sale, idx) => (
                  <div key={`mobile-sale-${sale._id}`} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <h5 className="font-bold text-slate-900 text-sm">
                            {sale.buyerName}
                          </h5>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {sale.quantityLiters.toFixed(1)} L × Rs. {sale.ratePerLiter.toFixed(2)}/L
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-black text-base text-slate-900">
                          {formatRs(sale.totalAmount)}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleTogglePaymentStatus(sale)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold mt-0.5 ${
                            sale.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {sale.paymentStatus === 'paid' ? 'चुक्ता' : 'बाँकी'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-50">
                      <button
                        type="button"
                        onClick={() => startEditSale(sale)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" /> सम्पादन
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSale(sale._id)}
                        disabled={deletingSaleId === sale._id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 rounded-lg disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> मेटाउनुहोस्
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )}

      {/* QUICK SETTINGS MODAL FOR PRICING FACTORS */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">Quality Pricing Settings</h3>
                  <p className="text-xs text-slate-500">Configure FAT & SNF rate formula</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Formula Explanation */}
              <div className="bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-xl text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Formula: Rate = (FAT × Fat Factor) + (SNF × SNF Factor)
                </div>
                <p className="text-slate-600 text-[11px]">
                  Example: 4.0% FAT × {qualitySettings.fatFactor} + 8.5% SNF × {qualitySettings.snfFactor} ={' '}
                  <strong className="text-slate-900">
                    Rs. {(4.0 * qualitySettings.fatFactor + 8.5 * qualitySettings.snfFactor).toFixed(2)}/L
                  </strong>
                </p>
              </div>

              {/* Fat Factor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Fat Factor (Rs. per 1% FAT)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={qualitySettings.fatFactor}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setQualitySettings((prev) => ({ ...prev, fatFactor: val }));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* SNF Factor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  SNF Factor (Rs. per 1% SNF)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={qualitySettings.snfFactor}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setQualitySettings((prev) => ({ ...prev, snfFactor: val }));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Minimum Base Rate Fallback */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Minimum Base Rate Fallback (Rs.)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min="0"
                  value={qualitySettings.minBaseRate}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setQualitySettings((prev) => ({ ...prev, minBaseRate: val }));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setQualitySettings(DEFAULT_QUALITY_SETTINGS);
                  saveStoredQualitySettings(DEFAULT_QUALITY_SETTINGS);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
              >
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={() => {
                  saveStoredQualitySettings(qualitySettings);
                  setShowSettingsModal(false);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* (Bottom sticky bar removed: data is now auto-saved and live summary is located at the top) */}
    </div>
  );
}
