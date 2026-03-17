// ============================================================
// Continuous dark web monitoring
// Periodically checks if it's time to re-scan and triggers
// automatic dark web scans based on the user's configured interval
// ============================================================

import { useEffect, useRef } from 'react';
import { scanDarkWeb } from './darkWebMonitor';
import { sendDarkWebAlert } from './notifications';
import { useStore } from '../store/useStore';

type Store = ReturnType<typeof useStore.getState>;

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // poll every 5 minutes

/**
 * Determines whether a scan is due and, if so, runs one.
 * Safe to call frequently — it short-circuits when monitoring is
 * disabled, a scan is already running, or the interval hasn't elapsed.
 */
export async function startMonitoring(store: Store): Promise<void> {
  const {
    monitoringEnabled,
    monitoringInterval,
    darkWebLastChecked,
    darkWebScanning,
    darkWebAlerts: existingAlerts,
    connectedEmails,
    notificationsEnabled,
    notificationEmail,
    notificationTypes,
    setDarkWebScanning,
    setDarkWebAlerts,
  } = store;

  // Gate checks
  if (!monitoringEnabled) return;
  if (darkWebScanning) return;

  const emails = connectedEmails
    .filter((e) => e.connected)
    .map((e) => e.email);

  if (emails.length === 0) return;

  // Check if enough time has passed
  const intervalMs = (monitoringInterval || 24) * 60 * 60 * 1000;
  if (darkWebLastChecked) {
    const elapsed = Date.now() - new Date(darkWebLastChecked).getTime();
    if (elapsed < intervalMs) return;
  }

  // Time to scan
  try {
    setDarkWebScanning(true);
    const alerts = await scanDarkWeb(emails);

    // Preserve resolved state
    const existingResolved = new Set(existingAlerts.filter(a => a.resolved).map(a => a.id));
    const merged = alerts.map(a => existingResolved.has(a.id) ? { ...a, resolved: true } : a);
    setDarkWebAlerts(merged);

    // Send email notification for new alerts
    const existingIds = new Set(existingAlerts.map(a => a.id));
    const newAlerts = merged.filter(a => !existingIds.has(a.id) && !a.resolved);
    if (
      newAlerts.length > 0 &&
      notificationsEnabled &&
      notificationEmail &&
      notificationTypes.includes('dark_web')
    ) {
      sendDarkWebAlert(notificationEmail, newAlerts).catch(() => {});
    }
  } catch {
    // Silently fail — will retry on the next check cycle
  } finally {
    setDarkWebScanning(false);
  }
}

/**
 * React hook that starts continuous dark web monitoring.
 * Checks on mount and then every 5 minutes to see if a scan is due.
 */
export function useMonitoring(): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Run an immediate check
    startMonitoring(useStore.getState());

    // Set up periodic checks
    intervalRef.current = setInterval(() => {
      startMonitoring(useStore.getState());
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);
}
