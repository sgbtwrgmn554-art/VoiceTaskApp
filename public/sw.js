/* Service Worker – VoiceTask WhatsApp Scheduler */

const DB_NAME = 'voicetask_sw_db';
const DB_VERSION = 1;
const STORE = 'wa_messages';
const CHECK_MS = 30000;

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(msg) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(msg);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Phone normalizer ──────────────────────────────────────────────────────────

function toWaPhone(phone) {
  let p = phone.replace(/[\s\-\+]/g, '');
  if (p.startsWith('0')) p = '972' + p.slice(1);
  return p;
}

// ── Notification firing ───────────────────────────────────────────────────────

async function fireNotification(msg) {
  const phone = toWaPhone(msg.phone);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg.message)}`;

  await self.registration.showNotification(`📱 זמן לשלוח ל-${msg.contactName}!`, {
    body: msg.message.length > 100 ? msg.message.slice(0, 100) + '…' : msg.message,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: `wa-${msg.id}`,
    requireInteraction: true,
    data: { url, id: msg.id },
    actions: [
      { action: 'open', title: '📱 פתח WhatsApp' },
      { action: 'dismiss', title: 'סגור' },
    ],
  });

  await dbDelete(msg.id);

  // Notify all open clients to update their UI
  const allClients = await self.clients.matchAll({ type: 'window' });
  allClients.forEach(c => c.postMessage({ type: 'MESSAGE_FIRED', id: msg.id }));
}

// ── Scheduler loop ────────────────────────────────────────────────────────────

let _checkTimer = null;

async function checkAndFire() {
  const now = new Date();
  let messages;
  try {
    messages = await dbGetAll();
  } catch {
    return;
  }

  for (const msg of messages) {
    const due = new Date(`${msg.scheduledDate}T${msg.scheduledTime}`);
    if (due <= now) {
      await fireNotification(msg).catch(() => {});
    }
  }

  scheduleNextCheck(messages);
}

function scheduleNextCheck(messages) {
  if (_checkTimer) { clearTimeout(_checkTimer); _checkTimer = null; }

  const now = Date.now();
  const pending = (messages || []).filter(m => {
    const due = new Date(`${m.scheduledDate}T${m.scheduledTime}`).getTime();
    return due > now;
  });

  if (pending.length === 0) {
    // No pending — wake up every 30 s just in case new ones are added
    _checkTimer = setTimeout(checkAndFire, CHECK_MS);
    return;
  }

  // Wake up right when the next message is due (or every 30 s, whichever sooner)
  const nextDue = Math.min(...pending.map(m => new Date(`${m.scheduledDate}T${m.scheduledTime}`).getTime()));
  const delay = Math.min(Math.max(nextDue - now, 1000), CHECK_MS);
  _checkTimer = setTimeout(checkAndFire, delay);
}

// ── SW lifecycle ──────────────────────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    self.clients.claim().then(() => checkAndFire())
  );
});

// ── Message bridge (app → SW) ─────────────────────────────────────────────────

self.addEventListener('message', event => {
  const { type, payload } = event.data || {};

  if (type === 'SCHEDULE') {
    dbPut(payload).then(() => checkAndFire()).catch(() => {});
  } else if (type === 'CANCEL' || type === 'DELETE') {
    dbDelete(payload.id).then(() => checkAndFire()).catch(() => {});
  } else if (type === 'SYNC_ALL') {
    // App sends full list on load to keep SW in sync
    openDB().then(async db => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.clear();
      (payload || []).forEach(m => store.put(m));
      await new Promise(r => { tx.oncomplete = r; });
      checkAndFire();
    }).catch(() => {});
  }
});

// ── Periodic background sync (Chrome Android) ─────────────────────────────────

self.addEventListener('periodicsync', event => {
  if (event.tag === 'wa-scheduler') {
    event.waitUntil(checkAndFire());
  }
});

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const { url } = event.notification.data;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope)) {
          c.focus();
          break;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
