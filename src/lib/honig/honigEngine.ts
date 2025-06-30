import { QueryProcessor, type ProcessedQuery } from './queryProcessor';
import { SourceRetriever } from './sourceRetriever';
import { ContentSummarizer, type SummarizedResponse } from './contentSummarizer';
import { DatabaseQueryProcessor, type DatabaseQueryResult } from './databaseQueryProcessor';
import { WebScraper } from '../scraper/webScraper';
import type { SearchResult } from '../types';

export interface HonigConfig {
  geminiApiKey: string;
  serperApiKey?: string;
  newsApiKey?: string;
  supabaseClient?: any;
  maxSources?: number;
  scrapingTimeout?: number;
}

export interface HonigResponse {
  response: string;
  sources: SearchResult[];
  metadata: {
    originalQuery: string;
    refinedQuery?: string;
    queryType?: string;
    processingStages: {
      databaseCheck?: number;
      queryProcessing?: number;
      sourceRetrieval?: number;
      contentScraping?: number;
      synthesis?: number;
      total: number;
    };
    confidence: number;
    sourcesRetrieved: number;
    sourcesScraped: number;
    targetSources?: string[];
    databaseUsed?: boolean;
    databaseSource?: string;
  };
}

export class HonigEngine {
  private queryProcessor: QueryProcessor;
  private sourceRetriever: SourceRetriever;
  private contentSummarizer: ContentSummarizer;
  private databaseQueryProcessor: DatabaseQueryProcessor | null = null;
  private webScraper: WebScraper;
  private config: HonigConfig;

  constructor(config: HonigConfig) {
    this.config = {
      maxSources: 15,
      scrapingTimeout: 8000,
      ...config
    };

    if (!config.geminiApiKey) {
      throw new Error('Gemini API key is required for Honig');
    }

    this.queryProcessor = new QueryProcessor(config.geminiApiKey);
    this.sourceRetriever = new SourceRetriever(config.serperApiKey, config.newsApiKey);
    this.contentSummarizer = new ContentSummarizer(config.geminiApiKey);
    this.webScraper = new WebScraper();

    // Initialize database processor if Supabase client is provided
    if (config.supabaseClient) {
      this.databaseQueryProcessor = new DatabaseQueryProcessor(config.supabaseClient);
    }
  }

  async processQuery(userQuery: string): Promise<HonigResponse> {
    const totalStartTime = Date.now();
    const timings = {
      databaseCheck: 0,
      queryProcessing: 0,
      sourceRetrieval: 0,
      contentScraping: 0,
      synthesis: 0,
      total: 0
    };

    try {
      console.log('🚀 Honig: Starting query processing...');

      // Stage 0: Database Check (NEW STEP)
      if (this.databaseQueryProcessor) {
        console.log('📚 Stage 0: Checking database for existing responses...');
        const dbStart = Date.now();
        const databaseResult = await this.databaseQueryProcessor.processWithDatabase(userQuery);
        timings.databaseCheck = Date.now() - dbStart;

        if (databaseResult.found && databaseResult.response) {
          timings.total = Date.now() - totalStartTime;
          
          console.log('✅ Database response found, skipping internet search');
          console.log('⏱️ Database-only processing time:', timings.total, 'ms');

          return {
            response: databaseResult.response,
            sources: [],
            metadata: {
              originalQuery: userQuery,
              processingStages: timings,
              confidence: databaseResult.confidence,
              sourcesRetrieved: 0,
              sourcesScraped: 0,
              databaseUsed: true,
              databaseSource: databaseResult.source
            }
          };
        } else {
          console.log('📚 No sufficient database response found, proceeding to internet search...');
        }
      }

      // Stage 1: Query Processing with Gemini
      console.log('🧠 Stage 1: Processing query with Gemini...');
      const stage1Start = Date.now();
      const processedQuery = await this.queryProcessor.processQuery(userQuery);
      timings.queryProcessing = Date.now() - stage1Start;
      
      console.log('✅ Query processed:', {
        type: processedQuery.queryType,
        sources: processedQuery.targetSources,
        confidence: processedQuery.confidence
      });

      // Stage 2: Targeted Source Retrieval
      console.log('🔍 Stage 2: Retrieving from targeted sources...');
      const stage2Start = Date.now();
      const searchResults = await this.sourceRetriever.retrieveFromSources(
        processedQuery.searchTerms,
        processedQuery.targetSources,
        processedQuery.refinedQuery
      );
      timings.sourceRetrieval = Date.now() - stage2Start;
      
      console.log(`✅ Retrieved ${searchResults.length} sources from: ${processedQuery.targetSources.join(', ')}`);

      // Stage 3: Content Scraping
      console.log('🕷️ Stage 3: Scraping content from sources...');
      const stage3Start = Date.now();
      const scrapedContent = await this.scrapeContent(searchResults);
      timings.contentScraping = Date.now() - stage3Start;
      
      console.log(`✅ Successfully scraped ${scrapedContent.size}/${searchResults.length} sources`);

      // Stage 4: Content Synthesis with Gemini
      console.log('🧠 Stage 4: Synthesizing response with Gemini...');
      const stage4Start = Date.now();
      const synthesizedResponse = await this.contentSummarizer.summarizeAndSynthesize(
        processedQuery,
        searchResults,
        scrapedContent
      );
      timings.synthesis = Date.now() - stage4Start;
      
      timings.total = Date.now() - totalStartTime;

      console.log('✅ Honig: Query processing completed successfully');
      console.log('⏱️ Timing breakdown:', timings);

      return {
        response: synthesizedResponse.answer,
        sources: searchResults,
        metadata: {
          originalQuery: processedQuery.originalQuery,
          refinedQuery: processedQuery.refinedQuery,
          queryType: processedQuery.queryType,
          processingStages: timings,
          confidence: synthesizedResponse.confidence,
          sourcesRetrieved: searchResults.length,
          sourcesScraped: scrapedContent.size,
          targetSources: processedQuery.targetSources,
          databaseUsed: false
        }
      };

    } catch (error) {
      console.error('💥 Honig: Query processing failed:', error);
      throw new Error(`Honig processing failed: ${error.message}`);
    }
  }

  private async scrapeContent(searchResults: SearchResult[]): Promise<Map<string, string>> {
    const scrapedContent = new Map<string, string>();
    
    // Limit scraping to prevent timeouts
    const urlsToScrape = searchResults
      .slice(0, this.config.maxSources)
      .map(result => result.url);

    const scrapingResults = await this.webScraper.scrapeMultiple(urlsToScrape, {
      timeout: this.config.scrapingTimeout,
      maxContentLength: 15000
    });

    scrapingResults.forEach((result, index) => {
      if (!(result instanceof Error) && result.content.length > 100) {
        const url = urlsToScrape[index];
        scrapedContent.set(url, result.content);
      }
    });

    return scrapedContent;
  }

  // Method to check if Honig is properly configured
  isConfigured(): boolean {
    return !!this.config.geminiApiKey;
  }

  // Method to get configuration status
  getConfigurationStatus(): {
    hasGemini: boolean;
    hasSerper: boolean;
    hasNewsAPI: boolean;
    hasDatabase: boolean;
    isFullyConfigured: boolean;
  } {
    return {
      hasGemini: !!this.config.geminiApiKey,
      hasSerper: !!this.config.serperApiKey,
      hasNewsAPI: !!this.config.newsApiKey,
      hasDatabase: !!this.databaseQueryProcessor,
      isFullyConfigured: !!this.config.geminiApiKey && (!!this.config.serperApiKey || !!this.config.newsApiKey)
    };
  }
}