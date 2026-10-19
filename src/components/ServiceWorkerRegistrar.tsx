'use client';

/**
 * ServiceWorkerRegistrar
 * Registers the service worker on mount and listens for SYNC_COMPLETE
 * messages from the SW so the page can refresh entries after a background sync.
 */

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Register the service worker
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[SW] Registered, scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });

    // Listen for messages from the service worker (e.g., SYNC_COMPLETE)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        console.log('[SW] Background sync complete, synced:', event.data.count, 'entries');
        // Dispatch a custom event so any component can react
        window.dispatchEvent(new CustomEvent('sw-sync-complete', { detail: event.data }));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  return null;
}
