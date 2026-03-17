// ============================================================
// Data Broker Intelligence Engine
// Uses real breach data to determine which brokers likely have
// the user's data, plus attempts live checks where possible
// ============================================================

import type { ScannedBreach, ScannedDataBroker } from './scanner';

// ---------------------------------------------------------------------------
// Broker database — real brokers with their known data collection methods
// ---------------------------------------------------------------------------

interface BrokerProfile {
  name: string;
  url: string;
  optOutUrl: string | null;
  collectsTypes: string[];
  sources: ('public_records' | 'breach_data' | 'social_scraping' | 'purchase_data' | 'web_tracking' | 'voter_records' | 'property_records')[];
  aggressiveness: 'high' | 'medium' | 'low';
}

const BROKER_PROFILES: BrokerProfile[] = [
  // People search engines — these scrape public records, voter rolls, social media.
  // If you exist online at all, high-aggressiveness brokers almost certainly have you.
  { name: 'Spokeo', url: 'https://www.spokeo.com', optOutUrl: 'https://www.spokeo.com/optout', collectsTypes: ['Name', 'Address', 'Phone', 'Email', 'Social profiles', 'Photos'], sources: ['public_records', 'social_scraping', 'web_tracking'], aggressiveness: 'high' },
  { name: 'WhitePages', url: 'https://www.whitepages.com', optOutUrl: 'https://www.whitepages.com/suppression-requests', collectsTypes: ['Name', 'Address', 'Phone', 'Age', 'Relatives'], sources: ['public_records', 'voter_records', 'property_records'], aggressiveness: 'high' },
  { name: 'BeenVerified', url: 'https://www.beenverified.com', optOutUrl: 'https://www.beenverified.com/app/optout/search', collectsTypes: ['Name', 'Address', 'Phone', 'Email', 'Criminal records'], sources: ['public_records', 'social_scraping', 'voter_records'], aggressiveness: 'high' },
  { name: 'TruePeopleSearch', url: 'https://www.truepeoplesearch.com', optOutUrl: 'https://www.truepeoplesearch.com/removal', collectsTypes: ['Name', 'Address', 'Phone', 'Email', 'Relatives'], sources: ['public_records', 'voter_records'], aggressiveness: 'high' },
  { name: 'FastPeopleSearch', url: 'https://www.fastpeoplesearch.com', optOutUrl: 'https://www.fastpeoplesearch.com/removal', collectsTypes: ['Name', 'Address', 'Phone', 'Age'], sources: ['public_records', 'voter_records'], aggressiveness: 'high' },
  { name: 'PeopleFinder', url: 'https://www.peoplefinder.com', optOutUrl: 'https://www.peoplefinder.com/optout.php', collectsTypes: ['Name', 'Address', 'Phone', 'Email'], sources: ['public_records', 'voter_records'], aggressiveness: 'high' },
  { name: 'Intelius', url: 'https://www.intelius.com', optOutUrl: 'https://www.intelius.com/opt-out/submit/', collectsTypes: ['Name', 'Address', 'Phone', 'Email', 'Background checks'], sources: ['public_records', 'voter_records', 'property_records'], aggressiveness: 'high' },
  { name: 'Radaris', url: 'https://radaris.com', optOutUrl: 'https://radaris.com/control/privacy', collectsTypes: ['Name', 'Address', 'Phone', 'Email', 'Court records'], sources: ['public_records', 'social_scraping'], aggressiveness: 'high' },
  { name: 'Nuwber', url: 'https://nuwber.com', optOutUrl: 'https://nuwber.com/removal/link', collectsTypes: ['Name', 'Address', 'Phone', 'Email', 'Relatives'], sources: ['public_records', 'voter_records'], aggressiveness: 'high' },
  { name: 'ThatsThem', url: 'https://thatsthem.com', optOutUrl: 'https://thatsthem.com/optout', collectsTypes: ['Name', 'Address', 'Phone', 'Email', 'IP address'], sources: ['public_records', 'web_tracking'], aggressiveness: 'high' },
  { name: 'PeopleLooker', url: 'https://www.peoplelooker.com', optOutUrl: 'https://www.peoplelooker.com/f/optout/search', collectsTypes: ['Name', 'Address', 'Phone', 'Email', 'Social profiles'], sources: ['public_records', 'social_scraping'], aggressiveness: 'high' },
  { name: 'Instant Checkmate', url: 'https://www.instantcheckmate.com', optOutUrl: 'https://www.instantcheckmate.com/opt-out/', collectsTypes: ['Name', 'Address', 'Phone', 'Criminal records', 'Social profiles'], sources: ['public_records', 'social_scraping', 'voter_records'], aggressiveness: 'high' },
  { name: 'TruthFinder', url: 'https://www.truthfinder.com', optOutUrl: 'https://www.truthfinder.com/opt-out/', collectsTypes: ['Name', 'Address', 'Phone', 'Email', 'Criminal records'], sources: ['public_records', 'voter_records'], aggressiveness: 'high' },
  { name: 'MyLife', url: 'https://www.mylife.com', optOutUrl: 'https://www.mylife.com/privacy-policy#optout', collectsTypes: ['Name', 'Address', 'Phone', 'Reputation score'], sources: ['public_records', 'social_scraping', 'web_tracking'], aggressiveness: 'high' },
  { name: 'USSearch', url: 'https://www.ussearch.com', optOutUrl: 'https://www.ussearch.com/opt-out/submit/', collectsTypes: ['Name', 'Address', 'Phone', 'Criminal records'], sources: ['public_records'], aggressiveness: 'medium' },
  { name: 'ZabaSearch', url: 'https://www.zabasearch.com', optOutUrl: 'https://www.zabasearch.com/privacy.php', collectsTypes: ['Name', 'Address', 'Phone', 'Age'], sources: ['public_records'], aggressiveness: 'medium' },

  // Enterprise data brokers
  { name: 'Acxiom', url: 'https://www.acxiom.com', optOutUrl: 'https://isapps.acxiom.com/optout/optout.aspx', collectsTypes: ['Name', 'Address', 'Demographics', 'Purchase behavior'], sources: ['purchase_data', 'public_records', 'web_tracking'], aggressiveness: 'high' },
  { name: 'LexisNexis', url: 'https://www.lexisnexis.com', optOutUrl: null, collectsTypes: ['Name', 'Address', 'Financial records', 'Court records'], sources: ['public_records', 'property_records'], aggressiveness: 'medium' },
  { name: 'CoreLogic', url: 'https://www.corelogic.com', optOutUrl: null, collectsTypes: ['Name', 'Address', 'Property records', 'Financial data'], sources: ['property_records', 'public_records'], aggressiveness: 'medium' },
  { name: 'Epsilon', url: 'https://www.epsilon.com', optOutUrl: null, collectsTypes: ['Name', 'Email', 'Purchase history', 'Demographics'], sources: ['purchase_data', 'web_tracking'], aggressiveness: 'high' },
  { name: 'Oracle Data Cloud', url: 'https://www.oracle.com/data-cloud', optOutUrl: null, collectsTypes: ['Name', 'Email', 'Browsing behavior', 'Purchase data'], sources: ['web_tracking', 'purchase_data'], aggressiveness: 'high' },

  // Specialized
  { name: 'Pipl', url: 'https://pipl.com', optOutUrl: null, collectsTypes: ['Name', 'Email', 'Phone', 'Social profiles', 'Photos'], sources: ['social_scraping', 'breach_data', 'public_records'], aggressiveness: 'high' },
  { name: 'Clearview AI', url: 'https://www.clearview.ai', optOutUrl: null, collectsTypes: ['Facial recognition data', 'Photos', 'Social profiles'], sources: ['social_scraping'], aggressiveness: 'high' },
  { name: 'Addresses.com', url: 'https://www.addresses.com', optOutUrl: null, collectsTypes: ['Name', 'Address', 'Phone'], sources: ['public_records'], aggressiveness: 'low' },
  { name: 'AnyWho', url: 'https://www.anywho.com', optOutUrl: null, collectsTypes: ['Name', 'Address', 'Phone'], sources: ['public_records'], aggressiveness: 'low' },
  { name: 'PublicRecords360', url: 'https://www.publicrecords360.com', optOutUrl: null, collectsTypes: ['Name', 'Address', 'Phone', 'Court records'], sources: ['public_records'], aggressiveness: 'low' },
];

// ---------------------------------------------------------------------------
// Data type normalization — maps breach data types to canonical categories
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  name: /\bnames?\b|full.?name|display.?name|first.?name|last.?name/i,
  email: /\bemail/i,
  phone: /\bphone|mobile|telephone|cell/i,
  address: /\baddress|location|city|state|zip|postal/i,
  dob: /\bbirth|dob\b|age\b/i,
  password: /\bpassword|hash|credential|encrypted/i,
  financial: /\bcredit.?card|bank|financial|payment|billing/i,
  ssn: /\bsocial.?security|ssn\b|national.?id/i,
  social: /\bsocial.?profile|social.?media|username/i,
  photo: /\bphoto|image|avatar|facial/i,
  ip: /\bip.?address/i,
};

function getCategory(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [cat, regex] of Object.entries(CATEGORY_KEYWORDS)) {
    if (regex.test(lower)) return cat;
  }
  return null;
}

function categorizeExposedData(breaches: ScannedBreach[]): Set<string> {
  const categories = new Set<string>();
  for (const breach of breaches) {
    for (const dt of breach.dataTypes) {
      const cat = getCategory(dt);
      if (cat) categories.add(cat);
    }
  }
  return categories;
}

function countBrokerTypeMatches(broker: BrokerProfile, exposed: Set<string>): { count: number; matched: string[] } {
  let count = 0;
  const matched: string[] = [];
  for (const bt of broker.collectsTypes) {
    const cat = getCategory(bt);
    if (cat && exposed.has(cat)) {
      count++;
      matched.push(bt);
    }
  }
  return { count, matched };
}

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

type Confidence = 'confirmed' | 'likely' | 'possible';

function scoreBroker(
  broker: BrokerProfile,
  exposed: Set<string>,
  breachCount: number,
  liveStatus?: 'found' | 'not_found' | 'error',
): { include: boolean; confidence: Confidence; dataTypes: string[] } {
  // Live check overrides
  if (liveStatus === 'found') {
    return { include: true, confidence: 'confirmed', dataTypes: broker.collectsTypes };
  }
  if (liveStatus === 'not_found') {
    return { include: false, confidence: 'confirmed', dataTypes: [] };
  }

  const { count: matchCount, matched } = countBrokerTypeMatches(broker, exposed);
  const hasEmail = exposed.has('email');
  const hasName = exposed.has('name');

  // --- High aggressiveness people-search brokers ---
  // These scrape public records + social media. If you have ANY online presence
  // (email in a breach = online presence), they almost certainly have a profile on you.
  if (broker.aggressiveness === 'high') {
    if (breachCount >= 3 && matchCount >= 2) {
      return { include: true, confidence: 'likely', dataTypes: matched.length > 0 ? matched : broker.collectsTypes };
    }
    if (breachCount >= 1 && (hasEmail || hasName)) {
      return { include: true, confidence: 'possible', dataTypes: matched.length > 0 ? matched : broker.collectsTypes.slice(0, 3) };
    }
    // Even with 0 breaches but known email, aggressive brokers still likely have data
    // (they scrape independently of breaches)
    if (hasEmail) {
      return { include: true, confidence: 'possible', dataTypes: ['Email', 'Name'] };
    }
  }

  // --- Medium aggressiveness ---
  if (broker.aggressiveness === 'medium') {
    if (breachCount >= 3 && matchCount >= 2) {
      return { include: true, confidence: 'possible', dataTypes: matched.length > 0 ? matched : broker.collectsTypes.slice(0, 3) };
    }
    if (breachCount >= 5 && (hasEmail || hasName)) {
      return { include: true, confidence: 'possible', dataTypes: matched.length > 0 ? matched : broker.collectsTypes.slice(0, 2) };
    }
  }

  // --- Low aggressiveness ---
  if (broker.aggressiveness === 'low') {
    if (breachCount >= 5 && matchCount >= 2) {
      return { include: true, confidence: 'possible', dataTypes: matched };
    }
  }

  // Pipl specifically uses breach data as a source
  if (broker.sources.includes('breach_data') && breachCount >= 1) {
    return { include: true, confidence: breachCount >= 3 ? 'likely' : 'possible', dataTypes: matched.length > 0 ? matched : broker.collectsTypes.slice(0, 3) };
  }

  return { include: false, confidence: 'possible', dataTypes: [] };
}

// ---------------------------------------------------------------------------
// Live broker checks via serverless function
// ---------------------------------------------------------------------------

interface LiveCheckResult {
  broker: string;
  status: 'found' | 'not_found' | 'error';
}

async function fetchLiveChecks(email: string): Promise<Map<string, LiveCheckResult>> {
  const results = new Map<string, LiveCheckResult>();
  try {
    const res = await fetch(`/api/broker-check?email=${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      for (const result of (data.results || []) as LiveCheckResult[]) {
        results.set(result.broker, result);
      }
    }
  } catch {
    // Live checks unavailable — heuristic only
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function analyzeBrokerExposure(
  email: string,
  breaches: ScannedBreach[],
): Promise<ScannedDataBroker[]> {
  // Fire live checks in parallel — don't block on them
  const liveCheckPromise = fetchLiveChecks(email);

  const exposed = categorizeExposedData(breaches);
  // The user's email is always "exposed" — they typed it in to scan
  exposed.add('email');

  const liveResults = await liveCheckPromise;

  const results: ScannedDataBroker[] = [];

  for (let i = 0; i < BROKER_PROFILES.length; i++) {
    const broker = BROKER_PROFILES[i];
    const live = liveResults.get(broker.name);

    const { include, confidence, dataTypes } = scoreBroker(
      broker, exposed, breaches.length, live?.status,
    );

    if (include) {
      results.push({
        id: `broker-${i}-${broker.name.replace(/\s+/g, '-').toLowerCase()}`,
        name: broker.name,
        email,
        status: 'found',
        dataTypes,
        url: broker.url,
        optOutUrl: broker.optOutUrl,
        confidence,
      });
    }
  }

  // Sort: confirmed > likely > possible
  const order: Record<string, number> = { confirmed: 0, likely: 1, possible: 2 };
  return results.sort((a, b) => (order[a.confidence ?? 'possible'] ?? 3) - (order[b.confidence ?? 'possible'] ?? 3));
}
