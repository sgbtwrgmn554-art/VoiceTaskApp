import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStatus, TaskPriority, TaskCategory, Reminder, CreateTaskInput, UpdateTaskInput, RecurrenceType } from '../types';
import { loadTasks, saveTasks } from '../utils/storage';

function getNextRecurrenceDate(base: string | undefined, recurrence: RecurrenceType): string {
  const d = base ? new Date(base) : new Date();
  const add: Record<RecurrenceType, number> = {
    none: 0, daily: 1, weekly: 7, monthly: 30,
    every3months: 90, halfyear: 182, yearly: 365,
  };
  d.setDate(d.getDate() + (add[recurrence] ?? 1));
  return d.toISOString().split('T')[0];
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());

  const persist = useCallback((updated: Task[]) => {
    setTasks(updated);
    saveTasks(updated);
  }, []);

  const createTask = useCallback((input: CreateTaskInput): Task => {
    const now = new Date().toISOString();
    const task: Task = {
      id: uuidv4(),
      title: input.title,
      description: input.description || '',
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      category: input.category || 'כללי',
      recurrence: input.recurrence,
      reminder: input.reminder,
      attachments: [],
      url: input.url,
      createdAt: now,
      updatedAt: now,
    };
    persist([...tasks, task]);
    return task;
  }, [tasks, persist]);

  const updateTask = useCallback((input: UpdateTaskInput): Task | null => {
    const idx = tasks.findIndex(t => t.id === input.id);
    if (idx === -1) return null;
    const updated = {
      ...tasks[idx],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    const next = [...tasks];
    next[idx] = updated;
    persist(next);
    return updated;
  }, [tasks, persist]);

  const deleteTask = useCallback((id: string): boolean => {
    const next = tasks.filter(t => t.id !== id);
    if (next.length === tasks.length) return false;
    persist(next);
    return true;
  }, [tasks, persist]);

  const markTaskDone = useCallback((id: string): Task | null => {
    const task = tasks.find(t => t.id === id);
    if (!task) return null;
    const now = new Date().toISOString();
    const doneTask: Task = { ...task, status: 'done', updatedAt: now };
    let next = tasks.map(t => t.id === id ? doneTask : t);
    if (task.recurrence && task.recurrence !== 'none') {
      const nextDate = getNextRecurrenceDate(task.reminder?.date, task.recurrence);
      const newTask: Task = {
        ...task,
        id: uuidv4(),
        status: 'todo',
        createdAt: now,
        updatedAt: now,
        reminder: task.reminder ? { ...task.reminder, date: nextDate } : undefined,
      };
      next = [...next, newTask];
    }
    persist(next);
    return doneTask;
  }, [tasks, persist]);

  const setReminder = useCallback((taskId: string, reminder: Reminder): Task | null => {
    return updateTask({ id: taskId, reminder });
  }, [updateTask]);

  const addAttachment = useCallback((taskId: string, attachment: { id: string; name: string; type: string; size: number; dataUrl: string }) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    const updated = {
      ...task,
      attachments: [...task.attachments, attachment],
      updatedAt: new Date().toISOString(),
    };
    const next = tasks.map(t => t.id === taskId ? updated : t);
    persist(next);
    return updated;
  }, [tasks, persist]);

  const removeAttachment = useCallback((taskId: string, attachmentId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    const updated = {
      ...task,
      attachments: task.attachments.filter(a => a.id !== attachmentId),
      updatedAt: new Date().toISOString(),
    };
    const next = tasks.map(t => t.id === taskId ? updated : t);
    persist(next);
    return updated;
  }, [tasks, persist]);

  const getTasksByStatus = useCallback((status: TaskStatus) => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  const getTasksByPriority = useCallback((priority: TaskPriority) => {
    return tasks.filter(t => t.priority === priority);
  }, [tasks]);

  return {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    markTaskDone,
    setReminder,
    addAttachment,
    removeAttachment,
    getTasksByStatus,
    getTasksByPriority,
  };
}
