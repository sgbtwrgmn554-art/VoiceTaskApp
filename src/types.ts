export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  recurrence: RecurrenceType;
  lastNotified?: string; // ISO string
}

export interface Attachment {
  id: string;
  name: string;
  type: string;       // MIME type
  size: number;
  dataUrl: string;    // base64 data URL
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  reminder?: Reminder;
  attachments: Attachment[];
  createdAt: string;  // ISO string
  updatedAt: string;  // ISO string
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

// Tool definitions for AI
export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  reminder?: Reminder;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  reminder?: Reminder;
}

export interface SetReminderInput {
  task_id: string;
  date: string;
  time: string;
  recurrence?: RecurrenceType;
}

export type ToolName =
  | 'create_task'
  | 'update_task'
  | 'delete_task'
  | 'set_reminder'
  | 'mark_task_done'
  | 'list_tasks';

export interface Contact {
  id: string;
  name: string;
  phone: string;
}

export type WhatsAppMessageStatus = 'pending' | 'sent' | 'cancelled';

export interface WhatsAppScheduledMessage {
  id: string;
  contactId: string;
  contactName: string;
  phone: string;
  message: string;
  scheduledDate: string;
  scheduledTime: string;
  status: WhatsAppMessageStatus;
  createdAt: string;
  sentAt?: string;
}
