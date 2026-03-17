// ============================================================
// Email notification helpers
// Sends alerts via the /api/notify Vercel Edge Function
// Falls back gracefully when the API is unavailable (dev mode)
// ============================================================

import type { DarkWebAlert } from '../store/useStore';
import type { ScannedBreach } from './scanner';

/**
 * Send a notification email via the serverless function.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendNotification(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Send an alert when new breaches are found during a scan.
 */
export async function sendBreachAlert(
  to: string,
  breaches: ScannedBreach[],
): Promise<boolean> {
  if (breaches.length === 0) return false;

  const subject = `Vanish Alert: ${breaches.length} new breach${breaches.length > 1 ? 'es' : ''} detected`;

  const breachRows = breaches.map((b) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #1a1a2e;color:#f5f5f7;font-weight:600">${b.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1a1a2e;color:${
        b.severity === 'critical' ? '#ff3366' : b.severity === 'high' ? '#ffaa00' : b.severity === 'medium' ? '#eab308' : '#3b82f6'
      }">${b.severity.toUpperCase()}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1a1a2e;color:#8282a0">${b.dataTypes.slice(0, 3).join(', ')}</td>
    </tr>
  `).join('');

  const html = buildEmail(`
    <h2 style="color:#f5f5f7;margin:0 0 8px">New Breaches Detected</h2>
    <p style="color:#8282a0;margin:0 0 20px">We found ${breaches.length} new data breach${breaches.length > 1 ? 'es' : ''} affecting your accounts.</p>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #7c6aef;color:#7c6aef;font-size:11px;text-transform:uppercase;letter-spacing:1px">Breach</th>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #7c6aef;color:#7c6aef;font-size:11px;text-transform:uppercase;letter-spacing:1px">Severity</th>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #7c6aef;color:#7c6aef;font-size:11px;text-transform:uppercase;letter-spacing:1px">Data Exposed</th>
        </tr>
      </thead>
      <tbody>${breachRows}</tbody>
    </table>
    <p style="color:#ff3366;margin:24px 0 0;font-weight:600">Take action now to secure your accounts.</p>
  `);

  return sendNotification(to, subject, html);
}

/**
 * Send an alert when dark web exposures are found.
 */
export async function sendDarkWebAlert(
  to: string,
  alerts: DarkWebAlert[],
): Promise<boolean> {
  if (alerts.length === 0) return false;

  const subject = `Vanish Alert: ${alerts.length} dark web exposure${alerts.length > 1 ? 's' : ''} found`;

  const alertRows = alerts.slice(0, 10).map((a) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #1a1a2e;color:#a88cff;font-weight:600">${a.source}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1a1a2e;color:#8282a0">${a.type}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1a1a2e;color:${
        a.severity === 'critical' ? '#ff3366' : a.severity === 'high' ? '#ffaa00' : '#eab308'
      }">${a.severity.toUpperCase()}</td>
    </tr>
  `).join('');

  const html = buildEmail(`
    <h2 style="color:#f5f5f7;margin:0 0 8px">Dark Web Exposures Found</h2>
    <p style="color:#8282a0;margin:0 0 20px">Your information was found in ${alerts.length} dark web source${alerts.length > 1 ? 's' : ''}.</p>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #7c6aef;color:#7c6aef;font-size:11px;text-transform:uppercase;letter-spacing:1px">Source</th>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #7c6aef;color:#7c6aef;font-size:11px;text-transform:uppercase;letter-spacing:1px">Type</th>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #7c6aef;color:#7c6aef;font-size:11px;text-transform:uppercase;letter-spacing:1px">Severity</th>
        </tr>
      </thead>
      <tbody>${alertRows}</tbody>
    </table>
  `);

  return sendNotification(to, subject, html);
}

/**
 * Send a weekly privacy summary digest.
 */
export async function sendWeeklySummary(
  to: string,
  data: {
    score: number;
    scoreChange: number;
    breachCount: number;
    brokerCount: number;
    darkWebCount: number;
    resolvedCount: number;
  },
): Promise<boolean> {
  const subject = `Vanish Weekly: Privacy Score ${data.score}/100`;
  const trend = data.scoreChange > 0 ? `+${data.scoreChange}` : `${data.scoreChange}`;
  const trendColor = data.scoreChange >= 0 ? '#22c55e' : '#ff3366';
  const scoreColor = data.score > 70 ? '#22c55e' : data.score > 40 ? '#ffaa00' : '#ff3366';

  const html = buildEmail(`
    <h2 style="color:#f5f5f7;margin:0 0 20px">Your Weekly Privacy Summary</h2>
    <div style="text-align:center;padding:24px;background:#0e0e14;border-radius:12px;margin-bottom:20px">
      <div style="font-size:48px;font-weight:700;color:${scoreColor}">${data.score}</div>
      <div style="color:#8282a0;font-size:12px;margin-top:4px">PRIVACY SCORE</div>
      <div style="color:${trendColor};font-size:14px;margin-top:8px;font-weight:600">${trend} pts this week</div>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:12px;text-align:center;background:#0e0e14;border-radius:8px">
          <div style="font-size:24px;font-weight:700;color:#ef4444">${data.breachCount}</div>
          <div style="color:#8282a0;font-size:11px;margin-top:4px">Breaches</div>
        </td>
        <td style="width:8px"></td>
        <td style="padding:12px;text-align:center;background:#0e0e14;border-radius:8px">
          <div style="font-size:24px;font-weight:700;color:#f97316">${data.brokerCount}</div>
          <div style="color:#8282a0;font-size:11px;margin-top:4px">Brokers</div>
        </td>
        <td style="width:8px"></td>
        <td style="padding:12px;text-align:center;background:#0e0e14;border-radius:8px">
          <div style="font-size:24px;font-weight:700;color:#a88cff">${data.darkWebCount}</div>
          <div style="color:#8282a0;font-size:11px;margin-top:4px">Dark Web</div>
        </td>
      </tr>
    </table>
    ${data.resolvedCount > 0 ? `<p style="color:#22c55e;margin:20px 0 0;font-weight:600">You resolved ${data.resolvedCount} issue${data.resolvedCount > 1 ? 's' : ''} this week.</p>` : ''}
  `);

  return sendNotification(to, subject, html);
}

// Shared email template wrapper
function buildEmail(content: string): string {
  return `
    <div style="background:#050507;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="max-width:560px;margin:0 auto">
        <div style="margin-bottom:24px">
          <span style="color:#7c6aef;font-size:13px;font-weight:600;letter-spacing:2px">VANISH</span>
          <span style="color:#8282a0;font-size:13px"> · Privacy Scanner</span>
        </div>
        <div style="background:#0a0a10;border:1px solid #1a1a2e;border-radius:12px;padding:24px">
          ${content}
        </div>
        <div style="margin-top:20px;text-align:center">
          <p style="color:#52526e;font-size:11px;margin:0">This is an automated alert from Vanish. You can disable notifications in your dashboard settings.</p>
        </div>
      </div>
    </div>
  `;
}
