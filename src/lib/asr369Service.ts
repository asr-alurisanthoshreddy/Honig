import { ASR369Engine, type ASR369Config, type ASR369Response } from './asr369/asr369Engine';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

export class ASR369Service {
  private engine: ASR369Engine | null = null;
  private isInitialized = false;
  private hasValidConfig = false;
  private supabaseClient: SupabaseClient<Database> | null = null;

  constructor() {
    // Don't initialize immediately - wait for init() to be called
  }

  // New init method that accepts supabase client
  init(supabaseClient: SupabaseClient<Database>) {
    this.supabaseClient = supabaseClient;
    this.initialize();
  }

  private initialize() {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const serperKey = import.meta.env.VITE_SERPER_API_KEY;
    const newsKey = import.meta.env.VITE_NEWS_API_KEY;

    // Validate Gemini API key (required)
    if (!geminiKey || geminiKey.trim() === '' || geminiKey === 'your_gemini_api_key_here') {
      console.warn('⚠️ ASR 369: Gemini API key not configured');
      this.isInitialized = true;
      return;
    }

    // Ensure supabase client is available
    if (!this.supabaseClient) {
      console.warn('⚠️ ASR 369: Supabase client not available');
      this.isInitialized = true;
      return;
    }

    try {
      const config: ASR369Config = {
        geminiApiKey: geminiKey,
        serperApiKey: serperKey && serperKey !== 'your_serper_api_key_here' ? serperKey : undefined,
        newsApiKey: newsKey && newsKey !== 'your_newsapi_key_here' ? newsKey : undefined,
        supabaseClient: this.supabaseClient,
        maxSources: 12,
        scrapingTimeout: 8000
      };

      this.engine = new ASR369Engine(config);
      this.hasValidConfig = true;
      this.isInitialized = true;

      console.log('✅ ASR 369: Engine initialized successfully');
      console.log('🔧 Configuration:', this.engine.getConfigurationStatus());
    } catch (error) {
      console.error('❌ ASR 369: Failed to initialize engine:', error);
      this.isInitialized = true;
    }
  }

  async processQuery(query: string): Promise<{
    response: string;
    sources: any[];
    metadata: any;
    fromASR369?: boolean;
  }> {
    if (!this.isInitialized) {
      throw new Error('ASR 369 Service not initialized');
    }

    if (!this.hasValidConfig || !this.engine) {
      return {
        response: "I'm currently unable to process your request. ASR 369 requires a valid Gemini API key to function. Please check your environment configuration.",
        sources: [],
        metadata: {
          error: 'ASR 369 not properly configured',
          needsConfiguration: true
        }
      };
    }

    try {
      console.log('🚀 ASR 369: Processing query:', query);
      
      const result: ASR369Response = await this.engine.processQuery(query);
      
      // Format sources for frontend compatibility
      const formattedSources = result.sources.map(source => ({
        title: source.title,
        link: source.url,
        snippet: source.snippet,
        source: source.source,
        type: source.type,
        publishedAt: source.publishedAt,
        metadata: source.metadata
      }));

      console.log('✅ ASR 369: Query processed successfully');
      console.log('📊 Metadata:', result.metadata);

      return {
        response: result.response,
        sources: formattedSources,
        metadata: {
          ...result.metadata,
          fromASR369: true,
          engine: 'ASR 369',
          version: '1.0'
        },
        fromASR369: true
      };

    } catch (error) {
      console.error('💥 ASR 369: Query processing failed:', error);
      
      // Return error response
      return {
        response: `I encountered an error while processing your request: ${error.message}. Please try again or rephrase your question.`,
        sources: [],
        metadata: {
          error: error.message,
          fromASR369: true,
          failed: true
        }
      };
    }
  }

  // Check if service is properly configured
  isConfigured(): boolean {
    return this.hasValidConfig && !!this.engine;
  }

  // Get configuration status
  getConfiguration() {
    if (!this.engine) {
      return {
        isConfigured: false,
        hasGemini: false,
        hasSerper: false,
        hasNewsAPI: false,
        hasDatabase: false,
        isFullyConfigured: false
      };
    }

    const status = this.engine.getConfigurationStatus();
    return {
      isConfigured: this.hasValidConfig,
      ...status
    };
  }

  // Method to determine if a query should use ASR 369
  static shouldUseASR369(query: string): boolean {
    // ASR 369 is designed for all types of queries that benefit from real-time information
    const queryLower = query.toLowerCase().trim();
    
    // Skip very simple greetings or identity questions
    if (/^(hi|hello|hey|who are you|what are you)(\?)?$/i.test(queryLower)) {
      return false;
    }

    // Use ASR 369 for most substantive queries
    return query.trim().length > 10;
  }
}