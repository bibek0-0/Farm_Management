'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, BarChart2, Trophy } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyTrendPoint {
  _id: string; // YYYY-MM-DD
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

interface AnalyticsChartsProps {
  dailyTrend: DailyTrendPoint[];
  shiftComparison: ShiftCompPoint[];
  topSuppliers: TopSupplier[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { formatNepaliDate, NEPALI_MONTHS_NP, toNepaliDigits } from '@/lib/nepaliDate';

function formatDateShort(dateStr: string): string {
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const mName = NEPALI_MONTHS_NP[monthIdx] || parts[1];
      return `${toNepaliDigits(day)} ${mName}`;
    }
    return formatNepaliDate(dateStr, 'devanagari');
  } catch {
    return dateStr;
  }
}

function formatLiters(value: number): string {
  return `${value.toFixed(1)} L`;
}

// Custom tooltip styles
const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  fontSize: '12px',
};

const tooltipLabelStyle = {
  color: '#0f172a',
  fontWeight: '600',
  marginBottom: '4px',
};

// ─── Chart 1: Daily Trend ─────────────────────────────────────────────────────

export function DailyTrendChart({ data }: { data: DailyTrendPoint[] }) {
  const chartData = data.map((d) => ({
    date: formatDateShort(d._id),
    liters: parseFloat(d.totalLiters.toFixed(2)),
    amount: parseFloat(d.totalAmount.toFixed(2)),
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50">
          <TrendingUp size={16} className="text-green-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Daily Milk Collection</h3>
          <p className="text-xs text-slate-500">Last 30 days</p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          No data available for the selected period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(chartData.length / 6)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}L`}
              width={45}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(value) => [formatLiters(typeof value === 'number' ? value : 0), 'Liters']}
              cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="liters"
              stroke="#16a34a"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#16a34a', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Chart 2: Shift Comparison ────────────────────────────────────────────────

interface MergedShiftPoint {
  date: string;
  morning: number;
  evening: number;
}

function mergeShiftData(data: ShiftCompPoint[]): MergedShiftPoint[] {
  const map: Record<string, MergedShiftPoint> = {};

  for (const point of data) {
    const { date, shift } = point._id;
    if (!map[date]) {
      map[date] = { date: formatDateShort(date), morning: 0, evening: 0 };
    }
    if (shift === 'morning') {
      map[date].morning = parseFloat(point.totalLiters.toFixed(2));
    } else {
      map[date].evening = parseFloat(point.totalLiters.toFixed(2));
    }
  }

  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

export function ShiftComparisonChart({ data }: { data: ShiftCompPoint[] }) {
  const chartData = mergeShiftData(data);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50">
          <BarChart2 size={16} className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Morning vs Evening</h3>
          <p className="text-xs text-slate-500">Last 14 days</p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          No data available for the selected period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(chartData.length / 7)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}L`}
              width={45}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(value, name) => [
                formatLiters(typeof value === 'number' ? value : 0),
                name === 'morning' ? '☀️ Morning' : '🌙 Evening',
              ]}
              cursor={{ fill: '#f8fafc' }}
            />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-slate-600 capitalize">{value}</span>
              )}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="morning" name="morning" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="evening" name="evening" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Chart 3: Top Suppliers Table ─────────────────────────────────────────────

export function TopSuppliersTable({ data }: { data: TopSupplier[] }) {
  const top10 = data.slice(0, 10);

  const rankColors = ['text-yellow-500', 'text-slate-400', 'text-amber-700'];
  const rankBg = ['bg-yellow-50', 'bg-slate-50', 'bg-amber-50'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50">
          <Trophy size={16} className="text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Top Suppliers</h3>
          <p className="text-xs text-slate-500">By total liters</p>
        </div>
      </div>

      {top10.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          No supplier data available
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-2 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-10">
                  #
                </th>
                <th className="pb-2 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Code
                </th>
                <th className="pb-2 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Farmer Name
                </th>
                <th className="pb-2 px-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Total Liters
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {top10.map((supplier, idx) => {
                const rank = idx + 1;
                const isTopThree = rank <= 3;

                return (
                  <tr
                    key={supplier._id}
                    className={`transition-colors ${isTopThree ? rankBg[idx] : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-2.5 px-2">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          isTopThree
                            ? `${rankColors[idx]} bg-white shadow-sm border border-slate-100`
                            : 'text-slate-500 bg-slate-100'
                        }`}
                      >
                        {rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {supplier.farmerCode}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-800 font-medium">
                      {supplier.farmerName}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-green-700">
                      {supplier.totalLiters.toFixed(1)} L
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Default Export: All Charts ───────────────────────────────────────────────

export default function AnalyticsCharts({
  dailyTrend,
  shiftComparison,
  topSuppliers,
}: AnalyticsChartsProps) {
  return (
    <div className="space-y-6">
      <DailyTrendChart data={dailyTrend} />
      <ShiftComparisonChart data={shiftComparison} />
      <TopSuppliersTable data={topSuppliers} />
    </div>
  );
}
