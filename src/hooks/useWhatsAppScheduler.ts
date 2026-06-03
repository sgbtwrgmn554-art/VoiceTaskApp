import { useState, useEffect, useCallback, useRef } from 'react';
import { WhatsAppScheduledMessage } from '../types';

const STORAGE_KEY = 'voicetask_whatsapp_messages';

function toWaPhone(phone: string): string {
  let p = phone.replace(/[\s\-\+]/g, '');
  if (p.startsWith('0')) p = '972' + p.slice(1);
  return p;
}

function openWhatsApp(msg: WhatsAppScheduledMessage) {
  const url = `https://wa.me/${toWaPhone(msg.phone)}?text=${encodeURIComponent(msg.message)}`;
  if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification(`📱 זמן לשלוח ל-${msg.contactName}!`, {
      body: msg.message.length > 100 ? msg.message.slice(0, 100) + '…' : msg.message,
      icon: '/icon.svg',
      tag: `wa-${msg.id}`,
      requireInteraction: true,
    });
    n.onclick = () => { window.open(url, '_blank'); n.close(); };
  }
  window.open(url, '_blank');
}

// ── Service Worker bridge ────────────────────────────────────────────────────

let swReg: ServiceWorkerRegistration | null = null;

async function getSW(): Promise<ServiceWorkerRegistration | null> {
  if (swReg) return swReg;
  if (!('serviceWorker' in navigator)) return null;
  try {
    swReg = await navigator.serviceWorker.ready;
    return swReg;
  } catch {
    return null;
  }
}

function postSW(type: string, payload?: unknown) {
  getSW().then(reg => {
    reg?.active?.postMessage({ type, payload });
  });
}

function syncSWAll(messages: WhatsAppScheduledMessage[]) {
  const pending = messages.filter(m => m.status === 'pending');
  postSW('SYNC_ALL', pending);
}

// Register SW and periodic background sync
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swReg = reg;

    // Request periodic background sync (Chrome Android)
    if ('periodicSync' in reg) {
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
      if (status.state === 'granted') {
        await (reg as any).periodicSync.register('wa-scheduler', { minInterval: 60 * 1000 });
      }
    }
  } catch {
    // SW registration failed — fallback to in-page interval
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWhatsAppScheduler() {
  const [messages, setMessages] = useState<WhatsAppScheduledMessage[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  });

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Register SW once
  useEffect(() => {
    registerSW();
  }, []);

  // Keep SW in sync whenever messages change
  useEffect(() => {
    syncSWAll(messages);
  }, [messages]);

  // Listen for SW firing a message (tab is open but we still want UI update)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'MESSAGE_FIRED') {
        const id = event.data.id as string;
        setMessages(prev =>
          prev.map(m => m.id === id ? { ...m, status: 'sent', sentAt: new Date().toISOString() } : m)
        );
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // In-page fallback check (every 30 s) — fires when tab is open and SW hasn't handled it
  const checkScheduled = useCallback(() => {
    const now = new Date();
    setMessages(prev => {
      let changed = false;
      const updated = prev.map(msg => {
        if (msg.status !== 'pending') return msg;
        const due = new Date(`${msg.scheduledDate}T${msg.scheduledTime}`);
        if (due <= now) {
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
    const iv = setInterval(checkScheduled, 30000);
    return () => clearInterval(iv);
  }, [checkScheduled]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const scheduleMessage = useCallback(
    (data: Omit<WhatsAppScheduledMessage, 'id' | 'status' | 'createdAt'>): WhatsAppScheduledMessage => {
      const msg: WhatsAppScheduledMessage = {
        ...data,
        id: crypto.randomUUID(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, msg]);
      postSW('SCHEDULE', msg);
      return msg;
    },
    []
  );

  const cancelMessage = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'cancelled' } : m));
    postSW('CANCEL', { id });
  }, []);

  const deleteMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    postSW('DELETE', { id });
  }, []);

  return { messages, scheduleMessage, cancelMessage, deleteMessage };
}
