import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, Mic, MicOff } from 'lucide-react';
import { useChatStore } from '../store/optimizedChatStore';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onLoginRequired: () => void;
  onFileUpload: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onLoginRequired, onFileUpload }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSpeechTime, setLastSpeechTime] = useState<number>(0);
  const [autoStopEnabled, setAutoStopEnabled] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const { sendMessage, isProcessing, isGuestMode, messages, userId } = useChatStore();

  const SILENCE_TIMEOUT = 3000;
  const MIN_SPEECH_DURATION = 1000;
  const isLoggedIn = !!userId;

  // Load voice auto-stop setting
  useEffect(() => {
    const savedAutoStop = localStorage.getItem('voice-auto-stop');
    if (savedAutoStop) {
      try {
        const autoStop = JSON.parse(savedAutoStop);
        setAutoStopEnabled(autoStop);
      } catch (error) {
        console.error('Failed to parse voice auto-stop setting:', error);
      }
    }
    
    if (isGuestMode) {
      setAutoStopEnabled(true);
    }
  }, [isGuestMode]);

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('🎤 Voice recognition started');
        setIsListening(true);
        setLastSpeechTime(Date.now());
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        let hasNewFinalResult = false;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            hasNewFinalResult = true;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setInput(prev => prev + finalTranscript);
          setLastSpeechTime(Date.now());
        }
        
        if (hasNewFinalResult || interimTranscript.trim()) {
          setLastSpeechTime(Date.now());
          
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            setSilenceTimer(null);
          }
          
          if (autoStopEnabled && isListening) {
            const timer = setTimeout(() => {
              const timeSinceLastSpeech = Date.now() - lastSpeechTime;
              const totalSpeechDuration = Date.now() - lastSpeechTime;
              
              if (timeSinceLastSpeech >= SILENCE_TIMEOUT && totalSpeechDuration >= MIN_SPEECH_DURATION) {
                console.log('🔇 Auto-stopping due to silence');
                stopListening();
              }
            }, SILENCE_TIMEOUT);
            
            setSilenceTimer(timer);
          }
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('🎤 Speech recognition error:', event.error);
        setIsListening(false);
        
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          setSilenceTimer(null);
        }
        
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone permissions and try again.');
        } else if (event.error === 'no-speech') {
          console.log('🎤 No speech detected, stopping...');
        } else if (event.error === 'network') {
          alert('Network error during speech recognition. Please check your internet connection.');
        } else {
          alert(`Speech recognition error: ${event.error}`);
        }
      };
      
      recognition.onend = () => {
        console.log('🎤 Voice recognition ended');
        setIsListening(false);
        
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          setSilenceTimer(null);
        }
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn('🎤 Speech recognition not supported in this browser');
      setSpeechSupported(false);
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, [autoStopEnabled]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    if (isListening && recognitionRef.current) {
      stopListening();
    }

    await sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      setSilenceTimer(null);
    }
  };

  const startListening = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in your browser. Please try using Chrome, Edge, or Safari.');
      return;
    }

    if (!recognitionRef.current) {
      alert('Speech recognition not initialized. Please refresh the page and try again.');
      return;
    }

    try {
      recognitionRef.current.start();
      setLastSpeechTime(Date.now());
    } catch (error) {
      console.error('🎤 Failed to start speech recognition:', error);
      alert('Failed to start voice recognition. Please check your microphone permissions.');
    }
  };

  const toggleVoiceRecognition = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const getVoicePlaceholder = () => {
    if (isListening) {
      if (autoStopEnabled) {
        return "🎤 Listening... Will auto-stop after 3 seconds of silence";
      } else {
        return "🎤 Listening... Click microphone to stop manually";
      }
    }
    return "Ask Honig anything, upload a file, or use voice input...";
  };

  const getVoiceStatusText = () => {
    if (!speechSupported) return null;
    
    if (isGuestMode) {
      return "🎤 Voice input supported • 🔇 Auto-stop ON";
    }
    
    if (isLoggedIn) {
      return `🎤 Voice input supported • ${autoStopEnabled ? '🔇 Auto-stop ON' : '🎤 Manual stop'}`;
    }
    
    return "🎤 Voice input supported";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
    >
      <div className="max-w-4xl mx-auto p-4">
        <form 
          onSubmit={handleSubmit} 
          className="flex items-end gap-3 relative"
        >
          {/* File Upload Button - moved up slightly */}
          <button
            type="button"
            onClick={onFileUpload}
            className="flex-shrink-0 w-11 h-11 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center group self-end mb-1"
            title="Upload and analyze file"
          >
            <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getVoicePlaceholder()}
              className={`w-full p-4 pr-24 border-2 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 resize-none max-h-[120px] min-h-[56px] transition-all placeholder-gray-500 dark:placeholder-gray-400 ${
                isListening
                  ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              rows={1}
              disabled={isProcessing}
              style={{ overflow: 'hidden' }}
            />
            
            {/* Voice Recognition Indicator */}
            {isListening && (
              <div className="absolute top-3 right-20 flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-red-600 dark:text-red-400 ml-1 font-medium">
                  {autoStopEnabled ? 'AUTO' : 'REC'}
                </span>
              </div>
            )}
            
            {/* Voice Recognition Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoiceRecognition}
                className={`absolute right-14 bottom-3 p-2 rounded-xl transition-all ${
                  isListening
                    ? 'text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-gray-700 animate-pulse'
                    : 'text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-gray-700'
                }`}
                title={
                  isListening 
                    ? 'Stop voice recognition' 
                    : autoStopEnabled 
                      ? 'Start voice recognition (auto-stop enabled)'
                      : 'Start voice recognition (manual stop)'
                }
                disabled={isProcessing}
              >
                {isListening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            )}
            
            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all ${
                input.trim() && !isProcessing
                  ? 'text-white bg-blue-600 hover:bg-blue-700 shadow-sm'
                  : 'text-gray-400 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
              }`}
              aria-label="Send message"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
        
        <div className="text-xs text-center mt-3 text-gray-500 dark:text-gray-400">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span>
              {isGuestMode ? (
                <>
                  <strong>Guest Mode:</strong> Your conversations won't be saved. 
                  <button 
                    onClick={onLoginRequired}
                    className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
                  >
                    Sign in to save progress
                  </button>
                </>
              ) : (
                <>
                  Powered by <strong>Honig</strong> - Real-Time AI Research Assistant
                </>
              )}
            </span>
            
            {getVoiceStatusText() && (
              <span>• {getVoiceStatusText()}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatInput;