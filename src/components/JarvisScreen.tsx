import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Task, Goal, Habit, HabitLog, ReflectionEntry, AppTab } from '../types';
import { useSpeech } from '../hooks/useSpeech';

type JarvisState = 'idle' | 'loading' | 'speaking' | 'listening' | 'thinking' | 'confirming' | 'focus' | 'weekly';

interface Message { role: 'jarvis' | 'user'; text: string; }

type JarvisAction =
  | { type: 'mark_done'; taskId: string; taskTitle: string }
  | { type: 'create_task'; title: string; priority?: string }
  | { type: 'edit_task'; taskId: string; taskTitle: string; field: string; value: string }
  | { type: 'delete_task'; taskId: string; taskTitle: string }
  | { type: 'add_habit'; title: string; emoji: string; frequency: 'daily' | 'weekly'; targetDays: number[]; color: string }
  | { type: 'toggle_habit'; habitId: string; habitTitle: string }
  | { type: 'delete_habit'; habitId: string; habitTitle: string }
  | { type: 'create_goal'; title: string; domainId?: string; description?: string }
  | { type: 'delete_goal'; goalId: string; goalTitle: string }
  | { type: 'navigate'; tab: AppTab }
  | { type: 'add_reflection'; gratitude: string; learning: string; tomorrowFocus: string; mood: 1|2|3|4|5 }
  | { type: 'start_focus'; minutes: number; taskTitle?: string }
  | { type: 'weekly_review' }
  | { type: 'suggest_app'; appName: string; url: string; reason: string };

interface FocusData { totalSec: number; leftSec: number; taskTitle: string; }

interface Props {
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  habitLogs?: HabitLog[];
  reflections?: ReflectionEntry[];
  aiLanguage?: string;
  aiStyle?: string;
  jarvisMode?: string;
  appearanceLevel?: string;
  accentColor: string;
  onClose: () => void;
  onMarkTaskDone: (id: string) => void;
  onCreateTask: (input: { title: string; priority?: string }) => void;
  onUpdateTask: (id: string, patch: Record<string, unknown>) => void;
  onDeleteTask: (id: string) => void;
  onAddHabit: (data: Omit<Habit, 'id' | 'createdAt'>) => void;
  onToggleHabit: (id: string) => void;
  onDeleteHabit: (id: string) => void;
  onCreateGoal: (title: string, domainId: string, description?: string) => void;
  onDeleteGoal: (id: string) => void;
  onAddReflection: (data: Omit<ReflectionEntry, 'id' | 'createdAt'>) => void;
  onNavigate: (tab: AppTab) => void;
}

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function JarvisScreen({
  tasks, goals, habits, habitLogs = [], reflections = [],
  aiLanguage = 'hebrew', jarvisMode = 'coach', appearanceLevel = 'balanced', accentColor, onClose,
  onMarkTaskDone, onCreateTask, onUpdateTask, onDeleteTask,
  onAddHabit, onToggleHabit, onDeleteHabit,
  onCreateGoal, onDeleteGoal, onAddReflection, onNavigate,
}: Props) {
  const [state, setState]                 = useState<JarvisState>('idle');
  const [messages, setMessages]           = useState<Message[]>([]);
  const [started, setStarted]             = useState(false);
  const [pendingAction, setPendingAction] = useState<JarvisAction | null>(null);
  const [focusData, setFocusData]         = useState<FocusData | null>(null);
  const [focusMinutes, setFocusMinutes]   = useState(25);
  const [pendingImage, setPendingImage]   = useState<{ base64: string; mediaType: string } | null>(null);
  const { speak, stop, isSupported: ttsSupported } = useSpeech();
  const recognitionRef = useRef<any>(null);
  const scrollRef      = useRef<HTMLDivElement>(null);
  const onResultRef    = useRef<(text: string) => void>(() => {});
  const focusTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const photoInputRef  = useRef<HTMLInputElement>(null);

  const addMsg = useCallback((role: 'jarvis' | 'user', text: string) => {
    setMessages(prev => [...prev, { role, text }]);
    setTimeout(() => { scrollRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }); }, 50);
  }, []);

  const speakThen = useCallback((text: string, onEnd: () => void) => {
    setState('speaking');
    if (ttsSupported) speak(text, onEnd);
    else setTimeout(onEnd, 500);
  }, [speak, ttsSupported]);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return;
    setState('listening');
    const rec = new SpeechRecognitionAPI();
    rec.lang = aiLanguage === 'english' ? 'en-US' : 'he-IL';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      if (text.trim()) onResultRef.current(text.trim());
    };
    rec.onerror = () => setState('idle');
    rec.onend   = () => setState(s => s === 'listening' ? 'idle' : s);
    recognitionRef.current = rec;
    rec.start();
  }, [aiLanguage]);

  const sendQuestion = useCallback(async (question: string, image?: { base64: string; mediaType: string }) => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    addMsg('user', image ? `📷 ${question || 'תנתח את התמונה'}` : question);
    setState('thinking');
    try {
      const body: Record<string, unknown> = { question, tasks, habits, goals, habitLogs, language: aiLanguage, jarvisMode, appearanceLevel };
      if (image) { body.imageBase64 = image.base64; body.imageMediaType = image.mediaType; }
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const text = data.text || 'מצטער, לא הצלחתי לקבל תשובה.';
      addMsg('jarvis', text);
      if (data.action) {
        if (data.action.type === 'weekly_review') {
          speakThen(text, () => fetchWeeklyReview());
        } else if (data.action.type === 'start_focus') {
          setFocusMinutes(data.action.minutes || 25);
          setPendingAction(data.action);
          speakThen(text, () => setState('confirming'));
        } else {
          setPendingAction(data.action);
          speakThen(text, () => setState('confirming'));
        }
      } else {
        speakThen(text, () => startListening());
      }
    } catch {
      const err = 'מצטערת, יש בעיה בחיבור.';
      addMsg('jarvis', err);
      speakThen(err, () => startListening());
    }
  }, [addMsg, tasks, habits, goals, habitLogs, aiLanguage, jarvisMode, appearanceLevel, speakThen, startListening]);

  useEffect(() => { onResultRef.current = sendQuestion; }, [sendQuestion]);

  const speakAndListen = useCallback((text: string) => {
    addMsg('jarvis', text);
    speakThen(text, () => startListening());
  }, [addMsg, speakThen, startListening]);

  const fetchWeeklyReview = useCallback(async () => {
    setState('weekly');
    try {
      const res = await fetch('/api/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, habits, habitLogs, goals, reflections, language: aiLanguage }),
      });
      const data = await res.json();
      const text = data.text || 'לא הצלחתי לייצר סיכום.';
      speakAndListen(text);
    } catch {
      speakAndListen('מצטערת, לא הצלחתי לייצר סיכום שבועי.');
    }
  }, [tasks, habits, habitLogs, goals, reflections, aiLanguage, speakAndListen]);

  const startFocusTimer = useCallback((minutes: number, taskTitle: string) => {
    const totalSec = minutes * 60;
    setFocusData({ totalSec, leftSec: totalSec, taskTitle });
    setState('focus');
    focusTimerRef.current = setInterval(() => {
      setFocusData(prev => {
        if (!prev) return null;
        const next = prev.leftSec - 1;
        if (next <= 0) {
          clearInterval(focusTimerRef.current!);
          const doneMsg = 'הזמן הסתיים! עשית עבודה מצוינת 🎉';
          addMsg('jarvis', doneMsg);
          speakThen(doneMsg, () => startListening());
          setState('speaking');
          return null;
        }
        return { ...prev, leftSec: next };
      });
    }, 1000);
  }, [addMsg, speakThen, startListening]);

  const stopFocusTimer = useCallback(() => {
    if (focusTimerRef.current) clearInterval(focusTimerRef.current);
    setFocusData(null);
    const msg = 'עצרתי את הטיימר.';
    addMsg('jarvis', msg);
    speakThen(msg, () => startListening());
  }, [addMsg, speakThen, startListening]);

  const confirmDone = useCallback((msg = 'בוצע!') => {
    addMsg('jarvis', msg);
    speakThen(msg, () => startListening());
  }, [addMsg, speakThen, startListening]);

  const handleConfirm = useCallback(() => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    try {
      if (action.type === 'mark_done') {
        onMarkTaskDone(action.taskId);
        confirmDone();
      } else if (action.type === 'create_task') {
        onCreateTask({ title: action.title, priority: action.priority });
        confirmDone('נוצר! רוצה שאוסיף עוד דברים קשורים לנושא?');
      } else if (action.type === 'edit_task') {
        onUpdateTask(action.taskId, { [action.field]: action.value });
        confirmDone(`עדכנתי את "${action.taskTitle}".`);
      } else if (action.type === 'delete_task') {
        onDeleteTask(action.taskId);
        confirmDone(`מחקתי את "${action.taskTitle}".`);
      } else if (action.type === 'add_habit') {
        onAddHabit({ title: action.title, emoji: action.emoji, frequency: action.frequency, targetDays: action.targetDays, color: action.color });
        confirmDone('נוסף! רוצה שאציע הרגלים נוספים קשורים?');
      } else if (action.type === 'toggle_habit') {
        onToggleHabit(action.habitId);
        confirmDone(`סימנתי "${action.habitTitle}" כבוצע היום!`);
      } else if (action.type === 'delete_habit') {
        onDeleteHabit(action.habitId);
        confirmDone(`מחקתי את ההרגל "${action.habitTitle}".`);
      } else if (action.type === 'create_goal') {
        onCreateGoal(action.title, action.domainId || 'growth', action.description);
        confirmDone();
      } else if (action.type === 'delete_goal') {
        onDeleteGoal(action.goalId);
        confirmDone(`מחקתי את היעד "${action.goalTitle}".`);
      } else if (action.type === 'navigate') {
        onNavigate(action.tab);
        onClose();
      } else if (action.type === 'add_reflection') {
        const today = new Date().toISOString().slice(0, 10);
        onAddReflection({
          date: today,
          gratitude: action.gratitude,
          learning: action.learning,
          tomorrowFocus: action.tomorrowFocus,
          mood: action.mood,
        });
        confirmDone('שמרתי את הרפלקציה היומית שלך!');
      } else if (action.type === 'start_focus') {
        const mins = focusMinutes;
        const msg = `מתחיל ${mins} דקות ריכוז. בהצלחה!`;
        addMsg('jarvis', msg);
        speakThen(msg, () => startFocusTimer(mins, action.taskTitle || ''));
      } else if (action.type === 'suggest_app') {
        window.open(action.url, '_blank', 'noopener noreferrer');
        confirmDone(`פתחתי את ${action.appName}. בהצלחה!`);
      }
    } catch {
      confirmDone();
    }
  }, [pendingAction, focusMinutes, onMarkTaskDone, onCreateTask, onUpdateTask, onDeleteTask,
      onAddHabit, onToggleHabit, onDeleteHabit, onCreateGoal, onDeleteGoal, onAddReflection,
      onNavigate, onClose, confirmDone, addMsg, speakThen, startFocusTimer]);

  const handleCancel = useCallback(() => {
    setPendingAction(null);
    const cancel = 'בסדר, ביטלתי.';
    addMsg('jarvis', cancel);
    speakThen(cancel, () => startListening());
  }, [addMsg, speakThen, startListening]);

  const fetchBriefing = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, goals, habits, language: aiLanguage }),
      });
      const data = await res.json();
      speakAndListen(data.text || 'בוקר טוב! אפשר לשאול אותי שאלות.');
    } catch {
      speakAndListen('שלום! אני ג\'ארוויס. אפשר לשאול אותי שאלות.');
    }
  }, [tasks, goals, habits, aiLanguage, speakAndListen]);

  const handleMicPress = () => {
    if (state === 'focus') return;
    if (state === 'listening') {
      recognitionRef.current?.stop();
      setState('idle');
    } else if (state === 'speaking') {
      stop();
      startListening();
    } else if (state === 'confirming') {
      handleCancel();
    } else {
      startListening();
    }
  };

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      const mediaType = file.type || 'image/jpeg';
      setPendingImage({ base64, mediaType });
      if (!started) { setStarted(true); }
      sendQuestion('', { base64, mediaType });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [started, sendQuestion]);

  useEffect(() => () => {
    stop();
    try { recognitionRef.current?.stop(); } catch {}
    if (focusTimerRef.current) clearInterval(focusTimerRef.current);
  }, []);

  const statusLabel: Record<JarvisState, string> = {
    idle:       'לחץ על המיק לשאלה',
    loading:    'טוען...',
    speaking:   'מדבר...',
    listening:  'מאזין...',
    thinking:   'חושב...',
    confirming: 'ממתין לאישור',
    focus:      'ריכוז פעיל',
    weekly:     'טוען סיכום שבועי...',
  };

  const pulseColor =
    state === 'listening'  ? '#ef4444'
    : state === 'speaking' ? accentColor
    : state === 'thinking' ? '#a855f7'
    : state === 'confirming' ? '#f59e0b'
    : state === 'focus' ? '#3b82f6'
    : 'rgba(255,255,255,0.1)';

  const actionLabel = !pendingAction ? '' :
    pendingAction.type === 'mark_done'      ? `✓ ${pendingAction.taskTitle}` :
    pendingAction.type === 'create_task'    ? `+ משימה: ${pendingAction.title}` :
    pendingAction.type === 'edit_task'      ? `✏️ ${pendingAction.taskTitle}` :
    pendingAction.type === 'delete_task'    ? `🗑 מחק: ${pendingAction.taskTitle}` :
    pendingAction.type === 'add_habit'      ? `${pendingAction.emoji} הרגל: ${pendingAction.title}` :
    pendingAction.type === 'toggle_habit'   ? `✓ הרגל: ${pendingAction.habitTitle}` :
    pendingAction.type === 'delete_habit'   ? `🗑 הרגל: ${pendingAction.habitTitle}` :
    pendingAction.type === 'create_goal'    ? `🎯 יעד: ${pendingAction.title}` :
    pendingAction.type === 'delete_goal'    ? `🗑 יעד: ${pendingAction.goalTitle}` :
    pendingAction.type === 'navigate'       ? `🧭 נווט: ${pendingAction.tab}` :
    pendingAction.type === 'add_reflection' ? `📔 רפלקציה יומית` :
    pendingAction.type === 'start_focus'    ? `⏱ טיימר ריכוז` :
    pendingAction.type === 'suggest_app'    ? `📱 ${pendingAction.appName}` : '';

  const isFocusAction = pendingAction?.type === 'start_focus';

  // Focus ring math
  const focusProgress = focusData ? (focusData.totalSec - focusData.leftSec) / focusData.totalSec : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#050505' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 transition-opacity" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div className="text-center">
          <p className="text-sm font-bold tracking-widest text-white" style={{ letterSpacing: '0.2em' }}>J.A.R.V.I.S</p>
          <p className="text-[10px] text-gray-600 tracking-wider mt-0.5">עוזר אישי</p>
        </div>
        <button
          onClick={() => { if (started && state === 'idle') fetchWeeklyReview(); else if (!started) { setStarted(true); fetchWeeklyReview(); } }}
          title="סיכום שבועי"
          className="w-9 h-9 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 transition-opacity text-base"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          📋
        </button>
      </div>

      {/* Focus Timer UI */}
      {state === 'focus' && focusData ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 fade-up">
          <p className="text-xs tracking-widest text-gray-500 uppercase">ריכוז</p>
          {focusData.taskTitle && (
            <p className="text-sm text-gray-400 text-center px-8">{focusData.taskTitle}</p>
          )}
          <div className="relative">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
              <circle
                cx="70" cy="70" r={radius}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - focusProgress)}
                transform="rotate(-90 70 70)"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-3xl font-mono font-bold text-white">{fmtTime(focusData.leftSec)}</p>
            </div>
          </div>
          <button
            onClick={stopFocusTimer}
            className="px-8 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}
          >
            עצור טיימר
          </button>
        </div>
      ) : (
        <>
          {/* Orb */}
          <div className="flex-shrink-0 flex items-center justify-center py-8">
            <div className="relative">
              {(state === 'listening' || state === 'speaking' || state === 'confirming') && (
                <>
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ background: pulseColor + '20', transform: 'scale(1.6)' }} />
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ background: pulseColor + '10', transform: 'scale(2)', animationDelay: '0.3s' }} />
                </>
              )}
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500"
                style={{
                  background: `radial-gradient(circle at 40% 35%, ${pulseColor}66, ${pulseColor}11)`,
                  boxShadow: `0 0 40px ${pulseColor}44, inset 0 0 20px ${pulseColor}22`,
                  border: `1px solid ${pulseColor}33`,
                }}
              >
                {state === 'thinking' || state === 'weekly' ? (
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white opacity-60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                ) : state === 'confirming' ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" opacity={0.9}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1" fill="#f59e0b" stroke="none"/>
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="white" opacity={0.8}>
                    <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93A8.001 8.001 0 014 11H2a10 10 0 0019.95 1H20a8 8 0 01-7 7.93V23h-2v-4.07z"/>
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <p className="text-center text-xs text-gray-500 tracking-wider mb-4 flex-shrink-0">{statusLabel[state]}</p>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-3 pb-2">
            {!started && messages.length === 0 && (
              <div className="text-center mt-8 fade-up">
                <p className="text-gray-600 text-sm">לחץ "הפעל" כדי לקבל סיכום יומי</p>
                <p className="text-gray-700 text-xs mt-1">ג'ארוויס יקרא לך מה יש לך ויחכה לשאלות</p>
                <p className="text-gray-700 text-xs mt-1">לחץ 📋 לסיכום שבועי</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm"
                  style={m.role === 'jarvis'
                    ? { background: accentColor + '18', border: `1px solid ${accentColor}30`, color: '#e5e7eb' }
                    : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }
                  }
                >
                  {m.role === 'jarvis' && <p className="text-[10px] mb-1 opacity-50" style={{ color: accentColor }}>JARVIS</p>}
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Confirmation card */}
          {pendingAction && state === 'confirming' && (
            <div className="flex-shrink-0 px-4 pb-2 fade-up">
              <div className="rounded-2xl p-4" style={{ background: '#f59e0b14', border: '1px solid #f59e0b44' }}>
                <p className="text-sm font-semibold mb-3" style={{ color: '#f59e0b' }}>{actionLabel}</p>
                {isFocusAction && (
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <button
                      onClick={() => setFocusMinutes(m => Math.max(1, m - 5))}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-all active:scale-90"
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#e5e7eb' }}
                    >−</button>
                    <span className="text-2xl font-bold text-white w-20 text-center">{focusMinutes} דק׳</span>
                    <button
                      onClick={() => setFocusMinutes(m => Math.min(120, m + 5))}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-all active:scale-90"
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#e5e7eb' }}
                    >+</button>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.97]"
                    style={{ background: 'rgba(255,255,255,0.07)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
                    style={{ background: '#f59e0b', color: '#000' }}
                  >
                    {isFocusAction ? `התחל ${focusMinutes} דק׳ ⏱` : 'אשר ✓'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex-shrink-0 px-6 pb-8 pt-4 flex items-center gap-4">
            {!started ? (
              <button
                onClick={() => { setStarted(true); fetchBriefing(); }}
                className="flex-1 py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98]"
                style={{ background: accentColor, color: '#000' }}
              >
                הפעל ג'ארוויס
              </button>
            ) : (
              <>
                <button
                  onClick={() => { stop(); setPendingAction(null); try { recognitionRef.current?.stop(); } catch {} setState('idle'); }}
                  className="w-12 h-12 rounded-full flex items-center justify-center opacity-40 hover:opacity-70 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                </button>
                <button
                  onClick={handleMicPress}
                  className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all active:scale-[0.97]"
                  style={{
                    background: state === 'listening' ? '#ef444422' : state === 'confirming' ? '#f59e0b22' : accentColor + '18',
                    border: `2px solid ${state === 'listening' ? '#ef4444' : state === 'confirming' ? '#f59e0b' : accentColor}`,
                    color:  state === 'listening' ? '#ef4444' : state === 'confirming' ? '#f59e0b' : accentColor,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93A8.001 8.001 0 014 11H2a10 10 0 0019.95 1H20a8 8 0 01-7 7.93V23h-2v-4.07z"/>
                  </svg>
                  {state === 'listening' ? 'מאזין...' : state === 'confirming' ? 'ביטול' : 'שאל שאלה'}
                </button>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={state === 'thinking' || state === 'focus'}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-opacity"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    opacity: (state === 'thinking' || state === 'focus') ? 0.3 : 0.7,
                  }}
                  title="שלח תמונה"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
