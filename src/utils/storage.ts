import { Task, ChatMessage } from '../types';

const TASKS_KEY = 'voicetask_tasks';
const CHAT_KEY = 'voicetask_chat';

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
  // Keep only last 50 messages to avoid storage bloat
  const toSave = messages.slice(-50);
  localStorage.setItem(CHAT_KEY, JSON.stringify(toSave));
}
