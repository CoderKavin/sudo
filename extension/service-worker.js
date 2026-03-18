// ============================================================
// Vanish extension service worker
// Handles Gmail scanning + message passing to web app
// ============================================================

import { getAuthToken, removeCachedToken, getUserEmail, scanForAccounts, scanForSubscriptions } from './lib/gmail-scanner.js';

// ─── Message handler ─────────────────────────────────────────

function handleMessage(message, sendResponse) {
  if (message.type === 'VANISH_PING') {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return;
  }

  if (message.type === 'VANISH_CONNECT') {
    handleConnect()
      .then(sendResponse)
      .catch((e) => {
        console.error('[Vanish] Connect error:', e);
        sendResponse({ ok: false, error: e.message });
      });
    return;
  }

  // Fire-and-forget scan: starts in background, responds immediately
  if (message.type === 'VANISH_SCAN') {
    // Guard against concurrent scans
    chrome.storage.local.get('vanish_scan_status', (data) => {
      if (data.vanish_scan_status === 'scanning') {
        sendResponse({ ok: true, started: false, reason: 'already_scanning' });
        return;
      }
      sendResponse({ ok: true, started: true });
    });
    // Run scan in background — results go to chrome.storage
    handleScan().catch((e) => {
      console.error('[Vanish] Scan error:', e);
      chrome.storage.local.set({
        vanish_scan_status: 'error',
        vanish_scan_error: e.message,
      });
    });
    return;
  }

  // Poll scan status
  if (message.type === 'VANISH_SCAN_STATUS') {
    chrome.storage.local.get([
      'vanish_scan_status', 'vanish_scan_progress', 'vanish_scan_error',
      'vanish_accounts', 'vanish_subscriptions',
    ], (data) => {
      sendResponse(data);
    });
    return;
  }

  if (message.type === 'VANISH_GET_DATA') {
    chrome.storage.local.get([
      'vanish_accounts', 'vanish_subscriptions',
      'vanish_email', 'vanish_connected',
      'vanish_scan_status', 'vanish_scan_progress',
    ], (data) => {
      sendResponse(data);
    });
    return;
  }

  if (message.type === 'VANISH_DISCONNECT') {
    handleDisconnect()
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true;
});

// Also handle external messages from the web app (same logic)
chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true;
});

// ─── Handlers ────────────────────────────────────────────────

async function handleConnect() {
  const token = await getAuthToken(true);
  const email = await getUserEmail(token);

  await chrome.storage.local.set({
    vanish_connected: true,
    vanish_email: email,
    vanish_token: token,
  });

  return { ok: true, email };
}

async function handleDisconnect() {
  const data = await chrome.storage.local.get('vanish_token');
  if (data.vanish_token) {
    await removeCachedToken(data.vanish_token);
  }

  await chrome.storage.local.remove([
    'vanish_connected', 'vanish_email', 'vanish_token',
    'vanish_accounts', 'vanish_subscriptions', 'vanish_last_scan',
    'vanish_scan_status', 'vanish_scan_progress', 'vanish_scan_error',
  ]);

  return { ok: true };
}

async function handleScan() {
  // Keep service worker alive during long scans (MV3 kills after ~30s of no Chrome API calls)
  const keepAlive = setInterval(() => {
    chrome.storage.local.set({ vanish_keepalive: Date.now() });
  }, 20000);

  try {
    return await _runScan();
  } finally {
    clearInterval(keepAlive);
    chrome.storage.local.remove('vanish_keepalive');
  }
}

async function _runScan() {
  await chrome.storage.local.set({
    vanish_scan_status: 'scanning',
    vanish_scan_progress: 'Starting scan...',
    vanish_scan_error: null,
  });

  const data = await chrome.storage.local.get('vanish_token');
  let token = data.vanish_token;

  if (!token) {
    token = await getAuthToken(true);
    const email = await getUserEmail(token);
    await chrome.storage.local.set({ vanish_connected: true, vanish_email: email, vanish_token: token });
  }

  // Run both scans
  const accounts = await scanForAccounts(token, (msg) => {
    chrome.storage.local.set({ vanish_scan_progress: msg });
    broadcastProgress(msg);
  });

  const subscriptions = await scanForSubscriptions(token, (msg) => {
    chrome.storage.local.set({ vanish_scan_progress: msg });
    broadcastProgress(msg);
  });

  // Persist results + mark complete
  await chrome.storage.local.set({
    vanish_accounts: accounts,
    vanish_subscriptions: subscriptions,
    vanish_last_scan: new Date().toISOString(),
    vanish_scan_status: 'complete',
    vanish_scan_progress: `Found ${accounts.length} accounts and ${subscriptions.length} subscriptions`,
  });

  return { ok: true, accounts, subscriptions };
}

function broadcastProgress(message) {
  chrome.runtime.sendMessage({ type: 'VANISH_PROGRESS', message }).catch(() => {});
}
