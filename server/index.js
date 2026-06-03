import express from 'express';
import cors from 'cors';
import webpush from 'web-push';
import cron from 'node-cron';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Env ───────────────────────────────────────────────────────────────────────

const {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_EMAIL = 'mailto:admin@example.com',
  PORT = 3001,
  FRONTEND_URL = '*',
} = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('\n❌  Missing VAPID keys.\n');
  console.error('   Run this to generate them:');
  console.error('   cd server && node -e "import(\'web-push\').then(m => console.log(JSON.stringify(m.default.generateVAPIDKeys(), null, 2)))"\n');
  process.exit(1);
}

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ── Simple JSON storage ───────────────────────────────────────────────────────

const DATA_FILE = join(__dirname, 'data.json');

function load() {
  if (!existsSync(DATA_FILE)) return { subscriptions: [], messages: [] };
  try { return JSON.parse(readFileSync(DATA_FILE, 'utf8')); }
  catch { return { subscriptions: [], messages: [] }; }
}

function save(db) {
  writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

let db = load();

// ── Helpers ───────────────────────────────────────────────────────────────────

function toWaPhone(phone) {
  let p = phone.replace(/[\s\-\+]/g, '');
  if (p.startsWith('0')) p = '972' + p.slice(1);
  return p;
}

async function sendPush(sub, payload) {
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      db.subscriptions = db.subscriptions.filter(s => s.endpoint !== sub.endpoint);
      save(db);
    }
  }
}

// ── Cron: check every minute ──────────────────────────────────────────────────

cron.schedule('* * * * *', async () => {
  const now = new Date();
  const due = db.messages.filter(m => new Date(`${m.scheduledDate}T${m.scheduledTime}`) <= now);
  if (due.length === 0) return;

  db.messages = db.messages.filter(m => !due.find(d => d.id === m.id));
  save(db);

  for (const msg of due) {
    const phone = toWaPhone(msg.phone);
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg.message)}`;
    const payload = {
      title: `📱 זמן לשלוח ל-${msg.contactName}!`,
      body: msg.message.length > 100 ? msg.message.slice(0, 100) + '…' : msg.message,
      waUrl,
      id: msg.id,
    };
    await Promise.all(db.subscriptions.map(sub => sendPush(sub, payload)));
  }
});

// ── Express ───────────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// VAPID public key (needed by frontend to subscribe)
app.get('/api/vapid-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Save push subscription
app.post('/api/subscribe', (req, res) => {
  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
  db.subscriptions = db.subscriptions.filter(s => s.endpoint !== subscription.endpoint);
  db.subscriptions.push(subscription);
  save(db);
  res.json({ ok: true });
});

// Add / update a scheduled message
app.post('/api/messages', (req, res) => {
  const msg = req.body;
  if (!msg?.id || !msg.scheduledDate || !msg.scheduledTime) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  db.messages = db.messages.filter(m => m.id !== msg.id);
  db.messages.push(msg);
  save(db);
  res.json({ ok: true });
});

// Cancel / delete a message
app.delete('/api/messages/:id', (req, res) => {
  db.messages = db.messages.filter(m => m.id !== req.params.id);
  save(db);
  res.json({ ok: true });
});

// Full sync from frontend (replaces pending list on server)
app.post('/api/messages/sync', (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'Expected array' });
  db.messages = messages;
  save(db);
  res.json({ ok: true });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`VoiceTask server → http://localhost:${PORT}`));
