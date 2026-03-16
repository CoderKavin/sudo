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

export default function DashboardPage() {
  const navigate = useNavigate();
  const store = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('breaches');
  const [search, setSearch] = useState('');

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
        <button className="btn-sm" onClick={() => navigate('/scan')}>+ Add Email</button>
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
              const order = { critical: 0, high: 1, medium: 2, low: 3 };
              return order[a.severity] - order[b.severity];
            })
            .map((breach, i) => {
              const sev = SEV[breach.severity];
              return (
                <motion.div
                  key={breach.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card"
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
                        onClick={() => store.markBreachResolved(breach.id)}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/30">{breach.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {breach.dataTypes.map((dt) => (
                      <span key={dt} className="tag">{dt}</span>
                    ))}
                  </div>
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
              { label: 'Exposed', count: store.dataBrokers.filter((b) => b.status === 'found').length, color: '#ef4444' },
              { label: 'Removing', count: store.dataBrokers.filter((b) => b.status === 'removing').length, color: '#f97316' },
              { label: 'Removed', count: store.dataBrokers.filter((b) => b.status === 'removed').length, color: '#22c55e' },
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
                className="glass-card"
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
                    onClick={() => store.markBrokerRemoving(broker.id)}
                  >
                    Request Removal
                  </button>
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
            <span className="text-2xl opacity-30">🔒</span>
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
