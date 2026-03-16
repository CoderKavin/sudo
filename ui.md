@import "tailwindcss";

@layer base {
  :root {
    --bg-main: #fbfbfd;
    --text-main: #1d1d1f;
    --card-bg: #ffffff;
  }
  
  body {
    background-color: var(--bg-main);
    color: var(--text-main);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }

  h1, h2, h3, h4, h5, h6 {
    letter-spacing: -0.02em;
  }
}

@layer utilities {
  .glass-panel {
    @apply bg-white/70 backdrop-blur-2xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)];
  }
  
  .apple-btn-primary {
    @apply rounded-full bg-[#1d1d1f] text-white px-8 py-3.5 font-medium transition-all duration-300 active:scale-95 hover:bg-[#424245] hover:shadow-lg hover:shadow-black/10;
  }

  .apple-btn-secondary {
    @apply rounded-full bg-black/5 text-black px-8 py-3.5 font-medium transition-all duration-300 active:scale-95 hover:bg-black/10;
  }
}

/* Fluid Animations */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(30px); filter: blur(4px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.1); }
  70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(0, 0, 0, 0); }
  100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
}

.animate-fade-up {
  animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-scale-in {
  animation: scale-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-pulse-ring {
  animation: pulse-ring 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
}

.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }

---

import { useNavigate } from 'react-router-dom';

const features = [
  { title: 'Breach Monitor', desc: 'Real-time database cross-referencing to expose compromised credentials.', stat: 'Live', size: 'col-span-1 md:col-span-2 row-span-2' },
  { title: 'Broker Removal', desc: 'Identify 26 known data brokers selling your information.', stat: '26 brokers', size: 'col-span-1' },
  { title: 'Account Discovery', desc: 'Find every service holding your data.', stat: '80+ services', size: 'col-span-1' },
  { title: 'Subscription Tracker', desc: 'Uncover hidden recurring charges.', stat: '$247 avg', size: 'col-span-1 md:col-span-2' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0 border-white/20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-xl font-semibold tracking-tight">Vanish.</span>
          <button
            onClick={() => navigate('/scan')}
            className="rounded-full bg-[#1d1d1f] px-5 py-2 text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
          >
            Start Scan
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto flex min-h-[90vh] max-w-5xl flex-col items-center justify-center px-6 pt-20 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-100 via-[#fbfbfd] to-[#fbfbfd]"></div>
        
        <p className="animate-fade-up mb-6 rounded-full border border-black/10 bg-black/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gray-600 opacity-0">
          Digital Footprint Scanner
        </p>
        
        <h1 className="animate-fade-up delay-100 max-w-4xl text-6xl font-bold tracking-tighter leading-[1.05] text-[#1d1d1f] opacity-0 md:text-8xl">
          See everything they <br className="hidden md:block"/> know about you.
        </h1>
        
        <p className="animate-fade-up delay-200 mx-auto mt-8 max-w-2xl text-xl font-medium tracking-tight text-gray-500 opacity-0 md:text-2xl leading-relaxed">
          Breaches, data brokers, forgotten accounts, and hidden subscriptions.
          Reclaim your digital presence in seconds.
        </p>
        
        <div className="animate-fade-up delay-300 mt-12 flex flex-col items-center gap-4 opacity-0 sm:flex-row">
          <button onClick={() => navigate('/scan')} className="apple-btn-primary w-full sm:w-auto">
            Scan My Footprint
          </button>
          <a href="#features" className="apple-btn-secondary w-full sm:w-auto text-center">
            Explore Features
          </a>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Four scanners. <br className="md:hidden"/> One pass.</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:grid-rows-3 auto-rows-[200px]">
          {features.map((f, i) => (
            <div 
              key={f.title} 
              className={`group relative overflow-hidden rounded-[2rem] bg-white p-8 shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-black/5 border border-gray-100 ${f.size}`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
              <div className="flex h-full flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-3 text-lg leading-relaxed text-gray-500 max-w-xs">{f.desc}</p>
                </div>
                <div className="mt-8 text-3xl font-bold tracking-tighter text-black/10 transition-colors group-hover:text-black/20">
                  {f.stat}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200/60 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
          <span className="text-xl font-bold tracking-tight">Vanish.</span>
          <p className="text-sm font-medium text-gray-400">Your digital footprint, under your control.</p>
        </div>
      </footer>
    </div>
  );
}

---

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { simulateScan } from '../lib/scanner';
import type { ConnectedEmail } from '../store/useStore';

type Step = 'connect' | 'scanning' | 'complete';

export default function ScanPage() {
  const navigate = useNavigate();
  const store = useStore();

  const [step, setStep] = useState<Step>('connect');
  const [emailInput, setEmailInput] = useState('');
  const [localEmails, setLocalEmails] = useState<ConnectedEmail[]>([]);
  const [currentScanEmail, setCurrentScanEmail] = useState('');
  const [scanStage, setScanStage] = useState('');
  const [summaryStats, setSummaryStats] = useState({ breaches: 0, brokers: 0, privacyScore: 0 });

  const addEmail = useCallback(() => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (localEmails.some((e) => e.email === email)) return;

    const provider = email.includes('gmail') ? 'gmail'
      : email.includes('outlook') || email.includes('hotmail') ? 'outlook'
      : 'yahoo';

    setLocalEmails((prev) => [...prev, { email, provider, connected: true, lastScanned: null, breachCount: 0 }]);
    setEmailInput('');
  }, [emailInput, localEmails]);

  const removeEmail = useCallback((email: string) => {
    setLocalEmails((prev) => prev.filter((e) => e.email !== email));
  }, []);

  const startScan = useCallback(async () => {
    if (localEmails.length === 0) return;
    setStep('scanning');

    let allBreaches = store.breaches;
    let allBrokers = store.dataBrokers;
    let lastScore = 0;

    for (const emailEntry of localEmails) {
      setCurrentScanEmail(emailEntry.email);
      setScanStage('Initializing Secure Connection...');

      const results = await simulateScan(emailEntry.email, (_, stage) => {
        setScanStage(stage);
      });

      allBreaches = [...allBreaches, ...results.breaches];
      allBrokers = [...allBrokers, ...results.dataBrokers];
      lastScore = results.privacyScore;

      store.addEmail({ ...emailEntry, breachCount: results.breaches.length, lastScanned: new Date().toISOString() });
    }

    store.setBreaches(allBreaches);
    store.setDataBrokers(allBrokers);
    store.updatePrivacyScore(lastScore);
    store.setScanComplete();
    setSummaryStats({ breaches: allBreaches.length, brokers: allBrokers.length, privacyScore: lastScore });
    setStep('complete');
  }, [localEmails, store]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbfd] px-6 py-20 selection:bg-black selection:text-white">
      <div className="w-full max-w-xl animate-scale-in">
        
        {step === 'connect' && (
          <div className="glass-panel rounded-[2.5rem] p-10 md:p-14">
            <button onClick={() => navigate('/')} className="mb-8 text-sm font-medium text-gray-400 transition-colors hover:text-black">
              ← Cancel
            </button>
            <h1 className="text-4xl font-bold tracking-tight">Add your email.</h1>
            <p className="mt-3 text-lg font-medium text-gray-500">
              We'll cross-reference it against our global database.
            </p>

            <div className="mt-10">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border-0 bg-black/5 px-6 py-4 text-lg font-medium outline-none transition-all focus:bg-white focus:ring-2 focus:ring-black/20"
                />
                <button onClick={addEmail} className="rounded-2xl bg-black px-8 py-4 font-medium text-white transition-transform active:scale-95">
                  Add
                </button>
              </div>

              {localEmails.length > 0 && (
                <div className="mt-8 space-y-3">
                  {localEmails.map((e) => (
                    <div key={e.email} className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm border border-black/5">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="font-medium tracking-tight">{e.email}</span>
                      </div>
                      <button onClick={() => removeEmail(e.email)} className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-red-500">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={startScan}
                disabled={localEmails.length === 0}
                className="mt-10 w-full rounded-2xl bg-black py-4 text-lg font-medium text-white shadow-xl shadow-black/20 transition-all disabled:opacity-30 disabled:shadow-none active:scale-[0.98]"
              >
                {localEmails.length === 0 ? 'Awaiting Email' : `Analyze ${localEmails.length} Account${localEmails.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {step === 'scanning' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative flex h-32 w-32 items-center justify-center">
              <div className="animate-pulse-ring absolute h-full w-full rounded-full border-4 border-black/10"></div>
              <div className="h-16 w-16 rounded-full bg-black"></div>
            </div>
            <h2 className="mt-12 text-3xl font-bold tracking-tight">Scanning Footprint</h2>
            <p className="mt-2 text-lg font-medium text-gray-400">{currentScanEmail}</p>
            <div className="mt-8 h-10 overflow-hidden text-center">
              <p className="animate-fade-up text-sm font-semibold uppercase tracking-widest text-black/40" key={scanStage}>
                {scanStage}
              </p>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="glass-panel rounded-[2.5rem] p-10 text-center md:p-14">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-3xl">
              ✓
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Analysis Complete.</h1>
            <p className="mt-4 text-lg text-gray-500">
              We've compiled a detailed report of your exposure.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="rounded-3xl bg-red-50 p-6 border border-red-100">
                <div className="text-4xl font-bold tracking-tighter text-red-600">{summaryStats.breaches}</div>
                <div className="mt-2 font-medium text-red-900/60">Breaches</div>
              </div>
              <div className="rounded-3xl bg-orange-50 p-6 border border-orange-100">
                <div className="text-4xl font-bold tracking-tighter text-orange-600">{summaryStats.brokers}</div>
                <div className="mt-2 font-medium text-orange-900/60">Brokers</div>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="apple-btn-primary mt-10 w-full text-lg"
            >
              Open Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

---

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';

type Tab = 'breaches' | 'brokers' | 'accounts' | 'subscriptions';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500 text-white border-red-600',
  high: 'bg-orange-500 text-white border-orange-600',
  medium: 'bg-yellow-400 text-yellow-900 border-yellow-500',
  low: 'bg-blue-500 text-white border-blue-600',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const store = useStore();

  const [activeTab, setActiveTab] = useState<Tab>('breaches');
  const [search, setSearch] = useState('');

  if (store.breaches.length === 0 && store.dataBrokers.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight">No Data Available</h2>
        <p className="mt-3 text-lg text-gray-500">Run a secure scan to populate your dashboard.</p>
        <button onClick={() => navigate('/scan')} className="apple-btn-primary mt-8">
          Start Scan
        </button>
      </div>
    );
  }

  const unresolvedBreaches = store.breaches.filter((b) => !b.resolved).length;
  const exposedBrokers = store.dataBrokers.filter((b) => b.status === 'found').length;

  const filteredBreaches = useMemo(() => {
    if (!search.trim()) return store.breaches;
    return store.breaches.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) || b.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [store.breaches, search]);

  const filteredBrokers = useMemo(() => {
    if (!search.trim()) return store.dataBrokers;
    return store.dataBrokers.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) || b.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [store.dataBrokers, search]);

  const scoreColor = store.privacyScore > 70 ? 'text-green-500' : store.privacyScore > 40 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-12 animate-fade-up">
      {/* Header */}
      <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <button onClick={() => navigate('/')} className="mb-6 flex items-center text-sm font-semibold tracking-wide text-gray-400 transition-colors hover:text-black">
            ← HOME
          </button>
          <h1 className="text-5xl font-bold tracking-tighter">Overview</h1>
          <p className="mt-3 text-lg font-medium text-gray-500">
            Monitoring {store.connectedEmails.length} identity endpoint{store.connectedEmails.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <button onClick={() => navigate('/scan')} className="apple-btn-secondary py-2.5 px-6 text-sm">
          + Connect Email
        </button>
      </div>

      {/* Top Stats - Bento Style */}
      <div className="mb-12 grid gap-6 md:grid-cols-3">
        <div className="glass-panel flex flex-col items-center justify-center rounded-[2rem] p-8">
          <div className={`text-6xl font-bold tracking-tighter ${scoreColor}`}>
            {store.privacyScore}
          </div>
          <div className="mt-3 text-sm font-bold uppercase tracking-widest text-gray-400">Health Score</div>
        </div>
        <div className="glass-panel rounded-[2rem] p-8 flex flex-col justify-between">
          <div className="text-sm font-bold uppercase tracking-widest text-gray-400">Exposure</div>
          <div>
            <div className="text-5xl font-bold tracking-tighter text-[#1d1d1f]">{unresolvedBreaches}</div>
            <div className="mt-2 text-lg font-medium text-gray-500">Unresolved Breaches</div>
          </div>
        </div>
        <div className="glass-panel rounded-[2rem] p-8 flex flex-col justify-between">
          <div className="text-sm font-bold uppercase tracking-widest text-gray-400">Data Brokers</div>
          <div>
            <div className="text-5xl font-bold tracking-tighter text-[#1d1d1f]">{exposedBrokers}</div>
            <div className="mt-2 text-lg font-medium text-gray-500">Active Listings</div>
          </div>
        </div>
      </div>

      {/* Segmented Control (Tabs) */}
      <div className="mb-8 flex overflow-x-auto rounded-full bg-black/5 p-1 no-scrollbar">
        {(['breaches', 'brokers', 'accounts', 'subscriptions'] as Tab[]).map((tab) => {
          const isActive = activeTab === tab;
          const isLocked = tab === 'accounts' || tab === 'subscriptions';
          return (
            <button
              key={tab}
              onClick={() => !isLocked && setActiveTab(tab)}
              className={`relative flex-1 rounded-full px-6 py-3 text-sm font-semibold capitalize transition-all duration-300 ${
                isActive ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
              } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {tab}
              {isLocked && <span className="ml-2 rounded bg-black/10 px-1.5 py-0.5 text-[10px] uppercase">Soon</span>}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      {(activeTab === 'breaches' || activeTab === 'brokers') && (
        <div className="mb-8">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${activeTab}...`}
            className="w-full rounded-2xl border-0 bg-white px-6 py-4 text-lg font-medium shadow-sm outline-none ring-1 ring-black/5 transition-all focus:ring-2 focus:ring-black/20"
          />
        </div>
      )}

      {/* Content Areas */}
      <div className="space-y-4">
        {activeTab === 'breaches' && (
          <>
            {filteredBreaches.length === 0 && <div className="py-20 text-center text-lg font-medium text-gray-400">No matching breaches found.</div>}
            {filteredBreaches.sort((a, b) => (a.resolved === b.resolved ? 0 : a.resolved ? 1 : -1)).map((breach) => (
              <div key={breach.id} className={`glass-panel rounded-[2rem] p-6 transition-opacity ${breach.resolved ? 'opacity-50' : ''}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold tracking-tight">{breach.name}</h3>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${SEVERITY_COLORS[breach.severity]}`}>
                        {breach.severity}
                      </span>
                      {breach.resolved && <span className="rounded-full bg-black/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-black">Resolved</span>}
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-400">{breach.email} • Exposed {breach.date}</p>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">{breach.description}</p>
                    
                    <div className="mt-5 flex flex-wrap gap-2">
                      {breach.dataTypes.map((dt) => (
                        <span key={dt} className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-semibold text-gray-600">
                          {dt}
                        </span>
                      ))}
                    </div>
                  </div>
                  {!breach.resolved && (
                    <button
                      onClick={() => store.markBreachResolved(breach.id)}
                      className="rounded-full bg-black/5 px-5 py-2 text-sm font-semibold transition-colors hover:bg-black/10 active:scale-95 whitespace-nowrap"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'brokers' && (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredBrokers.length === 0 && <div className="col-span-full py-20 text-center text-lg font-medium text-gray-400">No brokers found.</div>}
            {filteredBrokers.map((broker) => (
              <div key={broker.id} className="glass-panel rounded-[2rem] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-bold tracking-tight">{broker.name}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                        broker.status === 'found' ? 'bg-red-100 text-red-700' :
                        broker.status === 'removing' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {broker.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-400">{broker.email}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {broker.dataTypes.map((dt) => (
                      <span key={dt} className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-semibold text-gray-600">{dt}</span>
                    ))}
                  </div>
                </div>
                {broker.status === 'found' && (
                  <button onClick={() => store.markBrokerRemoving(broker.id)} className="mt-6 w-full rounded-xl bg-[#1d1d1f] py-3 text-sm font-semibold text-white transition-transform active:scale-95">
                    Request Removal
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
