import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../store/chatStore';
import Message from './Message';

const ChatThread: React.FC = () => {
  const { messages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 overflow-y-auto">
      {!hasMessages ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full flex items-center justify-center p-6 text-center"
        >
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-white font-bold text-2xl">H</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                Welcome to Honig
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Your AI research assistant with real-time web search & intelligent analysis
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">📚</span>
                  <p className="font-semibold text-blue-800 dark:text-blue-200">
                    Factual Research
                  </p>
                </div>
                <p className="text-blue-700 dark:text-blue-300 text-sm mb-2">
                  Get accurate information from reliable sources
                </p>
                <p className="text-blue-600 dark:text-blue-400 text-xs italic">
                  "What is quantum computing?"
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🗞️</span>
                  <p className="font-semibold text-green-800 dark:text-green-200">
                    Current Events
                  </p>
                </div>
                <p className="text-green-700 dark:text-green-300 text-sm mb-2">
                  Latest news and real-time developments
                </p>
                <p className="text-green-600 dark:text-green-400 text-xs italic">
                  "Latest AI developments this week"
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">💭</span>
                  <p className="font-semibold text-purple-800 dark:text-purple-200">
                    Opinions & Reviews
                  </p>
                </div>
                <p className="text-purple-700 dark:text-purple-300 text-sm mb-2">
                  Community insights and discussions
                </p>
                <p className="text-purple-600 dark:text-purple-400 text-xs italic">
                  "What do people think about electric cars?"
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">💻</span>
                  <p className="font-semibold text-orange-800 dark:text-orange-200">
                    Programming Help
                  </p>
                </div>
                <p className="text-orange-700 dark:text-orange-300 text-sm mb-2">
                  Code examples and technical guidance
                </p>
                <p className="text-orange-600 dark:text-orange-400 text-xs italic">
                  "How to build a React component?"
                </p>
              </div>
            </div>

            {/* Configuration status */}
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here'
                      ? 'bg-green-500' 
                      : 'bg-yellow-500'
                  }`}></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here'
                      ? 'AI Features: Ready' 
                      : 'AI Features: Configure API Key'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'
                      ? 'bg-green-500' 
                      : 'bg-yellow-500'
                  }`}></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'
                      ? 'Database: Connected' 
                      : 'Database: Demo Mode'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Quick start tips */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                💡 <strong>Quick Start:</strong> Just type your question naturally
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                I'll automatically choose the best sources and provide comprehensive answers
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="min-h-full">
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatThread;