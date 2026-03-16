import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';

type Tab = 'breaches' | 'brokers' | 'accounts' | 'subscriptions';

const SEVERITY_STYLES: Record<string, { bg: string; color: string }> = {
  critical: { bg: '#ff3b3015', color: '#ff3b30' },
  high: { bg: '#ff950015', color: '#ff9500' },
  medium: { bg: '#ffcc0015', color: '#a68a00' },
  low: { bg: '#007aff15', color: '#007aff' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const store = useStore();

  const [activeTab, setActiveTab] = useState<Tab>('breaches');
  const [search, setSearch] = useState('');

  if (store.breaches.length === 0 && store.dataBrokers.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6">
        <h2 className="text-[1.5rem] font-bold tracking-tight text-[#1d1d1f]">No scan data yet</h2>
        <p className="text-[15px] text-black/40">Run a scan first to see your digital footprint.</p>
        <button className="apple-btn-primary" onClick={() => navigate('/scan')}>Start Scan</button>
      </div>
    );
  }

  const unresolvedBreaches = store.breaches.filter((b) => !b.resolved).length;
  const exposedBrokers = store.dataBrokers.filter((b) => b.status === 'found').length;

  const filteredBreaches = useMemo(() => {
    if (!search.trim()) return store.breaches;
    const q = search.toLowerCase();
    return store.breaches.filter((b) =>
      b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q)
    );
  }, [store.breaches, search]);

  const filteredBrokers = useMemo(() => {
    if (!search.trim()) return store.dataBrokers;
    const q = search.toLowerCase();
    return store.dataBrokers.filter((b) =>
      b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q)
    );
  }, [store.dataBrokers, search]);

  const scoreColor = store.privacyScore > 70 ? '#34c759'
    : store.privacyScore > 40 ? '#ff9500'
    : '#ff3b30';

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="apple-btn-sm !px-3 !py-1.5"
          >
            ←
          </button>
          <div>
            <h1 className="text-[1.5rem] font-bold tracking-tight text-[#1d1d1f]">Your Digital Footprint</h1>
            <p className="text-[13px] text-black/30">
              {store.connectedEmails.length} email{store.connectedEmails.length !== 1 ? 's' : ''} scanned
            </p>
          </div>
        </div>
        <button className="apple-btn-sm" onClick={() => navigate('/scan')}>+ Add Email</button>
      </div>

      {/* Stats row */}
      <div className="mb-10 grid gap-5 sm:grid-cols-3">
        <div className="apple-card flex flex-col items-center justify-center py-8">
          <div className="text-[2.5rem] font-bold tracking-tight tabular-nums" style={{ color: scoreColor }}>
            {store.privacyScore}
          </div>
          <div className="mt-1 text-[13px] font-medium text-black/30">Privacy Score</div>
        </div>
        <div className="apple-card">
          <div className="text-[2rem] font-bold tracking-tight text-[#ff3b30] tabular-nums">{unresolvedBreaches}</div>
          <div className="mt-1 text-[14px] text-black/40">Unresolved Breaches</div>
        </div>
        <div className="apple-card">
          <div className="text-[2rem] font-bold tracking-tight text-[#ff9500] tabular-nums">{exposedBrokers}</div>
          <div className="mt-1 text-[14px] text-black/40">Broker Exposures</div>
        </div>
      </div>

      {/* Connected emails */}
      <div className="mb-8">
        <p className="section-label mb-3">Connected Emails</p>
        <div className="flex flex-wrap gap-2">
          {store.connectedEmails.map((e) => (
            <span key={e.email} className="rounded-full bg-black/[0.04] px-4 py-1.5 text-[13px] font-medium text-[#1d1d1f]">
              {e.email}
              {e.breachCount > 0 && (
                <span className="ml-2 text-[#ff3b30]">{e.breachCount}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-2xl bg-black/[0.03] p-1.5">
        {(['breaches', 'brokers', 'accounts', 'subscriptions'] as Tab[]).map((tab) => {
          const isActive = activeTab === tab;
          const isLocked = tab === 'accounts' || tab === 'subscriptions';
          const count = tab === 'breaches' ? unresolvedBreaches
            : tab === 'brokers' ? exposedBrokers
            : null;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgb(0,0,0,0.08)]'
                  : 'text-black/35 hover:text-black/60'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {count !== null && <span className="ml-1 tabular-nums">({count})</span>}
              {isLocked && <span className="ml-1 text-[11px] text-black/20">Soon</span>}
            </button>
          );
        })}
      </div>

      {/* Search */}
      {(activeTab === 'breaches' || activeTab === 'brokers') && (
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="apple-input"
          />
        </div>
      )}

      {/* Breaches */}
      {activeTab === 'breaches' && (
        <div className="space-y-3">
          {filteredBreaches.length === 0 && (
            <div className="py-16 text-center text-[15px] text-black/30">
              {search.trim() ? 'No breaches match your search' : 'No known breaches found — nice!'}
            </div>
          )}
          {filteredBreaches
            .sort((a, b) => {
              const order = { critical: 0, high: 1, medium: 2, low: 3 };
              return order[a.severity] - order[b.severity];
            })
            .map((breach) => {
              const sev = SEVERITY_STYLES[breach.severity];
              return (
                <div key={breach.id} className="apple-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">{breach.name}</h3>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                          style={{ backgroundColor: sev.bg, color: sev.color }}
                        >
                          {breach.severity}
                        </span>
                        {breach.resolved && (
                          <span className="rounded-full bg-[#34c759]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#34c759]">
                            Resolved
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[12px] text-black/25">{breach.email} · {breach.date}</p>
                    </div>
                    {!breach.resolved && (
                      <button
                        className="apple-btn-sm shrink-0 !text-[12px]"
                        onClick={() => store.markBreachResolved(breach.id)}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-black/40">{breach.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {breach.dataTypes.map((dt) => (
                      <span key={dt} className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-medium text-black/40">
                        {dt}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Brokers */}
      {activeTab === 'brokers' && (
        <div>
          <div className="apple-card mb-5 flex flex-wrap gap-8">
            <div>
              <span className="text-[1.25rem] font-bold text-[#ff3b30] tabular-nums">
                {store.dataBrokers.filter((b) => b.status === 'found').length}
              </span>
              <span className="ml-2 text-[13px] text-black/30">Exposed</span>
            </div>
            <div>
              <span className="text-[1.25rem] font-bold text-[#ff9500] tabular-nums">
                {store.dataBrokers.filter((b) => b.status === 'removing').length}
              </span>
              <span className="ml-2 text-[13px] text-black/30">Removing</span>
            </div>
            <div>
              <span className="text-[1.25rem] font-bold text-[#34c759] tabular-nums">
                {store.dataBrokers.filter((b) => b.status === 'removed').length}
              </span>
              <span className="ml-2 text-[13px] text-black/30">Removed</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredBrokers.length === 0 && (
              <div className="col-span-full py-16 text-center text-[15px] text-black/30">
                No brokers match your search
              </div>
            )}
            {filteredBrokers.map((broker) => (
              <div key={broker.id} className="apple-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-[#1d1d1f]">{broker.name}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                      broker.status === 'found'
                        ? 'bg-[#ff3b30]/10 text-[#ff3b30]'
                        : broker.status === 'removing'
                        ? 'bg-[#ff9500]/10 text-[#ff9500]'
                        : 'bg-[#34c759]/10 text-[#34c759]'
                    }`}
                  >
                    {broker.status}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-black/25">{broker.email}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {broker.dataTypes.map((dt) => (
                    <span key={dt} className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-medium text-black/40">
                      {dt}
                    </span>
                  ))}
                </div>
                {broker.status === 'found' && (
                  <button
                    className="apple-btn-sm mt-3 !text-[12px]"
                    onClick={() => store.markBrokerRemoving(broker.id)}
                  >
                    Request Removal
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coming Soon */}
      {(activeTab === 'accounts' || activeTab === 'subscriptions') && (
        <div className="py-20 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.03]">
            <span className="text-xl text-black/20">🔒</span>
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
            {activeTab === 'accounts' ? 'Account Discovery' : 'Subscription Tracker'}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-black/40">
            {activeTab === 'accounts'
              ? 'Automatically find every account linked to your email — requires the Chrome extension.'
              : 'Track every recurring charge across your accounts — requires the Chrome extension.'}
          </p>
          <div className="mt-5">
            <span className="rounded-full bg-black/[0.04] px-5 py-2 text-[13px] font-medium text-black/30">
              Coming with Chrome Extension
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
