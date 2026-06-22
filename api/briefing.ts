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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const body = req.body ?? await readBody(req);
    const { tasks = [], habits = [], goals = [], habitLogs = [], desires = [], language = 'hebrew', energyLevel } = body;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const hour = now.getHours();
    const dayHe = now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeGreeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב';
    const timeOfDay    = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    const openTasks      = tasks.filter((t: any) => t.status !== 'done');
    const highPri        = openTasks.filter((t: any) => t.priority === 'high').slice(0, 3);
    const overdue        = openTasks.filter((t: any) => t.reminder?.date && t.reminder.date < todayStr);
    const todayScheduled = openTasks.filter((t: any) => t.reminder?.date === todayStr);

    const todayLogIds  = new Set(habitLogs.filter((l: any) => l.date === todayStr).map((l: any) => l.habitId));
    const habitsDone   = habits.filter((h: any) => todayLogIds.has(h.id));
    const habitsNotDone = habits.filter((h: any) => !todayLogIds.has(h.id));

    const activeGoals  = goals.filter((g: any) => g.status === 'active');
    const stalledGoals = activeGoals.filter((g: any) => {
      const total = (g.milestones || []).length;
      const done  = (g.milestones || []).filter((m: any) => m.completed).length;
      return total > 0 && done === 0;
    });

    const energyCtx = energyLevel
      ? `ENERGY ${energyLevel}/5: ${energyLevel <= 2 ? 'Low — mention only 1 thing, soft tone.' : energyLevel >= 4 ? 'High — push hard, challenge them!' : 'Normal.'}`
      : '';

    const context = `${timeGreeting}, ${dayHe}
${energyCtx}

NEEDS ATTENTION:
Overdue (${overdue.length}): ${overdue.map((t: any) => `"${t.title}" (was ${t.reminder?.date})`).join(', ') || 'none'}
Scheduled today (${todayScheduled.length}): ${todayScheduled.map((t: any) => `"${t.title}" at ${t.reminder?.time || '?'}`).join(', ') || 'none'}
High priority: ${highPri.map((t: any) => `"${t.title}"`).join(', ') || 'none'}

HABITS TODAY ${habitsDone.length}/${habits.length} done:
Done: ${habitsDone.map((h: any) => h.emoji + h.title).join(', ') || 'none yet'}
Still needed: ${habitsNotDone.map((h: any) => h.emoji + h.title).join(', ') || 'all done!'}

GOALS (${activeGoals.length} active):
${activeGoals.slice(0, 3).map((g: any) => {
  const done  = (g.milestones || []).filter((m: any) => m.completed).length;
  const total = (g.milestones || []).length;
  return `"${g.title}" — ${total > 0 ? `${done}/${total} steps` : 'no steps yet'}${g.why ? ` | WHY: ${g.why}` : ''}`;
}).join('\n') || 'none'}
${stalledGoals.length ? `STALLED (0% done): ${stalledGoals.map((g: any) => `"${g.title}"`).join(', ')}` : ''}

DREAMS: ${desires.slice(0, 2).map((d: any) => `${d.emoji} ${d.text}`).join(', ') || 'none'}`;

    const system = `You are J.A.R.V.I.S, an Iron Man-style personal AI. Give an INTELLIGENT spoken briefing — not a list, but an analysis of what matters most RIGHT NOW.
${language === 'english' ? 'Respond in English.' : 'Always respond in Hebrew.'}

RULES:
- Start with "${timeGreeting}" + day name
- If overdue tasks exist → lead with that (be urgent)
- If habits not done + ${timeOfDay === 'evening' ? 'evening' : 'morning/afternoon'} → mention them clearly
- If a goal is stalled → reference its WHY to re-ignite motivation
- Low energy (1-2) → suggest only 1 essential thing, warm tone
- High energy (4-5) → challenge, push hard
- End with ONE specific concrete action or question
- MAX 4 spoken sentences — be punchy, direct, and personal
- DO NOT just list everything — pick what matters most and make it compelling`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      system,
      messages: [{ role: 'user', content: context }],
    });

    const text = (response.content[0] as Anthropic.TextBlock).text.trim();
    res.status(200).json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/briefing]', msg);
    res.status(500).json({ error: msg });
  }
}
