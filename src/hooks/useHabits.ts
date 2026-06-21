import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Habit, HabitLog, ReflectionEntry } from '../types';
import { loadHabits, saveHabits, loadHabitLogs, saveHabitLogs, loadReflections, saveReflections } from '../utils/storage';

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function streakFor(habitId: string, logs: HabitLog[], habit: Habit): number {
  const done = new Set(logs.filter(l => l.habitId === habitId).map(l => l.date));
  let streak = 0;
  const d = new Date();
  // don't penalise for today if not yet checked
  if (!done.has(todayStr())) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const s = d.toISOString().split('T')[0];
    const dow = d.getDay();
    const shouldCount = habit.frequency === 'daily' || habit.targetDays.includes(dow);
    if (shouldCount) {
      if (done.has(s)) streak++;
      else break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function useHabits() {
  const [habits, setHabits]       = useState<Habit[]>(() => loadHabits());
  const [logs, setLogs]           = useState<HabitLog[]>(() => loadHabitLogs());
  const [reflections, setReflections] = useState<ReflectionEntry[]>(() => loadReflections());

  const persist = useCallback((h: Habit[], l: HabitLog[]) => {
    setHabits(h); saveHabits(h);
    setLogs(l);   saveHabitLogs(l);
  }, []);

  const addHabit = useCallback((data: Omit<Habit, 'id' | 'createdAt'>) => {
    const h: Habit = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
    const next = [h, ...habits];
    persist(next, logs);
    return h;
  }, [habits, logs, persist]);

  const deleteHabit = useCallback((id: string) => {
    persist(habits.filter(h => h.id !== id), logs.filter(l => l.habitId !== id));
  }, [habits, logs, persist]);

  const updateHabit = useCallback((id: string, data: Partial<Omit<Habit, 'id' | 'createdAt'>>) => {
    const next = habits.map(h => h.id === id ? { ...h, ...data } : h);
    persist(next, logs);
  }, [habits, logs, persist]);

  const toggleToday = useCallback((habitId: string) => {
    const today = todayStr();
    const exists = logs.find(l => l.habitId === habitId && l.date === today);
    const nextLogs = exists
      ? logs.filter(l => !(l.habitId === habitId && l.date === today))
      : [...logs, { habitId, date: today }];
    persist(habits, nextLogs);
    return !exists; // true = just completed
  }, [habits, logs, persist]);

  const isDoneToday = useCallback((habitId: string) => {
    return logs.some(l => l.habitId === habitId && l.date === todayStr());
  }, [logs]);

  const streak = useCallback((habitId: string) => {
    const h = habits.find(x => x.id === habitId);
    if (!h) return 0;
    return streakFor(habitId, logs, h);
  }, [habits, logs]);

  const addReflection = useCallback((data: Omit<ReflectionEntry, 'id' | 'createdAt'>) => {
    const entry: ReflectionEntry = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
    const next = [entry, ...reflections.filter(r => r.date !== data.date)];
    setReflections(next);
    saveReflections(next);
  }, [reflections]);

  const todayReflection = reflections.find(r => r.date === todayStr()) ?? null;

  return { habits, logs, reflections, addHabit, updateHabit, deleteHabit, toggleToday, isDoneToday, streak, addReflection, todayReflection };
}
