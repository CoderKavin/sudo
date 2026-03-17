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
    store.updatePrivacyScore(lastScore);
    store.addScoreSnapshot({
      date: new Date().toISOString(),
      score: lastScore,
      breachCount: allBreaches.length,
      brokerCount: allBrokers.length,
    });
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

                <motion.p
                  className="mt-4 text-center text-[12px] text-white/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                >
                  <svg className="inline h-3 w-3 mr-1 text-[#22c55e]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  100% browser-side. We literally can't see your data.
                </motion.p>
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
              {/* Radar scanner */}
              <div className="relative mx-auto mb-10 h-44 w-44">
                {/* Concentric rings */}
                {[1, 0.75, 0.5, 0.25].map((scale, i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-[var(--accent)]"
                    style={{
                      transform: `scale(${scale})`,
                      opacity: 0.08 + i * 0.03,
                    }}
                  />
                ))}

                {/* Rotating sweep */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <div
                    className="absolute top-1/2 left-1/2 h-1/2 w-1/2 origin-top-left"
                    style={{
                      background: 'conic-gradient(from 0deg, transparent 0deg, rgba(124,106,239,0.25) 40deg, transparent 80deg)',
                      borderRadius: '0 0 100% 0',
                    }}
                  />
                </motion.div>

                {/* Pulse rings */}
                <motion.div
                  className="absolute inset-0 rounded-full border border-[var(--accent)]"
                  animate={{ scale: [0.3, 1.1], opacity: [0.4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border border-[var(--accent)]"
                  animate={{ scale: [0.3, 1.1], opacity: [0.4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 1 }}
                />

                {/* Simulated blips */}
                {scanProgress > 20 && (
                  <motion.div
                    className="absolute h-2 w-2 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                    style={{ top: '28%', left: '62%' }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
                    transition={{ duration: 0.4 }}
                  />
                )}
                {scanProgress > 45 && (
                  <motion.div
                    className="absolute h-2 w-2 rounded-full bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.6)]"
                    style={{ top: '55%', left: '35%' }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
                    transition={{ duration: 0.4 }}
                  />
                )}
                {scanProgress > 65 && (
                  <motion.div
                    className="absolute h-2 w-2 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                    style={{ top: '40%', left: '25%' }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
                    transition={{ duration: 0.4 }}
                  />
                )}
                {scanProgress > 80 && (
                  <motion.div
                    className="absolute h-1.5 w-1.5 rounded-full bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.6)]"
                    style={{ top: '68%', left: '60%' }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
                    transition={{ duration: 0.4 }}
                  />
                )}

                {/* Center dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-[var(--accent)] shadow-[0_0_12px_rgba(124,106,239,0.5)]" />
                </div>
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
                        {'prefix' in stat && stat.prefix}{stat.value}
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
