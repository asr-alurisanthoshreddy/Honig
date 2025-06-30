import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Calendar, Settings, X, LogOut, Trash2, LogIn, User } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import SettingsComponent from './Settings';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginRequired: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  user?: any; // Add user prop
  onLoginClick?: () => void; // Add login handler prop
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  onLoginRequired, 
  darkMode, 
  onToggleDarkMode,
  user = null,
  onLoginClick
}) => {
  const { 
    conversations, 
    clearConversation, 
    loadConversations, 
    selectConversation, 
    deleteConversation, 
    currentConversationId, 
    userId,
    isGuestMode 
  } = useChatStore();
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; conversationId: string; title: string }>({
    show: false,
    conversationId: '',
    title: ''
  });
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const isLoggedIn = !!user;

  // Only load conversations when sidebar opens and user is authenticated
  useEffect(() => {
    if (isOpen && userId && !isGuestMode) {
      console.log('🔄 Sidebar opened, reloading conversations for user:', userId);
      loadConversations();
    }
  }, [isOpen, userId, isGuestMode, loadConversations]);

  const handleNewConversation = async () => {
    await clearConversation();
    onClose();
  };

  const handleSelectConversation = async (id: string) => {
    if (isDeleting === id) return; // Prevent selection during deletion
    
    if (isGuestMode) {
      onLoginRequired();
      return;
    }
    
    await selectConversation(id);
    onClose();
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isGuestMode) {
      onLoginRequired();
      return;
    }
    
    setDeleteConfirm({ show: true, conversationId: id, title });
  };

  const handleConfirmDelete = async () => {
    const conversationId = deleteConfirm.conversationId;
    setIsDeleting(conversationId);
    
    try {
      console.log('🗑️ User confirmed deletion of conversation:', conversationId);
      
      // Close the confirmation modal first
      setDeleteConfirm({ show: false, conversationId: '', title: '' });
      
      // Delete the conversation (this now updates UI immediately)
      await deleteConversation(conversationId);
      
      console.log('✅ Conversation deleted successfully from UI');
      
    } catch (error) {
      console.error('💥 Failed to delete conversation:', error);
      // Show error to user
      alert('Failed to delete conversation. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ show: false, conversationId: '', title: '' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const sortedConversations = [...conversations].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={onClose}
        />
      )}
      
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ ease: "easeOut", duration: 0.25 }}
        className="fixed top-0 left-0 h-full w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-30 overflow-hidden flex flex-col"
      >
        {/* Header with close button */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Honig</h2>
          <button 
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-3">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center gap-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            <span>New Conversation</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {isGuestMode ? (
            <div className="space-y-3">
              <div className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Guest Mode
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User size={16} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Limited Features
                  </span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                  Sign in to save conversations, add notes, and access your chat history across devices.
                </p>
                <button
                  onClick={() => {
                    onLoginRequired();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  <LogIn size={14} />
                  <span>Sign In</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Recent Conversations ({sortedConversations.length})
              </div>
              
              {sortedConversations.length === 0 ? (
                <div className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
                  No conversations yet
                </div>
              ) : (
                sortedConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group relative flex items-center gap-2 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                      currentConversationId === conversation.id ? 'bg-gray-200 dark:bg-gray-800' : ''
                    } ${
                      isDeleting === conversation.id ? 'opacity-50 pointer-events-none' : ''
                    }`}
                    onClick={() => handleSelectConversation(conversation.id)}
                  >
                    <MessageSquare size={16} className="flex-shrink-0 text-gray-500 dark:text-gray-400" />
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {conversation.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(conversation.updatedAt, { addSuffix: true })}
                      </div>
                    </div>
                    {isDeleting === conversation.id ? (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleDeleteClick(e, conversation.id, conversation.title)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded transition-all z-10"
                        title="Delete conversation"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <button 
            onClick={handleSettingsClick}
            className="w-full flex items-center gap-2 p-2 text-left rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
          {!isGuestMode && (
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 p-2 text-left rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </motion.aside>

      {/* Settings Modal - Pass user prop */}
      <SettingsComponent
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        user={user}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Delete Conversation
                </h3>
                <button
                  onClick={handleCancelDelete}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to delete "<span className="font-medium">{deleteConfirm.title}</span>"? This action cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  No, Keep It
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;