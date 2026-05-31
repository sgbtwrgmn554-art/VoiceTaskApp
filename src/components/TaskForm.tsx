import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, Reminder, Attachment } from '../types';
import { VoiceButton } from './VoiceButton';
import { ReminderForm } from './ReminderForm';
import { FileAttachment } from './FileAttachment';
import { parseReminderFromText } from '../utils/parseReminder';
import { v4 as uuidv4 } from 'uuid';

interface TaskFormProps {
  initialTask?: Task;
  onSubmit: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'נמוכה', color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'medium', label: 'בינונית', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { value: 'high', label: 'גבוהה', color: 'text-red-600 bg-red-50 border-red-200' },
];

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'לביצוע' },
  { value: 'in-progress', label: 'בתהליך' },
  { value: 'done', label: 'הושלם' },
];

export function TaskForm({ initialTask, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [status, setStatus] = useState<TaskStatus>(initialTask?.status || 'todo');
  const [priority, setPriority] = useState<TaskPriority>(initialTask?.priority || 'medium');
  const [reminder, setReminder] = useState<Reminder | undefined>(initialTask?.reminder);
  const [attachments, setAttachments] = useState<Attachment[]>(initialTask?.attachments || []);
  const [reminderDetected, setReminderDetected] = useState<string | null>(null);

  const handleDescriptionVoice = (transcript: string) => {
    setDescription(prev => prev ? `${prev} ${transcript}` : transcript);

    // Try to parse reminder from transcript
    const parsed = parseReminderFromText(transcript);
    if (parsed) {
      setReminderDetected(transcript);
    }
  };

  const handleTitleVoice = (transcript: string) => {
    setTitle(prev => prev ? `${prev} ${transcript}` : transcript);
  };

  const acceptReminder = () => {
    if (!reminderDetected) return;
    const parsed = parseReminderFromText(reminderDetected);
    if (parsed) {
      setReminder({
        date: parsed.date || new Date().toISOString().slice(0, 10),
        time: parsed.time || '09:00',
        recurrence: parsed.recurrence || 'none',
      });
    }
    setReminderDetected(null);
  };

  const handleAddAttachment = (att: Attachment) => {
    setAttachments(prev => [...prev, att]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, description, status, priority, reminder, attachments });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">כותרת המשימה *</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="הזן כותרת..."
            required
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-gray-300"
          />
          <VoiceButton onTranscript={handleTitleVoice} size="md" />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">תיאור</label>
        <div className="relative">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="תאר את המשימה... ניתן לומר 'תזכיר לי ב-3 בצהריים כל יום' ונזהה תזכורת אוטומטית"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-gray-300 resize-none"
          />
          <div className="absolute bottom-2 left-2">
            <VoiceButton onTranscript={handleDescriptionVoice} size="sm" />
          </div>
        </div>
      </div>

      {/* Reminder detection alert */}
      {reminderDetected && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <div className="flex-1">
            <p className="font-medium text-amber-800">זיהינו תזכורת - האם להגדיר?</p>
            <p className="text-amber-600 text-xs mt-0.5">"{reminderDetected}"</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={acceptReminder}
              className="text-xs bg-amber-500 text-white px-3 py-1 rounded-full hover:bg-amber-600 transition-colors font-medium"
            >
              כן
            </button>
            <button
              type="button"
              onClick={() => setReminderDetected(null)}
              className="text-xs text-gray-500 px-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              לא
            </button>
          </div>
        </div>
      )}

      {/* Status and Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">סטטוס</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as TaskStatus)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
          >
            {statusOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">עדיפות</label>
          <div className="flex gap-1.5">
            {priorityOptions.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-all ${
                  priority === p.value ? p.color + ' shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reminder */}
      <ReminderForm value={reminder} onChange={setReminder} />

      {/* File Attachments */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">קבצים מצורפים</label>
        <FileAttachment
          attachments={attachments}
          onAdd={handleAddAttachment}
          onRemove={handleRemoveAttachment}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm shadow-indigo-200"
        >
          {initialTask ? 'עדכן משימה' : 'צור משימה'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
