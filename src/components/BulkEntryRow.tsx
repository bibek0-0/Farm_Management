'use client';

import { memo } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface BulkEntryRowProps {
  index: number;
  farmer: {
    _id: string;
    farmerCode: string;
    name: string;
    defaultRate: number;
  };
  quantity: string;
  rate: string;
  onQuantityChange: (value: string) => void;
  onRateChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, field: 'quantity' | 'rate') => void;
  quantityRef: React.RefCallback<HTMLInputElement>;
  rateRef: React.RefCallback<HTMLInputElement>;
  isExisting: boolean;
}

function formatAmount(qty: string, rate: string): string {
  const q = parseFloat(qty);
  const r = parseFloat(rate);
  if (isNaN(q) || isNaN(r) || q <= 0 || r <= 0) return '—';
  const total = q * r;
  return `Rs. ${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function computedAmount(qty: string, rate: string): number {
  const q = parseFloat(qty);
  const r = parseFloat(rate);
  if (isNaN(q) || isNaN(r)) return 0;
  return q * r;
}

const BulkEntryRow = memo(function BulkEntryRow({
  index,
  farmer,
  quantity,
  rate,
  onQuantityChange,
  onRateChange,
  onKeyDown,
  quantityRef,
  rateRef,
  isExisting,
}: BulkEntryRowProps) {
  const isEven = index % 2 === 0;
  const hasEntry = quantity.trim() !== '' && parseFloat(quantity) > 0;
  const amount = computedAmount(quantity, rate);

  const rowBg = isExisting
    ? 'bg-green-50 border-l-2 border-l-green-400'
    : isEven
    ? 'bg-white'
    : 'bg-slate-50/60';

  // ── Desktop Table Row ─────────────────────────────────────────────────────
  return (
    <>
      {/* Desktop */}
      <tr className={`hidden md:table-row group transition-colors ${rowBg}`}>
        {/* Index */}
        <td className="py-2.5 px-3 text-center">
          <span className="text-xs font-medium text-slate-400 tabular-nums">{index + 1}</span>
        </td>

        {/* Farmer Code */}
        <td className="py-2.5 px-3">
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
            {farmer.farmerCode}
          </span>
        </td>

        {/* Farmer Name */}
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm text-slate-800 font-medium truncate max-w-[160px]">
              {farmer.name}
            </span>
            {isExisting && (
              <CheckCircle2
                size={13}
                className="text-green-500 flex-shrink-0"
                aria-label="Entry already recorded"
              />
            )}
          </div>
        </td>

        {/* Quantity Input */}
        <td className="py-2 px-2 w-28">
          <input
            ref={quantityRef}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            placeholder="0.0"
            value={quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            onKeyDown={(e) => onKeyDown(e, 'quantity')}
            onFocus={(e) => e.target.select()}
            className={`w-full text-right font-mono text-sm px-2.5 py-1.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-slate-300 ${
              hasEntry
                ? 'border-green-300 bg-green-50 text-green-800'
                : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
            }`}
            aria-label={`Quantity for ${farmer.name}`}
          />
        </td>

        {/* Rate Input */}
        <td className="py-2 px-2 w-28">
          <input
            ref={rateRef}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            placeholder="0.00"
            value={rate}
            onChange={(e) => onRateChange(e.target.value)}
            onKeyDown={(e) => onKeyDown(e, 'rate')}
            onFocus={(e) => e.target.select()}
            className="w-full text-right font-mono text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-slate-300"
            aria-label={`Rate for ${farmer.name}`}
          />
        </td>

        {/* Amount */}
        <td className="py-2.5 px-3 text-right">
          <span
            className={`font-mono text-sm tabular-nums font-semibold ${
              amount > 0 ? 'text-green-700' : 'text-slate-300'
            }`}
          >
            {formatAmount(quantity, rate)}
          </span>
        </td>
      </tr>

      {/* Mobile Card */}
      <div
        className={`md:hidden rounded-xl border mb-2 overflow-hidden transition-all ${
          isExisting
            ? 'border-green-300 bg-green-50'
            : 'border-slate-200 bg-white'
        }`}
      >
        {/* Card Header */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 ${
            isExisting ? 'bg-green-100/70' : isEven ? 'bg-slate-50' : 'bg-white'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-slate-400 tabular-nums">#{index + 1}</span>
            <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
              {farmer.farmerCode}
            </span>
            <span className="text-sm font-semibold text-slate-800 truncate">{farmer.name}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isExisting && (
              <CheckCircle2 size={14} className="text-green-500" aria-label="Entry recorded" />
            )}
            <span
              className={`text-sm font-mono font-bold tabular-nums ${
                amount > 0 ? 'text-green-700' : 'text-slate-300'
              }`}
            >
              {formatAmount(quantity, rate)}
            </span>
          </div>
        </div>

        {/* Card Inputs */}
        <div className="flex gap-3 px-4 py-3">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Quantity (L)
            </label>
            <input
              ref={quantityRef}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder="0.0"
              value={quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
              onKeyDown={(e) => onKeyDown(e, 'quantity')}
              onFocus={(e) => e.target.select()}
              className={`w-full text-right font-mono text-base px-3 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-slate-300 ${
                hasEntry
                  ? 'border-green-300 bg-green-50 text-green-800'
                  : 'border-slate-200 bg-white text-slate-800'
              }`}
              style={{ minHeight: '44px' }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Rate (Rs./L)
            </label>
            <input
              ref={rateRef}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              placeholder="0.00"
              value={rate}
              onChange={(e) => onRateChange(e.target.value)}
              onKeyDown={(e) => onKeyDown(e, 'rate')}
              onFocus={(e) => e.target.select()}
              className="w-full text-right font-mono text-base px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-slate-300"
              style={{ minHeight: '44px' }}
            />
          </div>
        </div>
      </div>
    </>
  );
});

export default BulkEntryRow;
