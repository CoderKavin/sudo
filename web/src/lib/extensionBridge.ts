// ============================================================
// Extension bridge — communicates with Vanish Chrome extension
// Uses window.postMessage via content script
// ============================================================

let extensionReady = false;
let extensionVersion: string | null = null;

// Listen for extension announcements
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.direction !== 'vanish-ext-to-web') return;

    if (event.data.type === 'VANISH_EXTENSION_READY') {
      extensionReady = true;
      extensionVersion = event.data.response?.version ?? null;
    }
  });
}

/**
 * Check if the Vanish extension is installed
 */
export function isExtensionInstalled(): boolean {
  return extensionReady;
}

export function getExtensionVersion(): string | null {
  return extensionVersion;
}

// Pending response callbacks
const pendingCallbacks = new Map<string, (response: unknown) => void>();
let callId = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.direction !== 'vanish-ext-to-web') return;
    if (!event.data.id) return;

    const cb = pendingCallbacks.get(event.data.id);
    if (cb) {
      pendingCallbacks.delete(event.data.id);
      cb(event.data.response);
    }
  });
}

/**
 * Send a message to the extension and await the response
 */
function sendToExtension(type: string, payload: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    if (!extensionReady) {
      reject(new Error('Extension not installed'));
      return;
    }

    const id = `vanish-${++callId}-${Date.now()}`;
    const timeout = setTimeout(() => {
      pendingCallbacks.delete(id);
      reject(new Error('Extension response timeout'));
    }, 30000);

    pendingCallbacks.set(id, (response) => {
      clearTimeout(timeout);
      resolve(response as Record<string, unknown>);
    });

    window.postMessage({
      direction: 'vanish-web-to-ext',
      id,
      type,
      payload,
    }, '*');
  });
}

/**
 * Ping the extension to check connectivity
 */
export async function pingExtension(): Promise<boolean> {
  try {
    const res = await sendToExtension('VANISH_PING');
    return !!(res as { ok?: boolean })?.ok;
  } catch {
    return false;
  }
}

/**
 * Connect Gmail via the extension
 */
export async function connectGmail(): Promise<{ ok: boolean; email?: string; error?: string }> {
  const res = await sendToExtension('VANISH_CONNECT');
  return res as { ok: boolean; email?: string; error?: string };
}

/**
 * Run a full inbox scan via the extension
 */
export async function runExtensionScan(): Promise<{
  ok: boolean;
  accounts?: DiscoveredAccount[];
  subscriptions?: TrackedSubscription[];
  error?: string;
}> {
  const res = await sendToExtension('VANISH_SCAN');
  return res as {
    ok: boolean;
    accounts?: DiscoveredAccount[];
    subscriptions?: TrackedSubscription[];
    error?: string;
  };
}

/**
 * Get cached scan data from the extension
 */
export async function getExtensionData(): Promise<{
  vanish_connected?: boolean;
  vanish_email?: string;
  vanish_accounts?: DiscoveredAccount[];
  vanish_subscriptions?: TrackedSubscription[];
}> {
  const res = await sendToExtension('VANISH_GET_DATA');
  return res as {
    vanish_connected?: boolean;
    vanish_email?: string;
    vanish_accounts?: DiscoveredAccount[];
    vanish_subscriptions?: TrackedSubscription[];
  };
}

/**
 * Disconnect Gmail via the extension
 */
export async function disconnectGmail(): Promise<void> {
  await sendToExtension('VANISH_DISCONNECT');
}

// ─── Types ───────────────────────────────────────────────────

export interface DiscoveredAccount {
  id: string;
  name: string;
  category: string;
  domain: string;
  firstSeen: string;
  lastActivity: string;
}

export interface TrackedSubscription {
  id: string;
  name: string;
  domain: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'yearly' | 'unknown';
  lastCharged: string;
  active: boolean;
  status?: 'active' | 'cancelled' | 'failed' | 'likely_cancelled';
  subscriptionType?: 'paid' | 'free_trial' | 'freemium' | 'unknown';
  trialEndsAt?: string | null;
  emailCount: number;
  chargeCount?: number;
  hasCancellation?: boolean;
  hasFailedPayment?: boolean;
  lastFailureDate?: string | null;
  lastCancelDate?: string | null;
}
