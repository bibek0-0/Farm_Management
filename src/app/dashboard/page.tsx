'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Droplets,
  IndianRupee,
  Users,
  PenLine,
  FileText,
  TrendingUp,
  AlertCircle,
  Sun,
  Moon,
  ArrowUpRight,
  UserCheck,
  Calendar,
  Award,
} from 'lucide-react';
import { formatNepaliDate } from '@/lib/nepaliDate';

interface LastEntryFarmer {
  farmerCode: string;
  name: string;
  shift: 'morning' | 'evening';
  shiftLabel: string;
  quantity: number;
  date: string;
}

interface TopSupplier {
  _id: string;
  farmerName: string;
  farmerCode: string;
  totalLiters: number;
  totalAmount: number;
}

interface AnalyticsSummary {
  todayLiters: number;
  todayAmount: number;
  activeFarmers: number;
  lastEntry: string | null;
  lastEntryFarmer?: LastEntryFarmer | null;
  weeklyLiters: number;
  weeklyAmount: number;
  morningLiters?: number;
  eveningLiters?: number;
  morningCount?: number;
  eveningCount?: number;
  topSuppliers?: TopSupplier[];
}

function formatRs(amount: number) {
  return `Rs. ${(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [greeting, setGreeting] = useState('नमस्ते (Namaste)');
  const [currentDateStr, setCurrentDateStr] = useState('');

  useEffect(() => {
    // Dynamic greeting based on current local hour
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('शुभ प्रभात (Good Morning)');
    else if (hour < 17) setGreeting('शुभ दिउँसो (Good Afternoon)');
    else setGreeting('शुभ सन्ध्या (Good Evening)');

    setCurrentDateStr(formatNepaliDate(new Date(), 'full'));

    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const json = await res.json();
        setData(json);
      } catch {
        setError('Could not load dashboard data. Please refresh.');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const todayLiters = data?.todayLiters ?? 0;
  const morningL = data?.morningLiters ?? 0;
  const eveningL = data?.eveningLiters ?? 0;
  const morningPercent = todayLiters > 0 ? Math.round((morningL / todayLiters) * 100) : 50;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl">
      {/* ─── 1. Header (NO wave emoji, clean modern typography) ─────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-2xl font-black text-slate-900 tracking-tight" suppressHydrationWarning>
            {greeting}, Admin
          </h1>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 mt-1" suppressHydrationWarning>
            <Calendar className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
            <span>{currentDateStr}</span>
          </div>
        </div>

        {/* Quick entry shortcut button */}
        <Link
          href="/dashboard/entry"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-sm rounded-xl shadow-xs transition-all active:scale-95 min-h-[44px]"
        >
          <PenLine className="w-4 h-4" />
          <span>New Milk Entry</span>
        </Link>
      </div>

      {/* ─── Error notification ────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ─── 2. Modern 4-Card KPI Grid (Mobile-friendly 2x2 on phone) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Today's Milk */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Today&apos;s Milk</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight" suppressHydrationWarning>
              {loading ? '—' : `${todayLiters.toFixed(1)}`}
              <span className="text-xs sm:text-sm font-normal text-slate-400 ml-1">L</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
              {morningL > 0 || eveningL > 0
                ? `M: ${morningL.toFixed(1)}L | E: ${eveningL.toFixed(1)}L`
                : 'Collection today'}
            </p>
          </div>
        </div>

        {/* Card 2: Today's Amount */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Today&apos;s Amount</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono tracking-tight truncate" suppressHydrationWarning>
              {loading ? '—' : formatRs(data?.todayAmount ?? 0)}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
              Total payable to farmers
            </p>
          </div>
        </div>

        {/* Card 3: Active Farmers */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Active Farmers</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight" suppressHydrationWarning>
              {loading ? '—' : String(data?.activeFarmers ?? 0)}
              <span className="text-xs sm:text-sm font-normal text-slate-400 ml-1">total</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
              Supplying milk members
            </p>
          </div>
        </div>

        {/* Card 4: Last Entry (Shows Farmer ID + Shift) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Last Entered</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight" suppressHydrationWarning>
              {loading ? (
                '—'
              ) : data?.lastEntryFarmer ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="bg-amber-100/80 text-amber-950 px-2 py-0.5 rounded-lg text-sm sm:text-base border border-amber-200">
                    {data.lastEntryFarmer.farmerCode}
                  </span>
                </span>
              ) : (
                <span className="text-sm text-slate-400">None</span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 font-medium mt-1 truncate">
              {data?.lastEntryFarmer
                ? `${data.lastEntryFarmer.name} • ${data.lastEntryFarmer.shiftLabel}`
                : 'No entries recorded yet'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. Today's Shift Breakdown & 7-Day Performance ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Shift Distribution Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Today&apos;s Shift Breakdown
            </h2>
            <span className="text-xs font-bold text-slate-400">Total: {todayLiters.toFixed(1)} L</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Morning Shift */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
                <Sun className="w-3.5 h-3.5 text-amber-600" />
                <span>बिहानी (Morning)</span>
              </div>
              <p className="text-xl font-black text-amber-950 font-mono">
                {morningL.toFixed(1)} <span className="text-xs font-normal text-amber-700">L</span>
              </p>
              <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                {data?.morningCount ?? 0} farmers
              </p>
            </div>

            {/* Evening Shift */}
            <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-1">
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span>बेलुकी (Evening)</span>
              </div>
              <p className="text-xl font-black text-indigo-950 font-mono">
                {eveningL.toFixed(1)} <span className="text-xs font-normal text-indigo-700">L</span>
              </p>
              <p className="text-[11px] text-indigo-700 font-medium mt-0.5">
                {data?.eveningCount ?? 0} farmers
              </p>
            </div>
          </div>

          {/* Visual ratio bar */}
          {todayLiters > 0 && (
            <div className="space-y-1">
              <div className="w-full bg-indigo-100 rounded-full h-2.5 overflow-hidden flex">
                <div
                  className="bg-amber-400 h-2.5 transition-all duration-500"
                  style={{ width: `${morningPercent}%` }}
                  title={`Morning: ${morningPercent}%`}
                />
                <div
                  className="bg-indigo-600 h-2.5 transition-all duration-500"
                  style={{ width: `${100 - morningPercent}%` }}
                  title={`Evening: ${100 - morningPercent}%`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Morning {morningPercent}%</span>
                <span>Evening {100 - morningPercent}%</span>
              </div>
            </div>
          )}
        </div>

        {/* 7-Day Performance Banner (Modern Dark Emerald Gradient) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-5 sm:p-6 text-white shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-wide text-emerald-200">
                Last 7 Days Performance
              </span>
            </div>
            <span className="text-xs text-slate-400 bg-white/10 px-2 py-0.5 rounded-full font-mono">
              Weekly Aggregate
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total Milk Collected</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-1">
                {(data?.weeklyLiters ?? 0).toFixed(1)} <span className="text-sm font-normal text-slate-300">L</span>
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total Payout Payable</p>
              <p className="text-2xl sm:text-3xl font-black text-white font-mono mt-1 truncate">
                {formatRs(data?.weeklyAmount ?? 0)}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
            <span>Automated milk collection & payout summary</span>
            <Link href="/dashboard/analytics" className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1">
              <span>View Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 4. Quick Actions Hub ───────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3">
          <Link
            href="/dashboard/entry"
            className="group bg-white hover:bg-emerald-50/50 active:bg-emerald-50 p-4 sm:p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-300 shadow-xs transition-all flex items-center gap-4 min-h-[64px]"
          >
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <PenLine className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-950">Milk Entry</h3>
              <p className="text-xs text-slate-500 truncate">Fast entry with search & FAT/SNF</p>
            </div>
          </Link>

          <Link
            href="/dashboard/records"
            className="group bg-white hover:bg-blue-50/50 active:bg-blue-50 p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-xs transition-all flex items-center gap-4 min-h-[64px]"
          >
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-950">Records & Slips</h3>
              <p className="text-xs text-slate-500 truncate">Filter, edit and print payment slips</p>
            </div>
          </Link>

          <Link
            href="/dashboard/farmers"
            className="group bg-white hover:bg-indigo-50/50 active:bg-indigo-50 p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-xs transition-all flex items-center gap-4 min-h-[64px]"
          >
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-950">Farmers Directory</h3>
              <p className="text-xs text-slate-500 truncate">Manage farmer profiles & base rates</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ─── 5. Top 5 Milk Suppliers of the Month ───────────────────────── */}
      {data?.topSuppliers && data.topSuppliers.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Top Milk Suppliers (This Month)
              </h2>
            </div>
            <Link
              href="/dashboard/analytics"
              className="text-xs font-semibold text-green-700 hover:text-green-800"
            >
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {data.topSuppliers.slice(0, 5).map((sup, idx) => (
              <div
                key={sup._id}
                className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="font-mono font-bold text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                    {sup.farmerCode}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs truncate">{sup.farmerName}</p>
                  <p className="text-sm font-black text-green-700 font-mono mt-0.5">
                    {sup.totalLiters.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">L</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
