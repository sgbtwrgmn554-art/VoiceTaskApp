import { Task, ChatMessage, Goal } from '../types';

const TASKS_KEY = 'voicetask_tasks';
const CHAT_KEY  = 'voicetask_chat';
const GOALS_KEY = 'voicetask_goals';

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
