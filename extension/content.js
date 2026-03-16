// ============================================================
// Content script — bridges web app <-> extension
// Injected on Vanish web app pages (localhost + vercel)
// ============================================================

// Listen for messages from the web app
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.direction !== 'vanish-web-to-ext') return;

  const { id, type, payload } = event.data;

  try {
    const response = await chrome.runtime.sendMessage({ type, ...payload });

    window.postMessage({
      direction: 'vanish-ext-to-web',
      id,
      response,
    }, '*');
  } catch (e) {
    window.postMessage({
      direction: 'vanish-ext-to-web',
      id,
      response: { error: e.message },
    }, '*');
  }
});

// Announce extension presence to the page
window.postMessage({
  direction: 'vanish-ext-to-web',
  type: 'VANISH_EXTENSION_READY',
  response: { version: chrome.runtime.getManifest().version },
}, '*');
