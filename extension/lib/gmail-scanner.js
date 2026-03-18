// ============================================================
// Gmail API scanner — finds accounts & subscriptions from inbox
// ============================================================

import { ACCOUNT_PATTERNS, SUBSCRIPTION_PATTERNS, identifyService, parseAmount } from './email-patterns.js';

/**
 * Get OAuth token via chrome.identity
 */
export async function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

/**
 * Remove cached auth token (for sign-out)
 */
export async function removeCachedToken(token) {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, resolve);
  });
}

/**
 * Get the authenticated user's email address
 */
export async function getUserEmail(token) {
  const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  const data = await res.json();
  return data.emailAddress;
}

/**
 * Search Gmail with a query string, returns message IDs
 */
async function searchMessages(token, query, maxResults = 200) {
  const ids = [];
  let pageToken = null;
  let currentToken = token;

  while (ids.length < maxResults) {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(Math.min(100, maxResults - ids.length)),
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?${params}`,
      { headers: { Authorization: `Bearer ${currentToken}` } }
    );

    // Handle token expiry — refresh once and retry
    if (res.status === 401) {
      await removeCachedToken(currentToken);
      currentToken = await getAuthToken(false);
      const retry = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages?${params}`,
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );
      if (!retry.ok) break;
      const retryData = await retry.json();
      if (!retryData.messages) break;
      ids.push(...retryData.messages.map((m) => m.id));
      pageToken = retryData.nextPageToken;
      if (!pageToken) break;
      continue;
    }

    if (!res.ok) break;

    const data = await res.json();
    if (!data.messages) break;

    ids.push(...data.messages.map((m) => m.id));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return ids;
}

/**
 * Get message metadata (headers only — no body for speed)
 */
async function getMessageHeaders(token, messageId) {
  const res = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const headers = {};
  for (const h of data.payload?.headers || []) {
    headers[h.name.toLowerCase()] = h.value;
  }
  // Include snippet for amount extraction (Gmail returns ~160 chars preview)
  headers._snippet = data.snippet || '';
  return headers;
}

/**
 * Batch fetch message headers with concurrency control
 */
async function batchGetHeaders(token, messageIds, concurrency = 10) {
  const results = [];

  for (let i = 0; i < messageIds.length; i += concurrency) {
    const batch = messageIds.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((id) => getMessageHeaders(token, id))
    );
    results.push(...batchResults.filter(Boolean));
  }

  return results;
}

// ─── Account Discovery ───────────────────────────────────────

/**
 * Scan inbox for signup/welcome emails to discover linked accounts
 */
export async function scanForAccounts(token, onProgress) {
  onProgress?.('Searching for signup emails...');

  const query = ACCOUNT_PATTERNS.searchQuery;
  const messageIds = await searchMessages(token, query, 300);

  onProgress?.(`Found ${messageIds.length} potential signup emails...`);

  const headers = await batchGetHeaders(token, messageIds);

  // Deduplicate by sender domain
  const seen = new Map(); // service name -> account info

  for (const h of headers) {
    const from = h.from || '';
    const subject = h.subject || '';
    const date = h.date || '';

    const emailMatch = from.match(/<([^>]+)>/);
    const senderEmail = emailMatch ? emailMatch[1] : from;
    const domain = senderEmail.split('@')[1]?.toLowerCase();

    if (!domain) continue;
    if (ACCOUNT_PATTERNS.ignoreDomains.some((d) => domain.includes(d))) continue;

    const service = identifyService(domain, from, subject);
    if (!service) continue;

    const existing = seen.get(service.name);
    if (!existing) {
      seen.set(service.name, {
        name: service.name,
        category: service.category,
        domain,
        firstSeen: date,
        lastActivity: date,
      });
    } else {
      const existingDate = new Date(existing.lastActivity);
      const newDate = new Date(date);
      if (newDate > existingDate) existing.lastActivity = date;
      if (newDate < new Date(existing.firstSeen)) existing.firstSeen = date;
    }
  }

  onProgress?.(`Identified ${seen.size} accounts`);

  return Array.from(seen.values()).map((acc, i) => ({
    id: `account-${i}-${acc.domain}`,
    name: acc.name,
    category: acc.category,
    domain: acc.domain,
    firstSeen: acc.firstSeen,
    lastActivity: acc.lastActivity,
  }));
}

// ─── Subscription Tracker ────────────────────────────────────

// Cancellation signals in subjects/snippets
const CANCEL_PATTERNS = [
  /cancel/i, /cancelled/i, /canceled/i,
  /unsubscrib/i, /ended/i, /expired/i,
  /refund/i, /refunded/i,
  /downgrad/i, /plan.?ended/i,
  /subscription.?(end|stop|terminat)/i,
  /no longer/i, /deactivat/i,
  /free trial.?(end|expir|over)/i,
];

// Failed payment signals
const FAILED_PATTERNS = [
  /payment.?fail/i, /declined/i,
  /could not.?charge/i, /unable to.?(process|charge|collect)/i,
  /payment.?(unsuccessful|rejected|declined)/i,
  /card.?(declined|expired|fail)/i,
  /update.?payment/i, /action.?required/i,
  /past.?due/i, /overdue/i,
];

// Renewal / successful charge signals — stricter to avoid order receipts
const CHARGE_PATTERNS = [
  /payment.?(confirm|success|receiv|process)/i,
  /billing.?(statement|confirm|summary)/i, /renewal/i, /renewed/i,
  /your.?(subscription|membership).?(renew|receipt|invoice|payment)/i,
  /thank.?you.?for.?(your )?payment/i,
  /recurring.?(payment|charge|billing)/i,
  /subscription.?(receipt|invoice|payment|confirm|renew)/i,
  /monthly.?(charge|payment|bill)/i,
  /annual.?(charge|payment|bill|renewal)/i,
];

// One-time purchase signals — these are NOT subscriptions
const ONE_TIME_PATTERNS = [
  /order.?(confirm|receipt|ship|deliver|track)/i,
  /shipping.?(confirm|update|notif)/i,
  /delivery.?(confirm|update|notif|schedul)/i,
  /your order/i, /order #/i, /order number/i,
  /tracking/i, /shipped/i, /delivered/i,
  /purchase.?(confirm|receipt)/i,
  /item.?(ship|deliver)/i,
];

/**
 * Classify an email as a charge, cancellation, failure, or other
 */
function classifyBillingEmail(subject, snippet) {
  const text = `${subject} ${snippet}`;

  // Check one-time purchases first — these are NOT subscription charges
  for (const pat of ONE_TIME_PATTERNS) {
    if (pat.test(subject)) return 'other'; // Only check subject, not snippet
  }

  // Check cancellation first (more specific)
  for (const pat of CANCEL_PATTERNS) {
    if (pat.test(text)) return 'cancelled';
  }
  for (const pat of FAILED_PATTERNS) {
    if (pat.test(text)) return 'failed';
  }
  for (const pat of CHARGE_PATTERNS) {
    if (pat.test(text)) return 'charge';
  }
  return 'other';
}

/**
 * Extract amount from subject AND snippet (more reliable)
 */
function extractAmount(subject, snippet) {
  // Try subject first, then snippet
  for (const text of [subject, snippet]) {
    const parsed = parseAmount(text);
    if (parsed) return parsed;
  }
  return null;
}

/**
 * Determine frequency from a sorted array of timestamps
 * Uses the most common gap interval, not just average
 */
function detectFrequency(timestamps) {
  if (timestamps.length < 2) return 'unknown';

  const gaps = [];
  for (let i = 1; i < timestamps.length; i++) {
    const dayGap = (timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60 * 24);
    if (dayGap > 1) gaps.push(dayGap); // Ignore same-day duplicates
  }

  if (gaps.length === 0) return 'unknown';

  // Bucket gaps: weekly(5-10), monthly(25-40), quarterly(80-110), yearly(340-400)
  let monthly = 0, yearly = 0, quarterly = 0, weekly = 0;
  for (const g of gaps) {
    if (g >= 5 && g <= 12) weekly++;
    else if (g >= 25 && g <= 40) monthly++;
    else if (g >= 80 && g <= 110) quarterly++;
    else if (g >= 340 && g <= 400) yearly++;
  }

  const total = gaps.length;
  // If >40% of gaps match a frequency, use it
  if (monthly / total > 0.4) return 'monthly';
  if (yearly / total > 0.4) return 'yearly';
  if (quarterly / total > 0.4) return 'quarterly';
  if (weekly / total > 0.4) return 'weekly';

  // Fallback: use median gap
  const sorted = gaps.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (median < 12) return 'weekly';
  if (median < 50) return 'monthly';
  if (median < 120) return 'quarterly';
  if (median < 400) return 'yearly';
  return 'unknown';
}

/**
 * Determine the most recent consistent amount
 * (takes the amount that appears most often, preferring recent)
 */
function detectAmount(entries) {
  // entries: [{ amount, currency, date }]
  const withAmount = entries.filter((e) => e.amount > 0);
  if (withAmount.length === 0) return { amount: 0, currency: 'USD' };

  // Count occurrences of each amount
  const counts = new Map();
  for (const e of withAmount) {
    const key = `${e.amount}-${e.currency}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  // Find most common amount
  let bestKey = '';
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }

  // If there's a tie, prefer the most recent
  if (bestKey) {
    const [amountStr, currency] = bestKey.split('-');
    return { amount: parseFloat(amountStr), currency };
  }

  // Fallback: most recent
  const latest = withAmount.sort((a, b) => b.date - a.date)[0];
  return { amount: latest.amount, currency: latest.currency };
}

/**
 * Scan inbox for receipt/billing emails to find subscriptions
 */
export async function scanForSubscriptions(token, onProgress) {
  onProgress?.('Searching for billing emails...');

  // Broader search to catch more billing emails
  const query = SUBSCRIPTION_PATTERNS.searchQuery;
  const messageIds = await searchMessages(token, query, 500);

  onProgress?.(`Found ${messageIds.length} billing emails, analyzing...`);

  const headers = await batchGetHeaders(token, messageIds);

  // Also search for cancellation emails specifically
  const cancelQuery = 'subject:(cancelled OR canceled OR "subscription ended" OR unsubscribed OR "plan cancelled" OR refund) newer_than:2y';
  const cancelIds = await searchMessages(token, cancelQuery, 100);
  const cancelHeaders = await batchGetHeaders(token, cancelIds);

  onProgress?.('Classifying billing events...');

  // Group by service
  const serviceMap = new Map();

  function processEmail(h, source) {
    const from = h.from || '';
    const subject = h.subject || '';
    const date = h.date || '';
    const snippet = h._snippet || '';

    const emailMatch = from.match(/<([^>]+)>/);
    const senderEmail = emailMatch ? emailMatch[1] : from;
    const domain = senderEmail.split('@')[1]?.toLowerCase();

    if (!domain) return;
    if (SUBSCRIPTION_PATTERNS.ignoreDomains.some((d) => domain.includes(d))) return;

    const service = identifyService(domain, from, subject, 'subscription');
    if (!service) return;

    const key = service.name;
    if (!serviceMap.has(key)) {
      serviceMap.set(key, {
        name: service.name,
        domain,
        events: [],
        _unknown: !!service._unknown,
      });
    }

    const type = classifyBillingEmail(subject, snippet);
    const amountInfo = extractAmount(subject, snippet);
    const timestamp = new Date(date).getTime();

    if (!isNaN(timestamp)) {
      serviceMap.get(key).events.push({
        type, // 'charge' | 'cancelled' | 'failed' | 'other'
        date: timestamp,
        amount: amountInfo?.amount || 0,
        currency: amountInfo?.currency || 'USD',
        subject,
        source, // 'billing' or 'cancel'
      });
    }
  }

  // Process billing emails
  for (const h of headers) processEmail(h, 'billing');
  // Process cancellation emails
  for (const h of cancelHeaders) processEmail(h, 'cancel');

  onProgress?.('Determining subscription status...');

  const subscriptions = [];

  for (const [, service] of serviceMap) {
    const events = service.events.sort((a, b) => a.date - b.date);

    // Need at least 2 events to be considered a subscription
    if (events.length < 2) continue;

    // Separate event types — only count actual charge-pattern matches, not 'other'
    const charges = events.filter((e) => e.type === 'charge');
    const cancellations = events.filter((e) => e.type === 'cancelled');
    const failures = events.filter((e) => e.type === 'failed');

    // Need at least 2 actual charge events (not just any billing keyword email)
    if (charges.length < 2) continue;

    // For unknown services (not in our database), require stronger evidence:
    // - At least 3 charge events
    // - At least one charge must have a dollar amount
    if (service._unknown) {
      if (charges.length < 3) continue;
      const hasAmount = charges.some((e) => e.amount > 0);
      if (!hasAmount) continue;
    }

    // Determine amount (most consistent charge amount)
    const { amount, currency } = detectAmount(charges);

    // Determine frequency from charge dates
    const chargeDates = charges.map((e) => e.date);
    let frequency = detectFrequency(chargeDates);

    // Skip if no recognizable recurring frequency (likely one-time purchases)
    if (frequency === 'unknown' && charges.length < 4) continue;

    // Normalize frequency for UI — adjust amount proportionally
    let displayAmount = amount;
    if (frequency === 'quarterly') {
      displayAmount = Math.round((amount / 3) * 100) / 100; // quarterly → monthly equivalent
      frequency = 'monthly';
    }
    if (frequency === 'weekly') {
      displayAmount = Math.round((amount * 4.33) * 100) / 100; // weekly → monthly equivalent
      frequency = 'monthly';
    }

    const lastCharge = chargeDates.length > 0
      ? new Date(chargeDates[chargeDates.length - 1]).toISOString()
      : new Date(events[events.length - 1].date).toISOString();

    const lastChargeTime = chargeDates.length > 0
      ? chargeDates[chargeDates.length - 1]
      : events[events.length - 1].date;

    // ─── Determine active/cancelled/failed status ───
    const lastCancellation = cancellations.length > 0
      ? cancellations[cancellations.length - 1].date
      : 0;

    const lastFailure = failures.length > 0
      ? failures[failures.length - 1].date
      : 0;

    const daysSinceLastCharge = (Date.now() - lastChargeTime) / (1000 * 60 * 60 * 24);

    // Determine expected gap based on frequency
    const expectedGapDays = frequency === 'yearly' ? 400 : frequency === 'monthly' ? 45 : 60;

    let status = 'active';

    // If there's a cancellation email AFTER the last charge → cancelled
    if (lastCancellation > lastChargeTime) {
      status = 'cancelled';
    }
    // If there's a recent payment failure with no successful charge after it
    else if (lastFailure > lastChargeTime) {
      status = 'failed';
    }
    // If last charge is way overdue compared to expected frequency → likely cancelled
    else if (daysSinceLastCharge > expectedGapDays * 1.5) {
      status = 'likely_cancelled';
    }

    subscriptions.push({
      id: `sub-${service.domain}`,
      name: service.name,
      domain: service.domain,
      amount: displayAmount,
      currency,
      frequency: frequency === 'unknown' ? 'unknown' : frequency,
      lastCharged: lastCharge,
      active: status === 'active',
      status, // 'active' | 'cancelled' | 'failed' | 'likely_cancelled'
      emailCount: events.length,
      chargeCount: charges.length,
      hasCancellation: cancellations.length > 0,
      hasFailedPayment: failures.length > 0,
      lastFailureDate: lastFailure > 0 ? new Date(lastFailure).toISOString() : null,
      lastCancelDate: lastCancellation > 0 ? new Date(lastCancellation).toISOString() : null,
    });
  }

  onProgress?.(`Found ${subscriptions.length} subscriptions`);

  // Sort: active first, then failed, then cancelled; within each group by amount desc
  const statusOrder = { active: 0, failed: 1, likely_cancelled: 2, cancelled: 3 };
  return subscriptions.sort((a, b) => {
    const orderDiff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
    if (orderDiff !== 0) return orderDiff;
    return b.amount - a.amount;
  });
}
