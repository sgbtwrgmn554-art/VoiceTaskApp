import React from 'react';
import { ThemeColor } from '../types';

interface Props {
  theme: ThemeColor;
  onThemeChange: (t: ThemeColor) => void;
  accentColor: string;
}

const THEMES: { value: ThemeColor; label: string; color: string }[] = [
  { value: 'orange', label: 'כתום',  color: '#f97316' },
  { value: 'green',  label: 'ירוק',  color: '#22c55e' },
  { value: 'purple', label: 'סגול',  color: '#a855f7' },
  { value: 'blue',   label: 'כחול',  color: '#3b82f6' },
];

export default function ProfileScreen({ theme, onThemeChange, accentColor }: Props) {
  return (
    <div className="flex flex-col h-full bg-black px-4 pt-4 scroll-y">
      <h2 className="text-center font-bold text-lg mb-6">פרופיל</h2>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8 fade-up">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-3"
             style={{ background: '#1f2937' }}>
          👤
        </div>
        <p className="text-gray-400 text-sm">משתמש VoiceTask</p>
      </div>

      {/* Color theme */}
      <div className="bg-gray-900 rounded-2xl p-4 mb-4 fade-up">
        <p className="text-sm font-medium mb-4">🎨 ערכת צבעים</p>
        <div className="grid grid-cols-4 gap-3">
          {THEMES.map(t => (
            <button
              key={t.value}
              onClick={() => onThemeChange(t.value)}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all"
              style={theme === t.value
                ? { borderColor: t.color, background: t.color + '22' }
                : { borderColor: '#374151', background: 'transparent' }}
            >
              <span className="w-6 h-6 rounded-full" style={{ background: t.color }} />
              <span className="text-xs text-gray-300">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden fade-up">
        {[
          { icon: '🔔', label: 'התראות' },
          { icon: '🌐', label: 'שפה' },
          { icon: '🔒', label: 'פרטיות' },
          { icon: 'ℹ️', label: 'אודות VoiceTask' },
        ].map((item, i) => (
          <button key={item.label}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-200 hover:bg-gray-800 transition-colors ${i > 0 ? 'border-t border-gray-800' : ''}`}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
            <svg className="mr-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
