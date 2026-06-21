import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Desire } from '../types';

const STORAGE_KEY = 'voicetask_desires';

function load(): Desire[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function save(d: Desire[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

export function useDesires() {
  const [desires, setDesires] = useState<Desire[]>(load);

  const addDesire = useCallback((text: string, emoji = '✨') => {
    setDesires(prev => {
      const next = [...prev, { id: uuidv4(), text, emoji, createdAt: new Date().toISOString() }];
      save(next);
      return next;
    });
  }, []);

  const deleteDesire = useCallback((id: string) => {
    setDesires(prev => {
      const next = prev.filter(d => d.id !== id);
      save(next);
      return next;
    });
  }, []);

  return { desires, addDesire, deleteDesire };
}
