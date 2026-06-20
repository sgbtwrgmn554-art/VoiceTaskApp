import React, { useState } from 'react';
import { Goal, LifeDomain, LifeDomainId, Milestone } from '../types';

const DOMAINS: LifeDomain[] = [
  { id: 'career',        label: 'קריירה',   emoji: '💼', color: '#3b82f6' },
  { id: 'health',        label: 'בריאות',   emoji: '💪', color: '#22c55e' },
  { id: 'relationships', label: 'זוגיות',   emoji: '❤️', color: '#ec4899' },
  { id: 'finance',       label: 'כספים',    emoji: '💰', color: '#f59e0b' },
  { id: 'growth',        label: 'צמיחה',    emoji: '🌱', color: '#a855f7' },
  { id: 'family',        label: 'משפחה',    emoji: '👨‍👩‍👧', color: '#f97316' },
  { id: 'social',        label: 'חברתי',    emoji: '👥', color: '#06b6d4' },
  { id: 'hobbies',       label: 'תחביבים',  emoji: '🎨', color: '#84cc16' },
];

interface Props {
  goals: Goal[];
  generatingFor: string | null;
  onCreateGoal: (title: string, domainId: LifeDomainId, description: string, deadline?: string) => Goal;
  onToggleMilestone: (goalId: string, milestoneId: string) => void;
  onGenerateMilestones: (goalId: string) => void;
  onMilestoneToTask: (goalId: string, milestoneId: string) => void;
  onDeleteGoal: (id: string) => void;
  accentColor: string;
}

type View = { kind: 'domains' } | { kind: 'domain'; domainId: LifeDomainId } | { kind: 'goal'; goalId: string } | { kind: 'new'; domainId: LifeDomainId };

export default function GoalsScreen({ goals, generatingFor, onCreateGoal, onToggleMilestone, onGenerateMilestones, onMilestoneToTask, onDeleteGoal, accentColor }: Props) {
  const [view, setView] = useState<View>({ kind: 'domains' });
  const [newTitle, setNewTitle] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const goBack = () => {
    if (view.kind === 'new')    { setView({ kind: 'domain', domainId: view.domainId }); return; }
    if (view.kind === 'goal')   { const g = goals.find(x => x.id === view.goalId); setView(g ? { kind: 'domain', domainId: g.domainId } : { kind: 'domains' }); return; }
    if (view.kind === 'domain') { setView({ kind: 'domains' }); return; }
  };

  const handleCreateGoal = async () => {
    if (!newTitle.trim() || view.kind !== 'new') return;
    setSaving(true);
    const g = onCreateGoal(newTitle.trim(), view.domainId, '', newDeadline || undefined);
    setNewTitle('');
    setNewDeadline('');
    setView({ kind: 'goal', goalId: g.id });
    // Auto-generate milestones
    onGenerateMilestones(g.id);
    setSaving(false);
  };

  // ── DOMAINS VIEW ────────────────────────────────────────────────────────────
  if (view.kind === 'domains') {
    return (
      <div className="flex flex-col h-full" style={{ background: '#0a0a0a' }}>
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h1 className="text-lg font-bold tracking-wide">היעדים שלי</h1>
          <p className="text-xs text-gray-500 mt-0.5">בחר תחום חיים</p>
        </div>
        <div className="flex-1 scroll-y px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            {DOMAINS.map(domain => {
              const domainGoals = goals.filter(g => g.domainId === domain.id && g.status === 'active');
              const done = domainGoals.reduce((acc, g) => acc + g.milestones.filter(m => m.completed).length, 0);
              const total = domainGoals.reduce((acc, g) => acc + g.milestones.length, 0);
              return (
                <button
                  key={domain.id}
                  onClick={() => setView({ kind: 'domain', domainId: domain.id })}
                  className="rounded-2xl px-4 py-4 text-right transition-all active:scale-95 fade-up"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{domain.emoji}</span>
                    {domainGoals.length > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: domain.color + '20', color: domain.color }}>
                        {domainGoals.length}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white">{domain.label}</p>
                  {total > 0 && (
                    <div className="mt-2">
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(done / total * 100)}%`, background: domain.color }} />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">{done}/{total} צעדים</p>
                    </div>
                  )}
                  {domainGoals.length === 0 && (
                    <p className="text-[11px] text-gray-600 mt-1">הוסף יעד</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── DOMAIN GOALS VIEW ───────────────────────────────────────────────────────
  if (view.kind === 'domain') {
    const domain = DOMAINS.find(d => d.id === view.domainId)!;
    const domainGoals = goals.filter(g => g.domainId === view.domainId);
    return (
      <div className="flex flex-col h-full" style={{ background: '#0a0a0a' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={goBack} className="flex items-center gap-1.5 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="flex items-center gap-2">
            <span>{domain.emoji}</span>
            <h2 className="font-bold">{domain.label}</h2>
          </div>
          <button
            onClick={() => setView({ kind: 'new', domainId: view.domainId })}
            className="w-8 h-8 rounded-full flex items-center justify-center text-black font-bold text-lg transition-transform active:scale-90"
            style={{ background: accentColor }}>
            +
          </button>
        </div>

        <div className="flex-1 scroll-y px-5 py-4 space-y-3">
          {domainGoals.length === 0 && (
            <div className="text-center mt-16 fade-up">
              <div className="text-5xl mb-3">{domain.emoji}</div>
              <p className="text-gray-400 font-medium">אין יעדים עדיין</p>
              <button
                onClick={() => setView({ kind: 'new', domainId: view.domainId })}
                className="mt-4 px-5 py-2.5 rounded-2xl text-sm font-semibold text-black transition-transform active:scale-95"
                style={{ background: accentColor }}>
                + הוסף יעד ראשון
              </button>
            </div>
          )}
          {domainGoals.map((goal, idx) => {
            const done = goal.milestones.filter(m => m.completed).length;
            const total = goal.milestones.length;
            return (
              <button
                key={goal.id}
                onClick={() => setView({ kind: 'goal', goalId: goal.id })}
                className="w-full rounded-2xl px-4 py-4 text-right fade-up transition-all active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', animationDelay: `${idx * 0.04}s` }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: goal.status === 'completed' ? '#22c55e20' : 'rgba(255,255,255,0.07)', color: goal.status === 'completed' ? '#22c55e' : '#9ca3af' }}>
                    {goal.status === 'completed' ? '✓ הושלם' : 'פעיל'}
                  </span>
                  {goal.deadline && <p className="text-[11px] text-gray-500">{goal.deadline}</p>}
                </div>
                <p className="text-white font-semibold mt-2 mb-2">{goal.title}</p>
                {total > 0 && (
                  <>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(done / total * 100)}%`, background: domain.color }} />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">{done} מתוך {total} צעדים</p>
                  </>
                )}
                {total === 0 && generatingFor === goal.id && (
                  <p className="text-[11px] text-gray-500 mt-1">✨ מייצר צעדים...</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── NEW GOAL FORM ───────────────────────────────────────────────────────────
  if (view.kind === 'new') {
    const domain = DOMAINS.find(d => d.id === view.domainId)!;
    return (
      <div className="flex flex-col h-full" style={{ background: '#0a0a0a' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={goBack} className="flex items-center gap-1.5 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 className="font-bold">יעד חדש — {domain.emoji} {domain.label}</h2>
          <div className="w-8" />
        </div>

        <div className="flex-1 scroll-y px-5 py-5 space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-2">מה אתה רוצה להשיג?</p>
            <textarea
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder={`לדוגמה: לרדת 10 ק"ג, ללמוד גיטרה, לחסוך 50,000 ₪`}
              rows={3}
              autoFocus
              className="w-full text-white text-sm resize-none outline-none rounded-2xl px-4 py-3.5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
            />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">🗓 יעד סיום (אופציונלי)</p>
            <input
              type="date"
              value={newDeadline}
              onChange={e => setNewDeadline(e.target.value)}
              className="w-full text-white rounded-2xl px-4 py-3.5 outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', colorScheme: 'dark' }}
            />
          </div>

          <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
               style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-lg">✨</span>
            <p className="text-xs text-gray-400 leading-relaxed">
              לאחר השמירה, AI יפרק את היעד שלך ל-4–6 צעדים ספציפיים ופרקטיים
            </p>
          </div>

          <button
            onClick={handleCreateGoal}
            disabled={!newTitle.trim() || saving}
            className="w-full py-4 rounded-2xl font-bold text-black text-base transition-transform active:scale-95 disabled:opacity-50"
            style={{ background: accentColor, boxShadow: `0 6px 20px ${accentColor}55` }}>
            🎯 צור יעד + פרק עם AI
          </button>
        </div>
      </div>
    );
  }

  // ── GOAL DETAIL VIEW ────────────────────────────────────────────────────────
  if (view.kind === 'goal') {
    const goal = goals.find(g => g.id === view.goalId);
    if (!goal) { setView({ kind: 'domains' }); return null; }
    const domain = DOMAINS.find(d => d.id === goal.domainId)!;
    const done = goal.milestones.filter(m => m.completed).length;
    const total = goal.milestones.length;
    const isGenerating = generatingFor === goal.id;

    return (
      <div className="flex flex-col h-full" style={{ background: '#0a0a0a' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={goBack} className="flex items-center gap-1.5 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="flex items-center gap-2">
            <span>{domain.emoji}</span>
            <span className="font-bold text-sm truncate max-w-[160px]">{goal.title}</span>
          </div>
          <button
            onClick={() => { if (window.confirm('למחוק את היעד?')) { onDeleteGoal(goal.id); goBack(); } }}
            className="text-gray-600 hover:text-red-400 transition-colors text-sm"
          >
            🗑
          </button>
        </div>

        <div className="flex-1 scroll-y px-5 py-4 space-y-4">
          {/* Progress bar */}
          {total > 0 && (
            <div className="rounded-2xl px-4 py-4 fade-up"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">התקדמות</span>
                <span className="text-sm font-bold" style={{ color: accentColor }}>{Math.round(done / total * 100)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                     style={{ width: `${Math.round(done / total * 100)}%`, background: accentColor }} />
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">{done} מתוך {total} צעדים הושלמו</p>
            </div>
          )}

          {/* Deadline */}
          {goal.deadline && (
            <div className="flex items-center gap-2 px-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span className="text-xs text-gray-400">יעד סיום: {goal.deadline}</span>
            </div>
          )}

          {/* Milestones */}
          <div>
            <p className="text-xs text-gray-500 mb-3 px-1">צעדים</p>

            {isGenerating && (
              <div className="flex items-center gap-3 py-6 justify-center fade-up">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <p className="text-sm text-gray-400">✨ AI מייצר צעדים...</p>
              </div>
            )}

            {!isGenerating && goal.milestones.length === 0 && (
              <div className="text-center py-6 fade-up">
                <p className="text-sm text-gray-500 mb-4">אין צעדים עדיין</p>
                <button
                  onClick={() => onGenerateMilestones(goal.id)}
                  className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-black transition-transform active:scale-95"
                  style={{ background: accentColor }}>
                  ✨ פרק עם AI
                </button>
              </div>
            )}

            <div className="space-y-2">
              {goal.milestones.map((m: Milestone, idx: number) => (
                <div key={m.id}
                     className="flex items-center gap-3 rounded-2xl px-4 py-3.5 fade-up"
                     style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', animationDelay: `${idx * 0.04}s` }}>
                  {/* Checkbox */}
                  <button
                    onClick={() => onToggleMilestone(goal.id, m.id)}
                    className="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all active:scale-90"
                    style={m.completed
                      ? { borderColor: accentColor, background: accentColor }
                      : { borderColor: 'rgba(255,255,255,0.2)', background: 'transparent' }}>
                    {m.completed && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${m.completed ? 'line-through text-gray-600' : 'text-white'}`}>{m.title}</p>
                    {m.dueDate && <p className="text-[11px] text-gray-500 mt-0.5">{m.dueDate}</p>}
                  </div>

                  {/* Add to tasks */}
                  {!m.taskId && !m.completed && (
                    <button
                      onClick={() => onMilestoneToTask(goal.id, m.id)}
                      className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full transition-colors"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}
                      title="הוסף כמשימה">
                      + משימה
                    </button>
                  )}
                  {m.taskId && (
                    <span className="text-[10px] text-gray-600 flex-shrink-0">📋</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {goal.milestones.length > 0 && !isGenerating && (
            <button
              onClick={() => onGenerateMilestones(goal.id)}
              className="w-full py-3 rounded-2xl text-sm font-medium text-gray-400 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              ✨ ייצר צעדים נוספים
            </button>
          )}
          <div className="h-4" />
        </div>
      </div>
    );
  }

  return null;
}
