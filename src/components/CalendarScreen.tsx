import React, { useState, useEffect } from 'react';
import { Task, Habit, HabitLog } from '../types';

interface Props {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  accentColor: string;
}

const DAYS_HE  = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function CalendarScreen({ tasks, habits, habitLogs, accentColor }: Props) {
  const [current,  setCurrent]  = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [visible,  setVisible]  = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  const year  = current.getFullYear();
  const month = current.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Dot markers on calendar grid
  const dotDays = new Set<number>();
  tasks.forEach(t => {
    if (!t.reminder?.date) return;
    const [y, m, d] = t.reminder.date.split('-').map(Number);
    if (y === year && m - 1 === month) dotDays.add(d);
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selDay   = selected.getDate();
  const selMonth = selected.getMonth();
  const selYear  = selected.getFullYear();
  const selStr   = `${selYear}-${String(selMonth + 1).padStart(2,'0')}-${String(selDay).padStart(2,'0')}`;
  const selDow   = selected.getDay();

  // Tasks for selected day
  const dayTasks = tasks.filter(t => {
    if (!t.reminder?.date) return false;
    const [y, m, d] = t.reminder.date.split('-').map(Number);
    return y === selYear && m - 1 === selMonth && d === selDay;
  });

  // Habits for selected day (based on frequency/targetDays)
  const dayHabits = habits.filter(h => {
    if (h.frequency === 'daily') return true;
    if (h.frequency === 'weekly') return h.targetDays.includes(selDow);
    return false;
  });

  // Sort items by time (tasks with time, habits with time)
  interface CalItem {
    id: string;
    kind: 'task' | 'habit';
    title: string;
    emoji?: string;
    time?: string;
    done: boolean;
    color: string;
  }

  const timedItems: CalItem[] = [];
  const untimedHabits: CalItem[] = [];
  const untimedTasks: CalItem[] = [];

  dayHabits.forEach(h => {
    const done = habitLogs.some(l => l.habitId === h.id && l.date === selStr);
    const item: CalItem = { id: h.id, kind: 'habit', title: h.title, emoji: h.emoji, done, color: h.color };
    untimedHabits.push(item);
  });

  dayTasks.forEach(t => {
    const item: CalItem = {
      id: t.id, kind: 'task', title: t.title,
      time: t.reminder?.time, done: t.status === 'done', color: accentColor,
    };
    if (t.reminder?.time) timedItems.push(item);
    else untimedTasks.push(item);
  });

  timedItems.sort((a, b) => timeToMin(a.time!) - timeToMin(b.time!));

  const totalItems = dayHabits.length + dayTasks.length;

  return (
    <div className="flex flex-col h-full bg-black" dir="rtl">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <h2 className="text-center font-bold text-lg mb-4"
            style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(-10px)', transition: 'all 0.4s ease' }}>
          📅 קלנדר
        </h2>

        {/* Month navigator */}
        <div className="flex items-center justify-between mb-3 rounded-2xl px-4 py-3"
             style={{ background: 'rgba(255,255,255,0.05)', opacity: visible ? 1 : 0, transition: 'all 0.4s ease 0.1s' }}>
          <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <span className="font-semibold text-base text-white">{MONTHS_HE[month]} {year}</span>
          <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1"
             style={{ opacity: visible ? 1 : 0, transition: 'all 0.4s ease 0.15s' }}>
          {DAYS_HE.map(d => (
            <div key={d} className="text-center text-xs text-gray-500 py-1 font-medium">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1"
             style={{ opacity: visible ? 1 : 0, transition: 'all 0.4s ease 0.2s' }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const isToday    = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = day === selDay && month === selMonth && year === selYear;
            const hasDot     = dotDays.has(day);
            return (
              <button key={i}
                onClick={() => setSelected(new Date(year, month, day))}
                className="aspect-square rounded-full flex flex-col items-center justify-center text-sm relative transition-all duration-200 active:scale-90"
                style={isSelected
                  ? { background: accentColor, color: '#000', fontWeight: 700 }
                  : isToday
                  ? { border: `1.5px solid ${accentColor}`, color: '#fff' }
                  : { color: '#d1d5db' }}
              >
                {day}
                {hasDot && (
                  <span className="absolute bottom-[3px] w-1.5 h-1.5 rounded-full"
                        style={{ background: isSelected ? '#000' : accentColor }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px mx-4 my-3 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />

      {/* Day detail */}
      <div className="flex-1 overflow-y-auto px-4 pb-6"
           style={{ opacity: visible ? 1 : 0, transition: 'all 0.4s ease 0.3s' }}>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-white">{selDay} {MONTHS_HE[selMonth]}</p>
          <span className="text-xs text-gray-500 px-2 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
            {totalItems} פריטים
          </span>
        </div>

        {totalItems === 0 ? (
          <div className="text-center mt-10 fade-up">
            <div className="text-3xl mb-2">✨</div>
            <p className="text-gray-600 text-sm">יום פנוי — ליהנות!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Habits (no time — shown first as chips) */}
            {untimedHabits.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">הרגלים</p>
                <div className="space-y-1.5">
                  {untimedHabits.map((h, i) => (
                    <div key={h.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl fade-up"
                         style={{ animationDelay: `${i * 0.04}s`, background: h.done ? h.color + '18' : 'rgba(255,255,255,0.04)', border: `1px solid ${h.done ? h.color + '44' : 'rgba(255,255,255,0.07)'}` }}>
                      <span className="text-base">{h.emoji}</span>
                      <span className={`text-sm flex-1 ${h.done ? 'line-through' : 'text-white'}`}
                            style={{ color: h.done ? h.color : undefined }}>{h.title}</span>
                      {h.done && <span className="text-xs font-bold" style={{ color: h.color }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timed items on timeline */}
            {timedItems.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">לפי שעה</p>
                <div className="relative">
                  <div className="absolute right-[44px] top-0 bottom-0 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="space-y-2">
                    {timedItems.map((item, i) => (
                      <div key={item.id} className="flex items-center gap-3 fade-up"
                           style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                             style={{ background: item.done ? item.color + '14' : 'rgba(255,255,255,0.04)', border: `1px solid ${item.done ? item.color + '33' : 'rgba(255,255,255,0.07)'}` }}>
                          {item.emoji && <span className="text-base">{item.emoji}</span>}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${item.done ? 'line-through text-gray-500' : 'text-white'}`}>{item.title}</p>
                          </div>
                        </div>
                        <div className="w-11 text-right flex-shrink-0">
                          <span className="text-xs font-mono" style={{ color: item.color }}>{item.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Untimed tasks */}
            {untimedTasks.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">משימות</p>
                <div className="space-y-1.5">
                  {untimedTasks.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl fade-up"
                         style={{ animationDelay: `${i * 0.04}s`, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.done ? '#4b5563' : accentColor }} />
                      <p className={`text-sm flex-1 ${t.done ? 'line-through text-gray-500' : 'text-white'}`}>{t.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
