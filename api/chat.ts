import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(aiLanguage: string, aiStyle: string): string {
  const langInstruction =
    aiLanguage === 'hebrew'  ? 'Always respond in Hebrew (עברית) only.' :
    aiLanguage === 'english' ? 'Always respond in English only.' :
    'Respond in the same language the user writes in (Hebrew if they write Hebrew, English if they write English).';

  const styleInstruction =
    aiStyle === 'brief'
      ? 'Keep responses short and to the point — 1-2 sentences maximum unless a list is needed.'
      : 'Give complete, helpful responses with context and details.';

  return `You are VoiceTask AI — an intelligent Personal Life OS assistant.
${langInstruction}
${styleInstruction}

You can take actions in the user's task management app:
- Create, update, delete tasks
- Set reminders
- Mark tasks as done
- List and filter tasks

After performing an action, confirm what you did in a friendly way.
Be helpful. Current date: ${new Date().toLocaleDateString('he-IL')}`;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_task',
    description: 'Create a new task in the task management system',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'The task title' },
        description: { type: 'string', description: 'Detailed description of the task' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Task priority' },
        status: { type: 'string', enum: ['todo', 'in-progress', 'done'], description: 'Initial task status' },
        reminder: {
          type: 'object',
          description: 'Optional reminder settings',
          properties: {
            date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
            time: { type: 'string', description: 'Time in HH:MM format' },
            recurrence: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'] },
          },
          required: ['date', 'time', 'recurrence'],
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task by ID',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The task ID to update' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        status: { type: 'string', enum: ['todo', 'in-progress', 'done'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task by ID',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The task ID to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'set_reminder',
    description: 'Set or update a reminder on a task',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'The task ID' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        time: { type: 'string', description: 'Time in HH:MM format' },
        recurrence: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'] },
      },
      required: ['task_id', 'date', 'time'],
    },
  },
  {
    name: 'mark_task_done',
    description: 'Mark a task as completed/done',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The task ID to mark as done' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List all tasks, optionally filtered by status or priority',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['todo', 'in-progress', 'done'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
    },
  },
];

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  reminder?: unknown;
  attachments: unknown[];
  createdAt: string;
  updatedAt: string;
}

interface ChatApiMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: { name: string; type: string; dataUrl: string }[];
}

interface ToolAction {
  name: string;
  input: Record<string, unknown>;
}

function simulateTool(name: string, input: Record<string, unknown>, tasks: Task[]): string {
  switch (name) {
    case 'list_tasks': {
      const { status, priority } = input as { status?: string; priority?: string };
      let filtered = tasks;
      if (status) filtered = filtered.filter(t => t.status === status);
      if (priority) filtered = filtered.filter(t => t.priority === priority);
      return JSON.stringify({ tasks: filtered, count: filtered.length });
    }
    case 'create_task':
      return JSON.stringify({ success: true, task_id: 'pending', message: 'Task will be created on client' });
    case 'update_task':
      return JSON.stringify({ success: true, message: 'Task will be updated on client' });
    case 'delete_task':
      return JSON.stringify({ success: true, message: 'Task will be deleted on client' });
    case 'set_reminder':
      return JSON.stringify({ success: true, message: 'Reminder will be set on client' });
    case 'mark_task_done':
      return JSON.stringify({ success: true, message: 'Task will be marked done on client' });
    default:
      return JSON.stringify({ error: 'Unknown tool' });
  }
}

function buildApiMessages(chatMessages: ChatApiMessage[]): Anthropic.MessageParam[] {
  return chatMessages.map(m => {
    if (m.role === 'user' && m.attachments && m.attachments.length > 0) {
      const parts: Anthropic.ContentBlockParam[] = [];
      for (const att of m.attachments) {
        if (att.type.startsWith('image/')) {
          const base64 = att.dataUrl.split(',')[1];
          parts.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: att.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64,
            },
          });
        } else {
          parts.push({ type: 'text', text: `[File: ${att.name}]` });
        }
      }
      if (m.content) parts.push({ type: 'text', text: m.content });
      return { role: 'user' as const, content: parts };
    }
    return { role: m.role, content: m.content };
  });
}

function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body ?? await readBody(req);
    const {
      messages, tasks,
      aiLanguage = 'hebrew',
      aiStyle = 'detailed',
    } = body as { messages: ChatApiMessage[]; tasks: Task[]; aiLanguage?: string; aiStyle?: string };

    const systemPrompt = buildSystemPrompt(aiLanguage, aiStyle);
    const apiMessages = buildApiMessages(messages);
    const toolActions: ToolAction[] = [];
    const mutationNames = new Set(['create_task', 'update_task', 'delete_task', 'set_reminder', 'mark_task_done']);

    let response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOLS,
      messages: apiMessages,
    });

    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        if (block.type !== 'tool_use') continue;
        const input = block.input as Record<string, unknown>;
        const result = simulateTool(block.name, input, tasks);

        if (mutationNames.has(block.name)) {
          toolActions.push({ name: block.name, input });
        }

        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
      }

      apiMessages.push({ role: 'assistant', content: response.content });
      apiMessages.push({ role: 'user', content: toolResults });

      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        tools: TOOLS,
        messages: apiMessages,
      });
    }

    const assistantText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text)
      .join('\n');

    res.status(200).json({ assistantText, toolActions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/chat]', msg);
    res.status(500).json({ error: msg });
  }
}
