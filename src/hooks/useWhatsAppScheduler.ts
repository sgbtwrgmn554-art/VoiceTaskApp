import { useState, useEffect, useCallback } from 'react';
import { WhatsAppScheduledMessage } from '../types';

const STORAGE_KEY = 'voicetask_whatsapp_messages';

function toWhatsAppPhone(phone: string): string {
  let p = phone.replace(/[\s\-\+]/g, '');
  if (p.startsWith('0')) p = '972' + p.slice(1);
  return p;
}

function openWhatsApp(msg: WhatsAppScheduledMessage) {
  const phone = toWhatsAppPhone(msg.phone);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg.message)}`;

  if ('Notification' in window && Notification.permission === 'granted') {
    const notif = new Notification(`📱 זמן לשלוח ל-${msg.contactName}!`, {
      body: msg.message.length > 80 ? msg.message.slice(0, 80) + '…' : msg.message,
      icon: '/vite.svg',
      tag: `wa-${msg.id}`,
      requireInteraction: true,
    });
    notif.onclick = () => {
      window.open(url, '_blank');
      notif.close();
    };
  }

  window.open(url, '_blank');
}

export function useWhatsAppScheduler() {
  const [messages, setMessages] = useState<WhatsAppScheduledMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const scheduleMessage = (
    data: Omit<WhatsAppScheduledMessage, 'id' | 'status' | 'createdAt'>
  ): WhatsAppScheduledMessage => {
    const msg: WhatsAppScheduledMessage = {
      ...data,
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  };

  const cancelMessage = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'cancelled' } : m));
  };

  const deleteMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const checkScheduled = useCallback(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setMessages(prev => {
      let changed = false;
      const updated = prev.map(msg => {
        if (msg.status !== 'pending') return msg;

        const scheduledDt = new Date(`${msg.scheduledDate}T${msg.scheduledTime}`);
        const isNow = msg.scheduledDate === todayStr && msg.scheduledTime === timeStr;
        const isPast = scheduledDt <= now;

        if (isNow || isPast) {
          openWhatsApp(msg);
          changed = true;
          return { ...msg, status: 'sent' as const, sentAt: new Date().toISOString() };
        }
        return msg;
      });
      return changed ? updated : prev;
    });
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    checkScheduled();
    const interval = setInterval(checkScheduled, 30000);
    return () => clearInterval(interval);
  }, [checkScheduled]);

  return { messages, scheduleMessage, cancelMessage, deleteMessage };
}
