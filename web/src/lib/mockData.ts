// ============================================================
// Mock data arrays for the Vanish digital footprint scanner
// ============================================================

export interface KnownService {
  name: string;
  category: 'social' | 'shopping' | 'finance' | 'entertainment' | 'work' | 'newsletters' | 'gaming' | 'travel' | 'food' | 'health';
  iconLetter: string;
  color: string;
}

export interface KnownSubscription {
  name: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'yearly';
  iconLetter: string;
  color: string;
}

export interface KnownBreach {
  name: string;
  date: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dataTypes: string[];
}

export interface DataBrokerEntry {
  name: string;
  url: string;
  dataTypes: string[];
}

// ---------------------------------------------------------------------------
// 80+ known services across 10 categories
// ---------------------------------------------------------------------------
export const KNOWN_SERVICES: KnownService[] = [
  // Social (12)
  { name: 'Facebook', category: 'social', iconLetter: 'F', color: '#1877F2' },
  { name: 'Instagram', category: 'social', iconLetter: 'I', color: '#E4405F' },
  { name: 'Twitter / X', category: 'social', iconLetter: 'X', color: '#1DA1F2' },
  { name: 'LinkedIn', category: 'social', iconLetter: 'L', color: '#0A66C2' },
  { name: 'TikTok', category: 'social', iconLetter: 'T', color: '#010101' },
  { name: 'Snapchat', category: 'social', iconLetter: 'S', color: '#FFFC00' },
  { name: 'Reddit', category: 'social', iconLetter: 'R', color: '#FF4500' },
  { name: 'Pinterest', category: 'social', iconLetter: 'P', color: '#E60023' },
  { name: 'Tumblr', category: 'social', iconLetter: 'T', color: '#36465D' },
  { name: 'Discord', category: 'social', iconLetter: 'D', color: '#5865F2' },
  { name: 'Mastodon', category: 'social', iconLetter: 'M', color: '#6364FF' },
  { name: 'Threads', category: 'social', iconLetter: 'T', color: '#000000' },

  // Shopping (10)
  { name: 'Amazon', category: 'shopping', iconLetter: 'A', color: '#FF9900' },
  { name: 'eBay', category: 'shopping', iconLetter: 'E', color: '#E53238' },
  { name: 'Walmart', category: 'shopping', iconLetter: 'W', color: '#0071CE' },
  { name: 'Target', category: 'shopping', iconLetter: 'T', color: '#CC0000' },
  { name: 'Etsy', category: 'shopping', iconLetter: 'E', color: '#F16521' },
  { name: 'Wish', category: 'shopping', iconLetter: 'W', color: '#2FB7EC' },
  { name: 'AliExpress', category: 'shopping', iconLetter: 'A', color: '#E62E2E' },
  { name: 'Shopify Store', category: 'shopping', iconLetter: 'S', color: '#96BF48' },
  { name: 'Best Buy', category: 'shopping', iconLetter: 'B', color: '#0046BE' },
  { name: 'Nike', category: 'shopping', iconLetter: 'N', color: '#111111' },

  // Finance (8)
  { name: 'PayPal', category: 'finance', iconLetter: 'P', color: '#00457C' },
  { name: 'Venmo', category: 'finance', iconLetter: 'V', color: '#3D95CE' },
  { name: 'Cash App', category: 'finance', iconLetter: 'C', color: '#00D632' },
  { name: 'Robinhood', category: 'finance', iconLetter: 'R', color: '#00C805' },
  { name: 'Coinbase', category: 'finance', iconLetter: 'C', color: '#0052FF' },
  { name: 'Mint', category: 'finance', iconLetter: 'M', color: '#16CE87' },
  { name: 'Stripe', category: 'finance', iconLetter: 'S', color: '#635BFF' },
  { name: 'Wise', category: 'finance', iconLetter: 'W', color: '#9FE870' },

  // Entertainment (10)
  { name: 'Netflix', category: 'entertainment', iconLetter: 'N', color: '#E50914' },
  { name: 'Spotify', category: 'entertainment', iconLetter: 'S', color: '#1DB954' },
  { name: 'YouTube', category: 'entertainment', iconLetter: 'Y', color: '#FF0000' },
  { name: 'Disney+', category: 'entertainment', iconLetter: 'D', color: '#113CCF' },
  { name: 'Hulu', category: 'entertainment', iconLetter: 'H', color: '#1CE783' },
  { name: 'Apple Music', category: 'entertainment', iconLetter: 'A', color: '#FA243C' },
  { name: 'HBO Max', category: 'entertainment', iconLetter: 'H', color: '#B10AFF' },
  { name: 'Twitch', category: 'entertainment', iconLetter: 'T', color: '#9146FF' },
  { name: 'SoundCloud', category: 'entertainment', iconLetter: 'S', color: '#FF5500' },
  { name: 'Pandora', category: 'entertainment', iconLetter: 'P', color: '#005483' },

  // Work (8)
  { name: 'Slack', category: 'work', iconLetter: 'S', color: '#4A154B' },
  { name: 'Notion', category: 'work', iconLetter: 'N', color: '#000000' },
  { name: 'Trello', category: 'work', iconLetter: 'T', color: '#0052CC' },
  { name: 'Asana', category: 'work', iconLetter: 'A', color: '#F06A6A' },
  { name: 'Jira', category: 'work', iconLetter: 'J', color: '#0052CC' },
  { name: 'GitHub', category: 'work', iconLetter: 'G', color: '#181717' },
  { name: 'Figma', category: 'work', iconLetter: 'F', color: '#F24E1E' },
  { name: 'Zoom', category: 'work', iconLetter: 'Z', color: '#2D8CFF' },

  // Newsletters (8)
  { name: 'Substack', category: 'newsletters', iconLetter: 'S', color: '#FF6719' },
  { name: 'Morning Brew', category: 'newsletters', iconLetter: 'M', color: '#F5A623' },
  { name: 'The Hustle', category: 'newsletters', iconLetter: 'T', color: '#00D4AA' },
  { name: 'Mailchimp', category: 'newsletters', iconLetter: 'M', color: '#FFE01B' },
  { name: 'Medium', category: 'newsletters', iconLetter: 'M', color: '#000000' },
  { name: 'ConvertKit', category: 'newsletters', iconLetter: 'C', color: '#FB6970' },
  { name: 'Beehiiv', category: 'newsletters', iconLetter: 'B', color: '#F6C915' },
  { name: 'Revue', category: 'newsletters', iconLetter: 'R', color: '#E15718' },

  // Gaming (8)
  { name: 'Steam', category: 'gaming', iconLetter: 'S', color: '#1B2838' },
  { name: 'Epic Games', category: 'gaming', iconLetter: 'E', color: '#2F2D2E' },
  { name: 'PlayStation Network', category: 'gaming', iconLetter: 'P', color: '#003791' },
  { name: 'Xbox Live', category: 'gaming', iconLetter: 'X', color: '#107C10' },
  { name: 'Nintendo', category: 'gaming', iconLetter: 'N', color: '#E60012' },
  { name: 'Riot Games', category: 'gaming', iconLetter: 'R', color: '#D32936' },
  { name: 'EA', category: 'gaming', iconLetter: 'E', color: '#000000' },
  { name: 'Ubisoft', category: 'gaming', iconLetter: 'U', color: '#0070FF' },

  // Travel (6)
  { name: 'Airbnb', category: 'travel', iconLetter: 'A', color: '#FF5A5F' },
  { name: 'Booking.com', category: 'travel', iconLetter: 'B', color: '#003580' },
  { name: 'Expedia', category: 'travel', iconLetter: 'E', color: '#00355F' },
  { name: 'Uber', category: 'travel', iconLetter: 'U', color: '#000000' },
  { name: 'Lyft', category: 'travel', iconLetter: 'L', color: '#FF00BF' },
  { name: 'Delta Airlines', category: 'travel', iconLetter: 'D', color: '#003366' },

  // Food (6)
  { name: 'DoorDash', category: 'food', iconLetter: 'D', color: '#FF3008' },
  { name: 'Uber Eats', category: 'food', iconLetter: 'U', color: '#06C167' },
  { name: 'Grubhub', category: 'food', iconLetter: 'G', color: '#F63440' },
  { name: 'Instacart', category: 'food', iconLetter: 'I', color: '#43B02A' },
  { name: 'Starbucks', category: 'food', iconLetter: 'S', color: '#00704A' },
  { name: 'Chipotle', category: 'food', iconLetter: 'C', color: '#A81612' },

  // Health (6)
  { name: 'MyFitnessPal', category: 'health', iconLetter: 'M', color: '#0075D9' },
  { name: 'Fitbit', category: 'health', iconLetter: 'F', color: '#00B0B9' },
  { name: 'Headspace', category: 'health', iconLetter: 'H', color: '#F47D31' },
  { name: 'Peloton', category: 'health', iconLetter: 'P', color: '#000000' },
  { name: 'Calm', category: 'health', iconLetter: 'C', color: '#4D72A8' },
  { name: 'Noom', category: 'health', iconLetter: 'N', color: '#F5A623' },
];

// ---------------------------------------------------------------------------
// 20+ known subscriptions with realistic pricing
// ---------------------------------------------------------------------------
export const KNOWN_SUBSCRIPTIONS: KnownSubscription[] = [
  { name: 'Netflix', amount: 15.49, currency: 'USD', frequency: 'monthly', iconLetter: 'N', color: '#E50914' },
  { name: 'Spotify Premium', amount: 11.99, currency: 'USD', frequency: 'monthly', iconLetter: 'S', color: '#1DB954' },
  { name: 'Disney+', amount: 13.99, currency: 'USD', frequency: 'monthly', iconLetter: 'D', color: '#113CCF' },
  { name: 'Hulu', amount: 17.99, currency: 'USD', frequency: 'monthly', iconLetter: 'H', color: '#1CE783' },
  { name: 'HBO Max', amount: 15.99, currency: 'USD', frequency: 'monthly', iconLetter: 'H', color: '#B10AFF' },
  { name: 'Apple Music', amount: 10.99, currency: 'USD', frequency: 'monthly', iconLetter: 'A', color: '#FA243C' },
  { name: 'YouTube Premium', amount: 13.99, currency: 'USD', frequency: 'monthly', iconLetter: 'Y', color: '#FF0000' },
  { name: 'Amazon Prime', amount: 139.00, currency: 'USD', frequency: 'yearly', iconLetter: 'A', color: '#FF9900' },
  { name: 'Adobe Creative Cloud', amount: 54.99, currency: 'USD', frequency: 'monthly', iconLetter: 'A', color: '#FF0000' },
  { name: 'Microsoft 365', amount: 99.99, currency: 'USD', frequency: 'yearly', iconLetter: 'M', color: '#0078D4' },
  { name: 'iCloud+', amount: 2.99, currency: 'USD', frequency: 'monthly', iconLetter: 'I', color: '#3693F3' },
  { name: 'Notion Pro', amount: 10.00, currency: 'USD', frequency: 'monthly', iconLetter: 'N', color: '#000000' },
  { name: 'Slack Pro', amount: 8.75, currency: 'USD', frequency: 'monthly', iconLetter: 'S', color: '#4A154B' },
  { name: 'Dropbox Plus', amount: 11.99, currency: 'USD', frequency: 'monthly', iconLetter: 'D', color: '#0061FF' },
  { name: 'NordVPN', amount: 12.99, currency: 'USD', frequency: 'monthly', iconLetter: 'N', color: '#4687FF' },
  { name: 'Headspace', amount: 69.99, currency: 'USD', frequency: 'yearly', iconLetter: 'H', color: '#F47D31' },
  { name: 'Peloton', amount: 44.00, currency: 'USD', frequency: 'monthly', iconLetter: 'P', color: '#000000' },
  { name: 'ChatGPT Plus', amount: 20.00, currency: 'USD', frequency: 'monthly', iconLetter: 'C', color: '#10A37F' },
  { name: 'Claude Pro', amount: 20.00, currency: 'USD', frequency: 'monthly', iconLetter: 'C', color: '#D97757' },
  { name: 'Calm', amount: 69.99, currency: 'USD', frequency: 'yearly', iconLetter: 'C', color: '#4D72A8' },
  { name: 'Duolingo Plus', amount: 6.99, currency: 'USD', frequency: 'monthly', iconLetter: 'D', color: '#58CC02' },
  { name: 'Canva Pro', amount: 12.99, currency: 'USD', frequency: 'monthly', iconLetter: 'C', color: '#00C4CC' },
  { name: 'GitHub Copilot', amount: 10.00, currency: 'USD', frequency: 'monthly', iconLetter: 'G', color: '#181717' },
];

// ---------------------------------------------------------------------------
// 15+ real historical data breaches
// ---------------------------------------------------------------------------
export const KNOWN_BREACHES: KnownBreach[] = [
  {
    name: 'LinkedIn (2012)',
    date: '2012-06-05',
    description: '164 million email addresses and passwords were exposed after a data breach at LinkedIn. The data was initially sold online and later made freely available.',
    severity: 'high',
    dataTypes: ['Email addresses', 'Passwords'],
  },
  {
    name: 'Adobe (2013)',
    date: '2013-10-04',
    description: '153 million user records were exposed including internal IDs, usernames, emails, encrypted passwords, and password hints in plain text.',
    severity: 'high',
    dataTypes: ['Email addresses', 'Passwords', 'Password hints', 'Usernames'],
  },
  {
    name: 'Dropbox (2012)',
    date: '2012-07-01',
    description: '68 million Dropbox user email addresses and hashed passwords were exposed. The data later surfaced online in 2016.',
    severity: 'high',
    dataTypes: ['Email addresses', 'Passwords'],
  },
  {
    name: 'Yahoo (2013)',
    date: '2013-08-01',
    description: 'All 3 billion Yahoo user accounts were affected in the largest data breach in history. Names, email addresses, dates of birth, and security questions were compromised.',
    severity: 'critical',
    dataTypes: ['Email addresses', 'Passwords', 'Names', 'Dates of birth', 'Security questions'],
  },
  {
    name: 'Equifax (2017)',
    date: '2017-09-07',
    description: '147 million people had their personal data exposed including Social Security numbers, birth dates, addresses, and driver\'s license numbers.',
    severity: 'critical',
    dataTypes: ['Social Security numbers', 'Names', 'Addresses', 'Dates of birth', 'Driver\'s license numbers'],
  },
  {
    name: 'MyFitnessPal (2018)',
    date: '2018-02-01',
    description: '150 million user accounts were compromised exposing usernames, email addresses, and hashed passwords.',
    severity: 'medium',
    dataTypes: ['Email addresses', 'Passwords', 'Usernames', 'IP addresses'],
  },
  {
    name: 'Canva (2019)',
    date: '2019-05-24',
    description: '137 million users had partial data exposed including usernames, real names, email addresses, and bcrypt-hashed passwords.',
    severity: 'medium',
    dataTypes: ['Email addresses', 'Passwords', 'Usernames', 'Names'],
  },
  {
    name: 'Facebook (2019)',
    date: '2019-04-01',
    description: '533 million Facebook users had their personal data exposed including phone numbers, full names, locations, email addresses, and biographical information.',
    severity: 'high',
    dataTypes: ['Phone numbers', 'Email addresses', 'Names', 'Locations', 'Dates of birth'],
  },
  {
    name: 'Twitter (2022)',
    date: '2022-01-01',
    description: '200 million Twitter user email addresses were scraped and posted on a hacking forum, linked to publicly available profile data.',
    severity: 'medium',
    dataTypes: ['Email addresses', 'Usernames', 'Names'],
  },
  {
    name: 'Marriott International (2018)',
    date: '2018-11-30',
    description: '500 million guests had data exposed including names, addresses, phone numbers, passport numbers, and encrypted credit card details.',
    severity: 'critical',
    dataTypes: ['Names', 'Addresses', 'Phone numbers', 'Passport numbers', 'Credit card details'],
  },
  {
    name: 'Capital One (2019)',
    date: '2019-07-29',
    description: '106 million credit card applicants had their personal information exposed including names, addresses, credit scores, and Social Security numbers.',
    severity: 'critical',
    dataTypes: ['Names', 'Addresses', 'Social Security numbers', 'Credit scores', 'Bank account numbers'],
  },
  {
    name: 'Zynga (2019)',
    date: '2019-09-01',
    description: '173 million accounts for Words With Friends players were breached, exposing usernames, email addresses, login IDs, and hashed passwords.',
    severity: 'medium',
    dataTypes: ['Email addresses', 'Passwords', 'Usernames', 'Phone numbers'],
  },
  {
    name: 'Twitch (2021)',
    date: '2021-10-06',
    description: 'The entirety of Twitch was leaked including source code, creator payouts, and internal tools. User data including encrypted passwords was exposed.',
    severity: 'high',
    dataTypes: ['Email addresses', 'Passwords', 'Payment information'],
  },
  {
    name: 'T-Mobile (2021)',
    date: '2021-08-17',
    description: '54 million T-Mobile customers had their data stolen including names, dates of birth, Social Security numbers, and driver\'s license information.',
    severity: 'critical',
    dataTypes: ['Names', 'Social Security numbers', 'Dates of birth', 'Driver\'s license numbers', 'Phone numbers'],
  },
  {
    name: 'Uber (2016)',
    date: '2016-10-01',
    description: '57 million Uber users and drivers had their personal information exposed. Uber concealed the breach for over a year.',
    severity: 'high',
    dataTypes: ['Email addresses', 'Phone numbers', 'Names', 'Driver\'s license numbers'],
  },
  {
    name: 'LastPass (2022)',
    date: '2022-12-22',
    description: 'Encrypted password vaults and customer data were stolen from LastPass cloud storage. Master passwords could potentially be brute-forced.',
    severity: 'critical',
    dataTypes: ['Email addresses', 'Encrypted password vaults', 'Names', 'Billing addresses', 'IP addresses'],
  },
  {
    name: 'Nintendo (2020)',
    date: '2020-04-24',
    description: '300,000 Nintendo accounts were compromised through credential stuffing, exposing nicknames, dates of birth, country, and email addresses.',
    severity: 'medium',
    dataTypes: ['Email addresses', 'Dates of birth', 'Usernames', 'Names'],
  },
];

// ---------------------------------------------------------------------------
// 25+ real data brokers
// ---------------------------------------------------------------------------
export const DATA_BROKERS: DataBrokerEntry[] = [
  { name: 'Spokeo', url: 'https://www.spokeo.com', dataTypes: ['Name', 'Address', 'Phone', 'Email', 'Social profiles'] },
  { name: 'WhitePages', url: 'https://www.whitepages.com', dataTypes: ['Name', 'Address', 'Phone', 'Age', 'Relatives'] },
  { name: 'BeenVerified', url: 'https://www.beenverified.com', dataTypes: ['Name', 'Address', 'Phone', 'Email', 'Criminal records'] },
  { name: 'PeopleFinder', url: 'https://www.peoplefinder.com', dataTypes: ['Name', 'Address', 'Phone', 'Email'] },
  { name: 'Intelius', url: 'https://www.intelius.com', dataTypes: ['Name', 'Address', 'Phone', 'Email', 'Background checks'] },
  { name: 'TruePeopleSearch', url: 'https://www.truepeoplesearch.com', dataTypes: ['Name', 'Address', 'Phone', 'Email', 'Relatives'] },
  { name: 'FastPeopleSearch', url: 'https://www.fastpeoplesearch.com', dataTypes: ['Name', 'Address', 'Phone', 'Age'] },
  { name: 'USSearch', url: 'https://www.ussearch.com', dataTypes: ['Name', 'Address', 'Phone', 'Criminal records'] },
  { name: 'PeopleLooker', url: 'https://www.peoplelooker.com', dataTypes: ['Name', 'Address', 'Phone', 'Email', 'Social profiles'] },
  { name: 'Radaris', url: 'https://radaris.com', dataTypes: ['Name', 'Address', 'Phone', 'Email', 'Court records'] },
  { name: 'ThatsThem', url: 'https://thatsthem.com', dataTypes: ['Name', 'Address', 'Phone', 'Email', 'IP address'] },
  { name: 'Pipl', url: 'https://pipl.com', dataTypes: ['Name', 'Email', 'Phone', 'Social profiles', 'Photos'] },
  { name: 'ZabaSearch', url: 'https://www.zabasearch.com', dataTypes: ['Name', 'Address', 'Phone', 'Age'] },
  { name: 'MyLife', url: 'https://www.mylife.com', dataTypes: ['Name', 'Address', 'Phone', 'Reputation score'] },
  { name: 'Instant Checkmate', url: 'https://www.instantcheckmate.com', dataTypes: ['Name', 'Address', 'Phone', 'Criminal records', 'Social profiles'] },
  { name: 'TruthFinder', url: 'https://www.truthfinder.com', dataTypes: ['Name', 'Address', 'Phone', 'Email', 'Criminal records'] },
  { name: 'Nuwber', url: 'https://nuwber.com', dataTypes: ['Name', 'Address', 'Phone', 'Email', 'Relatives'] },
  { name: 'Addresses.com', url: 'https://www.addresses.com', dataTypes: ['Name', 'Address', 'Phone'] },
  { name: 'AnyWho', url: 'https://www.anywho.com', dataTypes: ['Name', 'Address', 'Phone'] },
  { name: 'PublicRecords360', url: 'https://www.publicrecords360.com', dataTypes: ['Name', 'Address', 'Phone', 'Court records'] },
  { name: 'Acxiom', url: 'https://www.acxiom.com', dataTypes: ['Name', 'Address', 'Demographics', 'Purchase behavior'] },
  { name: 'LexisNexis', url: 'https://www.lexisnexis.com', dataTypes: ['Name', 'Address', 'Financial records', 'Court records'] },
  { name: 'CoreLogic', url: 'https://www.corelogic.com', dataTypes: ['Name', 'Address', 'Property records', 'Financial data'] },
  { name: 'Epsilon', url: 'https://www.epsilon.com', dataTypes: ['Name', 'Email', 'Purchase history', 'Demographics'] },
  { name: 'Oracle Data Cloud', url: 'https://www.oracle.com/data-cloud', dataTypes: ['Name', 'Email', 'Browsing behavior', 'Purchase data'] },
  { name: 'Clearview AI', url: 'https://www.clearview.ai', dataTypes: ['Facial recognition data', 'Photos', 'Social profiles'] },
];

// ---------------------------------------------------------------------------
// Scanning stage messages
// ---------------------------------------------------------------------------
export const SCAN_STAGES: { message: string; progressEnd: number }[] = [
  { message: 'Connecting...', progressEnd: 10 },
  { message: 'Checking breach databases...', progressEnd: 45 },
  { message: 'Cross-referencing known breaches...', progressEnd: 65 },
  { message: 'Scanning data brokers...', progressEnd: 85 },
  { message: 'Calculating privacy score...', progressEnd: 100 },
];
