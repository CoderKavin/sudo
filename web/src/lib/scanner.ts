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
}

export interface ScanResults {
  breaches: ScannedBreach[];
  dataBrokers: ScannedDataBroker[];
  privacyScore: number;
  breachSource: 'real' | 'mock';
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
// Privacy score
// ---------------------------------------------------------------------------

function calculatePrivacyScore(
  breaches: ScannedBreach[],
  brokers: ScannedDataBroker[],
): number {
  let score = 100;

  for (const b of breaches) {
    if (b.severity === 'critical') score -= 12;
    else if (b.severity === 'high') score -= 8;
    else if (b.severity === 'medium') score -= 5;
    else score -= 2;
  }

  score -= brokers.length * 1.5;

  return Math.max(5, Math.min(100, Math.round(score)));
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
  }));

  const privacyScore = calculatePrivacyScore(breaches, dataBrokers);

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
