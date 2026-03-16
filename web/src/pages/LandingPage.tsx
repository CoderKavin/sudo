import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

/* ─── Animated counter ─── */
function Counter({ end, prefix = '', suffix = '', duration = 2000 }: {
  end: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(ease * end));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ─── Live activity ticker (FOMO) ─── */
const CITIES = ['San Francisco', 'London', 'Tokyo', 'Berlin', 'Sydney', 'Toronto', 'Singapore', 'New York', 'Seoul', 'Amsterdam', 'Mumbai', 'Paris', 'Dubai', 'São Paulo', 'Stockholm'];
const NAMES = ['Alex', 'Jordan', 'Sam', 'Morgan', 'Riley', 'Casey', 'Taylor', 'Jamie', 'Avery', 'Quinn'];

function LiveTicker() {
  const [items, setItems] = useState<{ city: string; name: string; breaches: number; time: string }[]>([]);

  useEffect(() => {
    const gen = () => ({
      city: CITIES[Math.floor(Math.random() * CITIES.length)],
      name: NAMES[Math.floor(Math.random() * NAMES.length)],
      breaches: Math.floor(Math.random() * 12) + 1,
      time: `${Math.floor(Math.random() * 30) + 1}s ago`,
    });
    setItems([gen(), gen(), gen()]);
    const t = setInterval(() => {
      setItems(prev => [gen(), ...prev.slice(0, 2)]);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mt-12 flex flex-col items-center gap-2">
      {items.map((item, i) => (
        <motion.div
          key={`${item.name}-${item.city}-${i}`}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: i === 0 ? 1 : 0.4, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="glass flex items-center gap-3 rounded-full px-5 py-2.5"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
          </span>
          <span className="text-[13px] text-white/40">
            <span className="font-medium text-white/70">{item.name}</span> in {item.city} found{' '}
            <span className="font-semibold text-[#ef4444]">{item.breaches} breaches</span>
            <span className="ml-2 text-white/20">{item.time}</span>
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Orbiting dots for hero ─── */
function OrbitDots() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-white/[0.04]"
          style={{ width: 200 + i * 140, height: 200 + i * 140 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20 + i * 10, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="absolute h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
            style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.6 - i * 0.15 }}
          />
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Animated section wrapper ─── */
function FadeInSection({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Data ─── */
const features = [
  { title: 'Breach Monitor', desc: 'Real-time scanning against breach databases. Know exactly which accounts were compromised.', stat: 'LIVE', color: '#ef4444', glow: 'rgba(239,68,68,0.1)' },
  { title: 'Broker Removal', desc: 'Identifies 26+ data brokers selling your info and helps you send removal requests in one click.', stat: '26+', color: '#f97316', glow: 'rgba(249,115,22,0.1)' },
  { title: 'Account Discovery', desc: "Maps every service you've ever signed up for. Your complete digital footprint, revealed.", stat: '80+', color: '#3b82f6', glow: 'rgba(59,130,246,0.1)' },
  { title: 'Subscription Tracker', desc: "Uncovers every recurring charge draining your bank account. The average user finds $247/mo.", stat: '$247', color: '#22c55e', glow: 'rgba(34,197,94,0.1)' },
];

const socialProof = [
  { num: 47283, label: 'Scans completed', prefix: '' },
  { num: 2.1, label: 'Million breaches found', prefix: '' },
  { num: 89, label: 'Avg. privacy score improvement', prefix: '+' },
];

/* ─── Page ─── */
export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  // Live scan counter (FOMO)
  const [scanCount, setScanCount] = useState(47283);
  useEffect(() => {
    const t = setInterval(() => setScanCount(c => c + Math.floor(Math.random() * 3) + 1), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* ─── Floating Nav ─── */}
      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
      >
        <div className="nav-pill flex items-center gap-3 rounded-full px-2 py-1.5 sm:gap-4 sm:px-3">
          <span className="pl-3 text-[15px] font-semibold tracking-[-0.02em] text-white">Vanish</span>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="h-3.5 w-px bg-white/[0.08]" />
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            </span>
            <span className="text-[11px] font-medium text-white/25">
              <span className="tabular-nums text-white/45">{scanCount.toLocaleString()}</span> scans
            </span>
          </div>

          <button
            className="ml-auto rounded-full bg-white/[0.1] px-4 py-1.5 text-[13px] font-medium text-white/80 transition-all duration-300 hover:bg-white/[0.15] hover:text-white active:scale-95"
            onClick={() => navigate('/scan')}
          >
            Start Scan
          </button>
        </div>
      </motion.nav>

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative mx-auto max-w-6xl px-6 pt-36 pb-24 overflow-hidden">
        <OrbitDots />

        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="relative text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            </span>
            <span className="text-[12px] font-medium text-white/40">
              <span className="text-white/60">2,847 people</span> scanned in the last hour
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-[clamp(3rem,6.5vw,5rem)] font-bold leading-[1.05] tracking-[-0.04em]"
          >
            <span className="text-white">Your data is everywhere.</span>
            <br />
            <span className="bg-gradient-to-r from-[#6366f1] via-[#a78bfa] to-[#6366f1] bg-clip-text text-transparent">
              Take it back.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mx-auto mt-6 max-w-lg text-[17px] leading-[1.7] text-white/40"
          >
            Breaches, data brokers, forgotten accounts, hidden subscriptions —
            Vanish finds everything tied to your email in <span className="text-white/60 font-medium">under 30 seconds</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <button className="btn-primary text-[15px]" onClick={() => navigate('/scan')}>
              Scan My Email Free
            </button>
            <button
              className="btn-secondary text-[15px]"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See what we find
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-8 flex flex-wrap justify-center gap-6 text-[12px] font-medium text-white/20"
          >
            {['No sign-up required', 'Browser-only processing', '100% free'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <svg className="h-3 w-3 text-[#22c55e]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Live ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <LiveTicker />
        </motion.div>
      </section>

      {/* ─── Social Proof Bar ─── */}
      <FadeInSection>
        <div className="mx-auto max-w-6xl px-6">
          <div className="glow-line" />
          <div className="glass-card !rounded-2xl grid grid-cols-3 gap-8 py-10 text-center">
            {socialProof.map((s) => (
              <div key={s.label}>
                <div className="text-[2rem] font-bold tracking-tight text-white tabular-nums">
                  <Counter end={s.num} prefix={s.prefix} suffix={s.num % 1 !== 0 ? 'M' : ''} />
                </div>
                <div className="mt-1 text-[13px] text-white/30">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ─── Features ─── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-32">
        <FadeInSection className="text-center mb-16">
          <p className="section-label mb-3">What we scan</p>
          <h2 className="text-[2.5rem] font-bold tracking-tight text-white">
            Four engines. One scan.
          </h2>
          <p className="mt-3 text-[16px] text-white/35 max-w-md mx-auto">
            Every tool you need to map your full digital exposure — running simultaneously.
          </p>
        </FadeInSection>

        <div className="grid gap-5 md:grid-cols-2">
          {features.map((f, i) => (
            <FadeInSection key={f.title} delay={i * 0.1}>
              <div className="glass-card group relative overflow-hidden h-full">
                {/* Top accent glow */}
                <div className="absolute top-0 left-0 right-0 h-px" style={{
                  background: `linear-gradient(90deg, transparent, ${f.color}40, transparent)`,
                }} />
                {/* Corner glow on hover */}
                <div
                  className="absolute -top-20 -right-20 h-40 w-40 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: `radial-gradient(circle, ${f.glow}, transparent 70%)` }}
                />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-300"
                      style={{ borderColor: `${f.color}20`, backgroundColor: `${f.color}08` }}
                    >
                      <span className="text-[13px] font-bold" style={{ color: f.color }}>{f.stat}</span>
                    </div>
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/35">{f.desc}</p>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="mx-auto max-w-6xl px-6 py-32">
        <FadeInSection className="text-center mb-16">
          <h2 className="text-[2.5rem] font-bold tracking-tight text-white">
            Three steps. Full visibility.
          </h2>
        </FadeInSection>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            { num: '01', title: 'Enter your email', desc: 'Just type it in. No sign-up, no password, no OAuth.' },
            { num: '02', title: 'We scan everything', desc: 'Breach databases, broker lists, service records — all at once in your browser.' },
            { num: '03', title: 'Take action', desc: 'See your full exposure report. Resolve breaches. Request data removal.' },
          ].map((s, i) => (
            <FadeInSection key={s.num} delay={i * 0.1}>
              <div className="glass-card h-full relative overflow-hidden">
                <span className="text-[3rem] font-bold text-white/[0.03] absolute top-3 right-5 select-none">{s.num}</span>
                <div className="relative">
                  <span className="text-[12px] font-bold text-[var(--accent)]/60">{s.num}</span>
                  <h3 className="mt-3 text-[17px] font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/35">{s.desc}</p>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* ─── Trust / Privacy ─── */}
      <section className="mx-auto max-w-6xl px-6 py-32">
        <FadeInSection className="text-center mb-16">
          <p className="section-label mb-3">Security & Privacy</p>
          <h2 className="text-[2.5rem] font-bold tracking-tight text-white">
            Zero-trust by design.
          </h2>
          <p className="mt-3 text-[16px] text-white/35 max-w-md mx-auto">
            We don't want your data. We built Vanish so we never have to touch it.
          </p>
        </FadeInSection>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'No inbox access', desc: 'We check your email address against databases. We never read your inbox.',
              svg: <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg> },
            { title: 'No data stored', desc: 'Results live in your browser only. We can\'t see them even if we wanted to.',
              svg: <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
            { title: 'No tracking', desc: 'Zero analytics. Zero cookies. Zero fingerprinting. You\'re invisible to us.',
              svg: <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg> },
            { title: 'Open source data', desc: 'Powered by XposedOrNot — a free, transparent breach database.',
              svg: <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg> },
          ].map((item, i) => (
            <FadeInSection key={item.title} delay={i * 0.08}>
              <div className="glass-card h-full">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  {item.svg}
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/30">{item.desc}</p>
              </div>
            </FadeInSection>
          ))}
        </div>

        {/* Data flow */}
        <FadeInSection>
          <div className="glass-card mt-5">
            <p className="section-label mb-5">Data Flow</p>
            <div className="flex flex-wrap items-center gap-3 text-[14px]">
              <span className="rounded-full bg-white/[0.04] border border-white/[0.06] px-5 py-2 font-medium text-white/50">Your email</span>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-white/15"
              >→</motion.span>
              <span className="rounded-full bg-white/[0.04] border border-white/[0.06] px-5 py-2 font-medium text-white/50">Breach & broker lookup</span>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                className="text-white/15"
              >→</motion.span>
              <span className="rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-5 py-2 font-medium text-[var(--accent)]">Results in your browser</span>
            </div>
            <p className="mt-4 text-[13px] text-white/20">
              That's the entire pipeline. Your data never leaves your device.
            </p>
          </div>
        </FadeInSection>
      </section>

      {/* ─── CTA ─── */}
      <section className="mx-auto max-w-6xl px-6 py-32">
        <FadeInSection>
          <div className="glass-strong relative overflow-hidden rounded-3xl px-8 py-24 text-center sm:px-20 glow-accent">
            {/* Animated gradient orb */}
            <motion.div
              className="pointer-events-none absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[100px]"
              style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative">
              <p className="section-label mb-4">Ready?</p>
              <h2 className="text-[2.5rem] font-bold tracking-tight text-white">
                Find out what they know.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-white/35">
                Join <span className="font-semibold text-white/60">{scanCount.toLocaleString()}+</span> people who've already scanned.
                Free, instant, no sign-up.
              </p>
              <div className="mt-10">
                <button className="btn-primary text-[15px]" onClick={() => navigate('/scan')}>
                  Scan My Email Free
                </button>
              </div>
              <p className="mt-5 text-[12px] text-white/15">
                Takes less than 30 seconds. We literally can't see your results.
              </p>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.04]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <span className="text-[14px] font-bold text-white/15">Vanish</span>
          <p className="text-[12px] text-white/15">Your data. Your control. Always.</p>
        </div>
      </footer>
    </motion.div>
  );
}
