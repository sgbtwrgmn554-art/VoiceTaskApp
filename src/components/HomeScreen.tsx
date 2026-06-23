import React, { useState, useEffect } from 'react';
import { Task, Goal, Habit } from '../types';
import { LinkBadge } from './AppLinkInput';
import AppLinkInput from './AppLinkInput';

interface Props {
  tasks: Task[];
  goals?: Goal[];
  habits?: Habit[];
  aiLanguage?: string;
  onNewRecording: () => void;
  onOpenJarvis?: () => void;
  onUpdateTask: (id: string, data: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onMarkDone: (id: string) => void;
  accentColor: string;
}

const DAY_NAMES = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const MONTH_NAMES = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'לילה טוב';
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
}

export default function HomeScreen({ tasks, goals = [], habits = [], aiLanguage = 'hebrew', onNewRecording, onOpenJarvis, onUpdateTask, onDeleteTask, onMarkDone, accentColor }: Props) {
  const [menuOpen, setMenuOpen]     = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [visible, setVisible]       = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode]     = useState<'list' | 'matrix'>('list');
  const [filter, setFilter]         = useState<'all' | 'high' | 'today' | 'done'>('all');
  const [suggestions, setSuggestions]   = useState<string[]>([]);
  const [loadingSug, setLoadingSug]     = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 40); }, []);

  const now      = new Date();
  const dayLabel = `יום ${DAY_NAMES[now.getDay()]}`;
  const dateStr  = `${now.getDate()} ${MONTH_NAMES[now.getMonth()]}`;
  const greeting = getGreeting();

  const activeTasks  = tasks.filter(t => t.status !== 'done');
  const activeGoals  = goals.filter(g => g.status !== 'completed').length;
  const todayStr     = new Date().toISOString().split('T')[0];

  const bySearch = searchQuery.trim()
    ? tasks.filter(t => t.title.includes(searchQuery) || t.description?.includes(searchQuery))
    : tasks;

  const byFilter = bySearch.filter(t => {
    if (filter === 'done')  return t.status === 'done';
    if (filter === 'high')  return t.status !== 'done' && t.priority === 'high';
    if (filter === 'today') return t.status !== 'done' && t.reminder?.date === todayStr;
    return t.status !== 'done';
  });

  const filteredActive = filter === 'done' ? [] : byFilter;
  const filteredDone   = filter === 'done' ? byFilter : (filter === 'all' && !searchQuery ? tasks.filter(t => t.status === 'done') : []);

  const fetchSuggestions = async () => {
    if (showSuggestions) { setShowSuggestions(false); return; }
    setShowSuggestions(true);
    if (suggestions.length > 0) return;
    setLoadingSug(true);
    try {
      const res  = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals, tasks, habits, language: aiLanguage }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch { setSuggestions(['לא הצלחתי לקבל הצעות כרגע']); }
    finally { setLoadingSug(false); }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0a0a' }}>

      {/* ── Hero section ── */}
      <div
        className="flex-shrink-0 px-5 pt-6 pb-5"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(-10px)',
          transition: 'all 0.4s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={onOpenJarvis}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" opacity={0.8}>
              <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93A8.001 8.001 0 014 11H2a10 10 0 0019.95 1H20a8 8 0 01-7 7.93V23h-2v-4.07z"/>
            </svg>
          </button>

          <p className="text-[12px] font-medium tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {dayLabel} · {dateStr}
          </p>

          <div className="flex items-center gap-1.5">
            <IconBtn active={searchOpen} accentColor={accentColor} onClick={() => { setSearchOpen(v => !v); setSearchQuery(''); }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </IconBtn>
            <IconBtn active={viewMode === 'matrix'} accentColor={accentColor} onClick={() => setViewMode(v => v === 'list' ? 'matrix' : 'list')}>
              {viewMode === 'list' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
                </svg>
              )}
            </IconBtn>
          </div>
        </div>

        {/* Greeting */}
        <h1 className="text-3xl font-bold text-white leading-tight">{greeting} 👋</h1>
        <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {activeTasks.length > 0 ? `יש לך ${activeTasks.length} משימות פעילות` : 'אין משימות — יום פנוי!'}
        </p>

        {/* Stat cards */}
        <div className="flex gap-3 mt-5">
          <StatCard icon="✅" value={activeTasks.length} label="משימות" color={accentColor} />
          <StatCard icon="🎯" value={activeGoals}         label="יעדים"   color="#a78bfa" />
          <StatCard icon="🔥" value={habits.length}       label="הרגלים"  color="#f97316" />
        </div>

        {/* Search bar (inline expand) */}
        {searchOpen && (
          <div className="mt-3">
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="חיפוש משימות..."
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none text-white placeholder-gray-600 border border-white/10"
              style={{ background: '#141414' }}
              dir="rtl"
            />
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-5" style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

      {/* Section row */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3">
        <span className="text-sm font-semibold text-white">
          {searchQuery ? 'תוצאות חיפוש' : 'משימות'}
        </span>
        <IconBtn label="🧠" active={showSuggestions} accentColor={accentColor} onClick={fetchSuggestions} />
      </div>

      {/* Filter tabs */}
      <div className="flex-shrink-0 flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
        {([
          { key: 'all',   label: `הכל (${activeTasks.length})` },
          { key: 'high',  label: `🔥 דחוף (${tasks.filter(t=>t.status!=='done'&&t.priority==='high').length})` },
          { key: 'today', label: `📅 היום (${tasks.filter(t=>t.status!=='done'&&t.reminder?.date===todayStr).length})` },
          { key: 'done',  label: `✅ הושלמו (${tasks.filter(t=>t.status==='done').length})` },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="flex-shrink-0 text-xs px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap"
            style={filter === f.key
              ? { background: accentColor, color: '#000', fontWeight: 700 }
              : { background: 'rgba(255,255,255,0.07)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto flex flex-col px-4">

        {/* AI suggestions */}
        {showSuggestions && (
          <div className="mb-3 rounded-2xl p-3.5 fade-up" style={{ background: accentColor + '10', border: `1px solid ${accentColor}30` }}>
            <p className="text-xs font-semibold mb-2" style={{ color: accentColor }}>🧠 המלצות ליום הזה</p>
            {loadingSug ? (
              <p className="text-xs text-gray-500 text-center py-2">טוען...</p>
            ) : suggestions.map((s, i) => (
              <p key={i} className="text-xs text-gray-300 py-1 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>• {s}</p>
            ))}
          </div>
        )}

        {/* Empty state — flex-1 so it fills ALL remaining height */}
        {filteredActive.length === 0 && filteredDone.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 pb-8">
            {searchQuery || filter !== 'all' ? (
              <>
                <span className="text-5xl">{filter === 'done' ? '✅' : filter === 'high' ? '🔥' : filter === 'today' ? '📅' : '🔍'}</span>
                <p className="text-gray-400 font-semibold">
                  {filter === 'done' ? 'אין משימות שהושלמו' :
                   filter === 'high' ? 'אין משימות דחופות' :
                   filter === 'today' ? 'אין משימות להיום' :
                   'לא נמצאו תוצאות'}
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={onOpenJarvis}
                  className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{
                    background: accentColor + '18',
                    border: `2px solid ${accentColor}40`,
                    boxShadow: `0 0 40px ${accentColor}25`,
                  }}
                >
                  <svg width="34" height="34" viewBox="0 0 24 24" fill={accentColor}>
                    <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93A8.001 8.001 0 014 11H2a10 10 0 0019.95 1H20a8 8 0 01-7 7.93V23h-2v-4.07z"/>
                  </svg>
                </button>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">שלום!</p>
                  <p className="text-gray-500 text-sm mt-1">לחץ על ג׳רוויס לעזרה</p>
                  <p className="text-gray-600 text-sm">או הוסף משימה בלחצן למטה</p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <QuickCard icon="🎤" title="הקלטה" subtitle="הקלט משימה חדשה" onClick={onNewRecording} accentColor={accentColor} />
                  <QuickCard icon="🤖" title="ג׳רוויס" subtitle="שאל, תכנן, בנה" onClick={onOpenJarvis} accentColor="#a78bfa" />
                </div>
              </>
            )}
          </div>
        )}

        {/* Task list */}
        {viewMode === 'matrix' ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredActive.map((t, i) => (
              <MatrixCard key={t.id} task={t} index={i}
                onDone={() => onMarkDone(t.id)}
                onDelete={() => { onDeleteTask(t.id); setMenuOpen(null); }}
                accentColor={accentColor} />
            ))}
          </div>
        ) : (
          filteredActive.map((t, i) => (
            <TaskRow key={t.id} task={t} index={i}
              onDone={() => onMarkDone(t.id)}
              onDelete={() => { onDeleteTask(t.id); setMenuOpen(null); }}
              onEdit={() => { setEditingTask(t); setMenuOpen(null); }}
              menuOpen={menuOpen === t.id}
              onMenuToggle={() => setMenuOpen(menuOpen === t.id ? null : t.id)}
              accentColor={accentColor} />
          ))
        )}

        {filteredDone.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-5 mb-2">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600">הושלמו ({filteredDone.length})</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
            {filteredDone.map((t, i) => (
              <TaskRow key={t.id} task={t} index={i} done
                onDone={() => onMarkDone(t.id)}
                onDelete={() => { onDeleteTask(t.id); setMenuOpen(null); }}
                onEdit={() => { setEditingTask(t); setMenuOpen(null); }}
                menuOpen={menuOpen === t.id}
                onMenuToggle={() => setMenuOpen(menuOpen === t.id ? null : t.id)}
                accentColor={accentColor} />
            ))}
          </>
        )}

        <div className="h-4" />
      </div>

      {/* ── Sticky bottom recording button ── */}
      <div className="flex-shrink-0 px-4 pb-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={onNewRecording}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-base transition-all active:scale-[0.97]"
          style={{
            background: accentColor,
            color: '#000',
            boxShadow: `0 4px 24px ${accentColor}55`,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="black">
            <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93A8.001 8.001 0 014 11H2a10 10 0 0019.95 1H20a8 8 0 01-7 7.93V23h-2v-4.07z"/>
          </svg>
          + הוסף משימה
        </button>
      </div>

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          accentColor={accentColor}
          onSave={(data) => { onUpdateTask(editingTask.id, data); setEditingTask(null); }}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StatCard({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  return (
    <div
      className="flex-1 rounded-2xl p-3.5 flex flex-col items-center gap-1.5"
      style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xl font-bold leading-none" style={{ color }}>{value}</span>
      <span className="text-[11px] text-gray-600">{label}</span>
    </div>
  );
}

function QuickCard({ icon, title, subtitle, onClick, accentColor }: {
  icon: string; title: string; subtitle: string;
  onClick?: () => void; accentColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-2xl p-4 flex flex-col items-start gap-1.5 transition-all active:scale-95"
      style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-semibold text-white">{title}</span>
      <span className="text-[11px] text-gray-500 text-right w-full">{subtitle}</span>
    </button>
  );
}

function IconBtn({ children, label, active, accentColor, onClick }: {
  children?: React.ReactNode; label?: string;
  active?: boolean; accentColor?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1 rounded-xl transition-all duration-150 active:scale-90 select-none"
      style={{
        padding: label ? '5px 10px' : '7px',
        background: active && accentColor ? accentColor + '22' : 'rgba(255,255,255,0.07)',
        border: `1px solid ${active && accentColor ? accentColor + '55' : 'rgba(255,255,255,0.1)'}`,
        color: active && accentColor ? accentColor : 'rgba(255,255,255,0.7)',
        fontSize: label ? '15px' : '14px',
      }}
    >
      {label ?? children}
    </button>
  );
}

function MatrixCard({ task, index, onDone, onDelete, accentColor }: {
  task: Task; index: number; onDone: () => void; onDelete: () => void; accentColor: string;
}) {
  const pc = task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#6b7280';
  return (
    <div className="rounded-2xl p-3 stagger-item flex flex-col gap-2"
      style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium text-white leading-snug line-clamp-2 flex-1">{task.title}</p>
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: pc }} />
      </div>
      {task.category && (
        <span className="text-[10px] px-2 py-0.5 rounded-full self-start"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>{task.category}</span>
      )}
      <div className="flex items-center justify-between mt-auto pt-1">
        <button onClick={onDelete} className="text-[11px] text-gray-700 hover:text-red-500 transition-colors">מחק</button>
        <button onClick={onDone}
          className="w-6 h-6 rounded-full border flex items-center justify-center transition-all active:scale-90"
          style={{ borderColor: accentColor, background: 'transparent' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function TaskRow({ task, index, done, onDone, onDelete, onEdit, menuOpen, onMenuToggle, accentColor }: {
  task: Task; index: number; done?: boolean;
  onDone: () => void; onDelete: () => void; onEdit: () => void;
  menuOpen: boolean; onMenuToggle: () => void; accentColor: string;
}) {
  return (
    <div className="flex items-center gap-3 py-4 border-b stagger-item relative"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <button onClick={onMenuToggle} className="flex-shrink-0 opacity-30 hover:opacity-70 transition-opacity">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-8 top-1 z-20 rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={onEdit}
            className="block w-full text-right px-5 py-3 text-sm text-white hover:bg-white/5 transition-colors border-b border-white/5">
            ✏️ ערוך משימה
          </button>
          <button onClick={onDelete}
            className="block w-full text-right px-5 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors">
            🗑 מחק משימה
          </button>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${done ? 'line-through text-gray-600' : 'text-white'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.category && (
            <span className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.07)', color: '#9ca3af' }}>{task.category}</span>
          )}
          {task.reminder?.time && (
            <span className="flex items-center gap-1 text-[11px] text-gray-600">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {task.reminder.time}
            </span>
          )}
          {task.recurrence && task.recurrence !== 'none' && (
            <span className="text-[11px] text-gray-600">🔁</span>
          )}
        </div>
      </div>

      {task.url && <LinkBadge url={task.url} accentColor={accentColor} />}

      <button onClick={onDone}
        className="w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 active:scale-90"
        style={done
          ? { borderColor: accentColor, background: accentColor }
          : { borderColor: 'rgba(255,255,255,0.2)', background: 'transparent' }}>
        {done && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" className="scale-pop">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </button>
    </div>
  );
}

const PRIORITY_LABELS: Record<string, string> = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה' };

function EditTaskModal({ task, accentColor, onSave, onClose }: {
  task: Task; accentColor: string;
  onSave: (data: Partial<Task>) => void; onClose: () => void;
}) {
  const [title, setTitle]       = useState(task.title);
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [category, setCategory] = useState(task.category || '');
  const [url, setUrl]           = useState(task.url || '');

  const submit = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), priority: priority as Task['priority'], category, url: url || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-5 pb-8 space-y-4"
        style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-8 h-1 rounded-full bg-gray-700 mx-auto mb-2" />
        <h2 className="text-base font-bold text-center">✏️ ערוך משימה</h2>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="כותרת המשימה..." dir="rtl" autoFocus
          className="w-full bg-black/30 rounded-xl px-4 py-3 text-sm outline-none border border-white/10 text-white placeholder-gray-600" />
        <div className="flex gap-2">
          {(['low', 'medium', 'high'] as const).map(p => (
            <button key={p} onClick={() => setPriority(p)} className="flex-1 py-2 rounded-xl text-sm transition-all"
              style={{
                background: priority === p ? accentColor + '22' : 'rgba(255,255,255,0.05)',
                color: priority === p ? accentColor : '#9ca3af',
                border: priority === p ? `1px solid ${accentColor}40` : 'none',
              }}>
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="קטגוריה (אופציונלי)..." dir="rtl"
          className="w-full bg-black/30 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/10 text-white placeholder-gray-600" />
        <AppLinkInput value={url} onChange={setUrl} accentColor={accentColor} />
        <button onClick={submit} className="w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
          style={{ background: accentColor, color: '#000' }}>שמור שינויים</button>
      </div>
    </div>
  );
}
