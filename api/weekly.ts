import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c: Buffer) => { raw += c.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

function isoWeekAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const body = req.body ?? await readBody(req);
    const { tasks = [], habits = [], habitLogs = [], goals = [], reflections = [], language = 'hebrew' } = body;

    const weekAgo = isoWeekAgo();

    const doneTasks = tasks.filter((t: any) => t.status === 'done' && t.updatedAt >= weekAgo);
    const pendingTasks = tasks.filter((t: any) => t.status !== 'done');
    const activeGoals = goals.filter((g: any) => g.status === 'active');

    const habitSummary = habits.map((h: any) => {
      const weekLogs = habitLogs.filter((l: any) => l.habitId === h.id && l.date >= weekAgo);
      return `${h.emoji} ${h.title}: ${weekLogs.length}/7 ימים`;
    }).join('\n') || 'אין';

    const weekReflections = reflections.filter((r: any) => r.date >= weekAgo);
    const avgMood = weekReflections.length > 0
      ? (weekReflections.reduce((s: number, r: any) => s + r.mood, 0) / weekReflections.length).toFixed(1)
      : null;

    const system = `You are J.A.R.V.I.S, an Iron Man-style personal assistant. Provide a concise weekly review spoken aloud.
${language === 'english' ? 'Respond in English.' : 'Always respond in Hebrew.'}

Give a 3-4 sentence spoken summary covering: tasks completed, habits consistency, goal progress, and mood if available. Be encouraging and specific. End with one actionable tip for next week.`;

    const userContent = `Weekly data:
Tasks completed this week: ${doneTasks.length} (${doneTasks.map((t: any) => t.title).slice(0, 5).join(', ') || 'none'})
Pending tasks: ${pendingTasks.length}
Active goals: ${activeGoals.map((g: any) => g.title).join(', ') || 'none'}
Habits this week:
${habitSummary}
${avgMood ? `Average mood: ${avgMood}/5` : ''}
Reflections this week: ${weekReflections.length}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: userContent }],
    });

    const text = (response.content[0] as Anthropic.TextBlock).text.trim();
    res.status(200).json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/weekly]', msg);
    res.status(500).json({ text: 'מצטער, לא הצלחתי לייצר סיכום שבועי.' });
  }
}
