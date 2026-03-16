import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';
import {
  isExtensionInstalled,
  connectGmail,
  runExtensionScan,
  getExtensionData,
  disconnectGmail,
} from '../lib/extensionBridge';
import { scanDarkWeb } from '../lib/darkWebMonitor';
import { generatePrivacyReport } from '../lib/pdfReport';
import {
  generateDeletionEmail,
  generateBrokerOptOut,
  generateCancelEmail,
  getBreachRemediationSteps,
  copyToClipboard,
} from '../lib/actionTemplates';

type Tab = 'breaches' | 'brokers' | 'accounts' | 'subscriptions' | 'darkweb';

const SEV: Record<string, { bg: string; color: string }> = {
  critical: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  high: { bg: 'rgba(249,115,22,0.1)', color: '#f97316' },
  medium: { bg: 'rgba(234,179,8,0.1)', color: '#eab308' },
  low: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
};

const STATUS_STYLE: Record<string, string> = {
  found: 'bg-[#ef4444]/10 text-[#ef4444]',
  removing: 'bg-[#f97316]/10 text-[#f97316]',
  removed: 'bg-[#22c55e]/10 text-[#22c55e]',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const store = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('breaches');
  const [search, setSearch] = useState('');
  const [expandedBreach, setExpandedBreach] = useState<string | null>(null);
  const [extScanning, setExtScanning] = useState(false);
  const [extError, setExtError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [darkWebProgress, setDarkWebProgress] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [expandedBroker, setExpandedBroker] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string, id: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Load extension data on mount
  useEffect(() => {
    if (!isExtensionInstalled()) return;
    getExtensionData().then((data) => {
      if (data.vanish_connected) {
        store.setExtensionConnected(true, data.vanish_email ?? null);
      }
      if (data.vanish_accounts) store.setDiscoveredAccounts(data.vanish_accounts);
      if (data.vanish_subscriptions) store.setTrackedSubscriptions(data.vanish_subscriptions);
    }).catch(() => {});
  }, []);

  const handleConnectGmail = useCallback(async () => {
    setExtError(null);
    try {
      const res = await connectGmail();
      if (res.ok && res.email) {
        store.setExtensionConnected(true, res.email);
      } else {
        setExtError(res.error ?? 'Failed to connect');
      }
    } catch {
      setExtError('Extension not responding');
    }
  }, []);

  const handleExtensionScan = useCallback(async () => {
    setExtScanning(true);
    setExtError(null);
    try {
      const res = await runExtensionScan();
      if (res.ok) {
        if (res.accounts) store.setDiscoveredAccounts(res.accounts);
        if (res.subscriptions) store.setTrackedSubscriptions(res.subscriptions);
      } else {
        setExtError(res.error ?? 'Scan failed');
      }
    } catch {
      setExtError('Extension scan timed out');
    } finally {
      setExtScanning(false);
    }
  }, []);

  const handleDisconnectGmail = useCallback(async () => {
    await disconnectGmail().catch(() => {});
    store.setExtensionConnected(false, null);
    store.setDiscoveredAccounts([]);
    store.setTrackedSubscriptions([]);
  }, []);

  const handleDarkWebScan = useCallback(async () => {
    const emails = store.connectedEmails.map((e) => e.email);
    if (emails.length === 0) return;
    store.setDarkWebScanning(true);
    setDarkWebProgress('Starting dark web scan...');
    try {
      const alerts = await scanDarkWeb(emails, setDarkWebProgress);
      // Preserve resolved state from existing alerts
      const existingResolved = new Set(store.darkWebAlerts.filter((a) => a.resolved).map((a) => a.id));
      const merged = alerts.map((a) => existingResolved.has(a.id) ? { ...a, resolved: true } : a);
      store.setDarkWebAlerts(merged);
    } catch {
      setDarkWebProgress('Dark web scan failed');
    } finally {
      store.setDarkWebScanning(false);
      setDarkWebProgress('');
    }
  }, [store]);

  const handleExportPdf = useCallback(() => {
    generatePrivacyReport({
      emails: store.connectedEmails.map((e) => e.email),
      privacyScore: store.privacyScore,
      scoreHistory: store.scoreHistory,
      breaches: store.breaches,
      dataBrokers: store.dataBrokers,
      accounts: store.discoveredAccounts,
      subscriptions: store.trackedSubscriptions,
      darkWebAlerts: store.darkWebAlerts,
    });
  }, [store]);

  if (store.breaches.length === 0 && store.dataBrokers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-screen flex-col items-center justify-center gap-5 px-6"
      >
        <h2 className="text-[1.5rem] font-bold text-white">No scan data yet</h2>
        <p className="text-[15px] text-white/35">Run a scan first to see your digital footprint.</p>
        <button className="btn-primary" onClick={() => navigate('/scan')}>Start Scan</button>
      </motion.div>
    );
  }

  const unresolvedBreaches = store.breaches.filter((b) => !b.resolved).length;
  const exposedBrokers = store.dataBrokers.filter((b) => b.status === 'found').length;
  const removingBrokers = store.dataBrokers.filter((b) => b.status === 'removing').length;
  const removedBrokers = store.dataBrokers.filter((b) => b.status === 'removed').length;

  const filteredBreaches = useMemo(() => {
    let list = store.breaches;
    if (filter === 'unresolved') list = list.filter((b) => !b.resolved);
    else if (filter === 'resolved') list = list.filter((b) => b.resolved);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q));
    }
    return list;
  }, [store.breaches, search, filter]);

  const filteredBrokers = useMemo(() => {
    let list = store.dataBrokers;
    if (filter === 'found' || filter === 'removing' || filter === 'removed') list = list.filter((b) => b.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q));
    }
    return list;
  }, [store.dataBrokers, search, filter]);

  const filteredAccounts = useMemo(() => {
    let list = store.discoveredAccounts;
    if (filter) list = list.filter((a) => a.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q) || a.domain.toLowerCase().includes(q));
    }
    return list;
  }, [store.discoveredAccounts, search, filter]);

  const filteredSubscriptions = useMemo(() => {
    let list = store.trackedSubscriptions;
    if (filter === 'active') list = list.filter((s) => (s.status ?? (s.active ? 'active' : 'cancelled')) === 'active');
    else if (filter === 'cancelled') list = list.filter((s) => s.status === 'cancelled' || s.status === 'likely_cancelled');
    else if (filter === 'failed') list = list.filter((s) => s.status === 'failed');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q));
    }
    return list;
  }, [store.trackedSubscriptions, search, filter]);

  const scoreColor = store.privacyScore > 70 ? '#22c55e' : store.privacyScore > 40 ? '#f97316' : '#ef4444';

  const handleBrokerRemoval = (brokerId: string, brokerUrl: string) => {
    store.markBrokerRemoving(brokerId);
    // Open the broker's opt-out / profile page so user can request removal
    window.open(brokerUrl, '_blank', 'noopener,noreferrer');
  };

  const handleMarkBrokerRemoved = (brokerId: string) => {
    store.markBrokerRemoved(brokerId);
  };

  const handleResolve = (breachId: string) => {
    setExpandedBreach(expandedBreach === breachId ? null : breachId);
  };

  const confirmResolve = (breachId: string) => {
    store.markBreachResolved(breachId);
    setExpandedBreach(null);
  };

  const handleExportReport = () => {
    const report = {
      exportDate: new Date().toISOString(),
      privacyScore: store.privacyScore,
      emails: store.connectedEmails.map((e) => e.email),
      breaches: store.breaches.map((b) => ({
        name: b.name,
        email: b.email,
        date: b.date,
        severity: b.severity,
        dataTypes: b.dataTypes,
        resolved: b.resolved,
      })),
      dataBrokers: store.dataBrokers.map((b) => ({
        name: b.name,
        status: b.status,
        dataTypes: b.dataTypes,
        optOutUrl: b.url,
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanish-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto min-h-screen max-w-6xl px-6 py-10"
    >
      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <button className="btn-sm !px-3" onClick={() => navigate('/')}>←</button>
          <div>
            <h1 className="text-[1.5rem] font-bold tracking-tight text-white">Your Digital Footprint</h1>
            <p className="text-[13px] text-white/25">
              {store.connectedEmails.length} email{store.connectedEmails.length !== 1 ? 's' : ''} scanned
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-sm" onClick={handleExportPdf}>PDF Report</button>
          <button className="btn-sm" onClick={handleExportReport}>JSON</button>
          <button className="btn-sm" onClick={() => navigate('/scan')}>+ Add Email</button>
        </div>
      </motion.div>

      {/* ─── Stats ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-10 grid gap-5 sm:grid-cols-4"
      >
        {/* Score + History Sparkline */}
        <div className="glass-card flex flex-col items-center justify-center py-8 relative overflow-hidden">
          <motion.div
            className="absolute inset-0 opacity-20"
            style={{ background: `radial-gradient(circle at 50% 50%, ${scoreColor}20, transparent 70%)` }}
          />
          <div className="relative text-center">
            <div className="text-[3rem] font-bold tracking-tight tabular-nums" style={{ color: scoreColor }}>
              {store.privacyScore}
            </div>
            <div className="mt-1 text-[13px] text-white/25">Privacy Score</div>
            {/* Sparkline */}
            {store.scoreHistory.length > 1 && (
              <svg viewBox="0 0 120 30" className="mx-auto mt-3 h-6 w-24" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={store.scoreHistory.map((s, i) => {
                    const x = (i / (store.scoreHistory.length - 1)) * 120;
                    const y = 30 - (s.score / 100) * 28;
                    return `${x},${y}`;
                  }).join(' ')}
                />
              </svg>
            )}
            {store.scoreHistory.length > 1 && (() => {
              const first = store.scoreHistory[0].score;
              const last = store.scoreHistory[store.scoreHistory.length - 1].score;
              const diff = last - first;
              return (
                <div className={`mt-1 text-[11px] ${diff >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {diff >= 0 ? '+' : ''}{diff} pts since {new Date(store.scoreHistory[0].date).toLocaleDateString()}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Breaches */}
        <div className="glass-card">
          <div className="text-[2rem] font-bold tracking-tight text-[#ef4444] tabular-nums">{unresolvedBreaches}</div>
          <div className="mt-1 text-[14px] text-white/35">Unresolved Breaches</div>
          {unresolvedBreaches > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#ef4444]/60">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ef4444] animate-pulse" />
              Needs attention
            </div>
          )}
        </div>

        {/* Brokers */}
        <div className="glass-card">
          <div className="text-[2rem] font-bold tracking-tight text-[#f97316] tabular-nums">{exposedBrokers}</div>
          <div className="mt-1 text-[14px] text-white/35">Broker Exposures</div>
          {exposedBrokers > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#f97316]/60">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#f97316] animate-pulse" />
              Your data is being sold
            </div>
          )}
        </div>

        {/* Dark Web */}
        <div className="glass-card">
          <div className="text-[2rem] font-bold tracking-tight text-[#a78bfa] tabular-nums">
            {store.darkWebAlerts.filter((a) => !a.resolved).length}
          </div>
          <div className="mt-1 text-[14px] text-white/35">Dark Web Alerts</div>
          {store.darkWebAlerts.filter((a) => !a.resolved).length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#a78bfa]/60">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#a78bfa] animate-pulse" />
              Credentials exposed
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── Connected Emails ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <p className="section-label mb-3">Connected Emails</p>
        <div className="flex flex-wrap gap-2">
          {store.connectedEmails.map((e) => (
            <span key={e.email} className="glass rounded-full px-4 py-1.5 text-[13px] font-medium text-white/50">
              {e.email}
              {e.breachCount > 0 && (
                <span className="ml-2 text-[11px] font-semibold text-[#ef4444]">{e.breachCount}</span>
              )}
            </span>
          ))}
        </div>
      </motion.div>

      {/* ─── Tabs ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <div className="flex gap-1 rounded-2xl bg-white/[0.02] border border-white/[0.04] p-1.5">
          {(['breaches', 'brokers', 'darkweb', 'accounts', 'subscriptions'] as Tab[]).map((tab) => {
            const isActive = activeTab === tab;
            const label = tab === 'darkweb' ? 'Dark Web' : tab.charAt(0).toUpperCase() + tab.slice(1);
            const count =
              tab === 'breaches' ? unresolvedBreaches
              : tab === 'brokers' ? exposedBrokers
              : tab === 'darkweb' ? store.darkWebAlerts.filter((a) => !a.resolved).length
              : tab === 'accounts' ? store.discoveredAccounts.length
              : tab === 'subscriptions' ? store.trackedSubscriptions.length
              : null;
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setFilter(null); setSearch(''); }}
                className={`relative flex-1 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-white/[0.06] text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-white/[0.08]'
                    : 'text-white/25 hover:text-white/40 border border-transparent'
                }`}
              >
                {label}
                {count !== null && count > 0 && (
                  <span className={`ml-1.5 tabular-nums ${isActive ? 'text-white/50' : 'text-white/15'}`}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Search + Filters ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6 space-y-3"
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${activeTab}...`}
          className="input"
        />
        {/* Filter chips */}
        {activeTab === 'accounts' && store.discoveredAccounts.length > 0 && (() => {
          const cats = [...new Set(store.discoveredAccounts.map((a) => a.category))].sort();
          return (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilter(null)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                  !filter ? 'bg-white/[0.08] text-white border border-white/[0.1]' : 'bg-white/[0.02] text-white/25 border border-white/[0.04] hover:text-white/40'
                }`}
              >All ({store.discoveredAccounts.length})</button>
              {cats.map((cat) => {
                const count = store.discoveredAccounts.filter((a) => a.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilter(filter === cat ? null : cat)}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium capitalize transition-all ${
                      filter === cat ? 'bg-white/[0.08] text-white border border-white/[0.1]' : 'bg-white/[0.02] text-white/25 border border-white/[0.04] hover:text-white/40'
                    }`}
                  >{cat} ({count})</button>
                );
              })}
            </div>
          );
        })()}
        {activeTab === 'subscriptions' && store.trackedSubscriptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: null, label: 'All', count: store.trackedSubscriptions.length },
              { key: 'active', label: 'Active', count: store.trackedSubscriptions.filter((s) => (s.status ?? (s.active ? 'active' : 'cancelled')) === 'active').length },
              { key: 'cancelled', label: 'Cancelled', count: store.trackedSubscriptions.filter((s) => s.status === 'cancelled' || s.status === 'likely_cancelled').length },
              { key: 'failed', label: 'Failed', count: store.trackedSubscriptions.filter((s) => s.status === 'failed').length },
            ].filter((f) => f.count > 0).map((f) => (
              <button
                key={f.key ?? 'all'}
                onClick={() => setFilter(filter === f.key ? null : f.key)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                  filter === f.key ? 'bg-white/[0.08] text-white border border-white/[0.1]' : 'bg-white/[0.02] text-white/25 border border-white/[0.04] hover:text-white/40'
                }`}
              >{f.label} ({f.count})</button>
            ))}
          </div>
        )}
        {activeTab === 'breaches' && store.breaches.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: null, label: 'All', count: store.breaches.length },
              { key: 'unresolved', label: 'Unresolved', count: unresolvedBreaches },
              { key: 'resolved', label: 'Resolved', count: store.breaches.length - unresolvedBreaches },
            ].filter((f) => f.count > 0).map((f) => (
              <button
                key={f.key ?? 'all'}
                onClick={() => setFilter(filter === f.key ? null : f.key)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                  filter === f.key ? 'bg-white/[0.08] text-white border border-white/[0.1]' : 'bg-white/[0.02] text-white/25 border border-white/[0.04] hover:text-white/40'
                }`}
              >{f.label} ({f.count})</button>
            ))}
          </div>
        )}
        {activeTab === 'brokers' && store.dataBrokers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: null, label: 'All', count: store.dataBrokers.length },
              { key: 'found', label: 'Exposed', count: exposedBrokers },
              { key: 'removing', label: 'Removing', count: removingBrokers },
              { key: 'removed', label: 'Removed', count: removedBrokers },
            ].filter((f) => f.count > 0).map((f) => (
              <button
                key={f.key ?? 'all'}
                onClick={() => setFilter(filter === f.key ? null : f.key)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                  filter === f.key ? 'bg-white/[0.08] text-white border border-white/[0.1]' : 'bg-white/[0.02] text-white/25 border border-white/[0.04] hover:text-white/40'
                }`}
              >{f.label} ({f.count})</button>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Breaches ─── */}
      {activeTab === 'breaches' && (
        <div className="space-y-3">
          {filteredBreaches.length === 0 && (
            <div className="py-16 text-center text-[15px] text-white/20">
              {search.trim() ? 'No breaches match your search' : 'No known breaches found — nice!'}
            </div>
          )}
          {filteredBreaches
            .sort((a, b) => {
              // Unresolved first, then by severity
              if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
              const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
              return order[a.severity] - order[b.severity];
            })
            .map((breach, i) => {
              const sev = SEV[breach.severity];
              const isExpanded = expandedBreach === breach.id;
              return (
                <motion.div
                  key={breach.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`glass-card transition-opacity ${breach.resolved ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-white">{breach.name}</h3>
                        <span
                          className="badge capitalize"
                          style={{ backgroundColor: sev.bg, color: sev.color }}
                        >
                          {breach.severity}
                        </span>
                        {breach.resolved && (
                          <span className="badge bg-[#22c55e]/10 text-[#22c55e]">Resolved</span>
                        )}
                      </div>
                      <p className="mt-1 text-[12px] text-white/20">{breach.email} · {breach.date}</p>
                    </div>
                    {!breach.resolved && (
                      <button
                        className="btn-sm shrink-0 !text-[12px]"
                        onClick={() => handleResolve(breach.id)}
                      >
                        {isExpanded ? 'Close' : 'Take Action'}
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/30">{breach.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {breach.dataTypes.map((dt) => (
                      <span key={dt} className="tag">{dt}</span>
                    ))}
                  </div>

                  {/* Expanded remediation panel */}
                  <AnimatePresence>
                    {isExpanded && !breach.resolved && (() => {
                      const steps = getBreachRemediationSteps(breach.name, breach.dataTypes);
                      const completedSteps = store.remediationProgress[breach.id] || [];
                      const progress = steps.length > 0 ? Math.round((completedSteps.length / steps.length) * 100) : 0;
                      return (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
                            {/* Progress bar */}
                            <div className="mb-4 flex items-center gap-3">
                              <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full bg-[var(--accent)]"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 0.5 }}
                                />
                              </div>
                              <span className="text-[11px] font-medium text-white/30 tabular-nums">{completedSteps.length}/{steps.length}</span>
                            </div>

                            <p className="text-[12px] font-semibold uppercase tracking-wider text-white/25 mb-3">
                              Remediation Checklist
                            </p>
                            <ul className="space-y-2">
                              {steps.map((step) => {
                                const done = completedSteps.includes(step.id);
                                const prioColors: Record<string, string> = {
                                  critical: 'text-[#ef4444]', high: 'text-[#f97316]',
                                  medium: 'text-[#eab308]', low: 'text-[#3b82f6]',
                                };
                                return (
                                  <li key={step.id} className="group">
                                    <div className="flex items-start gap-3">
                                      <button
                                        onClick={() => store.toggleRemediationStep(breach.id, step.id)}
                                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                                          done
                                            ? 'bg-[#22c55e]/20 border-[#22c55e]/30 text-[#22c55e]'
                                            : 'border-white/10 text-transparent hover:border-white/20'
                                        }`}
                                      >
                                        {done && (
                                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </button>
                                      <div className={`flex-1 ${done ? 'opacity-40' : ''}`}>
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[13px] font-medium ${done ? 'line-through text-white/30' : 'text-white/70'}`}>
                                            {step.label}
                                          </span>
                                          <span className={`text-[9px] font-semibold uppercase ${prioColors[step.priority]}`}>
                                            {step.priority}
                                          </span>
                                        </div>
                                        <p className="mt-0.5 text-[12px] text-white/20">{step.description}</p>
                                        {step.actionUrl && !done && (
                                          <button
                                            className="btn-sm mt-2 !py-1 !px-2.5 !text-[10px]"
                                            onClick={() => window.open(step.actionUrl, '_blank', 'noopener,noreferrer')}
                                          >
                                            {step.actionLabel || 'Take Action'} →
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                            <div className="mt-5 flex gap-2">
                              <button
                                className="btn-sm !bg-[#22c55e]/10 !text-[#22c55e] !border-[#22c55e]/20"
                                onClick={() => confirmResolve(breach.id)}
                                disabled={completedSteps.length === 0}
                              >
                                {progress === 100 ? 'All Done — Mark Resolved' : 'Mark as Resolved'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>
                </motion.div>
              );
            })}
        </div>
      )}

      {/* ─── Brokers ─── */}
      {activeTab === 'brokers' && (
        <div>
          <div className="glass-card mb-5 flex flex-wrap gap-8">
            {[
              { label: 'Exposed', count: exposedBrokers, color: '#ef4444' },
              { label: 'Removing', count: removingBrokers, color: '#f97316' },
              { label: 'Removed', count: removedBrokers, color: '#22c55e' },
            ].map((s) => (
              <div key={s.label}>
                <span className="text-[1.25rem] font-bold tabular-nums" style={{ color: s.color }}>{s.count}</span>
                <span className="ml-2 text-[13px] text-white/25">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredBrokers.length === 0 && (
              <div className="col-span-full py-16 text-center text-[15px] text-white/20">
                No brokers match your search
              </div>
            )}
            {filteredBrokers.map((broker, i) => (
              <motion.div
                key={broker.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`glass-card ${broker.status === 'removed' ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-white">{broker.name}</h3>
                  <span className={`badge capitalize ${STATUS_STYLE[broker.status]}`}>{broker.status}</span>
                </div>
                <p className="mt-1 text-[12px] text-white/20">{broker.email}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {broker.dataTypes.map((dt) => (
                    <span key={dt} className="tag">{dt}</span>
                  ))}
                </div>
                {broker.status === 'found' && (
                  <div className="mt-3 flex gap-1.5">
                    <button
                      className="btn-sm !text-[12px] flex-1"
                      onClick={() => setExpandedBroker(expandedBroker === broker.id ? null : broker.id)}
                    >
                      {expandedBroker === broker.id ? 'Close' : 'Remove My Data'}
                    </button>
                    <button
                      className="btn-sm !text-[12px]"
                      onClick={() => handleBrokerRemoval(broker.id, broker.url)}
                    >
                      Opt-Out Page →
                    </button>
                  </div>
                )}
                {broker.status === 'removing' && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[12px] text-white/20">Opted out?</span>
                    <button
                      className="btn-sm !text-[12px] !bg-[#22c55e]/10 !text-[#22c55e] !border-[#22c55e]/20"
                      onClick={() => handleMarkBrokerRemoved(broker.id)}
                    >
                      Confirm Removed
                    </button>
                    <button
                      className="btn-sm !text-[12px]"
                      onClick={() => window.open(broker.url, '_blank', 'noopener,noreferrer')}
                    >
                      Revisit
                    </button>
                  </div>
                )}

                {/* Inline opt-out email */}
                <AnimatePresence>
                  {expandedBroker === broker.id && broker.status === 'found' && (() => {
                    const email = generateBrokerOptOut(broker.name, broker.email, broker.dataTypes);
                    return (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25 mb-2">
                            Removal Request Email
                          </p>
                          <div className="rounded-lg bg-white/[0.02] p-3 text-[12px] text-white/40 leading-relaxed max-h-32 overflow-y-auto font-mono">
                            <div className="text-white/20 mb-1">Subject: {email.subject}</div>
                            {email.body}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              className={`btn-sm !text-[11px] flex-1 ${copiedId === `broker-${broker.id}` ? '!bg-[#22c55e]/10 !text-[#22c55e] !border-[#22c55e]/20' : ''}`}
                              onClick={() => handleCopy(`Subject: ${email.subject}\n\n${email.body}`, `broker-${broker.id}`)}
                            >
                              {copiedId === `broker-${broker.id}` ? 'Copied!' : 'Copy Email'}
                            </button>
                            <button
                              className="btn-sm !text-[11px]"
                              onClick={() => {
                                window.open(`mailto:privacy@${broker.name.toLowerCase().replace(/\s+/g, '')}.com?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`, '_self');
                                store.markBrokerRemoving(broker.id);
                              }}
                            >
                              Open in Mail
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Accounts ─── */}
      {activeTab === 'accounts' && (
        <div>
          {!isExtensionInstalled() ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl glass">
                <svg className="h-7 w-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z" />
                </svg>
              </div>
              <h3 className="text-[17px] font-semibold text-white">Install Chrome Extension</h3>
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-white/30">
                Account Discovery scans your Gmail to find every service you've signed up for. Install the Vanish Chrome extension to get started.
              </p>
            </motion.div>
          ) : !store.extensionConnected ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl glass">
                <svg className="h-7 w-7 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-[17px] font-semibold text-white">Connect Your Gmail</h3>
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-white/30">
                Sign in with Gmail to discover all accounts linked to your email.
              </p>
              {extError && <p className="mt-3 text-[13px] text-[#ef4444]">{extError}</p>}
              <button className="btn-primary mt-5" onClick={handleConnectGmail}>Connect Gmail</button>
            </motion.div>
          ) : store.discoveredAccounts.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <h3 className="text-[17px] font-semibold text-white">
                {extScanning ? 'Scanning your inbox...' : 'No accounts discovered yet'}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-white/30">
                {extScanning
                  ? 'This may take a minute depending on inbox size.'
                  : `Connected as ${store.extensionEmail}. Run a scan to find your accounts.`}
              </p>
              {extError && <p className="mt-3 text-[13px] text-[#ef4444]">{extError}</p>}
              {!extScanning && (
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button className="btn-primary" onClick={handleExtensionScan}>Scan Inbox</button>
                  <button className="btn-sm !text-[12px] text-white/30" onClick={handleDisconnectGmail}>Disconnect</button>
                </div>
              )}
              {extScanning && (
                <div className="mx-auto mt-6 h-1 w-48 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-[var(--accent)]"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ width: '40%' }}
                  />
                </div>
              )}
            </motion.div>
          ) : (
            <div>
              <div className="glass-card mb-5 flex items-center justify-between">
                <div>
                  <span className="text-[13px] text-white/30">Connected as </span>
                  <span className="text-[13px] font-medium text-white/60">{store.extensionEmail}</span>
                  <span className="ml-3 text-[13px] text-white/20">·</span>
                  <span className="ml-3 text-[13px] text-white/30">{store.discoveredAccounts.length} accounts found</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn-sm !text-[12px]" onClick={handleExtensionScan} disabled={extScanning}>
                    {extScanning ? 'Scanning...' : 'Rescan'}
                  </button>
                  <button className="btn-sm !text-[12px] text-white/30" onClick={handleDisconnectGmail}>Disconnect</button>
                </div>
              </div>

              {filteredAccounts.length === 0 ? (
                <div className="py-16 text-center text-[15px] text-white/20">No accounts match your search</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAccounts.map((account, i) => (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="glass-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-[13px] font-bold text-white/40">
                          {account.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[14px] font-semibold text-white truncate">{account.name}</h4>
                          <p className="text-[11px] text-white/20 truncate">{account.domain}</p>
                        </div>
                        <span className="badge bg-white/[0.03] text-white/15 capitalize text-[10px]">{account.category}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-white/20">
                        <span>Since {new Date(account.firstSeen).toLocaleDateString()}</span>
                        <div className="flex gap-1.5">
                          <button
                            className="btn-sm !py-1 !px-2.5 !text-[10px]"
                            onClick={() => window.open(`https://${account.domain}/account`, '_blank', 'noopener,noreferrer')}
                          >
                            Manage
                          </button>
                          <button
                            className="btn-sm !py-1 !px-2.5 !text-[10px] !bg-[#ef4444]/8 !text-[#ef4444]/60 !border-[#ef4444]/10"
                            onClick={() => setExpandedAccount(expandedAccount === account.id ? null : account.id)}
                          >
                            {expandedAccount === account.id ? 'Close' : 'Delete Account'}
                          </button>
                        </div>
                      </div>

                      {/* Inline deletion request */}
                      <AnimatePresence>
                        {expandedAccount === account.id && (() => {
                          const userEmail = store.extensionEmail || store.connectedEmails[0]?.email || '';
                          const email = generateDeletionEmail(account.name, userEmail);
                          return (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25 mb-2">
                                  GDPR/CCPA Deletion Request
                                </p>
                                <div className="rounded-lg bg-white/[0.02] p-2 text-[11px] text-white/35 leading-relaxed max-h-24 overflow-y-auto font-mono">
                                  {email.body.slice(0, 200)}...
                                </div>
                                <div className="mt-2 flex gap-1.5">
                                  <button
                                    className={`btn-sm !py-1 !px-2 !text-[10px] flex-1 ${copiedId === `acc-${account.id}` ? '!bg-[#22c55e]/10 !text-[#22c55e] !border-[#22c55e]/20' : ''}`}
                                    onClick={() => handleCopy(`Subject: ${email.subject}\n\n${email.body}`, `acc-${account.id}`)}
                                  >
                                    {copiedId === `acc-${account.id}` ? 'Copied!' : 'Copy Email'}
                                  </button>
                                  <button
                                    className="btn-sm !py-1 !px-2 !text-[10px]"
                                    onClick={() => window.open(`mailto:support@${account.domain}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`, '_self')}
                                  >
                                    Send
                                  </button>
                                  <button
                                    className="btn-sm !py-1 !px-2 !text-[10px]"
                                    onClick={() => window.open(`https://www.google.com/search?q=how+to+delete+${encodeURIComponent(account.name)}+account`, '_blank', 'noopener,noreferrer')}
                                  >
                                    Guide
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })()}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Subscriptions ─── */}
      {activeTab === 'subscriptions' && (
        <div>
          {!isExtensionInstalled() ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl glass">
                <svg className="h-7 w-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z" />
                </svg>
              </div>
              <h3 className="text-[17px] font-semibold text-white">Install Chrome Extension</h3>
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-white/30">
                Subscription Tracker finds recurring charges from your email receipts. Install the Vanish Chrome extension to get started.
              </p>
            </motion.div>
          ) : !store.extensionConnected ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl glass">
                <svg className="h-7 w-7 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-[17px] font-semibold text-white">Connect Your Gmail</h3>
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-white/30">
                Sign in with Gmail to track your subscriptions and recurring charges.
              </p>
              {extError && <p className="mt-3 text-[13px] text-[#ef4444]">{extError}</p>}
              <button className="btn-primary mt-5" onClick={handleConnectGmail}>Connect Gmail</button>
            </motion.div>
          ) : store.trackedSubscriptions.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <h3 className="text-[17px] font-semibold text-white">
                {extScanning ? 'Scanning for subscriptions...' : 'No subscriptions found yet'}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-white/30">
                {extScanning
                  ? 'Analyzing billing emails from the past year.'
                  : `Connected as ${store.extensionEmail}. Run a scan to find recurring charges.`}
              </p>
              {!extScanning && (
                <button className="btn-primary mt-5" onClick={handleExtensionScan}>Scan Inbox</button>
              )}
            </motion.div>
          ) : (
            <div>
              {/* Monthly total */}
              {(() => {
                const activeSubs = store.trackedSubscriptions.filter((s) => (s.status ?? (s.active ? 'active' : 'cancelled')) === 'active');
                const cancelledCount = store.trackedSubscriptions.filter((s) => s.status === 'cancelled' || s.status === 'likely_cancelled').length;
                const failedCount = store.trackedSubscriptions.filter((s) => s.status === 'failed').length;
                const monthlyTotal = activeSubs.reduce((sum, s) => {
                  if (s.frequency === 'yearly') return sum + s.amount / 12;
                  return sum + s.amount;
                }, 0);
                return (
                  <div className="glass-card mb-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[2rem] font-bold tracking-tight text-white tabular-nums">
                          ${monthlyTotal.toFixed(2)}
                          <span className="text-[14px] font-normal text-white/25">/mo</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-[13px]">
                          <span className="text-[#22c55e]">{activeSubs.length} active</span>
                          {cancelledCount > 0 && <span className="text-white/25">{cancelledCount} cancelled</span>}
                          {failedCount > 0 && <span className="text-[#f97316]">{failedCount} failed</span>}
                        </div>
                      </div>
                      <button className="btn-sm !text-[12px]" onClick={handleExtensionScan} disabled={extScanning}>
                        {extScanning ? 'Scanning...' : 'Rescan'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                {filteredSubscriptions.length === 0 && (
                  <div className="py-16 text-center text-[15px] text-white/20">No subscriptions match your filters</div>
                )}
                {filteredSubscriptions.map((sub, i) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`glass-card ${!sub.active ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-[13px] font-bold text-white/40">
                            {sub.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-[14px] font-semibold text-white">{sub.name}</h4>
                            <p className="text-[11px] text-white/20">{sub.domain}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[15px] font-semibold text-white tabular-nums">
                            {sub.currency === 'EUR' ? '€' : sub.currency === 'GBP' ? '£' : '$'}
                            {sub.amount.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-white/20">
                            {sub.frequency === 'monthly' ? '/mo' : sub.frequency === 'yearly' ? '/yr' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-white/20">
                        <span>{sub.chargeCount ?? sub.emailCount} charge{(sub.chargeCount ?? sub.emailCount) !== 1 ? 's' : ''} found</span>
                        <div className="flex items-center gap-2">
                          <span>Last {new Date(sub.lastCharged).toLocaleDateString()}</span>
                          {(() => {
                            const status = sub.status ?? (sub.active ? 'active' : 'cancelled');
                            if (status === 'active') return <span className="badge bg-[#22c55e]/10 text-[#22c55e]">Active</span>;
                            if (status === 'cancelled') return <span className="badge bg-[#ef4444]/10 text-[#ef4444]">Cancelled</span>;
                            if (status === 'failed') return <span className="badge bg-[#f97316]/10 text-[#f97316]">Payment Failed</span>;
                            if (status === 'likely_cancelled') return <span className="badge bg-[#eab308]/10 text-[#eab308]">Likely Cancelled</span>;
                            return <span className="badge bg-white/[0.04] text-white/20">Unknown</span>;
                          })()}
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="mt-3 flex gap-1.5 border-t border-white/[0.04] pt-3">
                        <button
                          className="btn-sm !py-1 !px-2.5 !text-[10px] flex-1"
                          onClick={() => window.open(`https://${sub.domain}`, '_blank', 'noopener,noreferrer')}
                        >
                          Visit Site
                        </button>
                        {(sub.status ?? (sub.active ? 'active' : 'cancelled')) === 'active' && (
                          <button
                            className="btn-sm !py-1 !px-2.5 !text-[10px] flex-1 !bg-[#ef4444]/8 !text-[#ef4444]/60 !border-[#ef4444]/10"
                            onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                          >
                            {expandedSub === sub.id ? 'Close' : 'Cancel'}
                          </button>
                        )}
                        {sub.status === 'failed' && (
                          <button
                            className="btn-sm !py-1 !px-2.5 !text-[10px] flex-1 !bg-[#f97316]/8 !text-[#f97316]/60 !border-[#f97316]/10"
                            onClick={() => window.open(`https://${sub.domain}/account/billing`, '_blank', 'noopener,noreferrer')}
                          >
                            Fix Payment
                          </button>
                        )}
                      </div>

                      {/* Inline cancel action */}
                      <AnimatePresence>
                        {expandedSub === sub.id && (() => {
                          const userEmail = store.extensionEmail || store.connectedEmails[0]?.email || '';
                          const email = generateCancelEmail(sub.name, userEmail);
                          return (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25 mb-2">
                                  Cancellation Options
                                </p>
                                <div className="space-y-2">
                                  <button
                                    className="btn-sm !text-[11px] w-full justify-between"
                                    onClick={() => window.open(`https://${sub.domain}/account`, '_blank', 'noopener,noreferrer')}
                                  >
                                    <span>Go to account settings</span>
                                    <span className="text-white/20">→</span>
                                  </button>
                                  <button
                                    className="btn-sm !text-[11px] w-full justify-between"
                                    onClick={() => window.open(`https://www.google.com/search?q=how+to+cancel+${encodeURIComponent(sub.name)}+subscription`, '_blank', 'noopener,noreferrer')}
                                  >
                                    <span>Step-by-step cancellation guide</span>
                                    <span className="text-white/20">→</span>
                                  </button>
                                </div>
                                <div className="mt-3 rounded-lg bg-white/[0.02] p-3 text-[11px] text-white/35 leading-relaxed max-h-24 overflow-y-auto font-mono">
                                  <div className="text-white/20 mb-1">Subject: {email.subject}</div>
                                  {email.body}
                                </div>
                                <div className="mt-2 flex gap-1.5">
                                  <button
                                    className={`btn-sm !py-1 !px-2.5 !text-[10px] flex-1 ${copiedId === `sub-${sub.id}` ? '!bg-[#22c55e]/10 !text-[#22c55e] !border-[#22c55e]/20' : ''}`}
                                    onClick={() => handleCopy(`Subject: ${email.subject}\n\n${email.body}`, `sub-${sub.id}`)}
                                  >
                                    {copiedId === `sub-${sub.id}` ? 'Copied!' : 'Copy Email'}
                                  </button>
                                  <button
                                    className="btn-sm !py-1 !px-2.5 !text-[10px]"
                                    onClick={() => window.open(`mailto:support@${sub.domain}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`, '_self')}
                                  >
                                    Open in Mail
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })()}
                      </AnimatePresence>
                    </motion.div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Dark Web — HUD/FUI Mode ─── */}
      {activeTab === 'darkweb' && (
        <motion.div
          key="darkweb-hud"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="hud-mode relative -mx-6 -mb-6 px-6 pb-6 pt-2 min-h-[60vh]"
          style={{ fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace" }}
        >
          {/* Overlays */}
          <div className="hud-grid" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
          <div className="hud-noise" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
          <motion.div
            className="hud-scanline"
            style={{ position: 'absolute', inset: 0, zIndex: 2 }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 2.5, duration: 0.3 }}
          />

          {/* Glitch entrance wrapper */}
          <div className="hud-glitch-in relative" style={{ zIndex: 3 }}>

          {/* Connector SVG lines */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <motion.line
              x1="10%" y1="80" x2="90%" y2="80"
              stroke="rgba(0,255,136,0.1)" strokeWidth="1"
              strokeDasharray="200"
              initial={{ strokeDashoffset: 200 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />
            <motion.line
              x1="50%" y1="0" x2="50%" y2="100%"
              stroke="rgba(0,255,136,0.04)" strokeWidth="1"
              strokeDasharray="200"
              initial={{ strokeDashoffset: 200 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 2, delay: 0.8 }}
            />
          </svg>

          {store.connectedEmails.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="py-20 text-center hud-flicker"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center border border-[#00ff88]/20">
                <motion.div
                  className="h-3 w-3 rounded-full bg-[#00ff88]/40"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <h3 className="text-[15px] font-medium hud-neon tracking-[0.15em] uppercase">No Targets Linked</h3>
              <p className="mx-auto mt-3 max-w-sm text-[12px] leading-relaxed text-[#00ff88]/30 tracking-wider">
                Connect email addresses to initiate dark web reconnaissance scan.
              </p>
              <button
                className="mt-5 px-6 py-2.5 text-[12px] font-medium uppercase tracking-[0.2em] border border-[#00ff88]/30 text-[#00ff88]/70 hover:bg-[#00ff88]/10 hover:text-[#00ff88] transition-all"
                onClick={() => navigate('/scan')}
              >
                Initialize Scan
              </button>
            </motion.div>
          ) : (
            <>
              {/* HUD Header — Telemetry Bar */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="hud-flicker mb-6"
                style={{ animationDelay: '0.1s' }}
              >
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-[#00ff88]/30 mb-3">
                  <span>Dark Web Intelligence</span>
                  <span className="hud-blink">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#00ff88]/60 mr-1.5" />
                    System Active
                  </span>
                </div>

                <div className="hud-panel hud-panel-bottom">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-4">
                        <span className="text-[2rem] font-bold tabular-nums hud-neon-red">
                          {store.darkWebAlerts.filter((a) => !a.resolved).length}
                        </span>
                        <div>
                          <span className="text-[11px] uppercase tracking-[0.15em] text-[#00ff88]/40">Threat Signals</span>
                          {store.darkWebLastChecked && (
                            <div className="text-[10px] text-[#00ff88]/20 mt-0.5">
                              Last sweep: {new Date(store.darkWebLastChecked).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[#00ff88]/20 tracking-wider">
                        {store.connectedEmails.map((e) => (
                          <span key={e.email} className="flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-[#00ff88]/30" />
                            {e.email}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] border transition-all disabled:opacity-30"
                      style={{
                        borderColor: store.darkWebScanning ? 'rgba(255,170,0,0.3)' : 'rgba(0,255,136,0.25)',
                        color: store.darkWebScanning ? '#ffaa00' : 'rgba(0,255,136,0.7)',
                        background: store.darkWebScanning ? 'rgba(255,170,0,0.05)' : 'rgba(0,255,136,0.05)',
                      }}
                      onClick={handleDarkWebScan}
                      disabled={store.darkWebScanning}
                    >
                      {store.darkWebScanning ? 'Scanning...' : 'Run Sweep'}
                    </button>
                  </div>

                  {/* Telemetry stats row */}
                  <div className="mt-4 grid grid-cols-4 gap-3">
                    {[
                      { label: 'Critical', value: store.darkWebAlerts.filter((a) => a.severity === 'critical' && !a.resolved).length, color: '#ff3366' },
                      { label: 'High', value: store.darkWebAlerts.filter((a) => a.severity === 'high' && !a.resolved).length, color: '#ffaa00' },
                      { label: 'Medium', value: store.darkWebAlerts.filter((a) => a.severity === 'medium' && !a.resolved).length, color: '#00ddff' },
                      { label: 'Resolved', value: store.darkWebAlerts.filter((a) => a.resolved).length, color: '#00ff88' },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center border border-white/[0.04] py-2 bg-white/[0.01]">
                        <div className="text-[1.1rem] font-bold tabular-nums" style={{ color: stat.color, textShadow: `0 0 8px ${stat.color}33` }}>
                          {stat.value}
                        </div>
                        <div className="text-[9px] uppercase tracking-[0.15em] mt-0.5" style={{ color: `${stat.color}66` }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Scanning progress — HUD style */}
              {store.darkWebScanning && darkWebProgress && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-5"
                >
                  <div className="hud-panel hud-panel-bottom text-center relative overflow-hidden hud-hscan">
                    <div className="mx-auto mb-3 h-px w-48 overflow-hidden bg-[#00ff88]/10 relative">
                      <motion.div
                        className="h-full bg-[#00ff88]/60"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        style={{ width: '40%' }}
                      />
                    </div>
                    <p className="text-[11px] text-[#00ff88]/40 tracking-wider uppercase">{darkWebProgress}</p>
                  </div>
                </motion.div>
              )}

              {/* Filter chips — HUD style */}
              {store.darkWebAlerts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mb-5 flex flex-wrap gap-1.5"
                >
                  {[
                    { key: null, label: 'ALL', count: store.darkWebAlerts.length },
                    { key: 'unresolved', label: 'ACTIVE', count: store.darkWebAlerts.filter((a) => !a.resolved).length },
                    { key: 'credentials', label: 'CREDS', count: store.darkWebAlerts.filter((a) => a.type === 'credentials').length },
                    { key: 'personal_info', label: 'PII', count: store.darkWebAlerts.filter((a) => a.type === 'personal_info').length },
                    { key: 'financial', label: 'FIN', count: store.darkWebAlerts.filter((a) => a.type === 'financial').length },
                  ].filter((f) => f.count > 0).map((f) => (
                    <button
                      key={f.key ?? 'all'}
                      onClick={() => setFilter(filter === f.key ? null : f.key)}
                      className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] transition-all"
                      style={{
                        border: `1px solid ${filter === f.key ? 'rgba(0,255,136,0.4)' : 'rgba(0,255,136,0.1)'}`,
                        color: filter === f.key ? '#00ff88' : 'rgba(0,255,136,0.3)',
                        background: filter === f.key ? 'rgba(0,255,136,0.08)' : 'transparent',
                        textShadow: filter === f.key ? '0 0 6px rgba(0,255,136,0.3)' : 'none',
                      }}
                    >{f.label} [{f.count}]</button>
                  ))}
                </motion.div>
              )}

              {/* Empty state */}
              {store.darkWebAlerts.length === 0 && !store.darkWebScanning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="py-16 text-center"
                >
                  <div className="text-[12px] uppercase tracking-[0.2em] text-[#00ff88]/20">
                    {store.darkWebLastChecked
                      ? '// NO EXPOSURES DETECTED — PERIMETER SECURE'
                      : '// AWAITING SCAN INITIATION'}
                  </div>
                </motion.div>
              )}

              {/* Alert list — HUD panels */}
              <div className="space-y-3">
                {store.darkWebAlerts
                  .filter((alert) => {
                    if (filter === 'unresolved') return !alert.resolved;
                    if (filter === 'credentials' || filter === 'personal_info' || filter === 'financial' || filter === 'medical') return alert.type === filter;
                    return true;
                  })
                  .filter((alert) => {
                    if (!search.trim()) return true;
                    const q = search.toLowerCase();
                    return alert.source.toLowerCase().includes(q) || alert.email.toLowerCase().includes(q) || alert.description.toLowerCase().includes(q);
                  })
                  .map((alert, i) => {
                    const hudSev: Record<string, { color: string; label: string }> = {
                      critical: { color: '#ff3366', label: 'CRIT' },
                      high: { color: '#ffaa00', label: 'HIGH' },
                      medium: { color: '#00ddff', label: 'MED' },
                      low: { color: '#00ff88', label: 'LOW' },
                    };
                    const sv = hudSev[alert.severity] || hudSev.low;
                    const typeLabels: Record<string, string> = {
                      credentials: 'CRED',
                      personal_info: 'PII',
                      financial: 'FIN',
                      medical: 'MED',
                    };
                    return (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.06, duration: 0.5 }}
                        className={`hud-panel hud-panel-bottom hud-flicker transition-opacity ${alert.resolved ? 'opacity-30' : ''}`}
                        style={{ animationDelay: `${0.3 + i * 0.08}s` }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="inline-block h-2 w-2"
                                style={{ backgroundColor: sv.color, boxShadow: `0 0 6px ${sv.color}66` }}
                              />
                              <h3 className="text-[13px] font-semibold text-white/90 tracking-wide uppercase">{alert.source}</h3>
                              <span
                                className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] border"
                                style={{ color: sv.color, borderColor: `${sv.color}33`, background: `${sv.color}0d` }}
                              >
                                {sv.label}
                              </span>
                              <span className="px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] border border-[#00ddff]/20 text-[#00ddff]/50 bg-[#00ddff]/5">
                                {typeLabels[alert.type] || alert.type}
                              </span>
                              {alert.resolved && (
                                <span className="px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] border border-[#00ff88]/20 text-[#00ff88]/50 bg-[#00ff88]/5">
                                  Neutralized
                                </span>
                              )}
                            </div>
                            <p className="mt-1.5 text-[10px] text-[#00ff88]/20 tracking-wider">
                              {alert.email} // {formatDate(alert.date)}
                            </p>
                          </div>
                          {!alert.resolved && (
                            <button
                              className="shrink-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] border border-[#00ff88]/20 text-[#00ff88]/50 hover:bg-[#00ff88]/10 hover:text-[#00ff88] hover:border-[#00ff88]/40 transition-all"
                              onClick={() => store.markDarkWebAlertResolved(alert.id)}
                            >
                              Neutralize
                            </button>
                          )}
                        </div>
                        <p className="mt-3 text-[12px] leading-relaxed text-white/25 tracking-wide">{alert.description}</p>
                      </motion.div>
                    );
                  })}
              </div>
            </>
          )}

          {/* Bottom telemetry bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-8 flex items-center justify-between text-[9px] uppercase tracking-[0.25em] text-[#00ff88]/15"
          >
            <span>Vanish Dark Web Intelligence Module v2.1</span>
            <span className="flex items-center gap-2">
              <span className="hud-blink inline-block h-1 w-1 rounded-full bg-[#00ff88]/30" />
              Encrypted Channel
            </span>
          </motion.div>

          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}
