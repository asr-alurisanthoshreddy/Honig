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
          <div className="max-w-md">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">H</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Honig
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Real-Time LLM with Intelligent Web Search & Summarization
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600 dark:text-blue-400">📚</span>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Factual Research
                  </p>
                </div>
                <p className="text-blue-700 dark:text-blue-300 text-xs">
                  "What is quantum computing?"
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600 dark:text-green-400">🗞️</span>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Current Events
                  </p>
                </div>
                <p className="text-green-700 dark:text-green-300 text-xs">
                  "Latest AI developments this week"
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-600 dark:text-purple-400">💭</span>
                  <p className="font-medium text-purple-800 dark:text-purple-200">
                    Opinions & Reviews
                  </p>
                </div>
                <p className="text-purple-700 dark:text-purple-300 text-xs">
                  "What do people think about electric cars?"
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-orange-600 dark:text-orange-400">🔬</span>
                  <p className="font-medium text-orange-800 dark:text-orange-200">
                    Technical Topics
                  </p>
                </div>
                <p className="text-orange-700 dark:text-orange-300 text-xs">
                  "How does machine learning work?"
                </p>
              </div>
            </div>

            {/* Configuration status */}
            <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${
                  import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here'
                    ? 'bg-green-500' 
                    : 'bg-yellow-500'
                }`}></div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here'
                    ? 'AI Features: Ready' 
                    : 'AI Features: Configure API Key'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'
                    ? 'bg-green-500' 
                    : 'bg-yellow-500'
                }`}></div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'
                    ? 'Database: Connected' 
                    : 'Database: Demo Mode'
                  }
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
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