import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';

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
    if (!search.trim()) return store.breaches;
    const q = search.toLowerCase();
    return store.breaches.filter((b) => b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q));
  }, [store.breaches, search]);

  const filteredBrokers = useMemo(() => {
    if (!search.trim()) return store.dataBrokers;
    const q = search.toLowerCase();
    return store.dataBrokers.filter((b) => b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q));
  }, [store.dataBrokers, search]);

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
            const isLocked = tab === 'accounts' || tab === 'subscriptions';
            const count = tab === 'breaches' ? unresolvedBreaches : tab === 'brokers' ? exposedBrokers : null;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-white/[0.06] text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-white/[0.08]'
                    : 'text-white/25 hover:text-white/40 border border-transparent'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {count !== null && (
                  <span className={`ml-1.5 tabular-nums ${isActive ? 'text-white/50' : 'text-white/15'}`}>
                    ({count})
                  </span>
                )}
                {isLocked && <span className="ml-1 text-[10px] text-white/15">Soon</span>}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Search ─── */}
      <AnimatePresence>
        {(activeTab === 'breaches' || activeTab === 'brokers') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="input"
            />
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* ─── Coming Soon ─── */}
      {(activeTab === 'accounts' || activeTab === 'subscriptions') && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-20 text-center"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl glass">
            <svg className="h-7 w-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h3 className="text-[17px] font-semibold text-white">
            {activeTab === 'accounts' ? 'Account Discovery' : 'Subscription Tracker'}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-white/30">
            {activeTab === 'accounts'
              ? 'Automatically find every account linked to your email — requires the Chrome extension.'
              : 'Track every recurring charge across your accounts — requires the Chrome extension.'}
          </p>
          <div className="mt-5">
            <span className="glass rounded-full px-5 py-2 text-[13px] font-medium text-white/30">
              Coming with Chrome Extension
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
