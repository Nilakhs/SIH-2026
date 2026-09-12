import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Square, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

/**
 * VoiceInput — uses the browser's native Web Speech API (no external API needed)
 * Falls back gracefully on unsupported browsers with a clear message.
 * For production: swap out the transcript handler to POST audio blob to faster-whisper endpoint.
 */
const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [supported, setSupported] = useState<boolean | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const checkSupport = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SpeechRecognition;
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Indian English — optimal for SIH demo

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      setInterim('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (interimTranscript) setInterim(interimTranscript);
      if (finalTranscript.trim()) {
        onTranscript(finalTranscript.trim());
        setInterim('');
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterim('');
  }, []);

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (supported === false) {
    return (
      <button
        disabled
        title="Voice input not supported in this browser. Use Chrome or Edge."
        className="p-2 text-slate-600 cursor-not-allowed"
      >
        <MicOff className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={isListening ? 'Stop recording' : 'Speak your query (en-IN)'}
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          isListening
            ? 'text-red-400 bg-red-500/15 border border-red-500/30 animate-pulse'
            : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}

        {/* Recording indicator dot */}
        {isListening && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
        )}
      </button>

      {/* Live interim transcript tooltip */}
      {interim && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 shadow-xl z-50 text-center">
          <div className="flex items-center gap-1.5 justify-center text-red-400 mb-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-[10px] uppercase tracking-wider font-mono">Listening</span>
          </div>
          <p className="italic">{interim}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
