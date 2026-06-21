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
    const { tasks = [], habits = [], goals = [], language = 'hebrew' } = body;
    const now = new Date();
    const dayHe = now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

    const activeTasks = tasks.filter((t: any) => t.status !== 'done').slice(0, 5);
    const activeGoals = goals.filter((g: any) => g.status === 'active').slice(0, 3);

    const prompt = `אתה עוזר אישי קולי בשם ג'אַרוִיס, דומה ל-JARVIS של איירון מן אבל בעברית.
תן ברכת בוקר קצרה ומוטיבציונלית ל-${dayHe}, ואז סכם:
- משימות פתוחות: ${activeTasks.map((t: any) => t.title).join(', ') || 'אין'}
- הרגלים להיום: ${habits.map((h: any) => h.emoji + ' ' + h.title).join(', ') || 'אין'}
- יעדים פעילים: ${activeGoals.map((g: any) => g.title).join(', ') || 'אין'}

${language === 'english' ? 'Respond in English.' : 'השב בעברית בלבד.'}
כתוב בשפה דבורה, קצרה ונעימה, כאילו אתה מדבר בקול. עד 4 משפטים קצרים.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (response.content[0] as Anthropic.TextBlock).text.trim();
    res.status(200).json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/briefing]', msg);
    res.status(500).json({ error: msg });
  }
}
