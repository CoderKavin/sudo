import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';
import { simulateScan, calculateScoreBreakdown } from '../lib/scanner';
import type { ConnectedEmail } from '../store/useStore';

type Step = 'connect' | 'scanning' | 'complete';

export default function ScanPage() {
  const navigate = useNavigate();
  const store = useStore();

  const [step, setStep] = useState<Step>('connect');
  const [emailInput, setEmailInput] = useState('');
  const [localEmails, setLocalEmails] = useState<ConnectedEmail[]>([]);
  const [currentScanEmail, setCurrentScanEmail] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState('');
  const [summaryStats, setSummaryStats] = useState({
    breaches: 0, brokers: 0, privacyScore: 0,
  });

  const addEmail = useCallback(() => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (localEmails.some((e) => e.email === email)) return;
    const domain = email.split('@')[1] || '';
    const provider: ConnectedEmail['provider'] =
      domain.includes('gmail') || domain.includes('googlemail') ? 'gmail'
      : domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live.') || domain.includes('msn.') ? 'outlook'
      : domain.includes('yahoo') || domain.includes('ymail') || domain.includes('rocketmail') ? 'yahoo'
      : 'other';
    setLocalEmails((prev) => [...prev, {
      email, provider,
      connected: true, lastScanned: null, breachCount: 0,
    }]);
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
      setScanProgress(0);
      setScanStage('Connecting...');
      const results = await simulateScan(emailEntry.email, (p, stage) => {
        setScanProgress(p);
        setScanStage(stage);
      });
      allBreaches = [...allBreaches, ...results.breaches];
      allBrokers = [...allBrokers, ...results.dataBrokers];
      lastScore = results.privacyScore;
      emailEntry.breachCount = results.breaches.length;
      emailEntry.lastScanned = new Date().toISOString();
      store.addEmail(emailEntry);
    }
    store.setBreaches(allBreaches);
    store.setDataBrokers(allBrokers);
    const finalBreakdown = calculateScoreBreakdown(allBreaches, allBrokers);
    store.addScoreSnapshot({
      date: new Date().toISOString(),
      score: finalBreakdown.total,
      breachCount: allBreaches.length,
      brokerCount: allBrokers.length,
    });
    store.setScanComplete();
    setSummaryStats({ breaches: allBreaches.length, brokers: allBrokers.length, privacyScore: finalBreakdown.total });
    setStep('complete');
  }, [localEmails, store]);

  const scoreColor = summaryStats.privacyScore > 70 ? '#22c55e'
    : summaryStats.privacyScore > 40 ? '#f97316' : '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen items-center justify-center px-6 py-20"
    >
      <div className="w-full max-w-[520px]">
        <AnimatePresence mode="wait">

          {/* ─── Connect ─── */}
          {step === 'connect' && (
            <motion.div
              key="connect"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.button
                onClick={() => navigate('/')}
                className="mb-8 text-[14px] text-white/50 transition-colors hover:text-white/50"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                ← Back
              </motion.button>

              <motion.h1
                initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="text-[2rem] font-bold tracking-tight text-white"
              >
                Connect your email
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="mt-2 text-[15px] text-white/55"
              >
                Add one or more accounts to scan your full digital footprint.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card mt-8"
              >
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                    placeholder="you@gmail.com"
                    className="input flex-1"
                  />
                  <motion.button
                    className="btn-sm"
                    onClick={addEmail}
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.12)' }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >Add</motion.button>
                </div>

                <AnimatePresence>
                  {localEmails.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-5 overflow-hidden"
                    >
                      <p className="section-label mb-3">Connected ({localEmails.length})</p>
                      <div className="space-y-2">
                        {localEmails.map((e, i) => (
                          <motion.div
                            key={e.email}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', x: 4 }}
                            transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                            className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3 cursor-default"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[14px] font-medium text-white/80">{e.email}</span>
                              <span className="tag">{e.provider === 'other' ? e.email.split('@')[1] : e.provider}</span>
                            </div>
                            <motion.button
                              onClick={() => removeEmail(e.email)}
                              className="text-[13px] text-white/40"
                              whileHover={{ color: 'rgba(239,68,68,0.8)', scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Remove
                            </motion.button>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={startScan}
                  disabled={localEmails.length === 0}
                  className="btn-primary mt-6 w-full disabled:opacity-20 disabled:cursor-not-allowed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={localEmails.length > 0 ? { scale: 1.02, y: -2 } : {}}
                  whileTap={localEmails.length > 0 ? { scale: 0.98 } : {}}
                >
                  {localEmails.length === 0
                    ? 'Add an email to start'
                    : `Scan ${localEmails.length} account${localEmails.length > 1 ? 's' : ''}`}
                </motion.button>

                <motion.div
                  className="mt-5 rounded-xl border border-[#22c55e]/10 bg-[#22c55e]/[0.03] px-4 py-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-4 w-4 text-[#22c55e]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <span className="text-[12px] font-semibold text-[#22c55e]/70">Your data stays on your device</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 ml-6">
                    {[
                      'No inbox access',
                      'No server storage',
                      'No tracking or cookies',
                    ].map((item) => (
                      <span key={item} className="flex items-center gap-1.5 text-[11px] text-white/30">
                        <span className="h-1 w-1 rounded-full bg-[#22c55e]/40" />
                        {item}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {/* ─── Scanning ─── */}
          {step === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              {/* Progress ring */}
              <div className="relative mx-auto mb-10 h-32 w-32">
                {/* Background ring */}
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <motion.circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke="url(#progressGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 42}
                    strokeDashoffset={2 * Math.PI * 42 * (1 - scanProgress / 100)}
                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="var(--accent)" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Center percentage */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[1.5rem] font-bold tabular-nums text-white/80">{scanProgress}%</span>
                </div>
                {/* Subtle glow pulse */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ boxShadow: '0 0 30px rgba(124,106,239,0.15)' }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              <h1 className="text-[2rem] font-bold tracking-tight text-white">Scanning...</h1>
              <p className="mt-2 text-[15px] text-white/55">
                Analyzing <span className="font-medium text-white/70">{currentScanEmail}</span>
              </p>

              {/* Scan stages checklist */}
              <div className="mt-8 flex flex-col items-start gap-2 mx-auto w-fit">
                {[
                  { label: 'Checking breach databases', threshold: 10 },
                  { label: 'Cross-referencing dark web', threshold: 35 },
                  { label: 'Scanning data brokers', threshold: 60 },
                  { label: 'Calculating privacy score', threshold: 85 },
                ].map((stage, i) => {
                  const active = scanProgress >= stage.threshold;
                  const done = i < 3 ? scanProgress >= [35, 60, 85, 100][i] : scanProgress >= 98;
                  return (
                    <motion.div
                      key={stage.label}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: active ? 1 : 0.3, x: 0 }}
                      transition={{ delay: 0.1 * i, duration: 0.3 }}
                    >
                      {done ? (
                        <svg className="h-4 w-4 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : active ? (
                        <motion.div
                          className="h-4 w-4 rounded-full border-2 border-white/20 border-t-[var(--accent)]"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-white/10" />
                      )}
                      <span className={`text-[13px] ${done ? 'text-white/60' : active ? 'text-white/80' : 'text-white/30'}`}>
                        {stage.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="mt-8">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full relative"
                    style={{
                      width: `${scanProgress}%`,
                      background: 'linear-gradient(90deg, var(--accent), #a78bfa, var(--accent))',
                      backgroundSize: '200% 100%',
                    }}
                    animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
                <div className="mt-3 flex justify-between text-[13px]">
                  <span className="text-white/40">{scanStage}</span>
                  <span className="tabular-nums font-semibold text-[var(--accent)]">{scanProgress}%</span>
                </div>
              </div>

              {/* Trust signal during scan */}
              <motion.div
                className="mt-6 flex items-center justify-center gap-4 text-[11px] text-white/25"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="h-3 w-3 text-[#22c55e]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Encrypted in browser
                </span>
                <span className="text-white/10">|</span>
                <span className="flex items-center gap-1.5">
                  <svg className="h-3 w-3 text-[#22c55e]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  No data leaves your device
                </span>
                <span className="text-white/10">|</span>
                <span className="flex items-center gap-1.5">
                  <svg className="h-3 w-3 text-[#22c55e]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                  Zero tracking
                </span>
              </motion.div>
            </motion.div>
          )}

          {/* ─── Complete ─── */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                  className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20"
                >
                  <svg className="h-8 w-8 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <h1 className="text-[2rem] font-bold tracking-tight text-white">Scan Complete</h1>
                <p className="mt-2 text-[15px] text-white/55">
                  Here's what we found across {localEmails.length} account{localEmails.length > 1 ? 's' : ''}
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card mt-8"
              >
                <div className="grid grid-cols-2 gap-6 text-center">
                  {[
                    { label: 'Data Breaches', value: summaryStats.breaches, color: '#ef4444' },
                    { label: 'Data Brokers', value: summaryStats.brokers, color: '#f97316' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      <div className="text-[2.5rem] font-bold tracking-tight tabular-nums" style={{ color: stat.color }}>
                        {stat.value}
                      </div>
                      <div className="text-[13px] text-white/50">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {summaryStats.breaches === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 rounded-xl bg-[#22c55e]/[0.06] border border-[#22c55e]/10 p-4 text-center"
                  >
                    <span className="text-[14px] font-medium text-[#22c55e]">No known breaches found</span>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 text-center"
                >
                  <p className="section-label mb-1">Privacy Score</p>
                  <div className="text-[3.5rem] font-bold tracking-tight tabular-nums" style={{ color: scoreColor }}>
                    {summaryStats.privacyScore}
                    <span className="text-[1rem] font-medium text-white/40">/100</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <motion.button
                    className="btn-primary mt-8 w-full"
                    onClick={() => navigate('/dashboard')}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    View Full Report
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
