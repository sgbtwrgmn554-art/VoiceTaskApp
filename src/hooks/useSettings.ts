import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppSettings, LifeDomain, VoiceShortcut } from '../types';
import { loadSettings, saveSettings } from '../utils/storage';

export const DEFAULT_DOMAINS: LifeDomain[] = [
  { id: 'career',        label: 'קריירה',   emoji: '💼', color: '#3b82f6' },
  { id: 'health',        label: 'בריאות',   emoji: '💪', color: '#22c55e' },
  { id: 'relationships', label: 'זוגיות',   emoji: '❤️', color: '#ec4899' },
  { id: 'finance',       label: 'כספים',    emoji: '💰', color: '#f59e0b' },
  { id: 'growth',        label: 'צמיחה',    emoji: '🌱', color: '#a855f7' },
  { id: 'family',        label: 'משפחה',    emoji: '👨‍👩‍👧', color: '#f97316' },
  { id: 'social',        label: 'חברתי',    emoji: '👥', color: '#06b6d4' },
  { id: 'hobbies',       label: 'תחביבים',  emoji: '🎨', color: '#84cc16' },
];

export const DEFAULT_SHORTCUTS: VoiceShortcut[] = [
  { id: 'sc-list',   trigger: 'רשימה',      description: 'קרא משימות פתוחות', prompt: 'קרא לי את כל המשימות הפתוחות שלי לפי עדיפות' },
  { id: 'sc-today',  trigger: 'מה יש היום', description: 'סיכום יום',          prompt: 'מה יש לי לעשות היום? תסכם משימות והרגלים שצריך לעשות' },
  { id: 'sc-focus',  trigger: 'ריכוז',      description: 'התחל טיימר ריכוז',   prompt: 'התחל לי טיימר ריכוז של 25 דקות' },
  { id: 'sc-habits', trigger: 'הרגלים',     description: 'מצב הרגלים היום',    prompt: 'אילו הרגלים ביצעתי היום ואילו עוד לא ביצעתי?' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  customCategories: ['כללי', 'אישי', 'עבודה', 'משפחה'],
  defaultCategory: 'כללי',
  defaultPriority: 'medium',
  defaultSort: 'createdAt',
  showCompleted: true,
  defaultReminderTime: '09:00',
  whatsappPhone: '',
  customDomains: DEFAULT_DOMAINS,
  aiLanguage: 'hebrew',
  aiStyle: 'detailed',
  autoClassify: true,
  chatHistoryLimit: 100,
  jarvisMode: 'coach',
  appearanceLevel: 'balanced',
  theme: 'green',
  morningCheckInEnabled: false,
  morningCheckInTime: '08:00',
  voiceShortcuts: DEFAULT_SHORTCUTS,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = loadSettings();
    if (!saved) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...saved };
  });

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // ── Category management ───────────────────────────────────────────────────

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSettings(prev => {
      if (prev.customCategories.includes(trimmed)) return prev;
      const next = { ...prev, customCategories: [...prev.customCategories, trimmed] };
      saveSettings(next);
      return next;
    });
  }, []);

  const removeCategory = useCallback((name: string) => {
    setSettings(prev => {
      const next = {
        ...prev,
        customCategories: prev.customCategories.filter(c => c !== name),
        defaultCategory: prev.defaultCategory === name
          ? (prev.customCategories.find(c => c !== name) || 'כללי')
          : prev.defaultCategory,
      };
      saveSettings(next);
      return next;
    });
  }, []);

  const renameCategory = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSettings(prev => {
      const next = {
        ...prev,
        customCategories: prev.customCategories.map(c => c === oldName ? trimmed : c),
        defaultCategory: prev.defaultCategory === oldName ? trimmed : prev.defaultCategory,
      };
      saveSettings(next);
      return next;
    });
  }, []);

  // ── Domain management ─────────────────────────────────────────────────────

  const addDomain = useCallback((domain: Omit<LifeDomain, 'id'>) => {
    setSettings(prev => {
      const next = {
        ...prev,
        customDomains: [...prev.customDomains, { ...domain, id: uuidv4() }],
      };
      saveSettings(next);
      return next;
    });
  }, []);

  const updateDomain = useCallback((id: string, patch: Partial<Omit<LifeDomain, 'id'>>) => {
    setSettings(prev => {
      const next = {
        ...prev,
        customDomains: prev.customDomains.map(d => d.id === id ? { ...d, ...patch } : d),
      };
      saveSettings(next);
      return next;
    });
  }, []);

  const removeDomain = useCallback((id: string) => {
    setSettings(prev => {
      const next = { ...prev, customDomains: prev.customDomains.filter(d => d.id !== id) };
      saveSettings(next);
      return next;
    });
  }, []);

  // ── Shortcut management ───────────────────────────────────────────────────

  const addShortcut = useCallback((sc: Omit<VoiceShortcut, 'id'>) => {
    setSettings(prev => {
      const next = { ...prev, voiceShortcuts: [...prev.voiceShortcuts, { ...sc, id: uuidv4() }] };
      saveSettings(next);
      return next;
    });
  }, []);

  const removeShortcut = useCallback((id: string) => {
    setSettings(prev => {
      const next = { ...prev, voiceShortcuts: prev.voiceShortcuts.filter(s => s.id !== id) };
      saveSettings(next);
      return next;
    });
  }, []);

  const updateShortcut = useCallback((id: string, patch: Partial<Omit<VoiceShortcut, 'id'>>) => {
    setSettings(prev => {
      const next = { ...prev, voiceShortcuts: prev.voiceShortcuts.map(s => s.id === id ? { ...s, ...patch } : s) };
      saveSettings(next);
      return next;
    });
  }, []);

  return {
    settings,
    updateSettings,
    addCategory,
    removeCategory,
    renameCategory,
    addDomain,
    updateDomain,
    removeDomain,
    addShortcut,
    removeShortcut,
    updateShortcut,
  };
}
