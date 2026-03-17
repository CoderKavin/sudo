import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { checkPasswordExposure, type PasswordCheckResult } from '../lib/passwordCheck';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PasswordChecker({ open, onClose }: Props) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<PasswordCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = useCallback(async () => {
    if (!password.trim()) return;
    setChecking(true);
    setResult(null);
    setError(null);
    try {
      const res = await checkPasswordExposure(password);
      setResult(res);
    } catch {
      setError('Could not reach the breach database. Try again.');
    } finally {
      setChecking(false);
    }
  }, [password]);

  const handleClose = () => {
    setPassword('');
    setResult(null);
    setError(null);
    setShowPassword(false);
    onClose();
  };

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return `${n}`;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md glass-card !p-6"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[15px] font-semibold text-white">Password Checker</h3>
                <p className="text-[11px] text-white/40 mt-0.5">Check if your password has been exposed in data breaches</p>
              </div>
              <button onClick={handleClose} className="text-white/40 hover:text-white/70 transition-colors text-lg leading-none">&times;</button>
            </div>

            {/* Input */}
            <div className="relative mb-3">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setResult(null); setError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                placeholder="Enter a password to check..."
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 pr-20 text-[14px] text-white placeholder-white/30 outline-none focus:border-[#7c6aef]/40 transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-2 py-1 text-[11px] text-white/40 hover:text-white/60 transition-colors"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="flex items-start gap-2 mb-4 px-1">
              <svg className="h-3.5 w-3.5 text-[#22c55e] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-[10px] text-white/35 leading-relaxed">
                Your password never leaves your device. Only the first 5 characters of its SHA-1 hash are sent using k-anonymity. <span className="text-white/45">Powered by Have I Been Pwned.</span>
              </p>
            </div>

            {/* Check button */}
            <motion.button
              onClick={handleCheck}
              disabled={!password.trim() || checking}
              className="w-full rounded-xl py-3 text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(124,106,239,0.3), rgba(168,140,255,0.2))',
                border: '1px solid rgba(124,106,239,0.3)',
                color: '#d4c4ff',
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {checking ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                  Checking...
                </span>
              ) : 'Check Password'}
            </motion.button>

            {/* Results */}
            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  key={result.exposed ? 'exposed' : 'safe'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-4 rounded-xl p-4"
                  style={{
                    background: result.exposed ? 'rgba(255,51,102,0.06)' : 'rgba(34,197,94,0.06)',
                    border: `1px solid ${result.exposed ? 'rgba(255,51,102,0.15)' : 'rgba(34,197,94,0.15)'}`,
                  }}
                >
                  {result.exposed ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="h-5 w-5 text-[#ff3366]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-[14px] font-semibold text-[#ff3366]">Password Compromised</span>
                      </div>
                      <p className="text-[12px] text-white/60 leading-relaxed">
                        This password has appeared in <span className="font-bold text-[#ff3366]">{formatCount(result.count)}</span> data breaches.
                        If you're using this password anywhere, change it immediately and use a unique password for each account.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <div className="flex-1 rounded-lg bg-[#ff3366]/10 py-2 text-center">
                          <div className="text-[18px] font-bold text-[#ff3366] tabular-nums">{formatCount(result.count)}</div>
                          <div className="text-[10px] text-white/40">Times Seen</div>
                        </div>
                        <div className="flex-1 rounded-lg bg-[#ff3366]/10 py-2 text-center">
                          <div className="text-[18px] font-bold text-[#ff3366]">
                            {result.count > 100000 ? 'Critical' : result.count > 1000 ? 'High' : 'Medium'}
                          </div>
                          <div className="text-[10px] text-white/40">Risk Level</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="h-5 w-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="text-[14px] font-semibold text-[#22c55e]">Password Not Found</span>
                      </div>
                      <p className="text-[12px] text-white/60">
                        This password hasn't appeared in any known data breaches. Keep it strong and unique.
                      </p>
                    </>
                  )}
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 rounded-xl p-3 bg-[#ffaa00]/[0.06] border border-[#ffaa00]/15"
                >
                  <p className="text-[12px] text-[#ffaa00]">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
