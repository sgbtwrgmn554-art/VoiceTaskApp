import { useState, useRef, useCallback } from 'react';

interface UseVoiceOptions {
  onTranscript?: (transcript: string) => void;
  onResult?: (transcript: string) => void;
  onInterimTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
  lang?: string;
}

export function useVoice({
  onTranscript,
  onResult,
  onInterimTranscript,
  onError,
  lang = 'he-IL',
}: UseVoiceOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (err) {
      const name = (err as Error).name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        onError?.('not-allowed');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        onError?.('audio-capture');
      } else {
        onError?.('not-allowed');
      }
      return false;
    }
  }, [onError]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      onError?.('not-supported');
      return;
    }

    const permitted = await requestPermission();
    if (!permitted) return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setInterimTranscript('');
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimTranscript('');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = (event.resultIndex as number); i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) {
        setInterimTranscript(interim);
        onInterimTranscript?.(interim);
      }
      if (final) {
        setTranscript(prev => (prev ? prev + ' ' + final : final));
        setInterimTranscript('');
        onTranscript?.(final);
        onResult?.(final);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsRecording(false);
      setInterimTranscript('');
      switch (event.error) {
        case 'not-allowed':
          onError?.('not-allowed');
          break;
        case 'network':
          onError?.('network');
          break;
        case 'audio-capture':
          onError?.('audio-capture');
          break;
        case 'no-speech':
        case 'aborted':
          break;
        default:
          onError?.(`error:${event.error}`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, lang, onTranscript, onResult, onInterimTranscript, onError, requestPermission]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setInterimTranscript('');
  }, []);

  const toggle = useCallback(async () => {
    if (isRecording) stopRecording();
    else await startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isSupported,
    transcript,
    interimTranscript,
    startRecording,
    stopRecording,
    toggle,
    start: startRecording,
    stop: stopRecording,
  };
}
