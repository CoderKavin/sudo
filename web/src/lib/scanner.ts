// ============================================================
// Vanish scanning engine
// Uses real breach API when available, falls back to mock data
// ============================================================

import {
  DATA_BROKERS,
  SCAN_STAGES,
} from './mockData';

import { fetchRealBreaches } from './breachApi';

import type {
  DataBrokerEntry,
} from './mockData';

// ---------------------------------------------------------------------------
// Types returned by the scanner
// ---------------------------------------------------------------------------

export interface ScannedBreach {
  id: string;
  name: string;
  email: string;
  date: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dataTypes: string[];
  resolved: boolean;
}

export interface ScannedDataBroker {
  id: string;
  name: string;
  email: string;
  status: 'found' | 'removing' | 'removed';
  dataTypes: string[];
  url: string;
  optOutUrl: string | null;
}

export interface ScanResults {
  breaches: ScannedBreach[];
  dataBrokers: ScannedDataBroker[];
  privacyScore: number;
  breachSource: 'real' | 'mock';
}

// ---------------------------------------------------------------------------
// Score breakdown — shows what's affecting the score
// ---------------------------------------------------------------------------

export interface ScoreBreakdown {
  total: number;
  breachPenalty: number;
  brokerPenalty: number;
  resolvedBonus: number;
  removedBrokerBonus: number;
}

export function calculateScoreBreakdown(
  breaches: ScannedBreach[],
  brokers: ScannedDataBroker[],
): ScoreBreakdown {
  let breachPenalty = 0;
  let resolvedBonus = 0;

  for (const b of breaches) {
    const penalty = b.severity === 'critical' ? 12
      : b.severity === 'high' ? 8
      : b.severity === 'medium' ? 5 : 2;
    if (b.resolved) {
      resolvedBonus += Math.round(penalty * 0.7); // recovering 70% for resolved
    } else {
      breachPenalty += penalty;
    }
  }

  const activeBrokers = brokers.filter(b => b.status === 'found').length;
  const removedBrokers = brokers.filter(b => b.status === 'removed').length;
  const brokerPenalty = Math.round(activeBrokers * 1.5);
  const removedBrokerBonus = Math.round(removedBrokers * 1);

  const total = Math.max(5, Math.min(100, Math.round(
    100 - breachPenalty - brokerPenalty + resolvedBonus + removedBrokerBonus
  )));

  return { total, breachPenalty, brokerPenalty, resolvedBonus, removedBrokerBonus };
}

// ---------------------------------------------------------------------------
// Deterministic hash + seeded PRNG
// ---------------------------------------------------------------------------

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

function createRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// ---------------------------------------------------------------------------
// Main scan function
// ---------------------------------------------------------------------------

export async function simulateScan(
  email: string,
  onProgress: (progress: number, stage: string) => void,
): Promise<ScanResults> {
  const seed = hashString(email);
  const rng = createRng(seed);

  const totalDuration = 4000;

  // Start real breach API call in parallel with progress animation
  const breachPromise = fetchRealBreaches(email);

  // Walk through scan stages with animated progress
  for (let i = 0; i < SCAN_STAGES.length; i++) {
    const stage = SCAN_STAGES[i];
    const prevEnd = i > 0 ? SCAN_STAGES[i - 1].progressEnd : 0;
    const stageDuration = ((stage.progressEnd - prevEnd) / 100) * totalDuration;
    const steps = Math.max(3, Math.ceil(stageDuration / 80));
    const stepDuration = stageDuration / steps;

    for (let s = 0; s <= steps; s++) {
      const stageProgress = prevEnd + ((stage.progressEnd - prevEnd) * s) / steps;
      onProgress(Math.round(stageProgress), stage.message);
      await sleep(stepDuration);
    }
  }

  // --- Breaches: real API data ---
  const realBreaches = await breachPromise;
  const breachSource: 'real' | 'mock' = realBreaches !== null ? 'real' : 'mock';
  const breaches = realBreaches !== null ? realBreaches : [];

  // --- Data brokers: real broker list, deterministically selected per email ---
  const brokerCount = 10 + Math.floor(rng() * (DATA_BROKERS.length - 10 + 1));
  const selectedBrokers = pickN<DataBrokerEntry>(DATA_BROKERS, brokerCount, rng);
  const dataBrokers: ScannedDataBroker[] = selectedBrokers.map((br, idx) => ({
    id: `broker-${seed}-${idx}`,
    name: br.name,
    email,
    status: 'found' as const,
    dataTypes: br.dataTypes,
    url: br.url,
    optOutUrl: br.optOutUrl,
  }));

  const { total: privacyScore } = calculateScoreBreakdown(breaches, dataBrokers);

  return {
    breaches,
    dataBrokers,
    privacyScore,
    breachSource,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
