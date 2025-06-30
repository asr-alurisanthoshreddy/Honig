import { SearchEngine } from '../search/searchEngine';
import { WebScraper } from '../scraper/webScraper';
import { DocumentChunker, type DocumentChunk } from './documentChunker';
import { CitationEngine } from './citationEngine';
import type { SearchResult } from '../types';

export interface RAGOptions {
  maxSources?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  minRelevanceScore?: number;
  includeNews?: boolean;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
}

export interface RAGResult {
  context: string;
  sources: SearchResult[];
  chunks: DocumentChunk[];
  citations: Map<string, string[]>;
  metadata: {
    totalSources: number;
    successfulScrapes: number;
    processingTime: number;
    query: string;
  };
}

export class RAGPipeline {
  private searchEngine: SearchEngine;
  private webScraper: WebScraper;
  private documentChunker: DocumentChunker;
  private citationEngine: CitationEngine;

  constructor(searchEngine: SearchEngine) {
    this.searchEngine = searchEngine;
    this.webScraper = new WebScraper();
    this.documentChunker = new DocumentChunker();
    this.citationEngine = new CitationEngine();
  }

  async process(query: string, options: RAGOptions = {}): Promise<RAGResult> {
    const startTime = Date.now();
    const opts = {
      maxSources: 5,
      chunkSize: 1000,
      chunkOverlap: 200,
      minRelevanceScore: 0.3,
      includeNews: true,
      timeRange: 'all' as const,
      ...options
    };

    try {
      // Step 1: Search for relevant sources
      console.log('🔍 Searching for sources...');
      const searchResults = await this.searchEngine.search(query, {
        maxResults: opts.maxSources * 2, // Get more results to filter
        timeRange: opts.timeRange
      });

      // Filter by relevance score
      const relevantSources = searchResults
        .filter(result => (result.relevanceScore || 0) >= opts.minRelevanceScore)
        .slice(0, opts.maxSources);

      console.log(`📄 Found ${relevantSources.length} relevant sources`);

      // Step 2: Scrape content from sources
      console.log('🕷️ Scraping content...');
      const scrapingResults = await this.webScraper.scrapeMultiple(
        relevantSources.map(source => source.url),
        { timeout: 8000, maxContentLength: 20000 }
      );

      // Process successful scrapes
      const successfulScrapes: Array<{ content: string; source: SearchResult }> = [];
      scrapingResults.forEach((result, index) => {
        if (!(result instanceof Error) && result.content.length > 100) {
          successfulScrapes.push({
            content: result.content,
            source: relevantSources[index]
          });
        }
      });

      console.log(`✅ Successfully scraped ${successfulScrapes.length} sources`);

      // Step 3: Chunk documents
      console.log('📝 Chunking documents...');
      const documents = successfulScrapes.map(({ content, source }) => ({
        content,
        source: source.url,
        metadata: {
          title: source.title,
          url: source.url,
          type: source.type,
          publishedAt: source.publishedAt
        }
      }));

      const chunks = this.documentChunker.chunkMultiple(documents, {
        chunkSize: opts.chunkSize,
        chunkOverlap: opts.chunkOverlap
      });

      // Step 4: Rank chunks by relevance to query
      const rankedChunks = this.rankChunks(chunks, query);

      // Step 5: Build context and citations
      const context = this.buildContext(rankedChunks.slice(0, 10)); // Top 10 chunks
      const citations = this.citationEngine.generateCitations(rankedChunks, context);

      const processingTime = Date.now() - startTime;

      return {
        context,
        sources: successfulScrapes.map(s => s.source),
        chunks: rankedChunks,
        citations,
        metadata: {
          totalSources: relevantSources.length,
          successfulScrapes: successfulScrapes.length,
          processingTime,
          query
        }
      };
    } catch (error) {
      console.error('RAG Pipeline error:', error);
      throw new Error(`RAG processing failed: ${error.message}`);
    }
  }

  private rankChunks(chunks: DocumentChunk[], query: string): DocumentChunk[] {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    
    return chunks
      .map(chunk => ({
        ...chunk,
        relevanceScore: this.calculateChunkRelevance(chunk, queryTerms)
      }))
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  private calculateChunkRelevance(chunk: DocumentChunk, queryTerms: string[]): number {
    const content = chunk.content.toLowerCase();
    let score = 0;

    queryTerms.forEach(term => {
      const termCount = (content.match(new RegExp(term, 'g')) || []).length;
      score += termCount * (term.length / 10); // Longer terms get higher weight
    });

    // Boost score for chunks from knowledge sources
    if (chunk.metadata.url && chunk.metadata.title) {
      score *= 1.2;
    }

    // Normalize by content length
    return score / (chunk.content.length / 1000);
  }

  private buildContext(chunks: DocumentChunk[]): string {
    if (chunks.length === 0) return '';

    const contextParts: string[] = [];
    
    chunks.forEach((chunk, index) => {
      const source = chunk.metadata.title || chunk.metadata.url || 'Unknown source';
      contextParts.push(`[Source ${index + 1}: ${source}]\n${chunk.content}\n`);
    });

    return contextParts.join('\n---\n\n');
  }

  // Method to check if a query needs live data
  static needsLiveData(query: string): boolean {
    const liveDataIndicators = [
      // Time-sensitive queries
      /\b(latest|recent|current|today|yesterday|this week|this month|now|breaking)\b/i,
      /\b(news|updates|developments|happening)\b/i,
      
      // Market/financial queries
      /\b(stock price|market|trading|crypto|bitcoin|ethereum)\b/i,
      
      // Weather queries
      /\b(weather|temperature|forecast|rain|snow)\b/i,
      
      // Sports scores/results
      /\b(score|game|match|tournament|championship)\b/i,
      
      // Technology/product releases
      /\b(release|launch|announcement|version|update)\b/i,
      
      // Events and schedules
      /\b(schedule|event|conference|meeting|deadline)\b/i,
      
      // Real-time data
      /\b(live|real.?time|streaming|status)\b/i
    ];

    return liveDataIndicators.some(pattern => pattern.test(query));
  }
}