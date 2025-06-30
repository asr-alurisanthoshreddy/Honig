import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Square, Paperclip } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { SimpleFileUpload } from './SimpleFileUpload';

interface ChatInputProps {
  onSendMessage: (message: string, files?: File[]) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { currentConversationId } = useChatStore();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setMessage(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setSpeechError(null); // Clear any previous error
        
        switch (event.error) {
          case 'not-allowed':
            setSpeechError('Microphone access denied. Please allow microphone permissions in your browser settings.');
            break;
          case 'no-speech':
            setSpeechError('No speech detected. Please try again.');
            break;
          case 'audio-capture':
            setSpeechError('No microphone found. Please check your microphone connection.');
            break;
          case 'network':
            setSpeechError('Network error occurred. Please check your internet connection.');
            break;
          default:
            setSpeechError('Speech recognition error occurred. Please try again.');
        }
        
        // Clear error message after 5 seconds
        setTimeout(() => setSpeechError(null), 5000);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setSpeechError('Speech recognition is not supported in your browser.');
      setTimeout(() => setSpeechError(null), 3000);
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setSpeechError(null); // Clear any previous errors
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setSpeechError('Failed to start speech recognition. Please try again.');
        setTimeout(() => setSpeechError(null), 3000);
      }
    }
  };

  const handleFilesSelected = (files: File[]) => {
    if (files.length > 0) {
      onSendMessage(message.trim() || 'Analyze these files', files);
      setMessage('');
      setShowFileUpload(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const supportsFileUpload = currentConversationId !== null;
  const supportsSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {speechError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {speechError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="w-full p-3 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ minHeight: '48px', maxHeight: '200px' }}
            disabled={disabled}
            rows={1}
          />
          
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {supportsFileUpload && (
              <button
                type="button"
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                title="Upload files"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            )}
            
            {supportsSpeechRecognition && (
              <button
                type="button"
                onClick={toggleRecording}
                className={`p-1.5 transition-colors ${
                  isRecording 
                    ? 'text-red-500 hover:text-red-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
        
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {showFileUpload && supportsFileUpload && (
        <div className="mt-3">
          <SimpleFileUpload
            onFilesSelected={handleFilesSelected}
            onCancel={() => setShowFileUpload(false)}
          />
        </div>
      )}
    </div>
  );
}