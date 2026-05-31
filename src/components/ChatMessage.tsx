import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (message.isLoading) {
    return (
      <div className="flex items-end gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
          </svg>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5 h-5">
            <span className="w-2 h-2 bg-indigo-400 rounded-full dot-1" />
            <span className="w-2 h-2 bg-indigo-400 rounded-full dot-2" />
            <span className="w-2 h-2 bg-indigo-400 rounded-full dot-3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
          </svg>
        </div>
      )}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}

      <div className={`max-w-[80%] space-y-2 ${isUser ? 'items-end flex flex-col' : ''}`}>
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((att, i) => (
              att.type.startsWith('image/') ? (
                <img key={i} src={att.dataUrl} alt={att.name}
                  className="max-w-[200px] max-h-[150px] object-cover rounded-xl border border-gray-200 shadow-sm" />
              ) : (
                <div key={i} className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 text-xs text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {att.name}
                </div>
              )
            ))}
          </div>
        )}

        {/* Message bubble */}
        {message.content && (
          <div className={`px-4 py-3 rounded-2xl shadow-sm ${
            isUser
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
          }`}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {/* Timestamp */}
        <p className={`text-xs text-gray-400 px-1 ${isUser ? 'text-left' : 'text-right'}`}>
          {new Date(message.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
