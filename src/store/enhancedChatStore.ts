import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { supabase, getResponse, logQuery } from '../lib/enhancedSupabase';
import type { ConversationContext } from '../lib/followUpProcessor';

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
    isFollowUp?: boolean;
    followUpConfidence?: number;
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
  getConversationContext: () => ConversationContext;
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  conversations: [],
  currentConversationId: null,
  userId: null,
  isProcessing: false,
  isGuestMode: true,

  getConversationContext: (): ConversationContext => {
    const messages = get().messages;
    const recentMessages = messages.slice(-10); // Last 5 exchanges
    
    return {
      messages: recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata
      })),
      lastQuery: recentMessages.filter(m => m.role === 'user').pop()?.content,
      lastResponse: recentMessages.filter(m => m.role === 'assistant').pop()?.content
    };
  },

  sendMessage: async (content: string) => {
    if (!content.trim()) return;

    const userMessageId = uuidv4();
    const assistantMessageId = uuidv4();
    const userId = get().userId;
    const isGuestMode = get().isGuestMode;
    let currentConversationId = get().currentConversationId;
    
    // Check if this is a file analysis message
    const isFileAnalysis = content.startsWith("I've analyzed your file");
    
    // Create new conversation if none exists and user is logged in
    if (!currentConversationId && !isGuestMode && userId) {
      currentConversationId = uuidv4();
      
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
        return;
      }

      set({ currentConversationId });
    }

    // For file analysis, add the message directly
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

      // Store in database if user is logged in
      if (!isGuestMode && userId && currentConversationId) {
        try {
          await supabase
            .from('queries')
            .insert({
              id: assistantMessageId,
              user_id: userId,
              conversation_id: currentConversationId,
              query_text: 'File Analysis',
              response_text: content,
              sources: [],
            });

          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentConversationId);

          await get().loadConversations();
        } catch (dbError) {
          console.error('Database error:', dbError);
        }
      }
      return;
    }

    // Regular message processing with enhanced follow-up detection
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
      
      // Get conversation context for follow-up processing
      const conversationContext = get().getConversationContext();
      
      // Get enhanced response with follow-up processing
      const assistantResponse = await getResponse(content, conversationContext);
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

      // Store query in database if user is logged in
      if (!isGuestMode && userId && currentConversationId) {
        try {
          await supabase
            .from('queries')
            .insert({
              id: userMessageId,
              user_id: userId,
              conversation_id: currentConversationId,
              query_text: content,
              response_text: assistantResponse,
              sources: [],
            });

          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentConversationId);

          await get().loadConversations();
        } catch (dbError) {
          console.error('Database error:', dbError);
        }
      }

    } catch (error) {
      console.error('Error handling message:', error);
      
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
        }))
      });
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  },

  selectConversation: async (id: string) => {
    const isGuestMode = get().isGuestMode;
    if (isGuestMode) return;

    try {
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
    } catch (error) {
      console.error('Error selecting conversation:', error);
    }
  },

  deleteConversation: async (id: string) => {
    const userId = get().userId;
    const isGuestMode = get().isGuestMode;
    
    if (!userId || isGuestMode) {
      throw new Error('User not authenticated');
    }

    try {
      const { error: queriesError } = await supabase
        .from('queries')
        .delete()
        .eq('conversation_id', id);

      if (queriesError) throw new Error(`Failed to delete queries: ${queriesError.message}`);

      const { error: convError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (convError) throw new Error(`Failed to delete conversation: ${convError.message}`);

      set(state => {
        const updatedConversations = state.conversations.filter(conv => conv.id !== id);
        const shouldClearCurrent = state.currentConversationId === id;
        
        return {
          conversations: updatedConversations,
          currentConversationId: shouldClearCurrent ? null : state.currentConversationId,
          messages: shouldClearCurrent ? [] : state.messages
        };
      });

    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  },

  clearConversation: async () => {
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

      if (error) throw error;

      set(state => ({
        messages: state.messages.map(msg => 
          msg.id === messageId ? { ...msg, note } : msg
        )
      }));
    } catch (error) {
      console.error('Error adding note:', error);
    }
  }
}));