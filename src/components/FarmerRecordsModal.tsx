'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Loader2,
  AlertCircle,
  FileText,
  Printer,
  ExternalLink,
  Sun,
  Moon,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { getTodayBS, subtractDaysBS, formatNepaliDate } from '@/lib/nepaliDate';

interface IFarmerSimple {
  _id: string;
  farmerCode: string;
  name: string;
  phone?: string;
  address?: string;
  defaultRate: number;
  isActive?: boolean;
}

interface IEntryItem {
  _id: string;
  date: string;
  shift: 'morning' | 'evening';
  quantity: number;
  rate: number;
  amount: number;
  fat?: number | null;
  snf?: number | null;
}

interface FarmerRecordsModalProps {
  farmer: IFarmerSimple | null;
  open: boolean;
  onClose: () => void;
}

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FarmerRecordsModal({ farmer, open, onClose }: FarmerRecordsModalProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<IEntryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'morning' | 'evening'>('all');

  const printRef = useRef<HTMLDivElement>(null);

  const today = getTodayBS();
  const thirtyDaysAgo = subtractDaysBS(today, 30);

  const fetchRecords = useCallback(async () => {
    if (!farmer) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        farmerId: farmer._id,
        startDate: thirtyDaysAgo,
        endDate: today,
        limit: '100',
      });
      const res = await fetch(`/api/entries?${params}`);
      if (!res.ok) throw new Error('Failed to fetch records');
      const data = await res.json();
      const list: IEntryItem[] = Array.isArray(data) ? data : data?.entries || [];
      // Sort newest date first, then morning/evening
      list.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.shift === 'evening' ? -1 : 1;
      });
      setEntries(list);
    } catch {
      setError('रेकर्ड लोड गर्न सकिएन। (Failed to load 30-day records)');
    } finally {
      setLoading(false);
    }
  }, [farmer, today, thirtyDaysAgo]);

  useEffect(() => {
    if (open && farmer) {
      setShiftFilter('all');
      fetchRecords();
    }
  }, [open, farmer, fetchRecords]);

  if (!open || !farmer) return null;

  const totalLiters = entries.reduce((s, e) => s + (e.quantity ?? 0), 0);
  const totalAmount = entries.reduce((s, e) => s + (e.amount ?? (e.quantity ?? 0) * (e.rate ?? 0)), 0);

  const morningEntries = entries.filter((e) => e.shift === 'morning');
  const eveningEntries = entries.filter((e) => e.shift === 'evening');
  const morningLiters = morningEntries.reduce((s, e) => s + (e.quantity ?? 0), 0);
  const eveningLiters = eveningEntries.reduce((s, e) => s + (e.quantity ?? 0), 0);

  const displayedEntries = shiftFilter === 'all'
    ? entries
    : entries.filter((e) => e.shift === shiftFilter);

  const handlePrint = () => {
    window.print();
  };

  const handleOpenFullRecords = () => {
    router.push(`/dashboard/records?farmerId=${farmer._id}&preset=30days`);
    onClose();
  };

  return (
    <>
      {/* Printable 30-day Statement (hidden on screen, visible on print) */}
      <div className="print-only" ref={printRef}>
        <div style={{ fontFamily: 'serif', padding: '24px', maxWidth: '650px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>लावण्यवती कृषि फार्म (Lawanyabati Krishi Farm)</h1>
            <p style={{ margin: '4px 0', fontSize: '13px' }}>३० दिनको दुध संकलन हिसाब (30-Day Milk Statement)</p>
            <p style={{ margin: '4px 0', fontSize: '14px', fontWeight: 'bold' }}>
              किसान: {farmer.name} (कोड: {farmer.farmerCode})
            </p>
            {farmer.phone && <p style={{ margin: '2px 0', fontSize: '12px' }}>सम्पर्क: {farmer.phone}</p>}
            <p style={{ margin: '4px 0', fontSize: '12px', color: '#444' }}>
              अवधि: {formatNepaliDate(thirtyDaysAgo)} देखि {formatNepaliDate(today)} सम्म
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #000', backgroundColor: '#f5f5f5' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>मिति (Date)</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>शिफ्ट (Shift)</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>परिमाण (L)</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>दर (Rate)</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>रकम (Amount)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e._id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                  <td style={{ padding: '5px 8px' }}>{formatNepaliDate(e.date)}</td>
                  <td style={{ padding: '5px 8px', textTransform: 'capitalize' }}>
                    {e.shift === 'morning' ? 'बिहानी (Morning)' : 'बेलुकी (Evening)'}
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'right' }}>{e.quantity.toFixed(2)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right' }}>Rs. {e.rate.toFixed(2)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right' }}>{formatRs(e.amount ?? e.quantity * e.rate)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
                <td colSpan={2} style={{ padding: '8px' }}>जम्मा (Total)</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{totalLiters.toFixed(2)} L</td>
                <td />
                <td style={{ padding: '8px', textAlign: 'right' }}>{formatRs(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <div>किसानको हस्ताक्षर: _______________</div>
            <div>प्रमाणित गर्ने: _______________</div>
          </div>
          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: '#777' }}>
            मुद्रण मिति: {formatNepaliDate(today)}
          </p>
        </div>
      </div>

      {/* Screen Interactive Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs no-print">
        <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-green-900 to-emerald-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-black bg-white/15 text-emerald-200 px-2.5 py-1 rounded-xl border border-white/20">
                {farmer.farmerCode}
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                  {farmer.name}
                </h2>
                <p className="text-xs text-emerald-200/90 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  अघिल्लो ३० दिनको रेकर्ड ({formatNepaliDate(thirtyDaysAgo, 'short')} – {formatNepaliDate(today, 'short')})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 bg-slate-50 border-b border-slate-200">
            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <p className="text-[11px] text-slate-500 font-medium">जम्मा लिटर (Total)</p>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {totalLiters.toFixed(2)} <span className="text-xs font-semibold text-slate-500">L</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                ☀️ {morningLiters.toFixed(1)}L | 🌙 {eveningLiters.toFixed(1)}L
              </p>
            </div>

            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <p className="text-[11px] text-slate-500 font-medium">जम्मा रकम (Payout)</p>
              <p className="text-base sm:text-lg font-black text-green-700 mt-0.5 truncate">
                {formatRs(totalAmount)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                दर: Rs. {farmer.defaultRate.toFixed(2)}/L
              </p>
            </div>

            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <p className="text-[11px] text-slate-500 font-medium">संकलन संख्या (Entries)</p>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {entries.length} <span className="text-xs font-semibold text-slate-500">पटक</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                ☀️ {morningEntries.length} | 🌙 {eveningEntries.length}
              </p>
            </div>
          </div>

          {/* Shift Filter Toolbar */}
          <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex rounded-xl overflow-hidden border border-slate-200">
              {(['all', 'morning', 'evening'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setShiftFilter(s)}
                  className={`px-3 py-1 text-xs font-medium border-r border-slate-200 last:border-0 transition-colors flex items-center gap-1 cursor-pointer ${
                    shiftFilter === s
                      ? s === 'morning'
                        ? 'bg-amber-100 text-amber-800 font-bold'
                        : s === 'evening'
                        ? 'bg-indigo-100 text-indigo-800 font-bold'
                        : 'bg-green-600 text-white font-bold'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {s === 'morning' && <Sun className="w-3 h-3" />}
                  {s === 'evening' && <Moon className="w-3 h-3" />}
                  {s === 'all' ? `सबै (${entries.length})` : s === 'morning' ? `बिहानी (${morningEntries.length})` : `बेलुकी (${eveningEntries.length})`}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Showing {displayedEntries.length} of {entries.length} records
            </span>
          </div>

          {/* Scrollable Records Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
            {loading ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">३० दिनको रेकर्ड लोड हुँदैछ...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            ) : displayedEntries.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-sm">कुनै रेकर्ड फेला परेन</p>
                <p className="text-xs text-slate-400 mt-1">यस किसानको बिगत ३० दिनमा दुध संकलन प्रविष्टि छैन।</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards List (< sm) */}
                <div className="sm:hidden space-y-2">
                  {displayedEntries.map((e) => (
                    <div
                      key={`m-${e._id}`}
                      className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{formatNepaliDate(e.date)}</span>
                        {e.shift === 'morning' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Sun className="w-3 h-3" /> बिहानी
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                            <Moon className="w-3 h-3" /> बेलुकी
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="text-base font-black text-slate-900">{e.quantity.toFixed(2)} L</span>
                          <span className="text-xs text-slate-400 ml-1.5">@ Rs. {e.rate.toFixed(2)}</span>
                          {((e.fat ?? 0) > 0 || (e.snf ?? 0) > 0) && (
                            <span className="block text-[10px] text-emerald-700 font-mono mt-0.5">
                              🧪 {e.fat ? `FAT: ${e.fat}%` : ''} {e.snf ? `SNF: ${e.snf}%` : ''}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-green-700 font-mono">
                            {formatRs(e.amount ?? e.quantity * e.rate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View (>= sm) */}
                <div className="hidden sm:block overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="text-left px-3 py-2.5">मिति (Date)</th>
                        <th className="text-left px-3 py-2.5">शिफ्ट (Shift)</th>
                        <th className="text-right px-3 py-2.5">परिमाण (L)</th>
                        <th className="text-right px-3 py-2.5">दर (Rate)</th>
                        <th className="text-center px-3 py-2.5">गुणस्तर (FAT/SNF)</th>
                        <th className="text-right px-3 py-2.5">रकम (Amount)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {displayedEntries.map((e) => (
                        <tr key={e._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2 font-medium text-slate-800">{formatNepaliDate(e.date)}</td>
                          <td className="px-3 py-2">
                            {e.shift === 'morning' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <Sun className="w-3 h-3" /> बिहानी
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                <Moon className="w-3 h-3" /> बेलुकी
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-black text-slate-900 font-mono">
                            {e.quantity.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600">Rs. {e.rate.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center text-slate-500 font-mono text-[11px]">
                            {((e.fat ?? 0) > 0 || (e.snf ?? 0) > 0) ? (
                              <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                                {e.fat ? `F:${e.fat}` : ''}{e.fat && e.snf ? ' ' : ''}{e.snf ? `S:${e.snf}` : ''}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-green-700 font-mono">
                            {formatRs(e.amount ?? e.quantity * e.rate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Statement
              </button>

              <button
                type="button"
                onClick={handleOpenFullRecords}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-green-50 hover:bg-green-100 text-green-800 font-bold text-xs rounded-xl border border-green-200 shadow-2xs transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Records
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
