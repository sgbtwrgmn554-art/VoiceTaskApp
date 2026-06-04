export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskCategory = 'כללי' | 'אישי' | 'עבודה' | 'משפחה';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'every3months' | 'halfyear' | 'yearly';
export type AppTab = 'home' | 'chat' | 'calendar' | 'stats' | 'profile';
export type ThemeColor = 'orange' | 'green' | 'purple' | 'blue';

export interface Reminder {
  date: string;
  time: string;
  recurrence: RecurrenceType;
  lastNotified?: string;
  whatsapp?: boolean;
  whatsappPhone?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  reminder?: Reminder;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = 'user' | 'assistant';

export interface ChatAttachment {
  name: string;
  type: string;
  dataUrl: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: ChatAttachment[];
  timestamp: string;
  isLoading?: boolean;
}

export interface ParsedReminder {
  date?: string;
  time?: string;
  recurrence?: RecurrenceType;
  raw: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  status?: TaskStatus;
  reminder?: Reminder;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  reminder?: Reminder;
}

export type ToolName =
  | 'create_task'
  | 'update_task'
  | 'delete_task'
  | 'set_reminder'
  | 'mark_task_done'
  | 'list_tasks';
