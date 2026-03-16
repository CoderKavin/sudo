// ============================================================
// Vanish extension popup logic
// ============================================================

const $ = (sel) => document.querySelector(sel);
const show = (id) => $(`#${id}`)?.classList.remove('hidden');
const hide = (id) => $(`#${id}`)?.classList.add('hidden');

// Display version
$('#version').textContent = `v${chrome.runtime.getManifest().version}`;

// ─── State ───────────────────────────────────────────────────

let pollTimer = null;

async function loadState() {
  const data = await chrome.storage.local.get([
    'vanish_connected', 'vanish_email',
    'vanish_accounts', 'vanish_subscriptions',
    'vanish_scan_status', 'vanish_scan_progress',
  ]);

  if (data.vanish_connected && data.vanish_email) {
    showConnected(data);

    // If a scan is running, show progress and start polling
    if (data.vanish_scan_status === 'scanning') {
      showScanProgress(data.vanish_scan_progress || 'Scanning...');
      startPolling();
    } else {
      stopPolling();
    }
  } else {
    showConnect();
  }
}

function showConnect() {
  show('view-connect');
  hide('view-connected');
  stopPolling();
}

function showConnected(data) {
  hide('view-connect');
  show('view-connected');

  $('#connected-email').textContent = data.vanish_email || '';
  $('#stat-accounts').textContent = data.vanish_accounts?.length ?? '--';
  $('#stat-subscriptions').textContent = data.vanish_subscriptions?.length ?? '--';

  // Reset scan button
  const btn = $('#btn-scan');
  if (data.vanish_scan_status !== 'scanning') {
    btn.disabled = false;
    btn.innerHTML = 'Scan Inbox';
    hide('scan-inline');
  }
}

function showScanProgress(msg) {
  show('scan-inline');
  $('#scan-progress').textContent = msg || 'Scanning...';
  const btn = $('#btn-scan');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Scanning...';
}

// ─── Polling for background scan ─────────────────────────────

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    const data = await chrome.storage.local.get([
      'vanish_scan_status', 'vanish_scan_progress',
      'vanish_accounts', 'vanish_subscriptions',
      'vanish_scan_error',
    ]);

    if (data.vanish_scan_status === 'scanning') {
      showScanProgress(data.vanish_scan_progress);
      // Update stats live
      if (data.vanish_accounts) {
        $('#stat-accounts').textContent = data.vanish_accounts.length;
      }
      if (data.vanish_subscriptions) {
        $('#stat-subscriptions').textContent = data.vanish_subscriptions.length;
      }
    } else if (data.vanish_scan_status === 'complete') {
      stopPolling();
      await loadState();
    } else if (data.vanish_scan_status === 'error') {
      stopPolling();
      hide('scan-inline');
      const btn = $('#btn-scan');
      btn.disabled = false;
      btn.innerHTML = 'Scan Inbox';
      alert('Scan failed: ' + (data.vanish_scan_error || 'Unknown error'));
    }
  }, 1000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// ─── Actions ─────────────────────────────────────────────────

$('#btn-connect').addEventListener('click', async () => {
  const btn = $('#btn-connect');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Connecting...';

  try {
    const res = await chrome.runtime.sendMessage({ type: 'VANISH_CONNECT' });
    if (res?.error) {
      alert('Connection failed: ' + res.error);
      btn.disabled = false;
      btn.textContent = 'Connect Gmail';
      return;
    }
    await loadState();
  } catch (e) {
    alert('Connection failed: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Connect Gmail';
  }
});

$('#btn-scan').addEventListener('click', async () => {
  showScanProgress('Starting scan...');
  const btn = $('#btn-scan');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Scanning...';

  try {
    // Fire-and-forget: service worker runs scan in background
    await chrome.runtime.sendMessage({ type: 'VANISH_SCAN' });
    startPolling();
  } catch (e) {
    alert('Failed to start scan: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Scan Inbox';
    hide('scan-inline');
  }
});

$('#btn-disconnect').addEventListener('click', async () => {
  if (!confirm('Disconnect Gmail? Scan data will be cleared.')) return;
  stopPolling();
  await chrome.runtime.sendMessage({ type: 'VANISH_DISCONNECT' });
  showConnect();
});

$('#btn-open-dashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:5173/dashboard' });
});

// Listen for live progress messages from service worker
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'VANISH_PROGRESS') {
    $('#scan-progress').textContent = msg.message;
  }
});

// ─── Init ────────────────────────────────────────────────────

loadState();
