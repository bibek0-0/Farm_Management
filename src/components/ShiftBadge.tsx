'use client';

import { Sun, Moon } from 'lucide-react';

interface ShiftBadgeProps {
  shift: 'morning' | 'evening';
  size?: 'sm' | 'md';
}

export default function ShiftBadge({ shift, size = 'md' }: ShiftBadgeProps) {
  const isMorning = shift === 'morning';

  const containerClass =
    size === 'sm'
      ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium'
      : 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium';

  const iconSize = size === 'sm' ? 12 : 14;

  if (isMorning) {
    return (
      <span className={`${containerClass} bg-amber-100 text-amber-700`}>
        <Sun size={iconSize} className="text-amber-500 flex-shrink-0" />
        Morning
      </span>
    );
  }

  return (
    <span className={`${containerClass} bg-indigo-100 text-indigo-700`}>
      <Moon size={iconSize} className="text-indigo-500 flex-shrink-0" />
      Evening
    </span>
  );
}
