// ============================================================
// Vanish scanning engine
// Uses real breach + broker APIs — no mock data
// ============================================================

import {
  SCAN_STAGES,
} from './mockData';

import { fetchRealBreaches } from './breachApi';
import { analyzeBrokerExposure } from './brokerCheck';


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
  confidence?: 'confirmed' | 'likely' | 'possible';
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
  // ── Breach penalty: diminishing returns so the score doesn't immediately
  //    flatline to 5 with a handful of breaches.
  //    Each unresolved breach adds weight, but the total penalty is capped at 45
  //    using a logarithmic curve: penalty = 45 * (1 - e^(-rawWeight / 40))
  //    This means: 1 critical = ~12 pts, 5 critical = ~33 pts, 20+ = ~44 pts
  let rawBreachWeight = 0;
  let rawResolvedWeight = 0;

  for (const b of breaches) {
    const weight = b.severity === 'critical' ? 12
      : b.severity === 'high' ? 8
      : b.severity === 'medium' ? 5 : 2;
    if (b.resolved) {
      rawResolvedWeight += weight;
    } else {
      rawBreachWeight += weight;
    }
  }

  const breachPenalty = Math.round(45 * (1 - Math.exp(-rawBreachWeight / 40)));
  const resolvedBonus = Math.round(15 * (1 - Math.exp(-rawResolvedWeight / 30)));

  // ── Broker penalty: same diminishing curve, capped at 40.
  //    5 brokers = ~10 pts, 20 brokers = ~25 pts, 50+ = ~37 pts
  const activeBrokers = brokers.filter(b => b.status === 'found').length;
  const removedBrokers = brokers.filter(b => b.status === 'removed').length;
  const brokerPenalty = Math.round(25 * (1 - Math.exp(-activeBrokers / 30)));
  const removedBrokerBonus = Math.round(10 * (1 - Math.exp(-removedBrokers / 10)));

  const total = Math.max(5, Math.min(100, Math.round(
    100 - breachPenalty - brokerPenalty + resolvedBonus + removedBrokerBonus
  )));

  return { total, breachPenalty, brokerPenalty, resolvedBonus, removedBrokerBonus };
}

// ---------------------------------------------------------------------------
// Main scan function
// ---------------------------------------------------------------------------

export async function simulateScan(
  email: string,
  onProgress: (progress: number, stage: string) => void,
): Promise<ScanResults> {
  const totalDuration = 4500;

  // Start ALL network requests in parallel with the progress animation
  const breachPromise = fetchRealBreaches(email);
  // Broker analysis starts immediately too (it fetches /api/broker-check in parallel)
  // We pass an empty breach array initially — we'll re-score after breaches resolve
  const brokerLiveCheckPromise = analyzeBrokerExposure(email, []);

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

  // --- Data brokers: now re-run with real breach data for proper scoring ---
  // The live checks already completed during the animation, so this second call
  // is fast (live check fetch will hit cache or resolve from the first call).
  // But we need breaches for accurate confidence scoring.
  let dataBrokers: ScannedDataBroker[];
  if (breaches.length > 0) {
    dataBrokers = await analyzeBrokerExposure(email, breaches);
  } else {
    // No breaches — use the results from the initial call (email-only heuristic)
    dataBrokers = await brokerLiveCheckPromise;
  }

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
