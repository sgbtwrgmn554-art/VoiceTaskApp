import React from 'react';
import { Task } from '../types';

interface Props { tasks: Task[]; accentColor: string; }

export default function StatsScreen({ tasks, accentColor }: Props) {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.status === 'done').length;
  const todo    = tasks.filter(t => t.status === 'todo').length;
  const inProg  = tasks.filter(t => t.status === 'in-progress').length;
  const pct     = total ? Math.round((done / total) * 100) : 0;

  const cats = ['כללי', 'אישי', 'עבודה', 'משפחה'];
  const catCounts = cats.map(c => ({ label: c, count: tasks.filter(t => t.category === c).length }));

  return (
    <div className="flex flex-col h-full bg-black px-4 pt-4 scroll-y">
      <h2 className="text-center font-bold text-lg mb-6">סטטיסטיקות</h2>

      {/* Progress circle */}
      <div className="flex flex-col items-center mb-8 fade-up">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="10" />
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="10"
              stroke={accentColor}
              strokeDasharray={`${pct * 2.51} 251`}
              strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{pct}%</span>
            <span className="text-xs text-gray-500">הושלם</span>
          </div>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'סה״כ', value: total, color: '#6b7280' },
          { label: 'הושלם', value: done, color: accentColor },
          { label: 'ממתין', value: todo, color: '#f97316' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 rounded-2xl p-4 text-center fade-up">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* By category */}
      <div className="bg-gray-900 rounded-2xl p-4 fade-up">
        <p className="text-sm text-gray-400 mb-3">לפי קטגוריה</p>
        {catCounts.map(c => (
          <div key={c.label} className="flex items-center gap-3 mb-2">
            <span className="text-sm text-gray-300 w-16">{c.label}</span>
            <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: total ? `${(c.count / total) * 100}%` : '0%', background: accentColor }} />
            </div>
            <span className="text-xs text-gray-500 w-4 text-left">{c.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
