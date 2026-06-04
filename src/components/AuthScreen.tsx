import React, { useState } from 'react';

interface Props {
  onAuth: (email: string, password: string, isRegister: boolean) => Promise<void>;
}

export default function AuthScreen({ onAuth }: Props) {
  const [isRegister, setIsRegister] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('יש למלא אימייל וסיסמה');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onAuth(email.trim(), password, isRegister);
    } catch (e: any) {
      setError(e.message || 'שגיאה, נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-black px-6">
      <div className="w-full max-w-sm bg-gray-900 rounded-3xl p-8 fade-up" style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <span className="text-5xl mb-3">🎤</span>
          <h1 className="text-2xl font-bold text-white">VoiceTask</h1>
          <p className="text-gray-500 text-sm mt-1">ניהול משימות חכם בעברית</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/60 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm text-center mb-4">
            {error}
          </div>
        )}

        {/* Email */}
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="אימייל"
          dir="ltr"
          className="w-full bg-gray-800 text-white rounded-2xl px-4 py-3.5 text-sm outline-none border border-transparent focus:border-gray-600 mb-3 text-center"
        />

        {/* Password */}
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="סיסמה"
          dir="ltr"
          className="w-full bg-gray-800 text-white rounded-2xl px-4 py-3.5 text-sm outline-none border border-transparent focus:border-gray-600 mb-4 text-center"
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base transition-opacity disabled:opacity-60"
          style={{ background: '#2563eb' }}
        >
          {loading ? '...' : isRegister ? 'הירשם' : 'התחבר'}
        </button>

        {/* Toggle */}
        <button
          onClick={() => { setIsRegister(!isRegister); setError(''); }}
          className="w-full text-center mt-4 text-sm"
          style={{ color: '#2563eb' }}
        >
          {isRegister ? 'יש חשבון? התחבר' : 'אין חשבון? הירשם'}
        </button>
      </div>
    </div>
  );
}
