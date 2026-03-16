import { useNavigate } from 'react-router-dom';

const features = [
  { title: 'Breach Monitor', desc: 'Checks your email against real breach databases. Know which accounts were compromised and what data was exposed.', stat: 'Live' },
  { title: 'Broker Removal', desc: 'Identifies 26 known data brokers selling your personal information and helps you send removal requests.', stat: '26 brokers' },
  { title: 'Account Discovery', desc: "Scans your inbox to find every service you've ever signed up for. See your full digital footprint.", stat: '80+ services' },
  { title: 'Subscription Tracker', desc: "Finds every recurring charge across your emails. See exactly what's draining your bank account.", stat: '$247 avg' },
];

const steps = [
  { num: '1', title: 'Enter your email', desc: 'Add one or more email addresses you want to scan.' },
  { num: '2', title: 'We scan everything', desc: 'Breaches, brokers, accounts, and subscriptions — all at once.' },
  { num: '3', title: 'Take action', desc: 'See your full digital footprint and start cleaning it up.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold">Vanish</span>
          <button
            onClick={() => navigate('/scan')}
            className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Start Scan
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="mb-4 text-sm uppercase tracking-wide text-gray-500">Digital Footprint Scanner</p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          See everything they know about you.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
          Breaches, data brokers, forgotten accounts, hidden subscriptions —
          Vanish scans everything tied to your email and helps you take it all back.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => navigate('/scan')}
            className="rounded bg-black px-6 py-3 text-white hover:bg-gray-800"
          >
            Start Free Scan →
          </button>
          <a
            href="#features"
            className="rounded border border-gray-300 px-6 py-3 text-gray-700 hover:bg-gray-50"
          >
            See what we find
          </a>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
          <span>Browser-only</span>
          <span>·</span>
          <span>No data stored</span>
          <span>·</span>
          <span>100% free</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-gray-200">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-2xl font-bold">Four scanners. One pass.</h2>
          <p className="mt-2 text-gray-600">Every tool you need to map and reclaim your digital footprint.</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="rounded border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{f.title}</h3>
                  <span className="text-sm text-gray-500">{f.stat}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-gray-200">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">Here's what we typically find.</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { value: '12', label: 'Data breaches' },
              { value: '18', label: 'Data brokers' },
              { value: '47', label: 'Accounts found' },
              { value: '$312', label: 'In subscriptions' },
            ].map((stat) => (
              <div key={stat.label} className="rounded border border-gray-200 p-6">
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="mt-1 text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-200">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-2xl font-bold">Three steps. Full visibility.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="rounded border border-gray-200 p-6">
                <span className="text-sm font-bold text-gray-400">Step {s.num}</span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="border-t border-gray-200">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-2xl font-bold">Built for the privacy-conscious.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'No inbox access', desc: 'We only check your email address against databases. We never read or scan your inbox.' },
              { title: 'No data stored', desc: 'Scan results live in your browser only. Nothing is sent to or stored on our servers.' },
              { title: 'No tracking', desc: "No analytics, no cookies, no fingerprinting. We don't know who you are." },
              { title: 'Open architecture', desc: 'Breach data comes from XposedOrNot, a free and open breach database.' },
            ].map((item) => (
              <div key={item.title} className="rounded border border-gray-200 p-6">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Data Flow</h3>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded border border-gray-200 bg-gray-50 px-3 py-1">Your email</span>
              <span>→</span>
              <span className="rounded border border-gray-200 bg-gray-50 px-3 py-1">Breach & broker lookup</span>
              <span>→</span>
              <span className="rounded border border-gray-200 bg-gray-50 px-3 py-1">Results in your browser</span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              That's it. Your email is checked against known breaches, data brokers, and service databases. Results stay in your browser and are never stored anywhere.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-200">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold">Ready to see what's out there?</h2>
          <p className="mx-auto mt-3 max-w-md text-gray-600">
            Breaches, brokers, forgotten accounts, hidden subscriptions —
            find it all in 30 seconds. Free, no sign-up.
          </p>
          <button
            onClick={() => navigate('/scan')}
            className="mt-8 rounded bg-black px-6 py-3 text-white hover:bg-gray-800"
          >
            Scan My Email Free →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
          <span className="font-bold text-gray-400">VANISH</span>
          <p className="text-sm text-gray-500">Your digital footprint, under your control.</p>
        </div>
      </footer>
    </div>
  );
}
