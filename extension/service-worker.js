// ============================================================
// Vanish extension service worker
// Handles Gmail scanning + message passing to web app
// ============================================================

import { getAuthToken, removeCachedToken, getUserEmail, scanForAccounts, scanForSubscriptions } from './lib/gmail-scanner.js';

// ─── Message handler ─────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VANISH_PING') {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return true;
  }

  if (message.type === 'VANISH_CONNECT') {
    handleConnect().then(sendResponse).catch((e) => sendResponse({ error: e.message }));
    return true; // async
  }

  if (message.type === 'VANISH_SCAN') {
    handleScan(message.onlyAccounts, message.onlySubscriptions)
      .then(sendResponse)
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }

  if (message.type === 'VANISH_GET_DATA') {
    chrome.storage.local.get(['vanish_accounts', 'vanish_subscriptions', 'vanish_email', 'vanish_connected'], (data) => {
      sendResponse(data);
    });
    return true;
  }

  if (message.type === 'VANISH_DISCONNECT') {
    handleDisconnect().then(sendResponse).catch((e) => sendResponse({ error: e.message }));
    return true;
  }

  return false;
});

// Also handle external messages from the web app
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // Re-use same handler
  chrome.runtime.onMessage.dispatch(message, sender, sendResponse);
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
  ]);

  return { ok: true };
}

async function handleScan() {
  const data = await chrome.storage.local.get('vanish_token');
  let token = data.vanish_token;

  if (!token) {
    token = await getAuthToken(true);
    const email = await getUserEmail(token);
    await chrome.storage.local.set({ vanish_connected: true, vanish_email: email, vanish_token: token });
  }

  // Run both scans
  const accounts = await scanForAccounts(token, (msg) => {
    broadcastProgress(msg);
  });

  const subscriptions = await scanForSubscriptions(token, (msg) => {
    broadcastProgress(msg);
  });

  // Persist results
  await chrome.storage.local.set({
    vanish_accounts: accounts,
    vanish_subscriptions: subscriptions,
    vanish_last_scan: new Date().toISOString(),
  });

  return { ok: true, accounts, subscriptions };
}

function broadcastProgress(message) {
  // Send progress to popup if open
  chrome.runtime.sendMessage({ type: 'VANISH_PROGRESS', message }).catch(() => {});
}
