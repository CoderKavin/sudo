// ============================================================
// Zustand store for the Vanish digital footprint scanner
// ============================================================

import { create } from 'zustand';
import type {
  ScannedBreach,
  ScannedDataBroker,
} from '../lib/scanner';

// ---------------------------------------------------------------------------
// Connected email type
// ---------------------------------------------------------------------------

export interface ConnectedEmail {
  email: string;
  provider: 'gmail' | 'outlook' | 'yahoo';
  connected: boolean;
  lastScanned: string | null;
  breachCount: number;
}

// ---------------------------------------------------------------------------
// Store state & actions
// ---------------------------------------------------------------------------

interface VanishState {
  // Data
  breaches: ScannedBreach[];
  dataBrokers: ScannedDataBroker[];
  connectedEmails: ConnectedEmail[];

  // Scan state
  scanState: 'idle' | 'connecting' | 'scanning' | 'complete';
  scanProgress: number;
  scanStage: string;

  // Privacy
  privacyScore: number;

  // Actions
  addEmail: (email: ConnectedEmail) => void;
  removeEmail: (email: string) => void;
  startScan: () => void;
  updateProgress: (progress: number, stage?: string) => void;
  setScanComplete: () => void;
  setBreaches: (breaches: ScannedBreach[]) => void;
  setDataBrokers: (dataBrokers: ScannedDataBroker[]) => void;
  updatePrivacyScore: (score: number) => void;
  markBreachResolved: (breachId: string) => void;
  markBrokerRemoving: (brokerId: string) => void;
}

export const useStore = create<VanishState>((set) => ({
  // Initial state
  breaches: [],
  dataBrokers: [],
  connectedEmails: [],
  scanState: 'idle',
  scanProgress: 0,
  scanStage: '',
  privacyScore: 0,

  // Actions
  addEmail: (email) =>
    set((state) => ({
      connectedEmails: [...state.connectedEmails, email],
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

  setBreaches: (breaches) => set({ breaches }),

  setDataBrokers: (dataBrokers) => set({ dataBrokers }),

  updatePrivacyScore: (score) => set({ privacyScore: score }),

  markBreachResolved: (breachId) =>
    set((state) => ({
      breaches: state.breaches.map((b) =>
        b.id === breachId ? { ...b, resolved: true } : b,
      ),
    })),

  markBrokerRemoving: (brokerId) =>
    set((state) => ({
      dataBrokers: state.dataBrokers.map((b) =>
        b.id === brokerId ? { ...b, status: 'removing' as const } : b,
      ),
    })),
}));

export default useStore;
