import React, { useState, useCallback, useEffect } from 'react';
import { AppTab, ThemeColor, Task, Reminder, LifeDomainId } from './types';
import { useTasks } from './hooks/useTasks';
import { useAI } from './hooks/useAI';
import { useReminders } from './hooks/useReminders';
import { useGoals } from './hooks/useGoals';
import { useHabits } from './hooks/useHabits';
import { useSettings } from './hooks/useSettings';
import { useDesires } from './hooks/useDesires';
import { requestNotificationPermission, setupMorningNotification } from './utils/notifications';
import HomeScreen from './components/HomeScreen';
import NewRecordingScreen from './components/NewRecordingScreen';
import AIChatScreen from './components/AIChatScreen';
import CalendarScreen from './components/CalendarScreen';
import GoalsScreen from './components/GoalsScreen';
import HabitsScreen from './components/HabitsScreen';
import AuthScreen from './components/AuthScreen';
import ProfileScreen from './components/ProfileScreen';
import JarvisScreen from './components/JarvisScreen';
import OnboardingScreen from './components/OnboardingScreen';

const ACCENT_COLORS: Record<ThemeColor, string> = {
  orange: '#f97316',
  green:  '#22c55e',
  purple: '#a855f7',
  blue:   '#3b82f6',
  pink:   '#ec4899',
  teal:   '#14b8a6',
  red:    '#ef4444',
  yellow: '#eab308',
};

export default function App() {
  const [tab, setTab] = useState<AppTab>('home');
  const [showNewRecording, setShowNewRecording] = useState(false);
  const [showJarvis, setShowJarvis] = useState(false);
  const [jarvisInitialQ, setJarvisInitialQ] = useState<string | undefined>();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(() => {
    const saved = localStorage.getItem('vt_user');
    return saved ? JSON.parse(saved) : null;
  });

  const {
    settings,
    updateSettings,
    addCategory,
    removeCategory,
    renameCategory,
    addDomain,
    updateDomain,
    removeDomain,
    addShortcut,
    removeShortcut,
  } = useSettings();

  const handleAuth = async (email: string, _password: string, _isRegister: boolean) => {
    const u = { email };
    localStorage.setItem('vt_user', JSON.stringify(u));
    setUser(u);
    // Show onboarding for new users
    if (!localStorage.getItem('vt_onboarding_done')) {
      setShowOnboarding(true);
    }
  };

  // Check onboarding on mount for existing users
  useEffect(() => {
    if (user && !localStorage.getItem('vt_onboarding_done')) {
      setShowOnboarding(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vt_user');
    setUser(null);
  };

  const { tasks, createTask, updateTask, deleteTask, markTaskDone, setReminder } = useTasks();

  const handleReminderFired = useCallback((taskId: string, lastNotified: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.reminder) {
      updateTask({ id: taskId, reminder: { ...task.reminder, lastNotified } });
    }
  }, [tasks, updateTask]);

  useReminders({ tasks, onUpdateTask: handleReminderFired });

  useEffect(() => {
    if (!settings.morningCheckInEnabled) return;
    requestNotificationPermission();
    return setupMorningNotification(settings.morningCheckInEnabled, settings.morningCheckInTime, tasks);
  }, [settings.morningCheckInEnabled, settings.morningCheckInTime, tasks]);

  const { habits, logs: habitLogs, reflections, addHabit, updateHabit, deleteHabit, toggleToday, isDoneToday, streak, addReflection, todayReflection } = useHabits();
  const { desires, addDesire, deleteDesire } = useDesires();

  const { goals, generatingFor, createGoal, updateGoal, deleteGoal, toggleMilestone, generateMilestones, milestoneToTask } = useGoals({
    onCreateTask: createTask,
  });

  const aiHandlers = {
    createTask,
    updateTask: (input: Parameters<typeof updateTask>[0]) => updateTask(input),
    deleteTask,
    markTaskDone,
    setReminder: (taskId: string, reminder: { date: string; time: string; recurrence: string }) =>
      setReminder(taskId, { ...reminder, recurrence: reminder.recurrence as Reminder['recurrence'] }),
    tasks,
    aiLanguage: settings.aiLanguage,
    aiStyle: settings.aiStyle,
  };

  const { messages, isLoading, sendMessage, clearChat } = useAI(aiHandlers);

  const accentColor = ACCENT_COLORS[settings.theme] ?? '#22c55e';

  if (!user) {
    return (
      <div className="flex flex-col h-full bg-black text-white">
        <AuthScreen onAuth={handleAuth} />
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingScreen
        accentColor={accentColor}
        onDone={() => {
          localStorage.setItem('vt_onboarding_done', '1');
          setShowOnboarding(false);
        }}
      />
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
            onSmartSave={(payload) => {
              if (payload.kind === 'goal') {
                createGoal(payload.title, payload.domainId as LifeDomainId, payload.description, payload.deadline);
                setShowNewRecording(false);
                setTab('goals');
              } else {
                createTask(payload.data);
                setShowNewRecording(false);
              }
            }}
            onAskJarvis={(q) => {
              setShowNewRecording(false);
              setJarvisInitialQ(q);
              setShowJarvis(true);
            }}
            accentColor={accentColor}
            categories={settings.customCategories}
            defaultCategory={settings.defaultCategory}
            defaultReminderTime={settings.defaultReminderTime}
            savedWhatsappPhone={settings.whatsappPhone}
            autoClassify={settings.autoClassify}
            domains={settings.customDomains}
          />
        ) : tab === 'home' ? (
          <div key="home" className="h-full tab-in">
            <HomeScreen
              tasks={tasks}
              goals={goals}
              habits={habits}
              aiLanguage={settings.aiLanguage}
              onNewRecording={() => setShowNewRecording(true)}
              onOpenJarvis={() => setShowJarvis(true)}
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
          <div key="calendar" className="h-full tab-in">
            <CalendarScreen tasks={tasks} habits={habits} habitLogs={habitLogs} accentColor={accentColor} />
          </div>
        ) : tab === 'habits' ? (
          <div key="habits" className="h-full tab-in">
            <HabitsScreen
              habits={habits}
              todayReflection={todayReflection}
              isDoneToday={isDoneToday}
              streak={streak}
              onToggle={toggleToday}
              onAddHabit={addHabit}
              onUpdateHabit={updateHabit}
              onDeleteHabit={deleteHabit}
              onAddReflection={addReflection}
              accentColor={accentColor}
            />
          </div>
        ) : tab === 'goals' ? (
          <div key="goals" className="h-full tab-in">
            <GoalsScreen
              goals={goals}
              domains={settings.customDomains}
              generatingFor={generatingFor}
              desires={desires}
              onCreateGoal={createGoal}
              onToggleMilestone={toggleMilestone}
              onGenerateMilestones={generateMilestones}
              onMilestoneToTask={milestoneToTask}
              onDeleteGoal={deleteGoal}
              onUpdateGoalWhy={(id, why) => updateGoal(id, { why })}
              onDeleteDesire={deleteDesire}
              accentColor={accentColor}
            />
          </div>
        ) : (
          <div key="profile" className="h-full tab-in">
            <ProfileScreen
              settings={settings}
              accentColor={accentColor}
              tasks={tasks}
              habits={habits}
              habitLogs={habitLogs}
              goals={goals}
              reflections={reflections}
              onUpdateSettings={updateSettings}
              onAddCategory={addCategory}
              onRemoveCategory={removeCategory}
              onRenameCategory={renameCategory}
              onAddDomain={addDomain}
              onUpdateDomain={updateDomain}
              onRemoveDomain={removeDomain}
              onThemeChange={(t) => updateSettings({ theme: t })}
              onAddShortcut={addShortcut}
              onRemoveShortcut={removeShortcut}
              onLogout={handleLogout}
              onOpenGuide={() => {
                localStorage.removeItem('vt_onboarding_done');
                setShowOnboarding(true);
              }}
            />
          </div>
        )}
      </div>

      {/* JARVIS overlay */}
      {showJarvis && (
        <JarvisScreen
          tasks={tasks}
          goals={goals}
          habits={habits}
          habitLogs={habitLogs}
          reflections={reflections}
          desires={desires}
          aiLanguage={settings.aiLanguage}
          aiStyle={settings.aiStyle}
          jarvisMode={settings.jarvisMode}
          appearanceLevel={settings.appearanceLevel}
          voiceShortcuts={settings.voiceShortcuts}
          accentColor={accentColor}
          initialQuestion={jarvisInitialQ}
          onClose={() => { setShowJarvis(false); setJarvisInitialQ(undefined); }}
          onMarkTaskDone={markTaskDone}
          onCreateTask={(input) => {
            createTask({
              title: input.title,
              priority: (input.priority as any) || 'medium',
              ...(input.date ? { reminder: { date: input.date, time: input.time || '09:00', recurrence: 'none' } } : {}),
            });
          }}
          onUpdateTask={(id, patch) => updateTask({ id, ...(patch as any) })}
          onDeleteTask={deleteTask}
          onAddHabit={addHabit}
          onToggleHabit={toggleToday}
          onDeleteHabit={deleteHabit}
          onCreateGoal={createGoal}
          onDeleteGoal={deleteGoal}
          onUpdateGoalWhy={(id, why) => updateGoal(id, { why })}
          onAddReflection={addReflection}
          onAddDesire={addDesire}
          onNavigate={(t) => { setTab(t as AppTab); setShowJarvis(false); }}
        />
      )}

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
          <NavBtn icon={<ProfileIcon />}  label="פרופיל"   active={tab === 'profile'}  onClick={() => setTab('profile')}  accentColor={accentColor} />
          <NavBtn icon={<HabitsIcon />}   label="הרגלים"   active={tab === 'habits'}   onClick={() => setTab('habits')}   accentColor={accentColor} />

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

          <NavBtn icon={<GoalsIcon />}    label="יעדים"    active={tab === 'goals'}    onClick={() => setTab('goals')}    accentColor={accentColor} />
          <NavBtn icon={<ChatIcon />}     label="AI"       active={tab === 'chat'}     onClick={() => setTab('chat')}     accentColor={accentColor} />
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
      <span
        className="w-12 h-8 flex items-center justify-center rounded-xl transition-all duration-200"
        style={{
          background: active ? accentColor + '22' : 'transparent',
          color: active ? accentColor : '#4b5563',
        }}
      >{icon}</span>
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
function GoalsIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}
function HabitsIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><path d="M18 2v4"/><path d="M20 4h-4"/></svg>;
}
