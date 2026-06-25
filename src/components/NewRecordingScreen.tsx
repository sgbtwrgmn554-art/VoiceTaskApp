import React, { useState, useRef, useEffect } from 'react';
import { Task, RecurrenceType, ClassifyResult, LifeDomainId, LifeDomain } from '../types';
import { useVoice } from '../hooks/useVoice';
import AppLinkInput from './AppLinkInput';

type SmartSavePayload =
  | { kind: 'task'; data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> }
  | { kind: 'goal'; title: string; domainId: LifeDomainId; description: string; deadline?: string };

interface Props {
  onBack: () => void;
  onSmartSave: (payload: SmartSavePayload) => void;
  onAskJarvis?: (question: string) => void;
  accentColor: string;
  categories?: string[];
  defaultCategory?: string;
  defaultReminderTime?: string;
  savedWhatsappPhone?: string;
  autoClassify?: boolean;
  domains?: LifeDomain[];
}

const RECURRENCE: { label: string; value: RecurrenceType }[] = [
  { label: 'חד פעמי',     value: 'none' },
  { label: 'כל יום',      value: 'daily' },
  { label: 'כל שבוע',     value: 'weekly' },
  { label: 'כל חודש',     value: 'monthly' },
  { label: 'כל 3 חודשים', value: 'every3months' },
  { label: 'חצי שנה',     value: 'halfyear' },
  { label: 'כל שנה',      value: 'yearly' },
];

const DEFAULT_CATEGORIES = ['כללי', 'אישי', 'עבודה', 'משפחה'];

const TYPE_META: Record<ClassifyResult['type'], { emoji: string; label: string }> = {
  task:  { emoji: '📋', label: 'משימה' },
  habit: { emoji: '🔄', label: 'הרגל' },
  goal:  { emoji: '🎯', label: 'יעד ארוך טווח' },
  event: { emoji: '📅', label: 'אירוע' },
};

function errorMessage(code: string): string {
  switch (code) {
    case 'audio-capture': return 'לא נמצא מיקרופון במכשיר';
    case 'network': return 'שגיאת רשת — בדוק חיבור אינטרנט';
    case 'not-supported': return 'הדפדפן אינו תומך בהקלטת קול';
    default: return code.startsWith('error:') ? `שגיאה: ${code.slice(6)}` : code;
  }
}

export default function NewRecordingScreen({
  onBack, onSmartSave, onAskJarvis, accentColor,
  categories = DEFAULT_CATEGORIES,
  defaultCategory = 'כללי',
  defaultReminderTime = '',
  savedWhatsappPhone = '',
  autoClassify = true,
  domains = [],
}: Props) {
  const [text, setText]               = useState('');
  const [recurrence, setRecur]        = useState<RecurrenceType>('none');
  const [time, setTime]               = useState(defaultReminderTime);
  const [reminderMode, setReminderMode] = useState<'single' | 'window'>('single');
  const [windowEnd, setWindowEnd]     = useState('');
  const [repeatEvery, setRepeatEvery] = useState(30);
  const [taskUrl, setTaskUrl]         = useState('');
  const [whatsapp, setWhatsapp]       = useState(false);
  const [phone, setPhone]             = useState(savedWhatsappPhone);
  const [category, setCategory]       = useState(defaultCategory);
  const [errorCode, setErrorCode]     = useState('');
  const [classifying, setClassifying] = useState(false);
  const [preview, setPreview]         = useState<ClassifyResult | null>(null);
  const [showManual, setShowManual]   = useState(false);
  const [showVideo, setShowVideo]     = useState(false);
  const [videoUrl, setVideoUrl]       = useState('');
  const [videoGoal, setVideoGoal]     = useState('');
  const [videoResult, setVideoResult] = useState<null | { topic: string; tasks: { title: string; description: string; priority: string }[]; suggestedGoal: string | null; platform: string }>(null);
  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);

  const VIDEO_URL_RE = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\S+|youtu\.be\/\S+|tiktok\.com\/\S+|instagram\.com\/(?:p|reel)\/\S+))/i;

  const { isRecording, isSupported, interimTranscript, startRecording, stopRecording } = useVoice({
    onTranscript: t => {
      const newText = text ? text + ' ' + t : t;
      setText(newText);
      const urlMatch = newText.match(VIDEO_URL_RE);
      if (urlMatch) { setVideoUrl(urlMatch[1]); setShowVideo(true); }
      if (autoClassify) classify(newText);
    },
    onError: code => setErrorCode(code),
  });

  useEffect(() => { if (!isSupported) textareaRef.current?.focus(); }, [isSupported]);

  const classify = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length < 3) return;
    setClassifying(true);
    setPreview(null);
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) throw new Error();
      const result: ClassifyResult = await res.json();
      setPreview(result);
      // Auto-fill extracted time
      if (result.dueTime && !time) setTime(result.dueTime);
    } catch {
      // Silently fall back — user can still save manually
    } finally {
      setClassifying(false);
    }
  };

  const analyzeVideo = async () => {
    const url = videoUrl.trim();
    if (!url) return;
    setAnalyzingVideo(true);
    setVideoResult(null);
    try {
      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, userGoal: videoGoal.trim() }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setVideoResult(result);
    } catch {
      setErrorCode('שגיאה בניתוח הסרטון');
    } finally {
      setAnalyzingVideo(false);
    }
  };

  const handleMicClick = () => {
    setErrorCode('');
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleSave = () => {
    if (!text.trim() && !preview) { setErrorCode('יש להוסיף תוכן'); return; }

    const title = (preview?.title || text).trim();
    if (!title) return;

    if (preview?.type === 'goal') {
      onSmartSave({
        kind: 'goal',
        title,
        domainId: (preview.domain as LifeDomainId) || 'growth',
        description: preview.description,
        deadline: preview.dueDate || undefined,
      });
      return;
    }

    // task / habit / event → save as Task
    const recur: RecurrenceType =
      preview?.type === 'habit'
        ? (preview.recurrence === 'none' ? 'daily' : (preview.recurrence as RecurrenceType))
        : recurrence;

    const reminderTime = time || preview?.dueTime;
    onSmartSave({
      kind: 'task',
      data: {
        title,
        description: preview?.description || '',
        status: 'todo',
        priority: preview?.priority || 'medium',
        category,
        attachments: [],
        url: taskUrl || undefined,
        recurrence: recur !== 'none' ? recur : undefined,
        reminder: reminderTime
          ? {
              date: preview?.dueDate || new Date().toISOString().split('T')[0],
              time: reminderTime,
              recurrence: recur,
              whatsapp,
              whatsappPhone: phone,
              ...(reminderMode === 'window' && windowEnd ? { windowEnd, repeatEvery } : {}),
            }
          : undefined,
      },
    });
  };

  const isPermissionDenied = errorCode === 'not-allowed';

  return (
    <div className="flex flex-col h-full slide-in" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span className="text-sm">חזרה</span>
        </button>
        <h2 className="font-bold tracking-wide">הקלטה חדשה</h2>
        <div className="w-16" />
      </div>

      <div className="flex-1 scroll-y">

        {/* Permission denied banner */}
        {isPermissionDenied && (
          <div className="mx-5 mt-4 rounded-2xl px-4 py-3 flex items-start gap-3 fade-up"
               style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" className="mt-0.5 flex-shrink-0">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <div>
              <p className="text-sm font-medium" style={{ color: '#fbbf24' }}>גישה למיקרופון נדחתה</p>
              <p className="text-xs text-gray-400 mt-0.5">פתח הגדרות דפדפן ← אתרים ← מיקרופון, ואפשר גישה לאתר זה</p>
            </div>
          </div>
        )}

        {/* Unsupported banner */}
        {!isSupported && !isPermissionDenied && (
          <div className="mx-5 mt-4 rounded-2xl px-4 py-3 flex items-center gap-3 fade-up"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-sm text-gray-400">הדפדפן אינו תומך בהקלטת קול — הקלד ידנית</p>
          </div>
        )}

        {/* Mic */}
        <div className="flex flex-col items-center pt-7 pb-5">
          <div className="relative">
            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-full mic-pulse"  style={{ background: accentColor + '30' }} />
                <div className="absolute inset-0 rounded-full mic-pulse-2" style={{ background: accentColor + '20' }} />
              </>
            )}
            <button
              onClick={handleMicClick}
              disabled={!isSupported}
              className="relative w-24 h-24 rounded-full flex items-center justify-center transition-transform active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isRecording ? accentColor : '#1a1a1a',
                boxShadow: isRecording ? `0 0 32px ${accentColor}88` : '0 0 0 1px rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill={isRecording ? '#000' : 'white'}>
                <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93A8.001 8.001 0 014 11H2a10 10 0 0019.95 1H20a8 8 0 01-7 7.93V23h-2v-4.07z"/>
              </svg>
            </button>
          </div>

          <p className="text-sm mt-3" style={{ color: isRecording ? accentColor : '#6b7280' }}>
            {isRecording ? '● מקליט...' : isSupported ? 'לחץ להקלטה' : 'הקלד ידנית'}
          </p>

          {interimTranscript && (
            <p className="text-xs italic text-gray-500 mt-2 px-8 text-center">{interimTranscript}...</p>
          )}
          {errorCode && !isPermissionDenied && (
            <p className="text-red-400 text-xs mt-2 px-8 text-center">{errorMessage(errorCode)}</p>
          )}
        </div>

        <div className="px-5 space-y-4 pb-6">

          {/* Text input */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder='לדוגמה: "להתקשר לדנה מחר ב-10" או "לרדת 10 קילו עד סוף השנה"'
              rows={3}
              className="w-full text-white text-sm resize-none outline-none rounded-2xl px-4 py-3.5 pr-12"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
            />
            {/* Analyze button */}
            <button
              onClick={() => classify(text)}
              disabled={!text.trim() || classifying}
              className="absolute left-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: accentColor + '20', border: `1px solid ${accentColor}40` }}
              title="נתח עם AI"
            >
              {classifying
                ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              }
            </button>
          </div>

          {/* AI Preview Card */}
          {preview && (
            <div className="rounded-2xl px-4 py-4 fade-up space-y-3"
                 style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accentColor}30` }}>

              {/* Type badge */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: accentColor }}>
                  <span>{TYPE_META[preview.type].emoji}</span>
                  <span>{TYPE_META[preview.type].label}</span>
                </span>
                <div className="flex items-center gap-2">
                  {preview.priority === 'high' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#ef444420', color: '#ef4444' }}>דחוף</span>
                  )}
                  {preview.domain && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: '#9ca3af' }}>
                      {domains.find(d => d.id === preview.domain)?.label ?? preview.domain}
                    </span>
                  )}
                </div>
              </div>

              {/* Extracted title */}
              <p className="text-white font-medium text-base">{preview.title}</p>

              {/* Details row */}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {preview.dueDate && (
                  <span className="flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    {preview.dueDate}
                  </span>
                )}
                {preview.dueTime && (
                  <span className="flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {preview.dueTime}
                  </span>
                )}
                {preview.type === 'habit' && preview.recurrence !== 'none' && (
                  <span className="flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
                    </svg>
                    {preview.recurrence === 'daily' ? 'כל יום' : preview.recurrence === 'weekly' ? 'כל שבוע' : 'כל חודש'}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowManual(!showManual)}
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  ✏️
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95"
                  style={{ background: accentColor, color: '#000' }}
                >
                  {preview.type === 'goal' ? '🎯 שמור כיעד' : '✅ שמור'}
                </button>
                {preview.type === 'goal' && onAskJarvis && (
                  <button
                    onClick={() => {
                      handleSave();
                      onAskJarvis(`אני רוצה ${preview.title} — תעזור לי לבנות תוכנית ומפת דרכים מדויקת להגיע לשם`);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                  >
                    🤖 תוכנית
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Manual options — shown when no preview or user clicks "ערוך" */}
          {(!preview || showManual) && (
            <>
              {/* Category */}
              <div>
                <p className="text-xs text-gray-500 mb-2.5">קטגוריה</p>
                <div className="flex gap-2 flex-wrap">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)}
                      className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95"
                      style={category === cat
                        ? { background: accentColor, color: '#000' }
                        : { background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recurrence */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
                    <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                  </svg>
                  <p className="text-xs text-gray-500">חזרה</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RECURRENCE.map(opt => (
                    <button key={opt.value} onClick={() => setRecur(opt.value)}
                      className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95"
                      style={recurrence === opt.value
                        ? { background: accentColor, color: '#000' }
                        : { background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time / Reminder Window */}
              <div>
                <div className="flex gap-2 mb-3">
                  {(['single', 'window'] as const).map(mode => (
                    <button key={mode} onClick={() => setReminderMode(mode)}
                      className="flex-1 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                      style={reminderMode === mode
                        ? { background: accentColor, color: '#000' }
                        : { background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {mode === 'single' ? '⏰ שעה בודדת' : '🔁 חלון זמן'}
                    </button>
                  ))}
                </div>

                {reminderMode === 'single' ? (
                  <input type="time" value={time} onChange={e => setTime(e.target.value)}
                    className="w-full text-white text-xl text-left rounded-2xl px-4 py-3.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', colorScheme: 'dark' }} />
                ) : (
                  <div className="space-y-3 fade-up">
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1.5">התחלה</p>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)}
                          className="w-full text-white rounded-xl px-3 py-2.5 outline-none text-center"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', colorScheme: 'dark' }} />
                      </div>
                      <div className="pb-2.5 text-gray-600 text-lg">→</div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1.5">סיום</p>
                        <input type="time" value={windowEnd} onChange={e => setWindowEnd(e.target.value)}
                          className="w-full text-white rounded-xl px-3 py-2.5 outline-none text-center"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', colorScheme: 'dark' }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">תזכורת כל</p>
                      <div className="flex gap-2">
                        {[15, 30, 60].map(min => (
                          <button key={min} onClick={() => setRepeatEvery(min)}
                            className="flex-1 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                            style={repeatEvery === min
                              ? { background: accentColor, color: '#000' }
                              : { background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {min === 60 ? 'שעה' : `${min} דק׳`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp toggle */}
              <button onClick={() => setWhatsapp(!whatsapp)}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3.5 transition-colors"
                style={{ background: whatsapp ? accentColor + '18' : 'rgba(255,255,255,0.05)', border: `1px solid ${whatsapp ? accentColor + '44' : 'rgba(255,255,255,0.09)'}` }}>
                <span className="text-sm text-gray-200">💬 שלח WhatsApp בזמן התזכורת</span>
                <div className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
                     style={{ background: whatsapp ? accentColor : '#374151' }}>
                  <span className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all duration-300 shadow"
                        style={{ right: whatsapp ? '3px' : 'auto', left: whatsapp ? 'auto' : '3px' }} />
                </div>
              </button>

              {whatsapp && (
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="מספר טלפון (972501234567)" dir="ltr"
                  className="w-full text-white text-sm rounded-2xl px-4 py-3.5 outline-none fade-up"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }} />
              )}

              {/* App / Link */}
              <AppLinkInput value={taskUrl} onChange={setTaskUrl} accentColor={accentColor} />

              {/* Attach */}
              <button onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm text-gray-400"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <span>📎 צרף קבצים / תמונות</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <input ref={fileRef} type="file" multiple className="hidden" />

              {/* Manual save (only when no preview) */}
              {!preview && (
                <button onClick={handleSave}
                  className="w-full py-4 rounded-2xl font-bold text-black text-base transition-transform active:scale-95 shadow-xl"
                  style={{ background: accentColor, boxShadow: `0 6px 20px ${accentColor}55` }}>
                  🚀 שמור משימה
                </button>
              )}
            </>
          )}

          {/* ── Video Link Analyzer ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-gray-300">
              <span className="flex items-center gap-2">
                <span>🎬</span>
                <span>ניתוח סרטון (YouTube / TikTok / Instagram)</span>
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"
                   className="transition-transform" style={{ transform: showVideo ? 'rotate(90deg)' : 'none' }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            {showVideo && (
              <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="pt-3">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    placeholder="https://youtu.be/... או tiktok.com/..."
                    dir="ltr"
                    className="w-full text-white text-sm rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
                <input
                  type="text"
                  value={videoGoal}
                  onChange={e => setVideoGoal(e.target.value)}
                  placeholder="מה אתה רוצה להשיג מהסרטון? (אופציונלי)"
                  className="w-full text-white text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <button
                  onClick={analyzeVideo}
                  disabled={!videoUrl.trim() || analyzingVideo}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-black transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: accentColor }}>
                  {analyzingVideo
                    ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> מנתח...</span>
                    : '✨ נתח סרטון'}
                </button>

                {videoResult && (
                  <div className="fade-up space-y-3 pt-1">
                    <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-[10px] text-gray-500 mb-1">נושא הסרטון</p>
                      <p className="text-sm text-white">{videoResult.topic}</p>
                    </div>

                    {videoResult.suggestedGoal && (
                      <div className="rounded-xl px-3 py-2.5" style={{ background: accentColor + '15', border: `1px solid ${accentColor}30` }}>
                        <p className="text-[10px] mb-1" style={{ color: accentColor }}>🎯 יעד מוצע</p>
                        <p className="text-sm text-white">{videoResult.suggestedGoal}</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">משימות מוצעות:</p>
                    {videoResult.tasks.map((t, i) => (
                      <div key={i}
                           className="rounded-xl px-3 py-2.5 flex items-start gap-3"
                           style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">{t.title}</p>
                          {t.description && <p className="text-[11px] text-gray-500 mt-0.5">{t.description}</p>}
                        </div>
                        <button
                          onClick={() => {
                            setText(t.title);
                            if (autoClassify) classify(t.title);
                            setShowVideo(false);
                          }}
                          className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full font-medium text-black"
                          style={{ background: accentColor }}>
                          הוסף
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Examples */}
          {!text && !showVideo && (
            <div>
              <p className="text-xs text-gray-600 mb-2">💡 דוגמאות:</p>
              {[
                'להתקשר לאמא מחר ב-10',
                'לרוץ כל בוקר ב-7',
                'לחסוך 20,000 שקל עד סוף השנה',
              ].map(ex => (
                <button key={ex} onClick={() => { setText(ex); classify(ex); }}
                  className="block w-full text-right text-xs text-gray-600 py-1.5 hover:text-gray-400 transition-colors">
                  • {ex}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
