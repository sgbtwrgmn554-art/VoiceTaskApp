import React, { useState, useCallback } from 'react';
import { Task, TaskStatus, Reminder } from './types';
import { useTasks } from './hooks/useTasks';
import { useAI } from './hooks/useAI';
import { useReminders } from './hooks/useReminders';
import { TaskList } from './components/TaskList';
import { ChatPanel } from './components/ChatPanel';

export default function App() {
  const [chatOpen, setChatOpen] = useState(false);

  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    markTaskDone,
    setReminder,
  } = useTasks();

  // Handle reminder notifications updating lastNotified
  const handleReminderFired = useCallback((taskId: string, lastNotified: string) => {
    updateTask({ id: taskId, reminder: { ...tasks.find(t => t.id === taskId)!.reminder!, lastNotified } });
  }, [tasks, updateTask]);

  useReminders({ tasks, onUpdateTask: handleReminderFired });

  const aiHandlers = {
    createTask,
    updateTask: (input: Parameters<typeof updateTask>[0]) => updateTask(input),
    deleteTask,
    markTaskDone,
    setReminder: (taskId: string, reminder: { date: string; time: string; recurrence: string }) =>
      setReminder(taskId, { ...reminder, recurrence: reminder.recurrence as Reminder['recurrence'] }),
    tasks,
  };

  const { messages, isLoading, sendMessage, clearChat } = useAI(aiHandlers);

  const handleCreateTask = (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    createTask(data);
  };

  const handleUpdateTask = (id: string, data: Partial<Task>) => {
    updateTask({ id, ...data });
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Main task area */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${chatOpen ? 'mr-0' : ''}`}>
        <TaskList
          tasks={tasks}
          onCreateTask={handleCreateTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={deleteTask}
        />
      </div>

      {/* Chat toggle button (mobile / collapsed) */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 left-6 z-40 w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl shadow-xl shadow-indigo-200 hover:scale-105 transition-transform flex items-center justify-center"
          title="פתח עוזר AI"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          {messages.filter(m => m.role === 'assistant').length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
              {messages.filter(m => m.role === 'assistant').length}
            </span>
          )}
        </button>
      )}

      {/* Chat panel - slides in from left (RTL: left side) */}
      <div className={`${
        chatOpen ? 'w-[360px] min-w-[360px]' : 'w-0 min-w-0'
      } transition-all duration-300 overflow-hidden border-r border-gray-200 flex flex-col bg-white shadow-xl`}>
        {chatOpen && (
          <>
            {/* Close button */}
            <button
              onClick={() => setChatOpen(false)}
              className="absolute left-[360px] top-4 z-50 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              style={{ transform: 'translateX(50%)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <ChatPanel
              messages={messages}
              isLoading={isLoading}
              onSendMessage={sendMessage}
              onClearChat={clearChat}
            />
          </>
        )}
      </div>
    </div>
  );
}
