// Vercel Edge Function — checks if a person's data appears on data broker sites
// Attempts real lookups on brokers with public search/API endpoints

export const config = { runtime: 'edge' };

interface BrokerCheckResult {
  broker: string;
  status: 'found' | 'not_found' | 'error';
}

// Brokers with endpoints that realistically respond to server-side requests.
// Most people-search sites (Spokeo, WhitePages, etc.) block automated requests
// with Cloudflare/CAPTCHAs, so we only include ones that actually work.
const CHECKABLE_BROKERS: {
  name: string;
  check: (email: string) => Promise<BrokerCheckResult>;
}[] = [
  {
    // ThatsThem has a relatively open email lookup page
    name: 'ThatsThem',
    check: async (email) => {
      try {
        const res = await fetch(`https://thatsthem.com/email/${encodeURIComponent(email)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html',
          },
          signal: AbortSignal.timeout(6000),
          redirect: 'follow',
        });
        if (!res.ok) return { broker: 'ThatsThem', status: 'error' };
        const text = await res.text();
        const lower = text.toLowerCase();
        // Their results page shows a table with class "ThatsThem-people-record" when found
        if (lower.includes('thatsthem-people-record') || lower.includes('results for')) {
          return { broker: 'ThatsThem', status: 'found' };
        }
        if (lower.includes('no results') || lower.includes('could not find') || lower.includes('0 results')) {
          return { broker: 'ThatsThem', status: 'not_found' };
        }
        return { broker: 'ThatsThem', status: 'error' };
      } catch {
        return { broker: 'ThatsThem', status: 'error' };
      }
    },
  },
  {
    // Emailrep.io — free API, no key needed, tells if email has been seen on breach/paste sites
    // Not a broker itself but indicates data broker exposure
    name: 'EmailRep',
    check: async (email) => {
      try {
        const res = await fetch(`https://emailrep.io/${encodeURIComponent(email)}`, {
          headers: { 'User-Agent': 'vanish-privacy-scanner' },
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return { broker: 'EmailRep', status: 'error' };
        const data = await res.json();
        // If email has been seen in breaches/data leaks, brokers likely have the data
        if (data.details?.data_breach || data.details?.credentials_leaked) {
          return { broker: 'EmailRep', status: 'found' };
        }
        return { broker: 'EmailRep', status: 'not_found' };
      } catch {
        return { broker: 'EmailRep', status: 'error' };
      }
    },
  },
];

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  if (!email) {
    return json({ error: 'Email parameter required' }, 400);
  }

  // Run all checks in parallel with a global timeout
  const results = await Promise.all(
    CHECKABLE_BROKERS.map((broker) => broker.check(email))
  );

  return json({ results, checked: results.length });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
