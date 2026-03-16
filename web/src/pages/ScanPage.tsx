import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState('');
  const [summaryStats, setSummaryStats] = useState({
    breaches: 0, brokers: 0, privacyScore: 0,
  });

  const addEmail = useCallback(() => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (localEmails.some((e) => e.email === email)) return;
    const provider = email.includes('gmail') ? 'gmail'
      : email.includes('outlook') || email.includes('hotmail') ? 'outlook' : 'yahoo';
    setLocalEmails((prev) => [...prev, {
      email, provider: provider as ConnectedEmail['provider'],
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
    store.updatePrivacyScore(lastScore);
    store.setScanComplete();
    setSummaryStats({ breaches: allBreaches.length, brokers: allBrokers.length, privacyScore: lastScore });
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
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                onClick={() => navigate('/')}
                className="mb-8 text-[14px] text-white/25 transition-colors hover:text-white/50"
              >
                ← Back
              </button>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[2rem] font-bold tracking-tight text-white"
              >
                Connect your email
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="mt-2 text-[15px] text-white/35"
              >
                Add one or more accounts to scan your full digital footprint.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
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
                  <button className="btn-sm" onClick={addEmail}>Add</button>
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
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[14px] font-medium text-white/80">{e.email}</span>
                              <span className="tag">{e.provider}</span>
                            </div>
                            <button
                              onClick={() => removeEmail(e.email)}
                              className="text-[13px] text-white/15 transition-colors hover:text-[#ef4444]"
                            >
                              Remove
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={startScan}
                  disabled={localEmails.length === 0}
                  className="btn-primary mt-6 w-full disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  {localEmails.length === 0
                    ? 'Add an email to start'
                    : `Scan ${localEmails.length} account${localEmails.length > 1 ? 's' : ''}`}
                </button>

                <p className="mt-4 text-center text-[12px] text-white/15">
                  <svg className="inline h-3 w-3 mr-1 text-[#22c55e]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  100% browser-side. We literally can't see your data.
                </p>
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
              {/* Pulsing scanner icon */}
              <div className="relative mx-auto mb-8 flex h-20 w-20 items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full bg-[var(--accent)]/10"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-2 rounded-full bg-[var(--accent)]/10"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full glass-strong">
                  <motion.div
                    className="h-5 w-5 rounded-full border-2 border-white/10 border-t-[var(--accent)]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              </div>

              <h1 className="text-[2rem] font-bold tracking-tight text-white">Scanning...</h1>
              <p className="mt-2 text-[15px] text-white/35">
                Analyzing <span className="font-medium text-white/60">{currentScanEmail}</span>
              </p>

              <div className="mt-10">
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      width: `${scanProgress}%`,
                      background: 'linear-gradient(90deg, var(--accent), #a78bfa)',
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="mt-3 flex justify-between text-[13px]">
                  <span className="text-white/25">{scanStage}</span>
                  <span className="tabular-nums font-medium text-white/40">{scanProgress}%</span>
                </div>
              </div>
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
                <p className="mt-2 text-[15px] text-white/35">
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
                      <div className="text-[13px] text-white/30">{stat.label}</div>
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
                    <span className="text-[1rem] font-medium text-white/15">/100</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <button
                    className="btn-primary mt-8 w-full"
                    onClick={() => navigate('/dashboard')}
                  >
                    View Full Report
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
