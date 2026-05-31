import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  low: { label: 'נמוכה', color: 'text-green-600 bg-green-50', dot: 'bg-green-400' },
  medium: { label: 'בינונית', color: 'text-yellow-600 bg-yellow-50', dot: 'bg-yellow-400' },
  high: { label: 'גבוהה', color: 'text-red-600 bg-red-50', dot: 'bg-red-400' },
};

const statusConfig: Record<TaskStatus, { label: string; next: TaskStatus; nextLabel: string; color: string }> = {
  todo: { label: 'לביצוע', next: 'in-progress', nextLabel: 'התחל', color: 'text-gray-500 bg-gray-100' },
  'in-progress': { label: 'בתהליך', next: 'done', nextLabel: 'סיים', color: 'text-blue-600 bg-blue-50' },
  done: { label: 'הושלם', next: 'todo', nextLabel: 'פתח מחדש', color: 'text-green-600 bg-green-50' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}

function formatReminder(date: string, time: string, recurrence: string): string {
  const recurrenceLabels: Record<string, string> = {
    none: '',
    daily: ' • יומי',
    weekly: ' • שבועי',
    monthly: ' • חודשי',
  };
  return `${formatDate(date)} בשעה ${time}${recurrenceLabels[recurrence] || ''}`;
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];

  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
      task.status === 'done' ? 'opacity-75' : ''
    }`}>
      {/* Priority stripe */}
      <div className={`h-1 ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className={`font-semibold text-gray-800 leading-tight flex-1 ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
            {task.title}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="ערוך"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {showConfirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDelete(task.id)}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600"
                >
                  מחק
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="text-xs text-gray-500 px-2 py-1 rounded-md hover:bg-gray-100"
                >
                  ביטול
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="מחק"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">{task.description}</p>
        )}

        {/* Tags row */}
        <div className="flex items-center flex-wrap gap-2 mb-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
            {status.label}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${priority.color} flex items-center gap-1`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
            {priority.label}
          </span>
        </div>

        {/* Reminder */}
        {task.reminder && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-2.5 py-1.5 mb-3 w-fit">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {formatReminder(task.reminder.date, task.reminder.time, task.reminder.recurrence)}
          </div>
        )}

        {/* Attachments */}
        {task.attachments.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            {task.attachments.slice(0, 3).map(att => (
              att.type.startsWith('image/') ? (
                <img key={att.id} src={att.dataUrl} alt={att.name}
                  className="w-8 h-8 object-cover rounded-md border border-gray-200" />
              ) : (
                <div key={att.id} className="w-8 h-8 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )
            ))}
            {task.attachments.length > 3 && (
              <span className="text-xs text-gray-400">+{task.attachments.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{new Date(task.createdAt).toLocaleDateString('he-IL')}</span>
          {task.status !== 'done' && (
            <button
              onClick={() => onStatusChange(task.id, status.next)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {status.nextLabel} →
            </button>
          )}
          {task.status === 'done' && (
            <button
              onClick={() => onStatusChange(task.id, 'todo')}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              פתח מחדש
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
