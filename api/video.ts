import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VIDEO_PROMPT = (url: string, userGoal: string, today: string) => `You are a helpful personal productivity assistant.
The user shared a video link and wants help extracting actionable insights.

Video URL: ${url}
User's goal / question: "${userGoal || 'מה יש בסרטון ואיך אני יכול ליישם את זה?'}"
Today: ${today}

Based on the URL (YouTube, TikTok, Instagram), infer what the video is likely about from the URL structure/title clues.
Then provide:
1. A guess of the video topic based on the URL
2. 3-5 specific, actionable tasks or steps the user can take to apply what they might learn from this type of content
3. A suggested goal if the content seems goal-oriented

Return ONLY valid JSON:
{
  "topic": "what the video is likely about",
  "tasks": [
    { "title": "...", "description": "...", "priority": "low|medium|high" }
  ],
  "suggestedGoal": "optional long-term goal if relevant or null",
  "platform": "youtube|tiktok|instagram|other"
}

Rules:
- Tasks should be in the same language as the user's goal (Hebrew if Hebrew)
- Be specific and actionable
- If this is a fitness/health video: suggest workout or diet tasks
- If this is a business/finance video: suggest financial or career tasks
- If this is a learning video: suggest study or practice tasks`;

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
    const { url, userGoal = '' } = body as { url: string; userGoal?: string };
    if (!url?.trim()) { res.status(400).json({ error: 'url required' }); return; }

    const today = new Date().toISOString().split('T')[0];
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: VIDEO_PROMPT(url.trim(), userGoal, today) }],
    });

    const raw = (response.content[0] as Anthropic.TextBlock).text.trim();
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const result = JSON.parse(json);
    res.status(200).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/video]', msg);
    res.status(500).json({ error: msg });
  }
}
