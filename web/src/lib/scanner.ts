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

import type { DiscoveredAccount, TrackedSubscription } from './extensionBridge';

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
  discoveredAccounts: DiscoveredAccount[];
  trackedSubscriptions: TrackedSubscription[];
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

  // --- Discovered accounts: deterministic mock based on email ---
  const MOCK_ACCOUNTS = [
    { name: 'Netflix', domain: 'netflix.com', category: 'Streaming' },
    { name: 'Spotify', domain: 'spotify.com', category: 'Music' },
    { name: 'Amazon', domain: 'amazon.com', category: 'Shopping' },
    { name: 'Twitter / X', domain: 'x.com', category: 'Social' },
    { name: 'Facebook', domain: 'facebook.com', category: 'Social' },
    { name: 'Instagram', domain: 'instagram.com', category: 'Social' },
    { name: 'LinkedIn', domain: 'linkedin.com', category: 'Professional' },
    { name: 'GitHub', domain: 'github.com', category: 'Developer' },
    { name: 'Dropbox', domain: 'dropbox.com', category: 'Cloud Storage' },
    { name: 'Discord', domain: 'discord.com', category: 'Social' },
    { name: 'Reddit', domain: 'reddit.com', category: 'Social' },
    { name: 'Twitch', domain: 'twitch.tv', category: 'Streaming' },
    { name: 'Adobe', domain: 'adobe.com', category: 'Software' },
    { name: 'Notion', domain: 'notion.so', category: 'Productivity' },
    { name: 'Slack', domain: 'slack.com', category: 'Communication' },
    { name: 'Uber', domain: 'uber.com', category: 'Transport' },
    { name: 'DoorDash', domain: 'doordash.com', category: 'Food' },
    { name: 'Pinterest', domain: 'pinterest.com', category: 'Social' },
    { name: 'Canva', domain: 'canva.com', category: 'Design' },
    { name: 'Steam', domain: 'steampowered.com', category: 'Gaming' },
  ];

  const accountCount = 6 + Math.floor(rng() * 10);
  const selectedAccounts = pickN(MOCK_ACCOUNTS, accountCount, rng);
  const discoveredAccounts: DiscoveredAccount[] = selectedAccounts.map((a, i) => {
    const daysAgo = Math.floor(rng() * 1500) + 30;
    const lastDaysAgo = Math.floor(rng() * daysAgo);
    return {
      id: `acct-${seed}-${i}`,
      name: a.name,
      domain: a.domain,
      category: a.category,
      firstSeen: new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0],
      lastActivity: new Date(Date.now() - lastDaysAgo * 86400000).toISOString().split('T')[0],
    };
  });

  // --- Tracked subscriptions: deterministic mock ---
  const MOCK_SUBS = [
    { name: 'Netflix', domain: 'netflix.com', amount: 15.49, frequency: 'monthly' as const },
    { name: 'Spotify Premium', domain: 'spotify.com', amount: 10.99, frequency: 'monthly' as const },
    { name: 'Amazon Prime', domain: 'amazon.com', amount: 139, frequency: 'yearly' as const },
    { name: 'iCloud+', domain: 'apple.com', amount: 2.99, frequency: 'monthly' as const },
    { name: 'YouTube Premium', domain: 'youtube.com', amount: 13.99, frequency: 'monthly' as const },
    { name: 'Adobe Creative Cloud', domain: 'adobe.com', amount: 54.99, frequency: 'monthly' as const },
    { name: 'ChatGPT Plus', domain: 'openai.com', amount: 20, frequency: 'monthly' as const },
    { name: 'Discord Nitro', domain: 'discord.com', amount: 9.99, frequency: 'monthly' as const },
    { name: 'Notion Pro', domain: 'notion.so', amount: 10, frequency: 'monthly' as const },
    { name: 'GitHub Pro', domain: 'github.com', amount: 4, frequency: 'monthly' as const },
    { name: 'Hulu', domain: 'hulu.com', amount: 17.99, frequency: 'monthly' as const },
    { name: 'Xbox Game Pass', domain: 'xbox.com', amount: 16.99, frequency: 'monthly' as const },
  ];

  const subCount = 3 + Math.floor(rng() * 6);
  const selectedSubs = pickN(MOCK_SUBS, subCount, rng);
  const statuses: TrackedSubscription['status'][] = ['active', 'active', 'active', 'active', 'cancelled', 'failed'];
  const trackedSubscriptions: TrackedSubscription[] = selectedSubs.map((s, i) => {
    const status = statuses[Math.floor(rng() * statuses.length)] || 'active';
    const chargeCount = 2 + Math.floor(rng() * 24);
    return {
      id: `sub-${seed}-${i}`,
      name: s.name,
      domain: s.domain,
      amount: s.amount,
      currency: 'USD',
      frequency: s.frequency,
      lastCharged: new Date(Date.now() - Math.floor(rng() * 30) * 86400000).toISOString().split('T')[0],
      active: status === 'active',
      status,
      emailCount: 1 + Math.floor(rng() * 20),
      chargeCount,
    };
  });

  return {
    breaches,
    dataBrokers,
    discoveredAccounts,
    trackedSubscriptions,
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
