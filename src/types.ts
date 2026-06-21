export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskCategory = string;
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'every3months' | 'halfyear' | 'yearly';
export type AppTab = 'home' | 'chat' | 'calendar' | 'goals' | 'profile' | 'habits';
export type ThemeColor = 'orange' | 'green' | 'purple' | 'blue' | 'pink' | 'teal' | 'red' | 'yellow';

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

// ── Life OS ──────────────────────────────────────────────────────────────────

export type LifeDomainId = string;

export interface LifeDomain {
  id: LifeDomainId;
  label: string;
  emoji: string;
  color: string;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  // Tasks
  customCategories: string[];
  defaultCategory: string;
  defaultPriority: TaskPriority;
  defaultSort: 'createdAt' | 'priority' | 'dueDate' | 'title';
  showCompleted: boolean;
  // Reminders
  defaultReminderTime: string;
  whatsappPhone: string;
  // Goals / domains
  customDomains: LifeDomain[];
  // AI
  aiLanguage: 'hebrew' | 'english' | 'auto';
  aiStyle: 'brief' | 'detailed';
  autoClassify: boolean;
  chatHistoryLimit: number;
  // Appearance
  theme: ThemeColor;
  // Morning check-in
  morningCheckInEnabled: boolean;
  morningCheckInTime: string;
}

export interface Milestone {
  id: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  taskId?: string;
}

export interface Goal {
  id: string;
  domainId: LifeDomainId;
  title: string;
  description: string;
  deadline?: string;
  milestones: Milestone[];
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
}

// ── Habits ───────────────────────────────────────────────────────────────────

export interface Habit {
  id: string;
  title: string;
  emoji: string;
  frequency: 'daily' | 'weekly';
  targetDays: number[]; // 0=Sun … 6=Sat (for weekly)
  color: string;
  createdAt: string;
}

export interface HabitLog {
  habitId: string;
  date: string; // YYYY-MM-DD
}

// ── Reflection ───────────────────────────────────────────────────────────────

export interface ReflectionEntry {
  id: string;
  date: string; // YYYY-MM-DD
  gratitude: string;
  learning: string;
  tomorrowFocus: string;
  mood: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
}

export interface ClassifyResult {
  type: 'task' | 'habit' | 'goal' | 'event';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  domain: LifeDomainId | null;
  dueDate: string | null;
  dueTime: string | null;
  recurrence: 'daily' | 'weekly' | 'monthly' | 'none';
}
