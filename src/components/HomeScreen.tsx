import React, { useState } from 'react';
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

  const todayTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks  = tasks.filter(t => t.status === 'done');

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button className="w-9 h-9 flex flex-col gap-1 justify-center items-center">
          <span className="w-5 h-0.5 bg-white rounded" />
          <span className="w-5 h-0.5 bg-white rounded" />
          <span className="w-5 h-0.5 bg-white rounded" />
        </button>
        <h1 className="text-lg font-bold">היום</h1>
        <button
          onClick={onNewRecording}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-2xl font-light"
          style={{ background: accentColor }}
        >
          +
        </button>
      </div>

      {/* Mic button */}
      <div className="flex items-center justify-center gap-3 py-4">
        {/* Left waves */}
        <div className="flex items-center gap-1">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="wave-bar" style={{ background: accentColor }} />
          ))}
        </div>

        {/* Mic circle */}
        <button
          onClick={onNewRecording}
          className="relative w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95"
          style={{ background: '#1c1c1e' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93A8.001 8.001 0 014 11H2a10 10 0 0019.95 1H20a8 8 0 01-7 7.93V23h-2v-4.07z"/>
          </svg>
        </button>

        {/* Right waves */}
        <div className="flex items-center gap-1">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="wave-bar" style={{ background: accentColor }} />
          ))}
        </div>
      </div>
      <p className="text-center text-sm text-gray-500 -mt-2 mb-3">הקלטה חדשה</p>

      {/* Tasks section */}
      <div className="flex-1 scroll-y px-4">
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <span>המשימות שלי</span>
            <span>🧠</span>
            <span>🤝</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">מטריצה</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </div>
        </div>

        {tasks.length === 0 && (
          <div className="text-center text-gray-600 mt-16 fade-up">
            <div className="text-4xl mb-3">🎯</div>
            <p>אין משימות עדיין</p>
            <p className="text-sm mt-1">לחץ על המיקרופון להוספה</p>
          </div>
        )}

        {todayTasks.map((task, idx) => (
          <TaskRow
            key={task.id}
            task={task}
            index={idx}
            onDone={() => onMarkDone(task.id)}
            onDelete={() => onDeleteTask(task.id)}
            menuOpen={menuOpen === task.id}
            onMenuToggle={() => setMenuOpen(menuOpen === task.id ? null : task.id)}
            accentColor={accentColor}
          />
        ))}

        {doneTasks.length > 0 && (
          <>
            <p className="text-xs text-gray-500 mt-4 mb-2">הושלמו ({doneTasks.length})</p>
            {doneTasks.map((task, idx) => (
              <TaskRow
                key={task.id}
                task={task}
                index={idx}
                done
                onDone={() => onMarkDone(task.id)}
                onDelete={() => onDeleteTask(task.id)}
                menuOpen={menuOpen === task.id}
                onMenuToggle={() => setMenuOpen(menuOpen === task.id ? null : task.id)}
                accentColor={accentColor}
              />
            ))}
          </>
        )}
        <div className="h-4" />
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
  const time = task.reminder?.time;
  const category = task.category || 'כללי';

  return (
    <div
      className="flex items-center gap-3 py-3 border-b border-gray-800 fade-up relative"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* 3-dot menu */}
      <button onClick={onMenuToggle} className="text-gray-600 hover:text-gray-400 flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-8 top-2 z-20 bg-gray-800 rounded-xl shadow-xl overflow-hidden slide-in">
          <button onClick={() => { onDelete(); onMenuToggle(); }}
            className="block w-full text-right px-4 py-3 text-sm text-red-400 hover:bg-gray-700">
            מחק
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${done ? 'line-through text-gray-500' : 'text-white'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{category}</span>
          {time && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {time}
            </span>
          )}
        </div>
      </div>

      {/* Checkbox */}
      <button
        onClick={onDone}
        className="w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
        style={{ borderColor: done ? accentColor : '#4b5563', background: done ? accentColor : 'transparent' }}
      >
        {done && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </button>
    </div>
  );
}
