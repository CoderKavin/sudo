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

type Tab = 'breaches' | 'brokers' | 'accounts' | 'subscriptions';

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

/* Breach-specific remediation steps */
function getBreachActions(dataTypes: string[]): string[] {
  const actions: string[] = [];
  const lower = dataTypes.map((d) => d.toLowerCase()).join(' ');

  if (lower.includes('password')) actions.push('Change your password immediately');
  if (lower.includes('password')) actions.push('Enable two-factor authentication');
  if (lower.includes('email')) actions.push('Watch for phishing emails targeting this account');
  if (lower.includes('social security') || lower.includes('ssn')) actions.push('Freeze your credit with all three bureaus');
  if (lower.includes('credit card') || lower.includes('financial') || lower.includes('bank')) actions.push('Monitor bank statements for unauthorized charges');
  if (lower.includes('phone')) actions.push('Set up a SIM lock with your carrier');
  if (lower.includes('passport') || lower.includes('driver')) actions.push('Report compromised ID documents to issuing authority');

  if (actions.length === 0) actions.push('Review account security settings');
  return actions;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const store = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('breaches');
  const [search, setSearch] = useState('');
  const [expandedBreach, setExpandedBreach] = useState<string | null>(null);
  const [extScanning, setExtScanning] = useState(false);
  const [extError, setExtError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

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
          <button className="btn-sm" onClick={handleExportReport}>Export</button>
          <button className="btn-sm" onClick={() => navigate('/scan')}>+ Add Email</button>
        </div>
      </motion.div>

      {/* ─── Stats ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-10 grid gap-5 sm:grid-cols-3"
      >
        {/* Score */}
        <div className="glass-card flex flex-col items-center justify-center py-8 relative overflow-hidden">
          <motion.div
            className="absolute inset-0 opacity-20"
            style={{ background: `radial-gradient(circle at 50% 50%, ${scoreColor}20, transparent 70%)` }}
          />
          <div className="relative">
            <div className="text-[3rem] font-bold tracking-tight tabular-nums" style={{ color: scoreColor }}>
              {store.privacyScore}
            </div>
            <div className="mt-1 text-center text-[13px] text-white/25">Privacy Score</div>
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
          {(['breaches', 'brokers', 'accounts', 'subscriptions'] as Tab[]).map((tab) => {
            const isActive = activeTab === tab;
            const count =
              tab === 'breaches' ? unresolvedBreaches
              : tab === 'brokers' ? exposedBrokers
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
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
              const actions = getBreachActions(breach.dataTypes);
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

                  {/* Expanded action panel */}
                  <AnimatePresence>
                    {isExpanded && !breach.resolved && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
                          <p className="text-[12px] font-semibold uppercase tracking-wider text-white/25 mb-3">
                            Recommended Actions
                          </p>
                          <ul className="space-y-2.5">
                            {actions.map((action, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-[13px] text-white/50">
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[10px] text-[var(--accent)]">
                                  {idx + 1}
                                </span>
                                {action}
                              </li>
                            ))}
                          </ul>
                          <button
                            className="btn-sm mt-5 !bg-[#22c55e]/10 !text-[#22c55e] !border-[#22c55e]/20"
                            onClick={() => confirmResolve(breach.id)}
                          >
                            Mark as Resolved
                          </button>
                        </div>
                      </motion.div>
                    )}
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
                  <button
                    className="btn-sm mt-3 !text-[12px]"
                    onClick={() => handleBrokerRemoval(broker.id, broker.url)}
                  >
                    Request Removal →
                  </button>
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
                            onClick={() => window.open(`https://www.google.com/search?q=how+to+delete+${encodeURIComponent(account.name)}+account`, '_blank', 'noopener,noreferrer')}
                          >
                            Delete Guide
                          </button>
                        </div>
                      </div>
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
                            onClick={() => window.open(`https://www.google.com/search?q=how+to+cancel+${encodeURIComponent(sub.name)}+subscription`, '_blank', 'noopener,noreferrer')}
                          >
                            Cancel Guide
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
                    </motion.div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
