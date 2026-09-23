/**
 * Formats a number as Nepali Rupee currency string.
 * Example: 1234.5 → "Rs. 1,234.50"
 */
export function formatCurrency(amount: number): string {
  return (
    'Rs. ' +
    amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

import { formatNepaliDate } from './nepaliDate';

/**
 * Formats a date into a human-readable Nepali Bikram Sambat (BS) date.
 * Example: "2026-09-22" or "2083-06-06" → "२०८३ असोज ०६"
 */
export function formatDate(date: string | Date, format: 'devanagari' | 'full' | 'medium' | 'short' = 'devanagari'): string {
  return formatNepaliDate(date, format);
}

/**
 * Returns the current shift based on the current local hour.
 * hour < 12 → 'morning', hour >= 12 → 'evening'
 */
export function getAutoShift(): 'morning' | 'evening' {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : 'evening';
}

/**
 * Normalizes a Date or date string to a YYYY-MM-DD string in local time.
 * Avoids UTC offset issues when converting Date objects to date strings.
 */
export function normalizeDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Utility for conditionally joining Tailwind class names.
 * Filters out falsy values and joins the rest with a space.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
