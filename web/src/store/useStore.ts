// ============================================================
// Zustand store for the Vanish digital footprint scanner
// Persisted to localStorage so scan results survive refresh
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ScannedBreach,
  ScannedDataBroker,
  ScoreBreakdown,
} from '../lib/scanner';
import { calculateScoreBreakdown } from '../lib/scanner';
import type {
  DiscoveredAccount,
  TrackedSubscription,
} from '../lib/extensionBridge';

// ---------------------------------------------------------------------------
// Connected email type
// ---------------------------------------------------------------------------

export interface ConnectedEmail {
  email: string;
  provider: 'gmail' | 'outlook' | 'yahoo' | 'other';
  connected: boolean;
  lastScanned: string | null;
  breachCount: number;
}

export interface ScoreSnapshot {
  date: string;       // ISO date string
  score: number;
  breachCount: number;
  brokerCount: number;
}

// Tracks which remediation steps have been completed per breach
export type RemediationProgress = Record<string, string[]>; // breachId -> completed step ids

export interface DarkWebAlert {
  id: string;
  email: string;
  type: 'credentials' | 'personal_info' | 'financial' | 'medical';
  source: string;
  description: string;
  date: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export type NotificationType = 'breach_alert' | 'dark_web' | 'weekly_summary';

// ---------------------------------------------------------------------------
// Store state & actions
// ---------------------------------------------------------------------------

interface VanishState {
  // Data
  breaches: ScannedBreach[];
  dataBrokers: ScannedDataBroker[];
  connectedEmails: ConnectedEmail[];

  // Extension data (accounts + subscriptions from Chrome extension)
  discoveredAccounts: DiscoveredAccount[];
  trackedSubscriptions: TrackedSubscription[];
  extensionConnected: boolean;
  extensionEmail: string | null;

  // Scan state
  scanState: 'idle' | 'connecting' | 'scanning' | 'complete';
  scanProgress: number;
  scanStage: string;

  // Privacy
  privacyScore: number;
  scoreHistory: ScoreSnapshot[];
  scoreBreakdown: ScoreBreakdown;

  // Dark web monitoring
  darkWebAlerts: DarkWebAlert[];
  darkWebLastChecked: string | null;
  darkWebScanning: boolean;
  monitoringEnabled: boolean;
  monitoringInterval: number; // hours

  // Notifications
  notificationEmail: string | null;
  notificationsEnabled: boolean;
  notificationTypes: NotificationType[];

  // Remediation tracking
  remediationProgress: RemediationProgress;

  // Actions
  addEmail: (email: ConnectedEmail) => void;
  removeEmail: (email: string) => void;
  startScan: () => void;
  updateProgress: (progress: number, stage?: string) => void;
  setScanComplete: () => void;
  setBreaches: (breaches: ScannedBreach[]) => void;
  setDataBrokers: (dataBrokers: ScannedDataBroker[]) => void;
  updatePrivacyScore: (score: number) => void;
  addScoreSnapshot: (snapshot: ScoreSnapshot) => void;
  markBreachResolved: (breachId: string) => void;
  markBrokerRemoving: (brokerId: string) => void;
  markBrokerRemoved: (brokerId: string) => void;
  setDiscoveredAccounts: (accounts: DiscoveredAccount[]) => void;
  setTrackedSubscriptions: (subscriptions: TrackedSubscription[]) => void;
  setExtensionConnected: (connected: boolean, email?: string | null) => void;
  setDarkWebAlerts: (alerts: DarkWebAlert[]) => void;
  setDarkWebScanning: (scanning: boolean) => void;
  markDarkWebAlertResolved: (alertId: string) => void;
  setMonitoringEnabled: (enabled: boolean) => void;
  setMonitoringInterval: (hours: number) => void;
  setNotificationEmail: (email: string | null) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationTypes: (types: NotificationType[]) => void;
  toggleRemediationStep: (breachId: string, stepId: string) => void;
  clearAllData: () => void;
}

const DEFAULT_BREAKDOWN: ScoreBreakdown = { total: 0, breachPenalty: 0, brokerPenalty: 0, resolvedBonus: 0, removedBrokerBonus: 0 };

export const useStore = create<VanishState>()(
  persist(
    (set) => ({
      // Initial state
      breaches: [],
      dataBrokers: [],
      connectedEmails: [],
      discoveredAccounts: [],
      trackedSubscriptions: [],
      extensionConnected: false,
      extensionEmail: null,
      scanState: 'idle',
      scanProgress: 0,
      scanStage: '',
      privacyScore: 0,
      scoreHistory: [],
      scoreBreakdown: DEFAULT_BREAKDOWN,
      darkWebAlerts: [],
      darkWebLastChecked: null,
      darkWebScanning: false,
      monitoringEnabled: false,
      monitoringInterval: 24,
      notificationEmail: null,
      notificationsEnabled: false,
      notificationTypes: ['breach_alert', 'dark_web'],
      remediationProgress: {},

      // Actions
      addEmail: (email) =>
        set((state) => ({
          connectedEmails: state.connectedEmails.some((e) => e.email === email.email)
            ? state.connectedEmails.map((e) => e.email === email.email ? email : e)
            : [...state.connectedEmails, email],
        })),

      removeEmail: (email) =>
        set((state) => ({
          connectedEmails: state.connectedEmails.filter((e) => e.email !== email),
        })),

      startScan: () =>
        set({
          scanState: 'scanning',
          scanProgress: 0,
          scanStage: '',
        }),

      updateProgress: (progress, stage) =>
        set((state) => ({
          scanProgress: progress,
          scanStage: stage ?? state.scanStage,
        })),

      setScanComplete: () =>
        set({
          scanState: 'complete',
          scanProgress: 100,
        }),

      setBreaches: (breaches) =>
        set((state) => {
          const breakdown = calculateScoreBreakdown(breaches, state.dataBrokers);
          return { breaches, privacyScore: breakdown.total, scoreBreakdown: breakdown };
        }),

      setDataBrokers: (dataBrokers) =>
        set((state) => {
          const breakdown = calculateScoreBreakdown(state.breaches, dataBrokers);
          return { dataBrokers, privacyScore: breakdown.total, scoreBreakdown: breakdown };
        }),

      updatePrivacyScore: (score) => set({ privacyScore: score }),

      addScoreSnapshot: (snapshot) =>
        set((state) => {
          const today = snapshot.date.slice(0, 10);
          const filtered = state.scoreHistory.filter((s) => s.date.slice(0, 10) !== today);
          return { scoreHistory: [...filtered, snapshot].slice(-30) };
        }),

      markBreachResolved: (breachId) =>
        set((state) => {
          const breaches = state.breaches.map((b) =>
            b.id === breachId ? { ...b, resolved: true } : b,
          );
          const breakdown = calculateScoreBreakdown(breaches, state.dataBrokers);
          return {
            breaches,
            privacyScore: breakdown.total,
            scoreBreakdown: breakdown,
          };
        }),

      markBrokerRemoving: (brokerId) =>
        set((state) => ({
          dataBrokers: state.dataBrokers.map((b) =>
            b.id === brokerId ? { ...b, status: 'removing' as const } : b,
          ),
        })),

      markBrokerRemoved: (brokerId) =>
        set((state) => {
          const dataBrokers = state.dataBrokers.map((b) =>
            b.id === brokerId ? { ...b, status: 'removed' as const } : b,
          );
          const breakdown = calculateScoreBreakdown(state.breaches, dataBrokers);
          return {
            dataBrokers,
            privacyScore: breakdown.total,
            scoreBreakdown: breakdown,
          };
        }),

      setDiscoveredAccounts: (accounts) => set({ discoveredAccounts: accounts }),

      setTrackedSubscriptions: (subscriptions) => set({ trackedSubscriptions: subscriptions }),

      setExtensionConnected: (connected, email = null) =>
        set({ extensionConnected: connected, extensionEmail: email }),

      setDarkWebAlerts: (alerts) =>
        set({ darkWebAlerts: alerts, darkWebLastChecked: new Date().toISOString() }),

      setDarkWebScanning: (scanning) => set({ darkWebScanning: scanning }),

      markDarkWebAlertResolved: (alertId) =>
        set((state) => ({
          darkWebAlerts: state.darkWebAlerts.map((a) =>
            a.id === alertId ? { ...a, resolved: true } : a,
          ),
        })),

      setMonitoringEnabled: (enabled) => set({ monitoringEnabled: enabled }),

      setMonitoringInterval: (hours) => set({ monitoringInterval: hours }),

      setNotificationEmail: (email) => set({ notificationEmail: email }),

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      setNotificationTypes: (types) => set({ notificationTypes: types }),

      toggleRemediationStep: (breachId, stepId) =>
        set((state) => {
          const current = state.remediationProgress[breachId] || [];
          const updated = current.includes(stepId)
            ? current.filter((s) => s !== stepId)
            : [...current, stepId];
          return { remediationProgress: { ...state.remediationProgress, [breachId]: updated } };
        }),

      clearAllData: () =>
        set({
          breaches: [],
          dataBrokers: [],
          connectedEmails: [],
          discoveredAccounts: [],
          trackedSubscriptions: [],
          extensionConnected: false,
          extensionEmail: null,
          scanState: 'idle',
          scanProgress: 0,
          scanStage: '',
          privacyScore: 0,
          scoreHistory: [],
          scoreBreakdown: DEFAULT_BREAKDOWN,
          darkWebAlerts: [],
          darkWebLastChecked: null,
          darkWebScanning: false,
          monitoringEnabled: false,
          monitoringInterval: 24,
          notificationEmail: null,
          notificationsEnabled: false,
          notificationTypes: ['breach_alert', 'dark_web'],
          remediationProgress: {},
        }),
    }),
    {
      name: 'vanish-store',
      partialize: (state) => ({
        breaches: state.breaches,
        dataBrokers: state.dataBrokers,
        connectedEmails: state.connectedEmails,
        discoveredAccounts: state.discoveredAccounts,
        trackedSubscriptions: state.trackedSubscriptions,
        extensionConnected: state.extensionConnected,
        extensionEmail: state.extensionEmail,
        privacyScore: state.privacyScore,
        scoreHistory: state.scoreHistory,
        scoreBreakdown: state.scoreBreakdown,
        darkWebAlerts: state.darkWebAlerts,
        darkWebLastChecked: state.darkWebLastChecked,
        monitoringEnabled: state.monitoringEnabled,
        monitoringInterval: state.monitoringInterval,
        notificationEmail: state.notificationEmail,
        notificationsEnabled: state.notificationsEnabled,
        notificationTypes: state.notificationTypes,
        remediationProgress: state.remediationProgress,
        scanState: state.scanState === 'complete' ? 'complete' : 'idle',
      }),
    },
  ),
);

export default useStore;
