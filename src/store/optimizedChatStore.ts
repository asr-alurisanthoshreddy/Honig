import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { supabase, getResponse, logQuery, safeDbOperation, testDatabaseConnection } from '../lib/optimizedSupabase';

export type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  sources?: any[];
  note?: string;
  isLoading?: boolean;
  fromCache?: boolean;
  metadata?: {
    queryType?: string;
    processingTime?: number;
    error?: string;
    fromFileAnalysis?: boolean;
    fromHonig?: boolean;
    confidence?: number;
    databaseUsed?: boolean;
    databaseSource?: string;
    processingStages?: {
      databaseCheck?: number;
      queryProcessing?: number;
      sourceRetrieval?: number;
      contentScraping?: number;
      synthesis?: number;
      total: number;
    };
  };
};

export type Conversation = {
  id: string;
  title: string;
  updatedAt: Date;
  messages: Message[];
};

type ChatState = {
  messages: Message[];
  conversations: Conversation[];
  currentConversationId: string | null;
  userId: string | null;
  isProcessing: boolean;
  isGuestMode: boolean;
  persistenceError: string | null;
  dbConnectionStatus: 'unknown' | 'connected' | 'disconnected';
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  clearConversation: () => Promise<void>;
  setUserId: (id: string | null) => void;
  setGuestMode: (isGuest: boolean) => void;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  addNote: (messageId: string, note: string) => Promise<void>;
  clearPersistenceError: () => void;
  checkDatabaseConnection: () => Promise<void>;
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  conversations: [],
  currentConversationId: null,
  userId: null,
  isProcessing: false,
  isGuestMode: true,
  persistenceError: null,
  dbConnectionStatus: 'unknown',

  checkDatabaseConnection: async () => {
    const isConnected = await testDatabaseConnection();
    set({ dbConnectionStatus: isConnected ? 'connected' : 'disconnected' });
  },

  clearPersistenceError: () => {
    set({ persistenceError: null });
  },

  sendMessage: async (content: string) => {
    if (!content.trim()) return;

    const userMessageId = uuidv4();
    const assistantMessageId = uuidv4();
    const userId = get().userId;
    const isGuestMode = get().isGuestMode;
    let currentConversationId = get().currentConversationId;
    
    // Clear any previous persistence errors
    set({ persistenceError: null });
    
    // Check if this is a file analysis message
    const isFileAnalysis = content.startsWith("I've analyzed your file");
    
    // Create new conversation if needed (only for logged-in users)
    if (!currentConversationId && !isGuestMode && userId) {
      currentConversationId = uuidv4();
      
      // Try to create conversation, but don't block on failure
      safeDbOperation(
        async () => {
          const { error } = await supabase
            .from('conversations')
            .insert({
              id: currentConversationId,
              user_id: userId,
              title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
              updated_at: new Date().toISOString()
            });

          if (error) throw error;
          return true;
        },
        false,
        'create conversation'
      ).then(success => {
        if (success) {
          set({ currentConversationId });
        } else {
          console.warn('Failed to create conversation, continuing in memory');
        }
      });

      // Set conversation ID immediately for UI responsiveness
      set({ currentConversationId });
    }

    // Handle file analysis messages
    if (isFileAnalysis) {
      const fileAnalysisMessage: Message = {
        id: assistantMessageId,
        content,
        role: 'assistant',
        timestamp: new Date(),
        metadata: {
          fromFileAnalysis: true,
          processingTime: 0
        }
      };

      set(state => ({
        messages: [...state.messages, fileAnalysisMessage]
      }));

      // Try to persist to database (non-blocking)
      if (!isGuestMode && userId && currentConversationId) {
        safeDbOperation(
          async () => {
            await logQuery(userId, 'File Analysis', content, [], currentConversationId);
            return true;
          },
          false,
          'persist file analysis'
        ).catch(error => {
          console.warn('Failed to persist file analysis:', error);
          set({ persistenceError: 'Failed to save file analysis' });
        });
      }
      return;
    }

    // Regular message processing
    const userMessage: Message = {
      id: userMessageId,
      content,
      role: 'user',
      timestamp: new Date()
    };

    const loadingMessage: Message = {
      id: assistantMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isLoading: true
    };

    set(state => ({
      messages: [...state.messages, userMessage, loadingMessage],
      isProcessing: true
    }));

    try {
      const startTime = Date.now();
      
      // Get optimized response (fast path for simple queries)
      const assistantResponse = await getResponse(content);
      const processingTime = Date.now() - startTime;

      console.log(`⚡ Response generated in ${processingTime}ms`);

      // Update UI immediately
      set(state => ({
        messages: state.messages.map(msg => 
          msg.id === assistantMessageId 
            ? {
                ...msg,
                content: assistantResponse,
                isLoading: false,
                metadata: {
                  processingTime,
                  fromHonig: true
                }
              }
            : msg
        ),
        isProcessing: false
      }));

      // Persist to database asynchronously (non-blocking)
      if (!isGuestMode && userId && currentConversationId) {
        // Don't await this - let it run in background
        safeDbOperation(
          async () => {
            await logQuery(userId, content, assistantResponse, [], currentConversationId);
            
            // Update conversation timestamp
            await supabase
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', currentConversationId);
            
            return true;
          },
          false,
          'persist message'
        ).then(success => {
          if (success) {
            // Reload conversations in background
            get().loadConversations();
          }
        }).catch(error => {
          console.warn('Failed to persist message:', error);
          set({ persistenceError: 'Failed to save message' });
        });
      }

    } catch (error) {
      console.error('Error handling message:', error);
      
      let errorMessage = 'I apologize, but I encountered an error processing your request.';
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'Configuration issue detected. Please check your API keys.';
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
          errorMessage = 'Usage limit reached. Please try again in a few minutes.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network connection issue. Please check your internet and try again.';
        }
      }
      
      set(state => ({
        messages: state.messages.map(msg => 
          msg.id === assistantMessageId 
            ? {
                ...msg,
                content: errorMessage,
                isLoading: false,
                metadata: {
                  error: error instanceof Error ? error.message : String(error),
                  processingTime: 0
                }
              }
            : msg
        ),
        isProcessing: false
      }));
    }
  },
  
  loadConversations: async () => {
    const userId = get().userId;
    const isGuestMode = get().isGuestMode;
    
    if (!userId || isGuestMode) return;

    const success = await safeDbOperation(
      async () => {
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (convError) throw convError;

        const currentId = get().currentConversationId;
        if (currentId) {
          const { data: messages, error: msgError } = await supabase
            .from('queries')
            .select('*')
            .eq('conversation_id', currentId)
            .order('created_at', { ascending: true });

          if (msgError) throw msgError;

          const formattedMessages = messages.flatMap(query => ([
            {
              id: query.id,
              content: query.query_text,
              role: 'user' as const,
              timestamp: new Date(query.created_at),
              sources: query.sources || []
            },
            {
              id: uuidv4(),
              content: query.response_text,
              role: 'assistant' as const,
              timestamp: new Date(query.created_at),
              sources: query.sources || [],
              note: query.notes || undefined
            }
          ]));

          set({ messages: formattedMessages });
        }

        set({ 
          conversations: conversations.map(conv => ({
            id: conv.id,
            title: conv.title,
            updatedAt: new Date(conv.updated_at),
            messages: []
          })),
          dbConnectionStatus: 'connected'
        });

        return true;
      },
      false,
      'load conversations'
    );

    if (!success) {
      set({ 
        persistenceError: 'Failed to load conversations',
        dbConnectionStatus: 'disconnected'
      });
    }
  },

  selectConversation: async (id: string) => {
    const isGuestMode = get().isGuestMode;
    if (isGuestMode) return;

    const success = await safeDbOperation(
      async () => {
        const { data: messages, error } = await supabase
          .from('queries')
          .select('*')
          .eq('conversation_id', id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const formattedMessages = messages.flatMap(query => ([
          {
            id: query.id,
            content: query.query_text,
            role: 'user' as const,
            timestamp: new Date(query.created_at),
            sources: query.sources || []
          },
          {
            id: uuidv4(),
            content: query.response_text,
            role: 'assistant' as const,
            timestamp: new Date(query.created_at),
            sources: query.sources || [],
            note: query.notes || undefined,
            metadata: {
              fromFileAnalysis: query.query_text === 'File Analysis'
            }
          }
        ]));

        set({ 
          currentConversationId: id,
          messages: formattedMessages
        });

        return true;
      },
      false,
      'select conversation'
    );

    if (!success) {
      set({ persistenceError: 'Failed to load conversation' });
    }
  },

  deleteConversation: async (id: string) => {
    const userId = get().userId;
    const isGuestMode = get().isGuestMode;
    
    if (!userId || isGuestMode) {
      throw new Error('User not authenticated');
    }

    // Update UI immediately for better UX
    set(state => {
      const updatedConversations = state.conversations.filter(conv => conv.id !== id);
      const shouldClearCurrent = state.currentConversationId === id;
      
      return {
        conversations: updatedConversations,
        currentConversationId: shouldClearCurrent ? null : state.currentConversationId,
        messages: shouldClearCurrent ? [] : state.messages
      };
    });

    // Try to delete from database
    const success = await safeDbOperation(
      async () => {
        // Delete queries first
        const { error: queriesError } = await supabase
          .from('queries')
          .delete()
          .eq('conversation_id', id);

        if (queriesError) throw new Error(`Failed to delete queries: ${queriesError.message}`);

        // Delete conversation
        const { error: convError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (convError) throw new Error(`Failed to delete conversation: ${convError.message}`);

        return true;
      },
      false,
      'delete conversation'
    );

    if (!success) {
      set({ persistenceError: 'Failed to delete conversation from database' });
      // Reload conversations to restore state
      get().loadConversations();
    }
  },

  clearConversation: async () => {
    set({ 
      messages: [],
      currentConversationId: null,
      isProcessing: false,
      persistenceError: null
    });
  },

  setUserId: (id: string | null) => {
    set({ userId: id });
    if (id) {
      // Check database connection when user logs in
      get().checkDatabaseConnection();
    }
  },

  setGuestMode: (isGuest: boolean) => {
    set({ isGuestMode: isGuest });
  },

  addNote: async (messageId: string, note: string) => {
    const isGuestMode = get().isGuestMode;
    if (isGuestMode) return;

    // Update UI immediately
    set(state => ({
      messages: state.messages.map(msg => 
        msg.id === messageId ? { ...msg, note } : msg
      )
    }));

    // Try to persist to database
    const success = await safeDbOperation(
      async () => {
        const { error } = await supabase
          .from('queries')
          .update({ notes: note })
          .eq('id', messageId);

        if (error) throw error;
        return true;
      },
      false,
      'add note'
    );

    if (!success) {
      set({ persistenceError: 'Failed to save note' });
    }
  }
}));