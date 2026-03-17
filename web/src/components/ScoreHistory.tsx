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

  // Calculate chart dimensions
  const chartW = 440;
  const chartH = 120;
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

  const scoreColor = (s: number) => s > 70 ? '#22c55e' : s > 40 ? '#f97316' : '#ef4444';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative w-full max-w-lg glass-card !p-6"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-semibold text-white">Privacy Score Breakdown</h3>
              <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors text-lg leading-none">&times;</button>
            </div>

            {/* Score Breakdown Bars */}
            <div className="space-y-3 mb-6">
              <BreakdownRow label="Base Score" value={100} maxVal={100} color="#7c6aef" suffix=" pts" />
              {breakdown.breachPenalty > 0 && (
                <BreakdownRow label="Breach Penalties" value={-breakdown.breachPenalty} maxVal={100} color="#ef4444" suffix=" pts" />
              )}
              {breakdown.brokerPenalty > 0 && (
                <BreakdownRow label="Broker Exposures" value={-breakdown.brokerPenalty} maxVal={100} color="#f97316" suffix=" pts" />
              )}
              {breakdown.resolvedBonus > 0 && (
                <BreakdownRow label="Resolved Breaches" value={+breakdown.resolvedBonus} maxVal={100} color="#22c55e" suffix=" pts" positive />
              )}
              {breakdown.removedBrokerBonus > 0 && (
                <BreakdownRow label="Removed Brokers" value={+breakdown.removedBrokerBonus} maxVal={100} color="#22c55e" suffix=" pts" positive />
              )}
              <div className="h-px bg-white/[0.06]" />
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-white/70">Current Score</span>
                <span className="text-[18px] font-bold tabular-nums" style={{ color: scoreColor(breakdown.total) }}>{breakdown.total}/100</span>
              </div>
            </div>

            {/* Progress stats */}
            {(resolvedBreaches > 0 || removedBrokers > 0) && (
              <div className="rounded-xl bg-[#22c55e]/[0.04] border border-[#22c55e]/10 p-3 mb-5">
                <p className="text-[12px] text-[#22c55e] font-medium">
                  {resolvedBreaches > 0 && `${resolvedBreaches} breach${resolvedBreaches > 1 ? 'es' : ''} resolved`}
                  {resolvedBreaches > 0 && removedBrokers > 0 && ' · '}
                  {removedBrokers > 0 && `${removedBrokers} broker${removedBrokers > 1 ? 's' : ''} removed`}
                  {scoreDelta > 0 && ` — score improved by ${scoreDelta} pts`}
                </p>
              </div>
            )}

            {/* Chart */}
            {hasHistory && (
              <div>
                <p className="text-[11px] text-white/40 mb-2 uppercase tracking-wider">Score over time</p>
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 overflow-hidden">
                  <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((v) => {
                      const gy = padY + (1 - v / 100) * (chartH - padY * 2);
                      return (
                        <g key={v}>
                          <line x1={padX} y1={gy} x2={chartW - padX} y2={gy} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                          <text x={padX - 4} y={gy + 3} fill="rgba(255,255,255,0.2)" fontSize="8" textAnchor="end">{v}</text>
                        </g>
                      );
                    })}

                    {/* Area fill */}
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c6aef" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#7c6aef" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {points.length > 1 && <path d={areaD} fill="url(#scoreGrad)" />}

                    {/* Line */}
                    {points.length > 1 && (
                      <path d={pathD} fill="none" stroke="#7c6aef" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    )}

                    {/* Dots */}
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="3" fill="#7c6aef" />
                        <circle cx={p.x} cy={p.y} r="5" fill="none" stroke="#7c6aef" strokeWidth="1" opacity="0.3" />
                      </g>
                    ))}

                    {/* Date labels */}
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
              <div className="text-center py-6">
                <p className="text-[12px] text-white/40">Score history will appear after multiple scans.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BreakdownRow({ label, value, maxVal, color, suffix = '', positive = false }: {
  label: string; value: number; maxVal: number; color: string; suffix?: string; positive?: boolean;
}) {
  const barW = Math.min(Math.abs(value) / maxVal * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-white/50 w-32 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${barW}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[11px] font-semibold tabular-nums w-16 text-right" style={{ color }}>
        {positive ? '+' : ''}{value}{suffix}
      </span>
    </div>
  );
}
