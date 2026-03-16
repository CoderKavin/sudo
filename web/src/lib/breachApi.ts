// Client-side breach API helper
// Calls our Vercel serverless function which proxies to XposedOrNot
// Falls back gracefully if the API is unavailable (e.g. in dev mode)

import type { ScannedBreach } from './scanner';

interface ApiBreach {
  name: string;
  domain: string;
  date: string;
  dataTypes: string[];
  records: number;
  industry: string;
  verified: boolean;
}

function inferSeverity(breach: ApiBreach): 'low' | 'medium' | 'high' | 'critical' {
  const sensitive = ['passwords', 'social security', 'credit card', 'financial', 'passport'];
  const dataLower = breach.dataTypes.map((d) => d.toLowerCase()).join(' ');
  const hasSensitive = sensitive.some((s) => dataLower.includes(s));

  if (breach.records > 100_000_000 && hasSensitive) return 'critical';
  if (breach.records > 50_000_000 || hasSensitive) return 'high';
  if (breach.records > 1_000_000) return 'medium';
  return 'low';
}

function buildDescription(breach: ApiBreach): string {
  const records = breach.records > 0
    ? `${(breach.records / 1_000_000).toFixed(1)}M records were exposed`
    : 'User data was exposed';
  const types = breach.dataTypes.slice(0, 3).join(', ');
  return `${records} in the ${breach.name} breach, including ${types}.`;
}

/**
 * Fetch real breach data for an email.
 * Returns null if the API is unavailable (caller should fall back to mock data).
 * Returns an empty array if the email has no known breaches.
 */
export async function fetchRealBreaches(email: string): Promise<ScannedBreach[] | null> {
  try {
    const res = await fetch(`/api/breaches?email=${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();

    if (!data.breaches || !Array.isArray(data.breaches)) return null;
    if (data.source === 'error') return null;

    return data.breaches.map((b: ApiBreach, i: number) => ({
      id: `real-${i}-${b.name.replace(/\s/g, '')}`,
      name: b.name,
      email,
      date: b.date || 'Unknown',
      description: buildDescription(b),
      severity: inferSeverity(b),
      dataTypes: b.dataTypes,
      resolved: false,
    }));
  } catch {
    // API unavailable (dev mode, network error, etc.)
    return null;
  }
}
