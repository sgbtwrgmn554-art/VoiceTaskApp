import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Goal, Milestone, LifeDomainId, CreateTaskInput } from '../types';
import { loadGoals, saveGoals } from '../utils/storage';

interface UseGoalsOptions {
  onCreateTask: (input: CreateTaskInput) => void;
}

export function useGoals({ onCreateTask }: UseGoalsOptions) {
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals());
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const persist = useCallback((next: Goal[]) => {
    setGoals(next);
    saveGoals(next);
  }, []);

  const createGoal = useCallback((
    title: string,
    domainId: LifeDomainId,
    description = '',
    deadline?: string,
  ): Goal => {
    const goal: Goal = {
      id: uuidv4(),
      domainId,
      title,
      description,
      deadline,
      milestones: [],
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    persist([...goals, goal]);
    return goal;
  }, [goals, persist]);

  const updateGoal = useCallback((id: string, patch: Partial<Omit<Goal, 'id' | 'createdAt'>>) => {
    persist(goals.map(g => g.id === id ? { ...g, ...patch } : g));
  }, [goals, persist]);

  const deleteGoal = useCallback((id: string) => {
    persist(goals.filter(g => g.id !== id));
  }, [goals, persist]);

  const toggleMilestone = useCallback((goalId: string, milestoneId: string) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      const milestones = g.milestones.map(m =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      );
      const allDone = milestones.every(m => m.completed);
      return { ...g, milestones, status: allDone ? 'completed' : g.status };
    }));
  }, [goals, persist]);

  const addMilestones = useCallback((goalId: string, items: { title: string; dueDate?: string }[]) => {
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      const newMilestones: Milestone[] = items.map(item => ({
        id: uuidv4(),
        title: item.title,
        dueDate: item.dueDate,
        completed: false,
      }));
      return { ...g, milestones: [...g.milestones, ...newMilestones] };
    }));
  }, [goals, persist]);

  const generateMilestones = useCallback(async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    setGeneratingFor(goalId);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { milestones } = await res.json() as { milestones: { title: string; dueDate?: string }[] };
      addMilestones(goalId, milestones);
    } finally {
      setGeneratingFor(null);
    }
  }, [goals, addMilestones]);

  const milestoneToTask = useCallback((goalId: string, milestoneId: string) => {
    const goal = goals.find(g => g.id === goalId);
    const milestone = goal?.milestones.find(m => m.id === milestoneId);
    if (!goal || !milestone) return;
    onCreateTask({
      title: milestone.title,
      description: `מ-יעד: ${goal.title}`,
      priority: 'medium',
      reminder: milestone.dueDate ? {
        date: milestone.dueDate,
        time: '09:00',
        recurrence: 'none',
      } : undefined,
    });
    // Mark as linked
    persist(goals.map(g => {
      if (g.id !== goalId) return g;
      return { ...g, milestones: g.milestones.map(m => m.id === milestoneId ? { ...m, taskId: 'linked' } : m) };
    }));
  }, [goals, persist, onCreateTask]);

  return {
    goals,
    generatingFor,
    createGoal,
    updateGoal,
    deleteGoal,
    toggleMilestone,
    addMilestones,
    generateMilestones,
    milestoneToTask,
  };
}
