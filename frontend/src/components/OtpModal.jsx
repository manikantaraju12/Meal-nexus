import { useState } from 'react';
import { otpAPI } from '../utils/api';

const OtpModal = ({ phone, purpose, onVerified, onCancel, title = 'Verify OTP' }) => {
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [receivedCode, setReceivedCode] = useState('');

  const handleSend = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await otpAPI.send({ phone, purpose });
      setSent(true);
      if (res.data?.code) setReceivedCode(res.data.code);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await otpAPI.verify({ phone, purpose, code: otpCode });
      if (res.data.success) onVerified();
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-card w-full max-w-sm p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-white/50 text-sm mt-1">
            Enter the 6-digit OTP sent to <span className="text-white/80">{phone}</span>
          </p>
        </div>

        {import.meta.env.DEV && receivedCode && (
          <div className="mb-4 px-4 py-3 rounded-xl text-center text-sm font-mono" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#6ee7b7' }}>
            Dev OTP: <strong className="text-emerald-300">{receivedCode}</strong>
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-3">
          <input
            type="text"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="glass-input text-center text-3xl tracking-[0.5em] font-mono"
            placeholder="------"
            maxLength={6}
            required
            autoFocus
          />

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="btn-glow w-full"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleSend}
          disabled={loading}
          className="btn-ghost w-full mt-3"
        >
          {sent ? 'Resend OTP' : 'Send OTP'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="w-full mt-3 text-sm text-white/40 hover:text-white/70 transition py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default OtpModal;
