import React, { useState, useEffect } from 'react';
import { Task } from '../types';

interface Props {
  tasks: Task[];
  onNewRecording: () => void;
  onUpdateTask: (id: string, data: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onMarkDone: (id: string) => void;
  accentColor: string;
}

export default function HomeScreen({ tasks, onNewRecording, onUpdateTask, onDeleteTask, onMarkDone, accentColor }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 30); }, []);

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks   = tasks.filter(t => t.status === 'done');

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <button className="w-9 h-9 flex flex-col gap-[5px] justify-center items-end opacity-70">
          <span className="w-5 h-0.5 bg-white rounded-full" />
          <span className="w-4 h-0.5 bg-white rounded-full" />
          <span className="w-5 h-0.5 bg-white rounded-full" />
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
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm">המשימות שלי</span>
            <span className="text-base">🧠</span>
            <span className="text-base">🤝</span>
          </div>
          <div className="flex items-center gap-2 opacity-50">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span className="text-xs text-gray-500">מטריצה</span>
          </div>
        </div>

        {tasks.length === 0 && (
          <div className="text-center mt-14 fade-up">
            <div className="text-5xl mb-3">🎯</div>
            <p className="text-gray-400 font-medium">אין משימות עדיין</p>
            <p className="text-sm text-gray-600 mt-1">לחץ על המיקרופון להוספה</p>
          </div>
        )}

        {activeTasks.map((task, idx) => (
          <TaskRow key={task.id} task={task} index={idx}
            onDone={() => onMarkDone(task.id)}
            onDelete={() => { onDeleteTask(task.id); setMenuOpen(null); }}
            menuOpen={menuOpen === task.id}
            onMenuToggle={() => setMenuOpen(menuOpen === task.id ? null : task.id)}
            accentColor={accentColor} />
        ))}

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
