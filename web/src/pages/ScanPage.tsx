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

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-20">
      <div className="w-full max-w-lg">
        {step === 'connect' && (
          <button
            onClick={() => navigate('/')}
            className="mb-6 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
        )}

        {/* Step 1: Connect emails */}
        {step === 'connect' && (
          <div>
            <h1 className="text-2xl font-bold">Connect your email</h1>
            <p className="mt-2 text-sm text-gray-600">
              Add one or more email accounts to scan your full digital footprint.
            </p>

            <div className="mt-6 rounded border border-gray-200 p-6">
              <div className="flex gap-3">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                  placeholder="you@gmail.com"
                  className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                />
                <button
                  onClick={addEmail}
                  className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  + Add
                </button>
              </div>

              {localEmails.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-medium uppercase text-gray-500">
                    Connected ({localEmails.length})
                  </div>
                  {localEmails.map((e) => (
                    <div
                      key={e.email}
                      className="flex items-center justify-between rounded border border-gray-200 px-4 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{e.email}</span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                          {e.provider}
                        </span>
                      </div>
                      <button
                        onClick={() => removeEmail(e.email)}
                        className="text-sm text-gray-400 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={startScan}
                disabled={localEmails.length === 0}
                className="mt-6 w-full rounded bg-black px-4 py-3 text-sm text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {localEmails.length === 0
                  ? 'Add an email to start'
                  : `Scan ${localEmails.length} account${localEmails.length > 1 ? 's' : ''}`}
              </button>

              <p className="mt-3 text-center text-xs text-gray-400">
                All scanning happens in your browser. We never see your emails.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Scanning */}
        {step === 'scanning' && (
          <div className="text-center">
            <h1 className="text-2xl font-bold">Scanning...</h1>
            <p className="mt-2 text-sm text-gray-600">
              Analyzing <span className="font-medium">{currentScanEmail}</span>
            </p>

            <div className="mt-8">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-black transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-sm text-gray-500">
                <span>{scanStage}</span>
                <span>{scanProgress}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && (
          <div>
            <div className="text-center">
              <h1 className="text-2xl font-bold">Scan Complete</h1>
              <p className="mt-2 text-sm text-gray-600">
                Here's what we found across {localEmails.length} account{localEmails.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="mt-6 rounded border border-gray-200 p-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-red-600 tabular-nums">{summaryStats.breaches}</div>
                  <div className="mt-1 text-sm text-gray-600">Data Breaches</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-600 tabular-nums">{summaryStats.brokers}</div>
                  <div className="mt-1 text-sm text-gray-600">Data Brokers</div>
                </div>
              </div>

              {summaryStats.breaches === 0 && (
                <div className="mt-4 rounded bg-green-50 p-3 text-center text-sm text-green-700">
                  No known breaches found for this email
                </div>
              )}

              <div className="mt-6 text-center">
                <div className="text-xs font-medium uppercase text-gray-500">Privacy Score</div>
                <div
                  className="mt-1 text-4xl font-bold tabular-nums"
                  style={{
                    color: summaryStats.privacyScore > 70 ? '#16a34a'
                      : summaryStats.privacyScore > 40 ? '#ca8a04'
                      : '#dc2626',
                  }}
                >
                  {summaryStats.privacyScore}
                  <span className="text-lg text-gray-400">/100</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="mt-6 w-full rounded bg-black px-4 py-3 text-sm text-white hover:bg-gray-800"
              >
                View Full Report →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
