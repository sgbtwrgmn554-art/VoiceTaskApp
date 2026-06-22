import React, { useState, useRef } from 'react';
import { AppSettings, LifeDomain, ThemeColor, Task, Habit, HabitLog, Goal, ReflectionEntry, JarvisMode, AppearanceLevel, VoiceShortcut } from '../types';
import { clearAllData } from '../utils/storage';

interface Props {
  settings: AppSettings;
  accentColor: string;
  tasks?: Task[];
  habits?: Habit[];
  habitLogs?: HabitLog[];
  goals?: Goal[];
  reflections?: ReflectionEntry[];
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onAddCategory: (name: string) => void;
  onRemoveCategory: (name: string) => void;
  onRenameCategory: (old: string, next: string) => void;
  onAddDomain: (d: Omit<LifeDomain, 'id'>) => void;
  onUpdateDomain: (id: string, patch: Partial<Omit<LifeDomain, 'id'>>) => void;
  onRemoveDomain: (id: string) => void;
  onThemeChange: (t: ThemeColor) => void;
  onLogout: () => void;
  onOpenGuide?: () => void;
  onAddShortcut: (sc: Omit<VoiceShortcut, 'id'>) => void;
  onRemoveShortcut: (id: string) => void;
}

const THEMES: { value: ThemeColor; label: string; color: string }[] = [
  { value: 'green',  label: 'ירוק',    color: '#22c55e' },
  { value: 'blue',   label: 'כחול',    color: '#3b82f6' },
  { value: 'purple', label: 'סגול',    color: '#a855f7' },
  { value: 'orange', label: 'כתום',    color: '#f97316' },
  { value: 'pink',   label: 'ורוד',    color: '#ec4899' },
  { value: 'teal',   label: 'טורקיז',  color: '#14b8a6' },
  { value: 'red',    label: 'אדום',    color: '#ef4444' },
  { value: 'yellow', label: 'צהוב',    color: '#eab308' },
];

const PRIORITY_LABELS: Record<string, string> = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה' };
const SORT_LABELS: Record<string, string> = {
  createdAt: 'תאריך יצירה', priority: 'עדיפות', dueDate: 'תאריך יעד', title: 'שם',
};
const AI_LANG_LABELS: Record<string, string> = { hebrew: 'עברית', english: 'אנגלית', auto: 'אוטומטי' };
const AI_STYLE_LABELS: Record<string, string> = { brief: 'קצר וממוקד', detailed: 'מפורט ומלא' };
const CHAT_LIMIT_OPTIONS = [
  { value: 50, label: '50 הודעות' },
  { value: 100, label: '100 הודעות' },
  { value: 200, label: '200 הודעות' },
  { value: 0, label: 'ללא הגבלה' },
];

const DOMAIN_COLORS = [
  '#3b82f6', '#22c55e', '#ec4899', '#f59e0b',
  '#a855f7', '#f97316', '#06b6d4', '#84cc16',
  '#ef4444', '#14b8a6', '#eab308', '#8b5cf6',
];

const DOMAIN_EMOJIS = [
  '💼', '💪', '❤️', '💰', '🌱', '👨‍👩‍👧', '👥', '🎨',
  '📚', '🏠', '✈️', '🎵', '🧠', '💻', '🏋️', '🍎',
  '🎯', '🌍', '🤝', '⭐', '🎓', '🚀', '💡', '🛡️',
];

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-3 mt-6">
      <span className="text-base">{emoji}</span>
      <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">{title}</span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden mb-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  );
}

function Row({
  label, hint, children, divider = true,
}: { label: string; hint?: string; children: React.ReactNode; divider?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3.5 ${divider ? 'border-b' : ''}`}
         style={divider ? { borderColor: 'rgba(255,255,255,0.06)' } : {}}>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{label}</p>
        {hint && <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-12 h-6 rounded-full transition-all relative"
      style={{ background: value ? 'var(--accent, #22c55e)' : 'rgba(255,255,255,0.12)' }}>
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow"
        style={{ right: value ? '2px' : 'calc(100% - 22px)' }}
      />
    </button>
  );
}

function ChipSelect<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap justify-end">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="px-3 py-1 rounded-full text-xs font-medium transition-all"
          style={value === o.value
            ? { background: 'var(--accent, #22c55e)', color: '#000' }
            : { background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatsSection({ tasks = [], habits = [], habitLogs = [], goals = [], reflections = [], accentColor }: {
  tasks?: Task[]; habits?: Habit[]; habitLogs?: HabitLog[];
  goals?: Goal[]; reflections?: ReflectionEntry[]; accentColor: string;
}) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const doneTasks = tasks.filter(t => t.status === 'done' && t.updatedAt >= weekAgo.toISOString()).length;
  const totalActive = tasks.filter(t => t.status !== 'done').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const totalGoals = goals.length;
  const goalPct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
  const weekReflections = reflections.filter(r => r.date >= weekAgoStr);
  const avgMood = weekReflections.length > 0
    ? (weekReflections.reduce((s, r) => s + r.mood, 0) / weekReflections.length).toFixed(1)
    : null;

  // 7-day task completion bar chart
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    const dayLabel = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'][d.getDay()];
    const count = tasks.filter(t => t.status === 'done' && t.updatedAt.startsWith(dayStr)).length;
    days.push({ label: dayLabel, count });
  }
  const maxCount = Math.max(...days.map(d => d.count), 1);

  // Habit streaks
  const topHabits = habits.slice(0, 3).map(h => {
    const logs7 = habitLogs.filter(l => l.habitId === h.id && l.date >= weekAgoStr);
    return { emoji: h.emoji, title: h.title, done: logs7.length };
  });

  const statItems = [
    { label: 'בוצעו השבוע', value: doneTasks, suffix: 'משימות' },
    { label: 'פתוחות', value: totalActive, suffix: 'משימות' },
    { label: 'יעדים', value: `${goalPct}%`, suffix: 'הושלמו' },
    { label: 'מצב רוח ממוצע', value: avgMood ?? '—', suffix: avgMood ? '/5' : '' },
  ];

  return (
    <div className="mb-2">
      <SectionHeader emoji="📊" title="סטטיסטיקות" />
      <div className="grid grid-cols-2 gap-2 mb-2">
        {statItems.map((s, i) => (
          <div key={i} className="rounded-2xl px-4 py-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[11px] text-gray-500 mb-0.5">{s.label}</p>
            <p className="text-xl font-bold text-white">{s.value}<span className="text-xs text-gray-500 font-normal ml-1">{s.suffix}</span></p>
          </div>
        ))}
      </div>

      {/* 7-day bar chart */}
      <div className="rounded-2xl px-4 py-3.5 mb-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-[11px] text-gray-500 mb-3">משימות לפי יום (7 ימים)</p>
        <div className="flex items-end justify-between gap-1 h-12">
          {days.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${Math.max(3, (d.count / maxCount) * 40)}px`,
                  background: d.count > 0 ? accentColor + 'cc' : 'rgba(255,255,255,0.08)',
                }}
              />
              <span className="text-[10px] text-gray-600">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Habit summary */}
      {topHabits.length > 0 && (
        <div className="rounded-2xl px-4 py-3.5 mb-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[11px] text-gray-500 mb-2">הרגלים השבוע</p>
          <div className="space-y-1.5">
            {topHabits.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-base">{h.emoji}</span>
                <span className="text-xs text-gray-300 flex-1 truncate">{h.title}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <div key={j} className="w-2.5 h-2.5 rounded-sm"
                      style={{ background: j < h.done ? accentColor + 'cc' : 'rgba(255,255,255,0.08)' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfileScreen({
  settings, accentColor,
  tasks, habits, habitLogs, goals, reflections,
  onUpdateSettings, onAddCategory, onRemoveCategory, onRenameCategory,
  onAddDomain, onUpdateDomain, onRemoveDomain,
  onThemeChange, onLogout, onOpenGuide,
  onAddShortcut, onRemoveShortcut,
}: Props) {
  const [newCat, setNewCat]               = useState('');
  const [editingCat, setEditingCat]       = useState<string | null>(null);
  const [editCatVal, setEditCatVal]       = useState('');
  const [newDomainLabel, setNewDomainLabel] = useState('');
  const [newDomainEmoji, setNewDomainEmoji] = useState('⭐');
  const [newDomainColor, setNewDomainColor] = useState('#a855f7');
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showAddShortcut, setShowAddShortcut] = useState(false);
  const [newScTrigger, setNewScTrigger]   = useState('');
  const [newScDesc, setNewScDesc]         = useState('');
  const [newScPrompt, setNewScPrompt]     = useState('');
  const newCatRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = {
      tasks: JSON.parse(localStorage.getItem('voicetask_tasks') || '[]'),
      goals: JSON.parse(localStorage.getItem('voicetask_goals') || '[]'),
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voicetask-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = () => {
    if (window.confirm('למחוק את כל הנתונים? פעולה זו אינה הפיכה.')) {
      clearAllData();
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col h-full bg-black" dir="rtl">
      <div className="flex-1 scroll-y px-4 pb-8" style={{ overflowY: 'auto' }}>

        {/* Header */}
        <div className="pt-5 pb-2">
          <h1 className="text-lg font-bold">הגדרות</h1>
          <p className="text-xs text-gray-500 mt-0.5">התאם את האפליקציה לעצמך</p>
        </div>

        <StatsSection
          tasks={tasks} habits={habits} habitLogs={habitLogs}
          goals={goals} reflections={reflections} accentColor={accentColor}
        />

        {/* ── TASKS ── */}
        <SectionHeader emoji="📋" title="משימות" />
        <Card>
          {/* Custom categories */}
          <div className="px-4 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-sm text-white mb-3">קטגוריות</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {settings.customCategories.map(cat => (
                <div key={cat} className="flex items-center gap-1">
                  {editingCat === cat ? (
                    <input
                      autoFocus
                      value={editCatVal}
                      onChange={e => setEditCatVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { onRenameCategory(cat, editCatVal); setEditingCat(null); }
                        if (e.key === 'Escape') setEditingCat(null);
                      }}
                      onBlur={() => { if (editCatVal.trim()) onRenameCategory(cat, editCatVal); setEditingCat(null); }}
                      className="text-xs px-2 py-1 rounded-full outline-none w-20"
                      style={{ background: accentColor + '22', border: `1px solid ${accentColor}`, color: '#fff' }}
                    />
                  ) : (
                    <button
                      onDoubleClick={() => { setEditingCat(cat); setEditCatVal(cat); }}
                      className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 group"
                      style={settings.defaultCategory === cat
                        ? { background: accentColor + '22', border: `1px solid ${accentColor}`, color: accentColor }
                        : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }}>
                      <span onClick={() => onUpdateSettings({ defaultCategory: cat })}>{cat}</span>
                      {settings.customCategories.length > 1 && (
                        <span
                          onClick={e => { e.stopPropagation(); onRemoveCategory(cat); }}
                          className="text-gray-600 hover:text-red-400 transition-colors leading-none"
                          style={{ fontSize: '10px' }}>
                          ✕
                        </span>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                ref={newCatRef}
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newCat.trim()) { onAddCategory(newCat.trim()); setNewCat(''); } }}
                placeholder="+ קטגוריה חדשה"
                className="flex-1 text-xs px-3 py-2 rounded-xl outline-none text-white placeholder-gray-600"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
              />
              <button
                onClick={() => { if (newCat.trim()) { onAddCategory(newCat.trim()); setNewCat(''); } }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-black"
                style={{ background: accentColor }}>
                הוסף
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-2">לחץ פעמיים על קטגוריה לעריכה • לחץ שם לברירת מחדל</p>
          </div>

          <Row label="עדיפות ברירת מחדל">
            <ChipSelect
              options={[
                { value: 'low', label: 'נמוכה' },
                { value: 'medium', label: 'בינונית' },
                { value: 'high', label: 'גבוהה' },
              ]}
              value={settings.defaultPriority}
              onChange={v => onUpdateSettings({ defaultPriority: v })}
            />
          </Row>

          <Row label="מיון משימות">
            <ChipSelect
              options={[
                { value: 'createdAt', label: 'תאריך' },
                { value: 'priority', label: 'עדיפות' },
                { value: 'dueDate', label: 'יעד' },
                { value: 'title', label: 'שם' },
              ]}
              value={settings.defaultSort}
              onChange={v => onUpdateSettings({ defaultSort: v })}
            />
          </Row>

          <Row label="הצג משימות שהושלמו" divider={false}>
            <Toggle value={settings.showCompleted} onChange={v => onUpdateSettings({ showCompleted: v })} />
          </Row>
        </Card>

        {/* ── REMINDERS ── */}
        <SectionHeader emoji="🔔" title="תזכורות" />
        <Card>
          <Row label="שעת תזכורת ברירת מחדל">
            <input
              type="time"
              value={settings.defaultReminderTime}
              onChange={e => onUpdateSettings({ defaultReminderTime: e.target.value })}
              className="text-sm text-white px-3 py-1.5 rounded-xl outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
            />
          </Row>
          <Row label="מספר WhatsApp" hint="לתזכורות בוואטסאפ" divider={false}>
            <input
              type="tel"
              value={settings.whatsappPhone}
              onChange={e => onUpdateSettings({ whatsappPhone: e.target.value })}
              placeholder="+972501234567"
              className="text-sm text-white px-3 py-1.5 rounded-xl outline-none w-40"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', direction: 'ltr' }}
            />
          </Row>
        </Card>

        {/* ── MORNING CHECK-IN ── */}
        <SectionHeader emoji="🌅" title="צ׳ק-אין בוקר" />
        <Card>
          <Row label="הפעל צ׳ק-אין יומי">
            <Toggle
              value={settings.morningCheckInEnabled}
              onChange={v => onUpdateSettings({ morningCheckInEnabled: v })}
            />
          </Row>
          <Row label="שעת צ׳ק-אין" divider={false}>
            <input
              type="time"
              value={settings.morningCheckInTime}
              onChange={e => onUpdateSettings({ morningCheckInTime: e.target.value })}
              disabled={!settings.morningCheckInEnabled}
              className="text-sm text-white px-3 py-1.5 rounded-xl outline-none disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
            />
          </Row>
        </Card>

        {/* ── GOALS / DOMAINS ── */}
        <SectionHeader emoji="🎯" title="תחומי חיים" />
        <Card>
          <div className="px-4 py-3">
            <div className="space-y-2">
              {settings.customDomains.map(domain => (
                <div key={domain.id} className="flex items-center gap-2">
                  {/* Emoji picker */}
                  <button
                    onClick={() => setShowEmojiPicker(showEmojiPicker === domain.id ? null : domain.id)}
                    className="text-xl w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.07)' }}>
                    {domain.emoji}
                  </button>

                  {/* Color dot */}
                  <div className="relative flex-shrink-0">
                    <button
                      className="w-5 h-5 rounded-full border-2 border-transparent"
                      style={{ background: domain.color }}
                      onClick={() => setEditingDomain(editingDomain === domain.id ? null : domain.id)}
                    />
                  </div>

                  {/* Label */}
                  {editingDomain === domain.id ? (
                    <input
                      autoFocus
                      defaultValue={domain.label}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          onUpdateDomain(domain.id, { label: (e.target as HTMLInputElement).value.trim() });
                          setEditingDomain(null);
                        }
                        if (e.key === 'Escape') setEditingDomain(null);
                      }}
                      onBlur={e => {
                        onUpdateDomain(domain.id, { label: e.target.value.trim() });
                        setEditingDomain(null);
                      }}
                      className="flex-1 text-sm text-white bg-transparent outline-none border-b pb-0.5"
                      style={{ borderColor: accentColor }}
                    />
                  ) : (
                    <button
                      onDoubleClick={() => setEditingDomain(domain.id)}
                      className="flex-1 text-sm text-white text-right"
                    >
                      {domain.label}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (settings.customDomains.length > 1) onRemoveDomain(domain.id);
                    }}
                    className="text-gray-600 hover:text-red-400 transition-colors text-lg w-7 text-center"
                  >
                    ×
                  </button>

                  {/* Emoji grid */}
                  {showEmojiPicker === domain.id && (
                    <div
                      className="absolute right-4 left-4 z-10 rounded-2xl p-3 grid grid-cols-8 gap-2 mt-1"
                      style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', top: 'auto' }}
                    >
                      {DOMAIN_EMOJIS.map(em => (
                        <button
                          key={em}
                          onClick={() => { onUpdateDomain(domain.id, { emoji: em }); setShowEmojiPicker(null); }}
                          className="text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
                          {em}
                        </button>
                      ))}
                      {/* Color picker row */}
                      <div className="col-span-8 flex flex-wrap gap-2 mt-1 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                        {DOMAIN_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => { onUpdateDomain(domain.id, { color: c }); setShowEmojiPicker(null); }}
                            className="w-6 h-6 rounded-full border-2 transition-all"
                            style={{ background: c, borderColor: domain.color === c ? '#fff' : 'transparent' }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add domain */}
            {showAddDomain ? (
              <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEmojiPicker(showEmojiPicker === 'new' ? null : 'new')}
                    className="text-xl w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.07)' }}>
                    {newDomainEmoji}
                  </button>
                  {showEmojiPicker === 'new' && (
                    <div className="absolute right-4 left-4 z-10 rounded-2xl p-3 grid grid-cols-8 gap-2"
                         style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)' }}>
                      {DOMAIN_EMOJIS.map(em => (
                        <button key={em} onClick={() => { setNewDomainEmoji(em); setShowEmojiPicker(null); }}
                          className="text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">
                          {em}
                        </button>
                      ))}
                      <div className="col-span-8 flex flex-wrap gap-2 mt-1 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                        {DOMAIN_COLORS.map(c => (
                          <button key={c} onClick={() => { setNewDomainColor(c); setShowEmojiPicker(null); }}
                            className="w-6 h-6 rounded-full border-2"
                            style={{ background: c, borderColor: newDomainColor === c ? '#fff' : 'transparent' }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <input
                    autoFocus
                    value={newDomainLabel}
                    onChange={e => setNewDomainLabel(e.target.value)}
                    placeholder="שם התחום"
                    className="flex-1 text-sm text-white px-3 py-2 rounded-xl outline-none"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (newDomainLabel.trim()) {
                        onAddDomain({ label: newDomainLabel.trim(), emoji: newDomainEmoji, color: newDomainColor });
                        setNewDomainLabel('');
                        setNewDomainEmoji('⭐');
                        setShowAddDomain(false);
                      }
                    }}
                    className="flex-1 py-2 rounded-xl text-sm font-bold text-black"
                    style={{ background: accentColor }}>
                    הוסף
                  </button>
                  <button
                    onClick={() => setShowAddDomain(false)}
                    className="px-4 py-2 rounded-xl text-sm text-gray-400"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddDomain(true)}
                className="mt-3 w-full py-2.5 rounded-xl text-sm text-gray-400 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)' }}>
                + הוסף תחום חיים
              </button>
            )}
            <p className="text-[10px] text-gray-600 mt-2">לחץ פעמיים על שם לעריכה • לחץ על אמוג׳י לשינוי צבע/אייקון</p>
          </div>
        </Card>

        {/* ── AI ── */}
        <SectionHeader emoji="🤖" title="בינה מלאכותית" />
        <Card>
          <Row label="שפת AI" hint="שפה שבה AI יענה לך">
            <ChipSelect
              options={[
                { value: 'hebrew', label: 'עברית' },
                { value: 'english', label: 'English' },
                { value: 'auto', label: 'אוטו' },
              ]}
              value={settings.aiLanguage}
              onChange={v => onUpdateSettings({ aiLanguage: v })}
            />
          </Row>

          <Row label="סגנון תשובות">
            <ChipSelect
              options={[
                { value: 'brief', label: 'קצר' },
                { value: 'detailed', label: 'מפורט' },
              ]}
              value={settings.aiStyle}
              onChange={v => onUpdateSettings({ aiStyle: v })}
            />
          </Row>

          <Row label="סיווג אוטומטי" hint="סווג הקלטה אוטומטית עם AI">
            <Toggle value={settings.autoClassify} onChange={v => onUpdateSettings({ autoClassify: v })} />
          </Row>

          <Row label="גבול היסטוריית שיחה" divider={false}>
            <ChipSelect
              options={CHAT_LIMIT_OPTIONS.map(o => ({ value: o.value as any, label: o.label }))}
              value={settings.chatHistoryLimit as any}
              onChange={v => onUpdateSettings({ chatHistoryLimit: Number(v) })}
            />
          </Row>
        </Card>

        {/* ── JARVIS PERSONALITY ── */}
        <SectionHeader emoji="🤖" title="אישיות J.A.R.V.I.S" />
        <Card>
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-500 mb-1">רמת אימון — איך JARVIS ידבר אליך</p>
            {([
              { value: 'drill',  icon: '🪖', name: 'סמל',     desc: 'אין תירוצים. כל דחייה = כישלון. ידחוף אותך ללא רחמים — מושלם אם אתה רוצה תוצאות בכוח.' },
              { value: 'coach',  icon: '🏋️', name: 'מאמן',    desc: 'נוקשה אבל הגיוני. מדחיף חזק, מאמין בך, מבין שיש ימים קשים אבל לא מקבל התמוטטות.' },
              { value: 'friend', icon: '🤝', name: 'חבר',     desc: 'ישיר ואמיתי. אומר את האמת בלי לחץ יתר, תומך ומקשיב. מאוזן ונוח.' },
              { value: 'gentle', icon: '🌱', name: 'מעודד',   desc: 'תמיד רואה את הטוב. מחזק כל התקדמות גם הקטנה. לא שופט לעולם. מתאים לימים קשים.' },
            ] as { value: JarvisMode; icon: string; name: string; desc: string }[]).map(opt => (
              <button key={opt.value} onClick={() => onUpdateSettings({ jarvisMode: opt.value })}
                className="w-full text-right p-3 rounded-2xl transition-all active:scale-[0.98]"
                style={{
                  background: settings.jarvisMode === opt.value ? accentColor + '18' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${settings.jarvisMode === opt.value ? accentColor : 'rgba(255,255,255,0.07)'}`,
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-sm font-bold" style={{ color: settings.jarvisMode === opt.value ? accentColor : '#e5e7eb' }}>{opt.name}</span>
                  {settings.jarvisMode === opt.value && <span className="text-xs ml-auto" style={{ color: accentColor }}>✓ פעיל</span>}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{opt.desc}</p>
              </button>
            ))}

            <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <p className="text-xs text-gray-500 mb-1">רמת פידבק על תמונה — כמה ישיר JARVIS יהיה על המראה שלך</p>
            <div className="flex gap-2">
              {([
                { value: 'harsh',    icon: '🔍', name: 'מראה',   desc: 'ישיר לחלוטין, ללא עיגול פינות' },
                { value: 'balanced', icon: '⚖️', name: 'מאוזן',  desc: 'חוזקות + מה לשפר' },
                { value: 'gentle',   icon: '💚', name: 'עדין',   desc: 'מעודד עם הצעות רכות' },
              ] as { value: AppearanceLevel; icon: string; name: string; desc: string }[]).map(opt => (
                <button key={opt.value} onClick={() => onUpdateSettings({ appearanceLevel: opt.value })}
                  className="flex-1 p-3 rounded-2xl text-center transition-all active:scale-[0.98]"
                  style={{
                    background: settings.appearanceLevel === opt.value ? accentColor + '18' : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${settings.appearanceLevel === opt.value ? accentColor : 'rgba(255,255,255,0.07)'}`,
                  }}>
                  <div className="text-xl mb-1">{opt.icon}</div>
                  <div className="text-xs font-bold mb-0.5" style={{ color: settings.appearanceLevel === opt.value ? accentColor : '#e5e7eb' }}>{opt.name}</div>
                  <div className="text-[10px] text-gray-600 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* ── VOICE SHORTCUTS ── */}
        <SectionHeader emoji="⚡" title="קיצורי דרך קוליים" />
        <Card>
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3">אמור את המילה הקסומה — JARVIS יבצע אוטומטית</p>
            <div className="space-y-2 mb-3">
              {settings.voiceShortcuts.map(sc => (
                <div key={sc.id} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: accentColor + '22', color: accentColor }}>
                        "{sc.trigger}"
                      </span>
                      <span className="text-xs text-gray-300">{sc.description}</span>
                    </div>
                    <p className="text-[10px] text-gray-600 truncate">{sc.prompt}</p>
                  </div>
                  <button
                    onClick={() => onRemoveShortcut(sc.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors text-lg w-6 text-center flex-shrink-0 leading-none"
                  >×</button>
                </div>
              ))}
              {settings.voiceShortcuts.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-2">אין קיצורים עדיין</p>
              )}
            </div>

            {showAddShortcut ? (
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <input
                  autoFocus
                  value={newScTrigger}
                  onChange={e => setNewScTrigger(e.target.value)}
                  placeholder='מילת הפעלה (מה אתה אומר)'
                  className="w-full text-sm text-white px-3 py-2.5 rounded-xl outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                />
                <input
                  value={newScDesc}
                  onChange={e => setNewScDesc(e.target.value)}
                  placeholder='תיאור קצר (מה זה עושה)'
                  className="w-full text-sm text-white px-3 py-2.5 rounded-xl outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                />
                <textarea
                  value={newScPrompt}
                  onChange={e => setNewScPrompt(e.target.value)}
                  placeholder='הוראה לג׳ארוויס (מה יישלח אליו)'
                  rows={2}
                  className="w-full text-sm text-white px-3 py-2.5 rounded-xl outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (newScTrigger.trim() && newScPrompt.trim()) {
                        onAddShortcut({
                          trigger: newScTrigger.trim(),
                          description: newScDesc.trim() || newScTrigger.trim(),
                          prompt: newScPrompt.trim(),
                        });
                        setNewScTrigger(''); setNewScDesc(''); setNewScPrompt('');
                        setShowAddShortcut(false);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black"
                    style={{ background: accentColor }}
                  >שמור</button>
                  <button
                    onClick={() => { setShowAddShortcut(false); setNewScTrigger(''); setNewScDesc(''); setNewScPrompt(''); }}
                    className="px-4 py-2.5 rounded-xl text-sm text-gray-400"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >ביטול</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddShortcut(true)}
                className="w-full py-2.5 rounded-xl text-sm text-gray-400 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)' }}
              >+ הוסף קיצור דרך</button>
            )}
          </div>
        </Card>

        {/* ── APPEARANCE ── */}
        <SectionHeader emoji="🎨" title="עיצוב" />
        <Card>
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3">ערכת צבעים</p>
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  onClick={() => onThemeChange(t.value)}
                  className="flex flex-col items-center gap-2 p-2.5 rounded-2xl border-2 transition-all active:scale-95"
                  style={settings.theme === t.value
                    ? { borderColor: t.color, background: t.color + '22' }
                    : { borderColor: 'rgba(255,255,255,0.08)', background: 'transparent' }}>
                  <span className="w-6 h-6 rounded-full" style={{ background: t.color }} />
                  <span className="text-[10px] text-gray-300">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* ── PRIVACY ── */}
        <SectionHeader emoji="🔒" title="פרטיות ונתונים" />
        <Card>
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-200 hover:bg-white/5 transition-colors border-b"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span>📖</span>
              <span>מדריך למשתמש</span>
              <svg className="mr-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          )}

          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-200 hover:bg-white/5 transition-colors border-b"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span>📤</span>
            <span>ייצא נתונים (JSON)</span>
            <svg className="mr-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-200 hover:bg-white/5 transition-colors border-b"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span>🚪</span>
            <span>התנתק</span>
            <svg className="mr-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          <button
            onClick={handleClearAll}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-400 hover:bg-white/5 transition-colors">
            <span>🗑</span>
            <span>מחק את כל הנתונים</span>
          </button>
        </Card>

        {/* ── ABOUT / APP INFO ── */}
        <SectionHeader emoji="ℹ️" title="אודות האפליקציה" />
        <Card>
          <div className="px-4 py-4 space-y-4">
            <div>
              <p className="text-sm font-bold text-white mb-1">VoiceTask — Personal Life OS</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                אפליקציה לניהול חיים אישית, מבוססת AI, שנבנתה עבורך בדיוק.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">מה יש באפליקציה</p>
              {[
                { emoji: '🎙', title: 'הקלטה קולית חכמה', desc: 'דקלם משימה בעברית — AI מסווג ומחלץ תאריך/שעה/עדיפות' },
                { emoji: '🎬', title: 'ניתוח סרטונים', desc: 'הכנס לינק YouTube/TikTok/Instagram — AI מחלץ משימות ויעדים' },
                { emoji: '🤖', title: 'צ׳אט AI', desc: 'שוחח עם AI שיוצר, מעדכן ומוחק משימות בשבילך' },
                { emoji: '🎯', title: 'מערכת יעדים', desc: '8 תחומי חיים + AI שמפרק כל יעד ל-4-6 צעדים קונקרטיים' },
                { emoji: '🔔', title: 'תזכורות', desc: 'חד פעמי / חוזר + WhatsApp (כאשר ממשק הדפדפן תומך)' },
                { emoji: '📅', title: 'לוח שנה', desc: 'ציר זמן של כל המשימות עם תאריכי יעד' },
                { emoji: '⚙️', title: 'הגדרות מלאות', desc: 'קטגוריות מותאמות, תחומים מותאמים, שפת AI, סגנון תשובות ועוד' },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">{item.emoji}</span>
                  <div>
                    <p className="text-sm text-white font-medium">{item.title}</p>
                    <p className="text-[11px] text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">טיפים</p>
              {[
                'לחץ פעמיים על קטגוריה בהגדרות לעריכת שמה',
                'צ׳ק-אין בוקר זמין בהגדרות — הפעל אותו לתזכורת יומית',
                'בצ׳אט AI תוכל להגיד "צור משימה להתקשר לדנה מחר ב-10" וזה יקרה',
                'הוסף תחום חיים מותאם אישית כמו "רוחניות" או "לימודים"',
                'ניתן לייצא את כל הנתונים ל-JSON מהגדרות → פרטיות',
              ].map((tip, i) => (
                <p key={i} className="text-[11px] text-gray-500 py-0.5">• {tip}</p>
              ))}
            </div>
          </div>
        </Card>

        {/* Version footer */}
        <p className="text-center text-[11px] text-gray-700 mt-6 mb-2">VoiceTask Personal Life OS v2.0</p>

      </div>
    </div>
  );
}
