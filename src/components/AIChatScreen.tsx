import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
  onClear: () => void;
  accentColor: string;
}

const QUICK_CHIPS = ['מה יש לי היום?', 'תזכיר לי את הישיבות', 'מה כבר דחיתי?', 'מה יש לי השבוע?'];

export default function AIChatScreen({ messages, isLoading, onSend, onClear, accentColor }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    onSend(text);
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-800">
        <button onClick={onClear} className="text-red-400 text-sm">נקה</button>
        <h2 className="font-bold">שאל את ה-AI 🤖</h2>
        <div className="w-10" />
      </div>

      {/* Messages */}
      <div className="flex-1 scroll-y px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-600 mt-20 fade-up">שאל אותי על המשימות שלך</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-up`}>
            {msg.isLoading ? (
              <div className="bg-gray-800 rounded-2xl px-4 py-3 flex gap-1 items-center">
                <div className="w-2 h-2 rounded-full bg-gray-400 dot-1" />
                <div className="w-2 h-2 rounded-full bg-gray-400 dot-2" />
                <div className="w-2 h-2 rounded-full bg-gray-400 dot-3" />
              </div>
            ) : (
              <div
                className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                style={msg.role === 'user'
                  ? { background: accentColor, color: '#000' }
                  : { background: '#1c1c1e', color: '#fff' }}
              >
                {msg.content}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {QUICK_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => onSend(chip)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-3 pt-1 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="שאל שאלה..."
          className="flex-1 bg-gray-900 text-white rounded-full px-4 py-2.5 text-sm outline-none border border-gray-700 focus:border-gray-500"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40"
          style={{ background: accentColor }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
