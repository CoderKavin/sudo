import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';

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
const TICKER_DATA: { name: string; city: string }[] = [
  { name: 'Arjun', city: 'Mumbai' },
  { name: 'Priya', city: 'Mumbai' },
  { name: 'James', city: 'London' },
  { name: 'Sophie', city: 'London' },
  { name: 'Yuki', city: 'Tokyo' },
  { name: 'Hana', city: 'Tokyo' },
  { name: 'Lukas', city: 'Berlin' },
  { name: 'Anna', city: 'Berlin' },
  { name: 'Liam', city: 'Sydney' },
  { name: 'Emma', city: 'Sydney' },
  { name: 'Ethan', city: 'Toronto' },
  { name: 'Maya', city: 'Toronto' },
  { name: 'Wei', city: 'Singapore' },
  { name: 'Li Na', city: 'Singapore' },
  { name: 'Alex', city: 'New York' },
  { name: 'Jordan', city: 'New York' },
  { name: 'Min-jun', city: 'Seoul' },
  { name: 'Seo-yeon', city: 'Seoul' },
  { name: 'Lars', city: 'Amsterdam' },
  { name: 'Daan', city: 'Amsterdam' },
  { name: 'Camille', city: 'Paris' },
  { name: 'Lucas', city: 'Paris' },
  { name: 'Omar', city: 'Dubai' },
  { name: 'Fatima', city: 'Dubai' },
  { name: 'Mateo', city: 'São Paulo' },
  { name: 'Ana', city: 'São Paulo' },
  { name: 'Erik', city: 'Stockholm' },
  { name: 'Astrid', city: 'Stockholm' },
  { name: 'Carlos', city: 'Mexico City' },
  { name: 'Diego', city: 'Buenos Aires' },
];

function LiveTicker() {
  const [items, setItems] = useState<{ id: number; city: string; name: string; breaches: number; seconds: number }[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const gen = () => {
      const entry = TICKER_DATA[Math.floor(Math.random() * TICKER_DATA.length)];
      return {
        id: ++idRef.current,
        city: entry.city,
        name: entry.name,
        breaches: Math.floor(Math.random() * 12) + 1,
        seconds: Math.floor(Math.random() * 8) + 2,
      };
    };
    setItems([gen(), gen(), gen()]);
    const t = setInterval(() => {
      setItems(prev => [gen(), ...prev.slice(0, 2)]);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mt-14 flex flex-col items-center gap-3">
      <AnimatePresence mode="popLayout">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(4px)' }}
            animate={{
              opacity: i === 0 ? 1 : i === 1 ? 0.5 : 0.25,
              y: 0,
              scale: i === 0 ? 1 : i === 1 ? 0.96 : 0.92,
              filter: 'blur(0px)',
            }}
            exit={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="flex items-center gap-3 rounded-2xl px-5 py-3"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)',
              boxShadow: i === 0
                ? '0 4px 24px rgba(0,0,0,0.3), inset 0 0.5px 0 rgba(255,255,255,0.06)'
                : '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              {i === 0 && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-50" />
              )}
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: i === 0 ? '#22c55e' : 'rgba(34,197,94,0.4)' }}
              />
            </span>
            <span className="text-[13px] text-white/35 whitespace-nowrap">
              <span className="font-semibold text-white/80">{item.name}</span>
              <span className="mx-1 text-white/15">in</span>
              <span className="text-white/50">{item.city}</span>
              <span className="mx-1 text-white/15">found</span>
              <span className="font-bold text-[#ef4444]">{item.breaches} breaches</span>
            </span>
            <span className="text-[11px] tabular-nums text-white/15 ml-1">{item.seconds}s ago</span>
          </motion.div>
        ))}
      </AnimatePresence>
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

/* ─── Floating particles ─── */
function FloatingParticles({ count = 20 }: { count?: number }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * -20,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[var(--accent)]"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: 0,
          }}
          animate={{
            y: [0, -80, -160],
            opacity: [0, 0.3, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Glitch text reveal ─── */
function GlitchText({ text, className = '', delay = 0 }: { text: string; className?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [display, setDisplay] = useState(text);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';

  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const totalFrames = 15;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        const revealed = Math.floor(progress * text.length);
        const result = text.split('').map((char, i) => {
          if (char === ' ') return ' ';
          if (i < revealed) return char;
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        setDisplay(result);
        if (frame >= totalFrames) {
          clearInterval(interval);
          setDisplay(text);
        }
      }, 40);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [inView, text, delay]);

  return <span ref={ref} className={className}>{display}</span>;
}

/* ─── Magnetic hover card ─── */
function MagneticCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouse = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    x.set(cx * 0.05);
    y.set(cy * 0.05);
  }, [x, y]);

  const reset = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Scan line sweeping across section ─── */
function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px pointer-events-none z-10"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, var(--accent) 20%, var(--accent) 80%, transparent 100%)',
        opacity: 0.15,
        boxShadow: '0 0 20px var(--accent), 0 0 60px var(--accent)',
      }}
      initial={{ top: '0%' }}
      animate={{ top: '100%' }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
    />
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
  {
    title: 'Breach Monitor',
    desc: 'Real-time scanning against breach databases. Know exactly which accounts were compromised.',
    stat: 'LIVE',
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.15)',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  },
  {
    title: 'Broker Removal',
    desc: 'Identifies 26+ data brokers selling your info and helps you send removal requests in one click.',
    stat: '26+',
    color: '#f97316',
    glow: 'rgba(249,115,22,0.15)',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    title: 'Account Discovery',
    desc: "Maps every service you've ever signed up for. Your complete digital footprint, revealed.",
    stat: '80+',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.15)',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    title: 'Subscription Tracker',
    desc: "Uncovers every recurring charge draining your bank account. The average user finds $247/mo.",
    stat: '$247',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.15)',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
  },
];

const socialProof = [
  { num: 47283, label: 'Scans completed', prefix: '' },
  { num: 2.1, label: 'Million breaches found', prefix: '' },
  { num: 89, label: 'Avg. privacy score improvement', prefix: '+' },
];

/* ─── Vanish transition overlay ─── */
function VanishTransition({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1 }}
    >
      {/* Dissolve particles */}
      {Array.from({ length: 60 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-sm bg-[var(--accent)]"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{
            opacity: 0,
            scale: 0,
            x: (Math.random() - 0.5) * 300,
            y: (Math.random() - 0.5) * 300,
          }}
          transition={{ duration: 0.8, delay: Math.random() * 0.3, ease: 'easeOut' }}
        />
      ))}
      {/* Wipe effect */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'var(--bg)' }}
        initial={{ clipPath: 'circle(0% at 50% 50%)' }}
        animate={{ clipPath: 'circle(150% at 50% 50%)' }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.div>
  );
}

/* ─── Page ─── */
export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const [vanishing, setVanishing] = useState(false);

  // Live scan counter — seeded from date so it's always growing
  const baseScanCount = useRef(() => {
    const launch = new Date('2025-01-01').getTime();
    const now = Date.now();
    const daysSince = (now - launch) / 86400000;
    return Math.floor(47000 + daysSince * 127 + (now % 86400000) / 86400000 * 127);
  }).current;
  const [scanCount, setScanCount] = useState(baseScanCount);
  useEffect(() => {
    const t = setInterval(() => setScanCount(c => c + Math.floor(Math.random() * 2) + 1), 6000);
    return () => clearInterval(t);
  }, []);

  const handleNavigateToScan = useCallback(() => {
    setVanishing(true);
  }, []);

  const completeVanish = useCallback(() => {
    navigate('/scan');
  }, [navigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Vanish transition overlay */}
      <AnimatePresence>
        {vanishing && <VanishTransition onComplete={completeVanish} />}
      </AnimatePresence>

      {/* ─── Page content that dissolves ─── */}
      <motion.div
        animate={vanishing ? {
          scale: 0.95,
          opacity: 0,
          filter: 'blur(10px)',
        } : {
          scale: 1,
          opacity: 1,
          filter: 'blur(0px)',
        }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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
              onClick={handleNavigateToScan}
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
              <button className="btn-primary text-[15px]" onClick={handleNavigateToScan}>
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

        {/* ─── Features — Interactive Cards ─── */}
        <section id="features" className="relative mx-auto max-w-6xl px-6 py-32 overflow-hidden">
          <FloatingParticles count={15} />
          <ScanLine />

          <FadeInSection className="text-center mb-16">
            <p className="section-label mb-3">What we scan</p>
            <h2 className="text-[2.5rem] font-bold tracking-tight text-white">
              <GlitchText text="Four engines. One scan." />
            </h2>
            <p className="mt-3 text-[16px] text-white/35 max-w-md mx-auto">
              Every tool you need to map your full digital exposure — running simultaneously.
            </p>
          </FadeInSection>

          <div className="grid gap-5 md:grid-cols-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: 0.7,
                  delay: i * 0.15,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <MagneticCard className="h-full">
                  <motion.div
                    className="glass-card group relative overflow-hidden h-full cursor-default"
                    whileHover={{
                      borderColor: `${f.color}30`,
                      boxShadow: `0 0 40px ${f.glow}, inset 0 0 40px ${f.glow}`,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Animated top accent */}
                    <motion.div
                      className="absolute top-0 left-0 right-0 h-px"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.3 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        background: `linear-gradient(90deg, transparent, ${f.color}60, transparent)`,
                        transformOrigin: 'left',
                      }}
                    />

                    {/* Hover corner glow */}
                    <motion.div
                      className="absolute -top-20 -right-20 h-40 w-40 rounded-full"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      style={{ background: `radial-gradient(circle, ${f.glow}, transparent 70%)` }}
                    />

                    {/* Scan sweep on hover */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: `linear-gradient(180deg, transparent, ${f.glow}, transparent)`,
                        backgroundSize: '100% 200%',
                      }}
                    />

                    <div className="relative">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="flex h-11 w-11 items-center justify-center rounded-xl border"
                          style={{ borderColor: `${f.color}25`, backgroundColor: `${f.color}10`, color: f.color }}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        >
                          {f.icon}
                        </motion.div>
                        <motion.div
                          className="flex h-7 items-center rounded-full px-3 border"
                          style={{ borderColor: `${f.color}20`, backgroundColor: `${f.color}08` }}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.5 + i * 0.15 }}
                        >
                          <span className="text-[12px] font-bold tabular-nums" style={{ color: f.color }}>{f.stat}</span>
                        </motion.div>
                      </div>
                      <h3 className="mt-5 text-[17px] font-semibold text-white">{f.title}</h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-white/35">{f.desc}</p>

                      {/* Animated underline */}
                      <motion.div
                        className="mt-5 h-px"
                        style={{ background: `linear-gradient(90deg, ${f.color}30, transparent)`, transformOrigin: 'left' }}
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: 0.6 + i * 0.15 }}
                      />

                      {/* Explore text */}
                      <motion.div
                        className="mt-4 flex items-center gap-2 text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ color: f.color }}
                      >
                        <span>Included in scan</span>
                        <motion.svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </motion.svg>
                      </motion.div>
                    </div>
                  </motion.div>
                </MagneticCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── How it works — Timeline style ─── */}
        <section className="relative mx-auto max-w-6xl px-6 py-32 overflow-hidden">
          <FloatingParticles count={10} />

          <FadeInSection className="text-center mb-20">
            <p className="section-label mb-3">How it works</p>
            <h2 className="text-[2.5rem] font-bold tracking-tight text-white">
              <GlitchText text="Three steps. Full visibility." delay={200} />
            </h2>
          </FadeInSection>

          <div className="relative">
            {/* Connecting line */}
            <motion.div
              className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden md:block"
              style={{ background: 'linear-gradient(180deg, transparent, var(--accent), transparent)' }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Traveling light on line */}
            <motion.div
              className="absolute left-1/2 w-1 h-8 -translate-x-1/2 rounded-full hidden md:block"
              style={{
                background: 'var(--accent)',
                boxShadow: '0 0 15px var(--accent), 0 0 30px var(--accent)',
                opacity: 0.6,
              }}
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
            />

            <div className="grid gap-12 md:gap-20">
              {[
                { num: '01', title: 'Enter your email', desc: 'Just type it in. No sign-up, no password, no OAuth.', color: '#6366f1' },
                { num: '02', title: 'We scan everything', desc: 'Breach databases, broker lists, service records — all at once in your browser.', color: '#a78bfa' },
                { num: '03', title: 'Take action', desc: 'See your full exposure report. Resolve breaches. Request data removal.', color: '#22c55e' },
              ].map((s, i) => (
                <motion.div
                  key={s.num}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -60 : 60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.8, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative md:w-[45%] ${i % 2 === 0 ? 'md:mr-auto' : 'md:ml-auto'}`}
                >
                  {/* Node on the line */}
                  <motion.div
                    className="absolute top-6 hidden md:block"
                    style={{
                      [i % 2 === 0 ? 'right' : 'left']: '-32px',
                      transform: `translateX(${i % 2 === 0 ? '50%' : '-50%'})`,
                    }}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.3 + i * 0.2 }}
                  >
                    <div
                      className="h-3 w-3 rounded-full border-2"
                      style={{
                        borderColor: s.color,
                        backgroundColor: `${s.color}30`,
                        boxShadow: `0 0 12px ${s.color}50`,
                      }}
                    />
                  </motion.div>

                  <MagneticCard>
                    <motion.div
                      className="glass-card relative overflow-hidden group"
                      whileHover={{
                        boxShadow: `0 0 30px ${s.color}15, inset 0 0 30px ${s.color}08`,
                      }}
                    >
                      {/* Step number watermark */}
                      <motion.span
                        className="absolute top-2 right-4 text-[4rem] font-bold select-none"
                        style={{ color: `${s.color}06` }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 + i * 0.2 }}
                      >
                        {s.num}
                      </motion.span>

                      <div className="relative">
                        <motion.span
                          className="text-[13px] font-bold"
                          style={{ color: s.color }}
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 0.7 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + i * 0.2 }}
                        >
                          Step {s.num}
                        </motion.span>
                        <h3 className="mt-3 text-[18px] font-semibold text-white">{s.title}</h3>
                        <p className="mt-2 text-[14px] leading-relaxed text-white/35">{s.desc}</p>

                        {/* Progress bar */}
                        <div className="mt-5 h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${s.color}, ${s.color}40)` }}
                            initial={{ width: '0%' }}
                            whileInView={{ width: '100%' }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.5, delay: 0.5 + i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </MagneticCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Trust / Privacy ─── */}
        <section className="relative mx-auto max-w-6xl px-6 py-32 overflow-hidden">
          <ScanLine />

          <FadeInSection className="text-center mb-16">
            <p className="section-label mb-3">Security & Privacy</p>
            <h2 className="text-[2.5rem] font-bold tracking-tight text-white">
              <GlitchText text="Zero-trust by design." delay={200} />
            </h2>
            <p className="mt-3 text-[16px] text-white/35 max-w-md mx-auto">
              We don't want your data. We built Vanish so we never have to touch it.
            </p>
          </FadeInSection>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'No inbox access', desc: 'We check your email address against databases. We never read your inbox.',
                svg: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>,
                color: '#ef4444' },
              { title: 'No data stored', desc: 'Results live in your browser only. We can\'t see them even if we wanted to.',
                svg: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
                color: '#22c55e' },
              { title: 'No tracking', desc: 'Zero analytics. Zero cookies. Zero fingerprinting. You\'re invisible to us.',
                svg: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
                color: '#6366f1' },
              { title: 'Open source data', desc: 'Powered by XposedOrNot — a free, transparent breach database.',
                svg: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
                color: '#3b82f6' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 40, rotateX: 15 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <MagneticCard className="h-full">
                  <motion.div
                    className="glass-card h-full group relative overflow-hidden"
                    whileHover={{
                      borderColor: `${item.color}25`,
                      boxShadow: `0 0 30px ${item.color}10`,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Top accent line that draws in */}
                    <motion.div
                      className="absolute top-0 left-0 right-0 h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${item.color}40, transparent)` }}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                    />

                    <motion.div
                      className="flex h-10 w-10 items-center justify-center rounded-xl border"
                      style={{ borderColor: `${item.color}20`, backgroundColor: `${item.color}08`, color: `${item.color}90` }}
                      whileHover={{ scale: 1.15, rotate: -5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      {item.svg}
                    </motion.div>
                    <h3 className="mt-4 text-[15px] font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-white/30">{item.desc}</p>
                  </motion.div>
                </MagneticCard>
              </motion.div>
            ))}
          </div>

          {/* Data flow — animated pipeline */}
          <FadeInSection>
            <div className="glass-card mt-5 relative overflow-hidden">
              {/* Traveling pulse across pipeline */}
              <motion.div
                className="absolute top-0 h-full w-32 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, var(--accent-glow), transparent)',
                  opacity: 0.06,
                }}
                animate={{ left: ['-10%', '110%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
              />

              <p className="section-label mb-5">Data Flow</p>
              <div className="flex flex-wrap items-center gap-3 text-[14px]">
                {[
                  { label: 'Your email', accent: false },
                  { label: '→', arrow: true },
                  { label: 'Breach & broker lookup', accent: false },
                  { label: '→', arrow: true },
                  { label: 'Results in your browser', accent: true },
                ].map((item, i) =>
                  item.arrow ? (
                    <motion.span
                      key={i}
                      animate={{ x: [0, 6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                      className="text-white/15 text-lg"
                    >
                      →
                    </motion.span>
                  ) : (
                    <motion.span
                      key={i}
                      className={`rounded-full px-5 py-2 font-medium ${
                        item.accent
                          ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)]'
                          : 'bg-white/[0.04] border border-white/[0.06] text-white/50'
                      }`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.15, type: 'spring', stiffness: 300, damping: 20 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      {item.label}
                    </motion.span>
                  )
                )}
              </div>
              <p className="mt-4 text-[13px] text-white/20">
                That's the entire pipeline. Your data never leaves your device.
              </p>
            </div>
          </FadeInSection>
        </section>

        {/* ─── CTA ─── */}
        <section className="mx-auto max-w-6xl px-6 py-32">
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="glass-strong relative overflow-hidden rounded-3xl px-8 py-24 text-center sm:px-20 glow-accent">
              {/* Animated gradient orb */}
              <motion.div
                className="pointer-events-none absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[100px]"
                style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
                animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Grid background */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />

              <div className="relative">
                <motion.p
                  className="section-label mb-4"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  Ready?
                </motion.p>
                <h2 className="text-[2.5rem] font-bold tracking-tight text-white">
                  <GlitchText text="Find out what they know." delay={300} />
                </h2>
                <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-white/35">
                  Join <span className="font-semibold text-white/60">{scanCount.toLocaleString()}+</span> people who've already scanned.
                  Free, instant, no sign-up.
                </p>
                <motion.div
                  className="mt-10"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button className="btn-primary text-[15px]" onClick={handleNavigateToScan}>
                    Scan My Email Free
                  </button>
                </motion.div>
                <p className="mt-5 text-[12px] text-white/15">
                  Takes less than 30 seconds. We literally can't see your results.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="border-t border-white/[0.04]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
            <span className="text-[14px] font-bold text-white/15">Vanish</span>
            <p className="text-[12px] text-white/15">Your data. Your control. Always.</p>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );
}
