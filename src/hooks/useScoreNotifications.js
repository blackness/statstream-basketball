import { useEffect, useRef } from 'react';

// Register service worker once
async function registerSW() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (e) {
    console.warn('SW registration failed:', e);
    return null;
  }
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function useScoreNotifications({ enabled, homeTeam, awayTeam, period }) {
  const swRegRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    registerSW().then(reg => { swRegRef.current = reg; });
  }, [enabled]);

  const notifyScore = async (scorer, points, homeScore, awayScore) => {
    if (!enabled) return;
    if (Notification.permission !== 'granted') return;
    const sw = swRegRef.current || await registerSW();
    if (!sw) return;
    navigator.serviceWorker.controller?.postMessage({
      type: 'SCORE_UPDATE',
      homeTeam, awayTeam, homeScore, awayScore,
      period, scorer, points,
    });
  };

  return { notifyScore };
}
