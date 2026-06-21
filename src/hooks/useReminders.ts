import { useEffect, useCallback } from 'react';
import { Task } from '../types';

interface UseRemindersOptions {
  tasks: Task[];
  onUpdateTask: (id: string, lastNotified: string) => void;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function useReminders({ tasks, onUpdateTask }: UseRemindersOptions) {
  const checkReminders = useCallback(() => {
    const now = new Date();
    const nowStr = now.toISOString();
    const todayStr = now.toISOString().slice(0, 10);
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    tasks.forEach(task => {
      if (!task.reminder || task.status === 'done') return;
      const { date, time, recurrence, lastNotified, windowEnd, repeatEvery } = task.reminder;

      // Determine if it's the right day based on recurrence
      let isRightDay = false;
      if (recurrence === 'none') {
        isRightDay = date === todayStr;
      } else if (recurrence === 'daily') {
        isRightDay = true;
      } else if (recurrence === 'weekly') {
        const targetDay = new Date(`${date}T${time}`).getDay();
        isRightDay = now.getDay() === targetDay;
      } else if (recurrence === 'monthly') {
        isRightDay = now.getDate() === new Date(date).getDate();
      }

      if (!isRightDay) return;

      // Window reminder mode
      if (windowEnd && repeatEvery) {
        // Throttle: don't fire if notified in the last minute
        if (lastNotified && now.getTime() - new Date(lastNotified).getTime() < 60000) return;

        const startMin = timeToMin(time);
        const endMin = timeToMin(windowEnd);

        // Outside window
        if (currentMin < startMin || currentMin > endMin) return;

        // Check if current minute lands on a repeat slot
        const slotsPassed = Math.floor((currentMin - startMin) / repeatEvery);
        const slotTime = startMin + slotsPassed * repeatEvery;
        if (currentMin === slotTime) {
          showNotification(task);
          onUpdateTask(task.id, nowStr);
        }
        return;
      }

      // Single-time reminder mode
      if (lastNotified) {
        const diff = now.getTime() - new Date(lastNotified).getTime();
        if (diff < 60000) return;
      }

      if (time === timeStr) {
        showNotification(task);
        onUpdateTask(task.id, nowStr);
      }
    });
  }, [tasks, onUpdateTask]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [checkReminders]);
}

function showNotification(task: Task) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const { windowEnd, repeatEvery } = task.reminder!;
  const body = windowEnd && repeatEvery
    ? `חלון זמן עד ${windowEnd} | תזכורת כל ${repeatEvery} דקות`
    : task.description || 'יש לך משימה לבצע!';

  new Notification(`תזכורת: ${task.title}`, {
    body,
    icon: '/vite.svg',
    tag: task.id,
  });
}
