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

  while (ids.length < maxResults) {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(Math.min(100, maxResults - ids.length)),
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
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
  return headers;
}

/**
 * Batch fetch message headers (up to 50 at a time via individual fetches)
 * Gmail batch API is complex; parallel individual fetches are simpler and fast enough
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
  const seen = new Map(); // domain -> account info

  for (const h of headers) {
    const from = h.from || '';
    const subject = h.subject || '';
    const date = h.date || '';

    // Extract email from "Name <email>" format
    const emailMatch = from.match(/<([^>]+)>/);
    const senderEmail = emailMatch ? emailMatch[1] : from;
    const domain = senderEmail.split('@')[1]?.toLowerCase();

    if (!domain) continue;
    // Skip common non-service domains
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
      // Update last activity
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

/**
 * Scan inbox for receipt/billing emails to find subscriptions
 */
export async function scanForSubscriptions(token, onProgress) {
  onProgress?.('Searching for billing emails...');

  const query = SUBSCRIPTION_PATTERNS.searchQuery;
  const messageIds = await searchMessages(token, query, 300);

  onProgress?.(`Found ${messageIds.length} potential billing emails...`);

  const headers = await batchGetHeaders(token, messageIds);

  // Group by sender domain to identify recurring charges
  const senderGroups = new Map(); // service name -> { count, dates, subjects }

  for (const h of headers) {
    const from = h.from || '';
    const subject = h.subject || '';
    const date = h.date || '';

    const emailMatch = from.match(/<([^>]+)>/);
    const senderEmail = emailMatch ? emailMatch[1] : from;
    const domain = senderEmail.split('@')[1]?.toLowerCase();

    if (!domain) continue;
    if (SUBSCRIPTION_PATTERNS.ignoreDomains.some((d) => domain.includes(d))) continue;

    const service = identifyService(domain, from, subject);
    if (!service) continue;

    const key = service.name;
    if (!senderGroups.has(key)) {
      senderGroups.set(key, { name: service.name, domain, count: 0, dates: [], subjects: [] });
    }
    const group = senderGroups.get(key);
    group.count++;
    group.dates.push(date);
    group.subjects.push(subject);
  }

  onProgress?.('Analyzing recurring charges...');

  // Filter to likely subscriptions (2+ billing emails = recurring)
  const subscriptions = [];

  for (const [, group] of senderGroups) {
    if (group.count < 2) continue; // Need at least 2 occurrences to be "recurring"

    // Try to extract amount from subjects
    let amount = 0;
    let currency = 'USD';
    for (const subj of group.subjects) {
      const parsed = parseAmount(subj);
      if (parsed) {
        amount = parsed.amount;
        currency = parsed.currency;
        break;
      }
    }

    // Determine frequency from date gaps
    const sortedDates = group.dates
      .map((d) => new Date(d).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b);

    let frequency = 'unknown';
    if (sortedDates.length >= 2) {
      const gaps = [];
      for (let i = 1; i < sortedDates.length; i++) {
        gaps.push((sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24));
      }
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      if (avgGap < 45) frequency = 'monthly';
      else if (avgGap < 400) frequency = 'yearly';
    }

    const lastDate = sortedDates.length > 0
      ? new Date(sortedDates[sortedDates.length - 1]).toISOString()
      : '';

    // Consider active if last charge was within 45 days
    const daysSinceLastCharge = sortedDates.length > 0
      ? (Date.now() - sortedDates[sortedDates.length - 1]) / (1000 * 60 * 60 * 24)
      : Infinity;

    subscriptions.push({
      id: `sub-${group.domain}`,
      name: group.name,
      domain: group.domain,
      amount,
      currency,
      frequency,
      lastCharged: lastDate,
      active: daysSinceLastCharge < 45,
      emailCount: group.count,
    });
  }

  onProgress?.(`Found ${subscriptions.length} subscriptions`);

  // Sort: active first, then by amount descending
  return subscriptions.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return b.amount - a.amount;
  });
}
