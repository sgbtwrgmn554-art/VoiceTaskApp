import React, { useState, useEffect } from 'react';
import { Task, Goal, Habit } from '../types';

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

export default function HomeScreen({ tasks, goals = [], habits = [], aiLanguage = 'hebrew', onNewRecording, onOpenJarvis, onUpdateTask, onDeleteTask, onMarkDone, accentColor }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 30); }, []);

  const fetchSuggestions = async () => {
    if (showSuggestions) { setShowSuggestions(false); return; }
    setShowSuggestions(true);
    if (suggestions.length > 0) return;
    setLoadingSuggestions(true);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals, tasks, habits, language: aiLanguage }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch { setSuggestions(['לא הצלחתי לקבל הצעות כרגע']); }
    finally { setLoadingSuggestions(false); }
  };

  const filtered = searchQuery.trim()
    ? tasks.filter(t => t.title.includes(searchQuery) || t.description?.includes(searchQuery))
    : tasks;
  const activeTasks = filtered.filter(t => t.status !== 'done');
  const doneTasks   = filtered.filter(t => t.status === 'done');

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <button
          onClick={onOpenJarvis}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          title="J.A.R.V.I.S"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="white" opacity={0.8}>
            <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93A8.001 8.001 0 014 11H2a10 10 0 0019.95 1H20a8 8 0 01-7 7.93V23h-2v-4.07z"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold tracking-wide">היום</h1>
        <button
          onClick={onNewRecording}
          className="w-9 h-9 rounded-full flex items-center justify-center text-black text-xl font-bold shadow-lg transition-transform active:scale-90"
          style={{ background: accentColor, boxShadow: `0 4px 16px ${accentColor}55` }}
        >
          +
        </button>
      </div>

      {/* Mic section */}
      <div
        className="flex items-center justify-center gap-4 py-3 px-4"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(-10px)', transition: 'all 0.5s ease' }}
      >
        {/* Left waves */}
        <div className="flex items-center gap-[4px]">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="wave-bar rounded-full" style={{ background: accentColor + 'cc' }} />
          ))}
        </div>

        {/* Mic button */}
        <button
          onClick={onNewRecording}
          className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90"
          style={{ background: '#1a1a1a', boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.6)` }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93A8.001 8.001 0 014 11H2a10 10 0 0019.95 1H20a8 8 0 01-7 7.93V23h-2v-4.07z"/>
          </svg>
        </button>

        {/* Right waves */}
        <div className="flex items-center gap-[4px]">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="wave-bar rounded-full" style={{ background: accentColor + 'cc' }} />
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 -mt-1 mb-4 tracking-wider">הקלטה חדשה</p>

      {/* Tasks section */}
      <div className="flex-1 scroll-y px-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3 gap-2">
          {/* Right group */}
          <div className="flex items-center gap-1.5">
            <IconBtn label="🧠" active={showSuggestions} accentColor={accentColor} onClick={fetchSuggestions} />
          </div>

          {/* Search bar (expands inline) */}
          {searchOpen && (
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="חיפוש..."
              className="flex-1 bg-white/[0.06] rounded-xl px-3 py-1.5 text-sm outline-none text-white placeholder-gray-600 border border-white/10"
              dir="rtl"
            />
          )}

          {/* Left group */}
          <div className="flex items-center gap-1.5">
            {/* Search */}
            <IconBtn
              active={searchOpen}
              accentColor={accentColor}
              onClick={() => { setSearchOpen(v => !v); setSearchQuery(''); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </IconBtn>

            {/* Matrix / List toggle */}
            <IconBtn
              active={viewMode === 'matrix'}
              accentColor={accentColor}
              onClick={() => setViewMode(v => v === 'list' ? 'matrix' : 'list')}
            >
              {viewMode === 'list' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
                </svg>
              )}
            </IconBtn>
          </div>
        </div>

        {/* AI Suggestions panel */}
        {showSuggestions && (
          <div className="mb-3 rounded-2xl p-3.5 fade-up"
            style={{ background: accentColor + '10', border: `1px solid ${accentColor}30` }}>
            <p className="text-xs font-semibold mb-2" style={{ color: accentColor }}>🧠 המלצות ליום הזה</p>
            {loadingSuggestions ? (
              <p className="text-xs text-gray-500 text-center py-2">טוען...</p>
            ) : suggestions.map((s, i) => (
              <p key={i} className="text-xs text-gray-300 py-1 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                • {s}
              </p>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center mt-14 fade-up">
            <div className="text-5xl mb-3">{searchQuery ? '🔍' : '🎯'}</div>
            <p className="text-gray-400 font-medium">{searchQuery ? 'לא נמצאו תוצאות' : 'אין משימות עדיין'}</p>
            <p className="text-sm text-gray-600 mt-1">{searchQuery ? '' : 'לחץ על המיקרופון להוספה'}</p>
          </div>
        )}

        {viewMode === 'matrix' ? (
          <div className="grid grid-cols-2 gap-2">
            {activeTasks.map((task, idx) => (
              <MatrixCard key={task.id} task={task} index={idx}
                onDone={() => onMarkDone(task.id)}
                onDelete={() => { onDeleteTask(task.id); setMenuOpen(null); }}
                accentColor={accentColor} />
            ))}
          </div>
        ) : (
          activeTasks.map((task, idx) => (
            <TaskRow key={task.id} task={task} index={idx}
              onDone={() => onMarkDone(task.id)}
              onDelete={() => { onDeleteTask(task.id); setMenuOpen(null); }}
              menuOpen={menuOpen === task.id}
              onMenuToggle={() => setMenuOpen(menuOpen === task.id ? null : task.id)}
              accentColor={accentColor} />
          ))
        )}

        {doneTasks.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-5 mb-2">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600">הושלמו ({doneTasks.length})</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
            {doneTasks.map((task, idx) => (
              <TaskRow key={task.id} task={task} index={idx} done
                onDone={() => onMarkDone(task.id)}
                onDelete={() => { onDeleteTask(task.id); setMenuOpen(null); }}
                menuOpen={menuOpen === task.id}
                onMenuToggle={() => setMenuOpen(menuOpen === task.id ? null : task.id)}
                accentColor={accentColor} />
            ))}
          </>
        )}
        <div className="h-6" />
      </div>
    </div>
  );
}

function IconBtn({ children, label, active, accentColor, onClick }: {
  children?: React.ReactNode;
  label?: string;
  active?: boolean;
  accentColor?: string;
  onClick?: () => void;
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
  task: Task; index: number;
  onDone: () => void; onDelete: () => void;
  accentColor: string;
}) {
  const priorityColor = task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#6b7280';
  return (
    <div
      className="rounded-2xl p-3 fade-up flex flex-col gap-2"
      style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.07)', animationDelay: `${index * 0.04}s` }}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium text-white leading-snug line-clamp-2 flex-1">{task.title}</p>
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: priorityColor }} />
      </div>
      {task.category && (
        <span className="text-[10px] px-2 py-0.5 rounded-full self-start"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>
          {task.category}
        </span>
      )}
      <div className="flex items-center justify-between mt-auto pt-1">
        <button onClick={onDelete} className="text-[11px] text-gray-700 hover:text-red-500 transition-colors">מחק</button>
        <button
          onClick={onDone}
          className="w-6 h-6 rounded-full border flex items-center justify-center transition-all active:scale-90"
          style={{ borderColor: accentColor, background: 'transparent' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function TaskRow({ task, index, done, onDone, onDelete, menuOpen, onMenuToggle, accentColor }: {
  task: Task; index: number; done?: boolean;
  onDone: () => void; onDelete: () => void;
  menuOpen: boolean; onMenuToggle: () => void;
  accentColor: string;
}) {
  return (
    <div
      className="flex items-center gap-3 py-3.5 border-b fade-up relative"
      style={{ borderColor: 'rgba(255,255,255,0.06)', animationDelay: `${index * 0.04}s` }}
    >
      {/* 3-dot */}
      <button onClick={onMenuToggle} className="flex-shrink-0 opacity-40 hover:opacity-70 transition-opacity">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-8 top-1 z-20 rounded-2xl shadow-2xl overflow-hidden slide-in"
             style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={onDelete}
            className="block w-full text-right px-5 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors">
            🗑 מחק משימה
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${done ? 'line-through text-gray-600' : 'text-white'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {task.category && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.07)', color: '#9ca3af' }}>
              {task.category}
            </span>
          )}
          {task.reminder?.time && (
            <span className="flex items-center gap-1 text-[11px] text-gray-600">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {task.reminder.time}
            </span>
          )}
        </div>
      </div>

      {/* Checkbox */}
      <button
        onClick={onDone}
        className="w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 active:scale-90"
        style={done
          ? { borderColor: accentColor, background: accentColor }
          : { borderColor: 'rgba(255,255,255,0.2)', background: 'transparent' }}
      >
        {done && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" className="scale-pop">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </button>
    </div>
  );
}
