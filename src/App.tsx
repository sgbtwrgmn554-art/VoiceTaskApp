import React, { useState, useCallback } from 'react';
import { Task, TaskStatus, Reminder } from './types';
import { useTasks } from './hooks/useTasks';
import { useAI } from './hooks/useAI';
import { useReminders } from './hooks/useReminders';
import { useContacts } from './hooks/useContacts';
import { useWhatsAppScheduler } from './hooks/useWhatsAppScheduler';
import { TaskList } from './components/TaskList';
import { ChatPanel } from './components/ChatPanel';
import { WhatsAppPanel } from './components/WhatsAppPanel';
import { InstallPWA } from './components/InstallPWA';

type Tab = 'tasks' | 'whatsapp';

export default function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('tasks');

  const { tasks, createTask, updateTask, deleteTask, markTaskDone, setReminder } = useTasks();
  const { contacts, addContact, updateContact, deleteContact } = useContacts();
  const { messages: waMessages, scheduleMessage, cancelMessage, deleteMessage } = useWhatsAppScheduler();

  const handleReminderFired = useCallback(
    (taskId: string, lastNotified: string) => {
      updateTask({ id: taskId, reminder: { ...tasks.find(t => t.id === taskId)!.reminder!, lastNotified } });
    },
    [tasks, updateTask]
  );

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

  const pendingWa = waMessages.filter(m => m.status === 'pending').length;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir="rtl">
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab navigation */}
        <div className="bg-white border-b border-gray-100 px-4 pt-3 flex gap-1">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-colors ${
              activeTab === 'tasks'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            משימות
            {tasks.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-colors ${
              activeTab === 'whatsapp'
                ? 'border-green-600 text-green-600 bg-green-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
            {pendingWa > 0 && (
              <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">{pendingWa}</span>
            )}
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'tasks' ? (
            <TaskList
              tasks={tasks}
              onCreateTask={data => createTask(data)}
              onUpdateTask={(id, data) => updateTask({ id, ...data })}
              onDeleteTask={deleteTask}
            />
          ) : (
            <WhatsAppPanel
              contacts={contacts}
              messages={waMessages}
              onAddContact={addContact}
              onUpdateContact={updateContact}
              onDeleteContact={deleteContact}
              onSchedule={scheduleMessage}
              onCancel={cancelMessage}
              onDelete={deleteMessage}
            />
          )}
        </div>
      </div>

      {/* Chat toggle button */}
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

      {/* Chat panel */}
      <div className={`${
        chatOpen ? 'w-[360px] min-w-[360px]' : 'w-0 min-w-0'
      } transition-all duration-300 overflow-hidden border-r border-gray-200 flex flex-col bg-white shadow-xl`}>
        {chatOpen && (
          <>
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

      <InstallPWA />
    </div>
  );
}
