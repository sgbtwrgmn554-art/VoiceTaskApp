import { useState, useEffect, useCallback, useRef } from 'react';
import { WhatsAppScheduledMessage } from '../types';

const STORAGE_KEY = 'voicetask_whatsapp_messages';
const API_URL = (import.meta as any).env?.VITE_API_URL ?? '';

// ── Phone helper ──────────────────────────────────────────────────────────────

function toWaPhone(phone: string): string {
  let p = phone.replace(/[\s\-\+]/g, '');
  if (p.startsWith('0')) p = '972' + p.slice(1);
  return p;
}

// ── Fallback (in-page): open WhatsApp directly when tab is open ───────────────

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

// ── Backend API helpers ───────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit) {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// ── Push subscription ─────────────────────────────────────────────────────────

let _pushSubscribed = false;

async function ensurePushSubscription(): Promise<boolean> {
  if (_pushSubscribed) return true;
  if (!API_URL) return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    const keyData = await apiFetch('/api/vapid-key');
    if (!keyData?.publicKey) return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }

    const ok = await apiFetch('/api/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: sub }),
    });
    if (ok) _pushSubscribed = true;
    return !!ok;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ── Service Worker bridge (local, for Android) ────────────────────────────────

let swReg: ServiceWorkerRegistration | null = null;

async function getSW(): Promise<ServiceWorkerRegistration | null> {
  if (swReg) return swReg;
  if (!('serviceWorker' in navigator)) return null;
  try { swReg = await navigator.serviceWorker.ready; return swReg; } catch { return null; }
}

function postSW(type: string, payload?: unknown) {
  getSW().then(reg => reg?.active?.postMessage({ type, payload }));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWhatsAppScheduler() {
  const [messages, setMessages] = useState<WhatsAppScheduledMessage[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
    catch { return []; }
  });

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Register SW + request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
        swReg = reg;
        if ('periodicSync' in reg) {
          navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName })
            .then(s => { if (s.state === 'granted') (reg as any).periodicSync.register('wa-scheduler', { minInterval: 60000 }); })
            .catch(() => {});
        }
      }).catch(() => {});
    }
  }, []);

  // Subscribe to push (backend mode)
  useEffect(() => {
    if (API_URL) ensurePushSubscription().catch(() => {});
  }, []);

  // Sync pending messages to both SW and backend
  useEffect(() => {
    const pending = messages.filter(m => m.status === 'pending');
    postSW('SYNC_ALL', pending);
    if (API_URL) {
      apiFetch('/api/messages/sync', { method: 'POST', body: JSON.stringify({ messages: pending }) });
    }
  }, [messages]);

  // Listen for SW firing a message (updates UI when tab is open)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'MESSAGE_FIRED') {
        const id = e.data.id as string;
        setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'sent', sentAt: new Date().toISOString() } : m));
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // In-page fallback check every 30 s (tab open, no backend / no push)
  const checkScheduled = useCallback(() => {
    const now = new Date();
    setMessages(prev => {
      let changed = false;
      const updated = prev.map(msg => {
        if (msg.status !== 'pending') return msg;
        if (new Date(`${msg.scheduledDate}T${msg.scheduledTime}`) <= now) {
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
      if (API_URL) apiFetch('/api/messages', { method: 'POST', body: JSON.stringify(msg) });
      return msg;
    }, []
  );

  const cancelMessage = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'cancelled' } : m));
    postSW('CANCEL', { id });
    if (API_URL) apiFetch(`/api/messages/${id}`, { method: 'DELETE' });
  }, []);

  const deleteMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    postSW('DELETE', { id });
    if (API_URL) apiFetch(`/api/messages/${id}`, { method: 'DELETE' });
  }, []);

  const hasPushBackend = !!API_URL;

  return { messages, scheduleMessage, cancelMessage, deleteMessage, hasPushBackend };
}
