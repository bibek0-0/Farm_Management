/**
 * Service Worker for Lawanyabati Krishi Farm
 * Provides offline caching, background sync for milk entries, and PWA support.
 */

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `lkfarm-static-${CACHE_VERSION}`;
const API_CACHE = `lkfarm-api-${CACHE_VERSION}`;
const SYNC_TAG = 'sync-milk-entries';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard/entry',
  '/dashboard/analytics',
  '/manifest.json',
  '/offline.html',
];

// API endpoints that should be cached (GET only)
const CACHEABLE_API_PATTERNS = [
  /\/api\/farmers/,
  /\/api\/entries/,
  /\/api\/sales/,
];

// ─── Install Event ──────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Cache what we can, ignore failures for individual assets
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) =>
            console.warn('[SW] Could not cache:', url, err)
          )
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate Event ─────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch Event ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET for caching (POST/PUT/DELETE go directly to network)
  if (request.method !== 'GET') return;

  // Skip Next.js internal routes
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // API routes: network-first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    const isCacheable = CACHEABLE_API_PATTERNS.some((p) => p.test(url.pathname));
    if (isCacheable) {
      event.respondWith(networkFirst(request, API_CACHE, 5000));
    }
    return;
  }

  // Page navigations: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, STATIC_CACHE).catch(() =>
        caches.match('/offline.html').then((r) => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// ─── Network-First Strategy ─────────────────────────────────────────────────
async function networkFirst(request, cacheName, timeoutMs = 8000) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await Promise.race([
      fetch(request.clone()),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), timeoutMs)
      ),
    ]);

    if (networkResponse && networkResponse.ok) {
      // Only cache same-origin responses
      if (new URL(request.url).origin === self.location.origin) {
        cache.put(request, networkResponse.clone()).catch(() => {});
      }
    }
    return networkResponse;
  } catch {
    // Network failed — try cache
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }
    throw new Error('No cache available');
  }
}

// ─── Background Sync ─────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    console.log('[SW] Background sync triggered:', SYNC_TAG);
    event.waitUntil(syncPendingEntries());
  }
});

async function syncPendingEntries() {
  try {
    const db = await openIndexedDB();
    const pendingEntries = await getAllPendingEntries(db);

    if (pendingEntries.length === 0) {
      console.log('[SW] No pending entries to sync.');
      return;
    }

    console.log('[SW] Syncing', pendingEntries.length, 'pending entries...');

    // Map to API shape
    const apiEntries = pendingEntries.map((e) => ({
      farmerId: e.farmerId,
      date: e.date,
      shift: e.shift,
      quantity: e.quantityLiters,
      quantityLiters: e.quantityLiters,
      rate: e.ratePerLiter,
      ratePerLiter: e.ratePerLiter,
      fat: e.fat ?? null,
      snf: e.snf ?? null,
    }));

    const response = await fetch('/api/entries/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: apiEntries }),
    });

    if (response.ok) {
      // Delete synced entries from IDB
      await markEntriesSynced(db, pendingEntries.map((e) => e.localId));
      console.log('[SW] Sync successful, cleared', pendingEntries.length, 'entries.');

      // Notify all clients so the UI can refresh
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          count: pendingEntries.length,
        });
      });
    } else {
      console.error('[SW] Sync failed with status:', response.status);
    }
  } catch (err) {
    console.error('[SW] Sync error:', err);
    throw err; // Re-throw to let the browser retry
  }
}

// ─── IndexedDB helpers ───────────────────────────────────────────────────────
// NOTE: version must match IDB_VERSION in src/lib/offlineDb.ts (currently 2)
const IDB_NAME = 'lkfarm-offline';
const IDB_VERSION = 2;
const STORE_ENTRIES = 'pending_entries';

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const store = db.createObjectStore(STORE_ENTRIES, { keyPath: 'localId', autoIncrement: true });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('date_shift', ['date', 'shift'], { unique: false });
        store.createIndex('farmer_date_shift', ['farmerId', 'date', 'shift'], { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllPendingEntries(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const store = tx.objectStore(STORE_ENTRIES);
    const idx = store.index('synced');
    const req = idx.getAll(0); // synced=0 means pending
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function markEntriesSynced(db, localIds) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readwrite');
    const store = tx.objectStore(STORE_ENTRIES);
    let remaining = localIds.length;
    if (remaining === 0) { resolve(); return; }
    localIds.forEach((id) => {
      const req = store.delete(id);
      req.onsuccess = () => { if (--remaining === 0) resolve(); };
      req.onerror = () => reject(req.error);
    });
  });
}
