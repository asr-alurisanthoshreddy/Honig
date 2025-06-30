import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { supabase, getResponse, logQuery } from '../lib/supabase';

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
    needsLiveData?: boolean;
    processingTime?: number;
    model?: string;
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
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  clearConversation: () => Promise<void>;
  setUserId: (id: string | null) => void;
  setGuestMode: (isGuest: boolean) => void;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  addNote: (messageId: string, note: string) => Promise<void>;
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  conversations: [],
  currentConversationId: null,
  userId: null,
  isProcessing: false,
  isGuestMode: true,

  sendMessage: async (content: string) => {
    if (!content.trim()) return;

    const userMessageId = uuidv4();
    const assistantMessageId = uuidv4();
    const userId = get().userId;
    const isGuestMode = get().isGuestMode;
    let currentConversationId = get().currentConversationId;
    
    // Check if this is a file analysis message (starts with "I've analyzed your file")
    const isFileAnalysis = content.startsWith("I've analyzed your file");
    
    // Create new conversation if none exists and user is logged in
    if (!currentConversationId && !isGuestMode && userId) {
      currentConversationId = uuidv4();
      
      // Create new conversation in database first
      try {
        const { error: convError } = await supabase
          .from('conversations')
          .insert({
            id: currentConversationId,
            user_id: userId,
            title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
            updated_at: new Date().toISOString()
          });

        if (convError) {
          console.error('Error creating conversation:', convError);
          // Continue without database persistence
        } else {
          set({ currentConversationId });
        }
      } catch (error) {
        console.error('Failed to create conversation:', error);
        // Continue without database persistence
      }
    }

    // For file analysis, add the message directly without processing
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

      // Store in database if user is logged in (non-blocking)
      if (!isGuestMode && userId && currentConversationId) {
        try {
          await logQuery(userId, 'File Analysis', content, [], currentConversationId);
          
          // Update conversation timestamp
          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentConversationId);

          // Reload conversations
          get().loadConversations();
        } catch (dbError) {
          console.warn('Failed to persist file analysis:', dbError);
          // Don't show error to user for file analysis
        }
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

    // Add loading assistant message
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
      // Get response from enhanced service
      const startTime = Date.now();
      const assistantResponse = await getResponse(content);
      const processingTime = Date.now() - startTime;

      // Update the loading message with the actual response
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

      // Store query in database only if user is logged in (non-blocking)
      if (!isGuestMode && userId && currentConversationId) {
        try {
          await logQuery(userId, content, assistantResponse, [], currentConversationId);
          
          // Update conversation's updated_at timestamp
          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentConversationId);

          // Reload conversations to update the list
          get().loadConversations();
        } catch (dbError) {
          console.warn('Failed to persist message:', dbError);
          // Don't show error to user - continue with in-memory operation
        }
      }

    } catch (error) {
      console.error('Error handling message:', error);
      
      // Determine error message based on error type
      let errorMessage = 'I apologize, but I encountered an error processing your request.';
      
      if (error instanceof Error) {
        if (error.message.includes('API key not valid') || error.message.includes('configuration')) {
          errorMessage = 'I\'m currently experiencing configuration issues. Please ensure your API keys are properly set up.';
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
          errorMessage = 'I\'ve reached my usage limit. Please try again in a few minutes.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'I\'m having trouble connecting to my services. Please check your internet connection and try again.';
        }
      }
      
      // Update loading message with error
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

    try {
      // Get all conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (convError) {
        console.warn('Failed to load conversations:', convError);
        return;
      }

      // Get messages for current conversation if one is selected
      const currentId = get().currentConversationId;
      if (currentId) {
        const { data: messages, error: msgError } = await supabase
          .from('queries')
          .select('*')
          .eq('conversation_id', currentId)
          .order('created_at', { ascending: true });

        if (msgError) {
          console.warn('Failed to load messages:', msgError);
        } else {
          // Transform queries into messages
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
      }

      // Update conversations list
      set({ 
        conversations: conversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          updatedAt: new Date(conv.updated_at),
          messages: []
        }))
      });
    } catch (error) {
      console.warn('Error loading conversations:', error);
      // Don't throw error to prevent UI crashes
    }
  },

  selectConversation: async (id: string) => {
    const isGuestMode = get().isGuestMode;
    if (isGuestMode) return;

    try {
      // Get messages for selected conversation
      const { data: messages, error } = await supabase
        .from('queries')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Failed to load conversation:', error);
        return;
      }

      // Transform queries into messages
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

      // Update state with selected conversation
      set({ 
        currentConversationId: id,
        messages: formattedMessages
      });
    } catch (error) {
      console.warn('Error selecting conversation:', error);
      // Don't throw error to prevent UI crashes
    }
  },

  deleteConversation: async (id: string) => {
    const userId = get().userId;
    const isGuestMode = get().isGuestMode;
    
    if (!userId || isGuestMode) {
      throw new Error('User not authenticated');
    }

    console.log(`🗑️ Starting deletion of conversation ${id}`);

    try {
      // Step 1: Delete all queries for this conversation
      console.log('🔄 Deleting queries...');
      const { error: queriesError } = await supabase
        .from('queries')
        .delete()
        .eq('conversation_id', id);

      if (queriesError) {
        console.error('❌ Error deleting queries:', queriesError);
        throw new Error(`Failed to delete queries: ${queriesError.message}`);
      }

      console.log('✅ Queries deleted successfully');

      // Step 2: Delete the conversation
      console.log('🔄 Deleting conversation...');
      const { error: convError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (convError) {
        console.error('❌ Error deleting conversation:', convError);
        throw new Error(`Failed to delete conversation: ${convError.message}`);
      }

      console.log('✅ Conversation deleted from database');

      // Step 3: Update UI state
      set(state => {
        const updatedConversations = state.conversations.filter(conv => conv.id !== id);
        const shouldClearCurrent = state.currentConversationId === id;
        
        console.log(`🔄 Updating UI state. Conversations before: ${state.conversations.length}, after: ${updatedConversations.length}`);
        
        return {
          conversations: updatedConversations,
          currentConversationId: shouldClearCurrent ? null : state.currentConversationId,
          messages: shouldClearCurrent ? [] : state.messages
        };
      });

      console.log('✅ Conversation deletion completed successfully');

    } catch (error) {
      console.error('💥 Failed to delete conversation:', error);
      throw error;
    }
  },

  clearConversation: async () => {
    // Clear current conversation and messages
    set({ 
      messages: [],
      currentConversationId: null,
      isProcessing: false
    });
  },

  setUserId: (id: string | null) => {
    set({ userId: id });
  },

  setGuestMode: (isGuest: boolean) => {
    set({ isGuestMode: isGuest });
  },

  addNote: async (messageId: string, note: string) => {
    const isGuestMode = get().isGuestMode;
    if (isGuestMode) return;

    try {
      const { error } = await supabase
        .from('queries')
        .update({ notes: note })
        .eq('id', messageId);

      if (error) {
        console.warn('Failed to save note:', error);
        return;
      }

      // Update the message in the UI
      set(state => ({
        messages: state.messages.map(msg => 
          msg.id === messageId ? { ...msg, note } : msg
        )
      }));
    } catch (error) {
      console.warn('Error adding note:', error);
      // Don't throw error to prevent UI crashes
    }
  }
}));