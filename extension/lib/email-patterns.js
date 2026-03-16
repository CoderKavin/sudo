// ============================================================
// Email pattern matching for service identification
// ============================================================

// ─── Known services by domain ────────────────────────────────
const DOMAIN_MAP = {
  // Social
  'facebookmail.com': { name: 'Facebook', category: 'social' },
  'facebook.com': { name: 'Facebook', category: 'social' },
  'instagram.com': { name: 'Instagram', category: 'social' },
  'twitter.com': { name: 'Twitter / X', category: 'social' },
  'x.com': { name: 'Twitter / X', category: 'social' },
  'linkedin.com': { name: 'LinkedIn', category: 'social' },
  'tiktok.com': { name: 'TikTok', category: 'social' },
  'snapchat.com': { name: 'Snapchat', category: 'social' },
  'reddit.com': { name: 'Reddit', category: 'social' },
  'redditmail.com': { name: 'Reddit', category: 'social' },
  'pinterest.com': { name: 'Pinterest', category: 'social' },
  'discord.com': { name: 'Discord', category: 'social' },
  'discordapp.com': { name: 'Discord', category: 'social' },
  'tumblr.com': { name: 'Tumblr', category: 'social' },
  'threads.net': { name: 'Threads', category: 'social' },

  // Shopping
  'amazon.com': { name: 'Amazon', category: 'shopping' },
  'ebay.com': { name: 'eBay', category: 'shopping' },
  'walmart.com': { name: 'Walmart', category: 'shopping' },
  'target.com': { name: 'Target', category: 'shopping' },
  'etsy.com': { name: 'Etsy', category: 'shopping' },
  'shopify.com': { name: 'Shopify', category: 'shopping' },
  'bestbuy.com': { name: 'Best Buy', category: 'shopping' },
  'nike.com': { name: 'Nike', category: 'shopping' },
  'aliexpress.com': { name: 'AliExpress', category: 'shopping' },

  // Finance
  'paypal.com': { name: 'PayPal', category: 'finance' },
  'venmo.com': { name: 'Venmo', category: 'finance' },
  'cash.app': { name: 'Cash App', category: 'finance' },
  'square.com': { name: 'Cash App', category: 'finance' },
  'robinhood.com': { name: 'Robinhood', category: 'finance' },
  'coinbase.com': { name: 'Coinbase', category: 'finance' },
  'stripe.com': { name: 'Stripe', category: 'finance' },
  'wise.com': { name: 'Wise', category: 'finance' },

  // Entertainment
  'netflix.com': { name: 'Netflix', category: 'entertainment' },
  'spotify.com': { name: 'Spotify', category: 'entertainment' },
  'youtube.com': { name: 'YouTube', category: 'entertainment' },
  'disneyplus.com': { name: 'Disney+', category: 'entertainment' },
  'hulu.com': { name: 'Hulu', category: 'entertainment' },
  'apple.com': { name: 'Apple', category: 'entertainment' },
  'hbo.com': { name: 'HBO Max', category: 'entertainment' },
  'hbomax.com': { name: 'HBO Max', category: 'entertainment' },
  'twitch.tv': { name: 'Twitch', category: 'entertainment' },
  'soundcloud.com': { name: 'SoundCloud', category: 'entertainment' },

  // Work
  'slack.com': { name: 'Slack', category: 'work' },
  'slackbot.com': { name: 'Slack', category: 'work' },
  'notion.so': { name: 'Notion', category: 'work' },
  'trello.com': { name: 'Trello', category: 'work' },
  'asana.com': { name: 'Asana', category: 'work' },
  'atlassian.com': { name: 'Jira', category: 'work' },
  'github.com': { name: 'GitHub', category: 'work' },
  'figma.com': { name: 'Figma', category: 'work' },
  'zoom.us': { name: 'Zoom', category: 'work' },
  'canva.com': { name: 'Canva', category: 'work' },
  'dropbox.com': { name: 'Dropbox', category: 'work' },

  // Newsletters
  'substack.com': { name: 'Substack', category: 'newsletters' },
  'medium.com': { name: 'Medium', category: 'newsletters' },
  'beehiiv.com': { name: 'Beehiiv', category: 'newsletters' },

  // Gaming
  'steampowered.com': { name: 'Steam', category: 'gaming' },
  'epicgames.com': { name: 'Epic Games', category: 'gaming' },
  'playstation.com': { name: 'PlayStation', category: 'gaming' },
  'xbox.com': { name: 'Xbox', category: 'gaming' },
  'nintendo.com': { name: 'Nintendo', category: 'gaming' },
  'riotgames.com': { name: 'Riot Games', category: 'gaming' },
  'ea.com': { name: 'EA', category: 'gaming' },
  'ubisoft.com': { name: 'Ubisoft', category: 'gaming' },

  // Travel
  'airbnb.com': { name: 'Airbnb', category: 'travel' },
  'booking.com': { name: 'Booking.com', category: 'travel' },
  'expedia.com': { name: 'Expedia', category: 'travel' },
  'uber.com': { name: 'Uber', category: 'travel' },
  'lyft.com': { name: 'Lyft', category: 'travel' },

  // Food
  'doordash.com': { name: 'DoorDash', category: 'food' },
  'ubereats.com': { name: 'Uber Eats', category: 'food' },
  'grubhub.com': { name: 'Grubhub', category: 'food' },
  'instacart.com': { name: 'Instacart', category: 'food' },
  'starbucks.com': { name: 'Starbucks', category: 'food' },

  // Health
  'myfitnesspal.com': { name: 'MyFitnessPal', category: 'health' },
  'fitbit.com': { name: 'Fitbit', category: 'health' },
  'headspace.com': { name: 'Headspace', category: 'health' },
  'onepeloton.com': { name: 'Peloton', category: 'health' },
  'calm.com': { name: 'Calm', category: 'health' },
  'noom.com': { name: 'Noom', category: 'health' },

  // AI
  'openai.com': { name: 'ChatGPT', category: 'work' },
  'anthropic.com': { name: 'Claude', category: 'work' },

  // Other
  'nordvpn.com': { name: 'NordVPN', category: 'work' },
  'duolingo.com': { name: 'Duolingo', category: 'entertainment' },
  'grammarly.com': { name: 'Grammarly', category: 'work' },
};

/**
 * Identify a service from sender domain, from header, and subject
 */
export function identifyService(domain, from, subject) {
  // Direct domain match
  for (const [knownDomain, service] of Object.entries(DOMAIN_MAP)) {
    if (domain === knownDomain || domain.endsWith('.' + knownDomain)) {
      return service;
    }
  }

  // Try to extract a readable name from the "From" field
  const nameMatch = from.match(/^"?([^"<]+)"?\s*</);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    // Skip generic senders
    if (name.length > 2 && name.length < 40 && !/^(no-?reply|info|support|help|team|hello|hi|contact|admin|mail)$/i.test(name)) {
      // Use the root domain as category hint
      return { name, category: 'other' };
    }
  }

  return null;
}

// ─── Search queries ──────────────────────────────────────────

export const ACCOUNT_PATTERNS = {
  searchQuery: [
    'subject:("welcome to" OR "thanks for signing up" OR "confirm your email" OR',
    '"verify your email" OR "account created" OR "you\'re in" OR "get started" OR',
    '"thanks for joining" OR "registration" OR "activate your account" OR',
    '"confirm your account" OR "verify your account")',
  ].join(' '),

  ignoreDomains: [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
    'protonmail.com', 'aol.com', 'mail.com', 'googlemail.com',
    'mailchimp.com', 'sendgrid.net', 'mailgun.org', 'amazonaws.com',
    'constantcontact.com', 'campaignmonitor.com',
  ],
};

export const SUBSCRIPTION_PATTERNS = {
  searchQuery: [
    'subject:("receipt" OR "invoice" OR "payment" OR "subscription" OR',
    '"billing" OR "your order" OR "payment confirmation" OR "charge" OR',
    '"renewal" OR "monthly" OR "annual" OR "plan" OR "membership")',
    'newer_than:1y',
  ].join(' '),

  ignoreDomains: [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'protonmail.com', 'aol.com',
  ],
};

// ─── Amount parsing ──────────────────────────────────────────

/**
 * Try to extract a dollar/currency amount from an email subject
 */
export function parseAmount(subject) {
  // Match patterns like $14.99, USD 14.99, 14.99 USD, etc.
  const patterns = [
    /\$(\d+(?:\.\d{2})?)/,
    /USD\s*(\d+(?:\.\d{2})?)/i,
    /(\d+(?:\.\d{2})?)\s*USD/i,
    /€(\d+(?:\.\d{2})?)/,
    /£(\d+(?:\.\d{2})?)/,
  ];

  for (const pat of patterns) {
    const match = subject.match(pat);
    if (match) {
      const amount = parseFloat(match[1]);
      if (amount > 0 && amount < 10000) {
        const currency = subject.includes('€') ? 'EUR' : subject.includes('£') ? 'GBP' : 'USD';
        return { amount, currency };
      }
    }
  }

  return null;
}
