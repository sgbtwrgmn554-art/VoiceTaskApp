import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Task, Goal, Habit } from '../types';
import { useSpeech } from '../hooks/useSpeech';

type JarvisState = 'idle' | 'loading' | 'speaking' | 'listening' | 'thinking' | 'confirming';

interface Message { role: 'jarvis' | 'user'; text: string; }

type JarvisAction =
  | { type: 'mark_done'; taskId: string; taskTitle: string }
  | { type: 'create_task'; title: string; priority?: string }
  | { type: 'add_habit'; title: string; emoji: string; frequency: 'daily' | 'weekly'; targetDays: number[]; color: string }
  | { type: 'create_goal'; title: string; domainId?: string; description?: string };

interface Props {
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  aiLanguage?: string;
  aiStyle?: string;
  accentColor: string;
  onClose: () => void;
  onMarkTaskDone: (id: string) => void;
  onCreateTask: (input: { title: string; priority?: string }) => void;
  onAddHabit: (data: Omit<Habit, 'id' | 'createdAt'>) => void;
  onCreateGoal: (title: string, domainId: string, description?: string) => void;
}

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export default function JarvisScreen({
  tasks, goals, habits, aiLanguage = 'hebrew', accentColor, onClose,
  onMarkTaskDone, onCreateTask, onAddHabit, onCreateGoal,
}: Props) {
  const [state, setState]               = useState<JarvisState>('idle');
  const [messages, setMessages]         = useState<Message[]>([]);
  const [started, setStarted]           = useState(false);
  const [pendingAction, setPendingAction] = useState<JarvisAction | null>(null);
  const { speak, stop, isSupported: ttsSupported } = useSpeech();
  const recognitionRef = useRef<any>(null);
  const scrollRef      = useRef<HTMLDivElement>(null);
  const onResultRef    = useRef<(text: string) => void>(() => {});

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

  const sendQuestion = useCallback(async (question: string) => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    addMsg('user', question);
    setState('thinking');
    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, tasks, habits, goals, language: aiLanguage }),
      });
      const data = await res.json();
      const text = data.text || 'מצטער, לא הצלחתי לקבל תשובה.';
      addMsg('jarvis', text);
      if (data.action) {
        setPendingAction(data.action);
        speakThen(text, () => setState('confirming'));
      } else {
        speakThen(text, () => startListening());
      }
    } catch {
      const err = 'מצטערת, יש בעיה בחיבור.';
      addMsg('jarvis', err);
      speakThen(err, () => startListening());
    }
  }, [addMsg, tasks, habits, goals, aiLanguage, speakThen, startListening]);

  useEffect(() => { onResultRef.current = sendQuestion; }, [sendQuestion]);

  const speakAndListen = useCallback((text: string) => {
    addMsg('jarvis', text);
    speakThen(text, () => startListening());
  }, [addMsg, speakThen, startListening]);

  const handleConfirm = useCallback(() => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    try {
      if (action.type === 'mark_done') {
        onMarkTaskDone(action.taskId);
      } else if (action.type === 'create_task') {
        onCreateTask({ title: action.title, priority: action.priority });
      } else if (action.type === 'add_habit') {
        onAddHabit({ title: action.title, emoji: action.emoji, frequency: action.frequency, targetDays: action.targetDays, color: action.color });
      } else if (action.type === 'create_goal') {
        onCreateGoal(action.title, action.domainId || 'growth', action.description);
      }
    } catch {}
    const done = 'בוצע!';
    addMsg('jarvis', done);
    speakThen(done, () => startListening());
  }, [pendingAction, onMarkTaskDone, onCreateTask, onAddHabit, onCreateGoal, addMsg, speakThen, startListening]);

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

  useEffect(() => () => {
    stop();
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  const statusLabel: Record<JarvisState, string> = {
    idle:       'לחץ על המיק לשאלה',
    loading:    'טוען...',
    speaking:   'מדבר...',
    listening:  'מאזין...',
    thinking:   'חושב...',
    confirming: 'ממתין לאישור',
  };

  const pulseColor =
    state === 'listening'  ? '#ef4444'
    : state === 'speaking' ? accentColor
    : state === 'thinking' ? '#a855f7'
    : state === 'confirming' ? '#f59e0b'
    : 'rgba(255,255,255,0.1)';

  const actionLabel = !pendingAction ? '' :
    pendingAction.type === 'mark_done'    ? `✓ ${pendingAction.taskTitle}` :
    pendingAction.type === 'create_task'  ? `+ משימה: ${pendingAction.title}` :
    pendingAction.type === 'add_habit'    ? `${pendingAction.emoji} הרגל: ${pendingAction.title}` :
                                            `🎯 יעד: ${pendingAction.title}`;

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
        <div className="w-9" />
      </div>

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
            {state === 'thinking' ? (
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
                אשר ✓
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
          </>
        )}
      </div>
    </div>
  );
}
