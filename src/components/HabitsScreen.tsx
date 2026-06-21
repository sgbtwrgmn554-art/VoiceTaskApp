import React, { useState, useEffect } from 'react';
import { Habit, ReflectionEntry } from '../types';
import { todayStr } from '../hooks/useHabits';
import AppLinkInput, { LinkBadge } from './AppLinkInput';

const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MOODS = ['😔', '😐', '🙂', '😊', '🤩'];
const DEFAULT_EMOJIS = ['💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '✍️', '🎯', '🎨', '🎸', '💻'];
const DEFAULT_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ec4899', '#14b8a6', '#ef4444', '#eab308'];

interface Props {
  habits: Habit[];
  todayReflection: ReflectionEntry | null;
  isDoneToday: (id: string) => boolean;
  streak: (id: string) => number;
  onToggle: (id: string) => boolean;
  onAddHabit: (data: Omit<Habit, 'id' | 'createdAt'>) => void;
  onDeleteHabit: (id: string) => void;
  onAddReflection: (data: Omit<ReflectionEntry, 'id' | 'createdAt'>) => void;
  accentColor: string;
}

export default function HabitsScreen({
  habits, todayReflection, isDoneToday, streak, onToggle, onAddHabit, onDeleteHabit, onAddReflection, accentColor
}: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    const justDone = onToggle(id);
    if (justDone) {
      setCelebrate(id);
      setTimeout(() => setCelebrate(null), 1200);
    }
  };

  const doneCount = habits.filter(h => isDoneToday(h.id)).length;
  const allDone = habits.length > 0 && doneCount === habits.length;

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold">הרגלים</h1>
          <span className="text-xs text-gray-500">{new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>

        {/* Progress bar */}
        {habits.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{allDone ? '🎉 כל ההרגלים הושלמו!' : `${doneCount} מתוך ${habits.length} היום`}</span>
              <span>{Math.round((doneCount / habits.length) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / habits.length) * 100}%`, background: accentColor }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 scroll-y px-4 pb-4">
        {/* Habit list */}
        {habits.length === 0 ? (
          <div className="text-center mt-16 fade-up">
            <div className="text-5xl mb-3">💪</div>
            <p className="text-gray-400 font-medium">אין הרגלים עדיין</p>
            <p className="text-sm text-gray-600 mt-1">הוסף הרגל ראשון להתחיל</p>
          </div>
        ) : (
          <div className="space-y-2 mt-1">
            {habits.map((h, i) => {
              const done = isDoneToday(h.id);
              const s = streak(h.id);
              const isCelebrating = celebrate === h.id;
              return (
                <div
                  key={h.id}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 fade-up relative overflow-hidden"
                  style={{
                    background: done ? h.color + '18' : '#161616',
                    border: `1px solid ${done ? h.color + '40' : 'rgba(255,255,255,0.06)'}`,
                    animationDelay: `${i * 0.04}s`,
                  }}
                >
                  {isCelebrating && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-3xl scale-pop">✨</span>
                    </div>
                  )}
                  {/* Emoji */}
                  <span className="text-2xl flex-shrink-0">{h.emoji}</span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${done ? 'text-gray-400' : 'text-white'}`}>{h.title}</p>
                    {s > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: h.color }}>🔥 {s} יום ברצף</p>
                    )}
                  </div>

                  {/* Link badge */}
                  {h.url && <LinkBadge url={h.url} accentColor={h.color} />}

                  {/* Delete */}
                  <button onClick={() => onDeleteHabit(h.id)} className="opacity-20 hover:opacity-60 transition-opacity px-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>

                  {/* Check button */}
                  <button
                    onClick={() => handleToggle(h.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 active:scale-90"
                    style={{
                      background: done ? h.color : 'transparent',
                      border: `2px solid ${done ? h.color : 'rgba(255,255,255,0.2)'}`,
                    }}
                  >
                    {done && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" className="scale-pop">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Week mini-calendar for each habit */}
        {habits.length > 0 && <WeekGrid habits={habits} isDoneToday={isDoneToday} accentColor={accentColor} />}

        {/* Reflection card */}
        <div className="mt-4 rounded-2xl p-4 fade-up"
          style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">🪞 רפלקציה יומית</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {todayReflection ? '✓ מילאת היום' : 'כמה שאלות לסוף היום'}
              </p>
            </div>
            <button
              onClick={() => setShowReflection(true)}
              className="text-xs px-3 py-1.5 rounded-xl transition-all active:scale-90"
              style={{ background: accentColor + '22', color: accentColor, border: `1px solid ${accentColor}40` }}
            >
              {todayReflection ? 'עריכה' : 'התחל'}
            </button>
          </div>
          {todayReflection && (
            <div className="mt-3 space-y-1.5 text-xs text-gray-500 border-t border-white/5 pt-3">
              <p>🙏 {todayReflection.gratitude}</p>
              <p>💡 {todayReflection.learning}</p>
              <p>🎯 {todayReflection.tomorrowFocus}</p>
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>

      {/* Add habit FAB */}
      <div className="px-4 pb-3 flex-shrink-0">
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: accentColor + '22', color: accentColor, border: `1px solid ${accentColor}40` }}
        >
          + הוסף הרגל
        </button>
      </div>

      {showAdd && (
        <AddHabitModal
          accentColor={accentColor}
          onAdd={(data) => { onAddHabit(data); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showReflection && (
        <ReflectionModal
          accentColor={accentColor}
          existing={todayReflection}
          onSave={(data) => { onAddReflection(data); setShowReflection(false); }}
          onClose={() => setShowReflection(false)}
        />
      )}
    </div>
  );
}

function WeekGrid({ habits, isDoneToday, accentColor }: { habits: Habit[]; isDoneToday: (id: string) => boolean; accentColor: string }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const stored: { [key: string]: boolean } = {};
  try {
    const raw = localStorage.getItem('voicetask_habit_logs');
    if (raw) {
      const logs: { habitId: string; date: string }[] = JSON.parse(raw);
      logs.forEach(l => { stored[`${l.habitId}::${l.date}`] = true; });
    }
  } catch { /* ignore */ }

  return (
    <div className="mt-4 rounded-2xl p-4" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-xs text-gray-500 mb-3">שבוע אחרון</p>
      {/* Day headers */}
      <div className="grid grid-cols-8 gap-1 mb-2">
        <div />
        {days.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-gray-600">{DAYS_HE[d.getDay()]}</div>
        ))}
      </div>
      {/* Habit rows */}
      {habits.slice(0, 5).map(h => (
        <div key={h.id} className="grid grid-cols-8 gap-1 mb-1.5 items-center">
          <span className="text-base">{h.emoji}</span>
          {days.map((d, i) => {
            const ds = d.toISOString().split('T')[0];
            const isToday = ds === todayStr();
            const done = isToday ? isDoneToday(h.id) : stored[`${h.id}::${ds}`];
            return (
              <div key={i} className="h-5 rounded-md mx-auto w-5"
                style={{
                  background: done ? h.color : 'rgba(255,255,255,0.04)',
                  border: isToday ? `1px solid ${h.color}60` : 'none',
                  opacity: done ? 1 : 0.5,
                }} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function AddHabitModal({ accentColor, onAdd, onClose }: {
  accentColor: string;
  onAdd: (data: Omit<Habit, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}) {
  const [title, setTitle]     = useState('');
  const [emoji, setEmoji]     = useState('💪');
  const [color, setColor]     = useState(accentColor);
  const [freq, setFreq]       = useState<'daily' | 'weekly'>('daily');
  const [days, setDays]       = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [url, setUrl]         = useState('');

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), emoji, color, frequency: freq, targetDays: freq === 'daily' ? [0,1,2,3,4,5,6] : days, url: url || undefined });
  };

  const toggleDay = (d: number) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-5 pb-8 space-y-4" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
        <div className="w-8 h-1 rounded-full bg-gray-700 mx-auto mb-2" />
        <h2 className="text-base font-bold text-center">הרגל חדש</h2>

        {/* Emoji picker */}
        <div className="flex flex-wrap gap-2 justify-center">
          {DEFAULT_EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              className="text-xl w-9 h-9 rounded-xl transition-all"
              style={{ background: emoji === e ? accentColor + '33' : 'rgba(255,255,255,0.05)', border: emoji === e ? `1px solid ${accentColor}` : 'none' }}>
              {e}
            </button>
          ))}
        </div>

        {/* Title */}
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="שם ההרגל..."
          dir="rtl"
          className="w-full bg-black/30 rounded-xl px-4 py-3 text-sm outline-none border border-white/10 text-white placeholder-gray-600"
          autoFocus
        />

        {/* Color */}
        <div className="flex gap-2 justify-center">
          {DEFAULT_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full transition-all"
              style={{ background: c, border: color === c ? '2px solid white' : '2px solid transparent' }} />
          ))}
        </div>

        {/* Frequency */}
        <div className="flex gap-2">
          {(['daily', 'weekly'] as const).map(f => (
            <button key={f} onClick={() => setFreq(f)}
              className="flex-1 py-2 rounded-xl text-sm transition-all"
              style={{ background: freq === f ? accentColor + '22' : 'rgba(255,255,255,0.05)', color: freq === f ? accentColor : '#9ca3af', border: freq === f ? `1px solid ${accentColor}40` : 'none' }}>
              {f === 'daily' ? 'יומי' : 'שבועי'}
            </button>
          ))}
        </div>

        {freq === 'weekly' && (
          <div className="flex gap-1 justify-center">
            {DAYS_HE.map((d, i) => (
              <button key={i} onClick={() => toggleDay(i)}
                className="w-9 h-9 rounded-xl text-xs font-medium transition-all"
                style={{ background: days.includes(i) ? accentColor : 'rgba(255,255,255,0.05)', color: days.includes(i) ? '#000' : '#9ca3af' }}>
                {d}
              </button>
            ))}
          </div>
        )}

        {/* App / Link */}
        <AppLinkInput value={url} onChange={setUrl} accentColor={accentColor} />

        <button onClick={submit}
          className="w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
          style={{ background: accentColor, color: '#000' }}>
          הוסף
        </button>
      </div>
    </div>
  );
}

function ReflectionModal({ accentColor, existing, onSave, onClose }: {
  accentColor: string;
  existing: ReflectionEntry | null;
  onSave: (data: Omit<ReflectionEntry, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}) {
  const [gratitude, setGratitude]       = useState(existing?.gratitude ?? '');
  const [learning, setLearning]         = useState(existing?.learning ?? '');
  const [tomorrowFocus, setTomorrowFocus] = useState(existing?.tomorrowFocus ?? '');
  const [mood, setMood]                 = useState<1|2|3|4|5>(existing?.mood ?? 3);

  const submit = () => {
    if (!gratitude.trim() && !learning.trim() && !tomorrowFocus.trim()) return;
    onSave({ date: todayStr(), gratitude, learning, tomorrowFocus, mood });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-5 pb-8 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-8 h-1 rounded-full bg-gray-700 mx-auto mb-2" />
        <h2 className="text-base font-bold text-center">🪞 רפלקציה — {new Date().toLocaleDateString('he-IL', { weekday: 'long' })}</h2>

        {/* Mood */}
        <div>
          <p className="text-xs text-gray-500 mb-2 text-right">איך היה היום?</p>
          <div className="flex justify-center gap-3">
            {MOODS.map((m, i) => (
              <button key={i} onClick={() => setMood((i + 1) as 1|2|3|4|5)}
                className="text-2xl transition-all"
                style={{ opacity: mood === i + 1 ? 1 : 0.35, transform: mood === i + 1 ? 'scale(1.3)' : 'none' }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {[
          { label: '🙏 על מה אני אסיר תודה היום?', value: gratitude, set: setGratitude },
          { label: '💡 מה למדתי היום?', value: learning, set: setLearning },
          { label: '🎯 מה המיקוד שלי מחר?', value: tomorrowFocus, set: setTomorrowFocus },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <p className="text-xs text-gray-500 mb-1.5 text-right">{label}</p>
            <textarea
              value={value} onChange={e => set(e.target.value)}
              rows={2} dir="rtl"
              className="w-full bg-black/30 rounded-xl px-3 py-2.5 text-sm outline-none border border-white/10 text-white placeholder-gray-700 resize-none"
              placeholder="כתוב כאן..."
            />
          </div>
        ))}

        <button onClick={submit}
          className="w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
          style={{ background: accentColor, color: '#000' }}>
          שמור
        </button>
      </div>
    </div>
  );
}
