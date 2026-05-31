import React from 'react';
import { useVoice } from '../hooks/useVoice';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  lang?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VoiceButton({ onTranscript, lang = 'he-IL', size = 'md', className = '' }: VoiceButtonProps) {
  const { isRecording, isSupported, toggle } = useVoice({
    onResult: onTranscript,
    lang,
  });

  if (!isSupported) return null;

  const sizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={isRecording ? 'עצור הקלטה' : 'התחל הקלטה קולית'}
      className={`relative flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
        isRecording
          ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400 shadow-lg shadow-red-200'
          : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600 focus:ring-indigo-400'
      } ${sizes[size]} ${className}`}
    >
      {isRecording && (
        <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-50" />
      )}
      {isRecording ? (
        <svg className={`${iconSizes[size]} relative z-10`} fill="currentColor" viewBox="0 0 20 20">
          <rect x="4" y="4" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg className={`${iconSizes[size]}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" />
          <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5H10.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
        </svg>
      )}
    </button>
  );
}
