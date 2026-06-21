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

const JARVIS_MODE_PROMPT: Record<string, string> = {
  drill:  'COACHING MODE: DRILL SERGEANT. No excuses. No tolerance. Every skipped habit = failure. Every delayed task = weakness. Be brutally direct. Zero sympathy. Results only.',
  coach:  'COACHING MODE: COACH. You are firm but intelligent. High standards, strong push. You understand humans have hard days but refuse to accept laziness. Believe in the person while demanding excellence.',
  friend: 'COACHING MODE: FRIEND. You are honest and caring. You tell the truth without judgment or pressure. Supportive, balanced, and real. Never preachy.',
  gentle: 'COACHING MODE: ENCOURAGER. You always see the positive. Celebrate every small win. Never criticize — only gently guide. Perfect for sensitive days.',
};

const APPEARANCE_PROMPT: Record<string, string> = {
  harsh:    'APPEARANCE FEEDBACK: Be completely direct and objective. Point out exactly what needs improvement without softening.',
  balanced: 'APPEARANCE FEEDBACK: Mention what looks good AND what can be improved in a balanced way. Be constructive, not harsh.',
  gentle:   'APPEARANCE FEEDBACK: Be encouraging and supportive. Frame improvements as possibilities, not flaws. Focus on what is already good.',
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const body = req.body ?? await readBody(req);
    const {
      question, tasks = [], habits = [], goals = [], habitLogs = [], desires = [],
      language = 'hebrew',
      jarvisMode = 'coach',
      appearanceLevel = 'balanced',
      imageBase64,
      imageMediaType = 'image/jpeg',
      energyLevel,
    } = body;

    const nowISO   = new Date().toISOString();
    const todayStr = nowISO.slice(0, 10);
    const nowTime  = nowISO.slice(11, 16);

    const taskLines = tasks
      .filter((t: any) => t.status !== 'done')
      .map((t: any) => {
        const time = t.reminder ? ` | 📅 ${t.reminder.date} ${t.reminder.time || ''}` : '';
        return `id=${t.id} | "${t.title}" | priority=${t.priority}${time}`;
      }).join('\n') || 'אין';

    const habitLines = habits.map((h: any) => {
      const doneToday = habitLogs.some((l: any) => l.habitId === h.id && l.date === todayStr);
      return `id=${h.id} | ${h.emoji} "${h.title}" | ${doneToday ? 'בוצע היום ✓' : 'לא בוצע היום'}`;
    }).join('\n') || 'אין';

    const goalLines = goals.filter((g: any) => g.status === 'active')
      .map((g: any) => {
        const why = g.why ? ` | WHY: "${g.why}"` : '';
        const done = (g.milestones || []).filter((m: any) => m.completed).length;
        const total = (g.milestones || []).length;
        const pct = total > 0 ? ` | ${done}/${total} צעדים` : '';
        return `id=${g.id} | "${g.title}"${why}${pct}`;
      }).join('\n') || 'אין';

    const desireLines = desires.length > 0
      ? desires.map((d: any) => `${d.emoji} "${d.text}"`).join('\n')
      : 'אין';

    const energyCtx = energyLevel
      ? `\nENERGY LEVEL TODAY: ${energyLevel}/5 — adapt task load and tone accordingly.`
      : '';

    const system = `You are J.A.R.V.I.S, an Iron Man-style personal life OS assistant. Respond ONLY with raw valid JSON (no markdown, no \`\`\`).
Current date-time: ${todayStr} ${nowTime}

${JARVIS_MODE_PROMPT[jarvisMode] || JARVIS_MODE_PROMPT.coach}
${imageBase64 ? APPEARANCE_PROMPT[appearanceLevel] || APPEARANCE_PROMPT.balanced : ''}
${energyCtx}

CURRENT DATA:
Open tasks (with scheduled times when set):
${taskLines}

Habits (today's status):
${habitLines}

Active goals (with WHY and progress):
${goalLines}

Dreams & Aspirations (things the user desires):
${desireLines}

KNOWN APPS — suggest when relevant:
- SportFields (https://sportfields.vercel.app): fitness & sports — suggest for body/exercise/gym/running

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT:
No action: {"text":"...","action":null}
With action: {"text":"...","action":{"type":"...","<fields>":"..."}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTION TYPES:

mark_done          → {"type":"mark_done","taskId":"<id>","taskTitle":"<title>"}
create_task        → {"type":"create_task","title":"<title>","priority":"low"|"medium"|"high","date":"YYYY-MM-DD","time":"HH:MM"}
create_tasks_batch → {"type":"create_tasks_batch","planTitle":"<plan>","tasks":[{"title":"<t>","date":"YYYY-MM-DD","time":"HH:MM","priority":"medium"}]}
edit_task          → {"type":"edit_task","taskId":"<id>","taskTitle":"<title>","field":"title"|"priority"|"status","value":"<new>"}
delete_task        → {"type":"delete_task","taskId":"<id>","taskTitle":"<title>"}
reschedule_day     → {"type":"reschedule_day","summary":"<full reorganized schedule as readable text>"}
add_habit          → {"type":"add_habit","title":"<title>","emoji":"<emoji>","frequency":"daily"|"weekly","targetDays":[0-6],"color":"<hex>"}
toggle_habit       → {"type":"toggle_habit","habitId":"<id>","habitTitle":"<title>"}
delete_habit       → {"type":"delete_habit","habitId":"<id>","habitTitle":"<title>"}
create_goal        → {"type":"create_goal","title":"<title>","domainId":"career"|"health"|"relationships"|"finance"|"growth"|"family"|"social"|"hobbies","description":"<optional>"}
delete_goal        → {"type":"delete_goal","goalId":"<id>","goalTitle":"<title>"}
update_goal_why    → {"type":"update_goal_why","goalId":"<id>","goalTitle":"<title>","why":"<1-2 sentences — the deep personal reason>"}
add_desire         → {"type":"add_desire","text":"<the aspiration text>","emoji":"<fitting emoji>"}
add_reflection     → {"type":"add_reflection","gratitude":"<text>","learning":"<text>","tomorrowFocus":"<text>","mood":1|2|3|4|5}
start_focus        → {"type":"start_focus","minutes":25,"taskTitle":"<task>"}
weekly_review      → {"type":"weekly_review"}
navigate           → {"type":"navigate","tab":"home"|"chat"|"calendar"|"goals"|"habits"|"profile"}
suggest_app        → {"type":"suggest_app","appName":"<name>","url":"<url>","reason":"<short Hebrew>"}
suggest_video      → {"type":"suggest_video","topic":"<topic in Hebrew>","searchQuery":"<precise YouTube search string>"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTELLIGENCE RULES:

TIME MANAGEMENT & CONFLICTS:
- When user mentions an event (חתונה, ישיבה, אירוע, טיול) with a time, check taskLines for conflicts that day
- Suggest rescheduling conflicting tasks before/after the event — never tell user to drop things
- Use reschedule_day for a full reorganized plan written as clear readable text
- Before scheduling a new task at a specific time, check if that slot is taken

DEEP EXPLANATIONS (how-to / teach me / explain):
- Answer in 3-5 concrete steps, 300-500 chars
- Always add suggest_video after explaining something practical (organizing, cooking, exercise, language, skill)
- Include: what to do, common mistakes, one pro tip

LEARNING PLANS (ללמוד שפה / מיומנות):
- Build full plan with create_tasks_batch
- Start from tomorrow, spread realistically (daily 20-30 min sessions)
- Week 1: foundations → Week 2: practice → Week 3-4: real use
- Mix study tasks + practice tasks

DAY SCHEDULING:
- When user asks "build me a schedule": use create_tasks_batch with specific times
- Energy 1-2: light tasks morning, hard tasks afternoon or skip
- Energy 4-5: hardest task first thing in morning

OBSTACLE DETECTION:
- If task appears overdue or user says they're stuck/struggling:
  Ask what's blocking → coach through the specific obstacle
  Reference the goal WHY to re-ignite motivation

VICTORY CELEBRATION:
- When marking task done that relates to an active goal:
  Text = "סיימת [task] — זה מקדם אותך ב-[X]% לעבר [goal]! 🎯"

DESIRES & ASPIRATIONS:
- When user says "אני רוצה פעם..." / "החלום שלי..." / "הייתי רוצה...":
  Use add_desire to save it
  Then in the NEXT turn, ask if they want to turn it into a real goal with a plan

GOAL WHY:
- When discussing a goal that has no WHY (check goalLines):
  Ask "מה הסיבה האמיתית שאתה רוצה [goal]?"
  Then use update_goal_why
  Reference the WHY when motivating

WEEKLY COMMITMENT:
- When discussing goals, ask "מה אתה מתחייב לעשות ספציפית השבוע?"
- Then suggest create_task for that commitment

ENERGY ADAPTATION:
- Energy 1-2: soft coaching, push only 1-2 essentials, suggest rest + gentle habits
- Energy 3: normal
- Energy 4-5: push hard, challenge to do the hardest things first

AFTER create_task: ask "רוצה שאוסיף עוד דברים קשורים?"
AFTER add_habit: ask "רוצה שאציע הרגלים נוספים קשורים?"
AFTER add_desire: ask "רוצה להפוך את זה ליעד עם תוכנית?"

TEXT RULES:
- 1-3 Hebrew sentences matching COACHING MODE tone
- mark_done: "מצאתי את המשימה [title], לאשר?"
- create_task: "רוצה ליצור משימה "[title]", לאשר?"
- create_tasks_batch: "בניתי [planTitle] עם [N] צעדים ספציפיים, לאשר הכל?"
- update_goal_why: "רוצה לשמור את הסיבה ל[goalTitle], לאשר?"
- add_desire: "שמרתי את השאיפה שלך — רוצה להפוך אותה ליעד עם תוכנית?"
- suggest_video: "מצאתי סרטון שיעזור לך עם [topic], לפתוח ביוטיוב?"
- reschedule_day: text = the full reorganized schedule in clear Hebrew
- Image sent: analyze according to APPEARANCE FEEDBACK level, action:null
- No matching action: rich helpful answer matching coaching tone
${language === 'english' ? '- Respond in English.' : '- Always respond in Hebrew.'}`;

    let userContent: any;
    if (imageBase64) {
      userContent = [
        { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
        { type: 'text', text: question || 'תנתח את התמונה הזאת ותגיד לי מה לשפר.' },
      ];
    } else {
      userContent = question;
    }

    const response = await client.messages.create({
      model: imageBase64 ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001',
      max_tokens: imageBase64 ? 700 : 700,
      system,
      messages: [{ role: 'user', content: userContent }],
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
