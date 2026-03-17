// ============================================================
// Password exposure check using Have I Been Pwned k-anonymity API
// Your password never leaves the device — only the first 5 chars
// of its SHA-1 hash are sent to the API
// ============================================================

export interface PasswordCheckResult {
  exposed: boolean;
  count: number;
}

async function sha1(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Check if a password has been exposed in known data breaches.
 * Uses the HIBP Passwords API with k-anonymity (range search).
 * Only the first 5 characters of the SHA-1 hash are sent — the full
 * password and hash never leave the browser.
 */
export async function checkPasswordExposure(password: string): Promise<PasswordCheckResult> {
  const hash = await sha1(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error('HIBP API unavailable');
  }

  const text = await res.text();

  // Response is lines of "SUFFIX:COUNT"
  for (const line of text.split('\n')) {
    const [hashSuffix, countStr] = line.trim().split(':');
    if (hashSuffix === suffix) {
      return { exposed: true, count: parseInt(countStr, 10) };
    }
  }

  return { exposed: false, count: 0 };
}
