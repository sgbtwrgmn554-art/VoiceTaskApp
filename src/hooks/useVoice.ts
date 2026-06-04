import { useState, useRef, useCallback } from 'react';

interface UseVoiceOptions {
  onTranscript?: (transcript: string) => void;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  lang?: string;
}

export function useVoice({ onTranscript, onResult, onError, lang = 'he-IL' }: UseVoiceOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      onError?.('דפדפן זה אינו תומך בהקלטת קול');
      return;
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      onTranscript?.(text);
      onResult?.(text);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsRecording(false);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        onError?.(`שגיאה בהקלטה: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, lang, onTranscript, onResult, onError]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const toggle = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return { isRecording, isSupported, transcript, startRecording, stopRecording, toggle,
    start: startRecording, stop: stopRecording };
}
