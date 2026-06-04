import { useState, useCallback } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatAttachment, Task, CreateTaskInput, UpdateTaskInput, SetReminderInput } from '../types';
import { loadChat, saveChat } from '../utils/storage';

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT = `You are VoiceTask AI, an intelligent task management assistant that speaks both Hebrew and English.
You are an agent that can take actions in the user's task management app.

You help users manage their tasks by:
- Creating new tasks
- Updating existing tasks
- Deleting tasks
- Setting reminders
- Marking tasks as done
- Listing and filtering tasks

When a user asks you to do something with their tasks, use the appropriate tool to perform the action.
After performing an action, confirm what you did in a friendly way in both Hebrew and English.

For example:
- "יצרתי את המשימה בהצלחה! ✅ Task created successfully!"
- "המשימה עודכנה. Task has been updated."
- "הגדרתי תזכורת ל... Reminder set for..."

Be concise, helpful, and always confirm the actions you take.
When listing tasks, present them in a clear, organized way.
If you can't find a task the user is asking about, ask for clarification.

Current date: ${new Date().toLocaleDateString('he-IL')}`;

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
        recurrence: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'], description: 'How often to repeat' },
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
        status: { type: 'string', enum: ['todo', 'in-progress', 'done'], description: 'Filter by status' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Filter by priority' },
      },
    },
  },
];

interface ToolHandlers {
  createTask: (input: CreateTaskInput) => Task;
  updateTask: (input: UpdateTaskInput) => Task | null;
  deleteTask: (id: string) => boolean;
  markTaskDone: (id: string) => Task | null;
  setReminder: (taskId: string, reminder: { date: string; time: string; recurrence: string }) => Task | null;
  tasks: Task[];
}

export function useAI(handlers: ToolHandlers) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChat());
  const [isLoading, setIsLoading] = useState(false);

  const persistMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs);
    saveChat(msgs);
  }, []);

  const handleToolCall = useCallback((toolName: string, toolInput: Record<string, unknown>): string => {
    try {
      switch (toolName) {
        case 'create_task': {
          const input = toolInput as CreateTaskInput;
          const task = handlers.createTask(input);
          return JSON.stringify({ success: true, task_id: task.id, task });
        }
        case 'update_task': {
          const input = toolInput as UpdateTaskInput;
          const task = handlers.updateTask(input);
          if (!task) return JSON.stringify({ success: false, error: 'Task not found' });
          return JSON.stringify({ success: true, task });
        }
        case 'delete_task': {
          const { id } = toolInput as { id: string };
          const success = handlers.deleteTask(id);
          return JSON.stringify({ success });
        }
        case 'set_reminder': {
          const input = toolInput as SetReminderInput;
          const task = handlers.setReminder(input.task_id, {
            date: input.date,
            time: input.time,
            recurrence: input.recurrence || 'none',
          });
          if (!task) return JSON.stringify({ success: false, error: 'Task not found' });
          return JSON.stringify({ success: true, task });
        }
        case 'mark_task_done': {
          const { id } = toolInput as { id: string };
          const task = handlers.markTaskDone(id);
          if (!task) return JSON.stringify({ success: false, error: 'Task not found' });
          return JSON.stringify({ success: true, task });
        }
        case 'list_tasks': {
          const { status, priority } = toolInput as { status?: string; priority?: string };
          let filtered = handlers.tasks;
          if (status) filtered = filtered.filter(t => t.status === status);
          if (priority) filtered = filtered.filter(t => t.priority === priority);
          return JSON.stringify({ tasks: filtered, count: filtered.length });
        }
        default:
          return JSON.stringify({ error: 'Unknown tool' });
      }
    } catch (e) {
      return JSON.stringify({ error: String(e) });
    }
  }, [handlers]);

  const sendMessage = useCallback(async (
    content: string,
    attachments?: ChatAttachment[]
  ) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      attachments,
      timestamp: new Date().toISOString(),
    };

    const loadingMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };

    const newMessages = [...messages, userMessage, loadingMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Build Anthropic messages from chat history (exclude loading)
      const apiMessages: Anthropic.MessageParam[] = newMessages
        .filter(m => !m.isLoading)
        .map(m => {
          if (m.role === 'user' && m.attachments && m.attachments.length > 0) {
            const contentParts: Anthropic.ContentBlockParam[] = [];
            for (const att of m.attachments) {
              if (att.type.startsWith('image/')) {
                const base64 = att.dataUrl.split(',')[1];
                const mediaType = att.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
                contentParts.push({
                  type: 'image',
                  source: { type: 'base64', media_type: mediaType, data: base64 },
                });
              } else {
                contentParts.push({
                  type: 'text',
                  text: `[File attached: ${att.name} (${att.type})]`,
                });
              }
            }
            if (m.content) {
              contentParts.push({ type: 'text', text: m.content });
            }
            return { role: 'user' as const, content: contentParts };
          }
          return { role: m.role as 'user' | 'assistant', content: m.content };
        });

      // Agentic loop - handle tool calls
      let response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: apiMessages,
      });

      while (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of toolUseBlocks) {
          if (block.type === 'tool_use') {
            const result = handleToolCall(block.name, block.input as Record<string, unknown>);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: result,
            });
          }
        }

        // Continue conversation with tool results
        apiMessages.push({ role: 'assistant', content: response.content });
        apiMessages.push({ role: 'user', content: toolResults });

        response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: apiMessages,
        });
      }

      const assistantText = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as Anthropic.TextBlock).text)
        .join('\n');

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: assistantText,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...newMessages.filter(m => !m.isLoading), assistantMessage];
      persistMessages(finalMessages);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `שגיאה: ${errMsg}\nError: ${errMsg}`,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...newMessages.filter(m => !m.isLoading), errorMessage];
      persistMessages(finalMessages);
    } finally {
      setIsLoading(false);
    }
  }, [messages, persistMessages, handleToolCall]);

  const clearChat = useCallback(() => {
    persistMessages([]);
  }, [persistMessages]);

  return { messages, isLoading, sendMessage, clearChat };
}
