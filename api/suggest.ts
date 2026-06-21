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
    const { goals = [], tasks = [], habits = [], language = 'hebrew' } = body;
    const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

    const prompt = `אתה עוזר אישי לפיתוח אישי.
היום: ${today}

היעדים הפעילים של המשתמש:
${goals.filter((g: any) => g.status === 'active').map((g: any) => `- ${g.title}`).join('\n') || 'אין יעדים עדיין'}

המשימות הפתוחות:
${tasks.filter((t: any) => t.status !== 'done').slice(0, 5).map((t: any) => `- ${t.title}`).join('\n') || 'אין משימות'}

ההרגלים הפעילים:
${habits.map((h: any) => `- ${h.emoji} ${h.title}`).join('\n') || 'אין הרגלים'}

תן 3 הצעות ספציפיות ומעשיות ליום הזה שיקדמו את המשתמש לעבר היעדים שלו.
כל הצעה — משפט אחד קצר ופעיל.
${language !== 'english' ? 'השב בעברית בלבד.' : 'Respond in English only.'}

החזר JSON בלבד:
{ "suggestions": ["...", "...", "..."] }`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (response.content[0] as Anthropic.TextBlock).text.trim();
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const result = JSON.parse(json);
    res.status(200).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/suggest]', msg);
    res.status(500).json({ error: msg });
  }
}
