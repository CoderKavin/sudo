// ============================================================
// Dark web monitoring — checks for leaked credentials
// Uses XposedOrNot breach analytics API for dark web exposure data
// ============================================================

import type { DarkWebAlert } from '../store/useStore';

interface XposedMetrics {
  breaches_account: number;
  breaches_account_details: string;
  pastes_count: number;
  industry: string[];
}

const ALERT_TYPE_MAP: Record<string, DarkWebAlert['type']> = {
  passwords: 'credentials',
  email: 'credentials',
  usernames: 'credentials',
  'credit card': 'financial',
  financial: 'financial',
  bank: 'financial',
  ssn: 'personal_info',
  'social security': 'personal_info',
  address: 'personal_info',
  phone: 'personal_info',
  name: 'personal_info',
  dob: 'personal_info',
  medical: 'medical',
  health: 'medical',
};

function inferAlertType(dataTypes: string[]): DarkWebAlert['type'] {
  const lower = dataTypes.map((d) => d.toLowerCase()).join(' ');
  for (const [keyword, type] of Object.entries(ALERT_TYPE_MAP)) {
    if (lower.includes(keyword)) return type;
  }
  return 'personal_info';
}

function inferSeverity(pasteCount: number, breachCount: number): DarkWebAlert['severity'] {
  if (pasteCount > 5 || breachCount > 10) return 'critical';
  if (pasteCount > 2 || breachCount > 5) return 'high';
  if (pasteCount > 0 || breachCount > 2) return 'medium';
  return 'low';
}

/**
 * Check dark web exposure for a single email using XposedOrNot analytics
 */
async function checkEmailExposure(email: string): Promise<DarkWebAlert[]> {
  const alerts: DarkWebAlert[] = [];

  try {
    // XposedOrNot breach analytics endpoint
    const res = await fetch(
      `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(email)}`,
      { signal: AbortSignal.timeout(15000) },
    );

    if (!res.ok) {
      // 404 = no breaches found (clean email)
      if (res.status === 404) return [];
      return [];
    }

    const data = await res.json();

    // Parse breach details from the analytics response
    const exposedBreaches = data.ExposedBreaches?.breaches_details || [];
    const pasteMetrics = data.PastesSummary;

    // Create alerts from breach details
    for (const breach of exposedBreaches) {
      const dataTypes = (breach.xposed_data || '').split(';').map((s: string) => s.trim()).filter(Boolean);
      const alertType = inferAlertType(dataTypes);
      const pasteCount = typeof pasteMetrics?.cnt === 'number' ? pasteMetrics.cnt : 0;

      alerts.push({
        id: `darkweb-${email}-${breach.breach}`.replace(/\s+/g, '-').toLowerCase(),
        email,
        type: alertType,
        source: breach.breach || 'Unknown source',
        description: buildDescription(breach, dataTypes),
        date: breach.xposed_date || new Date().toISOString(),
        severity: inferSeverity(pasteCount, exposedBreaches.length),
        resolved: false,
      });
    }

    // If pastes were found, add a separate alert
    if (pasteMetrics && typeof pasteMetrics.cnt === 'number' && pasteMetrics.cnt > 0) {
      alerts.push({
        id: `darkweb-paste-${email}`,
        email,
        type: 'credentials',
        source: 'Paste Sites',
        description: `Your email was found in ${pasteMetrics.cnt} paste(s) on dark web paste sites. These pastes often contain leaked credentials and personal data.`,
        date: new Date().toISOString(),
        severity: pasteMetrics.cnt > 5 ? 'critical' : pasteMetrics.cnt > 2 ? 'high' : 'medium',
        resolved: false,
      });
    }
  } catch {
    // API unavailable — return empty
  }

  return alerts;
}

function buildDescription(breach: { breach?: string; xposed_records?: number; xposed_data?: string }, dataTypes: string[]): string {
  const name = breach.breach || 'Unknown';
  const records = breach.xposed_records;
  const recordStr = records && records > 0
    ? `${(records / 1_000_000).toFixed(1)}M records were exposed`
    : 'User data was exposed';
  const types = dataTypes.slice(0, 3).join(', ');
  return `${recordStr} in the ${name} breach on the dark web, including ${types || 'personal data'}.`;
}

/**
 * Run dark web monitoring scan across all connected emails
 */
export async function scanDarkWeb(
  emails: string[],
  onProgress?: (msg: string) => void,
): Promise<DarkWebAlert[]> {
  const allAlerts: DarkWebAlert[] = [];

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    onProgress?.(`Checking dark web for ${email} (${i + 1}/${emails.length})...`);
    const alerts = await checkEmailExposure(email);
    allAlerts.push(...alerts);
  }

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = allAlerts.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  // Sort by severity
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return unique.sort((a, b) => (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4));
}
