import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatAttachment, Task, CreateTaskInput, UpdateTaskInput } from '../types';
import { loadChat, saveChat } from '../utils/storage';

interface ToolAction {
  name: string;
  input: Record<string, unknown>;
}

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

  const applyToolAction = useCallback((action: ToolAction) => {
    try {
      switch (action.name) {
        case 'create_task':
          handlers.createTask(action.input as unknown as CreateTaskInput);
          break;
        case 'update_task':
          handlers.updateTask(action.input as unknown as UpdateTaskInput);
          break;
        case 'delete_task':
          handlers.deleteTask((action.input as { id: string }).id);
          break;
        case 'set_reminder': {
          const inp = action.input as { task_id: string; date: string; time: string; recurrence?: string };
          handlers.setReminder(inp.task_id, {
            date: inp.date,
            time: inp.time,
            recurrence: inp.recurrence || 'none',
          });
          break;
        }
        case 'mark_task_done':
          handlers.markTaskDone((action.input as { id: string }).id);
          break;
      }
    } catch (e) {
      console.error('[useAI] applyToolAction failed:', action.name, e);
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
      // Build lightweight chat history for the server
      const apiMessages = newMessages
        .filter(m => !m.isLoading)
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          attachments: m.attachments,
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          tasks: handlers.tasks,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const { assistantText, toolActions } = await response.json() as {
        assistantText: string;
        toolActions: ToolAction[];
      };

      // Apply mutations to local state
      for (const action of toolActions) {
        applyToolAction(action);
      }

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
  }, [messages, persistMessages, applyToolAction, handlers.tasks]);

  const clearChat = useCallback(() => {
    persistMessages([]);
  }, [persistMessages]);

  return { messages, isLoading, sendMessage, clearChat };
}
