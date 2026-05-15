import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
  const { user } = useAuth();

  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'donor': return '/donor/dashboard';
      case 'ngo': return '/ngo/dashboard';
      case 'volunteer': return '/volunteer/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/login';
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="orb w-[32rem] h-[32rem]" style={{ top: '-8rem', left: '-6rem', background: 'radial-gradient(circle, #10b981, transparent)' }} />
      <div className="orb w-96 h-96" style={{ bottom: '5rem', right: '-4rem', background: 'radial-gradient(circle, #0d9488, transparent)', animationDelay: '3s' }} />
      <div className="orb w-64 h-64" style={{ top: '40%', left: '55%', background: 'radial-gradient(circle, #059669, transparent)', animationDelay: '6s' }} />

      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 px-8 py-4 flex justify-between items-center" style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRadius: 0 }}>
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">MN</span>
          </div>
          <span className="text-xl font-bold text-white">MealNexus</span>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          <a href="#about" className="px-4 py-2 text-white/70 hover:text-white transition text-sm font-medium">About</a>
          <a href="#works" className="px-4 py-2 text-white/70 hover:text-white transition text-sm font-medium">How it Works</a>
          {user ? (
            <Link to={getDashboardLink()} className="btn-glow btn-sm ml-2">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm ml-2">Login</Link>
              <Link to="/register" className="btn-glow btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-28 pb-24">
        <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-emerald-300 font-medium mb-6 border-emerald-500/30">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          Connecting surplus food to communities in need
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 max-w-4xl">
          Reduce Food Waste,{' '}
          <span className="gradient-text">Feed the Needy</span>
        </h1>

        <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl leading-relaxed">
          MealNexus is the smart platform connecting food donors with NGOs and
          volunteers — ensuring surplus food reaches those who need it most, in time.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/register" className="btn-glow text-base px-8 py-3.5">
            Start Donating
          </Link>
          <Link to="/login" className="btn-ghost text-base px-8 py-3.5">
            Login
          </Link>
        </div>

        {/* Stats bar */}
        <div className="mt-16 grid grid-cols-3 gap-px glass-card overflow-hidden max-w-2xl w-full" style={{ borderRadius: '1.25rem' }}>
          {[
            { value: '10,000+', label: 'Meals Served' },
            { value: '500+', label: 'Active Donors' },
            { value: '200+', label: 'NGO Partners' },
          ].map(({ value, label }) => (
            <div key={label} className="px-6 py-5 text-center">
              <div className="text-2xl font-bold gradient-text">{value}</div>
              <div className="text-sm text-white/50 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">About <span className="gradient-text">MealNexus</span></h2>
            <div className="section-divider max-w-xs mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-white/70 text-lg leading-relaxed mb-6">
                MealNexus is a smart, AI-powered platform that bridges the gap between
                surplus food and hunger. We bring together donors, NGOs, and volunteers
                to create a sustainable food distribution network.
              </p>
              <p className="text-white/70 leading-relaxed">
                Our real-time tracking, intelligent volunteer matching, and seamless
                coordination tools ensure every meal reaches the right people at the right time.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', label: 'Zero Waste Mission', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25' },
                { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', label: 'Community Driven', color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/25' },
                { icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z', label: 'AI-Powered Matching', color: 'from-purple-500/20 to-pink-500/10 border-purple-500/25' },
                { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Safe & Verified', color: 'from-orange-500/20 to-amber-500/10 border-orange-500/25' },
              ].map(({ icon, label, color }) => (
                <div key={label} className={`glass-card bg-gradient-to-br ${color} p-5 flex flex-col gap-3`}>
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-white/90">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="works" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How It <span className="gradient-text">Works</span></h2>
            <div className="section-divider max-w-xs mx-auto" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Donor Posts Food',
                desc: 'Restaurants, events, or individuals upload surplus food details with photos, quantity, and pickup window.',
                icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
                color: 'stat-green',
              },
              {
                step: '02',
                title: 'NGO Accepts',
                desc: 'Nearby NGOs browse available donations and accept them. Our AI system recommends the best volunteer for pickup.',
                icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                color: 'stat-blue',
              },
              {
                step: '03',
                title: 'Food Delivered',
                desc: 'Volunteers pick up the food and deliver it to beneficiaries. Every step is tracked with OTP verification.',
                icon: 'M5 13l4 4L19 7',
                color: 'stat-orange',
              },
            ].map(({ step, title, desc, icon, color }) => (
              <div key={step} className={`glass-card ${color} relative overflow-hidden`}>
                <div className="absolute top-4 right-4 text-5xl font-black text-white/5">{step}</div>
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Platform <span className="gradient-text">Features</span></h2>
            <div className="section-divider max-w-xs mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z', title: 'Photo Verification', desc: 'Proof photos at pickup and delivery ensure accountability.' },
              { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', title: 'Real-time Alerts', desc: 'Push notifications keep everyone updated at every step.' },
              { icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z', title: 'AI Volunteer Matching', desc: 'XGBoost model ranks volunteers by proximity, rating, and capacity.' },
              { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', title: 'OTP Security', desc: 'Two-factor authentication protects every critical action.' },
              { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', title: 'Role-based Access', desc: 'Separate portals for donors, NGOs, volunteers, and admins.' },
              { icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', title: 'Campaigns', desc: 'NGOs can run donation campaigns with goals and progress tracking.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="glass-card glass-hover p-5">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                  </svg>
                </div>
                <h4 className="font-bold text-white mb-2">{title}</h4>
                <p className="text-sm text-white/55 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center glass-card stat-green p-12">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Make a Difference?</h2>
          <p className="text-white/60 mb-8 text-lg">Join thousands of donors, NGOs, and volunteers already using MealNexus to fight food waste and hunger.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/register" className="btn-glow px-8 py-3.5 text-base">Create Free Account</Link>
            <Link to="/login" className="btn-ghost px-8 py-3.5 text-base">Sign In</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 glass border-t border-white/10 py-8 px-8 text-center" style={{ borderRadius: 0, background: 'rgba(0,0,0,0.3)' }}>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">MN</span>
          </div>
          <span className="font-bold text-white">MealNexus</span>
        </div>
        <p className="text-white/40 text-sm">© 2026 MealNexus — Built for Social Good</p>
      </footer>
    </div>
  );
};

export default Landing;
