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
    const { question, tasks = [], habits = [], goals = [], habitLogs = [], language = 'hebrew' } = body;

    const todayStr = new Date().toISOString().slice(0, 10);

    const taskLines = tasks
      .filter((t: any) => t.status !== 'done')
      .map((t: any) => `id=${t.id} | "${t.title}" | priority=${t.priority}`)
      .join('\n') || 'אין';

    const habitLines = habits.map((h: any) => {
      const doneToday = habitLogs.some((l: any) => l.habitId === h.id && l.date === todayStr);
      return `id=${h.id} | ${h.emoji} "${h.title}" | ${doneToday ? 'בוצע היום ✓' : 'לא בוצע היום'}`;
    }).join('\n') || 'אין';

    const goalLines = goals.filter((g: any) => g.status === 'active')
      .map((g: any) => `id=${g.id} | "${g.title}"`)
      .join('\n') || 'אין';

    const system = `You are J.A.R.V.I.S, an Iron Man-style personal voice assistant. Respond ONLY with raw valid JSON (no markdown, no \`\`\`).

CURRENT DATA:
Open tasks:
${taskLines}

Habits:
${habitLines}

Active goals:
${goalLines}

RESPONSE FORMAT — always one of:

No action: {"text":"...","action":null}
With action: {"text":"...","action":{"type":"...","<fields>":"..."}}

ACTION TYPES:
mark_done     → {"type":"mark_done","taskId":"<exact id>","taskTitle":"<title>"}
create_task   → {"type":"create_task","title":"<title>","priority":"low"|"medium"|"high"}
edit_task     → {"type":"edit_task","taskId":"<id>","taskTitle":"<title>","field":"title"|"priority"|"status","value":"<new value>"}
delete_task   → {"type":"delete_task","taskId":"<id>","taskTitle":"<title>"}
add_habit     → {"type":"add_habit","title":"<title>","emoji":"<emoji>","frequency":"daily"|"weekly","targetDays":[0-6],"color":"<hex>"}
toggle_habit  → {"type":"toggle_habit","habitId":"<id>","habitTitle":"<title>"}
delete_habit  → {"type":"delete_habit","habitId":"<id>","habitTitle":"<title>"}
create_goal   → {"type":"create_goal","title":"<title>","domainId":"career"|"health"|"relationships"|"finance"|"growth"|"family"|"social"|"hobbies","description":"<optional>"}
delete_goal   → {"type":"delete_goal","goalId":"<id>","goalTitle":"<title>"}
navigate      → {"type":"navigate","tab":"home"|"chat"|"calendar"|"goals"|"habits"|"profile"}
add_reflection → {"type":"add_reflection","gratitude":"<text>","learning":"<text>","tomorrowFocus":"<text>","mood":1|2|3|4|5}
start_focus   → {"type":"start_focus","minutes":25,"taskTitle":"<task being focused on or empty>"}
weekly_review → {"type":"weekly_review"}

RULES:
- text: 1-2 short Hebrew sentences, spoken out loud
- mark_done: user says finished/did/completed a task → text = "מצאתי את המשימה [title], לאשר?"
- create_task: user wants to add a task → text = "רוצה ליצור משימה [title], לאשר?"
- edit_task: user wants to change task title/priority/status → text = "רוצה לעדכן את [title], לאשר?"
- delete_task: user wants to delete/remove a task → text = "רוצה למחוק את המשימה [title], לאשר?"
- add_habit: daily uses targetDays [0,1,2,3,4,5,6] → text = "רוצה להוסיף הרגל [emoji][title], לאשר?"
- toggle_habit: user says they did a habit today → text = "רוצה לסמן [emoji][title] כבוצע היום, לאשר?"
- delete_habit: user wants to delete a habit → text = "רוצה למחוק את ההרגל [title], לאשר?"
- create_goal: pick best domainId → text = "רוצה ליצור יעד [title], לאשר?"
- delete_goal: user wants to delete a goal → text = "רוצה למחוק את היעד [title], לאשר?"
- navigate: user says "לך ל..." / "פתח..." / "show me..." → text = "מנווט ל[tab]..."
- add_reflection: user dictates reflection/diary → mood 1-5 based on sentiment → text = "רוצה לשמור רפלקציה להיום, לאשר?"
- start_focus: user says focus/timer/ריכוז/טיימר/פוקוס → minutes default 25 → text = "מתחיל טיימר ריכוז [minutes] דקות, לאשר?"
- weekly_review: user says סיכום שבועי/שבוע/weekly → text = "מייצר סיכום שבועי..."
- No matching action → action:null, answer the question
${language === 'english' ? '- Respond in English.' : '- Always respond in Hebrew.'}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
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
