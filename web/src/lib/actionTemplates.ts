// ============================================================
// Action templates — pre-written emails, guides, and checklists
// for in-app remediation without leaving the dashboard
// ============================================================

// ─── GDPR / CCPA Deletion Request ────────────────────────────

export function generateDeletionEmail(serviceName: string, userEmail: string): { subject: string; body: string } {
  return {
    subject: `Data Deletion Request — ${serviceName} Account (${userEmail})`,
    body: `To Whom It May Concern,

I am writing to request the deletion of my account and all associated personal data held by ${serviceName}, in accordance with:

• The General Data Protection Regulation (GDPR), Article 17 — Right to Erasure
• The California Consumer Privacy Act (CCPA), Section 1798.105

Account email: ${userEmail}

Please confirm within 30 days that:
1. My account has been permanently deleted
2. All personal data associated with this account has been erased
3. Any third parties with whom my data was shared have been notified

If you require identity verification, please let me know what is needed.

Thank you for your prompt attention to this matter.

Best regards`,
  };
}

// ─── Data Broker Opt-Out Request ─────────────────────────────

export function generateBrokerOptOut(brokerName: string, userEmail: string, dataTypes: string[]): { subject: string; body: string } {
  return {
    subject: `Personal Data Removal Request — ${brokerName}`,
    body: `To the Privacy Team at ${brokerName},

I am exercising my rights under the CCPA (California Consumer Privacy Act) and GDPR (General Data Protection Regulation) to request the immediate removal of my personal information from your database.

My information that you currently hold includes: ${dataTypes.join(', ')}.

Contact email: ${userEmail}

I request that you:
1. Remove all of my personal data from your public-facing profiles and databases
2. Cease selling or sharing my personal data with third parties
3. Confirm deletion within 30 calendar days as required by law

Failure to comply may result in a formal complaint to the relevant data protection authority.

Regards`,
  };
}

// ─── Subscription Cancellation Email ─────────────────────────

export function generateCancelEmail(serviceName: string, userEmail: string): { subject: string; body: string } {
  return {
    subject: `Cancel Subscription — ${serviceName}`,
    body: `Hi ${serviceName} Support,

I would like to cancel my subscription effective immediately. Please confirm the cancellation and ensure no further charges are made to my account.

Account email: ${userEmail}

If there is a remaining balance or refund due, please let me know.

Thank you`,
  };
}

// ─── Breach Remediation Checklists ───────────────────────────

export interface RemediationStep {
  id: string;
  label: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  actionUrl?: string;
  actionLabel?: string;
}

export function getBreachRemediationSteps(breachName: string, dataTypes: string[]): RemediationStep[] {
  const steps: RemediationStep[] = [];
  const lower = dataTypes.map((d) => d.toLowerCase()).join(' ');
  const id = (s: string) => `${breachName}-${s}`.replace(/\s+/g, '-').toLowerCase();

  if (lower.includes('password')) {
    steps.push({
      id: id('change-password'),
      label: `Change your ${breachName} password`,
      description: 'Use a unique, strong password (16+ chars). Never reuse passwords across services.',
      priority: 'critical',
      actionUrl: `https://www.google.com/search?q=${encodeURIComponent(breachName)}+change+password`,
      actionLabel: 'Find password reset page',
    });
    steps.push({
      id: id('check-reuse'),
      label: 'Check for password reuse',
      description: 'If you used the same password elsewhere, change those accounts too. Consider a password manager.',
      priority: 'critical',
    });
    steps.push({
      id: id('enable-2fa'),
      label: 'Enable two-factor authentication',
      description: 'Use an authenticator app (not SMS) for the strongest protection.',
      priority: 'high',
      actionUrl: `https://www.google.com/search?q=${encodeURIComponent(breachName)}+enable+two+factor+authentication`,
      actionLabel: 'Find 2FA settings',
    });
  }

  if (lower.includes('email')) {
    steps.push({
      id: id('phishing-watch'),
      label: 'Watch for phishing attempts',
      description: 'Attackers may send targeted phishing emails pretending to be this service. Never click suspicious links.',
      priority: 'high',
    });
  }

  if (lower.includes('credit card') || lower.includes('financial') || lower.includes('bank')) {
    steps.push({
      id: id('monitor-bank'),
      label: 'Monitor bank statements',
      description: 'Check for unauthorized charges over the next 90 days. Set up transaction alerts with your bank.',
      priority: 'critical',
    });
    steps.push({
      id: id('freeze-card'),
      label: 'Consider freezing your card',
      description: 'If the breach is recent, temporarily freeze the exposed card and request a replacement.',
      priority: 'high',
    });
  }

  if (lower.includes('social security') || lower.includes('ssn')) {
    steps.push({
      id: id('freeze-credit'),
      label: 'Freeze your credit immediately',
      description: 'Place a security freeze with Equifax, Experian, and TransUnion to prevent identity theft.',
      priority: 'critical',
      actionUrl: 'https://www.usa.gov/credit-freeze',
      actionLabel: 'Learn how to freeze credit',
    });
    steps.push({
      id: id('fraud-alert'),
      label: 'Set up a fraud alert',
      description: 'Contact any one bureau to place a fraud alert — they notify the others automatically.',
      priority: 'critical',
    });
  }

  if (lower.includes('phone')) {
    steps.push({
      id: id('sim-lock'),
      label: 'Set up SIM lock / port protection',
      description: 'Contact your carrier to add a PIN or port-out protection to prevent SIM swapping.',
      priority: 'high',
    });
  }

  if (lower.includes('address') || lower.includes('physical')) {
    steps.push({
      id: id('mail-monitoring'),
      label: 'Monitor physical mail',
      description: 'Watch for unfamiliar mail, pre-approved credit offers, or signs of identity theft.',
      priority: 'medium',
    });
  }

  if (lower.includes('passport') || lower.includes('driver') || lower.includes('license')) {
    steps.push({
      id: id('report-id'),
      label: 'Report compromised ID to issuing authority',
      description: 'Contact the relevant government agency to flag the compromised document and request a replacement.',
      priority: 'critical',
    });
  }

  // Always add a general review step
  steps.push({
    id: id('review-security'),
    label: 'Review account security settings',
    description: `Check ${breachName}'s security settings for unrecognized sessions, connected apps, or backup emails.`,
    priority: 'medium',
    actionUrl: `https://www.google.com/search?q=${encodeURIComponent(breachName)}+account+security+settings`,
    actionLabel: 'Find security settings',
  });

  return steps;
}

// ─── Unsubscribe header extraction ───────────────────────────

export function getUnsubscribeMailto(serviceName: string, userEmail: string): string {
  const { subject, body } = generateCancelEmail(serviceName, userEmail);
  return `mailto:support@${serviceName.toLowerCase().replace(/\s+/g, '')}.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Copy to clipboard helper ────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}
