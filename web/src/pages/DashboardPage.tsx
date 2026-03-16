import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';

type Tab = 'breaches' | 'brokers' | 'accounts' | 'subscriptions';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#2563eb',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const store = useStore();

  const [activeTab, setActiveTab] = useState<Tab>('breaches');
  const [search, setSearch] = useState('');

  if (store.breaches.length === 0 && store.dataBrokers.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <h2 className="text-2xl font-bold">No scan data yet</h2>
        <p className="text-sm text-gray-600">Run a scan first to see your digital footprint.</p>
        <button
          onClick={() => navigate('/scan')}
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Start Scan
        </button>
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

  const scoreColor = store.privacyScore > 70 ? '#16a34a'
    : store.privacyScore > 40 ? '#ca8a04'
    : '#dc2626';

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold">Your Digital Footprint</h1>
            <p className="text-xs text-gray-500">
              {store.connectedEmails.length} email{store.connectedEmails.length !== 1 ? 's' : ''} scanned
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/scan')}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          + Add Email
        </button>
      </div>

      {/* Privacy Score + Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col items-center justify-center rounded border border-gray-200 p-6">
          <div className="text-4xl font-bold tabular-nums" style={{ color: scoreColor }}>
            {store.privacyScore}
          </div>
          <div className="mt-1 text-sm text-gray-500">Privacy Score</div>
        </div>
        <div className="rounded border border-gray-200 p-6">
          <div className="text-2xl font-bold text-red-600 tabular-nums">{unresolvedBreaches}</div>
          <div className="text-sm text-gray-600">Unresolved Breaches</div>
        </div>
        <div className="rounded border border-gray-200 p-6">
          <div className="text-2xl font-bold text-orange-600 tabular-nums">{exposedBrokers}</div>
          <div className="text-sm text-gray-600">Broker Exposures</div>
        </div>
      </div>

      {/* Connected emails */}
      <div className="mb-6">
        <div className="mb-2 text-xs font-medium uppercase text-gray-500">Connected Emails</div>
        <div className="flex flex-wrap gap-2">
          {store.connectedEmails.map((e) => (
            <span
              key={e.email}
              className="rounded border border-gray-200 bg-gray-50 px-3 py-1 text-sm"
            >
              {e.email}
              {e.breachCount > 0 && (
                <span className="ml-2 text-xs text-red-500">{e.breachCount} breaches</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
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
              className={`px-4 py-2 text-sm capitalize ${
                isActive
                  ? 'border-b-2 border-black font-medium text-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {count !== null && <span className="ml-1 text-xs">({count})</span>}
              {isLocked && <span className="ml-1 text-xs text-gray-400">Soon</span>}
            </button>
          );
        })}
      </div>

      {/* Search */}
      {(activeTab === 'breaches' || activeTab === 'brokers') && (
        <div className="mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>
      )}

      {/* Breaches tab */}
      {activeTab === 'breaches' && (
        <div className="space-y-3">
          {filteredBreaches.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500">
              {search.trim() ? 'No breaches match your search' : 'No known breaches found — nice!'}
            </div>
          )}
          {filteredBreaches
            .sort((a, b) => {
              const order = { critical: 0, high: 1, medium: 2, low: 3 };
              return order[a.severity] - order[b.severity];
            })
            .map((breach) => (
              <div key={breach.id} className="rounded border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{breach.name}</h3>
                      <span
                        className="rounded px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: SEVERITY_COLORS[breach.severity] }}
                      >
                        {breach.severity}
                      </span>
                      {breach.resolved && (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {breach.email} · {breach.date}
                    </p>
                  </div>
                  {!breach.resolved && (
                    <button
                      onClick={() => store.markBreachResolved(breach.id)}
                      className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-600">{breach.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {breach.dataTypes.map((dt) => (
                    <span key={dt} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {dt}
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Brokers tab */}
      {activeTab === 'brokers' && (
        <div>
          <div className="mb-4 flex gap-6 rounded border border-gray-200 p-4 text-sm">
            <div>
              <span className="font-bold text-red-600">
                {store.dataBrokers.filter((b) => b.status === 'found').length}
              </span>{' '}
              Exposed
            </div>
            <div>
              <span className="font-bold text-yellow-600">
                {store.dataBrokers.filter((b) => b.status === 'removing').length}
              </span>{' '}
              Removing
            </div>
            <div>
              <span className="font-bold text-green-600">
                {store.dataBrokers.filter((b) => b.status === 'removed').length}
              </span>{' '}
              Removed
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredBrokers.length === 0 && (
              <div className="col-span-full py-12 text-center text-sm text-gray-500">
                No brokers match your search
              </div>
            )}
            {filteredBrokers.map((broker) => (
              <div key={broker.id} className="rounded border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{broker.name}</h3>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      broker.status === 'found'
                        ? 'bg-red-100 text-red-700'
                        : broker.status === 'removing'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {broker.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{broker.email}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {broker.dataTypes.map((dt) => (
                    <span key={dt} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {dt}
                    </span>
                  ))}
                </div>
                {broker.status === 'found' && (
                  <button
                    onClick={() => store.markBrokerRemoving(broker.id)}
                    className="mt-3 rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
                  >
                    Request Removal
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coming Soon tabs */}
      {(activeTab === 'accounts' || activeTab === 'subscriptions') && (
        <div className="py-16 text-center">
          <h3 className="text-lg font-bold">
            {activeTab === 'accounts' ? 'Account Discovery' : 'Subscription Tracker'}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600">
            {activeTab === 'accounts'
              ? 'Automatically find every account linked to your email — requires the Chrome extension for inbox access.'
              : 'Track every recurring charge across your accounts — requires the Chrome extension for payment detection.'}
          </p>
          <div className="mt-4 inline-block rounded bg-gray-100 px-4 py-2 text-sm text-gray-600">
            Coming with the Chrome Extension
          </div>
        </div>
      )}
    </div>
  );
}
