import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'donor', label: 'Donor', desc: 'Donate surplus food', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30' },
  { value: 'ngo', label: 'NGO', desc: 'Receive & distribute', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30' },
  { value: 'volunteer', label: 'Volunteer', desc: 'Pick up & deliver', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-orange-500/20 to-amber-500/10 border-orange-500/30' },
];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', countryCode: '+91',
    password: '', confirmPassword: '', role: '',
    address: { street: '', city: '', state: '', pincode: '' },
    organization: { name: '', type: '' }
  });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));
  const setAddr = (field, val) => setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: val } }));
  const setOrg = (field, val) => setFormData(prev => ({ ...prev, organization: { ...prev.organization, [field]: val } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');

    const fullPhone = formData.phone ? `${formData.countryCode}${formData.phone}` : formData.phone;
    try {
      const data = await register({
        name: formData.name, email: formData.email,
        phone: fullPhone, password: formData.password,
        role: formData.role, address: formData.address,
        organization: formData.organization.name ? formData.organization : undefined
      });
      const routes = { donor: '/donor/dashboard', ngo: '/ngo/dashboard', volunteer: '/volunteer/dashboard' };
      navigate(routes[data.user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="orb w-96 h-96" style={{ top: '-4rem', right: '-4rem', background: 'radial-gradient(circle, #10b981, transparent)' }} />
      <div className="orb w-64 h-64" style={{ bottom: '4rem', left: '2rem', background: 'radial-gradient(circle, #0d9488, transparent)', animationDelay: '3s' }} />

      <div className="w-full max-w-lg relative z-10">
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <span className="text-white font-bold text-lg">MN</span>
              </div>
              <span className="text-2xl font-bold text-white">MealNexus</span>
            </Link>
            <h2 className="text-xl font-bold text-white">Create an account</h2>
            <p className="text-white/50 text-sm mt-1">Join the community fighting food waste</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl border text-sm" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selection */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-3">I am a...</label>
              <div className="grid grid-cols-3 gap-3">
                {ROLES.map(({ value, label, desc, icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('role', value)}
                    className={`glass-card bg-gradient-to-br ${color} p-3 text-center transition-all ${
                      formData.role === value ? 'ring-2 ring-emerald-400 scale-[1.03]' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <svg className="w-5 h-5 text-white mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                    </svg>
                    <div className="text-sm font-bold text-white">{label}</div>
                    <div className="text-xs text-white/50">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Full Name</label>
                <input type="text" value={formData.name} onChange={(e) => set('name', e.target.value)} className="glass-input" placeholder="Your name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
                <input type="email" value={formData.email} onChange={(e) => set('email', e.target.value)} className="glass-input" placeholder="you@example.com" required />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Phone Number</label>
              <div className="flex gap-2">
                <select
                  value={formData.countryCode}
                  onChange={(e) => set('countryCode', e.target.value)}
                  className="glass-select"
                  style={{ width: '7rem', flexShrink: 0 }}
                >
                  <option value="+91">+91 IN</option>
                  <option value="+1">+1 US</option>
                  <option value="+44">+44 UK</option>
                  <option value="+971">+971 UAE</option>
                  <option value="+65">+65 SG</option>
                  <option value="+61">+61 AU</option>
                </select>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 15))}
                  className="glass-input flex-1"
                  placeholder="9999999999"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Password</label>
                <input type="password" value={formData.password} onChange={(e) => set('password', e.target.value)} className="glass-input" placeholder="Create password" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Confirm Password</label>
                <input type="password" value={formData.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} className="glass-input" placeholder="Repeat password" required />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Address</label>
              <input type="text" value={formData.address.street} onChange={(e) => setAddr('street', e.target.value)} className="glass-input mb-2" placeholder="Street address" />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={formData.address.city} onChange={(e) => setAddr('city', e.target.value)} className="glass-input" placeholder="City" />
                <input type="text" value={formData.address.state} onChange={(e) => setAddr('state', e.target.value)} className="glass-input" placeholder="State" />
                <input type="text" value={formData.address.pincode} onChange={(e) => setAddr('pincode', e.target.value)} className="glass-input" placeholder="Pincode" />
              </div>
            </div>

            {(formData.role === 'donor' || formData.role === 'ngo') && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Organization (Optional)</label>
                <input
                  type="text"
                  value={formData.organization.name}
                  onChange={(e) => setOrg('name', e.target.value)}
                  className="glass-input"
                  placeholder="Organization name"
                />
              </div>
            )}

            <button type="submit" disabled={!formData.role} className="btn-glow w-full mt-2">
              Create Account
            </button>
          </form>

          <p className="text-center text-sm text-white/50 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition">
              Sign in
            </Link>
          </p>
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-white/40 hover:text-white/70 transition">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
