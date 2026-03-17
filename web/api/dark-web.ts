// Vercel Edge Function — proxies dark web checks to XposedOrNot
// Required because the API has CORS restrictions from browser origins

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  if (!email) {
    return json({ error: 'Email parameter required' }, 400);
  }

  try {
    const res = await fetch(
      `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(email)}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      },
    );

    if (!res.ok) {
      if (res.status === 404) {
        return json({ breaches_details: [], pastes: null, source: 'xposedornot' });
      }
      return json({ breaches_details: [], pastes: null, source: 'error' });
    }

    const data = await res.json();

    return json({
      breaches_details: data?.ExposedBreaches?.breaches_details ?? [],
      pastes: data?.PastesSummary ?? null,
      source: 'xposedornot',
    });
  } catch {
    return json({ breaches_details: [], pastes: null, source: 'error' });
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': status === 200 ? 'public, max-age=3600' : 'no-store',
    },
  });
}
