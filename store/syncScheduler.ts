import { useAuthStore } from './useAuthStore';

/** Debounced background sync after local mutations when signed in. */
let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSync() {
  if (!useAuthStore.getState().user) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    // Dynamic import avoids a circular dependency with useSyncStore ↔ task/habit stores
    void import('./useSyncStore').then(({ useSyncStore }) => {
      useSyncStore.getState().syncAll();
    });
  }, 800);
}
