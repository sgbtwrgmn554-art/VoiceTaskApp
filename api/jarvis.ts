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
    const { question, tasks = [], habits = [], goals = [], language = 'hebrew' } = body;

    const taskLines = tasks
      .filter((t: any) => t.status !== 'done')
      .map((t: any) => `id=${t.id} | "${t.title}"`)
      .join('\n') || 'אין';

    const habitLines = habits.map((h: any) => `${h.emoji} ${h.title}`).join(', ') || 'אין';
    const goalLines = goals.filter((g: any) => g.status === 'active').map((g: any) => g.title).join(', ') || 'אין';

    const system = `You are J.A.R.V.I.S, an Iron Man-style personal voice assistant. Respond ONLY with raw valid JSON (no markdown, no \`\`\`).

CURRENT DATA:
Open tasks:
${taskLines}

Habits: ${habitLines}
Active goals: ${goalLines}

RESPONSE FORMAT — always one of:

No action: {"text":"...","action":null}
With action: {"text":"...","action":{"type":"...","<fields>":"..."}}

ACTION TYPES:
mark_done     → {"type":"mark_done","taskId":"<exact id>","taskTitle":"<title>"}
create_task   → {"type":"create_task","title":"<title>","priority":"low"|"medium"|"high"}
add_habit     → {"type":"add_habit","title":"<title>","emoji":"<emoji>","frequency":"daily"|"weekly","targetDays":[0-6],"color":"<hex>"}
create_goal   → {"type":"create_goal","title":"<title>","domainId":"career"|"health"|"relationships"|"finance"|"growth"|"family"|"social"|"hobbies","description":"<optional>"}
start_focus   → {"type":"start_focus","minutes":25,"taskTitle":"<task being focused on or empty>"}
weekly_review → {"type":"weekly_review"}

RULES:
- text: 1-2 short Hebrew sentences, spoken out loud
- mark_done: use when user says they finished/did/completed a task → text = "מצאתי את המשימה [title], לאשר?"
- create_task: use when user wants to add a task → text = "רוצה ליצור משימה [title], לאשר?"
- add_habit: daily uses targetDays [0,1,2,3,4,5,6]; pick a fitting emoji and color → text = "רוצה להוסיף הרגל [emoji][title] [frequency], לאשר?"
- create_goal: pick the best domainId from the list → text = "רוצה ליצור יעד [title], לאשר?"
- start_focus: use when user says focus/timer/pomodoro/ריכוז/טיימר/פוקוס/עבוד → minutes default 25 unless user specifies → text = "מתחיל טיימר ריכוז [minutes] דקות, לאשר?"
- weekly_review: use when user says סיכום שבועי/weekly/שבוע/סיכום → text = "מייצר סיכום שבועי..."
- No matching action → action:null, just answer the question
${language === 'english' ? '- Respond in English.' : '- Always respond in Hebrew.'}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system,
      messages: [{ role: 'user', content: question }],
    });

    const raw = (response.content[0] as Anthropic.TextBlock).text.trim();
    let parsed: { text: string; action: any } = { text: raw, action: null };
    try {
      const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      parsed = JSON.parse(cleaned);
      if (!parsed.text) parsed.text = 'בוצע.';
    } catch {
      parsed = { text: raw, action: null };
    }

    res.status(200).json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/jarvis]', msg);
    res.status(500).json({ text: 'מצטער, הייתה שגיאה.', action: null });
  }
}
