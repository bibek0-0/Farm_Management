'use client';

import { useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  NEPALI_MONTHS_NP,
  NEPALI_MONTHS_EN,
  toNepaliDigits,
  getTodayBS,
  subtractDaysBS,
  formatNepaliDate,
} from '@/lib/nepaliDate';

interface NepaliDatePickerProps {
  value: string; // YYYY-MM-DD in BS
  onChange: (bsDate: string) => void;
  maxDate?: string; // Upper bound, defaults to today's BS date
  minDate?: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

const YEARS = [2080, 2081, 2082, 2083, 2084, 2085, 2086];
const DAYS = Array.from({ length: 32 }, (_, i) => i + 1);

export default function NepaliDatePicker({
  value,
  onChange,
  maxDate,
  minDate,
  label,
  className = '',
  compact = false,
}: NepaliDatePickerProps) {
  const effectiveMaxDate = maxDate !== undefined ? maxDate : getTodayBS();

  const [year, month, day] = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parts = value.split('-').map(Number);
      return [parts[0], parts[1], parts[2]];
    }
    const today = getTodayBS().split('-').map(Number);
    return [today[0], today[1], today[2]];
  }, [value]);

  const [maxYear, maxMonth, maxDay] = useMemo(() => {
    if (effectiveMaxDate && /^\d{4}-\d{2}-\d{2}$/.test(effectiveMaxDate)) {
      const parts = effectiveMaxDate.split('-').map(Number);
      return [parts[0], parts[1], parts[2]];
    }
    return [9999, 12, 32];
  }, [effectiveMaxDate]);

  const updateDate = (newYear: number, newMonth: number, newDay: number) => {
    const yStr = String(newYear);
    const mStr = String(newMonth).padStart(2, '0');
    const dStr = String(newDay).padStart(2, '0');
    let candidate = `${yStr}-${mStr}-${dStr}`;

    // Disallow future date if maxDate is set
    if (effectiveMaxDate && candidate > effectiveMaxDate) {
      candidate = effectiveMaxDate;
    }
    if (minDate && candidate < minDate) {
      candidate = minDate;
    }

    onChange(candidate);
  };

  const handlePrevDay = () => {
    const prev = subtractDaysBS(value, 1);
    if (minDate && prev < minDate) return;
    onChange(prev);
  };

  const isNextDisabled = Boolean(effectiveMaxDate && value >= effectiveMaxDate);

  const handleNextDay = () => {
    if (isNextDisabled) return;
    const next = subtractDaysBS(value, -1);
    if (effectiveMaxDate && next > effectiveMaxDate) {
      onChange(effectiveMaxDate);
      return;
    }
    onChange(next);
  };

  const setToday = () => {
    onChange(getTodayBS());
  };

  const setYesterday = () => {
    onChange(subtractDaysBS(getTodayBS(), 1));
  };

  const todayBS = getTodayBS();
  const isToday = value === todayBS;
  const isFuture = Boolean(effectiveMaxDate && value > effectiveMaxDate);

  return (
    <div className={`inline-flex ${compact ? 'items-center' : 'flex-col gap-1'} ${className}`}>
      {label && !compact && (
        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-green-600" />
          {label}
        </label>
      )}

      <div
        title={`मिति: ${formatNepaliDate(value, 'devanagari')} (BS: ${value})`}
        className={`flex items-center gap-1 bg-white border border-slate-200 rounded-lg shadow-2xs focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent ${
          compact ? 'p-0.5' : 'p-1 rounded-xl border-slate-300 shadow-sm'
        }`}
      >
        {/* Prev day button */}
        <button
          type="button"
          onClick={handlePrevDay}
          title="अघिल्लो दिन (Previous Day)"
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition flex-shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Year Select */}
        <select
          value={year}
          onChange={(e) => updateDate(Number(e.target.value), month, day)}
          className="text-xs font-bold text-slate-800 bg-transparent py-0.5 px-0.5 rounded hover:bg-slate-50 focus:outline-none cursor-pointer"
        >
          {YEARS.map((y) => {
            const isYearFuture = y > maxYear;
            return (
              <option key={y} value={y} disabled={isYearFuture}>
                {compact ? toNepaliDigits(y) : `${toNepaliDigits(y)} (${y})`}
              </option>
            );
          })}
        </select>

        {/* Month Select */}
        <select
          value={month}
          onChange={(e) => updateDate(year, Number(e.target.value), day)}
          className="text-xs font-bold text-green-700 bg-transparent py-0.5 px-0.5 rounded hover:bg-slate-50 focus:outline-none cursor-pointer"
        >
          {NEPALI_MONTHS_NP.map((mName, idx) => {
            const mVal = idx + 1;
            const isMonthFuture = year === maxYear && mVal > maxMonth;
            return (
              <option key={mVal} value={mVal} disabled={isMonthFuture}>
                {compact ? mName : `${mName} (${NEPALI_MONTHS_EN[idx]})`}
              </option>
            );
          })}
        </select>

        {/* Day Select */}
        <select
          value={day}
          onChange={(e) => updateDate(year, month, Number(e.target.value))}
          className="text-xs font-bold text-slate-900 bg-transparent py-0.5 px-0.5 rounded hover:bg-slate-50 focus:outline-none cursor-pointer"
        >
          {DAYS.map((d) => {
            const isDayFuture = year === maxYear && month === maxMonth && d > maxDay;
            return (
              <option key={d} value={d} disabled={isDayFuture}>
                {compact ? `${toNepaliDigits(d)} गते` : `${toNepaliDigits(d)} गते (${d})`}
              </option>
            );
          })}
        </select>

        {/* Next day button (disabled if already today or future) */}
        <button
          type="button"
          onClick={handleNextDay}
          disabled={isNextDisabled}
          title={isNextDisabled ? 'भोलिको मिति छान्न मिल्दैन (Tomorrow is not allowed)' : 'पछिल्लो दिन (Next Day)'}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed rounded transition flex-shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Quick buttons: आज (Today) / हिजो (Yesterday) */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1 ml-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={setToday}
            className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition ${
              isToday
                ? 'bg-green-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            आज
          </button>
          {!compact && (
            <button
              type="button"
              onClick={setYesterday}
              className="px-1.5 py-0.5 text-[11px] font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            >
              हिजो
            </button>
          )}
        </div>
      </div>

      {/* Formatted display pill (hidden in compact mode) */}
      {!compact && (
        <div className="flex items-center gap-2 pl-1">
          <span className="text-[11px] font-medium text-slate-500">
            मिति: <strong className="text-slate-800">{formatNepaliDate(value, 'devanagari')}</strong> (BS: {value})
          </span>
          {isFuture && (
            <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
              ⚠️ भविष्यको मिति मान्य छैन
            </span>
          )}
        </div>
      )}
    </div>
  );
}
