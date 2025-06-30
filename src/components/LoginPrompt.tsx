import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, User, UserCheck, X, Save } from 'lucide-react';

interface LoginPromptProps {
  onProceedWithLogin: () => void;
  onContinueAsGuest: () => void;
  onClose: () => void;
}

const LoginPrompt: React.FC<LoginPromptProps> = ({
  onProceedWithLogin,
  onContinueAsGuest,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Save className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Save Your Progress
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Sign in to save your conversations, add notes, and access your chat history across devices. 
            You can also continue as a guest, but your conversations won't be saved.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={onProceedWithLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserCheck size={18} />
              <span>Sign In to Save</span>
            </button>
            
            <button
              onClick={onContinueAsGuest}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <User size={18} />
              <span>Continue as Guest</span>
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Guest Mode Limitations
              </span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              • Conversations are lost when you close the browser
              • Cannot save notes or annotations
              • No access to conversation history
              • Progress warning when leaving the page
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPrompt;