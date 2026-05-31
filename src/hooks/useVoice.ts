import { useState, useRef, useCallback } from 'react';

interface UseVoiceOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  lang?: string;
}

export function useVoice({ onResult, onError, lang = 'he-IL' }: UseVoiceOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const start = useCallback(() => {
    if (!isSupported) {
      onError?.('Web Speech API is not supported in this browser.');
      return;
    }

    const SpeechRecognitionClass =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onResult?.(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsRecording(false);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        onError?.(`Speech recognition error: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, lang, onResult, onError]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const toggle = useCallback(() => {
    if (isRecording) {
      stop();
    } else {
      start();
    }
  }, [isRecording, start, stop]);

  return { isRecording, isSupported, start, stop, toggle };
}
