// ============================================================
// PDF Privacy Report Generator
// Dark-themed, polished report matching the Vanish app aesthetic
// ============================================================

import jsPDF from 'jspdf';
import type { ScannedBreach, ScannedDataBroker } from './scanner';
import type { DiscoveredAccount, TrackedSubscription } from './extensionBridge';
import type { DarkWebAlert, ScoreSnapshot } from '../store/useStore';

interface ReportData {
  emails: string[];
  privacyScore: number;
  scoreHistory: ScoreSnapshot[];
  breaches: ScannedBreach[];
  dataBrokers: ScannedDataBroker[];
  accounts: DiscoveredAccount[];
  subscriptions: TrackedSubscription[];
  darkWebAlerts: DarkWebAlert[];
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Color palette matching the app
const C = {
  bg: [5, 5, 7] as [number, number, number],
  cardBg: [14, 14, 20] as [number, number, number],
  cardBgLight: [20, 20, 30] as [number, number, number],
  purple: [124, 106, 239] as [number, number, number],
  purpleLight: [168, 140, 255] as [number, number, number],
  cyan: [0, 221, 255] as [number, number, number],
  blue: [0, 140, 255] as [number, number, number],
  red: [255, 51, 102] as [number, number, number],
  orange: [255, 170, 0] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
  white: [245, 245, 247] as [number, number, number],
  muted: [130, 130, 150] as [number, number, number],
  dimLine: [40, 40, 55] as [number, number, number],
};

const SEV_COLORS: Record<string, [number, number, number]> = {
  critical: C.red,
  high: C.orange,
  medium: [234, 179, 8],
  low: C.blue,
};

export function generatePrivacyReport(data: ReportData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 18; // margin
  const cw = pw - m * 2; // content width
  let y = 0;

  // ── Helpers ──────────────────────────────────────────────
  const fillPage = () => {
    doc.setFillColor(...C.bg);
    doc.rect(0, 0, pw, ph, 'F');
  };

  const addPage = () => {
    doc.addPage();
    fillPage();
    y = m;
  };

  const checkBreak = (need: number) => {
    if (y + need > ph - 20) addPage();
  };

  const drawAccentLine = (x: number, yPos: number, w: number) => {
    // Gradient-like accent line using purple
    doc.setDrawColor(...C.purple);
    doc.setLineWidth(0.6);
    doc.line(x, yPos, x + w, yPos);
    // Faded extension
    doc.setDrawColor(...C.dimLine);
    doc.setLineWidth(0.2);
    doc.line(x + w, yPos, x + cw, yPos);
  };

  const sectionTitle = (title: string, count?: number) => {
    checkBreak(25);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    const label = count !== undefined ? `${title} (${count})` : title;
    doc.text(label, m, y);
    y += 2;
    drawAccentLine(m, y, 35);
    y += 7;
  };

  const drawPill = (x: number, yPos: number, text: string, color: [number, number, number]) => {
    doc.setFontSize(6);
    const tw = doc.getTextWidth(text) + 4;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, yPos - 3, tw, 5, 1.5, 1.5, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(text, x + 2, yPos);
    return tw + 2;
  };

  // ══════════════════════════════════════════════════════════
  // PAGE 1 — Cover
  // ══════════════════════════════════════════════════════════
  fillPage();

  // Decorative corner accents
  doc.setDrawColor(...C.purple);
  doc.setLineWidth(0.4);
  // Top-left corner
  doc.line(m, m + 5, m, m);
  doc.line(m, m, m + 5, m);
  // Top-right corner
  doc.line(pw - m, m + 5, pw - m, m);
  doc.line(pw - m, m, pw - m - 5, m);
  // Bottom-left corner
  doc.line(m, ph - m - 5, m, ph - m);
  doc.line(m, ph - m, m + 5, ph - m);
  // Bottom-right corner
  doc.line(pw - m, ph - m - 5, pw - m, ph - m);
  doc.line(pw - m, ph - m, pw - m - 5, ph - m);

  // Brand / Logo text
  y = 55;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.purple);
  doc.text('VANISH', m + 2, y);
  doc.setTextColor(...C.muted);
  doc.text('  ·  DIGITAL FOOTPRINT SCANNER', m + 18, y);
  y += 20;

  // Main title
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('Privacy', m, y);
  y += 14;
  doc.text('Report', m, y);
  y += 6;

  // Accent line under title
  doc.setDrawColor(...C.purple);
  doc.setLineWidth(1);
  doc.line(m, y, m + 55, y);
  y += 12;

  // Meta info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(`Generated ${formatDate(new Date())}`, m, y);
  y += 6;
  doc.text(`Accounts: ${data.emails.join(', ')}`, m, y);
  y += 20;

  // ── Hero Score Card ──
  const scoreCardH = 55;
  doc.setFillColor(...C.cardBg);
  doc.roundedRect(m, y, cw, scoreCardH, 4, 4, 'F');

  // Score border accent
  doc.setDrawColor(...C.purple);
  doc.setLineWidth(0.3);
  doc.roundedRect(m, y, cw, scoreCardH, 4, 4, 'S');

  // Score number
  const scoreColor = data.privacyScore > 70 ? C.green : data.privacyScore > 40 ? C.orange : C.red;
  doc.setFontSize(48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...scoreColor);
  doc.text(`${data.privacyScore}`, m + 18, y + 34);

  const scoreNumW = doc.getTextWidth(`${data.privacyScore}`);
  doc.setFontSize(16);
  doc.setTextColor(...C.muted);
  doc.text('/100', m + 18 + scoreNumW + 2, y + 34);

  // Labels
  doc.setFontSize(12);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text('PRIVACY SCORE', m + 18, y + 44);

  const riskLevel = data.privacyScore > 70 ? 'LOW RISK' : data.privacyScore > 40 ? 'MEDIUM RISK' : 'HIGH RISK';
  doc.setFontSize(9);
  doc.setTextColor(...scoreColor);
  doc.text(riskLevel, m + 65, y + 44);

  // Stats on the right side of score card
  const statsRight = [
    { label: 'Breaches', value: data.breaches.length, color: C.red },
    { label: 'Brokers', value: data.dataBrokers.filter(b => b.status === 'found').length, color: C.orange },
    { label: 'Dark Web', value: data.darkWebAlerts.filter(a => !a.resolved).length, color: C.purpleLight },
  ];

  const statX = m + cw - 75;
  for (let i = 0; i < statsRight.length; i++) {
    const sy = y + 14 + i * 13;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...statsRight[i].color);
    doc.text(`${statsRight[i].value}`, statX, sy);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(statsRight[i].label, statX + 18, sy);
  }

  // Divider line between score and stats
  doc.setDrawColor(...C.dimLine);
  doc.setLineWidth(0.2);
  doc.line(statX - 8, y + 8, statX - 8, y + scoreCardH - 8);

  y += scoreCardH + 15;

  // ── Summary Boxes ──
  const allStats = [
    { label: 'DATA BREACHES', value: `${data.breaches.length}`, color: C.red },
    { label: 'BROKER EXPOSURES', value: `${data.dataBrokers.filter(b => b.status === 'found').length}`, color: C.orange },
    { label: 'DARK WEB ALERTS', value: `${data.darkWebAlerts.filter(a => !a.resolved).length}`, color: C.purpleLight },
    { label: 'LINKED ACCOUNTS', value: `${data.accounts.length}`, color: C.cyan },
  ];

  const boxW = (cw - 6) / 4;
  for (let i = 0; i < allStats.length; i++) {
    const bx = m + i * (boxW + 2);
    doc.setFillColor(...C.cardBg);
    doc.roundedRect(bx, y, boxW, 24, 3, 3, 'F');

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...allStats[i].color);
    doc.text(allStats[i].value, bx + boxW / 2, y + 12, { align: 'center' });

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(allStats[i].label, bx + boxW / 2, y + 19, { align: 'center' });
  }
  y += 35;

  // ══════════════════════════════════════════════════════════
  // PAGE 2+ — Detailed Sections
  // ══════════════════════════════════════════════════════════
  addPage();

  // ── Score History ──
  if (data.scoreHistory.length > 1) {
    sectionTitle('Score History');
    const chartH = 35;
    doc.setFillColor(...C.cardBg);
    doc.roundedRect(m, y, cw, chartH, 3, 3, 'F');

    // Grid lines
    doc.setDrawColor(...C.dimLine);
    doc.setLineWidth(0.1);
    for (let g = 0; g <= 4; g++) {
      const gy = y + 4 + (g / 4) * (chartH - 8);
      doc.line(m + 2, gy, m + cw - 2, gy);
    }

    // Plot line
    const pts = data.scoreHistory;
    doc.setDrawColor(...C.purple);
    doc.setLineWidth(0.8);
    for (let i = 1; i < pts.length; i++) {
      const x1 = m + 6 + ((i - 1) / (pts.length - 1)) * (cw - 12);
      const x2 = m + 6 + (i / (pts.length - 1)) * (cw - 12);
      const y1 = y + chartH - 4 - (pts[i - 1].score / 100) * (chartH - 8);
      const y2 = y + chartH - 4 - (pts[i].score / 100) * (chartH - 8);
      doc.line(x1, y1, x2, y2);
    }

    // Dots at each point
    for (let i = 0; i < pts.length; i++) {
      const dx = m + 6 + (i / (pts.length - 1)) * (cw - 12);
      const dy = y + chartH - 4 - (pts[i].score / 100) * (chartH - 8);
      doc.setFillColor(...C.purple);
      doc.circle(dx, dy, 1, 'F');
    }

    y += chartH + 10;
  }

  // ── Data Breaches ──
  if (data.breaches.length > 0) {
    sectionTitle('Data Breaches', data.breaches.length);

    for (const breach of data.breaches) {
      checkBreak(22);
      doc.setFillColor(...C.cardBg);
      doc.roundedRect(m, y, cw, 18, 2, 2, 'F');

      // Left accent bar
      const sevColor = SEV_COLORS[breach.severity] || C.muted;
      doc.setFillColor(...sevColor);
      doc.rect(m, y + 1, 1.2, 16, 'F');

      // Name
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.white);
      doc.text(breach.name, m + 5, y + 7);

      // Severity pill
      drawPill(m + cw - 28, y + 5, breach.severity.toUpperCase(), sevColor);

      // Details line
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(`${breach.email}  ·  ${breach.date}`, m + 5, y + 12);

      // Data types
      doc.setTextColor(...C.purpleLight);
      doc.setFontSize(6.5);
      const types = breach.dataTypes.slice(0, 5).join(', ');
      doc.text(types, m + 5, y + 16);

      y += 20;
    }
    y += 5;
  }

  // ── Dark Web Alerts ──
  if (data.darkWebAlerts.length > 0) {
    sectionTitle('Dark Web Alerts', data.darkWebAlerts.length);

    for (const alert of data.darkWebAlerts.slice(0, 20)) {
      checkBreak(20);
      doc.setFillColor(...C.cardBg);
      doc.roundedRect(m, y, cw, 16, 2, 2, 'F');

      // Left accent
      const sevColor = SEV_COLORS[alert.severity] || C.muted;
      doc.setFillColor(...sevColor);
      doc.rect(m, y + 1, 1.2, 14, 'F');

      // Source
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.purpleLight);
      doc.text(alert.source, m + 5, y + 6.5);

      // Type pill
      drawPill(m + cw - 30, y + 4.5, alert.type.toUpperCase(), C.purple);

      // Severity pill next to type
      const typeW = doc.getTextWidth(alert.type.toUpperCase()) + 6;
      drawPill(m + cw - 30 - typeW - 2, y + 4.5, alert.severity.toUpperCase(), sevColor);

      // Detail
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      const desc = alert.description.length > 90 ? alert.description.slice(0, 87) + '...' : alert.description;
      doc.text(`${alert.email}  ·  ${desc}`, m + 5, y + 12, { maxWidth: cw - 10 });

      y += 18;
    }
    y += 5;
  }

  // ── Data Brokers ──
  const exposedBrokers = data.dataBrokers.filter(b => b.status === 'found');
  if (exposedBrokers.length > 0) {
    sectionTitle('Data Broker Exposures', exposedBrokers.length);

    // Table header
    doc.setFillColor(...C.cardBgLight);
    doc.roundedRect(m, y, cw, 8, 1.5, 1.5, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text('BROKER', m + 5, y + 5.5);
    doc.text('DATA EXPOSED', m + 65, y + 5.5);
    doc.text('RISK', m + cw - 15, y + 5.5);
    y += 10;

    for (const broker of exposedBrokers.slice(0, 25)) {
      checkBreak(10);
      doc.setFillColor(...C.cardBg);
      doc.roundedRect(m, y, cw, 9, 1.5, 1.5, 'F');

      // Name
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.orange);
      doc.text(broker.name, m + 5, y + 6);

      // Data types
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(broker.dataTypes.slice(0, 4).join(', '), m + 65, y + 6, { maxWidth: cw - 90 });

      // Risk level
      const risk = broker.dataTypes.length > 5 ? 'HIGH' : broker.dataTypes.length > 3 ? 'MED' : 'LOW';
      const riskColor = risk === 'HIGH' ? C.red : risk === 'MED' ? C.orange : C.green;
      drawPill(m + cw - 18, y + 4, risk, riskColor);

      y += 11;
    }
    y += 5;
  }

  // ── Subscriptions ──
  const activeSubs = data.subscriptions.filter(s => s.active);
  if (activeSubs.length > 0) {
    sectionTitle('Active Subscriptions', activeSubs.length);

    const monthlyTotal = activeSubs.reduce((sum, s) => {
      return sum + (s.frequency === 'yearly' ? s.amount / 12 : s.amount);
    }, 0);

    // Total spend card
    doc.setFillColor(...C.cardBg);
    doc.roundedRect(m, y, cw, 12, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text('Estimated monthly spend', m + 5, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.green);
    doc.text(`$${monthlyTotal.toFixed(2)}/mo`, m + cw - 5, y + 8, { align: 'right' });
    y += 16;

    for (const sub of activeSubs.slice(0, 20)) {
      checkBreak(11);
      doc.setFillColor(...C.cardBg);
      doc.roundedRect(m, y, cw, 9, 1.5, 1.5, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.white);
      doc.text(sub.name, m + 5, y + 6);

      const curr = sub.currency === 'EUR' ? '€' : sub.currency === 'GBP' ? '£' : '$';
      doc.setTextColor(...C.green);
      doc.setFont('helvetica', 'normal');
      doc.text(`${curr}${sub.amount.toFixed(2)}/${sub.frequency === 'yearly' ? 'yr' : 'mo'}`, m + cw - 5, y + 6, { align: 'right' });

      y += 11;
    }
  }

  // ══════════════════════════════════════════════════════════
  // Footer on every page
  // ══════════════════════════════════════════════════════════
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);

    // Subtle separator line
    doc.setDrawColor(...C.dimLine);
    doc.setLineWidth(0.2);
    doc.line(m, ph - 14, pw - m, ph - 14);

    // Footer text
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text('VANISH PRIVACY REPORT', m, ph - 10);
    doc.text(`Page ${p} of ${pageCount}`, pw / 2, ph - 10, { align: 'center' });
    doc.text(formatDate(new Date()), pw - m, ph - 10, { align: 'right' });

    doc.setFontSize(5.5);
    doc.setTextColor(80, 80, 95);
    doc.text('This report is confidential and intended for the account holder only.', pw / 2, ph - 7, { align: 'center' });
  }

  doc.save(`vanish-privacy-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
