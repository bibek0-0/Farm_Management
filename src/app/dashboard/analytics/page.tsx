'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, AlertCircle, BarChart3, RefreshCw } from 'lucide-react';

// Recharts components use browser APIs, load client-only
const AnalyticsCharts = dynamic(() => import('@/components/AnalyticsCharts'), { ssr: false });

interface DailyTrendPoint {
  _id: string;
  totalLiters: number;
  totalAmount: number;
}

interface ShiftCompPoint {
  _id: { date: string; shift: string };
  totalLiters: number;
}

interface TopSupplier {
  _id: string;
  totalLiters: number;
  farmerName: string;
  farmerCode: string;
}

interface AnalyticsData {
  todayLiters: number;
  todayAmount: number;
  activeFarmers: number;
  lastEntry: string | null;
  weeklyLiters: number;
  weeklyAmount: number;
  dailyTrend: DailyTrendPoint[];
  shiftComparison: ShiftCompPoint[];
  topSuppliers: TopSupplier[];
}

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
      <div className="h-4 w-36 bg-slate-100 rounded animate-pulse" />
      <div className="h-56 bg-slate-100 rounded-xl animate-pulse" />
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json: AnalyticsData = await res.json();
      setData(json);
    } catch {
      setError('Could not load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Insights</h1>
          <p className="text-sm text-slate-500 mt-0.5">Last 30 days of milk collection data</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
          <button onClick={fetchData} className="ml-auto underline text-red-600 hover:text-red-800 text-sm">
            Retry
          </button>
        </div>
      )}

      {/* Summary stat pills */}
      {!loading && data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Today's Milk", value: `${(data.todayLiters ?? 0).toFixed(2)} L` },
            { label: "Today's Payout", value: formatRs(data.todayAmount ?? 0) },
            { label: '7-Day Milk', value: `${(data.weeklyLiters ?? 0).toFixed(2)} L` },
            { label: '7-Day Payout', value: formatRs(data.weeklyAmount ?? 0) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Charts */}
      {!loading && data && !error && (
        <AnalyticsCharts
          dailyTrend={data.dailyTrend ?? []}
          shiftComparison={data.shiftComparison ?? []}
          topSuppliers={data.topSuppliers ?? []}
        />
      )}

      {/* Empty state */}
      {!loading && !error && data && data.dailyTrend?.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700">No data yet</h3>
          <p className="text-sm text-slate-500 mt-1">Start recording milk entries to see analytics here.</p>
        </div>
      )}
    </div>
  );
}
