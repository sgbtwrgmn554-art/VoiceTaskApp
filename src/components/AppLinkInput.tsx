import React, { useState, useRef } from 'react';
import { searchApps, getAppFromUrl, openLink } from '../utils/appLinks';

interface Props {
  value: string;
  onChange: (url: string) => void;
  accentColor: string;
}

export function LinkBadge({ url, accentColor }: { url: string; accentColor: string }) {
  const app = getAppFromUrl(url);
  return (
    <button
      onClick={e => { e.stopPropagation(); openLink(url); }}
      title={app?.name || 'פתח קישור'}
      className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-all active:scale-90"
      style={{ background: accentColor + '22', border: `1px solid ${accentColor}44` }}
    >
      {app ? (
        <span className="text-sm leading-none">{app.emoji}</span>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </svg>
      )}
    </button>
  );
}

export default function AppLinkInput({ value, onChange, accentColor }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const app = getAppFromUrl(value);

  const selectApp = (scheme: string) => {
    onChange(scheme);
    setOpen(false);
    setQuery('');
  };

  const clearValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
  };

  const saveCustomUrl = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const url = trimmed.match(/^https?:\/\/|^tel:|^mailto:|^facetime:|^calshow:|^waze:/)
      ? trimmed
      : 'https://' + trimmed;
    onChange(url);
    setOpen(false);
    setQuery('');
  };

  const suggestions = searchApps(query);
  const isTypingUrl = query.trim().length > 0 && suggestions.length === 0;

  // Closed + empty → show "add" prompt
  if (!open && !value) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 60); }}
        className="w-full flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-gray-500 transition-colors active:bg-white/5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </svg>
        <span>הוסף קישור / אפליקציה</span>
        <svg className="mr-auto opacity-40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    );
  }

  // Closed + value → show selected app/link
  if (!open && value) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 fade-up"
        style={{ background: accentColor + '12', border: `1px solid ${accentColor}33` }}
      >
        <span className="text-xl flex-shrink-0">{app?.emoji || '🔗'}</span>
        <span className="text-sm text-white flex-1 truncate font-medium">
          {app ? app.nameHe : (value.length > 32 ? value.slice(0, 32) + '…' : value)}
        </span>
        <button
          onClick={() => openLink(value)}
          className="text-xs px-3 py-1.5 rounded-xl font-bold flex-shrink-0 transition-all active:scale-95"
          style={{ background: accentColor, color: '#000' }}
        >
          פתח
        </button>
        <button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 60); }}
          className="opacity-40 hover:opacity-80 transition-opacity flex-shrink-0"
          title="ערוך"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5l3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button onClick={clearValue} className="opacity-40 hover:opacity-80 transition-opacity flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    );
  }

  // Open → search mode
  return (
    <div className="rounded-2xl overflow-hidden fade-up" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}>
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') saveCustomUrl();
            if (e.key === 'Escape') { setOpen(false); setQuery(''); }
          }}
          placeholder="שם אפליקציה או קישור (https://...)"
          dir="rtl"
          autoFocus
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-600"
        />
        <button onClick={() => { setOpen(false); setQuery(''); }} className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* App grid */}
      {suggestions.length > 0 && (
        <div className="grid grid-cols-4 gap-2 p-3">
          {suggestions.map(a => (
            <button
              key={a.name}
              onClick={() => selectApp(a.scheme)}
              className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-[10px] text-gray-400 text-center leading-tight">{a.nameHe}</span>
            </button>
          ))}
        </div>
      )}

      {/* Custom URL confirm */}
      {isTypingUrl && (
        <div className="px-3 pb-3">
          <button
            onClick={saveCustomUrl}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-black transition-all active:scale-95"
            style={{ background: accentColor }}
          >
            שמור קישור ✓
          </button>
        </div>
      )}

      {!isTypingUrl && suggestions.length === 0 && (
        <div className="px-4 py-4 text-center">
          <p className="text-xs text-gray-600">הדבק קישור ישיר כמו https://... ולחץ Enter</p>
        </div>
      )}
    </div>
  );
}
