import React, { useState } from 'react';

interface Props {
  onAuth: (email: string, password: string, isRegister: boolean) => Promise<void>;
}

export default function AuthScreen({ onAuth }: Props) {
  const [isRegister, setIsRegister] = useState(true);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError('יש למלא אימייל וסיסמה'); return; }
    setError(''); setLoading(true);
    try { await onAuth(email.trim(), password, isRegister); }
    catch (e: any) { setError(e.message || 'שגיאה, נסה שוב'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex items-center justify-center h-full px-6" style={{ background: '#050508' }}>
      <div className="w-full max-w-sm fade-up" style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '28px',
        padding: '36px 28px',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <span className="text-5xl mb-3" style={{ filter: 'drop-shadow(0 4px 12px rgba(255,255,255,0.1))' }}>🎤</span>
          <h1 className="text-2xl font-bold tracking-tight">VoiceTask</h1>
          <p className="text-gray-500 text-sm mt-1.5">ניהול משימות חכם בעברית</p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl px-4 py-3 text-sm text-center mb-4 fade-up"
               style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {/* Inputs */}
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="אימייל" dir="ltr"
          className="w-full text-white text-sm rounded-2xl px-4 py-3.5 mb-3 outline-none text-center"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />

        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="סיסמה" dir="ltr"
          className="w-full text-white text-sm rounded-2xl px-4 py-3.5 mb-5 outline-none text-center"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-50"
          style={{ background: '#2563eb', boxShadow: '0 6px 20px rgba(37,99,235,0.4)' }}>
          {loading ? '...' : isRegister ? 'הירשם' : 'התחבר'}
        </button>

        <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
          className="w-full text-center mt-4 text-sm transition-colors hover:opacity-80"
          style={{ color: '#3b82f6' }}>
          {isRegister ? 'יש חשבון? התחבר' : 'אין חשבון? הירשם'}
        </button>
      </div>
    </div>
  );
}
