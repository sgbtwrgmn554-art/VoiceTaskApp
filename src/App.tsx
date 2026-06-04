import React, { useState, useCallback } from 'react';
import { AppTab, ThemeColor, Task, Reminder } from './types';
import { useTasks } from './hooks/useTasks';
import { useAI } from './hooks/useAI';
import { useReminders } from './hooks/useReminders';
import HomeScreen from './components/HomeScreen';
import NewRecordingScreen from './components/NewRecordingScreen';
import AIChatScreen from './components/AIChatScreen';
import CalendarScreen from './components/CalendarScreen';
import StatsScreen from './components/StatsScreen';
import AuthScreen from './components/AuthScreen';
import ProfileScreen from './components/ProfileScreen';

export default function App() {
  const [tab, setTab] = useState<AppTab>('home');
  const [theme, setTheme] = useState<ThemeColor>('green');
  const [showNewRecording, setShowNewRecording] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(() => {
    const saved = localStorage.getItem('vt_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleAuth = async (email: string, _password: string, _isRegister: boolean) => {
    const u = { email };
    localStorage.setItem('vt_user', JSON.stringify(u));
    setUser(u);
  };

  const { tasks, createTask, updateTask, deleteTask, markTaskDone, setReminder } = useTasks();

  const handleReminderFired = useCallback((taskId: string, lastNotified: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.reminder) {
      updateTask({ id: taskId, reminder: { ...task.reminder, lastNotified } });
    }
  }, [tasks, updateTask]);

  useReminders({ tasks, onUpdateTask: handleReminderFired });

  const aiHandlers = {
    createTask,
    updateTask: (input: Parameters<typeof updateTask>[0]) => updateTask(input),
    deleteTask,
    markTaskDone,
    setReminder: (taskId: string, reminder: { date: string; time: string; recurrence: string }) =>
      setReminder(taskId, { ...reminder, recurrence: reminder.recurrence as Reminder['recurrence'] }),
    tasks,
  };

  const { messages, isLoading, sendMessage, clearChat } = useAI(aiHandlers);

  const accentColor = {
    orange: '#f97316',
    green:  '#22c55e',
    purple: '#a855f7',
    blue:   '#3b82f6',
  }[theme];

  if (!user) {
    return (
      <div className="flex flex-col h-full bg-black text-white">
        <AuthScreen onAuth={handleAuth} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white" style={{ '--accent': accentColor } as React.CSSProperties}>

      {/* Screens */}
      <div className="flex-1 overflow-hidden relative">
        {showNewRecording ? (
          <NewRecordingScreen
            key="new-recording"
            onBack={() => setShowNewRecording(false)}
            onSave={(data) => { createTask(data); setShowNewRecording(false); }}
            accentColor={accentColor}
          />
        ) : tab === 'home' ? (
          <div key="home" className="h-full tab-in">
            <HomeScreen
              tasks={tasks}
              onNewRecording={() => setShowNewRecording(true)}
              onUpdateTask={(id, data) => updateTask({ id, ...data })}
              onDeleteTask={deleteTask}
              onMarkDone={markTaskDone}
              accentColor={accentColor}
            />
          </div>
        ) : tab === 'chat' ? (
          <div key="chat" className="h-full tab-in">
            <AIChatScreen
              messages={messages}
              isLoading={isLoading}
              onSend={sendMessage}
              onClear={clearChat}
              accentColor={accentColor}
            />
          </div>
        ) : tab === 'calendar' ? (
          <div key="calendar" className="h-full tab-in"><CalendarScreen tasks={tasks} accentColor={accentColor} /></div>
        ) : tab === 'stats' ? (
          <div key="stats" className="h-full tab-in"><StatsScreen tasks={tasks} accentColor={accentColor} /></div>
        ) : (
          <div key="profile" className="h-full tab-in"><ProfileScreen theme={theme} onThemeChange={setTheme} accentColor={accentColor} /></div>
        )}
      </div>

      {/* Bottom Navigation */}
      {!showNewRecording && (
        <nav className="flex-shrink-0 flex items-end justify-around"
             style={{
               background: 'rgba(10,10,10,0.95)',
               backdropFilter: 'blur(20px)',
               WebkitBackdropFilter: 'blur(20px)',
               borderTop: '1px solid rgba(255,255,255,0.07)',
               paddingBottom: 'env(safe-area-inset-bottom, 10px)',
               paddingTop: '10px',
             }}>
          <NavBtn icon={<ProfileIcon />}  label="פרופיל"      active={tab === 'profile'}  onClick={() => setTab('profile')}  accentColor={accentColor} />
          <NavBtn icon={<ChatIcon />}     label="AI צ׳אט"     active={tab === 'chat'}     onClick={() => setTab('chat')}     accentColor={accentColor} />

          {/* Center home button */}
          <button onClick={() => setTab('home')} className="flex flex-col items-center -mt-6 transition-transform active:scale-90">
            <div className="w-[58px] h-[58px] rounded-full flex items-center justify-center transition-all"
                 style={{
                   background: tab === 'home' ? '#fff' : '#1a1a1a',
                   boxShadow: tab === 'home'
                     ? '0 4px 20px rgba(255,255,255,0.25)'
                     : '0 0 0 1px rgba(255,255,255,0.1), 0 4px 16px rgba(0,0,0,0.6)',
                 }}>
              <HomeIcon color={tab === 'home' ? '#000' : '#fff'} />
            </div>
          </button>

          <NavBtn icon={<CalendarIcon />} label="קלנדר"       active={tab === 'calendar'} onClick={() => setTab('calendar')} accentColor={accentColor} />
          <NavBtn icon={<StatsIcon />}    label="סטטיסטיקות"  active={tab === 'stats'}    onClick={() => setTab('stats')}    accentColor={accentColor} />
        </nav>
      )}
    </div>
  );
}

function NavBtn({ icon, label, active, onClick, accentColor }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; accentColor: string;
}) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1 px-2 py-0.5 min-w-[52px] transition-transform active:scale-90">
      <span style={{ color: active ? accentColor : '#4b5563' }}>{icon}</span>
      <span className="text-[10px] font-medium" style={{ color: active ? accentColor : '#4b5563' }}>{label}</span>
    </button>
  );
}

function HomeIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}
function ProfileIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
}
function ChatIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
}
function CalendarIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function StatsIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}
