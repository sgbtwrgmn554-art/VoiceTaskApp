import React, { useState, useRef } from 'react';
import { Task, TaskCategory, RecurrenceType, Attachment } from '../types';
import { useVoice } from '../hooks/useVoice';

interface Props {
  onBack: () => void;
  onSave: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  accentColor: string;
}

const RECURRENCE_OPTIONS: { label: string; value: RecurrenceType }[] = [
  { label: 'חד פעמי',    value: 'none' },
  { label: 'כל יום',     value: 'daily' },
  { label: 'כל שבוע',    value: 'weekly' },
  { label: 'כל חודש',    value: 'monthly' },
  { label: 'כל 3 חודשים', value: 'every3months' },
  { label: 'חצי שנה',    value: 'halfyear' },
  { label: 'כל שנה',     value: 'yearly' },
];

export default function NewRecordingScreen({ onBack, onSave, accentColor }: Props) {
  const [text, setText] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [time, setTime] = useState('');
  const [whatsapp, setWhatsapp] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [category, setCategory] = useState<TaskCategory>('כללי');
  const [attachments] = useState<Attachment[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isRecording, transcript, startRecording, stopRecording } = useVoice({
    onTranscript: (t) => setText(prev => prev ? prev + ' ' + t : t),
    onError: (e) => setError(e),
  });

  const handleMicClick = () => {
    setError('');
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleSave = () => {
    const title = text.trim();
    if (!title) { setError('יש להוסיף כותרת למשימה'); return; }

    onSave({
      title,
      description: '',
      status: 'todo',
      priority: 'medium',
      category,
      attachments,
      reminder: time ? {
        date: new Date().toISOString().split('T')[0],
        time,
        recurrence,
        whatsapp,
        whatsappPhone,
      } : undefined,
    });
  };

  return (
    <div className="flex flex-col h-full bg-black slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-800">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span className="text-sm">חזרה</span>
        </button>
        <h2 className="font-bold">הקלטה חדשה</h2>
        <div className="w-16" />
      </div>

      <div className="flex-1 scroll-y">
        {/* Mic button */}
        <div className="flex flex-col items-center pt-6 pb-4">
          <div className="relative">
            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-full mic-pulse" style={{ background: accentColor, opacity: 0.2 }} />
                <div className="absolute inset-0 rounded-full mic-pulse-2" style={{ background: accentColor, opacity: 0.15 }} />
              </>
            )}
            <button
              onClick={handleMicClick}
              className="relative w-24 h-24 rounded-full flex items-center justify-center transition-transform active:scale-95"
              style={{ background: isRecording ? accentColor : '#1c1c1e' }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93A8.001 8.001 0 014 11H2a10 10 0 0019.95 1H20a8 8 0 01-7 7.93V23h-2v-4.07z"/>
              </svg>
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-3">{isRecording ? 'מקליט...' : 'לחץ להקלטה'}</p>
          {error && (
            <p className="text-red-400 text-xs mt-2 px-6 text-center leading-relaxed">{error}</p>
          )}
        </div>

        <div className="px-4 space-y-4">
          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-500 text-sm">— או הקלד ידנית —</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Text input */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={'לדוגמה: "להתקשר לדנה מחר ב-10 בבוקר"'}
            className="w-full bg-gray-900 text-white rounded-2xl px-4 py-3 text-sm resize-none outline-none border border-gray-700 focus:border-gray-500"
            rows={3}
          />

          {/* Category */}
          <div>
            <p className="text-xs text-gray-500 mb-2">קטגוריה</p>
            <div className="flex gap-2 flex-wrap">
              {(['כללי', 'אישי', 'עבודה', 'משפחה'] as TaskCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="px-3 py-1.5 rounded-full text-sm border transition-all"
                  style={category === cat
                    ? { background: accentColor, borderColor: accentColor, color: '#000' }
                    : { background: 'transparent', borderColor: '#374151', color: '#9ca3af' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">חזרה</p>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
                <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
              </svg>
            </div>
            <div className="flex flex-wrap gap-2">
              {RECURRENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRecurrence(opt.value)}
                  className="px-3 py-1.5 rounded-full text-sm border transition-all"
                  style={recurrence === opt.value
                    ? { background: accentColor, borderColor: accentColor, color: '#000' }
                    : { background: 'transparent', borderColor: '#374151', color: '#9ca3af' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reminder time */}
          <div>
            <p className="text-sm text-gray-300 mb-2">⏰ שעת תזכורת</p>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full bg-gray-900 text-white text-left rounded-2xl px-4 py-3 border border-gray-700 focus:border-gray-500 outline-none text-lg"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* WhatsApp toggle */}
          <div className="flex items-center justify-between bg-gray-900 rounded-2xl px-4 py-3">
            <span className="text-sm">💬 שלח WhatsApp בזמן התזכורת</span>
            <button
              onClick={() => setWhatsapp(!whatsapp)}
              className="toggle-switch"
              style={{ background: whatsapp ? accentColor : '#374151' }}
              role="switch"
              aria-checked={whatsapp}
            >
              <span
                className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all duration-300"
                style={{ right: whatsapp ? '3px' : 'auto', left: whatsapp ? 'auto' : '3px' }}
              />
            </button>
          </div>

          {whatsapp && (
            <input
              type="tel"
              value={whatsappPhone}
              onChange={e => setWhatsappPhone(e.target.value)}
              placeholder="מספר טלפון (ללא +, לדוגמה: 972501234567)"
              className="w-full bg-gray-900 text-white rounded-2xl px-4 py-3 border border-gray-700 focus:border-gray-500 outline-none text-sm"
              dir="ltr"
            />
          )}

          {/* Attach files */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-between bg-gray-900 rounded-2xl px-4 py-3 text-sm text-gray-300"
          >
            <span>📎 צרף קבצים / תמונות</span>
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" />

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full py-4 rounded-2xl font-bold text-black text-base transition-transform active:scale-95"
            style={{ background: accentColor }}
          >
            🚀 שמור משימה
          </button>

          {/* Examples */}
          <div className="pb-4">
            <p className="text-xs text-gray-600 mb-2">💡 דוגמאות:</p>
            {['להתקשר לאמא מחר ב-10', 'פגישה עם דני ביום ראשון ב-14:00', 'לשלוח דוח עד סוף השבוע'].map(ex => (
              <button
                key={ex}
                onClick={() => setText(ex)}
                className="block w-full text-right text-xs text-gray-500 py-1 hover:text-gray-300"
              >
                • {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
