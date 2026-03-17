import { motion, AnimatePresence } from 'framer-motion';
import type { ScoreSnapshot } from '../store/useStore';

interface ScoreBreakdown {
  total: number;
  breachPenalty: number;
  brokerPenalty: number;
  resolvedBonus: number;
  removedBrokerBonus: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  history: ScoreSnapshot[];
  breakdown: ScoreBreakdown;
  resolvedBreaches: number;
  removedBrokers: number;
}

export default function ScoreHistory({ open, onClose, history, breakdown, resolvedBreaches, removedBrokers }: Props) {
  const hasHistory = history.length > 1;
  const oldest = hasHistory ? history[0] : null;
  const latest = hasHistory ? history[history.length - 1] : null;
  const scoreDelta = oldest && latest ? latest.score - oldest.score : 0;

  const scoreColor = (s: number) => s > 70 ? '#22c55e' : s > 40 ? '#f97316' : '#ef4444';
  const color = scoreColor(breakdown.total);

  // Circular gauge
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const progress = breakdown.total / 100;
  const strokeDash = circumference * progress;
  const strokeGap = circumference - strokeDash;

  // Chart
  const chartW = 440;
  const chartH = 100;
  const padX = 30;
  const padY = 10;

  const points = history.map((snap, i) => ({
    x: padX + (i / Math.max(history.length - 1, 1)) * (chartW - padX * 2),
    y: padY + (1 - snap.score / 100) * (chartH - padY * 2),
    score: snap.score,
    date: snap.date,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1]?.x ?? 0} ${chartH} L ${points[0]?.x ?? 0} ${chartH} Z`;

  // Breakdown items
  const items: { label: string; value: number; color: string; icon: string; positive?: boolean }[] = [
    { label: 'Base Score', value: 100, color: '#7c6aef', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
  ];
  if (breakdown.breachPenalty > 0) items.push({ label: 'Breach Penalties', value: -breakdown.breachPenalty, color: '#ef4444', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' });
  if (breakdown.brokerPenalty > 0) items.push({ label: 'Broker Exposures', value: -breakdown.brokerPenalty, color: '#f97316', icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z' });
  if (breakdown.resolvedBonus > 0) items.push({ label: 'Resolved Breaches', value: breakdown.resolvedBonus, color: '#22c55e', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z', positive: true });
  if (breakdown.removedBrokerBonus > 0) items.push({ label: 'Removed Brokers', value: breakdown.removedBrokerBonus, color: '#22c55e', icon: 'M6 18L18 6M6 6l12 12', positive: true });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

          <motion.div
            className="relative w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(165deg, rgba(28,28,38,0.97), rgba(14,14,20,0.99))',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
            }}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <h3 className="text-[15px] font-semibold text-white/90">Score Breakdown</h3>
              <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.1] transition-all text-sm leading-none cursor-pointer">&times;</button>
            </div>

            {/* Score Ring */}
            <div className="flex flex-col items-center pt-6 pb-5">
              <div className="relative">
                <svg width="148" height="148" viewBox="0 0 148 148">
                  {/* Track */}
                  <circle cx="74" cy="74" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                  {/* Progress */}
                  <motion.circle
                    cx="74" cy="74" r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${strokeDash} ${strokeGap}`}
                    strokeDashoffset={circumference * 0.25}
                    initial={{ strokeDasharray: `0 ${circumference}` }}
                    animate={{ strokeDasharray: `${strokeDash} ${strokeGap}` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[36px] font-bold tabular-nums leading-none" style={{ color }}>{breakdown.total}</span>
                  <span className="text-[11px] text-white/30 mt-1">/100</span>
                </div>
              </div>
              {scoreDelta !== 0 && (
                <motion.div
                  className={`mt-3 text-[12px] font-medium px-3 py-1 rounded-full ${scoreDelta > 0 ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-[#ef4444]/10 text-[#ef4444]'}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {scoreDelta > 0 ? '↑' : '↓'} {Math.abs(scoreDelta)} pts since first scan
                </motion.div>
              )}
            </div>

            {/* Breakdown Items */}
            <div className="px-6 pb-4 space-y-1.5">
              {items.map((item, i) => (
                <motion.div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.025)' }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${item.color}15` }}>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke={item.color} strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <span className="flex-1 text-[12px] text-white/60">{item.label}</span>
                  <span className="text-[13px] font-semibold tabular-nums" style={{ color: item.color }}>
                    {item.positive ? '+' : ''}{item.value}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Progress stats */}
            {(resolvedBreaches > 0 || removedBrokers > 0) && (
              <div className="mx-6 mb-4 rounded-xl bg-[#22c55e]/[0.04] border border-[#22c55e]/10 px-4 py-2.5">
                <p className="text-[12px] text-[#22c55e]/80 flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {resolvedBreaches > 0 && `${resolvedBreaches} breach${resolvedBreaches > 1 ? 'es' : ''} resolved`}
                  {resolvedBreaches > 0 && removedBrokers > 0 && ' · '}
                  {removedBrokers > 0 && `${removedBrokers} broker${removedBrokers > 1 ? 's' : ''} removed`}
                </p>
              </div>
            )}

            {/* Chart */}
            {hasHistory && (
              <div className="px-6 pb-5">
                <p className="text-[11px] text-white/30 mb-2 uppercase tracking-wider font-medium">History</p>
                <div className="rounded-xl p-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                    {[0, 50, 100].map((v) => {
                      const gy = padY + (1 - v / 100) * (chartH - padY * 2);
                      return (
                        <g key={v}>
                          <line x1={padX} y1={gy} x2={chartW - padX} y2={gy} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                          <text x={padX - 4} y={gy + 3} fill="rgba(255,255,255,0.2)" fontSize="8" textAnchor="end">{v}</text>
                        </g>
                      );
                    })}
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {points.length > 1 && <path d={areaD} fill="url(#scoreGrad)" />}
                    {points.length > 1 && (
                      <motion.path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    )}
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
                    ))}
                    {points.filter((_, i) => i === 0 || i === points.length - 1 || points.length <= 5).map((p, i) => (
                      <text key={i} x={p.x} y={chartH - 2} fill="rgba(255,255,255,0.25)" fontSize="7" textAnchor="middle">
                        {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </text>
                    ))}
                  </svg>
                </div>
              </div>
            )}

            {!hasHistory && (
              <div className="text-center px-6 pb-6 pt-1">
                <p className="text-[12px] text-white/25">Score history will appear after multiple scans.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
