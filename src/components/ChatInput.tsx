import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, Mic, MicOff } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onLoginRequired: () => void;
  onFileUpload: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onLoginRequired, onFileUpload }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSpeechTime, setLastSpeechTime] = useState<number>(0);
  const [autoStopEnabled, setAutoStopEnabled] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const { sendMessage, isProcessing, isGuestMode, messages, userId } = useChatStore();

  // Configuration for auto-stop behavior
  const SILENCE_TIMEOUT = 3000; // 3 seconds of silence before auto-stop
  const MIN_SPEECH_DURATION = 1000; // Minimum 1 second of speech before allowing auto-stop

  const isLoggedIn = !!userId;

  // Load voice auto-stop setting from localStorage
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
    
    // For guest users, always use auto-stop (they can't change it)
    if (isGuestMode) {
      setAutoStopEnabled(true);
    }
  }, [isGuestMode]);

  // Check for speech recognition support on component mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      
      // Initialize speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('🎤 Voice recognition started');
        setIsListening(true);
        setLastSpeechTime(Date.now());
        setSpeechError(null); // Clear any previous errors
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
        
        // Update input with final transcript
        if (finalTranscript) {
          setInput(prev => prev + finalTranscript);
          setLastSpeechTime(Date.now());
        }
        
        // Reset silence timer when speech is detected
        if (hasNewFinalResult || interimTranscript.trim()) {
          setLastSpeechTime(Date.now());
          
          // Clear existing silence timer
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            setSilenceTimer(null);
          }
          
          // Set new silence timer for auto-stop (only if auto-stop is enabled)
          if (autoStopEnabled && isListening) {
            const timer = setTimeout(() => {
              const timeSinceLastSpeech = Date.now() - lastSpeechTime;
              const totalSpeechDuration = Date.now() - lastSpeechTime;
              
              // Only auto-stop if we've had enough speech and sufficient silence
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
        
        // Clear silence timer on error
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          setSilenceTimer(null);
        }
        
        // Handle different error types gracefully
        switch (event.error) {
          case 'not-allowed':
            setSpeechError('Microphone access denied. Please allow microphone permissions and try again.');
            break;
          case 'no-speech':
            console.log('🎤 No speech detected, stopping...');
            setSpeechError('No speech detected. Please try again.');
            break;
          case 'audio-capture':
            setSpeechError('No microphone found. Please check your microphone connection.');
            break;
          case 'network':
            setSpeechError('Network error during speech recognition. Please check your internet connection.');
            break;
          default:
            setSpeechError(`Speech recognition error: ${event.error}`);
        }
        
        // Clear error message after 5 seconds
        setTimeout(() => setSpeechError(null), 5000);
      };
      
      recognition.onend = () => {
        console.log('🎤 Voice recognition ended');
        setIsListening(false);
        
        // Clear silence timer when recognition ends
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
    
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, [autoStopEnabled]);

  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    // Stop listening if currently active
    if (isListening && recognitionRef.current) {
      stopListening();
    }

    // Send message directly - no blocking for guest users
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
    
    // Clear silence timer
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      setSilenceTimer(null);
    }
  };

  const startListening = () => {
    if (!speechSupported) {
      setSpeechError('Speech recognition is not supported in your browser. Please try using Chrome, Edge, or Safari.');
      setTimeout(() => setSpeechError(null), 3000);
      return;
    }

    if (!recognitionRef.current) {
      setSpeechError('Speech recognition not initialized. Please refresh the page and try again.');
      setTimeout(() => setSpeechError(null), 3000);
      return;
    }

    try {
      setSpeechError(null); // Clear any previous errors
      recognitionRef.current.start();
      setLastSpeechTime(Date.now());
    } catch (error) {
      console.error('🎤 Failed to start speech recognition:', error);
      setSpeechError('Failed to start voice recognition. Please check your microphone permissions.');
      setTimeout(() => setSpeechError(null), 3000);
    }
  };

  const toggleVoiceRecognition = () => {
    if (isListening) {
      // Stop listening
      stopListening();
    } else {
      // Start listening
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
      className="sticky bottom-0 bg-white dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-800"
    >
      {/* Speech error display */}
      {speechError && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full mt-0.5 flex-shrink-0"></div>
            <p className="text-sm text-red-700 dark:text-red-300">{speechError}</p>
          </div>
        </div>
      )}

      <form 
        onSubmit={handleSubmit} 
        className="flex items-end gap-2 max-w-3xl mx-auto relative"
      >
        {/* File Upload Button */}
        <button
          type="button"
          onClick={onFileUpload}
          className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors self-start mt-2 flex items-center justify-center"
          title="Upload and analyze file"
        >
          <Paperclip className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
        
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getVoicePlaceholder()}
            className={`w-full p-3 pr-20 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 resize-none max-h-[200px] min-h-[56px] transition-all ${
              isListening
                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
                : 'border-gray-300 dark:border-gray-700'
            }`}
            rows={1}
            disabled={isProcessing}
          />
          
          {/* Voice Recognition Indicator */}
          {isListening && (
            <div className="absolute top-2 right-20 flex items-center gap-1">
              <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <span className="text-xs text-red-600 dark:text-red-400 ml-1">
                {autoStopEnabled ? 'AUTO' : 'REC'}
              </span>
            </div>
          )}
          
          {/* Voice Recognition Button - Left of Send Button */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleVoiceRecognition}
              className={`absolute right-12 bottom-3 p-1 rounded-full transition-all ${
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
          
          {/* Send Button - Rightmost */}
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className={`absolute right-3 bottom-3 p-1 rounded-full transition-colors ${
              input.trim() && !isProcessing
                ? 'text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-gray-700'
                : 'text-gray-400 cursor-not-allowed'
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
      
      <div className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
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
                Powered by <strong>Honig</strong> - Real-Time LLM with Intelligent Web Search
              </>
            )}
          </span>
          
          {getVoiceStatusText() && (
            <span>• {getVoiceStatusText()}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatInput;