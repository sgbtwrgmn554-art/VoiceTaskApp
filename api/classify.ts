import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CLASSIFY_PROMPT = (text: string, today: string) => `You are a smart task classifier for a Hebrew-first personal productivity app.
Analyze the following input and return ONLY valid JSON, nothing else.

Input: "${text}"
Today's date: ${today}

Return this exact JSON (no markdown, no explanation):
{
  "type": "task" | "habit" | "goal" | "event",
  "title": "clean title in original language",
  "description": "one sentence elaboration",
  "priority": "low" | "medium" | "high",
  "domain": "career" | "health" | "relationships" | "finance" | "growth" | "family" | "social" | "hobbies" | null,
  "dueDate": "YYYY-MM-DD or null",
  "dueTime": "HH:MM or null",
  "recurrence": "daily" | "weekly" | "monthly" | "none"
}

Classification rules:
- task: single one-time action to complete (call someone, buy something, send email)
- habit: recurring behavior to build or track (run every morning, meditate daily, read 20 pages)
- goal: long-term outcome taking weeks or months (lose 10kg, learn guitar, save $5000, launch a business)
- event: specific time-bound meeting or appointment (meeting with Dan, doctor appointment)

Date extraction rules (today is ${today}):
- "מחר" / "tomorrow" → tomorrow's date
- "השבוע" / "this week" → next Sunday
- "בשבוע הבא" → next week Sunday
- Time: "ב-10" or "10:00" or "at 3pm" → extract HH:MM
- No date mentioned → null

Priority rules:
- high: "דחוף", "urgent", "ASAP", "חשוב מאוד", deadline today/tomorrow
- low: "אולי", "someday", "כשיהיה זמן"
- medium: everything else`;

function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c: Buffer) => { raw += c.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Invalid JSON')); }
    });
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
    const { text } = body as { text: string };
    if (!text?.trim()) { res.status(400).json({ error: 'text required' }); return; }

    const today = new Date().toISOString().split('T')[0];
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: CLASSIFY_PROMPT(text.trim(), today) }],
    });

    const raw = (response.content[0] as Anthropic.TextBlock).text.trim();
    // Strip any accidental markdown fences
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const result = JSON.parse(json);

    res.status(200).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/classify]', msg);
    res.status(500).json({ error: msg });
  }
}
