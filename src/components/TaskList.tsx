import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';

interface TaskListProps {
  tasks: Task[];
  onCreateTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTask: (id: string, data: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

type FilterStatus = 'all' | TaskStatus;
type FilterPriority = 'all' | TaskPriority;

const statusFilters: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'הכל' },
  { value: 'todo', label: 'לביצוע' },
  { value: 'in-progress', label: 'בתהליך' },
  { value: 'done', label: 'הושלם' },
];

const priorityFilters: { value: FilterPriority; label: string }[] = [
  { value: 'all', label: 'כל עדיפות' },
  { value: 'high', label: 'גבוהה' },
  { value: 'medium', label: 'בינונית' },
  { value: 'low', label: 'נמוכה' },
];

export function TaskList({ tasks, onCreateTask, onUpdateTask, onDeleteTask }: TaskListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (searchQuery && !t.title.includes(searchQuery) && !t.description.includes(searchQuery)) return false;
    return true;
  });

  const handleCreate = (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    onCreateTask(data);
    setShowForm(false);
  };

  const handleUpdate = (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingTask) return;
    onUpdateTask(editingTask.id, data);
    setEditingTask(null);
  };

  const handleStatusChange = (id: string, status: TaskStatus) => {
    onUpdateTask(id, { status });
  };

  const counts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">המשימות שלי</h1>
            <p className="text-sm text-gray-400 mt-0.5">{tasks.length} משימות סה"כ</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-indigo-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            משימה חדשה
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="חפש משימות..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-gray-300"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-3">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === f.value
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
              <span className="mr-1 text-gray-400">
                ({f.value === 'all' ? counts.all : counts[f.value as TaskStatus] || 0})
              </span>
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <div className="flex gap-2">
          {priorityFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setPriorityFilter(f.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                priorityFilter === f.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium">אין משימות להצגה</p>
            <p className="text-gray-300 text-sm mt-1">
              {tasks.length === 0 ? 'צור את המשימה הראשונה שלך!' : 'שנה את הסינון לראות משימות'}
            </p>
          </div>
        ) : (
          filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={setEditingTask}
              onDelete={onDeleteTask}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>

      {/* Create/Edit modal */}
      {(showForm || editingTask) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingTask(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">
                {editingTask ? 'ערוך משימה' : 'משימה חדשה'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingTask(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <TaskForm
              initialTask={editingTask || undefined}
              onSubmit={editingTask ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditingTask(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
