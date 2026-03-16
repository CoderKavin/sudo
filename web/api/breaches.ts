// Vercel Edge Function — proxies breach check to XposedOrNot (free, no API key)
// This runs server-side to avoid CORS issues with the third-party API

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  if (!email) {
    return new Response(JSON.stringify({ error: 'Email parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // XposedOrNot breach-analytics endpoint — returns detailed breach info per email
    const res = await fetch(
      `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(email)}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!res.ok) {
      // 404 = email not found in any breach (good news for the user)
      if (res.status === 404) {
        return json({ breaches: [], source: 'xposedornot' });
      }
      return json({ breaches: [], source: 'xposedornot', error: 'upstream_error' });
    }

    const data = await res.json();

    // Transform XposedOrNot response to our format
    const details = data?.ExposedBreaches?.breaches_details ?? [];

    const breaches = details.map((b: Record<string, string | number>) => ({
      name: String(b.breach ?? 'Unknown'),
      domain: String(b.domain ?? ''),
      date: String(b.xposed_date ?? 'Unknown'),
      dataTypes: String(b.xposed_data ?? '')
        .split(';')
        .map((s: string) => s.trim())
        .filter(Boolean),
      records: Number(b.xposed_records ?? 0),
      industry: String(b.industry ?? ''),
      verified: b.verified === 'Yes',
    }));

    return json({ breaches, source: 'xposedornot' });
  } catch {
    // Network error / timeout — client will fall back to mock data
    return json({ breaches: [], source: 'error' });
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // cache 1hr per email
    },
  });
}
