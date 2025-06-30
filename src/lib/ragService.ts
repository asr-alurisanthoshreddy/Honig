import { SearchEngine } from './search/searchEngine';
import { SerperProvider } from './search/providers/serperProvider';
import { NewsProvider } from './search/providers/newsProvider';
import { EnhancedRAGPipeline, type EnhancedRAGOptions, type EnhancedRAGResult } from './rag/enhancedRagPipeline';
import { LLMRouter } from './llm/llmRouter';
import { GeminiProvider } from './llm/providers/geminiProvider';

export class RAGService {
  private enhancedRagPipeline: EnhancedRAGPipeline | null = null;
  private llmRouter: LLMRouter;
  private isInitialized = false;
  private hasValidLLM = false;
  private hasValidSearch = false;

  constructor() {
    this.llmRouter = new LLMRouter();
    
    // Initialize search engine
    const searchEngine = new SearchEngine();
    
    // Add search providers with validation
    const serperKey = import.meta.env.VITE_SERPER_API_KEY;
    if (serperKey && serperKey.trim() && serperKey !== 'your_serper_api_key_here') {
      try {
        searchEngine.addProvider(new SerperProvider(serperKey), true);
        this.hasValidSearch = true;
        console.log('✅ Serper search provider initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Serper provider:', error.message);
      }
    } else {
      console.warn('⚠️ Serper API key not configured or invalid');
    }

    const newsKey = import.meta.env.VITE_NEWS_API_KEY;
    if (newsKey && newsKey.trim() && newsKey !== 'your_newsapi_key_here') {
      try {
        searchEngine.addProvider(new NewsProvider(newsKey));
        if (!this.hasValidSearch) this.hasValidSearch = true; // At least one search provider
        console.log('✅ News search provider initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize News provider:', error.message);
      }
    } else {
      console.warn('⚠️ News API key not configured or invalid');
    }

    // Initialize Enhanced RAG pipeline (works even without search providers)
    this.enhancedRagPipeline = new EnhancedRAGPipeline(searchEngine);
    console.log('✅ Enhanced RAG Pipeline initialized');

    // Add LLM providers with validation
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim() && geminiKey !== 'your_gemini_api_key_here') {
      try {
        this.llmRouter.addProvider('gemini', new GeminiProvider(geminiKey), true);
        this.hasValidLLM = true;
        console.log('✅ Gemini LLM provider initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Gemini provider:', error.message);
      }
    } else {
      console.warn('⚠️ Gemini API key not configured or invalid');
    }

    this.isInitialized = true;
  }

  async processQuery(query: string, options: EnhancedRAGOptions = {}): Promise<{
    response: string;
    sources: any[];
    metadata: any;
    fromCache?: boolean;
  }> {
    if (!this.isInitialized) {
      throw new Error('RAG Service not properly initialized');
    }

    // Check if we have any working LLM
    if (!this.hasValidLLM) {
      return {
        response: "I'm currently unable to process your request due to configuration issues. Please check that your API keys are properly set up.",
        sources: [],
        metadata: {
          error: 'No valid LLM provider available',
          needsConfiguration: true
        }
      };
    }

    try {
      // Classify the query
      const classification = this.llmRouter.classifyQuery(query);
      
      console.log('🔍 Query classification:', {
        query,
        needsLiveData: classification.needsLiveData,
        queryType: classification.queryType,
        suggestedModel: classification.suggestedModel
      });

      // Check if this query would benefit from category-based search
      const shouldUseCategorySearch = EnhancedRAGPipeline.shouldUseCategorySearch(query);
      const needsEnhancedRAG = classification.needsLiveData || shouldUseCategorySearch;

      console.log('🎯 Enhanced RAG decision:', {
        needsLiveData: classification.needsLiveData,
        shouldUseCategorySearch,
        needsEnhancedRAG,
        hasValidSearch: this.hasValidSearch
      });

      // If query doesn't need enhanced RAG, use direct LLM response
      if (!needsEnhancedRAG) {
        console.log('📝 Using direct LLM response (no enhanced RAG needed)');
        
        try {
          const response = await this.llmRouter.generateResponse(query);
          
          return {
            response,
            sources: [],
            metadata: {
              queryType: classification.queryType,
              needsLiveData: false,
              needsEnhancedRAG: false,
              processingTime: 0,
              model: classification.suggestedModel
            }
          };
        } catch (llmError) {
          console.error('LLM generation failed:', llmError);
          throw new Error(`AI service error: ${llmError.message}`);
        }
      }

      // Use Enhanced RAG Pipeline
      console.log('🚀 Processing through Enhanced RAG Pipeline');
      
      if (!this.enhancedRagPipeline) {
        throw new Error('Enhanced RAG Pipeline not available');
      }

      const ragOptions: EnhancedRAGOptions = {
        timeRange: classification.timeRange,
        maxSources: 5,
        maxCategorySources: 3,
        preferCategorySources: shouldUseCategorySearch,
        categoryTimeout: 12000,
        ...options
      };

      const ragResult: EnhancedRAGResult = await this.enhancedRagPipeline.process(query, ragOptions);
      
      // Generate response with context
      let enhancedPrompt = query;
      if (ragResult.context) {
        enhancedPrompt = `Based on the following information, please provide a comprehensive answer to the question. Use the context to support your response and cite specific sources when relevant.

Context:
${ragResult.context}

Question: ${query}

Please provide a detailed, well-structured response that incorporates the relevant information from the sources above.`;
      }

      const response = await this.llmRouter.generateResponse(
        enhancedPrompt,
        ragResult.context,
        classification.suggestedModel
      );

      // Format sources for frontend
      const formattedSources = ragResult.sources.map(source => ({
        title: source.title,
        link: source.url,
        snippet: source.snippet,
        source: source.source,
        type: source.type,
        publishedAt: source.publishedAt,
        metadata: source.metadata
      }));

      return {
        response,
        sources: formattedSources,
        metadata: {
          ...ragResult.metadata,
          queryType: classification.queryType,
          needsLiveData: classification.needsLiveData,
          needsEnhancedRAG: true,
          model: classification.suggestedModel,
          enhancedRAGUsed: true
        }
      };

    } catch (error) {
      console.error('Enhanced RAG Service error:', error);
      
      // Fallback to direct LLM response if Enhanced RAG fails
      if (this.hasValidLLM) {
        try {
          console.log('🔄 Falling back to direct LLM response');
          const fallbackResponse = await this.llmRouter.generateResponse(query);
          
          return {
            response: fallbackResponse + '\n\n*Note: Enhanced search capabilities were unavailable, so this response is based on my training data.*',
            sources: [],
            metadata: {
              error: error.message,
              fallback: true,
              processingTime: 0,
              enhancedRAGFailed: true
            }
          };
        } catch (fallbackError) {
          console.error('Fallback LLM also failed:', fallbackError);
          throw new Error(`Both Enhanced RAG and fallback failed: ${fallbackError.message}`);
        }
      } else {
        throw new Error('No valid LLM provider available for fallback');
      }
    }
  }

  // Check if service is properly configured
  isConfigured(): boolean {
    return this.hasValidLLM;
  }

  getConfiguration(): {
    searchProviders: string[];
    llmProviders: string[];
    isFullyConfigured: boolean;
    hasValidLLM: boolean;
    hasValidSearch: boolean;
    enhancedRAGAvailable: boolean;
  } {
    return {
      searchProviders: this.hasValidSearch ? ['configured'] : [],
      llmProviders: this.llmRouter.getAvailableModels(),
      isFullyConfigured: this.hasValidLLM && this.hasValidSearch,
      hasValidLLM: this.hasValidLLM,
      hasValidSearch: this.hasValidSearch,
      enhancedRAGAvailable: !!this.enhancedRagPipeline
    };
  }

  // Get available categories for debugging/info
  getAvailableCategories() {
    return this.enhancedRagPipeline?.getAvailableCategories() || [];
  }
}

// Export singleton instance
export const ragService = new RAGService();