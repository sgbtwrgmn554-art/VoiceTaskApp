import React, { useState, useRef } from 'react';
import { Task, Habit, HabitLog, CreateTaskInput } from '../types';

interface Props {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  accentColor: string;
  onCreateTask: (input: CreateTaskInput) => void;
}

const DAYS_SHORT = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const MONTHS_HE  = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const HOURS      = Array.from({ length: 18 }, (_, i) => i + 6); // 06–23

const CATEGORY_COLORS = ['#f97316','#22c55e','#a855f7','#3b82f6','#ec4899','#14b8a6','#ef4444','#eab308'];

function buildCategoryColors(tasks: Task[]): Map<string, string> {
  const map = new Map<string, string>();
  let idx = 0;
  tasks.forEach(t => {
    const cat = t.category || '';
    if (cat && !map.has(cat)) map.set(cat, CATEGORY_COLORS[idx++ % CATEGORY_COLORS.length]);
  });
  return map;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekStart(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(d.getDate() - d.getDay());
  copy.setHours(0,0,0,0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export default function CalendarScreen({ tasks, habits, habitLogs, accentColor, onCreateTask }: Props) {
  const [view,    setView]    = useState<'day' | 'week' | 'month'>('week');
  const [refDate, setRefDate] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [quickSlot, setQuickSlot] = useState<{ date: string; time: string } | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const quickRef = useRef<HTMLInputElement>(null);

  const catColors = buildCategoryColors(tasks);
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = toDateStr(today);

  const taskColor = (t: Task) =>
    t.category && catColors.has(t.category) ? catColors.get(t.category)! : accentColor;

  function navigate(delta: number) {
    setRefDate(prev => {
      const d = new Date(prev);
      if (view === 'day')   d.setDate(d.getDate() + delta);
      if (view === 'week')  d.setDate(d.getDate() + delta * 7);
      if (view === 'month') d.setMonth(d.getMonth() + delta);
      return d;
    });
  }

  function headerLabel() {
    if (view === 'day')   return `${refDate.getDate()} ${MONTHS_HE[refDate.getMonth()]} ${refDate.getFullYear()}`;
    if (view === 'week') {
      const ws = getWeekStart(refDate);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth()) return `${MONTHS_HE[ws.getMonth()]} ${ws.getFullYear()}`;
      return `${MONTHS_HE[ws.getMonth()]}–${MONTHS_HE[we.getMonth()]} ${ws.getFullYear()}`;
    }
    return `${MONTHS_HE[refDate.getMonth()]} ${refDate.getFullYear()}`;
  }

  function handleSlotTap(date: string, time: string) {
    setQuickSlot({ date, time });
    setQuickTitle('');
    setTimeout(() => quickRef.current?.focus(), 80);
  }

  function submitQuick() {
    if (!quickSlot || !quickTitle.trim()) { setQuickSlot(null); return; }
    onCreateTask({ title: quickTitle.trim(), priority: 'medium', reminder: { date: quickSlot.date, time: quickSlot.time, recurrence: 'none' as const } });
    setQuickSlot(null);
    setQuickTitle('');
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }} dir="rtl">

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2" style={{ borderBottom: '1px solid var(--separator)' }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <span className="font-bold text-base text-white">{headerLabel()}</span>
          <button onClick={() => navigate(1)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </div>

        {/* Segmented control */}
        <div className="flex rounded-xl overflow-hidden p-0.5" style={{ background: 'var(--bg-elevated)' }}>
          {(['day','week','month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={view === v
                ? { background: accentColor, color: '#000' }
                : { background: 'transparent', color: 'var(--text-secondary)' }}>
              {v === 'day' ? 'יום' : v === 'week' ? 'שבוע' : 'חודש'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'month' && (
          <MonthView
            refDate={refDate}
            tasks={tasks}
            habits={habits}
            habitLogs={habitLogs}
            accentColor={accentColor}
            catColors={catColors}
            today={today}
            onDayTap={d => { setRefDate(d); setView('day'); }}
          />
        )}
        {view === 'week' && (
          <WeekView
            refDate={refDate}
            tasks={tasks}
            habits={habits}
            habitLogs={habitLogs}
            accentColor={accentColor}
            catColors={catColors}
            today={today}
            onSlotTap={handleSlotTap}
          />
        )}
        {view === 'day' && (
          <DayView
            refDate={refDate}
            tasks={tasks}
            habits={habits}
            habitLogs={habitLogs}
            accentColor={accentColor}
            catColors={catColors}
            today={today}
            onSlotTap={handleSlotTap}
          />
        )}
      </div>

      {/* Quick-add bottom sheet */}
      {quickSlot && (
        <div className="bottom-sheet" onClick={() => setQuickSlot(null)}>
          <div className="bottom-sheet-panel px-5 pt-4 pb-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-gray-700 mx-auto mb-4" />
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              {quickSlot.date} · {quickSlot.time}
            </p>
            <input
              ref={quickRef}
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitQuick()}
              placeholder="שם המשימה..."
              dir="rtl"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none text-white mb-3"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--separator)' }}
            />
            <button onClick={submitQuick}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{ background: accentColor, color: '#000' }}>
              הוסף משימה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Month View ─────────────────────────────────────────────────────────── */

function MonthView({ refDate, tasks, habits, habitLogs, accentColor, catColors, today, onDayTap }: {
  refDate: Date; tasks: Task[]; habits: Habit[]; habitLogs: HabitLog[];
  accentColor: string; catColors: Map<string,string>; today: Date;
  onDayTap: (d: Date) => void;
}) {
  const year  = refDate.getFullYear();
  const month = refDate.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dotDays = new Map<number, string[]>();
  tasks.forEach(t => {
    if (!t.reminder?.date) return;
    const [y, m, d] = t.reminder.date.split('-').map(Number);
    if (y === year && m - 1 === month) {
      const color = t.category && catColors.has(t.category) ? catColors.get(t.category)! : accentColor;
      if (!dotDays.has(d)) dotDays.set(d, []);
      dotDays.get(d)!.push(color);
    }
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayDay   = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear  = today.getFullYear();

  return (
    <div className="flex flex-col h-full overflow-y-auto px-2 pt-2">
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[11px] py-1 font-medium" style={{ color: 'var(--text-tertiary)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = day === todayDay && month === todayMonth && year === todayYear;
          const dots    = dotDays.get(day) ?? [];
          return (
            <button key={i}
              onClick={() => onDayTap(new Date(year, month, day))}
              className="aspect-square rounded-xl flex flex-col items-center justify-center text-sm relative transition-all active:scale-90"
              style={isToday
                ? { background: accentColor, color: '#000', fontWeight: 700 }
                : { color: 'var(--text-primary)' }}>
              {day}
              {dots.length > 0 && (
                <div className="flex gap-0.5 absolute bottom-1">
                  {dots.slice(0,3).map((c,j) => (
                    <span key={j} className="w-1 h-1 rounded-full" style={{ background: isToday ? '#000' : c }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Week View ──────────────────────────────────────────────────────────── */

function WeekView({ refDate, tasks, habits, habitLogs, accentColor, catColors, today, onSlotTap }: {
  refDate: Date; tasks: Task[]; habits: Habit[]; habitLogs: HabitLog[];
  accentColor: string; catColors: Map<string,string>; today: Date;
  onSlotTap: (date: string, time: string) => void;
}) {
  const weekStart = getWeekStart(refDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-col h-full">
      {/* Day header row */}
      <div className="flex-shrink-0 flex" style={{ borderBottom: '1px solid var(--separator)' }}>
        <div className="w-12 flex-shrink-0" />
        {days.map((d, i) => {
          const isToday = toDateStr(d) === toDateStr(today);
          return (
            <div key={i} className="flex-1 text-center py-2">
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{DAYS_SHORT[d.getDay()]}</p>
              <p className="text-sm font-bold mt-0.5 w-7 h-7 rounded-full flex items-center justify-center mx-auto"
                style={isToday ? { background: accentColor, color: '#000' } : { color: 'var(--text-primary)' }}>
                {d.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        {HOURS.map(hour => {
          const timeStr = `${String(hour).padStart(2,'0')}:00`;
          return (
            <div key={hour} className="flex" style={{ minHeight: '52px', borderBottom: '1px solid var(--separator)', opacity: 0.9 }}>
              <div className="w-12 flex-shrink-0 text-[10px] text-right pr-2 pt-1" style={{ color: 'var(--text-tertiary)' }}>
                {timeStr}
              </div>
              {days.map((d, di) => {
                const dateStr = toDateStr(d);
                const slotTasks = tasks.filter(t => t.reminder?.date === dateStr && t.reminder?.time?.startsWith(String(hour).padStart(2,'0')));
                return (
                  <div key={di} className="flex-1 relative border-r last:border-r-0 cursor-pointer"
                    style={{ borderColor: 'var(--separator)' }}
                    onClick={() => onSlotTap(dateStr, timeStr)}>
                    {slotTasks.map(t => (
                      <div key={t.id}
                        className="absolute inset-x-0.5 top-0.5 rounded-md px-1 text-[10px] font-semibold truncate"
                        style={{ background: (t.category && catColors.get(t.category)) || accentColor, color: '#000', minHeight: '18px', lineHeight: '18px' }}>
                        {t.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Day View ───────────────────────────────────────────────────────────── */

function DayView({ refDate, tasks, habits, habitLogs, accentColor, catColors, today, onSlotTap }: {
  refDate: Date; tasks: Task[]; habits: Habit[]; habitLogs: HabitLog[];
  accentColor: string; catColors: Map<string,string>; today: Date;
  onSlotTap: (date: string, time: string) => void;
}) {
  const dateStr = toDateStr(refDate);
  const dayTasks = tasks.filter(t => t.reminder?.date === dateStr);
  const untimedTasks = dayTasks.filter(t => !t.reminder?.time);
  const dow = refDate.getDay();

  const dayHabits = habits.filter(h => {
    if (h.frequency === 'daily') return true;
    if (h.frequency === 'weekly') return h.targetDays.includes(dow);
    return false;
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Habits chips */}
      {dayHabits.length > 0 && (
        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>הרגלים</p>
          <div className="flex flex-wrap gap-1.5">
            {dayHabits.map(h => {
              const done = habitLogs.some(l => l.habitId === h.id && l.date === dateStr);
              return (
                <span key={h.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: done ? h.color + '33' : 'var(--bg-elevated)', color: done ? h.color : 'var(--text-secondary)', border: `1px solid ${done ? h.color + '55' : 'var(--separator)'}` }}>
                  {h.emoji} {h.title}
                  {done && <span style={{ color: h.color }}>✓</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Untimed tasks */}
      {untimedTasks.length > 0 && (
        <div className="px-4 pb-2 flex-shrink-0">
          {untimedTasks.map(t => (
            <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--separator)' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: (t.category && catColors.get(t.category)) || accentColor }} />
              <p className={`text-sm flex-1 ${t.status === 'done' ? 'line-through' : 'text-white'}`}
                style={{ color: t.status === 'done' ? 'var(--text-tertiary)' : undefined }}>{t.title}</p>
            </div>
          ))}
        </div>
      )}

      {/* Hourly timeline */}
      {HOURS.map(hour => {
        const timeStr = `${String(hour).padStart(2,'0')}:00`;
        const slotTasks = tasks.filter(t => t.reminder?.date === dateStr && t.reminder?.time?.startsWith(String(hour).padStart(2,'0')));
        return (
          <div key={hour} className="flex items-start gap-3 px-4 cursor-pointer"
            style={{ minHeight: '52px', borderBottom: '1px solid var(--separator)', paddingTop: '8px' }}
            onClick={() => onSlotTap(dateStr, timeStr)}>
            <span className="text-[11px] w-12 text-right flex-shrink-0 pt-0.5" style={{ color: 'var(--text-tertiary)' }}>{timeStr}</span>
            <div className="flex-1 flex flex-col gap-1">
              {slotTasks.map(t => (
                <div key={t.id} className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                  style={{ background: (t.category && catColors.get(t.category)) || accentColor, color: '#000' }}>
                  {t.title}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div className="h-6" />
    </div>
  );
}
