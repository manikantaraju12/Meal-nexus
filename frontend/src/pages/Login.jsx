import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { otpAPI } from '../utils/api';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [step, setStep] = useState('credentials');
  const [tempToken, setTempToken] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCodeReceived, setOtpCodeReceived] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const { login, verifyLoginOtp } = useAuth();
  const navigate = useNavigate();

  const redirectByRole = (role) => {
    const routes = { donor: '/donor/dashboard', ngo: '/ngo/dashboard', volunteer: '/volunteer/dashboard', admin: '/admin/dashboard' };
    navigate(routes[role] || '/');
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(formData.email, formData.password);
      if (data.requiresOtp) {
        setTempToken(data.tempToken);
        setPhone(data.phone);
        setStep('otp');
        // Auto-send OTP immediately
        try {
          const res = await otpAPI.send({ phone: data.phone, purpose: 'login' });
          setOtpSent(true);
          if (res.data?.code) setOtpCodeReceived(res.data.code);
        } catch {}
      } else {
        redirectByRole(data.user.role);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const handleSendOtp = async () => {
    setOtpLoading(true);
    setError('');
    try {
      const res = await otpAPI.send({ phone, purpose: 'login' });
      setOtpSent(true);
      if (res.data?.code) setOtpCodeReceived(res.data.code);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setOtpLoading(true);
    try {
      const data = await verifyLoginOtp(tempToken, otpCode);
      redirectByRole(data.user.role);
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Orbs */}
      <div className="orb w-96 h-96" style={{ top: '-4rem', left: '-4rem', background: 'radial-gradient(circle, #10b981, transparent)' }} />
      <div className="orb w-64 h-64" style={{ bottom: '2rem', right: '2rem', background: 'radial-gradient(circle, #0d9488, transparent)', animationDelay: '4s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <span className="text-white font-bold text-lg">MN</span>
              </div>
              <span className="text-2xl font-bold text-white">MealNexus</span>
            </Link>
            <h2 className="text-xl font-bold text-white">
              {step === 'credentials' ? 'Welcome back' : 'Verify your identity'}
            </h2>
            <p className="text-white/50 text-sm mt-1">
              {step === 'credentials' ? 'Sign in to your account' : `OTP sent to ${phone}`}
            </p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl border text-sm" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="glass-input"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="glass-input"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="btn-glow w-full mt-2">
                Sign In
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {import.meta.env.DEV && otpCodeReceived && (
                <div className="px-4 py-3 rounded-xl text-center text-sm font-mono" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#6ee7b7' }}>
                  Dev OTP: <strong className="text-emerald-300">{otpCodeReceived}</strong>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">6-digit OTP</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="glass-input text-center text-3xl tracking-[0.5em] font-mono"
                  placeholder="------"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading || otpCode.length !== 6}
                className="btn-glow w-full"
              >
                {otpLoading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpLoading}
                className="btn-ghost w-full"
              >
                {otpSent ? 'Resend OTP' : 'Send OTP'}
              </button>

              {!otpSent && (
                <p className="text-xs text-white/40 text-center">Click "Send OTP" to receive the code on your phone</p>
              )}

              <button
                type="button"
                onClick={() => setStep('credentials')}
                className="w-full text-sm text-white/50 hover:text-white/80 transition pt-1"
              >
                ← Back to login
              </button>
            </form>
          )}

          {step === 'credentials' && (
            <p className="text-center text-sm text-white/50 mt-6">
              No account?{' '}
              <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition">
                Create one
              </Link>
            </p>
          )}
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

export default Login;
