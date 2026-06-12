import { useEffect, useCallback } from 'react';
import { Task } from '../types';

interface UseRemindersOptions {
  tasks: Task[];
  onUpdateTask: (id: string, lastNotified: string) => void;
}

export function useReminders({ tasks, onUpdateTask }: UseRemindersOptions) {
  const checkReminders = useCallback(() => {
    const now = new Date();
    const nowStr = now.toISOString();
    const todayStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    tasks.forEach(task => {
      if (!task.reminder) return;
      const { date, time, recurrence, lastNotified } = task.reminder;

      // Check if already notified this minute
      if (lastNotified) {
        const lastDate = new Date(lastNotified);
        const diff = now.getTime() - lastDate.getTime();
        if (diff < 60000) return; // Less than 1 minute ago
      }

      let shouldNotify = false;

      if (recurrence === 'none') {
        shouldNotify = date === todayStr && time === timeStr;
      } else if (recurrence === 'daily') {
        shouldNotify = time === timeStr;
      } else if (recurrence === 'weekly') {
        const targetDay = new Date(`${date}T${time}`).getDay();
        shouldNotify = now.getDay() === targetDay && time === timeStr;
      } else if (recurrence === 'monthly') {
        const targetDayOfMonth = new Date(date).getDate();
        shouldNotify = now.getDate() === targetDayOfMonth && time === timeStr;
      } else if (recurrence === 'every3months') {
        const target = new Date(date);
        const monthDiff = (now.getFullYear() * 12 + now.getMonth()) - (target.getFullYear() * 12 + target.getMonth());
        shouldNotify = monthDiff >= 0 && monthDiff % 3 === 0 && now.getDate() === target.getDate() && time === timeStr;
      } else if (recurrence === 'halfyear') {
        const target = new Date(date);
        const monthDiff = (now.getFullYear() * 12 + now.getMonth()) - (target.getFullYear() * 12 + target.getMonth());
        shouldNotify = monthDiff >= 0 && monthDiff % 6 === 0 && now.getDate() === target.getDate() && time === timeStr;
      } else if (recurrence === 'yearly') {
        const target = new Date(date);
        shouldNotify = now.getMonth() === target.getMonth() && now.getDate() === target.getDate() && time === timeStr;
      }

      if (shouldNotify) {
        showNotification(task);
        onUpdateTask(task.id, nowStr);
      }
    });
  }, [tasks, onUpdateTask]);

  useEffect(() => {
    // Request permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Check immediately and then every minute
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [checkReminders]);
}

function showNotification(task: Task) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`תזכורת: ${task.title}`, {
      body: task.description || 'יש לך משימה לבצע!',
      icon: '/vite.svg',
      tag: task.id,
    });
  }

  if (task.reminder?.whatsapp && task.reminder?.whatsappPhone) {
    const phone = task.reminder.whatsappPhone.replace(/\D/g, '');
    const message = encodeURIComponent(`תזכורת: ${task.title}\n${task.description || 'יש לך משימה לבצע!'}`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  }
}
