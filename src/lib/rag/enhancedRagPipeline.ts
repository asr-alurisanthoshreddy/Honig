import { SearchEngine } from '../search/searchEngine';
import { WebScraper } from '../scraper/webScraper';
import { CategoryWebScraper, type CategoryScrapingResult } from '../scraper/categoryWebScraper';
import { CategoryManager } from './categoryManager';
import { DocumentChunker, type DocumentChunk } from './documentChunker';
import { CitationEngine } from './citationEngine';
import type { SearchResult } from '../types';

export interface EnhancedRAGOptions {
  maxSources?: number;
  maxCategorySources?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  minRelevanceScore?: number;
  includeNews?: boolean;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
  preferCategorySources?: boolean;
  categoryTimeout?: number;
}

export interface EnhancedRAGResult {
  context: string;
  sources: SearchResult[];
  categorySources: CategoryScrapingResult[];
  chunks: DocumentChunk[];
  citations: Map<string, string[]>;
  metadata: {
    totalSources: number;
    successfulScrapes: number;
    categorySourcesUsed: number;
    webSourcesUsed: number;
    processingTime: number;
    query: string;
    categoriesMatched: string[];
    searchFallbackUsed: boolean;
  };
}

export class EnhancedRAGPipeline {
  private searchEngine: SearchEngine;
  private webScraper: WebScraper;
  private categoryWebScraper: CategoryWebScraper;
  private categoryManager: CategoryManager;
  private documentChunker: DocumentChunker;
  private citationEngine: CitationEngine;

  constructor(searchEngine: SearchEngine) {
    this.searchEngine = searchEngine;
    this.webScraper = new WebScraper();
    this.categoryWebScraper = new CategoryWebScraper();
    this.categoryManager = new CategoryManager();
    this.documentChunker = new DocumentChunker();
    this.citationEngine = new CitationEngine();
  }

  async process(query: string, options: EnhancedRAGOptions = {}): Promise<EnhancedRAGResult> {
    const startTime = Date.now();
    const opts = {
      maxSources: 5,
      maxCategorySources: 3,
      chunkSize: 1000,
      chunkOverlap: 200,
      minRelevanceScore: 0.3,
      includeNews: true,
      timeRange: 'all' as const,
      preferCategorySources: true,
      categoryTimeout: 10000,
      ...options
    };

    try {
      console.log('🔍 Starting Enhanced RAG Pipeline for query:', query);

      // Step 1: Classify query into categories
      const matchedCategories = this.categoryManager.classifyQuery(query);
      console.log('📂 Matched categories:', matchedCategories);

      let categorySources: CategoryScrapingResult[] = [];
      let webSources: SearchResult[] = [];
      let searchFallbackUsed = false;

      // Step 2: Try category-specific sources first
      if (matchedCategories.length > 0 && opts.preferCategorySources) {
        console.log('🎯 Scraping category-specific sources...');
        
        const categorySourceList = this.categoryManager.getMultipleCategorySources(matchedCategories);
        
        try {
          categorySources = await Promise.race([
            this.categoryWebScraper.scrapeCategorySources(
              categorySourceList.slice(0, opts.maxCategorySources), 
              query,
              { 
                timeout: 8000,
                maxContentLength: 15000,
                maxSourcesPerCategory: 2
              }
            ),
            new Promise<CategoryScrapingResult[]>((_, reject) => 
              setTimeout(() => reject(new Error('Category scraping timeout')), opts.categoryTimeout)
            )
          ]);

          console.log(`✅ Category scraping completed: ${categorySources.filter(s => s.content).length} successful`);
        } catch (error) {
          console.warn('⚠️ Category scraping failed or timed out:', error.message);
          categorySources = [];
        }
      }

      // Step 3: Check if we have enough quality content from categories
      const successfulCategorySources = categorySources.filter(s => s.content && s.content.content.length > 300);
      const hasGoodCategoryContent = successfulCategorySources.length >= 2;

      // Step 4: Fall back to general web search if needed
      if (!hasGoodCategoryContent) {
        console.log('🌐 Falling back to general web search...');
        searchFallbackUsed = true;

        try {
          const searchResults = await this.searchEngine.search(query, {
            maxResults: opts.maxSources * 2,
            timeRange: opts.timeRange
          });

          // Filter by relevance score
          const relevantSources = searchResults
            .filter(result => (result.relevanceScore || 0) >= opts.minRelevanceScore)
            .slice(0, opts.maxSources);

          console.log(`📄 Found ${relevantSources.length} relevant web sources`);

          // Scrape web sources
          if (relevantSources.length > 0) {
            console.log('🕷️ Scraping web sources...');
            const scrapingResults = await this.webScraper.scrapeMultiple(
              relevantSources.map(source => source.url),
              { timeout: 8000, maxContentLength: 20000 }
            );

            // Process successful scrapes
            scrapingResults.forEach((result, index) => {
              if (!(result instanceof Error) && result.content.length > 100) {
                webSources.push(relevantSources[index]);
              }
            });

            console.log(`✅ Successfully scraped ${webSources.length} web sources`);
          }
        } catch (error) {
          console.error('❌ Web search fallback failed:', error);
        }
      }

      // Step 5: Combine and process all content
      console.log('📝 Processing and chunking content...');
      
      const allDocuments: Array<{ content: string; source: string; metadata?: any }> = [];

      // Add category source content
      successfulCategorySources.forEach(categoryResult => {
        if (categoryResult.content) {
          allDocuments.push({
            content: categoryResult.content.content,
            source: categoryResult.source.url,
            metadata: {
              title: categoryResult.content.title,
              url: categoryResult.source.url,
              type: 'category',
              sourceName: categoryResult.source.name,
              scrapedAt: categoryResult.scrapedAt,
              category: matchedCategories[0] // Primary category
            }
          });
        }
      });

      // Add web source content (if used)
      if (searchFallbackUsed && webSources.length > 0) {
        const webScrapingResults = await this.webScraper.scrapeMultiple(
          webSources.map(source => source.url),
          { timeout: 6000, maxContentLength: 15000 }
        );

        webScrapingResults.forEach((result, index) => {
          if (!(result instanceof Error) && result.content.length > 100) {
            allDocuments.push({
              content: result.content,
              source: webSources[index].url,
              metadata: {
                title: webSources[index].title,
                url: webSources[index].url,
                type: 'web',
                sourceName: webSources[index].source,
                searchResult: webSources[index]
              }
            });
          }
        });
      }

      // Step 6: Chunk documents
      const chunks = this.documentChunker.chunkMultiple(allDocuments, {
        chunkSize: opts.chunkSize,
        chunkOverlap: opts.chunkOverlap
      });

      // Step 7: Rank chunks by relevance
      const rankedChunks = this.rankChunks(chunks, query);

      // Step 8: Build context and citations
      const topChunks = rankedChunks.slice(0, 12); // Top 12 chunks
      const context = this.buildContext(topChunks);
      const citations = this.citationEngine.generateCitations(topChunks, context);

      const processingTime = Date.now() - startTime;

      // Step 9: Format sources for response
      const formattedSources: SearchResult[] = [
        // Category sources
        ...successfulCategorySources.map(cs => ({
          title: cs.content?.title || cs.source.name,
          url: cs.source.url,
          snippet: cs.content?.content.substring(0, 200) + '...' || '',
          source: cs.source.name,
          type: 'category' as const,
          relevanceScore: 0.9,
          metadata: {
            category: matchedCategories[0],
            scrapedAt: cs.scrapedAt.toISOString()
          }
        })),
        // Web sources
        ...webSources
      ];

      return {
        context,
        sources: formattedSources,
        categorySources,
        chunks: rankedChunks,
        citations,
        metadata: {
          totalSources: categorySources.length + webSources.length,
          successfulScrapes: successfulCategorySources.length + webSources.length,
          categorySourcesUsed: successfulCategorySources.length,
          webSourcesUsed: webSources.length,
          processingTime,
          query,
          categoriesMatched: matchedCategories,
          searchFallbackUsed
        }
      };

    } catch (error) {
      console.error('💥 Enhanced RAG Pipeline error:', error);
      throw new Error(`Enhanced RAG processing failed: ${error.message}`);
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

    // Boost score for category sources
    if (chunk.metadata.type === 'category') {
      score *= 1.3;
    }

    // Boost score for chunks with titles
    if (chunk.metadata.title) {
      const titleLower = chunk.metadata.title.toLowerCase();
      const titleMatches = queryTerms.filter(term => titleLower.includes(term)).length;
      score += titleMatches * 2;
    }

    // Normalize by content length
    return score / (chunk.content.length / 1000);
  }

  private buildContext(chunks: DocumentChunk[]): string {
    if (chunks.length === 0) return '';

    const contextParts: string[] = [];
    
    chunks.forEach((chunk, index) => {
      const source = chunk.metadata.title || chunk.metadata.sourceName || chunk.metadata.url || 'Unknown source';
      const sourceType = chunk.metadata.type === 'category' ? '🎯' : '🌐';
      contextParts.push(`[${sourceType} Source ${index + 1}: ${source}]\n${chunk.content}\n`);
    });

    return contextParts.join('\n---\n\n');
  }

  // Method to get available categories
  getAvailableCategories() {
    return this.categoryManager.getAllCategories();
  }

  // Method to check if a query would benefit from category search
  static shouldUseCategorySearch(query: string): boolean {
    const categoryIndicators = [
      /\b(latest|recent|current|new|breakthrough|development)\b/i,
      /\b(research|study|paper|publication|journal)\b/i,
      /\b(technology|tech|ai|artificial intelligence|machine learning)\b/i,
      /\b(biology|medical|health|drug|treatment|disease)\b/i,
      /\b(environment|climate|sustainability|renewable)\b/i,
      /\b(startup|funding|investment|venture|business)\b/i,
      /\b(science|scientific|discovery|experiment)\b/i
    ];

    return categoryIndicators.some(pattern => pattern.test(query));
  }
}