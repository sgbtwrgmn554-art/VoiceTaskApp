import React from 'react';
import { Reminder, RecurrenceType } from '../types';

interface ReminderFormProps {
  value?: Reminder;
  onChange: (reminder: Reminder | undefined) => void;
}

const recurrenceOptions: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'חד-פעמי' },
  { value: 'daily', label: 'יומי' },
  { value: 'weekly', label: 'שבועי' },
  { value: 'monthly', label: 'חודשי' },
  { value: 'every3months', label: 'כל 3 חודשים' },
  { value: 'halfyear', label: 'חצי שנה' },
  { value: 'yearly', label: 'שנתי' },
];

export function ReminderForm({ value, onChange }: ReminderFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  const handleEnable = () => {
    onChange({
      date: today,
      time: '09:00',
      recurrence: 'none',
    });
  };

  const handleDisable = () => onChange(undefined);

  const handleChange = (field: keyof Reminder, val: string) => {
    if (!value) return;
    onChange({ ...value, [field]: val });
  };

  if (!value) {
    return (
      <button
        type="button"
        onClick={handleEnable}
        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        הוסף תזכורת
      </button>
    );
  }

  return (
    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-700 font-medium text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          תזכורת
        </div>
        <button
          type="button"
          onClick={handleDisable}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="הסר תזכורת"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">תאריך</label>
          <input
            type="date"
            value={value.date}
            min={today}
            onChange={e => handleChange('date', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">שעה</label>
          <input
            type="time"
            value={value.time}
            onChange={e => handleChange('time', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">חזרה</label>
        <div className="flex gap-2 flex-wrap">
          {recurrenceOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleChange('recurrence', opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                value.recurrence === opt.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!value.whatsapp}
            onChange={e => onChange({ ...value, whatsapp: e.target.checked })}
            className="rounded"
          />
          <span>שלח גם ב-WhatsApp</span>
        </label>
        {value.whatsapp && (
          <input
            type="tel"
            placeholder="מספר טלפון (כולל קידומת מדינה, למשל 972501234567)"
            value={value.whatsappPhone || ''}
            onChange={e => onChange({ ...value, whatsappPhone: e.target.value })}
            className="mt-2 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            dir="ltr"
          />
        )}
      </div>
    </div>
  );
}
