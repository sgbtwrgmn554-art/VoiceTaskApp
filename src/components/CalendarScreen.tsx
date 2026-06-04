import React, { useState, useEffect } from 'react';
import { Task } from '../types';

interface Props { tasks: Task[]; accentColor: string; }

const DAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

export default function CalendarScreen({ tasks, accentColor }: Props) {
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [visible, setVisible] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const tasksByDay = new Map<number, Task[]>();
  tasks.forEach(t => {
    if (!t.reminder?.date) return;
    const [y, m, d] = t.reminder.date.split('-').map(Number);
    if (y === year && m - 1 === month) {
      if (!tasksByDay.has(d)) tasksByDay.set(d, []);
      tasksByDay.get(d)!.push(t);
    }
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selDay = selected.getDate();
  const selMonth = selected.getMonth();
  const selYear = selected.getFullYear();

  const dayTasks = tasks.filter(t => {
    if (!t.reminder?.date) return false;
    const [y, m, d] = t.reminder.date.split('-').map(Number);
    return y === selYear && m - 1 === selMonth && d === selDay;
  });

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-center font-bold text-lg mb-4"
            style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(-10px)', transition: 'all 0.4s ease' }}>
          📅 קלנדר
        </h2>

        {/* Month navigator */}
        <div className="flex items-center justify-between mb-3 bg-gray-900 rounded-2xl px-4 py-3"
             style={{ opacity: visible ? 1 : 0, transition: 'all 0.4s ease 0.1s' }}>
          <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <span className="font-semibold text-base">{MONTHS_HE[month]} {year}</span>
          <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
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
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = day === selDay && month === selMonth && year === selYear;
            const dayTaskList = tasksByDay.get(day) || [];
            const hasTasks = dayTaskList.length > 0;

            return (
              <button
                key={i}
                onClick={() => setSelected(new Date(year, month, day))}
                className="aspect-square rounded-full flex flex-col items-center justify-center text-sm relative transition-all duration-200 active:scale-90"
                style={isSelected
                  ? { background: accentColor, color: '#000', fontWeight: 700 }
                  : isToday
                  ? { border: `1.5px solid ${accentColor}`, color: '#fff' }
                  : { color: '#d1d5db' }}
              >
                {day}
                {hasTasks && (
                  <span
                    className="absolute bottom-[3px] w-1.5 h-1.5 rounded-full"
                    style={{ background: isSelected ? '#000' : accentColor }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-800 mx-4 my-3" />

      {/* Selected day tasks */}
      <div className="flex-1 scroll-y px-4 pb-4">
        <div className="flex items-center justify-between mb-3"
             style={{ opacity: visible ? 1 : 0, transition: 'all 0.4s ease 0.3s' }}>
          <p className="text-sm font-semibold text-white">
            {selDay} {MONTHS_HE[selMonth]}
          </p>
          <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded-full">
            {dayTasks.length} משימות
          </span>
        </div>

        {dayTasks.length === 0 ? (
          <div className="text-center mt-10 fade-up">
            <div className="text-3xl mb-2">✨</div>
            <p className="text-gray-600 text-sm">אין משימות ביום זה</p>
          </div>
        ) : (
          dayTasks.map((t, idx) => (
            <div
              key={t.id}
              className="flex items-center gap-3 py-3 border-b border-gray-800 fade-up"
              style={{ animationDelay: `${idx * 0.06}s` }}
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: accentColor }} />
              <div className="flex-1">
                <p className={`text-sm ${t.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>{t.title}</p>
                {t.category && <p className="text-xs text-gray-600 mt-0.5">{t.category}</p>}
              </div>
              {t.reminder?.time && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {t.reminder.time}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
