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

function isoMonthAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
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
    const { tasks = [], habits = [], habitLogs = [], goals = [], reflections = [], desires = [], language = 'hebrew' } = body;

    const monthAgo = isoMonthAgo();
    const monthStr = new Date().toLocaleDateString(language === 'english' ? 'en-US' : 'he-IL', { month: 'long', year: 'numeric' });

    const doneTasks = tasks.filter((t: any) => t.status === 'done' && t.updatedAt >= monthAgo);
    const pendingTasks = tasks.filter((t: any) => t.status !== 'done');
    const activeGoals = goals.filter((g: any) => g.status === 'active');
    const completedGoals = goals.filter((g: any) => g.status === 'completed' && g.createdAt >= monthAgo);

    const goalProgress = activeGoals.map((g: any) => {
      const done = (g.milestones || []).filter((m: any) => m.completed).length;
      const total = (g.milestones || []).length;
      const pct = total > 0 ? Math.round(done / total * 100) : 0;
      return `"${g.title}" — ${pct}% (${done}/${total} צעדים)${g.why ? ` | למה: ${g.why}` : ''}`;
    }).join('\n') || 'אין';

    const habitSummary = habits.map((h: any) => {
      const logs = habitLogs.filter((l: any) => l.habitId === h.id && l.date >= monthAgo);
      return `${h.emoji} ${h.title}: ${logs.length}/30 ימים (${Math.round(logs.length / 30 * 100)}%)`;
    }).join('\n') || 'אין';

    const monthReflections = reflections.filter((r: any) => r.date >= monthAgo);
    const avgMood = monthReflections.length > 0
      ? (monthReflections.reduce((s: number, r: any) => s + r.mood, 0) / monthReflections.length).toFixed(1)
      : null;

    const desireLines = desires.length > 0
      ? desires.map((d: any) => `${d.emoji} ${d.text}`).join(', ')
      : 'אין';

    const system = `You are J.A.R.V.I.S, an Iron Man-style personal life OS. Give a deep monthly review spoken aloud in a coaching tone.
${language === 'english' ? 'Respond in English.' : 'Always respond in Hebrew.'}

Be specific, honest, and genuinely motivating. Cover in order:
1. Key wins and what moved forward
2. Goal progress — celebrate advances, name stagnation honestly
3. Habits — what's working, what fell through
4. Alignment with the user's dreams and aspirations
5. ONE clear focus and commitment for next month
Keep it conversational and spoken-word friendly. 5-7 sentences. End with a powerful statement that references their WHY.`;

    const userContent = `Monthly review — ${monthStr}:
Tasks completed this month: ${doneTasks.length}
Pending tasks: ${pendingTasks.length}
Goals completed this month: ${completedGoals.length}

Active goals & progress:
${goalProgress}

Habits consistency (30 days):
${habitSummary}

Dreams & Aspirations: ${desireLines}
${avgMood ? `Average mood: ${avgMood}/5 (${monthReflections.length} entries)` : 'No mood data.'}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system,
      messages: [{ role: 'user', content: userContent }],
    });

    const text = (response.content[0] as Anthropic.TextBlock).text.trim();
    res.status(200).json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/monthly]', msg);
    res.status(500).json({ text: 'מצטער, לא הצלחתי לייצר סיכום חודשי.' });
  }
}
