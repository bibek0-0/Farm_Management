/**
 * Offline IndexedDB store for Lawanyabati Krishi Farm
 * Persists milk entries locally when offline, then syncs to server when reconnected.
 */

export interface LocalMilkEntry {
  localId?: number;           // IDB auto-increment key
  farmerId: string;
  farmerCode?: string;
  farmerName?: string;
  date: string;
  shift: 'morning' | 'evening';
  quantityLiters: number;
  ratePerLiter: number;
  totalAmount: number;
  fat?: number | null;
  snf?: number | null;
  synced: 0 | 1;             // 0 = pending, 1 = synced (not currently used; synced rows are deleted)
  createdAt: number;          // Date.now()
}

export interface LocalFarmer {
  _id: string;
  farmerCode: string;
  name: string;
  phone?: string;
  defaultRate: number;
  isActive: boolean;
  cachedAt: number;
}

export interface QualityPricingSettings {
  fatFactor: number;
  snfFactor: number;
  minBaseRate: number;
  enableQualityMode: boolean;
}

export const DEFAULT_QUALITY_SETTINGS: QualityPricingSettings = {
  fatFactor: 5.5,
  snfFactor: 3.2,
  minBaseRate: 0,
  enableQualityMode: false,
};

// ─── LocalStorage: Quality Settings ─────────────────────────────────────────
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

// ─── IndexedDB ──────────────────────────────────────────────────────────────
const IDB_NAME = 'lkfarm-offline';
const IDB_VERSION = 2;
const STORE_ENTRIES = 'pending_entries';
const STORE_FARMERS = 'farmers_cache';

let _db: IDBDatabase | null = null;

export function openOfflineDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Pending milk entries
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const store = db.createObjectStore(STORE_ENTRIES, { keyPath: 'localId', autoIncrement: true });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('date_shift', ['date', 'shift'], { unique: false });
        store.createIndex('farmer_date_shift', ['farmerId', 'date', 'shift'], { unique: false });
      }

      // Farmers cache
      if (!db.objectStoreNames.contains(STORE_FARMERS)) {
        db.createObjectStore(STORE_FARMERS, { keyPath: '_id' });
      }
    };

    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

// ─── Pending Entries CRUD ────────────────────────────────────────────────────

/** Save or update a pending entry for a farmer+date+shift (upsert by farmer/date/shift) */
export async function savePendingEntry(entry: Omit<LocalMilkEntry, 'localId' | 'synced' | 'createdAt'>): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readwrite');
    const store = tx.objectStore(STORE_ENTRIES);
    const idx = store.index('farmer_date_shift');

    const req = idx.get([entry.farmerId, entry.date, entry.shift]);
    req.onsuccess = () => {
      const existing = req.result as LocalMilkEntry | undefined;
      const record: LocalMilkEntry = {
        ...(existing ?? {}),
        ...entry,
        synced: 0,
        createdAt: existing?.createdAt ?? Date.now(),
      };
      if (existing?.localId !== undefined) record.localId = existing.localId;

      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Remove a pending entry (e.g. when qty cleared to 0) */
export async function removePendingEntry(farmerId: string, date: string, shift: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readwrite');
    const store = tx.objectStore(STORE_ENTRIES);
    const idx = store.index('farmer_date_shift');

    const req = idx.get([farmerId, date, shift]);
    req.onsuccess = () => {
      const existing = req.result as LocalMilkEntry | undefined;
      if (!existing || existing.localId === undefined) { resolve(); return; }
      const delReq = store.delete(existing.localId);
      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(delReq.error);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Get all pending (unsynced) entries */
export async function getAllPendingEntries(): Promise<LocalMilkEntry[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const store = tx.objectStore(STORE_ENTRIES);
    const idx = store.index('synced');
    const req = idx.getAll(0);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** Count pending entries */
export async function countPendingEntries(): Promise<number> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const store = tx.objectStore(STORE_ENTRIES);
    const idx = store.index('synced');
    const req = idx.count(0);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Delete specific pending entries by localId (after sync) */
export async function deletePendingEntries(localIds: number[]): Promise<void> {
  if (localIds.length === 0) return;
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readwrite');
    const store = tx.objectStore(STORE_ENTRIES);
    let done = 0;
    localIds.forEach((id) => {
      const req = store.delete(id);
      req.onsuccess = () => { if (++done === localIds.length) resolve(); };
      req.onerror = () => reject(req.error);
    });
  });
}

/** Get pending entries for a specific date+shift (to show in UI) */
export async function getPendingEntriesForDateShift(date: string, shift: string): Promise<LocalMilkEntry[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const store = tx.objectStore(STORE_ENTRIES);
    const idx = store.index('date_shift');
    const req = idx.getAll([date, shift]);
    req.onsuccess = () => resolve((req.result || []).filter((e: LocalMilkEntry) => e.synced === 0));
    req.onerror = () => reject(req.error);
  });
}

// ─── Farmers Cache ───────────────────────────────────────────────────────────

export async function cacheFarmers(farmers: LocalFarmer[]): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FARMERS, 'readwrite');
    const store = tx.objectStore(STORE_FARMERS);
    // Clear old, then re-insert
    store.clear();
    let done = 0;
    if (farmers.length === 0) { resolve(); return; }
    farmers.forEach((f) => {
      const req = store.put({ ...f, cachedAt: Date.now() });
      req.onsuccess = () => { if (++done === farmers.length) resolve(); };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getCachedFarmers(): Promise<LocalFarmer[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FARMERS, 'readonly');
    const store = tx.objectStore(STORE_FARMERS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ─── Background Sync Registration ───────────────────────────────────────────

/** Register a background sync with the service worker */
export async function registerBackgroundSync(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    // @ts-expect-error - SyncManager not yet in all TS types
    if (reg.sync) {
      // @ts-expect-error
      await reg.sync.register('sync-milk-entries');
      console.log('[OfflineDB] Background sync registered.');
      return true;
    }
  } catch (err) {
    console.warn('[OfflineDB] Background sync registration failed:', err);
  }
  return false;
}

/** Manually sync pending entries (fallback when Background Sync API not available) */
export async function manualSync(): Promise<{ synced: number; failed: number }> {
  const pending = await getAllPendingEntries();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  try {
    const response = await fetch('/api/entries/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: pending }),
    });

    if (response.ok) {
      const localIds = pending.map((e) => e.localId!).filter(Boolean);
      await deletePendingEntries(localIds);
      return { synced: pending.length, failed: 0 };
    } else {
      return { synced: 0, failed: pending.length };
    }
  } catch {
    return { synced: 0, failed: pending.length };
  }
}
