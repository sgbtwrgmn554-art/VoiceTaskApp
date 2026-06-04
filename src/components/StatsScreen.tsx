import React, { useState, useEffect } from 'react';
import { Task } from '../types';

interface Props { tasks: Task[]; accentColor: string; }

export default function StatsScreen({ tasks, accentColor }: Props) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimated(true), 100);
  }, []);

  const total  = tasks.length;
  const done   = tasks.filter(t => t.status === 'done').length;
  const todo   = tasks.filter(t => t.status === 'todo').length;
  const active = tasks.filter(t => t.status === 'in-progress').length;
  const pct    = total ? Math.round((done / total) * 100) : 0;

  const cats = [
    { label: 'כללי',    color: '#6b7280' },
    { label: 'אישי',    color: '#f97316' },
    { label: 'עבודה',   color: '#3b82f6' },
    { label: 'משפחה',   color: '#a855f7' },
  ];
  const catData = cats.map(c => ({
    ...c,
    count: tasks.filter(t => t.category === c.label).length,
  }));

  const thisWeekDone = tasks.filter(t => {
    if (t.status !== 'done') return false;
    const d = new Date(t.updatedAt);
    const now = new Date();
    return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const circumference = 2 * Math.PI * 40;

  return (
    <div className="flex flex-col h-full bg-black scroll-y pb-4">
      <h2 className="text-center font-bold text-lg pt-4 pb-2 fade-up">📊 סטטיסטיקות</h2>

      {/* Progress ring */}
      <div className="flex flex-col items-center py-4 fade-up">
        <div className="relative w-36 h-36 bounce-in">
          <svg className="w-full h-full" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="40" fill="none" strokeWidth="10"
              stroke={accentColor}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={animated ? circumference * (1 - pct / 100) : circumference}
              style={{ transition: 'stroke-dashoffset 1.2s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold">{pct}%</span>
            <span className="text-xs text-gray-500">הושלם</span>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-2">{done} מתוך {total} משימות</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-4">
        {[
          { label: 'סה״כ',   value: total,  icon: '📋', color: '#6b7280' },
          { label: 'הושלמו', value: done,   icon: '✅', color: accentColor },
          { label: 'ממתינות', value: todo,  icon: '⏳', color: '#f97316' },
        ].map((s, i) => (
          <div
            key={s.label}
            className="bg-gray-900 rounded-2xl p-4 text-center"
            style={{
              opacity: animated ? 1 : 0,
              transform: animated ? 'none' : 'translateY(20px)',
              transition: `all 0.5s ease ${0.1 + i * 0.1}s`,
            }}
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly highlight */}
      <div className="mx-4 mb-4 bg-gray-900 rounded-2xl p-4"
           style={{ opacity: animated ? 1 : 0, transition: 'all 0.5s ease 0.4s' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">השבוע הושלמו</p>
            <p className="text-3xl font-bold mt-1" style={{ color: accentColor }}>{thisWeekDone}</p>
          </div>
          <div className="text-4xl">🔥</div>
        </div>
      </div>

      {/* By category */}
      <div className="mx-4 bg-gray-900 rounded-2xl p-4"
           style={{ opacity: animated ? 1 : 0, transition: 'all 0.5s ease 0.5s' }}>
        <p className="text-sm font-semibold mb-4">לפי קטגוריה</p>
        {catData.map((c, i) => (
          <div key={c.label} className="flex items-center gap-3 mb-3 last:mb-0">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
            <span className="text-sm text-gray-300 w-14">{c.label}</span>
            <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: animated && total ? `${Math.max((c.count / total) * 100, c.count > 0 ? 5 : 0)}%` : '0%',
                  background: c.color,
                  transition: `width 0.8s ease ${0.6 + i * 0.1}s`,
                }}
              />
            </div>
            <span className="text-sm font-bold w-5 text-left" style={{ color: c.color }}>{c.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
