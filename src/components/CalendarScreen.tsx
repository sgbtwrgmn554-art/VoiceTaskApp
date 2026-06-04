import React, { useState } from 'react';
import { Task } from '../types';

interface Props { tasks: Task[]; accentColor: string; }

const DAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

export default function CalendarScreen({ tasks, accentColor }: Props) {
  const [date, setDate] = useState(new Date());

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const taskDays = new Set(
    tasks
      .filter(t => t.reminder?.date?.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
      .map(t => parseInt(t.reminder!.date.split('-')[2]))
  );

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedDay = date.getDate();
  const selectedMonth = date.getMonth();
  const selectedYear = date.getFullYear();

  const dayTasks = tasks.filter(t => {
    if (!t.reminder?.date) return false;
    const [y, m, d] = t.reminder.date.split('-').map(Number);
    return y === selectedYear && m - 1 === selectedMonth && d === selectedDay;
  });

  return (
    <div className="flex flex-col h-full bg-black px-4 pt-4">
      <h2 className="text-center font-bold text-lg mb-4">קלנדר</h2>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setDate(new Date(year, month - 1, 1))} className="text-gray-400 text-xl px-2">‹</button>
        <span className="font-medium">{MONTHS[month]} {year}</span>
        <button onClick={() => setDate(new Date(year, month + 1, 1))} className="text-gray-400 text-xl px-2">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs text-gray-500 py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const isSelected = day === selectedDay;
          const hasTask = taskDays.has(day);
          return (
            <button
              key={i}
              onClick={() => setDate(new Date(year, month, day))}
              className="aspect-square rounded-full flex flex-col items-center justify-center text-sm relative transition-all"
              style={isSelected
                ? { background: accentColor, color: '#000' }
                : isToday
                ? { border: `1px solid ${accentColor}`, color: '#fff' }
                : { color: '#d1d5db' }}
            >
              {day}
              {hasTask && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{ background: isSelected ? '#000' : accentColor }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Day tasks */}
      <div className="flex-1 scroll-y mt-4">
        <p className="text-xs text-gray-500 mb-2">{selectedDay} {MONTHS[month]}</p>
        {dayTasks.length === 0
          ? <p className="text-gray-600 text-sm text-center mt-8">אין משימות ביום זה</p>
          : dayTasks.map(t => (
            <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-800 fade-up">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accentColor }} />
              <span className="text-sm">{t.title}</span>
              {t.reminder?.time && <span className="text-xs text-gray-500 mr-auto">{t.reminder.time}</span>}
            </div>
          ))
        }
      </div>
    </div>
  );
}
