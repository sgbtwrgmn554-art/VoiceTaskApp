import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GOALS_PROMPT = (goal: any, today: string) => `You are a personal life coach assistant.
Break down the following long-term goal into 4-6 specific, actionable milestones.
Return ONLY valid JSON, nothing else.

Goal: "${goal.title}"
Description: "${goal.description || ''}"
Domain: ${goal.domainId}
Deadline: ${goal.deadline || 'not specified'}
Today: ${today}

Return this exact JSON:
{
  "milestones": [
    { "title": "...", "dueDate": "YYYY-MM-DD or null" },
    ...
  ]
}

Rules:
- 4-6 milestones, ordered chronologically
- Each milestone is a concrete, measurable checkpoint
- If deadline exists, spread milestones evenly between today and deadline
- Titles should be in the same language as the goal (Hebrew if Hebrew, English if English)
- Be specific and actionable ("הירשם לחדר כושר", not "התחל להתאמן")
- Each milestone represents ~20% progress toward the goal`;

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
    const { goal } = body;
    if (!goal?.title) { res.status(400).json({ error: 'goal required' }); return; }

    const today = new Date().toISOString().split('T')[0];
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: GOALS_PROMPT(goal, today) }],
    });

    const raw = (response.content[0] as Anthropic.TextBlock).text.trim();
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const result = JSON.parse(json);

    res.status(200).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/goals]', msg);
    res.status(500).json({ error: msg });
  }
}
