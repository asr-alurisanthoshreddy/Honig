import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Settings as SettingsIcon, User as UserIcon, Bell, Shield, Sliders, 
  Lock, Gift, Star, Crown, ExternalLink, Edit2, Save, 
  Github, Linkedin, Twitter, Globe, MapPin, Building, 
  Phone, Mail, Check, AlertCircle, Download, Trash2,
  Brain, MessageSquare, Clock, Mic, MicOff, Sun, Moon,
  Eye, EyeOff, Database, Zap, ChevronRight, LogIn, Monitor
} from 'lucide-react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  user: User | null;
}

const Settings: React.FC<SettingsProps> = ({ 
  isOpen, 
  onClose, 
  darkMode, 
  onToggleDarkMode, 
  user 
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Real-time personalization settings
  const [customInstructions, setCustomInstructions] = useState('');
  const [useMemories, setUseMemories] = useState(true);
  const [useChatHistory, setUseChatHistory] = useState(true);
  const [memoryUsage, setMemoryUsage] = useState(85); // Percentage
  
  // Voice settings
  const [voiceAutoStop, setVoiceAutoStop] = useState(true);
  
  // Appearance settings
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  
  // Profile data
  const [profileData, setProfileData] = useState({
    name: user?.user_metadata?.name || '',
    email: user?.email || '',
    bio: '',
    website: '',
    location: '',
    company: '',
    phone: '',
    github: '',
    linkedin: '',
    twitter: ''
  });

  const isLoggedIn = !!user;

  // Load settings from localStorage
  useEffect(() => {
    const savedVoiceAutoStop = localStorage.getItem('voice-auto-stop');
    if (savedVoiceAutoStop) {
      setVoiceAutoStop(JSON.parse(savedVoiceAutoStop));
    }
    
    const savedThemeMode = localStorage.getItem('theme-mode');
    if (savedThemeMode) {
      setThemeMode(savedThemeMode as 'light' | 'dark' | 'system');
    }
    
    const savedCustomInstructions = localStorage.getItem('custom-instructions');
    if (savedCustomInstructions) {
      setCustomInstructions(savedCustomInstructions);
    }
    
    const savedUseMemories = localStorage.getItem('use-memories');
    if (savedUseMemories) {
      setUseMemories(JSON.parse(savedUseMemories));
    }
    
    const savedUseChatHistory = localStorage.getItem('use-chat-history');
    if (savedUseChatHistory) {
      setUseChatHistory(JSON.parse(savedUseChatHistory));
    }
  }, []);

  // Real-time save functions
  const saveCustomInstructions = (value: string) => {
    setCustomInstructions(value);
    localStorage.setItem('custom-instructions', value);
  };

  const toggleMemories = () => {
    const newValue = !useMemories;
    setUseMemories(newValue);
    localStorage.setItem('use-memories', JSON.stringify(newValue));
  };

  const toggleChatHistory = () => {
    const newValue = !useChatHistory;
    setUseChatHistory(newValue);
    localStorage.setItem('use-chat-history', JSON.stringify(newValue));
  };

  const toggleVoiceAutoStop = () => {
    if (!isLoggedIn) {
      handleLockedOptionClick();
      return;
    }
    const newValue = !voiceAutoStop;
    setVoiceAutoStop(newValue);
    localStorage.setItem('voice-auto-stop', JSON.stringify(newValue));
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    localStorage.setItem('theme-mode', mode);
    
    // Apply theme immediately
    if (mode === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark !== darkMode) {
        onToggleDarkMode();
      }
    } else {
      const shouldBeDark = mode === 'dark';
      if (shouldBeDark !== darkMode) {
        onToggleDarkMode();
      }
    }
  };

  const handleLockedOptionClick = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon, locked: false },
    { id: 'personalization', label: 'Personalization', icon: Brain, locked: !isLoggedIn },
    { id: 'notifications', label: 'Notifications', icon: Bell, locked: !isLoggedIn },
    { id: 'account', label: 'Account', icon: UserIcon, locked: !isLoggedIn },
    { id: 'privacy', label: 'Privacy', icon: Shield, locked: false },
    { id: 'advanced', label: 'Advanced', icon: Sliders, locked: false }
  ];

  const handleTabClick = (tabId: string, locked: boolean) => {
    if (locked) {
      handleLockedOptionClick();
    } else {
      setActiveTab(tabId);
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          🎨 Appearance
        </h3>
        <div className="space-y-4">
          {/* Theme Mode Selection */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Monitor className="w-5 h-5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Theme</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Choose your preferred theme</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  themeMode === 'light'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span className="text-sm">Light</span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  themeMode === 'dark'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span className="text-sm">Dark</span>
              </button>
              <button
                onClick={() => handleThemeChange('system')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  themeMode === 'system'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span className="text-sm">System</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          🎤 Voice Input
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              {voiceAutoStop ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  Voice Auto-Stop
                  {!isLoggedIn && <Lock className="w-4 h-4 text-gray-400" />}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatically stop recording after 3 seconds of silence
                  {!isLoggedIn && <span className="text-orange-600 dark:text-orange-400 ml-1">(Sign in to customize)</span>}
                </p>
              </div>
            </div>
            <button
              onClick={toggleVoiceAutoStop}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                voiceAutoStop ? 'bg-blue-600' : 'bg-gray-300'
              } ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  voiceAutoStop ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPersonalizationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          🧠 AI Personalization
        </h3>
        <div className="space-y-4">
          {/* Custom Instructions */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Edit2 className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Custom Instructions</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Personalize how Honig responds to you
                </p>
              </div>
            </div>
            <textarea
              value={customInstructions}
              onChange={(e) => saveCustomInstructions(e.target.value)}
              placeholder="Tell Honig how you'd like it to respond. For example: 'Be concise and technical' or 'Explain things simply with examples'"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Changes are saved automatically
            </p>
          </div>

          {/* Memory Settings */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Reference Saved Memories</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Let Honig save and use memories when responding
                </p>
              </div>
            </div>
            <button
              onClick={toggleMemories}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useMemories ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useMemories ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Reference Chat History</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Let Honig reference recent conversations when responding
                </p>
              </div>
            </div>
            <button
              onClick={toggleChatHistory}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useChatHistory ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useChatHistory ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Memory Management */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Manage Memories</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {memoryUsage}% full
                  </p>
                </div>
              </div>
              <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Manage
              </button>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${memoryUsage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          🔔 Notification Preferences
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Email Notifications</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Receive updates via email</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAccountSettings = () => (
    <div className="space-y-6">
      {/* Subscription Status */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          💳 Subscription
        </h3>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="w-8 h-8 text-blue-600" />
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Free Plan</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Basic features included</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all">
              Upgrade
            </button>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            👤 Profile Information
          </h3>
          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {isEditingProfile ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            {isEditingProfile ? 'Save' : 'Edit'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({...profileData, name: e.target.value})}
              disabled={!isEditingProfile}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={profileData.email}
                disabled
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <Check className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          ⚙️ Account Actions
        </h3>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-blue-600" />
              <span className="text-gray-900 dark:text-gray-100">Export Data</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span className="text-red-600 dark:text-red-400">Delete Account</span>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          🛡️ Privacy Controls
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Data Collection</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Control data usage</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-600">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          ⚙️ Advanced Options
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Performance Mode</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Optimize for speed</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'personalization':
        return renderPersonalizationSettings();
      case 'notifications':
        return renderNotificationsSettings();
      case 'account':
        return renderAccountSettings();
      case 'privacy':
        return renderPrivacySettings();
      case 'advanced':
        return renderAdvancedSettings();
      default:
        return renderGeneralSettings();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex h-[calc(90vh-120px)]">
            {/* Sidebar */}
            <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id, tab.locked)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id && !tab.locked
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${tab.locked ? 'opacity-60' : ''}`}
                  >
                    <tab.icon size={18} />
                    <span className="flex-1">{tab.label}</span>
                    {tab.locked && <Lock size={14} className="text-gray-400" />}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {renderTabContent()}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">H</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      Sign In to Honig
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Access personalization and account features
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <LogIn className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Sign in to unlock:
                  </span>
                </div>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-6">
                  <li>• Custom AI instructions and personalization</li>
                  <li>• Conversation memory and history</li>
                  <li>• Voice auto-stop customization</li>
                  <li>• Notification preferences</li>
                  <li>• Account management and data export</li>
                </ul>
              </div>

              <Auth
                supabaseClient={supabase}
                appearance={{ 
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brandAccent: '#3B82F6',
                        inputBackground: darkMode ? '#1F2937' : '#FFFFFF',
                        inputText: darkMode ? '#F3F4F6' : '#111827',
                      },
                    },
                  },
                }}
                theme={darkMode ? 'dark' : 'light'}
                providers={['google', 'github', 'azure']}
                redirectTo={window.location.origin}
                onlyThirdPartyProviders={false}
                magicLink={false}
                showLinks={true}
                view="sign_in"
                localization={{
                  variables: {
                    sign_in: {
                      email_label: 'Email address',
                      password_label: 'Password',
                      button_label: 'Sign in',
                      loading_button_label: 'Signing in...',
                      social_provider_text: 'Sign in with {{provider}}',
                      link_text: "Don't have an account? Sign up",
                    },
                    sign_up: {
                      email_label: 'Email address',
                      password_label: 'Create a password',
                      button_label: 'Sign up',
                      loading_button_label: 'Signing up...',
                      social_provider_text: 'Sign up with {{provider}}',
                      link_text: 'Already have an account? Sign in',
                    },
                  },
                }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Account Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Delete Account
                </h3>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                  Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Settings;