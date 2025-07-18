import React, { useState, useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Session, AuthError } from '@supabase/supabase-js';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatThread from './components/ChatThread';
import ChatInput from './components/ChatInput';
import LoginPrompt from './components/LoginPrompt';
import BeforeUnloadWarning from './components/BeforeUnloadWarning';
import SimpleFileUpload from './components/SimpleFileUpload';
import { useChatStore } from './store/chatStore';
import { supabase, upsertUserProfile } from './lib/supabase';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });
  const { setUserId, loadConversations, setGuestMode } = useChatStore();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if we're in a configured environment
  const isConfigured = import.meta.env.VITE_SUPABASE_URL && 
                      import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
                      import.meta.env.VITE_SUPABASE_ANON_KEY && 
                      import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder-key';

  useEffect(() => {
    if (!isConfigured) {
      // Skip auth setup if not configured
      setUserId(null);
      setGuestMode(true);
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.id);
      setSession(session);
      if (session?.user) {
        setUserId(session.user.id);
        setGuestMode(false);
        upsertUserProfile(session.user);
        // Load conversations after setting user ID with a small delay to ensure state is updated
        setTimeout(() => {
          console.log('Loading conversations after initial session');
          loadConversations();
        }, 100);
      } else {
        setUserId(null);
        setGuestMode(true);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
      // Handle authentication errors
      if (event === 'SIGNED_IN' && session) {
        setAuthError(null); // Clear any previous errors on successful sign in
        setSession(session);
        setUserId(session.user.id);
        setGuestMode(false);
        upsertUserProfile(session.user);
        setShowAuthModal(false); // Close auth modal on successful sign in
        // Load conversations after setting user ID with a small delay to ensure state is updated
        setTimeout(() => {
          console.log('Loading conversations after auth state change');
          loadConversations();
        }, 100);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUserId(null);
        setGuestMode(true);
        setAuthError(null); // Clear errors on sign out
      } else if (event === 'USER_UPDATED') {
        setSession(session);
        if (session?.user) {
          upsertUserProfile(session.user);
        }
      }
      
      setIsLoading(false);
    });

    // Listen for auth errors
    const handleAuthError = (error: AuthError) => {
      console.error('Auth error:', error);
      
      if (error.message.includes('Invalid login credentials')) {
        setAuthError('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message.includes('Email not confirmed')) {
        setAuthError('Please check your email and click the confirmation link before signing in.');
      } else if (error.message.includes('Too many requests')) {
        setAuthError('Too many login attempts. Please wait a few minutes before trying again.');
      } else if (error.message.includes('User not found')) {
        setAuthError('No account found with this email. Please sign up first or check your email address.');
      } else if (error.message.includes('Password should be at least')) {
        setAuthError('Password must be at least 6 characters long.');
      } else if (error.message.includes('Unable to validate email address')) {
        setAuthError('Please enter a valid email address.');
      } else {
        setAuthError(`Authentication error: ${error.message}`);
      }
    };

    // Set up error handling for auth operations
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Check if this is a Supabase auth request that failed
        if (args[0]?.toString().includes('supabase.co/auth/v1') && !response.ok) {
          const errorData = await response.clone().json().catch(() => ({}));
          
          if (errorData.code === 'invalid_credentials') {
            setAuthError('Invalid email or password. Please check your credentials and try again.');
          } else if (errorData.code === 'email_not_confirmed') {
            setAuthError('Please check your email and click the confirmation link before signing in.');
          } else if (errorData.code === 'too_many_requests') {
            setAuthError('Too many login attempts. Please wait a few minutes before trying again.');
          } else if (errorData.message) {
            setAuthError(`Authentication error: ${errorData.message}`);
          }
        }
        
        return response;
      } catch (error) {
        return originalFetch(...args);
      }
    };

    return () => {
      subscription.unsubscribe();
      window.fetch = originalFetch; // Restore original fetch
    };
  }, [setUserId, loadConversations, setGuestMode, isConfigured]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Apply dark mode on mount and when changed
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLoginRequired = () => {
    if (!isConfigured) {
      alert('Authentication is not configured. Please set up your Supabase credentials to use login features.');
      return;
    }
    setShowLoginPrompt(true);
  };

  const handleProceedWithLogin = () => {
    setShowLoginPrompt(false);
    setShowAuthModal(true);
    setAuthError(null); // Clear any previous errors
  };

  const handleContinueAsGuest = () => {
    setShowLoginPrompt(false);
  };

  const handleCloseAuthModal = () => {
    setShowAuthModal(false);
    setAuthError(null); // Clear errors when closing modal
  };

  const handleFileUpload = () => {
    setShowFileUpload(true);
  };

  const handleLoginClick = () => {
    if (!isConfigured) {
      alert('Authentication is not configured. Please set up your Supabase credentials to use login features.');
      return;
    }
    setShowAuthModal(true);
    setAuthError(null); // Clear any previous errors
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Before unload warning component */}
      <BeforeUnloadWarning />
      
      <Header 
        onToggleSidebar={() => setSidebarOpen(true)} 
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        user={session?.user || null}
        onLoginClick={handleLoginClick}
      />
      
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        onLoginRequired={handleLoginRequired}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        user={session?.user || null}
        onLoginClick={handleLoginClick}
      />
      
      <main className="flex-1 flex flex-col">
        <ChatThread />
        <ChatInput 
          onLoginRequired={handleLoginRequired}
          onFileUpload={handleFileUpload}
        />
      </main>

      {/* Simple File Upload Modal */}
      <SimpleFileUpload
        isOpen={showFileUpload}
        onClose={() => setShowFileUpload(false)}
      />

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <LoginPrompt
          onProceedWithLogin={handleProceedWithLogin}
          onContinueAsGuest={handleContinueAsGuest}
          onClose={handleContinueAsGuest}
        />
      )}

      {/* Auth Modal - only show if configured */}
      {showAuthModal && isConfigured && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Sign In
                </h2>
                <button
                  onClick={handleCloseAuthModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Display authentication error */}
              {authError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        {authError}
                      </p>
                    </div>
                    <div className="ml-auto pl-3">
                      <div className="-mx-1.5 -my-1.5">
                        <button
                          onClick={() => setAuthError(null)}
                          className="inline-flex bg-red-50 dark:bg-red-900/20 rounded-md p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                        >
                          <span className="sr-only">Dismiss</span>
                          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Helpful instructions */}
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>New user?</strong> Click "Sign up" below to create an account.
                      <br />
                      <strong>Existing user?</strong> Use your registered email and password to sign in.
                    </p>
                  </div>
                </div>
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
          </div>
        </div>
      )}

      {/* Configuration Notice */}
      {!isConfigured && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium">Demo Mode</p>
              <p className="text-xs mt-1 opacity-90">
                Configure your API keys to unlock full functionality. See README.md for setup instructions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;