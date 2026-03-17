import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';

const ScanPage = lazy(() => import('./ScanPage'));

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
  const [items, setItems] = useState<{ id: number; city: string; name: string; breaches: number; subs: number; seconds: number }[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const gen = () => {
      const entry = TICKER_DATA[Math.floor(Math.random() * TICKER_DATA.length)];
      const isSub = Math.random() > 0.6;
      return {
        id: ++idRef.current,
        city: entry.city,
        name: entry.name,
        breaches: isSub ? 0 : Math.floor(Math.random() * 12) + 1,
        subs: isSub ? Math.floor(Math.random() * 8) + 3 : 0,
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
              {item.subs > 0
                ? <span className="font-bold text-[#22c55e]">{item.subs} hidden subs</span>
                : <span className="font-bold text-[#ef4444]">{item.breaches} breaches</span>
              }
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
  const [particles] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * -20,
    }))
  );

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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  const hasRun = useRef(false);
  const [display, setDisplay] = useState(() =>
    text.split('').map((c) => (c === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)])).join('')
  );

  useEffect(() => {
    if (!inView || hasRun.current) return;
    hasRun.current = true;
    let frame = 0;
    const totalFrames = 22;
    let intervalId: ReturnType<typeof setInterval>;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
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
          clearInterval(intervalId);
          setDisplay(text);
        }
      }, 45);
    }, delay);
    return () => { clearTimeout(timeoutId); clearInterval(intervalId); };
  }, [inView, text, delay]);

  return <span ref={ref} className={className}>{display}</span>;
}

/* ─── Magnifying glass reveal text ─── */
function MagnifyReveal({ text, className = '' }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: '-80px' });
  const hasRun = useRef(false);

  useEffect(() => {
    if (!inView || hasRun.current || !containerRef.current || !glassRef.current || !lightRef.current) return;
    hasRun.current = true;

    const el = containerRef.current;
    const glass = glassRef.current;
    const light = lightRef.current;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      return { w: rect.width, h: rect.height };
    };

    const { w, h } = measure();

    // Simple bezier path — guaranteed to go from off-left to off-right
    const totalDuration = 3500;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      let t = Math.min(elapsed / totalDuration, 1);
      // Smooth ease in-out
      t = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

      // X goes from well off-left to well off-right
      const x = -80 + t * (w + 160);
      // Y wobbles gently with a sine wave
      const y = h * 0.45 + Math.sin(t * Math.PI * 2.5) * h * 0.12;

      // Move glass and light mask
      glass.style.transform = `translate3d(${x - 32}px, ${y - 32}px, 0)`;
      const mask = `radial-gradient(circle 150px at ${x}px ${y}px, black 0%, rgba(0,0,0,0.6) 25%, transparent 65%)`;
      light.style.webkitMaskImage = mask;
      light.style.maskImage = mask;

      if (elapsed < totalDuration) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [inView]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Dim base text */}
      <span className="relative text-white/[0.12]">{text}</span>

      {/* Illuminated text layer — masked by radial gradient that follows the glass */}
      <span
        ref={lightRef}
        className="absolute inset-0 text-white"
        style={{
          WebkitMaskImage: 'radial-gradient(circle 140px at -60px 50%, black 0%, rgba(0,0,0,0.5) 30%, transparent 70%)',
          maskImage: 'radial-gradient(circle 140px at -60px 50%, black 0%, rgba(0,0,0,0.5) 30%, transparent 70%)',
          willChange: '-webkit-mask-image',
        }}
      >
        {text}
      </span>

      {/* Magnifying glass — always present, starts off-screen left */}
      <div
        ref={glassRef}
        className="absolute top-0 left-0 z-20 pointer-events-none"
        style={{
          width: 64,
          height: 64,
          transform: 'translate3d(-80px, 50%, 0)',
          willChange: 'transform',
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute -inset-12 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 65%)' }}
        />
        {/* Glass SVG */}
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ filter: 'drop-shadow(0 0 12px rgba(167,139,250,0.5))' }}>
          <circle cx="26" cy="26" r="18" stroke="rgba(167,139,250,0.7)" strokeWidth="2" fill="rgba(167,139,250,0.05)" />
          <circle cx="26" cy="26" r="16" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none" />
          <line x1="39" y1="39" x2="56" y2="56" stroke="rgba(167,139,250,0.6)" strokeWidth="3" strokeLinecap="round" />
          {/* Glint */}
          <path d="M16 18 Q18 13, 23 16" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      </div>
    </div>
  );
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
    title: 'Subscription Manager',
    desc: "Finds every subscription tied to your email — paid, free trials about to convert, and forgotten services still charging you. Average user saves $247/mo.",
    stat: '$247',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.15)',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
  },
];

const socialProof = [
  { num: 47283, label: 'Scans completed', prefix: '' },
  { num: 2.1, label: 'Million breaches found', prefix: '' },
  { num: 247, label: 'Avg. hidden monthly spend found', prefix: '$' },
  { num: 89, label: 'Avg. privacy score improvement', prefix: '+' },
];

/* ─── Vanish transition overlay ─── */
function VanishTransition() {
  const [particles] = useState(() =>
    Array.from({ length: 80 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 400;
      return {
        size: Math.random() * 3 + 1,
        left: Math.random() * 100,
        top: Math.random() * 100,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        delay: Math.random() * 0.4,
        rotate: (Math.random() - 0.5) * 720,
      };
    })
  );

  return (
    <motion.div
      className="fixed inset-0 z-[200] pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Central flash */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(167,139,250,0.08) 0%, transparent 60%)' }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 2] }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      {/* Scatter particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            background: i % 3 === 0 ? 'rgba(167,139,250,0.8)' : 'rgba(255,255,255,0.5)',
          }}
          initial={{ opacity: 0.9, scale: 1, rotate: 0 }}
          animate={{ opacity: 0, scale: 0, x: p.dx, y: p.dy, rotate: p.rotate }}
          transition={{ duration: 0.6 + p.delay, delay: p.delay * 0.5, ease: [0.32, 0, 0.67, 0] }}
        />
      ))}
      {/* Horizontal scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.4), transparent)' }}
        initial={{ top: '50%', opacity: 0, scaleX: 0 }}
        animate={{ top: ['50%', '0%'], opacity: [0, 1, 0], scaleX: [0, 1, 1] }}
        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.4), transparent)' }}
        initial={{ top: '50%', opacity: 0, scaleX: 0 }}
        animate={{ top: ['50%', '100%'], opacity: [0, 1, 0], scaleX: [0, 1, 1] }}
        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
      />
    </motion.div>
  );
}

/* ─── Page ─── */
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const [vanishing, setVanishing] = useState(false);

  // Live scan counter — seeded from date so it's always growing
  const [scanCount, setScanCount] = useState(() => {
    const launch = new Date('2025-01-01').getTime();
    const now = Date.now();
    const daysSince = (now - launch) / 86400000;
    return Math.floor(47000 + daysSince * 127 + (now % 86400000) / 86400000 * 127);
  });
  useEffect(() => {
    const t = setInterval(() => setScanCount(c => c + Math.floor(Math.random() * 2) + 1), 6000);
    return () => clearInterval(t);
  }, []);

  const [showScan, setShowScan] = useState(false);

  // Pre-generated hero dissolve particles (useState lazy init is pure in React 19)
  const [heroParticles] = useState(() =>
    Array.from({ length: 12 }, () => ({
      w: Math.random() * 3 + 1.5,
      right: Math.random() * 15,
      top: 20 + Math.random() * 60,
      dx: 30 + Math.random() * 40,
      dur: 1.5 + Math.random(),
      delay: 1.2 + Math.random() * 2,
      repeatDelay: 2 + Math.random() * 3,
    }))
  );

  const handleNavigateToScan = useCallback(() => {
    setVanishing(true);
    // After landing content fully dissolves, swap to scan content
    setTimeout(() => {
      setShowScan(true);
      setVanishing(false);
      window.history.replaceState(null, '', '/scan');
    }, 1000);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Vanish transition particles */}
      <AnimatePresence>
        {vanishing && <VanishTransition />}
      </AnimatePresence>

      {/* ─── Scan page content (materializes after vanish) ─── */}
      <AnimatePresence>
        {showScan && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, filter: 'blur(16px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <Suspense fallback={null}>
              <ScanPage />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Landing page content that dissolves ─── */}
      {!showScan && (
      <motion.div
        animate={vanishing ? {
          scale: 0.92,
          opacity: 0,
          filter: 'blur(20px)',
          y: -30,
        } : {
          scale: 1,
          opacity: 1,
          filter: 'blur(0px)',
          y: 0,
        }}
        transition={{ duration: 0.8, ease: [0.32, 0, 0.67, 0] }}
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

            <motion.button
              className="nav-scan-btn ml-auto relative overflow-hidden rounded-full bg-white/[0.08] px-4 py-1.5 text-[13px] font-medium text-white/70 border border-white/[0.06]"
              onClick={handleNavigateToScan}
              whileHover={{
                backgroundColor: 'rgba(124,106,239,0.15)',
                borderColor: 'rgba(124,106,239,0.3)',
                color: 'rgba(255,255,255,0.95)',
                scale: 1.05,
                boxShadow: '0 0 20px rgba(124,106,239,0.2), 0 0 40px rgba(124,106,239,0.1)',
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <motion.span
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(124,106,239,0.15), transparent)' }}
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              />
              <span className="relative z-10">Start Scan</span>
            </motion.button>
          </div>
        </motion.nav>

        {/* ─── Hero ─── */}
        <section ref={heroRef} className="relative mx-auto max-w-6xl px-6 pt-36 pb-24 overflow-hidden">
          <OrbitDots />

          {/* Radial gradient pulse behind hero text */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(124,106,239,0.06) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="relative text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 backdrop-blur-sm"
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
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(3rem,6.5vw,5rem)] font-bold leading-[1.05] tracking-[-0.04em]"
            >
              <span className="text-white inline-flex flex-wrap justify-center gap-x-[0.3em]">
                {'Your data is everywhere.'.split(' ').map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, delay: 0.4 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
              <br />
              <motion.span
                className="inline-block relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                <motion.span
                  className="inline-block bg-gradient-to-r from-[#6366f1] via-[#a78bfa] to-[#c084fc] bg-clip-text text-transparent"
                  style={{ backgroundSize: '200% 100%' }}
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                >
                  Take it back.
                </motion.span>
                {/* Dissolving particles off the text edges */}
                {heroParticles.map((p, i) => (
                  <motion.span
                    key={i}
                    className="absolute rounded-full bg-[#a78bfa]"
                    style={{ width: p.w, height: p.w, right: `${p.right}%`, top: `${p.top}%` }}
                    animate={{ x: [0, p.dx], opacity: [0.6, 0], scale: [1, 0] }}
                    transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, repeatDelay: p.repeatDelay, ease: 'easeOut' }}
                  />
                ))}
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mx-auto mt-6 max-w-lg text-[17px] leading-[1.7] text-white/40"
            >
              Breaches, data brokers, forgotten accounts, hidden subscriptions draining your wallet.
              Vanish finds everything tied to your email in <span className="text-white/60 font-medium">under 30 seconds</span>.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="mt-10 flex flex-wrap justify-center gap-4"
            >
              <motion.button
                className="btn-primary text-[15px] relative"
                onClick={handleNavigateToScan}
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                {/* Shimmer sweep */}
                <motion.span
                  className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
                >
                  <motion.span
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)' }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                  />
                </motion.span>
                <span className="relative z-10">Scan My Email Free</span>
              </motion.button>
              <motion.button
                className="btn-secondary text-[15px]"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                whileHover={{ scale: 1.04, y: -2, borderColor: 'rgba(255,255,255,0.15)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                See what we find
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="mt-8 flex flex-wrap justify-center gap-6 text-[12px] font-medium text-white/20"
            >
              {['No sign-up required', 'Browser-only processing', '100% free'].map((t, i) => (
                <motion.span
                  key={t}
                  className="flex items-center gap-1.5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.1, duration: 0.5 }}
                >
                  <svg className="h-3 w-3 text-[#22c55e]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>

          {/* Live ticker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.6 }}
          >
            <LiveTicker />
          </motion.div>
        </section>

        {/* ─── Social Proof Bar ─── */}
        <FadeInSection>
          <div className="mx-auto max-w-6xl px-6">
            <div className="glow-line" />
            <div className="glass-card !rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-8 py-10 text-center">
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
                { num: '02', title: 'We scan everything', desc: 'Breach databases, broker lists, subscriptions, free trials — all at once in your browser.', color: '#a78bfa' },
                { num: '03', title: 'Take action', desc: 'See your full exposure. Resolve breaches. Cancel forgotten subscriptions. Request data removal.', color: '#22c55e' },
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
            <div className="mt-16 relative">
              <p className="section-label mb-8 text-center">Data Flow</p>
              <div className="relative flex items-center justify-center gap-0">
                {/* Connecting line behind nodes */}
                <div className="absolute top-1/2 left-[15%] right-[15%] h-px bg-white/[0.06] -translate-y-1/2" />
                {/* Traveling pulse */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 h-px w-[20%] pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
                    left: '15%',
                  }}
                  animate={{ left: ['15%', '65%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
                />

                {[
                  { step: '01', label: 'Your email', desc: 'Connect Gmail', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg> },
                  { step: '02', label: 'Scan & lookup', desc: 'Breaches · Brokers · Subscriptions', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg> },
                  { step: '03', label: 'Local results', desc: 'Never leaves your device', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg> },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="relative z-10 flex flex-col items-center flex-1"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    {/* Node */}
                    <motion.div
                      className={`relative w-16 h-16 rounded-2xl flex items-center justify-center text-xl mb-4 ${
                        i === 2
                          ? 'bg-[var(--accent)]/[0.08] border border-[var(--accent)]/20 text-[var(--accent)]'
                          : 'bg-white/[0.03] border border-white/[0.08] text-white/30'
                      }`}
                      whileHover={{ scale: 1.1, borderColor: 'rgba(124,106,239,0.3)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      {item.icon}
                      {/* Ping on last node */}
                      {i === 2 && (
                        <motion.div
                          className="absolute inset-0 rounded-2xl border border-[var(--accent)]/20"
                          animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                        />
                      )}
                    </motion.div>
                    <span className="text-[10px] font-mono text-white/15 tracking-widest mb-1">{item.step}</span>
                    <span className="text-[14px] font-medium text-white/70">{item.label}</span>
                    <span className="text-[11px] text-white/25 mt-0.5">{item.desc}</span>
                  </motion.div>
                ))}
              </div>
              <p className="mt-10 text-center text-[13px] text-white/15">
                That's the entire pipeline. Zero servers. Zero storage. Zero trust required.
              </p>
            </div>
          </FadeInSection>
        </section>

        {/* ─── CTA ─── */}
        <section className="mx-auto max-w-6xl px-6 py-20">
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
                <h2 className="text-[2.5rem] font-bold tracking-tight">
                  <MagnifyReveal text="Find out what they know." />
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
                <p className="mt-5 text-[12px] text-white/40">
                  Takes less than 30 seconds. We literally can't see your results.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="border-t border-white/[0.04]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
            <span className="text-[14px] font-bold text-white/30">Vanish</span>
            <p className="text-[12px] text-white/30">Your data. Your control. Always.</p>
          </div>
        </footer>
      </motion.div>
      )}
    </motion.div>
  );
}
