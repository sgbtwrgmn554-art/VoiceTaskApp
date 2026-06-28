import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Task, Goal, Habit, HabitLog, ReflectionEntry, AppTab, VoiceShortcut, Desire } from '../types';
import { useSpeech } from '../hooks/useSpeech';

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let key = 0;

  const renderInline = (s: string): React.ReactNode => {
    const parts = s.split(/\*\*(.+?)\*\*/g);
    return parts.length === 1 ? s : parts.map((p, i) =>
      i % 2 === 1 ? <strong key={i}>{p}</strong> : p
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip table separator rows
    if (/^\s*\|?[\s|:\-]+\|[\s|:\-]+\|?\s*$/.test(line) && line.includes('-')) continue;
    // Headings
    const headingMatch = line.match(/^#{1,3}\s+(.*)/);
    if (headingMatch) {
      result.push(<p key={key++} style={{ fontWeight: 700, color: '#fff', marginTop: result.length ? 6 : 0 }}>{renderInline(headingMatch[1])}</p>);
      continue;
    }
    // Table row — strip pipes, join cells with ·
    if (line.includes('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length) {
        result.push(<p key={key++}>{cells.map((c, ci) => <React.Fragment key={ci}>{ci > 0 && <span style={{ opacity: 0.35 }}> · </span>}{renderInline(c)}</React.Fragment>)}</p>);
        continue;
      }
    }
    // Empty line
    if (!line.trim()) { result.push(<div key={key++} style={{ height: 6 }} />); continue; }
    // Normal line
    result.push(<p key={key++}>{renderInline(line)}</p>);
  }
  return result;
}

type JarvisState = 'idle' | 'loading' | 'speaking' | 'listening' | 'thinking' | 'confirming' | 'focus' | 'weekly';

interface Message { role: 'jarvis' | 'user'; text: string; }

type JarvisAction =
  | { type: 'mark_done'; taskId: string; taskTitle: string }
  | { type: 'create_task'; title: string; priority?: string; date?: string; time?: string }
  | { type: 'create_tasks_batch'; planTitle: string; tasks: Array<{ title: string; date?: string; time?: string; priority?: string }> }
  | { type: 'edit_task'; taskId: string; taskTitle: string; field: string; value: string }
  | { type: 'delete_task'; taskId: string; taskTitle: string }
  | { type: 'reschedule_day'; summary: string }
  | { type: 'add_habit'; title: string; emoji: string; frequency: 'daily' | 'weekly'; targetDays: number[]; color: string }
  | { type: 'toggle_habit'; habitId: string; habitTitle: string }
  | { type: 'delete_habit'; habitId: string; habitTitle: string }
  | { type: 'create_goal'; title: string; domainId?: string; description?: string }
  | { type: 'delete_goal'; goalId: string; goalTitle: string }
  | { type: 'update_goal_why'; goalId: string; goalTitle: string; why: string }
  | { type: 'add_desire'; text: string; emoji: string }
  | { type: 'navigate'; tab: AppTab }
  | { type: 'add_reflection'; gratitude: string; learning: string; tomorrowFocus: string; mood: 1|2|3|4|5 }
  | { type: 'start_focus'; minutes: number; taskTitle?: string }
  | { type: 'weekly_review' }
  | { type: 'suggest_app'; appName: string; url: string; reason: string }
  | { type: 'suggest_video'; topic: string; searchQuery: string };

interface FocusData { totalSec: number; leftSec: number; taskTitle: string; }

interface Props {
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  habitLogs?: HabitLog[];
  reflections?: ReflectionEntry[];
  desires?: Desire[];
  aiLanguage?: string;
  aiStyle?: string;
  jarvisMode?: string;
  appearanceLevel?: string;
  voiceShortcuts?: VoiceShortcut[];
  accentColor: string;
  initialQuestion?: string;
  onClose: () => void;
  onMarkTaskDone: (id: string) => void;
  onCreateTask: (input: { title: string; priority?: string; date?: string; time?: string }) => void;
  onUpdateTask: (id: string, patch: Record<string, unknown>) => void;
  onDeleteTask: (id: string) => void;
  onAddHabit: (data: Omit<Habit, 'id' | 'createdAt'>) => void;
  onToggleHabit: (id: string) => void;
  onDeleteHabit: (id: string) => void;
  onCreateGoal: (title: string, domainId: string, description?: string) => void;
  onDeleteGoal: (id: string) => void;
  onUpdateGoalWhy: (id: string, why: string) => void;
  onAddDesire: (text: string, emoji: string) => void;
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

const ENERGY_LABELS = ['', '😴 עייף', '🥱 נמוך', '😐 בסדר', '💪 טוב', '🔥 מלא אנרגיה'];
const ENERGY_ICONS  = ['', '😴', '🥱', '😐', '💪', '🔥'];

function getQuickPrompts() {
  const hour = new Date().getHours();
  if (hour < 12) return [
    { label: 'מה יש לי היום?', icon: '☀️' },
    { label: 'בנה לי לו"ז להיום', icon: '📅' },
    { label: 'תן לי דחיפה לצאת לדרך', icon: '🚀' },
    { label: 'אילו הרגלים לעשות עכשיו?', icon: '✅' },
  ];
  if (hour < 17) return [
    { label: 'מה הדבר הכי חשוב עכשיו?', icon: '🎯' },
    { label: 'יש לי מכשול — עזור לי', icon: '🧱' },
    { label: 'בדוק את ההתקדמות שלי', icon: '📊' },
    { label: 'בנה לי תוכנית להמשך היום', icon: '📝' },
  ];
  return [
    { label: 'סכם לי את היום', icon: '🌙' },
    { label: 'מה עשיתי היום?', icon: '✅' },
    { label: 'תכנן לי את מחר', icon: '📅' },
    { label: 'רפלקציה על היום', icon: '💭' },
  ];
}

export default function JarvisScreen({
  tasks, goals, habits, habitLogs = [], reflections = [], desires = [],
  aiLanguage = 'hebrew', jarvisMode = 'coach', appearanceLevel = 'balanced',
  voiceShortcuts = [], accentColor, initialQuestion, onClose,
  onMarkTaskDone, onCreateTask, onUpdateTask, onDeleteTask,
  onAddHabit, onToggleHabit, onDeleteHabit,
  onCreateGoal, onDeleteGoal, onUpdateGoalWhy, onAddDesire,
  onAddReflection, onNavigate,
}: Props) {
  const [state, setState]                 = useState<JarvisState>('idle');
  const [messages, setMessages]           = useState<Message[]>(() => {
    try { return JSON.parse(localStorage.getItem('jarvis_history') || '[]'); } catch { return []; }
  });
  const [started, setStarted]             = useState(() => !!localStorage.getItem('jarvis_started'));
  const [pendingAction, setPendingAction] = useState<JarvisAction | null>(null);
  const [focusData, setFocusData]         = useState<FocusData | null>(null);
  const [focusMinutes, setFocusMinutes]   = useState(25);
  const [pendingImage, setPendingImage]   = useState<{ base64: string; mediaType: string } | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [energyLevel, setEnergyLevel]     = useState(0);
  const [textInput, setTextInput]         = useState('');
  const { speak, stop, isSupported: ttsSupported } = useSpeech();
  const recognitionRef = useRef<any>(null);
  const scrollRef      = useRef<HTMLDivElement>(null);
  const onResultRef    = useRef<(text: string) => void>(() => {});
  const focusTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const photoInputRef  = useRef<HTMLInputElement>(null);
  const textInputRef   = useRef<HTMLInputElement>(null);

  const addMsg = useCallback((role: 'jarvis' | 'user', text: string) => {
    setMessages(prev => {
      const next = [...prev, { role, text }];
      const trimmed = next.slice(-40);
      try { localStorage.setItem('jarvis_history', JSON.stringify(trimmed)); } catch {}
      return trimmed;
    });
    setTimeout(() => { scrollRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }); }, 50);
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem('jarvis_history');
    localStorage.removeItem('jarvis_started');
    setStarted(false);
    stop();
    try { recognitionRef.current?.stop(); } catch {}
    setState('idle');
  }, [stop]);

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
      const body: Record<string, unknown> = {
        question, tasks, habits, goals, habitLogs, desires,
        language: aiLanguage, jarvisMode, appearanceLevel,
        energyLevel: energyLevel || undefined,
        conversationHistory: messages.slice(-6),
      };
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMsg, tasks, habits, goals, habitLogs, desires, messages, aiLanguage, jarvisMode, appearanceLevel, energyLevel, speakThen, startListening]);

  const handleVoiceResult = useCallback((text: string) => {
    const lower = text.trim().toLowerCase();
    const matched = voiceShortcuts.find(s =>
      lower === s.trigger.toLowerCase() || lower.startsWith(s.trigger.toLowerCase())
    );
    sendQuestion(matched ? matched.prompt : text);
  }, [voiceShortcuts, sendQuestion]);

  useEffect(() => { onResultRef.current = handleVoiceResult; }, [handleVoiceResult]);

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
        const relatedGoal = goals.find(g => g.status === 'active' && g.title.toLowerCase().split(' ').some(w => action.taskTitle.toLowerCase().includes(w)));
        onMarkTaskDone(action.taskId);
        confirmDone(relatedGoal ? `סיימת! זה מקדם אותך לעבר הייעד: "${relatedGoal.title}" 🎯` : 'בוצע! כל צעק קטן מצטבר 💪');
      } else if (action.type === 'create_task') {
        onCreateTask({ title: action.title, priority: action.priority, date: action.date, time: action.time });
        confirmDone('נוצר! רוצה שאוסיף עוד דברים קשורים לנושא?');
      } else if (action.type === 'create_tasks_batch') {
        action.tasks.forEach(t => onCreateTask({ title: t.title, priority: t.priority, date: t.date, time: t.time }));
        confirmDone(`נוצרו ${action.tasks.length} משימות — ${action.planTitle}! 🚀`);
      } else if (action.type === 'reschedule_day') {
        addMsg('jarvis', action.summary);
        speakThen(action.summary, () => startListening());
        return;
      } else if (action.type === 'update_goal_why') {
        onUpdateGoalWhy(action.goalId, action.why);
        confirmDone(`שמרתי את הסיבה שלך ל"${action.goalTitle}" — זה יעזור לי להניע אותך כשקשה 💡`);
      } else if (action.type === 'add_desire') {
        onAddDesire(action.text, action.emoji);
        confirmDone('שמרתי את השאיפה שלך! רוצה שנבנה יחד תוכנית להגשמה?');
      } else if (action.type === 'suggest_video') {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(action.searchQuery)}`;
        window.open(url, '_blank', 'noopener noreferrer');
        confirmDone(`פתחתי חיפוש ביוטיוב על "${action.topic}". תסתכל ותחזור אליי!`);
      } else if (action.type === 'suggest_app') {
        window.open(action.url, '_blank', 'noopener noreferrer');
        confirmDone(`פתחתי את ${action.appName}. בהצלחה!`);
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
      }
    } catch {
      confirmDone();
    }
  }, [pendingAction, focusMinutes, goals,
      onMarkTaskDone, onCreateTask, onUpdateTask, onDeleteTask,
      onAddHabit, onToggleHabit, onDeleteHabit, onCreateGoal, onDeleteGoal,
      onUpdateGoalWhy, onAddDesire, onAddReflection,
      onNavigate, onClose, confirmDone, addMsg, speakThen, startListening, startFocusTimer]);

  const handleCancel = useCallback(() => {
    setPendingAction(null);
    const cancel = 'בסדר, ביטלתי.';
    addMsg('jarvis', cancel);
    speakThen(cancel, () => startListening());
  }, [addMsg, speakThen, startListening]);

  const fetchBriefing = useCallback(async () => {
    setState('loading');
    localStorage.setItem('jarvis_started', '1');
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, goals, habits, language: aiLanguage, energyLevel: energyLevel || undefined, desires }),
      });
      const data = await res.json();
      speakAndListen(data.text || 'בוקר טוב! אפשר לשאול אותי שאלות.');
    } catch {
      speakAndListen('שלום! אני ג\'ארוויס. אפשר לשאול אותי שאלות.');
    }
  }, [tasks, goals, habits, aiLanguage, energyLevel, desires, speakAndListen]);

  const fetchMonthlyReview = useCallback(async () => {
    setState('weekly');
    try {
      const res = await fetch('/api/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, habits, habitLogs, goals, reflections, desires, language: aiLanguage }),
      });
      const data = await res.json();
      speakAndListen(data.text || 'לא הצלחתי לייצר סיכום חודשי.');
    } catch {
      speakAndListen('מצטערת, לא הצלחתי לייצר סיכום חודשי.');
    }
  }, [tasks, habits, habitLogs, goals, reflections, desires, aiLanguage, speakAndListen]);

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

  const handleSendText = () => {
    const q = textInput.trim();
    if (!q || state === 'thinking' || state === 'focus') return;
    setTextInput('');
    if (!started) setStarted(true);
    sendQuestion(q);
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

  // Auto-send initial question when opened from another screen
  useEffect(() => {
    if (!initialQuestion) return;
    setStarted(true);
    localStorage.setItem('jarvis_started', '1');
    const timer = setTimeout(() => sendQuestion(initialQuestion), 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel: Record<JarvisState, string> = {
    idle:       SpeechRecognitionAPI ? 'לחץ על המיק לשאלה' : 'הקלד שאלה למטה',
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
    pendingAction.type === 'mark_done'         ? `✓ ${pendingAction.taskTitle}` :
    pendingAction.type === 'create_task'       ? `+ משימה: ${pendingAction.title}` :
    pendingAction.type === 'create_tasks_batch'? `📋 ${pendingAction.planTitle} (${pendingAction.tasks.length} משימות)` :
    pendingAction.type === 'reschedule_day'    ? `📅 ארגון לו"ז מחדש` :
    pendingAction.type === 'edit_task'         ? `✏️ ${pendingAction.taskTitle}` :
    pendingAction.type === 'delete_task'       ? `🗑 מחק: ${pendingAction.taskTitle}` :
    pendingAction.type === 'add_habit'         ? `${pendingAction.emoji} הרגל: ${pendingAction.title}` :
    pendingAction.type === 'toggle_habit'      ? `✓ הרגל: ${pendingAction.habitTitle}` :
    pendingAction.type === 'delete_habit'      ? `🗑 הרגל: ${pendingAction.habitTitle}` :
    pendingAction.type === 'create_goal'       ? `🎯 יעד: ${pendingAction.title}` :
    pendingAction.type === 'delete_goal'       ? `🗑 יעד: ${pendingAction.goalTitle}` :
    pendingAction.type === 'update_goal_why'   ? `💡 למה: ${pendingAction.goalTitle}` :
    pendingAction.type === 'add_desire'        ? `${pendingAction.emoji} שאיפה: ${pendingAction.text}` :
    pendingAction.type === 'navigate'          ? `🧭 נווט: ${pendingAction.tab}` :
    pendingAction.type === 'add_reflection'    ? `📔 רפלקציה יומית` :
    pendingAction.type === 'start_focus'       ? `⏱ טיימר ריכוז` :
    pendingAction.type === 'suggest_app'       ? `📱 ${pendingAction.appName}` :
    pendingAction.type === 'suggest_video'     ? `🎬 YouTube: ${pendingAction.topic}` : '';

  const isFocusAction = pendingAction?.type === 'start_focus';

  const focusProgress = focusData ? (focusData.totalSec - focusData.leftSec) / focusData.totalSec : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  // Momentum stats
  const today   = new Date().toISOString().slice(0, 10);
  const weekAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();
  const doneThisWeek   = tasks.filter(t => t.status === 'done' && (t.updatedAt || '') >= weekAgo).length;
  const habitsDoneToday = habitLogs.filter(l => l.date === today).length;
  const activeGoals     = goals.filter(g => g.status === 'active');
  const totalMilestones = activeGoals.reduce((a, g) => a + g.milestones.length, 0);
  const doneMilestones  = activeGoals.reduce((a, g) => a + g.milestones.filter(m => m.completed).length, 0);
  const goalsPct        = totalMilestones > 0 ? Math.round(doneMilestones / totalMilestones * 100) : null;

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
          <p className="text-[10px] text-gray-600 tracking-wider mt-0.5">
            {energyLevel > 0 ? ENERGY_LABELS[energyLevel] : 'עוזר אישי'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowShortcuts(s => !s)}
            title="קיצורי דרך"
            className="w-9 h-9 flex items-center justify-center rounded-full transition-opacity text-base"
            style={{ background: showShortcuts ? accentColor + '33' : 'rgba(255,255,255,0.07)', opacity: showShortcuts ? 1 : 0.6 }}
          >
            ⚡
          </button>
          <button
            onClick={() => { if (!started) { setStarted(true); localStorage.setItem('jarvis_started','1'); } fetchWeeklyReview(); }}
            title="סיכום שבועי"
            className="w-9 h-9 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 transition-opacity text-base"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            📋
          </button>
          <button
            onClick={() => { if (!started) { setStarted(true); localStorage.setItem('jarvis_started','1'); } fetchMonthlyReview(); }}
            title="סיכום חודשי"
            className="w-9 h-9 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 transition-opacity text-base"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            🗓
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => { if (window.confirm('למחוק את היסטוריית השיחה?')) clearHistory(); }}
              title="נקה שיחה"
              className="w-9 h-9 flex items-center justify-center rounded-full opacity-40 hover:opacity-70 transition-opacity text-base"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            >
              🗑
            </button>
          )}
        </div>
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
          <div className={`flex-shrink-0 flex items-center justify-center card-appear ${messages.length > 0 ? 'py-2' : 'py-6'}`} style={{ transition: 'padding 0.3s' }}>
            <div className="relative">
              {(state === 'listening' || state === 'speaking' || state === 'confirming') && (
                <>
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ background: pulseColor + '20', transform: 'scale(1.6)' }} />
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ background: pulseColor + '10', transform: 'scale(2)', animationDelay: '0.3s' }} />
                </>
              )}
              <div
                className={`${messages.length > 0 ? 'w-14 h-14' : 'w-24 h-24'} rounded-full flex items-center justify-center transition-all duration-500`}
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
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" opacity={0.9}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1" fill="#f59e0b" stroke="none"/>
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white" opacity={0.8}>
                    <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93A8.001 8.001 0 014 11H2a10 10 0 0019.95 1H20a8 8 0 01-7 7.93V23h-2v-4.07z"/>
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <p className="text-center text-xs text-gray-500 tracking-wider mb-2 flex-shrink-0">{statusLabel[state]}</p>

          {/* Momentum strip */}
          {(doneThisWeek > 0 || habitsDoneToday > 0 || goalsPct !== null) && (
            <div className="flex-shrink-0 flex items-center justify-center gap-2 px-4 mb-3">
              {doneThisWeek > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
                     style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                  ✅ {doneThisWeek} השבוע
                </div>
              )}
              {habits.length > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
                     style={{ background: 'rgba(251,191,36,0.12)', color: '#f59e0b', border: '1px solid rgba(251,191,36,0.2)' }}>
                  🔥 {habitsDoneToday}/{habits.length} הרגלים
                </div>
              )}
              {goalsPct !== null && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
                     style={{ background: accentColor + '18', color: accentColor, border: `1px solid ${accentColor}33` }}>
                  🎯 {goalsPct}% יעדים
                </div>
              )}
            </div>
          )}

          {/* Shortcuts panel */}
          {showShortcuts && (
            <div className="flex-shrink-0 mx-4 mb-2 rounded-2xl overflow-hidden fade-up" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-bold text-gray-300 tracking-widest">⚡ קיצורי דרך קוליים</p>
                <button onClick={() => setShowShortcuts(false)} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
              </div>
              <div className="overflow-y-auto max-h-40 p-3 space-y-1.5">
                {voiceShortcuts.length === 0 ? (
                  <p className="text-center text-xs text-gray-600 py-3">אין קיצורים — הוסף בהגדרות ← ⚡ קיצורי דרך</p>
                ) : voiceShortcuts.map(sc => (
                  <button
                    key={sc.id}
                    onClick={() => { setShowShortcuts(false); if (!started) setStarted(true); sendQuestion(sc.prompt); }}
                    className="w-full flex items-start gap-3 px-3 py-2 rounded-xl text-right transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: accentColor + '22', color: accentColor }}>
                      {sc.trigger}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-200 font-medium">{sc.description}</p>
                      <p className="text-[10px] text-gray-600 truncate mt-0.5">{sc.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-3 pb-2" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

            {/* Pre-start idle view */}
            {!started && messages.length === 0 && (
              <div className="fade-up space-y-4 pt-2">

                {/* Energy level picker */}
                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs text-gray-500 mb-2.5 text-center">מה רמת האנרגיה שלך היום?</p>
                  <div className="flex items-center justify-between gap-1">
                    {[1,2,3,4,5].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setEnergyLevel(energyLevel === lvl ? 0 : lvl)}
                        className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all active:scale-90"
                        style={{
                          background: energyLevel === lvl ? accentColor + '22' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${energyLevel === lvl ? accentColor + '55' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        <span className="text-xl">{ENERGY_ICONS[lvl]}</span>
                        <span className="text-[9px] text-gray-600">{lvl}</span>
                      </button>
                    ))}
                  </div>
                  {energyLevel > 0 && (
                    <p className="text-center text-xs mt-2" style={{ color: accentColor }}>
                      {ENERGY_LABELS[energyLevel]}
                    </p>
                  )}
                </div>

                {/* Today's open tasks as tappable chips */}
                {(() => {
                  const topTasks = tasks
                    .filter(t => t.status !== 'done')
                    .sort((a, b) => {
                      const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
                      return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
                    })
                    .slice(0, 4);
                  if (!topTasks.length) return null;
                  return (
                    <div>
                      <p className="text-xs text-gray-600 mb-2 px-1">📋 משימות פתוחות</p>
                      <div className="flex flex-wrap gap-2">
                        {topTasks.map(t => (
                          <button
                            key={t.id}
                            onClick={() => { setStarted(true); sendQuestion(`עזור לי עם המשימה: "${t.title}"`); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all active:scale-95"
                            style={{
                              background: t.priority === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${t.priority === 'high' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
                              color: t.priority === 'high' ? '#fca5a5' : '#9ca3af',
                            }}
                          >
                            {t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '⚪'}
                            <span className="truncate max-w-[120px]">{t.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Quick prompts */}
                <div>
                  <p className="text-xs text-gray-600 mb-2 px-1">שאלות מהירות</p>
                  <div className="grid grid-cols-2 gap-2">
                    {getQuickPrompts().map(qp => (
                      <button
                        key={qp.label}
                        onClick={() => { setStarted(true); sendQuestion(qp.label); }}
                        className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-right transition-all active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        <span className="text-base flex-shrink-0">{qp.icon}</span>
                        <span className="text-xs text-gray-300 leading-tight">{qp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shortcuts hint */}
                {voiceShortcuts.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600 px-1">⚡ קיצורים שלך</p>
                    {voiceShortcuts.slice(0, 3).map(sc => (
                      <div key={sc.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: accentColor + '18', color: accentColor }}>
                          {sc.trigger}
                        </span>
                        <span className="text-[10px] text-gray-600">{sc.description}</span>
                      </div>
                    ))}
                    {voiceShortcuts.length > 3 && (
                      <p className="text-[10px] text-gray-700 px-1">+{voiceShortcuts.length - 3} נוספים — לחץ ⚡</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Chat messages */}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex fade-up ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}
                style={{ animationDelay: `${Math.min(i * 0.04, 0.2)}s` }}
              >
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={m.role === 'jarvis'
                    ? { background: accentColor + '18', border: `1px solid ${accentColor}30`, color: '#e5e7eb' }
                    : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }
                  }
                >
                  {m.role === 'jarvis' && <p className="text-[10px] mb-1.5 opacity-50 tracking-wider font-semibold" style={{ color: accentColor }}>J.A.R.V.I.S</p>}
                  <div className="text-sm leading-relaxed space-y-0">{renderMarkdown(m.text)}</div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {state === 'thinking' && (
              <div className="flex justify-end fade-up">
                <div className="rounded-2xl px-4 py-3" style={{ background: accentColor + '18', border: `1px solid ${accentColor}22` }}>
                  <p className="text-[10px] mb-1.5 opacity-40" style={{ color: accentColor }}>JARVIS</p>
                  <div className="flex gap-1.5 items-center">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                           style={{ background: accentColor, animationDelay: `${i * 0.15}s`, opacity: 0.7 }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirmation card */}
          {pendingAction && state === 'confirming' && (
            <div className="flex-shrink-0 px-4 pb-2 fade-up">
              <div className="rounded-2xl p-4" style={{ background: '#f59e0b14', border: '1px solid #f59e0b44' }}>
                <p className="text-sm font-semibold mb-3" style={{ color: '#f59e0b' }}>{actionLabel}</p>
                {pendingAction?.type === 'create_tasks_batch' && (
                  <div className="mb-3 max-h-36 overflow-y-auto space-y-1">
                    {pendingAction.tasks.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-gray-300 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <span className="text-gray-600 w-4 text-center">{i + 1}</span>
                        <span className="flex-1 truncate">{t.title}</span>
                        {t.date && <span className="text-gray-600 flex-shrink-0">{t.date.slice(5)}</span>}
                      </div>
                    ))}
                  </div>
                )}
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

          {/* Text input row */}
          <div className="flex-shrink-0 px-4 pb-2">
            <div className="flex items-center gap-2 rounded-2xl px-3 py-2"
                 style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <input
                ref={textInputRef}
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendText(); }}
                placeholder="הקלד שאלה..."
                disabled={state === 'thinking' || state === 'focus'}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
                dir="rtl"
              />
              {textInput.trim() && (
                <button
                  onClick={handleSendText}
                  disabled={state === 'thinking' || state === 'focus'}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                  style={{ background: accentColor, opacity: state === 'thinking' ? 0.5 : 1 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="black">
                    <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Bottom controls */}
          <div className="flex-shrink-0 px-6 pb-8 pt-1 flex items-center gap-4">
            {!started ? (
              <button
                onClick={() => { setStarted(true); localStorage.setItem('jarvis_started','1'); fetchBriefing(); }}
                className="flex-1 py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98]"
                style={{ background: accentColor, color: '#000' }}
              >
                {messages.length > 0 ? '▶ המשך שיחה' : 'הפעל ג\'ארוויס'}
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
                {SpeechRecognitionAPI && (
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
                    {state === 'listening' ? 'מאזין...' : state === 'confirming' ? 'ביטול' : 'שאל בקול'}
                  </button>
                )}
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
