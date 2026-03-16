// ============================================================
// Vanish extension popup logic
// ============================================================

const $ = (sel) => document.querySelector(sel);
const show = (id) => $(`#${id}`).classList.remove('hidden');
const hide = (id) => $(`#${id}`).classList.add('hidden');

// Display version
$('#version').textContent = `v${chrome.runtime.getManifest().version}`;

// ─── State ───────────────────────────────────────────────────

async function loadState() {
  const data = await chrome.storage.local.get([
    'vanish_connected', 'vanish_email',
    'vanish_accounts', 'vanish_subscriptions',
  ]);

  if (data.vanish_connected && data.vanish_email) {
    showConnected(data);
  } else {
    showConnect();
  }
}

function showConnect() {
  show('view-connect');
  hide('view-connected');
  hide('view-scanning');
}

function showConnected(data) {
  hide('view-connect');
  show('view-connected');
  hide('view-scanning');

  $('#connected-email').textContent = data.vanish_email || '';
  $('#stat-accounts').textContent = data.vanish_accounts?.length ?? '--';
  $('#stat-subscriptions').textContent = data.vanish_subscriptions?.length ?? '--';
}

function showScanning() {
  hide('view-connect');
  hide('view-connected');
  show('view-scanning');
}

// ─── Actions ─────────────────────────────────────────────────

$('#btn-connect').addEventListener('click', async () => {
  $('#btn-connect').disabled = true;
  $('#btn-connect').innerHTML = '<span class="spinner"></span>Connecting...';

  try {
    const res = await chrome.runtime.sendMessage({ type: 'VANISH_CONNECT' });
    if (res?.error) {
      alert('Connection failed: ' + res.error);
      $('#btn-connect').disabled = false;
      $('#btn-connect').textContent = 'Connect Gmail';
      return;
    }
    await loadState();
  } catch (e) {
    alert('Connection failed: ' + e.message);
    $('#btn-connect').disabled = false;
    $('#btn-connect').textContent = 'Connect Gmail';
  }
});

$('#btn-scan').addEventListener('click', async () => {
  showScanning();

  try {
    const res = await chrome.runtime.sendMessage({ type: 'VANISH_SCAN' });
    if (res?.error) {
      alert('Scan failed: ' + res.error);
      await loadState();
      return;
    }
    await loadState();
  } catch (e) {
    alert('Scan failed: ' + e.message);
    await loadState();
  }
});

$('#btn-disconnect').addEventListener('click', async () => {
  if (!confirm('Disconnect Gmail? Scan data will be cleared.')) return;

  await chrome.runtime.sendMessage({ type: 'VANISH_DISCONNECT' });
  showConnect();
});

$('#btn-open-dashboard').addEventListener('click', () => {
  // Try localhost first (dev), then Vercel
  chrome.tabs.create({ url: 'http://localhost:5173/dashboard' });
});

// Listen for scan progress updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'VANISH_PROGRESS') {
    const el = $('#scan-progress');
    if (el) el.textContent = msg.message;
  }
});

// ─── Init ────────────────────────────────────────────────────

loadState();
