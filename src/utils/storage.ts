import { Task, ChatMessage, Goal, AppSettings, Habit, HabitLog, ReflectionEntry } from '../types';

const TASKS_KEY    = 'voicetask_tasks';
const CHAT_KEY     = 'voicetask_chat';
const GOALS_KEY    = 'voicetask_goals';
const SETTINGS_KEY = 'voicetask_settings';

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Task[];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function loadChat(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

export function saveChat(messages: ChatMessage[]): void {
  const toSave = messages.slice(-50);
  localStorage.setItem(CHAT_KEY, JSON.stringify(toSave));
}

export function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw ? (JSON.parse(raw) as Goal[]) : [];
  } catch { return []; }
}

export function saveGoals(goals: Goal[]): void {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function loadSettings(): AppSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as AppSettings) : null;
  } catch { return null; }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

const HABITS_KEY      = 'voicetask_habits';
const HABIT_LOGS_KEY  = 'voicetask_habit_logs';
const REFLECTIONS_KEY = 'voicetask_reflections';

export function loadHabits(): Habit[] {
  try { const r = localStorage.getItem(HABITS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
export function saveHabits(h: Habit[]): void {
  localStorage.setItem(HABITS_KEY, JSON.stringify(h));
}
export function loadHabitLogs(): HabitLog[] {
  try { const r = localStorage.getItem(HABIT_LOGS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
export function saveHabitLogs(logs: HabitLog[]): void {
  localStorage.setItem(HABIT_LOGS_KEY, JSON.stringify(logs));
}
export function loadReflections(): ReflectionEntry[] {
  try { const r = localStorage.getItem(REFLECTIONS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
export function saveReflections(entries: ReflectionEntry[]): void {
  localStorage.setItem(REFLECTIONS_KEY, JSON.stringify(entries));
}

export function clearAllData(): void {
  localStorage.removeItem(TASKS_KEY);
  localStorage.removeItem(CHAT_KEY);
  localStorage.removeItem(GOALS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(HABITS_KEY);
  localStorage.removeItem(HABIT_LOGS_KEY);
  localStorage.removeItem(REFLECTIONS_KEY);
}
