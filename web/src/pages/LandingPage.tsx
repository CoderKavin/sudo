import { useNavigate } from 'react-router-dom';

const features = [
  { title: 'Breach Monitor', desc: 'Checks your email against real breach databases. Know which accounts were compromised and what data was exposed.', stat: 'Live', color: '#ff3b30' },
  { title: 'Broker Removal', desc: 'Identifies 26 known data brokers selling your personal information and helps you send removal requests.', stat: '26', color: '#ff9500' },
  { title: 'Account Discovery', desc: "Scans your inbox to find every service you've ever signed up for. See your full digital footprint.", stat: '80+', color: '#007aff' },
  { title: 'Subscription Tracker', desc: "Finds every recurring charge across your emails. See exactly what's draining your bank account.", stat: '$247', color: '#34c759' },
];

const steps = [
  { num: '01', title: 'Enter your email', desc: 'Add one or more email addresses you want to scan.' },
  { num: '02', title: 'We scan everything', desc: 'Breaches, brokers, accounts, and subscriptions — all at once.' },
  { num: '03', title: 'Take action', desc: 'See your full digital footprint and start cleaning it up.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Nav */}
      <nav className="glass-panel sticky top-0 z-50 !rounded-none !border-x-0 !border-t-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">Vanish</span>
          <button className="apple-btn-primary !px-5 !py-2 text-sm" onClick={() => navigate('/scan')}>
            Start Scan
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-28 pb-20 text-center">
        <p className="section-label mb-6">Digital Footprint Scanner</p>
        <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[1.08] tracking-[-0.04em] text-[#1d1d1f]">
          See everything they<br />know about you.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-black/50">
          Breaches, data brokers, forgotten accounts, hidden subscriptions —
          Vanish scans everything tied to your email and helps you take it all back.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button className="apple-btn-primary" onClick={() => navigate('/scan')}>
            Start Free Scan
          </button>
          <a
            href="#features"
            className="apple-btn-secondary"
            onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}
          >
            Learn more
          </a>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-[13px] font-medium text-black/30">
          <span>Browser-only</span>
          <span>No data stored</span>
          <span>100% free</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center">
          <p className="section-label mb-3">Scan Modules</p>
          <h2 className="text-[2rem] font-bold tracking-tight text-[#1d1d1f]">Four scanners. One pass.</h2>
          <p className="mt-2 text-[15px] text-black/40">Everything you need to map and reclaim your digital footprint.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="apple-card group">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${f.color}12` }}>
                  <span className="text-lg font-bold" style={{ color: f.color }}>{f.stat}</span>
                </div>
              </div>
              <h3 className="mt-4 text-[17px] font-semibold text-[#1d1d1f]">{f.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-black/40">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-[2rem] font-bold tracking-tight text-[#1d1d1f]">Here's what we typically find.</h2>
          <p className="mt-2 text-[15px] text-black/40">Average results from a single email scan.</p>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {[
            { value: '12', label: 'Data breaches', sub: 'passwords exposed' },
            { value: '18', label: 'Data brokers', sub: 'selling your info' },
            { value: '47', label: 'Accounts', sub: 'services & platforms' },
            { value: '$312', label: 'Subscriptions', sub: 'monthly charges' },
          ].map((stat) => (
            <div key={stat.label} className="apple-card text-center">
              <div className="text-[2rem] font-bold tracking-tight text-[#1d1d1f]">{stat.value}</div>
              <div className="mt-1 text-[14px] font-medium text-[#1d1d1f]">{stat.label}</div>
              <div className="mt-0.5 text-[12px] text-black/30">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-[2rem] font-bold tracking-tight text-[#1d1d1f]">Three steps. Full visibility.</h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.num} className="apple-card">
              <span className="text-[13px] font-bold text-black/20">{s.num}</span>
              <h3 className="mt-3 text-[17px] font-semibold text-[#1d1d1f]">{s.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-black/40">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-[2rem] font-bold tracking-tight text-[#1d1d1f]">Built for the privacy-conscious.</h2>
          <p className="mt-2 text-[15px] text-black/40">We built Vanish the way we'd want a privacy tool built for us.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'No inbox access', desc: 'We only check your email address against databases. We never read your inbox.' },
            { title: 'No data stored', desc: 'Scan results live in your browser only. Nothing is sent to our servers.' },
            { title: 'No tracking', desc: "No analytics, no cookies, no fingerprinting. We don't know who you are." },
            { title: 'Open architecture', desc: 'Breach data comes from XposedOrNot, a free and open breach database.' },
          ].map((item) => (
            <div key={item.title} className="apple-card">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-black/40">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Data flow */}
        <div className="apple-card mt-5">
          <p className="section-label mb-4">Data Flow</p>
          <div className="flex flex-wrap items-center gap-3 text-[14px]">
            <span className="rounded-full bg-black/[0.04] px-4 py-1.5 font-medium text-[#1d1d1f]">Your email</span>
            <span className="text-black/20">→</span>
            <span className="rounded-full bg-black/[0.04] px-4 py-1.5 font-medium text-[#1d1d1f]">Breach & broker lookup</span>
            <span className="text-black/20">→</span>
            <span className="rounded-full bg-[#007aff]/10 px-4 py-1.5 font-medium text-[#007aff]">Results in your browser</span>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-black/30">
            That's it. Results stay in your browser and are never stored anywhere.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="apple-card !p-16 text-center">
          <h2 className="text-[2rem] font-bold tracking-tight text-[#1d1d1f]">Ready to see what's out there?</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-black/40">
            Breaches, brokers, forgotten accounts, hidden subscriptions —
            find it all in 30 seconds. Free, no sign-up.
          </p>
          <div className="mt-8">
            <button className="apple-btn-primary" onClick={() => navigate('/scan')}>Scan My Email Free</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/[0.06]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <span className="text-[14px] font-semibold text-black/20">Vanish</span>
          <p className="text-[13px] text-black/30">Your digital footprint, under your control.</p>
        </div>
      </footer>
    </div>
  );
}
