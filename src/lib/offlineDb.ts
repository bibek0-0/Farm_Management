/**
 * Offline & Local Storage types for Lawanyabati Krishi Farm Management System
 */

export interface LocalMilkEntry {
  id?: string;
  farmerId: string;
  farmerCode?: string;
  farmerName?: string;
  date: string; // YYYY-MM-DD (Nepali BS or AD)
  shift: 'morning' | 'evening';
  quantityLiters: number;
  ratePerLiter: number;
  totalAmount: number;
  fat?: number | null;
  snf?: number | null;
  synced?: boolean;
  updatedAt?: number;
}

export interface QualityPricingSettings {
  fatFactor: number;    // e.g. 5.5 Rs per unit
  snfFactor: number;    // e.g. 3.2 Rs per unit
  minBaseRate: number;  // minimum base rate fallback (e.g. 0 or 40)
  enableQualityMode: boolean;
}

export const DEFAULT_QUALITY_SETTINGS: QualityPricingSettings = {
  fatFactor: 5.5,
  snfFactor: 3.2,
  minBaseRate: 0,
  enableQualityMode: false,
};

const SETTINGS_KEY = 'lawanyabati_quality_pricing_settings';

export function getStoredQualitySettings(): QualityPricingSettings {
  if (typeof window === 'undefined') return DEFAULT_QUALITY_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_QUALITY_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      fatFactor: typeof parsed.fatFactor === 'number' ? parsed.fatFactor : DEFAULT_QUALITY_SETTINGS.fatFactor,
      snfFactor: typeof parsed.snfFactor === 'number' ? parsed.snfFactor : DEFAULT_QUALITY_SETTINGS.snfFactor,
      minBaseRate: typeof parsed.minBaseRate === 'number' ? parsed.minBaseRate : DEFAULT_QUALITY_SETTINGS.minBaseRate,
      enableQualityMode: typeof parsed.enableQualityMode === 'boolean' ? parsed.enableQualityMode : DEFAULT_QUALITY_SETTINGS.enableQualityMode,
    };
  } catch {
    return DEFAULT_QUALITY_SETTINGS;
  }
}

export function saveStoredQualitySettings(settings: Partial<QualityPricingSettings>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredQualitySettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save quality settings to localStorage', e);
  }
}
