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

// Known service security page URLs
const SECURITY_URLS: Record<string, string> = {
  google: 'https://myaccount.google.com/security',
  gmail: 'https://myaccount.google.com/security',
  facebook: 'https://www.facebook.com/settings?tab=security',
  instagram: 'https://www.instagram.com/accounts/privacy_and_security/',
  twitter: 'https://twitter.com/settings/security',
  linkedin: 'https://www.linkedin.com/psettings/security',
  apple: 'https://appleid.apple.com/account/manage',
  microsoft: 'https://account.microsoft.com/security',
  amazon: 'https://www.amazon.com/gp/css/homepage.html',
  dropbox: 'https://www.dropbox.com/account/security',
  spotify: 'https://www.spotify.com/account/security/',
  netflix: 'https://www.netflix.com/account',
  paypal: 'https://www.paypal.com/myaccount/settings/security',
  github: 'https://github.com/settings/security',
  steam: 'https://store.steampowered.com/account/',
  discord: 'https://discord.com/channels/@me',
  adobe: 'https://account.adobe.com/security',
  yahoo: 'https://login.yahoo.com/account/security',
  lastpass: 'https://lastpass.com/vault/',
  myfitnesspal: 'https://www.myfitnesspal.com/account/change_password',
  canva: 'https://www.canva.com/settings/account',
};

function getSecurityUrl(breachName: string): string | undefined {
  const lower = breachName.toLowerCase();
  for (const [key, url] of Object.entries(SECURITY_URLS)) {
    if (lower.includes(key)) return url;
  }
  return undefined;
}

export function getBreachRemediationSteps(breachName: string, dataTypes: string[]): RemediationStep[] {
  const steps: RemediationStep[] = [];
  const lower = dataTypes.map((d) => d.toLowerCase()).join(' ');
  const id = (s: string) => `${breachName}-${s}`.replace(/\s+/g, '-').toLowerCase();
  const securityUrl = getSecurityUrl(breachName);

  if (lower.includes('password') || lower.includes('encrypted password vault')) {
    steps.push({
      id: id('change-password'),
      label: `Change your ${breachName} password`,
      description: 'Use a unique, strong password (16+ chars with mixed case, numbers, and symbols). Never reuse passwords.',
      priority: 'critical',
      actionUrl: securityUrl ?? `https://www.google.com/search?q=${encodeURIComponent(breachName)}+change+password`,
      actionLabel: securityUrl ? 'Go to security settings' : 'Find password reset page',
    });
    steps.push({
      id: id('check-reuse'),
      label: 'Check for password reuse across all accounts',
      description: 'If you used this password elsewhere, change those accounts immediately. Use a password manager like 1Password, Bitwarden, or iCloud Keychain.',
      priority: 'critical',
      actionUrl: 'https://bitwarden.com/download/',
      actionLabel: 'Get a password manager',
    });
    steps.push({
      id: id('enable-2fa'),
      label: 'Enable two-factor authentication (2FA)',
      description: 'Use an authenticator app (Google Authenticator, Authy) instead of SMS. Hardware keys like YubiKey are even more secure.',
      priority: 'high',
      actionUrl: securityUrl ?? `https://www.google.com/search?q=${encodeURIComponent(breachName)}+enable+2FA`,
      actionLabel: securityUrl ? 'Go to 2FA settings' : 'Find 2FA settings',
    });
  }

  if (lower.includes('encrypted password vault')) {
    steps.push({
      id: id('change-master'),
      label: 'Change your master password immediately',
      description: 'Your encrypted vault could be brute-forced. Change your master password and rotate ALL stored passwords, starting with financial accounts.',
      priority: 'critical',
    });
  }

  if (lower.includes('email')) {
    steps.push({
      id: id('phishing-watch'),
      label: 'Watch for phishing attempts',
      description: 'Attackers may send targeted emails pretending to be this service. Never click suspicious links. Verify sender addresses carefully.',
      priority: 'high',
    });
  }

  if (lower.includes('credit card') || lower.includes('financial') || lower.includes('bank') || lower.includes('payment')) {
    steps.push({
      id: id('monitor-bank'),
      label: 'Monitor bank & credit card statements',
      description: 'Check for unauthorized charges daily for at least 90 days. Set up real-time transaction alerts with your bank.',
      priority: 'critical',
    });
    steps.push({
      id: id('freeze-card'),
      label: 'Freeze or replace the exposed card',
      description: 'Contact your bank to freeze the card and request a replacement with a new number.',
      priority: 'high',
    });
    steps.push({
      id: id('credit-monitoring'),
      label: 'Sign up for credit monitoring',
      description: 'Use a free service like Credit Karma to get alerts about new accounts opened in your name.',
      priority: 'high',
      actionUrl: 'https://www.creditkarma.com/',
      actionLabel: 'Set up free monitoring',
    });
  }

  if (lower.includes('social security') || lower.includes('ssn')) {
    steps.push({
      id: id('freeze-credit'),
      label: 'Freeze your credit at all three bureaus',
      description: 'Place a security freeze with Equifax, Experian, and TransUnion to prevent anyone from opening credit in your name.',
      priority: 'critical',
      actionUrl: 'https://www.usa.gov/credit-freeze',
      actionLabel: 'Freeze your credit (free)',
    });
    steps.push({
      id: id('fraud-alert'),
      label: 'Set up an extended fraud alert',
      description: 'File for a 7-year extended fraud alert. Contact any one bureau — they notify the others automatically.',
      priority: 'critical',
    });
    steps.push({
      id: id('irs-pin'),
      label: 'Get an IRS Identity Protection PIN',
      description: 'Prevent tax fraud by getting an IP PIN from the IRS.',
      priority: 'high',
      actionUrl: 'https://www.irs.gov/identity-theft-fraud-scams/get-an-identity-protection-pin',
      actionLabel: 'Get IRS IP PIN',
    });
  }

  if (lower.includes('phone')) {
    steps.push({
      id: id('sim-lock'),
      label: 'Set up SIM lock / port-out protection',
      description: 'Contact your carrier to add a PIN and enable port-out protection to prevent SIM swapping attacks.',
      priority: 'high',
    });
  }

  if (lower.includes('date of birth') || lower.includes('dob')) {
    steps.push({
      id: id('identity-monitoring'),
      label: 'Sign up for identity theft monitoring',
      description: 'Your date of birth combined with other data makes identity theft possible. Monitor for accounts opened in your name.',
      priority: 'high',
      actionUrl: 'https://www.identitytheft.gov/',
      actionLabel: 'Report identity theft',
    });
  }

  if (lower.includes('security question')) {
    steps.push({
      id: id('change-questions'),
      label: 'Change security questions on all accounts',
      description: 'Use random answers (not real ones) and store them in a password manager.',
      priority: 'high',
    });
  }

  if (lower.includes('address') || lower.includes('physical')) {
    steps.push({
      id: id('mail-monitoring'),
      label: 'Monitor physical mail for fraud',
      description: 'Watch for unfamiliar mail or notices about accounts you didn\'t open. Set up USPS Informed Delivery.',
      priority: 'medium',
      actionUrl: 'https://informeddelivery.usps.com/',
      actionLabel: 'Set up Informed Delivery',
    });
  }

  if (lower.includes('passport') || lower.includes('driver') || lower.includes('license')) {
    steps.push({
      id: id('report-id'),
      label: 'Report compromised ID to issuing authority',
      description: 'Contact the relevant government agency to flag the document and request a replacement.',
      priority: 'critical',
    });
  }

  // Always add a general review step
  steps.push({
    id: id('review-security'),
    label: `Review ${breachName} account security`,
    description: 'Check for unrecognized sessions, connected apps, backup emails, and recovery phone numbers.',
    priority: 'medium',
    actionUrl: securityUrl ?? `https://www.google.com/search?q=${encodeURIComponent(breachName)}+security+settings`,
    actionLabel: securityUrl ? 'Go to security settings' : 'Find security settings',
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
