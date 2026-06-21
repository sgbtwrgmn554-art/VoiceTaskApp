import { Task } from '../types';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showMorningNotification(tasks: Task[]): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const pending = tasks.filter(t => t.status !== 'done').length;
  const highPriority = tasks.filter(t => t.status !== 'done' && t.priority === 'high').length;
  const body = pending === 0
    ? 'אין משימות פתוחות — יום נהדר!'
    : `${pending} משימות פתוחות${highPriority > 0 ? ` (${highPriority} דחופות)` : ''}`;
  new Notification('בוקר טוב ☀️', {
    body,
    icon: '/icon-192.png',
    tag: 'morning-checkin',
  });
}

const STORAGE_KEY = 'vt_last_morning_notif';

export function setupMorningNotification(
  enabled: boolean,
  time: string,
  tasks: Task[],
): (() => void) {
  if (!enabled) return () => {};

  const [hh, mm] = time.split(':').map(Number);

  const check = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (
      now.getHours() === hh &&
      now.getMinutes() >= mm &&
      localStorage.getItem(STORAGE_KEY) !== today
    ) {
      localStorage.setItem(STORAGE_KEY, today);
      showMorningNotification(tasks);
    }
  };

  check();
  const id = setInterval(check, 60_000);
  return () => clearInterval(id);
}
