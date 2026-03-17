import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

function CountUp({ target, delay }: { target: number; delay: number }) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 600;
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        setValue(Math.round(progress * target));
        if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, delay]);

  return <>{value}</>;
}
import useStore from '../store/useStore';
import type { NotificationType } from '../store/useStore';
import {
  isExtensionInstalled,
  connectGmail,
  runExtensionScan,
  getExtensionData,
  disconnectGmail,
} from '../lib/extensionBridge';
import { scanDarkWeb } from '../lib/darkWebMonitor';
import { useMonitoring } from '../lib/monitoring';
import { generatePrivacyReport } from '../lib/pdfReport';
import {
  generateDeletionEmail,
  generateBrokerOptOut,
  generateCancelEmail,
  getBreachRemediationSteps,
  copyToClipboard,
} from '../lib/actionTemplates';
import PasswordChecker from '../components/PasswordChecker';
import ScoreHistory from '../components/ScoreHistory';

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
  useMonitoring();
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
  const [hudActive, setHudActive] = useState(false);
  const [hudClosing, setHudClosing] = useState(false);
  const [hudFilter, setHudFilter] = useState<string | null>(null);
  const [batchRemovalProgress, setBatchRemovalProgress] = useState<{ current: number; total: number } | null>(null);
  const [passwordCheckerOpen, setPasswordCheckerOpen] = useState(false);
  const [scoreHistoryOpen, setScoreHistoryOpen] = useState(false);
  const [notifEmailInput, setNotifEmailInput] = useState(store.notificationEmail ?? '');

  const handleHudClose = useCallback(() => {
    setHudClosing(true);
    setTimeout(() => {
      setHudActive(false);
      setHudClosing(false);
    }, 500);
  }, []);

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
    if (emails.length === 0) {
      setDarkWebProgress('No emails connected — add an email first');
      setTimeout(() => setDarkWebProgress(''), 3000);
      return;
    }
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
      setTimeout(() => setDarkWebProgress(''), 2000);
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

  if (store.breaches.length === 0 && store.dataBrokers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-screen flex-col items-center justify-center gap-5 px-6"
      >
        <h2 className="text-[1.5rem] font-bold text-white">No scan data yet</h2>
        <p className="text-[15px] text-white/55">Run a scan first to see your digital footprint.</p>
        <button className="btn-primary" onClick={() => navigate('/scan')}>Start Scan</button>
      </motion.div>
    );
  }

  const scoreColor = store.privacyScore > 70 ? '#22c55e' : store.privacyScore > 40 ? '#f97316' : '#ef4444';

  const handleBrokerRemoval = (brokerId: string) => {
    const broker = store.dataBrokers.find((b) => b.id === brokerId);
    if (!broker) return;
    const email = generateBrokerOptOut(broker.name, broker.email, broker.dataTypes);
    store.markBrokerRemoving(brokerId);
    window.open(
      `mailto:privacy@${broker.name.toLowerCase().replace(/\s+/g, '')}.com?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`,
      '_self',
    );
  };

  const handleRemoveAll = () => {
    const foundBrokers = store.dataBrokers.filter((b) => b.status === 'found');
    if (foundBrokers.length === 0) return;
    setBatchRemovalProgress({ current: 0, total: foundBrokers.length });

    foundBrokers.forEach((broker, idx) => {
      const email = generateBrokerOptOut(broker.name, broker.email, broker.dataTypes);
      store.markBrokerRemoving(broker.id);

      // Open mailto link for the first broker only
      if (idx === 0) {
        window.open(
          `mailto:privacy@${broker.name.toLowerCase().replace(/\s+/g, '')}.com?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`,
          '_self',
        );
      }

      setBatchRemovalProgress({ current: idx + 1, total: foundBrokers.length });
    });

    // Clear progress after a short delay
    setTimeout(() => setBatchRemovalProgress(null), 3000);
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
      <AnimatePresence>
      {!hudActive && (
      <motion.div
        key="dashboard-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex items-center justify-between"
      >
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-tight text-white">Your Digital Footprint</h1>
          <p className="text-[13px] text-white/50">
            {store.connectedEmails.length} email{store.connectedEmails.length !== 1 ? 's' : ''} scanned
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button className="btn-sm" onClick={() => setPasswordCheckerOpen(true)} whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}>
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Check Password
            </span>
          </motion.button>
          <motion.button className="btn-sm" onClick={handleExportPdf} whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}>PDF Report</motion.button>
          <motion.button className="btn-sm" onClick={handleExportReport} whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}>JSON</motion.button>
          <motion.button className="btn-sm" onClick={() => navigate('/scan')} whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}>+ Add Email</motion.button>
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
        <motion.div className="glass-card flex flex-col items-center justify-center py-8 relative overflow-hidden cursor-pointer" onClick={() => setScoreHistoryOpen(true)} whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.1)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <motion.div
            className="absolute inset-0 opacity-20"
            style={{ background: `radial-gradient(circle at 50% 50%, ${scoreColor}20, transparent 70%)` }}
          />
          <div className="relative text-center">
            <div className="text-[3rem] font-bold tracking-tight tabular-nums" style={{ color: scoreColor }}>
              {store.privacyScore}
            </div>
            <div className="mt-1 text-[13px] text-white/50">Privacy Score</div>
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
        </motion.div>

        {/* Breaches */}
        <motion.div className="glass-card" whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.1)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <div className="text-[2rem] font-bold tracking-tight text-[#ef4444] tabular-nums">{unresolvedBreaches}</div>
          <div className="mt-1 text-[14px] text-white/55">Unresolved Breaches</div>
          {unresolvedBreaches > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#ef4444]/60">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ef4444] animate-pulse" />
              Needs attention
            </div>
          )}
        </motion.div>

        {/* Brokers */}
        <motion.div className="glass-card" whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.1)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <div className="text-[2rem] font-bold tracking-tight text-[#f97316] tabular-nums">{exposedBrokers}</div>
          <div className="mt-1 text-[14px] text-white/55">Broker Exposures</div>
          {exposedBrokers > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#f97316]/60">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#f97316] animate-pulse" />
              Found on {exposedBrokers} broker {exposedBrokers === 1 ? 'site' : 'sites'}
            </div>
          )}
        </motion.div>

        {/* Dark Web */}
        <motion.div className="glass-card flex flex-col" whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.1)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <div className="text-[2rem] font-bold tracking-tight text-[#a78bfa] tabular-nums">
            {store.darkWebAlerts.filter((a) => !a.resolved).length}
          </div>
          <div className="mt-1 text-[14px] text-white/55">Dark Web Alerts</div>
          {store.darkWebAlerts.filter((a) => !a.resolved).length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#a78bfa]/60">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#a78bfa] animate-pulse" />
              Credentials exposed
            </div>
          )}
          <motion.button
            onClick={() => { setHudActive(true); setHudFilter(null); }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="mt-4 w-full rounded-xl py-2.5 px-4 text-[12px] font-semibold tracking-[0.12em] uppercase flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(0,140,255,0.12), rgba(0,200,255,0.06))',
              border: '1px solid rgba(0,140,255,0.25)',
              color: '#008cff',
              textShadow: '0 0 12px rgba(0,140,255,0.4)',
              boxShadow: '0 0 20px rgba(0,140,255,0.08), inset 0 1px 0 rgba(0,140,255,0.1)',
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Dark Web Scanner
          </motion.button>
        </motion.div>
      </motion.div>

      {/* ─── Continuous Monitoring Toggle ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="mb-5 glass-card !py-3 !px-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#a78bfa]/10">
            <svg className="h-4 w-4 text-[#a78bfa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-medium text-white/70">Continuous Monitoring</p>
            <p className="text-[11px] text-white/40">
              {store.monitoringEnabled
                ? `Auto-scanning every ${store.monitoringInterval}h${store.darkWebLastChecked ? ` · Last: ${new Date(store.darkWebLastChecked).toLocaleDateString()}` : ''}`
                : 'Enable to auto-scan for new dark web exposures'}
            </p>
          </div>
        </div>
        <button
          onClick={() => store.setMonitoringEnabled(!store.monitoringEnabled)}
          className="relative h-6 w-11 rounded-full transition-colors duration-200 cursor-pointer"
          style={{
            background: store.monitoringEnabled ? 'rgba(124,106,239,0.5)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${store.monitoringEnabled ? 'rgba(124,106,239,0.6)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <span
            className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform duration-200"
            style={{
              background: store.monitoringEnabled ? '#a78bfa' : 'rgba(255,255,255,0.3)',
              transform: store.monitoringEnabled ? 'translateX(20px)' : 'translateX(0)',
              boxShadow: store.monitoringEnabled ? '0 0 8px rgba(167,139,250,0.5)' : 'none',
            }}
          />
        </button>
      </motion.div>

      {/* ─── Email Notifications ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.09 }}
        className="mb-5 glass-card !py-3 !px-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3b82f6]/10">
              <svg className="h-4 w-4 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-medium text-white/70">Email Alerts</p>
              <p className="text-[11px] text-white/40">
                {store.notificationsEnabled
                  ? `Sending to ${store.notificationEmail ?? 'not set'}`
                  : 'Get notified when new breaches or dark web exposures are found'}
              </p>
            </div>
          </div>
          <button
            onClick={() => store.setNotificationsEnabled(!store.notificationsEnabled)}
            className="relative h-6 w-11 rounded-full transition-colors duration-200 cursor-pointer"
            style={{
              background: store.notificationsEnabled ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${store.notificationsEnabled ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform duration-200"
              style={{
                background: store.notificationsEnabled ? '#3b82f6' : 'rgba(255,255,255,0.3)',
                transform: store.notificationsEnabled ? 'translateX(20px)' : 'translateX(0)',
                boxShadow: store.notificationsEnabled ? '0 0 8px rgba(59,130,246,0.5)' : 'none',
              }}
            />
          </button>
        </div>
        {store.notificationsEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-white/[0.05]"
          >
            <div className="flex gap-2 mb-3">
              <input
                type="email"
                value={notifEmailInput}
                onChange={(e) => setNotifEmailInput(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 text-[12px] text-white placeholder-white/30 outline-none focus:border-[#3b82f6]/40"
              />
              <button
                onClick={() => store.setNotificationEmail(notifEmailInput || null)}
                className="btn-sm !text-[11px] !py-1"
              >
                Save
              </button>
            </div>
            <div className="flex gap-3">
              {([
                { type: 'breach_alert' as NotificationType, label: 'New Breaches' },
                { type: 'dark_web' as NotificationType, label: 'Dark Web' },
                { type: 'weekly_summary' as NotificationType, label: 'Weekly Summary' },
              ]).map(({ type, label }) => (
                <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={store.notificationTypes.includes(type)}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...store.notificationTypes, type]
                        : store.notificationTypes.filter(t => t !== type);
                      store.setNotificationTypes(types);
                    }}
                    className="accent-[#3b82f6] h-3 w-3"
                  />
                  <span className="text-[11px] text-white/50">{label}</span>
                </label>
              ))}
            </div>
          </motion.div>
        )}
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
            <span key={e.email} className="glass rounded-full px-4 py-1.5 text-[13px] font-medium text-white/50 flex items-center gap-2">
              {e.email}
              {e.breachCount > 0 && (
                <span className="text-[11px] font-semibold text-[#ef4444]">{e.breachCount}</span>
              )}
              <button
                onClick={() => { store.removeEmail(e.email); }}
                className="ml-1 h-4 w-4 rounded-full flex items-center justify-center text-white/45 hover:text-white/60 hover:bg-white/10 transition-all"
                title="Disconnect email"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
            const label = tab.charAt(0).toUpperCase() + tab.slice(1);
            const count =
              tab === 'breaches' ? unresolvedBreaches
              : tab === 'brokers' ? exposedBrokers
              : tab === 'accounts' ? store.discoveredAccounts.length
              : tab === 'subscriptions' ? store.trackedSubscriptions.length
              : null;
            return (
              <motion.button
                key={tab}
                onClick={() => { setActiveTab(tab); setFilter(null); setSearch(''); }}
                className={`relative flex-1 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-colors duration-300 ${
                  isActive
                    ? 'bg-white/[0.06] text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-white/[0.08]'
                    : 'text-white/50 hover:text-white/40 border border-transparent'
                }`}
                whileHover={!isActive ? { backgroundColor: 'rgba(255,255,255,0.03)' } : {}}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {label}
                {count !== null && count > 0 && (
                  <span className={`ml-1.5 tabular-nums ${isActive ? 'text-white/50' : 'text-white/40'}`}>
                    ({count})
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Search + Filters ─── */}
      {(() => {
        const filterChips: { key: string | null; label: string; count: number }[] =
          activeTab === 'breaches' ? [
            { key: null, label: 'All', count: store.breaches.length },
            { key: 'unresolved', label: 'Unresolved', count: unresolvedBreaches },
            { key: 'resolved', label: 'Resolved', count: store.breaches.length - unresolvedBreaches },
          ]
          : activeTab === 'brokers' ? [
            { key: null, label: 'All', count: store.dataBrokers.length },
            { key: 'found', label: 'Exposed', count: exposedBrokers },
            { key: 'removing', label: 'Removing', count: removingBrokers },
            { key: 'removed', label: 'Removed', count: removedBrokers },
          ]
          : activeTab === 'subscriptions' ? [
            { key: null, label: 'All', count: store.trackedSubscriptions.length },
            { key: 'active', label: 'Active', count: store.trackedSubscriptions.filter((s) => (s.status ?? (s.active ? 'active' : 'cancelled')) === 'active').length },
            { key: 'cancelled', label: 'Cancelled', count: store.trackedSubscriptions.filter((s) => s.status === 'cancelled' || s.status === 'likely_cancelled').length },
            { key: 'failed', label: 'Failed', count: store.trackedSubscriptions.filter((s) => s.status === 'failed').length },
          ]
          : activeTab === 'accounts' ? [
            { key: null, label: 'All', count: store.discoveredAccounts.length },
            ...[...new Set(store.discoveredAccounts.map((a) => a.category))].sort().map((cat) => ({
              key: cat, label: cat, count: store.discoveredAccounts.filter((a) => a.category === cat).length,
            })),
          ]
          : [];

        const visibleChips = filterChips.filter((f) => f.count > 0);
        const placeholders: Record<Tab, string> = {
          breaches: 'Search breaches by name or email...',
          brokers: 'Search data brokers...',
          accounts: 'Search accounts by name or domain...',
          subscriptions: 'Search subscriptions...',
        };

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6 space-y-3"
          >
            {/* Search bar */}
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/45 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholders[activeTab]}
                className="input !pl-11 !pr-10"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/45 hover:text-white/50 hover:bg-white/[0.06] transition-all"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter chips */}
            {visibleChips.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {visibleChips.map((f) => {
                  const isActive = filter === f.key;
                  return (
                    <motion.button
                      key={f.key ?? 'all'}
                      onClick={() => setFilter(isActive && f.key !== null ? null : f.key)}
                      className={`rounded-xl px-3.5 py-1.5 text-[11px] font-medium capitalize transition-colors duration-200 ${
                        isActive
                          ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shadow-[0_0_12px_rgba(124,106,239,0.1)]'
                          : 'bg-white/[0.02] text-white/50 border border-white/[0.04] hover:text-white/50 hover:bg-white/[0.04] hover:border-white/[0.08]'
                      }`}
                      whileHover={{ scale: 1.05, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      {f.label}
                      <span className={`ml-1.5 tabular-nums ${isActive ? 'text-[var(--accent)]/60' : 'text-white/40'}`}>
                        {f.count}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* ─── Breaches ─── */}
      {activeTab === 'breaches' && (
        <div className="space-y-3">
          {filteredBreaches.length === 0 && (
            <div className="py-16 text-center text-[15px] text-white/45">
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
                  whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.08)', y: -2 }}
                  transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 20 }}
                  className={`glass-card ${breach.resolved ? 'opacity-50' : ''}`}
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
                      <p className="mt-1 text-[12px] text-white/45">{breach.email} · {breach.date}</p>
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
                  <p className="mt-3 text-[14px] leading-relaxed text-white/50">{breach.description}</p>
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
                              <span className="text-[11px] font-medium text-white/50 tabular-nums">{completedSteps.length}/{steps.length}</span>
                            </div>

                            <p className="text-[12px] font-semibold uppercase tracking-wider text-white/50 mb-3">
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
                                          <span className={`text-[13px] font-medium ${done ? 'line-through text-white/50' : 'text-white/70'}`}>
                                            {step.label}
                                          </span>
                                          <span className={`text-[9px] font-semibold uppercase ${prioColors[step.priority]}`}>
                                            {step.priority}
                                          </span>
                                        </div>
                                        <p className="mt-0.5 text-[12px] text-white/45">{step.description}</p>
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
          {/* Summary stats + batch action — side by side */}
          <div className="glass-card mb-5 flex items-center justify-between">
            <div className="flex flex-wrap gap-8">
              {[
                { label: 'Exposed', count: exposedBrokers, color: '#ef4444' },
                { label: 'Removing', count: removingBrokers, color: '#f97316' },
                { label: 'Removed', count: removedBrokers, color: '#22c55e' },
              ].map((s) => (
                <div key={s.label}>
                  <span className="text-[1.25rem] font-bold tabular-nums" style={{ color: s.color }}>{s.count}</span>
                  <span className="ml-2 text-[13px] text-white/50">{s.label}</span>
                </div>
              ))}
            </div>
            {exposedBrokers > 0 && (
              <div className="flex items-center gap-3 ml-4">
                {batchRemovalProgress && (
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden" style={{ minWidth: 100 }}>
                      <motion.div
                        className="h-full rounded-full bg-[#22c55e]"
                        initial={{ width: 0 }}
                        animate={{ width: `${(batchRemovalProgress.current / batchRemovalProgress.total) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="text-[12px] tabular-nums text-white/50">
                      {batchRemovalProgress.current}/{batchRemovalProgress.total}
                    </span>
                  </div>
                )}
                <button
                  className="btn-sm !text-[12px] !bg-[#ef4444]/10 !text-[#ef4444] !border-[#ef4444]/20 hover:!bg-[#ef4444]/20 whitespace-nowrap"
                  onClick={handleRemoveAll}
                  disabled={batchRemovalProgress !== null}
                >
                  {batchRemovalProgress ? 'Processing...' : 'Remove All'}
                </button>
              </div>
            )}
          </div>

          {/* Actionable banner */}
          {exposedBrokers > 0 && (
            <div className="glass-card mb-5 flex items-start gap-3" style={{ borderColor: 'rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.03)' }}>
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ef4444]/10">
                <svg className="h-4 w-4 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-medium text-white/70">
                  {exposedBrokers} data broker{exposedBrokers === 1 ? '' : 's'} {exposedBrokers === 1 ? 'has' : 'have'} your personal information listed publicly.
                </p>
                <p className="mt-1 text-[12px] text-white/50">
                  For each broker below, you can send a removal request email or visit their opt-out page directly. Most brokers are required to remove your data within 30 days.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredBrokers.length === 0 && (
              <div className="col-span-full py-16 text-center text-[15px] text-white/45">
                No brokers match your search
              </div>
            )}
            {filteredBrokers.map((broker, i) => {
              const riskLevel = broker.dataTypes.length >= 5 ? 'High' : broker.dataTypes.length >= 3 ? 'Medium' : 'Low';
              const riskColor = riskLevel === 'High' ? '#ef4444' : riskLevel === 'Medium' ? '#f97316' : '#eab308';
              return (
              <motion.div
                key={broker.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.08)', y: -2 }}
                transition={{ delay: i * 0.02, type: 'spring', stiffness: 300, damping: 20 }}
                className={`glass-card ${broker.status === 'removed' ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-white">{broker.name}</h3>
                    {broker.status === 'found' && (
                      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}25` }}>
                        {riskLevel} risk
                      </span>
                    )}
                  </div>
                  <span className={`badge capitalize ${STATUS_STYLE[broker.status]}`}>{broker.status}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <p className="text-[12px] text-white/45">{broker.email}</p>
                  <span className="text-[11px] text-white/40">·</span>
                  <p className="text-[11px] text-white/50">{broker.dataTypes.length} data types exposed</p>
                </div>
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
                    {broker.optOutUrl ? (
                      <a
                        href={broker.optOutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-sm !text-[12px] !inline-flex items-center gap-1 !bg-[#22c55e]/10 !text-[#22c55e] !border-[#22c55e]/20"
                      >
                        Direct Opt-Out
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    ) : (
                      <button
                        className="btn-sm !text-[12px]"
                        onClick={() => handleBrokerRemoval(broker.id)}
                      >
                        Email Opt-Out →
                      </button>
                    )}
                  </div>
                )}
                {broker.status === 'removing' && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[12px] text-white/45">Opted out?</span>
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
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2">
                            Removal Request Email
                          </p>
                          <div className="rounded-lg bg-white/[0.02] p-3 text-[12px] text-white/40 leading-relaxed max-h-32 overflow-y-auto font-mono">
                            <div className="text-white/45 mb-1">Subject: {email.subject}</div>
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
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Accounts ─── */}
      {activeTab === 'accounts' && (
        <div>
          {!isExtensionInstalled() ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl glass">
                <svg className="h-7 w-7 text-white/45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z" />
                </svg>
              </div>
              <h3 className="text-[17px] font-semibold text-white">Install Chrome Extension</h3>
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-white/50">
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
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-white/50">
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
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-white/50">
                {extScanning
                  ? 'This may take a minute depending on inbox size.'
                  : `Connected as ${store.extensionEmail}. Run a scan to find your accounts.`}
              </p>
              {extError && <p className="mt-3 text-[13px] text-[#ef4444]">{extError}</p>}
              {!extScanning && (
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button className="btn-primary" onClick={handleExtensionScan}>Scan Inbox</button>
                  <button className="btn-sm !text-[12px] text-white/50" onClick={handleDisconnectGmail}>Disconnect</button>
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
                  <span className="text-[13px] text-white/50">Connected as </span>
                  <span className="text-[13px] font-medium text-white/60">{store.extensionEmail}</span>
                  <span className="ml-3 text-[13px] text-white/45">·</span>
                  <span className="ml-3 text-[13px] text-white/50">{store.discoveredAccounts.length} accounts found</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn-sm !text-[12px]" onClick={handleExtensionScan} disabled={extScanning}>
                    {extScanning ? 'Scanning...' : 'Rescan'}
                  </button>
                  <button className="btn-sm !text-[12px] text-white/50" onClick={handleDisconnectGmail}>Disconnect</button>
                </div>
              </div>

              {filteredAccounts.length === 0 ? (
                <div className="py-16 text-center text-[15px] text-white/45">No accounts match your search</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAccounts.map((account, i) => (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.08)', y: -3 }}
                      transition={{ delay: i * 0.02, type: 'spring', stiffness: 300, damping: 20 }}
                      className="glass-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-[13px] font-bold text-white/40">
                          {account.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[14px] font-semibold text-white truncate">{account.name}</h4>
                          <p className="text-[11px] text-white/45 truncate">{account.domain}</p>
                        </div>
                        <span className="badge bg-white/[0.03] text-white/40 capitalize text-[10px]">{account.category}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-white/45">
                        <span>Since {new Date(account.firstSeen).toLocaleDateString()}</span>
                        <div className="flex gap-1.5">
                          <button
                            className="btn-sm !py-1 !px-2.5 !text-[10px]"
                            onClick={() => window.open(`https://${account.domain}/account`, '_blank', 'noopener,noreferrer')}
                          >
                            Manage
                          </button>
                          <button
                            className="btn-sm !py-1 !px-2.5 !text-[10px] !bg-[#ef4444]/[0.08] !text-[#ef4444]/60 !border-[#ef4444]/10"
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
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2">
                                  GDPR/CCPA Deletion Request
                                </p>
                                <div className="rounded-lg bg-white/[0.02] p-2 text-[11px] text-white/55 leading-relaxed max-h-24 overflow-y-auto font-mono">
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
                <svg className="h-7 w-7 text-white/45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-7v4h4l-5 7z" />
                </svg>
              </div>
              <h3 className="text-[17px] font-semibold text-white">Install Chrome Extension</h3>
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-white/50">
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
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-white/50">
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
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-white/50">
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
                          <span className="text-[14px] font-normal text-white/50">/mo</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-[13px]">
                          <span className="text-[#22c55e]">{activeSubs.length} active</span>
                          {cancelledCount > 0 && <span className="text-white/50">{cancelledCount} cancelled</span>}
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
                  <div className="py-16 text-center text-[15px] text-white/45">No subscriptions match your filters</div>
                )}
                {filteredSubscriptions.map((sub, i) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.08)', y: -2 }}
                      transition={{ delay: i * 0.02, type: 'spring', stiffness: 300, damping: 20 }}
                      className={`glass-card ${!sub.active ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-[13px] font-bold text-white/40">
                            {sub.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-[14px] font-semibold text-white">{sub.name}</h4>
                            <p className="text-[11px] text-white/45">{sub.domain}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[15px] font-semibold text-white tabular-nums">
                            {sub.currency === 'EUR' ? '€' : sub.currency === 'GBP' ? '£' : '$'}
                            {sub.amount.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-white/45">
                            {sub.frequency === 'monthly' ? '/mo' : sub.frequency === 'yearly' ? '/yr' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-white/45">
                        <span>{sub.chargeCount ?? sub.emailCount} charge{(sub.chargeCount ?? sub.emailCount) !== 1 ? 's' : ''} found</span>
                        <div className="flex items-center gap-2">
                          <span>Last {new Date(sub.lastCharged).toLocaleDateString()}</span>
                          {(() => {
                            const status = sub.status ?? (sub.active ? 'active' : 'cancelled');
                            if (status === 'active') return <span className="badge bg-[#22c55e]/10 text-[#22c55e]">Active</span>;
                            if (status === 'cancelled') return <span className="badge bg-[#ef4444]/10 text-[#ef4444]">Cancelled</span>;
                            if (status === 'failed') return <span className="badge bg-[#f97316]/10 text-[#f97316]">Payment Failed</span>;
                            if (status === 'likely_cancelled') return <span className="badge bg-[#eab308]/10 text-[#eab308]">Likely Cancelled</span>;
                            return <span className="badge bg-white/[0.04] text-white/45">Unknown</span>;
                          })()}
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="mt-3 flex gap-2 border-t border-white/[0.04] pt-3">
                        <button
                          className="flex-1 rounded-xl py-2 px-3 text-[11px] font-medium text-white/50 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70 hover:border-white/[0.1] transition-all duration-200 flex items-center justify-center gap-1.5"
                          onClick={() => window.open(`https://${sub.domain}`, '_blank', 'noopener,noreferrer')}
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                          Visit Site
                        </button>
                        {(sub.status ?? (sub.active ? 'active' : 'cancelled')) === 'active' && (
                          <button
                            className={`flex-1 rounded-xl py-2 px-3 text-[11px] font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
                              expandedSub === sub.id
                                ? 'bg-white/[0.06] text-white/50 border border-white/[0.08]'
                                : 'bg-[#ef4444]/[0.06] text-[#ef4444]/70 border border-[#ef4444]/[0.12] hover:bg-[#ef4444]/[0.1] hover:text-[#ef4444] hover:border-[#ef4444]/20'
                            }`}
                            onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                          >
                            {expandedSub === sub.id ? 'Close' : (
                              <>
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                Cancel
                              </>
                            )}
                          </button>
                        )}
                        {sub.status === 'failed' && (
                          <button
                            className="flex-1 rounded-xl py-2 px-3 text-[11px] font-medium bg-[#f97316]/[0.06] text-[#f97316]/70 border border-[#f97316]/[0.12] hover:bg-[#f97316]/[0.1] hover:text-[#f97316] hover:border-[#f97316]/20 transition-all duration-200 flex items-center justify-center gap-1.5"
                            onClick={() => window.open(`https://${sub.domain}/account/billing`, '_blank', 'noopener,noreferrer')}
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
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
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2">
                                  Cancellation Options
                                </p>
                                <div className="space-y-2">
                                  <button
                                    className="btn-sm !text-[11px] w-full justify-between"
                                    onClick={() => window.open(`https://${sub.domain}/account`, '_blank', 'noopener,noreferrer')}
                                  >
                                    <span>Go to account settings</span>
                                    <span className="text-white/45">→</span>
                                  </button>
                                  <button
                                    className="btn-sm !text-[11px] w-full justify-between"
                                    onClick={() => window.open(`https://www.google.com/search?q=how+to+cancel+${encodeURIComponent(sub.name)}+subscription`, '_blank', 'noopener,noreferrer')}
                                  >
                                    <span>Step-by-step cancellation guide</span>
                                    <span className="text-white/45">→</span>
                                  </button>
                                </div>
                                <div className="mt-3 rounded-lg bg-white/[0.02] p-3 text-[11px] text-white/55 leading-relaxed max-h-24 overflow-y-auto font-mono">
                                  <div className="text-white/45 mb-1">Subject: {email.subject}</div>
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

      </motion.div>
      )}
      </AnimatePresence>

      {/* ─── Dark Web HUD — Full-Screen Sci-Fi Overlay ─── */}
      <AnimatePresence>
        {hudActive && (
          <motion.div
            key="hud-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`hud-overlay hud-crt ${hudClosing ? 'hud-flicker-out' : 'hud-flicker-in'}`}
          >
            {/* ── Ambient layers ── */}
            <motion.div className="hud-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }} />
            <motion.div className="hud-noise" initial={{ opacity: 0 }} animate={{ opacity: 0.03 }} transition={{ delay: 0.2, duration: 0.6 }} />
            <div className="hud-vignette" />
            <motion.div className="hud-scanline" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 1.8, duration: 0.15 }} />

            {/* ── Extra ambient: floating grid lines ── */}
            <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }}>
              {/* Horizontal scan lines at various heights */}
              {[15, 35, 65, 85].map((top) => (
                <div key={top} className="absolute left-0 right-0 h-px" style={{ top: `${top}%`, background: 'linear-gradient(90deg, transparent 0%, rgba(0,140,255,0.03) 20%, rgba(0,140,255,0.06) 50%, rgba(0,140,255,0.03) 80%, transparent 100%)' }} />
              ))}
              {/* Vertical accent lines */}
              {[20, 50, 80].map((left) => (
                <div key={left} className="absolute top-0 bottom-0 w-px" style={{ left: `${left}%`, background: 'linear-gradient(180deg, transparent 0%, rgba(0,140,255,0.02) 30%, rgba(0,140,255,0.04) 50%, rgba(0,140,255,0.02) 70%, transparent 100%)' }} />
              ))}
            </div>

            {/* ── Animated connector lines overlay ── */}
            <svg className="fixed inset-0 w-full h-full pointer-events-none hud-connector" style={{ zIndex: 5 }} viewBox="0 0 1920 1080" preserveAspectRatio="none">
              {/* Left panel → Center connectors */}
              <line x1="320" y1="200" x2="480" y2="180" stroke="rgba(0,140,255,0.2)" strokeWidth="0.5" strokeDasharray="6 4" style={{ animation: 'hud-connector-dash 2s linear infinite' }} />
              <line x1="320" y1="380" x2="480" y2="350" stroke="rgba(0,140,255,0.15)" strokeWidth="0.5" strokeDasharray="6 4" style={{ animation: 'hud-connector-dash 2.5s linear infinite' }} />
              {/* Center → Right panel connectors */}
              <line x1="1440" y1="200" x2="1600" y2="180" stroke="rgba(0,140,255,0.2)" strokeWidth="0.5" strokeDasharray="6 4" style={{ animation: 'hud-connector-dash 1.8s linear infinite' }} />
              <line x1="1440" y1="380" x2="1600" y2="400" stroke="rgba(0,140,255,0.15)" strokeWidth="0.5" strokeDasharray="6 4" style={{ animation: 'hud-connector-dash 2.2s linear infinite' }} />
              {/* Top horizontal connector */}
              <line x1="200" y1="95" x2="1720" y2="95" stroke="rgba(0,140,255,0.06)" strokeWidth="0.5" strokeDasharray="2 6" />
              {/* Angled decorative lines */}
              <path d="M100 100 L150 100 L170 120" stroke="rgba(0,140,255,0.15)" strokeWidth="0.5" fill="none" strokeDasharray="4 4" style={{ animation: 'hud-connector-dash 3s linear infinite' }} />
              <path d="M1820 100 L1770 100 L1750 120" stroke="rgba(0,140,255,0.15)" strokeWidth="0.5" fill="none" strokeDasharray="4 4" style={{ animation: 'hud-connector-dash 3s linear infinite' }} />
              {/* Bottom decorative frame lines */}
              <path d="M100 980 L150 980 L170 960" stroke="rgba(0,140,255,0.1)" strokeWidth="0.5" fill="none" />
              <path d="M1820 980 L1770 980 L1750 960" stroke="rgba(0,140,255,0.1)" strokeWidth="0.5" fill="none" />
              {/* Traveling light dots on connectors */}
              <circle r="2" fill="#008cff" opacity="0.6" style={{ filter: 'drop-shadow(0 0 4px rgba(0,140,255,0.8))' }}>
                <animateMotion dur="3s" repeatCount="indefinite" path="M320 200 L480 180" />
              </circle>
              <circle r="2" fill="#00ddff" opacity="0.5" style={{ filter: 'drop-shadow(0 0 4px rgba(0,221,255,0.8))' }}>
                <animateMotion dur="2.5s" repeatCount="indefinite" path="M1440 200 L1600 180" />
              </circle>
              <circle r="1.5" fill="#008cff" opacity="0.4" style={{ filter: 'drop-shadow(0 0 3px rgba(0,140,255,0.6))' }}>
                <animateMotion dur="4s" repeatCount="indefinite" path="M200 95 L1720 95" />
              </circle>
            </svg>

            {/* ── Content ── */}
            <div className="hud-glitch-in relative mx-auto max-w-7xl px-6 py-6" style={{ zIndex: 10 }}>

              {/* ── Top bar ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="hud-flicker flex items-center justify-between mb-4"
                style={{ animationDelay: '0.3s' }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="rgba(0,140,255,0.5)" strokeWidth="1.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span className="hud-text-resolve text-[13px] font-semibold tracking-[0.2em] text-[#008cff]" style={{ animationDelay: '0.4s' }}>
                      VANISH DARK WEB SCANNER
                    </span>
                  </div>
                  <span className="h-3 w-px bg-[#008cff]/20" />
                  <span className="text-[12px] tracking-[0.15em] text-[#008cff]/85">
                    {store.darkWebLastChecked ? `Last scan ${new Date(store.darkWebLastChecked).toLocaleDateString()}` : 'No previous scan'}
                  </span>
                  <span className="h-3 w-px bg-[#008cff]/20" />
                  <span className="text-[12px] tracking-[0.1em] text-[#00ddff]/75">PROTOCOL v3.7.1</span>
                </div>
                <div className="flex items-center gap-5">
                  <span className="text-[10px] tracking-[0.15em] text-[#ffaa00]/70 tabular-nums">
                    {new Date().toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                  <span className="hud-blink flex items-center gap-2 text-[11px] tracking-[0.15em] text-[#008cff]/75">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#008cff]/70" style={{ boxShadow: '0 0 8px rgba(0,140,255,0.5)' }} />
                    UPLINK ACTIVE
                  </span>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    onClick={handleHudClose}
                    disabled={hudClosing}
                    className="group flex items-center gap-2 px-4 py-2 text-[11px] font-medium tracking-[0.15em] border border-white/[0.08] text-white/55 hover:bg-white/[0.06] hover:text-white/60 hover:border-white/[0.15] transition-all disabled:opacity-30"
                  >
                    <svg className="h-3 w-3 text-white/45 group-hover:text-white/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    CLOSE
                  </motion.button>
                </div>
              </motion.div>

              {/* ── Divider with trace light ── */}
              <div className="relative mb-5">
                <div className="h-px bg-[#008cff]/[0.15]" />
                <div className="hud-trace-light" style={{ top: '-0.5px' }} />
              </div>

              {/* ═══ MAIN 3-COLUMN LAYOUT ═══ */}
              {(() => {
                const activeAlerts = store.darkWebAlerts.filter((a) => !a.resolved);
                const credCount = store.darkWebAlerts.filter((a) => a.type === 'credentials').length;
                const piCount = store.darkWebAlerts.filter((a) => a.type === 'personal_info').length;
                const finCount = store.darkWebAlerts.filter((a) => a.type === 'financial').length;
                const medCount = store.darkWebAlerts.filter((a) => a.type === 'medical').length;
                const totalAlerts = store.darkWebAlerts.length;
                const maxType = Math.max(credCount, piCount, finCount, medCount, 1);
                return (
              <div className="grid grid-cols-[280px_1fr_280px] gap-5">

                {/* ── LEFT PANEL: Data Streams ── */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="space-y-4"
                >
                  {/* Breach data stream — shows alert sources */}
                  <div className="hud-panel hud-panel-bottom hud-flicker overflow-hidden" style={{ height: '180px', animationDelay: '0.5s' }}>
                    <div className="text-[11px] tracking-[0.15em] text-[#008cff] mb-2 uppercase font-semibold">Breach Feed</div>
                    <div className="overflow-hidden" style={{ height: '140px' }}>
                      <div className="hud-data-stream">
                        {store.darkWebAlerts.length > 0
                          ? store.darkWebAlerts.concat(store.darkWebAlerts).map((alert, i) => (
                              <div key={i} className="text-[11px] leading-[1.7] tabular-nums truncate" style={{
                                color: alert.severity === 'critical' ? '#ff3366bb' : alert.severity === 'high' ? '#ffaa0099' : '#008cff80',
                              }}>
                                [{alert.severity.toUpperCase().slice(0, 4)}] {alert.source}
                              </div>
                            ))
                          : Array.from({ length: 20 }, (_, i) => (
                              <div key={i} className="text-[11px] leading-[1.7] tabular-nums text-[#008cff]/60">
                                [IDLE] Awaiting scan data...
                              </div>
                            ))}
                      </div>
                    </div>
                  </div>

                  {/* Threat level bars — real alert type counts */}
                  <div className="hud-panel hud-panel-bottom hud-flicker" style={{ animationDelay: '0.7s' }}>
                    <div className="text-[11px] tracking-[0.15em] text-[#008cff] mb-3 uppercase font-semibold">Exposure by Type</div>
                    {[
                      { label: 'CREDENTIALS', value: credCount, color: '#ff3366' },
                      { label: 'PERSONAL INFO', value: piCount, color: '#ffaa00' },
                      { label: 'FINANCIAL', value: finCount, color: '#00ddff' },
                      { label: 'MEDICAL', value: medCount, color: '#008cff' },
                    ].map((bar) => {
                      const pct = totalAlerts > 0 ? Math.round((bar.value / maxType) * 100) : 0;
                      return (
                        <div key={bar.label} className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] tracking-[0.1em]" style={{ color: `${bar.color}bb` }}>{bar.label}</span>
                            <span className="text-[11px] tabular-nums font-semibold" style={{ color: `${bar.color}ee` }}>{bar.value}</span>
                          </div>
                          <div className="h-[4px] w-full bg-white/[0.04] overflow-hidden rounded-sm">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 1.2, duration: 1, ease: [0, 0, 0.2, 1] }}
                              style={{ background: `linear-gradient(90deg, ${bar.color}50, ${bar.color}aa)`, boxShadow: `0 0 10px ${bar.color}40` }}
                              className="h-full rounded-sm"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Monitored accounts */}
                  <div className="hud-panel hud-panel-bottom hud-flicker" style={{ animationDelay: '0.9s' }}>
                    <div className="text-[11px] tracking-[0.15em] text-[#008cff] mb-2 uppercase font-semibold">Monitored Accounts</div>
                    {store.connectedEmails.map((email, ni) => {
                      const emailAlerts = store.darkWebAlerts.filter((a) => a.email === email.email);
                      const hasCritical = emailAlerts.some((a) => a.severity === 'critical' && !a.resolved);
                      return (
                        <div key={email.email} className="flex items-center gap-2.5 py-1.5">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: hasCritical ? '#ff3366' : emailAlerts.length > 0 ? '#ffaa00' : '#008cff',
                              boxShadow: `0 0 6px ${hasCritical ? '#ff336660' : emailAlerts.length > 0 ? '#ffaa0050' : '#008cff50'}`,
                              animation: `hud-sev-pulse 2s ease-in-out infinite ${ni * 0.5}s`,
                              color: hasCritical ? '#ff3366' : '#008cff',
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] tracking-wide text-white/50 block truncate">{email.email}</span>
                            <span className="text-[9px] text-white/50">{emailAlerts.length} exposure{emailAlerts.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      );
                    })}
                    {store.connectedEmails.length === 0 && (
                      <div className="text-[10px] text-white/50 py-2">No accounts connected</div>
                    )}
                  </div>
                </motion.div>

                {/* ── CENTER: Main Visualization ── */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.6, ease: [0, 0, 0.2, 1] }}
                  className="space-y-5"
                >
                  {/* ── Rotating Rings Visualization ── */}
                  <div className="relative flex items-center justify-center" style={{ height: '320px' }}>
                    {/* SVG Rings */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 320" fill="none">
                      {/* Outer ring - slow clockwise */}
                      <g style={{ transformOrigin: '200px 160px', animation: 'hud-ring-spin 30s linear infinite' }}>
                        <circle cx="200" cy="160" r="148" stroke="#008cff35" strokeWidth="1" strokeDasharray="4 8" />
                        {Array.from({ length: 36 }, (_, i) => {
                          const angle = (i * 10 * Math.PI) / 180;
                          const x1 = 200 + 143 * Math.cos(angle);
                          const y1 = 160 + 143 * Math.sin(angle);
                          const x2 = 200 + 148 * Math.cos(angle);
                          const y2 = 160 + 148 * Math.sin(angle);
                          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 9 === 0 ? '#008cff60' : '#008cff50'} strokeWidth={i % 9 === 0 ? 2 : 1} />;
                        })}
                      </g>

                      {/* Middle ring - counter-clockwise */}
                      <g style={{ transformOrigin: '200px 160px', animation: 'hud-ring-spin-reverse 20s linear infinite' }}>
                        <circle cx="200" cy="160" r="120" stroke="#00ddff35" strokeWidth="0.5" strokeDasharray="12 6" />
                        {Array.from({ length: 24 }, (_, i) => {
                          const angle = (i * 15 * Math.PI) / 180;
                          const x = 200 + 120 * Math.cos(angle);
                          const y = 160 + 120 * Math.sin(angle);
                          return <circle key={i} cx={x} cy={y} r={i % 6 === 0 ? 2.5 : 1} fill={i % 6 === 0 ? '#00ddff70' : '#00ddff70'} />;
                        })}
                      </g>

                      {/* Inner ring - clockwise fast */}
                      <g style={{ transformOrigin: '200px 160px', animation: 'hud-ring-spin 12s linear infinite' }}>
                        <circle cx="200" cy="160" r="90" stroke="#00ddff35" strokeWidth="0.5" strokeDasharray="8 4 2 4" />
                        {Array.from({ length: 12 }, (_, i) => {
                          const angle = (i * 30 * Math.PI) / 180;
                          const x = 200 + 90 * Math.cos(angle);
                          const y = 160 + 90 * Math.sin(angle);
                          return <rect key={i} x={x - 1.5} y={y - 1.5} width="3" height="3" fill="#00ddff55" transform={`rotate(${i * 30} ${x} ${y})`} />;
                        })}
                      </g>

                      {/* Radar sweep */}
                      <g style={{ transformOrigin: '200px 160px', animation: 'hud-radar-sweep 4s linear infinite' }}>
                        <defs>
                          <linearGradient id="radarGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#008cff00" />
                            <stop offset="100%" stopColor="#008cff80" />
                          </linearGradient>
                        </defs>
                        <path d="M200 160 L200 12 A148 148 0 0 1 304 52 Z" fill="url(#radarGrad)" opacity="0.5" />
                        <line x1="200" y1="160" x2="304" y2="52" stroke="#008cff60" strokeWidth="0.5" />
                      </g>

                      {/* Cross-hair lines */}
                      <line x1="200" y1="20" x2="200" y2="55" stroke="#008cff50" strokeWidth="0.5" />
                      <line x1="200" y1="265" x2="200" y2="300" stroke="#008cff50" strokeWidth="0.5" />
                      <line x1="60" y1="160" x2="95" y2="160" stroke="#008cff50" strokeWidth="0.5" />
                      <line x1="305" y1="160" x2="340" y2="160" stroke="#008cff50" strokeWidth="0.5" />

                      {/* Globe/sphere wireframe */}
                      <ellipse cx="200" cy="160" rx="60" ry="60" stroke="#008cff12" strokeWidth="0.5" fill="none" />
                      <ellipse cx="200" cy="160" rx="60" ry="30" stroke="#008cff12" strokeWidth="0.5" fill="none" />
                      <ellipse cx="200" cy="160" rx="60" ry="15" stroke="#008cff0a" strokeWidth="0.5" fill="none" />
                      <ellipse cx="200" cy="160" rx="30" ry="60" stroke="#008cff12" strokeWidth="0.5" fill="none" />

                      {/* Blip dots on globe */}
                      {[
                        { x: 175, y: 145, c: '#ff3366' },
                        { x: 220, y: 170, c: '#ffaa00' },
                        { x: 195, y: 180, c: '#00ddff' },
                        { x: 210, y: 140, c: '#ff3366' },
                        { x: 185, y: 155, c: '#008cff' },
                      ].map((dot, i) => (
                        <g key={i}>
                          <circle cx={dot.x} cy={dot.y} r="2.5" fill={dot.c} opacity="0.7">
                            <animate attributeName="opacity" values="0.7;1;0.7" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                          </circle>
                          <circle cx={dot.x} cy={dot.y} r="6" fill="none" stroke={dot.c} strokeWidth="0.5" opacity="0.3">
                            <animate attributeName="r" values="3;10;3" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.4;0;0.4" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                          </circle>
                        </g>
                      ))}

                      {/* Corner brackets on SVG */}
                      <path d="M30 30 L30 10 L50 10" stroke="#008cff50" strokeWidth="1" fill="none" />
                      <path d="M370 30 L370 10 L350 10" stroke="#008cff50" strokeWidth="1" fill="none" />
                      <path d="M30 290 L30 310 L50 310" stroke="#008cff50" strokeWidth="1" fill="none" />
                      <path d="M370 290 L370 310 L350 310" stroke="#008cff50" strokeWidth="1" fill="none" />
                    </svg>

                    {/* Center content overlay */}
                    <div className="relative z-10 text-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                      >
                        <div className="text-[13px] tracking-[0.2em] text-[#008cff] mb-2 font-semibold">EXPOSURES DETECTED</div>
                        <div
                          className="text-[4rem] font-bold tabular-nums leading-none"
                          style={{
                            color: activeAlerts.length > 0 ? '#ff3366' : '#008cff',
                            textShadow: activeAlerts.length > 0
                              ? '0 0 30px rgba(255,51,102,0.5), 0 0 60px rgba(255,51,102,0.2)'
                              : '0 0 30px rgba(0,140,255,0.5), 0 0 60px rgba(0,140,255,0.2)',
                          }}
                        >
                          <CountUp target={activeAlerts.length} delay={800} />
                        </div>
                        <div className="text-[13px] tracking-[0.15em] text-white/65 mt-2 font-medium">ACTIVE THREATS</div>
                      </motion.div>
                    </div>
                  </div>

                  {/* ── Stats row under visualization ── */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="grid grid-cols-4 gap-3"
                  >
                    {[
                      { label: 'Critical', value: store.darkWebAlerts.filter((a) => a.severity === 'critical' && !a.resolved).length, color: '#ff3366' },
                      { label: 'High', value: store.darkWebAlerts.filter((a) => a.severity === 'high' && !a.resolved).length, color: '#ffaa00' },
                      { label: 'Medium', value: store.darkWebAlerts.filter((a) => a.severity === 'medium' && !a.resolved).length, color: '#00ddff' },
                      { label: 'Resolved', value: store.darkWebAlerts.filter((a) => a.resolved).length, color: '#008cff' },
                    ].map((stat, si) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.3 + si * 0.08 }}
                        className="hud-flicker relative text-center py-3 border border-white/[0.05] bg-white/[0.012]"
                        style={{ animationDelay: `${1.2 + si * 0.1}s` }}
                      >
                        <div className="absolute top-0 left-1/4 right-1/4 h-px" style={{ background: `linear-gradient(90deg, transparent, ${stat.color}50, transparent)` }} />
                        <div className="text-[1.4rem] font-bold tabular-nums leading-none" style={{ color: stat.color, textShadow: `0 0 15px ${stat.color}40` }}>
                          <CountUp target={stat.value} delay={1300 + si * 80} />
                        </div>
                        <div className="text-[10px] tracking-[0.15em] mt-1.5 font-semibold" style={{ color: `${stat.color}aa` }}>
                          {stat.label.toUpperCase()}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* ── Email targets + Scan ── */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="hud-panel hud-panel-bottom hud-idle"
                    style={{ animationDelay: '1.2s' }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] tracking-[0.15em] text-[#008cff]/75 uppercase font-semibold">Targets:</span>
                        {store.connectedEmails.map((e) => (
                          <span key={e.email} className="flex items-center gap-1.5 text-[11px] text-white/40 tracking-wide">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#008cff]/60" style={{ boxShadow: '0 0 6px rgba(0,140,255,0.4)' }} />
                            {e.email}
                          </span>
                        ))}
                      </div>
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        className="hud-btn shrink-0 px-7 py-3 text-[11px] font-semibold tracking-[0.15em] border transition-all disabled:opacity-30"
                        style={{
                          borderColor: store.darkWebScanning ? 'rgba(255,170,0,0.3)' : 'rgba(0,140,255,0.3)',
                          color: store.darkWebScanning ? '#ffaa00' : '#008cff',
                          background: store.darkWebScanning ? 'rgba(255,170,0,0.06)' : 'rgba(0,140,255,0.06)',
                          textShadow: store.darkWebScanning ? '0 0 12px rgba(255,170,0,0.4)' : '0 0 12px rgba(0,140,255,0.4)',
                        }}
                        onClick={handleDarkWebScan}
                        disabled={store.darkWebScanning}
                      >
                        {store.darkWebScanning ? '◉ SCANNING...' : '▶ INITIATE SCAN'}
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* ── Scanning progress / status message ── */}
                  <AnimatePresence>
                    {darkWebProgress && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="hud-panel hud-panel-bottom relative overflow-hidden hud-hscan">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="h-[2px] w-full bg-[#008cff]/[0.15] overflow-hidden relative">
                                <motion.div
                                  className="h-full bg-[#008cff]/70"
                                  animate={{ x: ['-100%', '200%'] }}
                                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                                  style={{ width: '30%', boxShadow: '0 0 16px rgba(0,140,255,0.6)' }}
                                />
                              </div>
                            </div>
                            <span className="text-[11px] text-[#008cff]/80 tracking-wider font-semibold shrink-0">{darkWebProgress}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* ── RIGHT PANEL: Metrics & Circular Progress ── */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="space-y-4"
                >
                  {/* Severity breakdown — circular progress from real data */}
                  <div className="hud-panel hud-panel-bottom hud-flicker" style={{ animationDelay: '0.6s' }}>
                    <div className="text-[11px] tracking-[0.15em] text-[#008cff] mb-3 uppercase font-semibold">Severity Breakdown</div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'CRITICAL', value: store.darkWebAlerts.filter((a) => a.severity === 'critical').length, max: totalAlerts, color: '#ff3366' },
                        { label: 'HIGH', value: store.darkWebAlerts.filter((a) => a.severity === 'high').length, max: totalAlerts, color: '#ffaa00' },
                        { label: 'MEDIUM', value: store.darkWebAlerts.filter((a) => a.severity === 'medium').length, max: totalAlerts, color: '#00ddff' },
                        { label: 'LOW', value: store.darkWebAlerts.filter((a) => a.severity === 'low').length, max: totalAlerts, color: '#008cff' },
                      ].map((item) => {
                        const pct = item.max > 0 ? Math.round((item.value / item.max) * 100) : 0;
                        const circumference = 2 * Math.PI * 18;
                        const offset = circumference - (pct / 100) * circumference;
                        return (
                          <div key={item.label} className="flex flex-col items-center py-1">
                            <svg width="52" height="52" viewBox="0 0 52 52">
                              <circle cx="26" cy="26" r="18" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
                              <motion.circle
                                cx="26" cy="26" r="18" fill="none"
                                stroke={item.color}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset: offset }}
                                transition={{ delay: 1.4, duration: 1.2, ease: [0, 0, 0.2, 1] }}
                                transform="rotate(-90 26 26)"
                                style={{ filter: `drop-shadow(0 0 6px ${item.color}50)` }}
                              />
                              <text x="26" y="28" textAnchor="middle" fill={item.color} fontSize="12" fontFamily="monospace" fontWeight="bold" opacity="0.85">{item.value}</text>
                            </svg>
                            <span className="text-[9px] tracking-[0.15em] mt-0.5 font-semibold" style={{ color: `${item.color}90` }}>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scan timeline — recent alert dates */}
                  <div className="hud-panel hud-panel-bottom hud-flicker overflow-hidden" style={{ animationDelay: '0.8s' }}>
                    <div className="text-[11px] tracking-[0.15em] text-[#00ddff] mb-2 uppercase font-semibold">Recent Activity</div>
                    {store.darkWebAlerts.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="flex items-center gap-2 py-1.5 border-b border-white/3 last:border-0">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{
                          backgroundColor: alert.severity === 'critical' ? '#ff3366' : alert.severity === 'high' ? '#ffaa00' : '#00ddff',
                          boxShadow: `0 0 4px ${alert.severity === 'critical' ? '#ff336650' : '#00ddff40'}`,
                        }} />
                        <span className="text-[11px] text-white/55 truncate flex-1">{alert.source}</span>
                        <span className="text-[10px] text-white/50 tabular-nums shrink-0">{formatDate(alert.date)}</span>
                      </div>
                    ))}
                    {store.darkWebAlerts.length === 0 && (
                      <div className="text-[10px] text-white/50 py-2">No activity yet</div>
                    )}
                  </div>

                  {/* Signal strength — derived from alert severity distribution */}
                  <div className="hud-panel hud-panel-bottom hud-flicker" style={{ animationDelay: '1.0s' }}>
                    <div className="text-[11px] tracking-[0.15em] text-[#008cff] mb-2 uppercase font-semibold">Threat Intensity</div>
                    <div className="flex items-end gap-[3px] h-10">
                      {Array.from({ length: 16 }, (_, i) => {
                        const intensity = totalAlerts > 0
                          ? Math.abs(Math.sin((i * 0.6) + activeAlerts.length)) * 60 + activeAlerts.length * 5
                          : Math.abs(Math.sin((i * 0.5) + 1)) * 30 + 5;
                        const clamped = Math.min(intensity, 100);
                        return (
                          <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(clamped, 8)}%` }}
                            transition={{ delay: 1.5 + i * 0.04, duration: 0.4 }}
                            className="flex-1 rounded-t-sm"
                            style={{
                              background: `linear-gradient(to top, ${clamped > 70 ? '#ff336650' : clamped > 40 ? '#ffaa0040' : '#008cff35'}, transparent)`,
                              borderTop: `2px solid ${clamped > 70 ? '#ff3366aa' : clamped > 40 ? '#ffaa0080' : '#008cff70'}`,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Scan summary */}
                  <div className="hud-panel hud-panel-bottom hud-flicker" style={{ animationDelay: '1.2s' }}>
                    <div className="text-[11px] tracking-[0.15em] text-[#008cff] mb-2 uppercase font-semibold">Scan Summary</div>
                    {[
                      { label: 'ACCOUNTS', value: String(store.connectedEmails.length), color: '#008cff' },
                      { label: 'TOTAL ALERTS', value: String(totalAlerts), color: '#00ddff' },
                      { label: 'UNRESOLVED', value: String(activeAlerts.length), color: activeAlerts.length > 0 ? '#ff3366' : '#008cff' },
                      { label: 'RESOLVED', value: String(store.darkWebAlerts.filter((a) => a.resolved).length), color: '#008cff' },
                    ].map((m) => (
                      <div key={m.label} className="flex items-center justify-between py-1.5">
                        <span className="text-[11px] tracking-[0.1em]" style={{ color: `${m.color}90` }}>{m.label}</span>
                        <span className="text-[12px] tabular-nums font-bold" style={{ color: `${m.color}cc`, textShadow: `0 0 8px ${m.color}40` }}>{m.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
                );
              })()}

              {/* ═══ LOWER SECTION: Filter + Alerts ═══ */}

              {/* ── Filter chips ── */}
              {store.darkWebAlerts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="mt-6 mb-4 flex flex-wrap gap-2"
                >
                  {[
                    { key: null, label: 'All', count: store.darkWebAlerts.length },
                    { key: 'unresolved', label: 'Active', count: store.darkWebAlerts.filter((a) => !a.resolved).length },
                    { key: 'credentials', label: 'Credentials', count: store.darkWebAlerts.filter((a) => a.type === 'credentials').length },
                    { key: 'personal_info', label: 'Personal Info', count: store.darkWebAlerts.filter((a) => a.type === 'personal_info').length },
                    { key: 'financial', label: 'Financial', count: store.darkWebAlerts.filter((a) => a.type === 'financial').length },
                  ].filter((f) => f.count > 0).map((f, fi) => (
                    <motion.button
                      key={f.key ?? 'all'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.6 + fi * 0.04 }}
                      onClick={() => setHudFilter(hudFilter === f.key ? null : f.key)}
                      className="px-4 py-2 text-[11px] font-semibold tracking-[0.1em] transition-all duration-200"
                      style={{
                        border: `1px solid ${hudFilter === f.key ? 'rgba(0,140,255,0.45)' : 'rgba(255,255,255,0.06)'}`,
                        color: hudFilter === f.key ? '#008cff' : 'rgba(255,255,255,0.40)',
                        background: hudFilter === f.key ? 'rgba(0,140,255,0.08)' : 'rgba(255,255,255,0.02)',
                        textShadow: hudFilter === f.key ? '0 0 10px rgba(0,140,255,0.3)' : 'none',
                      }}
                    >{f.label} ({f.count})</motion.button>
                  ))}
                </motion.div>
              )}

              {/* ── Empty state ── */}
              {store.darkWebAlerts.length === 0 && !store.darkWebScanning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                  className="py-10 text-center"
                >
                  <div className="space-y-4">
                    <svg className="mx-auto" width="80" height="80" viewBox="0 0 80 80" fill="none">
                      <circle cx="40" cy="40" r="35" stroke="rgba(0,140,255,0.2)" strokeWidth="0.5" strokeDasharray="4 4" />
                      <circle cx="40" cy="40" r="25" stroke="rgba(0,140,255,0.15)" strokeWidth="0.5" />
                      <path d="M40 55s10-5 10-12.5V30l-10-3.75L30 30v12.5c0 7.5 10 12.5 10 12.5z" stroke="rgba(0,140,255,0.3)" strokeWidth="1" fill="none" />
                      <path d="M36 40l3 3 5-5" stroke="rgba(0,140,255,0.5)" strokeWidth="1.5" fill="none" />
                    </svg>
                    <div className="text-[14px] tracking-[0.1em] text-white/55 font-medium">
                      {store.darkWebLastChecked
                        ? 'No exposures detected'
                        : 'Initiate scan to check dark web exposures'}
                    </div>
                    <div className="text-[12px] text-white/45 tracking-wide">
                      {store.darkWebLastChecked
                        ? 'Your accounts appear clean across monitored databases'
                        : 'Scanning breach databases, paste sites, and dark web forums'}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Alert list ── */}
              <div className="space-y-3">
                {store.darkWebAlerts
                  .filter((alert) => {
                    if (hudFilter === 'unresolved') return !alert.resolved;
                    if (hudFilter === 'credentials' || hudFilter === 'personal_info' || hudFilter === 'financial' || hudFilter === 'medical') return alert.type === hudFilter;
                    return true;
                  })
                  .map((alert, i) => {
                    const hudSev: Record<string, { color: string; label: string }> = {
                      critical: { color: '#ff3366', label: 'CRITICAL' },
                      high: { color: '#ffaa00', label: 'HIGH' },
                      medium: { color: '#00ddff', label: 'MEDIUM' },
                      low: { color: '#008cff', label: 'LOW' },
                    };
                    const sv = hudSev[alert.severity] || hudSev.low;
                    const typeLabels: Record<string, string> = {
                      credentials: 'Credentials', personal_info: 'Personal Info', financial: 'Financial', medical: 'Medical',
                    };
                    return (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: alert.resolved ? 0.35 : 1, x: 0 }}
                        transition={{ delay: 1.7 + i * 0.06, duration: 0.3, ease: [0, 0, 0.2, 1] }}
                        className="hud-panel hud-panel-bottom hud-idle group"
                        style={{ animationDelay: `${2 + i * 0.1}s` }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span
                                className="inline-block h-2 w-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor: sv.color,
                                  boxShadow: `0 0 8px ${sv.color}40`,
                                  animation: alert.resolved ? 'none' : `hud-sev-pulse 2s ease-in-out infinite ${i * 0.3}s`,
                                  color: sv.color,
                                }}
                              />
                              <h3 className="text-[14px] font-semibold text-white/85 tracking-wide">{alert.source}</h3>
                              <span
                                className="px-2.5 py-0.5 text-[10px] font-bold tracking-[0.1em] border rounded-sm"
                                style={{ color: sv.color, borderColor: `${sv.color}40`, background: `${sv.color}12` }}
                              >
                                {sv.label}
                              </span>
                              <span className="px-2.5 py-0.5 text-[10px] font-medium tracking-[0.05em] border border-white/[0.08] text-white/55 bg-white/[0.02] rounded-sm">
                                {typeLabels[alert.type] || alert.type}
                              </span>
                              {alert.resolved && (
                                <span className="px-2.5 py-0.5 text-[10px] font-medium tracking-[0.05em] border border-[#008cff]/25 text-[#008cff]/75 bg-[#008cff]/[0.05] rounded-sm">
                                  Resolved
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/50">
                              <span>{alert.email}</span>
                              <span className="text-white/[0.1]">|</span>
                              <span>{formatDate(alert.date)}</span>
                            </div>
                            <p className="mt-2.5 text-[12px] leading-[1.6] text-white/40">{alert.description}</p>
                          </div>
                          {!alert.resolved && (
                            <button
                              className="hud-btn shrink-0 px-5 py-2.5 text-[11px] font-semibold tracking-[0.1em] border border-white/[0.08] text-white/40 hover:bg-[#008cff]/[0.15] hover:text-[#008cff]/80 hover:border-[#008cff]/30 transition-all"
                              onClick={() => store.markDarkWebAlertResolved(alert.id)}
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
              </div>

              {/* ── Bottom status bar ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="mt-8 mb-4"
              >
                <div className="relative">
                  <div className="h-px bg-[#008cff]/[0.12]" />
                  <div className="hud-trace-light" style={{ top: '-0.5px' }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] tracking-[0.15em] text-white/[0.35]">
                  <div className="flex items-center gap-4">
                    <span>VANISH DARKWEB PROTOCOL v3.7.1</span>
                    <span className="text-white/[0.2]">|</span>
                    <span>ENC: AES-256-GCM</span>
                    <span className="text-white/[0.2]">|</span>
                    <span>{store.connectedEmails.length} ACCOUNT{store.connectedEmails.length !== 1 ? 'S' : ''} MONITORED</span>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="hud-blink inline-block h-1.5 w-1.5 rounded-full bg-[#008cff]/40" style={{ boxShadow: '0 0 5px rgba(0,140,255,0.3)' }} />
                    SECURE UPLINK ESTABLISHED
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modals ─── */}
      <PasswordChecker open={passwordCheckerOpen} onClose={() => setPasswordCheckerOpen(false)} />
      <ScoreHistory
        open={scoreHistoryOpen}
        onClose={() => setScoreHistoryOpen(false)}
        history={store.scoreHistory}
        breakdown={store.scoreBreakdown}
        resolvedBreaches={store.breaches.filter(b => b.resolved).length}
        removedBrokers={store.dataBrokers.filter(b => b.status === 'removed').length}
      />
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
