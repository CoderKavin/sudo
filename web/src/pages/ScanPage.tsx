import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
    breaches: 0,
    brokers: 0,
    privacyScore: 0,
  });

  const addEmail = useCallback(() => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (localEmails.some((e) => e.email === email)) return;

    const provider = email.includes('gmail') ? 'gmail'
      : email.includes('outlook') || email.includes('hotmail') ? 'outlook'
      : 'yahoo';

    const entry: ConnectedEmail = {
      email,
      provider: provider as ConnectedEmail['provider'],
      connected: true,
      lastScanned: null,
      breachCount: 0,
    };
    setLocalEmails((prev) => [...prev, entry]);
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

    setSummaryStats({
      breaches: allBreaches.length,
      brokers: allBrokers.length,
      privacyScore: lastScore,
    });

    setStep('complete');
  }, [localEmails, store]);

  const scoreColor = summaryStats.privacyScore > 70 ? '#34c759'
    : summaryStats.privacyScore > 40 ? '#ff9500'
    : '#ff3b30';

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-20">
      <div className="w-full max-w-[520px]">

        {/* Step 1: Connect */}
        {step === 'connect' && (
          <div>
            <button
              onClick={() => navigate('/')}
              className="mb-8 text-[14px] font-medium text-black/30 transition-colors hover:text-black/60"
            >
              ← Back
            </button>

            <h1 className="text-[2rem] font-bold tracking-tight text-[#1d1d1f]">Connect your email</h1>
            <p className="mt-2 text-[15px] text-black/40">
              Add one or more email accounts to scan your full digital footprint.
            </p>

            <div className="apple-card mt-8">
              <div className="flex gap-3">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                  placeholder="you@gmail.com"
                  className="apple-input flex-1"
                />
                <button className="apple-btn-sm" onClick={addEmail}>Add</button>
              </div>

              {localEmails.length > 0 && (
                <div className="mt-5">
                  <p className="section-label mb-3">Connected ({localEmails.length})</p>
                  <div className="space-y-2">
                    {localEmails.map((e) => (
                      <div
                        key={e.email}
                        className="flex items-center justify-between rounded-xl bg-black/[0.02] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[14px] font-medium text-[#1d1d1f]">{e.email}</span>
                          <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-medium text-black/40">
                            {e.provider}
                          </span>
                        </div>
                        <button
                          onClick={() => removeEmail(e.email)}
                          className="text-[13px] font-medium text-black/25 transition-colors hover:text-[#ff3b30]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={startScan}
                disabled={localEmails.length === 0}
                className="apple-btn-primary mt-6 w-full disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {localEmails.length === 0
                  ? 'Add an email to start'
                  : `Scan ${localEmails.length} account${localEmails.length > 1 ? 's' : ''}`}
              </button>

              <p className="mt-4 text-center text-[12px] text-black/25">
                All scanning happens in your browser. We never see your emails.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Scanning */}
        {step === 'scanning' && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.03]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/10 border-t-[#1d1d1f]" />
            </div>
            <h1 className="text-[2rem] font-bold tracking-tight text-[#1d1d1f]">Scanning...</h1>
            <p className="mt-2 text-[15px] text-black/40">
              Analyzing <span className="font-medium text-[#1d1d1f]">{currentScanEmail}</span>
            </p>

            <div className="mt-10">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="h-full rounded-full bg-[#1d1d1f] transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <div className="mt-3 flex justify-between text-[13px] text-black/30">
                <span>{scanStage}</span>
                <span className="tabular-nums font-medium">{scanProgress}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && (
          <div>
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#34c759]/10">
                <svg className="h-7 w-7 text-[#34c759]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-[2rem] font-bold tracking-tight text-[#1d1d1f]">Scan Complete</h1>
              <p className="mt-2 text-[15px] text-black/40">
                Here's what we found across {localEmails.length} account{localEmails.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="apple-card mt-8">
              <div className="grid grid-cols-2 gap-6 text-center">
                <div>
                  <div className="text-[2rem] font-bold tracking-tight text-[#ff3b30]">{summaryStats.breaches}</div>
                  <div className="text-[13px] text-black/40">Data Breaches</div>
                </div>
                <div>
                  <div className="text-[2rem] font-bold tracking-tight text-[#ff9500]">{summaryStats.brokers}</div>
                  <div className="text-[13px] text-black/40">Data Brokers</div>
                </div>
              </div>

              {summaryStats.breaches === 0 && (
                <div className="mt-5 rounded-xl bg-[#34c759]/8 p-4 text-center">
                  <span className="text-[14px] font-medium text-[#34c759]">No known breaches found</span>
                </div>
              )}

              <div className="mt-6 text-center">
                <p className="section-label mb-1">Privacy Score</p>
                <div className="text-[3rem] font-bold tracking-tight" style={{ color: scoreColor }}>
                  {summaryStats.privacyScore}
                  <span className="text-[1rem] font-medium text-black/20">/100</span>
                </div>
              </div>

              <button
                className="apple-btn-primary mt-6 w-full"
                onClick={() => navigate('/dashboard')}
              >
                View Full Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
