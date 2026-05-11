import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/supabase';

const QUEUE_KEY = 'statstream-offline-queue';

// ── Queue helpers ─────────────────────────────────────────────────────────────
const loadQueue = () => {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
  catch { return []; }
};

const saveQueue = (q) => {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
  catch (e) { console.warn('Queue save failed:', e); }
};

const clearQueue = () => {
  try { localStorage.removeItem(QUEUE_KEY); }
  catch {}
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useOfflineQueue = () => {
  const [isOnline,    setIsOnline]    = useState(navigator.onLine);
  const [isSyncing,   setIsSyncing]   = useState(false);
  const [queueLength, setQueueLength] = useState(() => loadQueue().length);
  const syncingRef = useRef(false);

  // Sync queue to Supabase — processes all pending saves in order
  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    const queue = loadQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);
    console.log(`Syncing ${queue.length} queued saves...`);

    const failed = [];

    for (const item of queue) {
      try {
        const { error } = await supabase
          .from('games')
          .update(item.payload)
          .eq('id', item.gameId);

        if (error) {
          console.warn('Sync item failed:', error);
          failed.push(item);
        }
      } catch (e) {
        console.warn('Sync item threw:', e);
        failed.push(item);
      }
    }

    // Keep only failed items — successfully synced ones are removed
    saveQueue(failed);
    setQueueLength(failed.length);
    setIsSyncing(false);
    syncingRef.current = false;

    if (failed.length === 0) {
      console.log('Queue fully synced ✓');
    } else {
      console.warn(`${failed.length} items failed to sync`);
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync on mount if online and queue has items
    if (navigator.onLine && loadQueue().length > 0) {
      syncQueue();
    }

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue]);

  // Enqueue a save — stores in localStorage, returns immediately
  const enqueue = useCallback((gameId, payload) => {
    const queue = loadQueue();
    // Replace any existing entry for this game (keep only latest state)
    const filtered = queue.filter(item => item.gameId !== gameId);
    const newQueue = [...filtered, {
      gameId,
      payload,
      timestamp: Date.now(),
    }];
    saveQueue(newQueue);
    setQueueLength(newQueue.length);
  }, []);

  // Save with offline fallback — tries Supabase, falls back to queue
  const saveWithFallback = useCallback(async (gameId, payload) => {
    // Always write to local queue first as safety net
    enqueue(gameId, payload);

    if (!navigator.onLine) {
      return { success: true, offline: true };
    }

    try {
      const { data, error } = await supabase
        .from('games')
        .update(payload)
        .eq('id', gameId)
        .select()
        .single();

      if (error) throw error;

      // Success — remove from queue since it saved online
      const queue = loadQueue();
      saveQueue(queue.filter(item => item.gameId !== gameId));
      setQueueLength(q => Math.max(0, q - 1));

      return { success: true, offline: false, data };
    } catch (e) {
      console.warn('Online save failed, staying in queue:', e.message);
      return { success: true, offline: true };
    }
  }, [enqueue]);

  return {
    isOnline,
    isSyncing,
    queueLength,
    saveWithFallback,
    syncQueue,
    enqueue,
  };
};
