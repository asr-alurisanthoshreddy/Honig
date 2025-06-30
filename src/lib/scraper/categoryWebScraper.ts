import { ContentExtractor, type ExtractedContent } from './contentExtractor';
import type { CategorySource } from '../rag/categoryManager';

export interface CategoryScrapingOptions {
  timeout?: number;
  maxContentLength?: number;
  maxSourcesPerCategory?: number;
  respectRobotsTxt?: boolean;
}

export interface CategoryScrapingResult {
  source: CategorySource;
  content: ExtractedContent | null;
  error?: string;
  scrapedAt: Date;
}

export class CategoryWebScraper {
  private contentExtractor: ContentExtractor;
  private defaultOptions: CategoryScrapingOptions = {
    timeout: 8000,
    maxContentLength: 20000,
    maxSourcesPerCategory: 3,
    respectRobotsTxt: true
  };

  constructor() {
    this.contentExtractor = new ContentExtractor();
  }

  async scrapeCategorySources(
    sources: CategorySource[], 
    query: string,
    options: CategoryScrapingOptions = {}
  ): Promise<CategoryScrapingResult[]> {
    const opts = { ...this.defaultOptions, ...options };
    const results: CategoryScrapingResult[] = [];
    
    // Limit sources per category
    const limitedSources = sources.slice(0, opts.maxSourcesPerCategory);
    
    console.log(`🕷️ Scraping ${limitedSources.length} category sources for query: "${query}"`);

    const scrapingPromises = limitedSources.map(async (source) => {
      try {
        const content = await this.scrapeSourceWithSearch(source, query, opts);
        return {
          source,
          content,
          scrapedAt: new Date()
        };
      } catch (error) {
        console.error(`Failed to scrape ${source.name}:`, error);
        return {
          source,
          content: null,
          error: error.message,
          scrapedAt: new Date()
        };
      }
    });

    const scrapingResults = await Promise.all(scrapingPromises);
    results.push(...scrapingResults);

    const successfulScrapes = results.filter(r => r.content !== null).length;
    console.log(`✅ Successfully scraped ${successfulScrapes}/${limitedSources.length} category sources`);

    return results;
  }

  private async scrapeSourceWithSearch(
    source: CategorySource, 
    query: string, 
    options: CategoryScrapingOptions
  ): Promise<ExtractedContent | null> {
    try {
      // First, try to get the main page content
      const mainContent = await this.scrapeUrl(source.url, options);
      
      if (mainContent && this.isContentRelevant(mainContent.content, query)) {
        return mainContent;
      }

      // If main page isn't relevant, try to find more specific content
      // This could be enhanced with site-specific search URLs
      const searchUrl = this.buildSearchUrl(source, query);
      if (searchUrl && searchUrl !== source.url) {
        const searchContent = await this.scrapeUrl(searchUrl, options);
        if (searchContent && this.isContentRelevant(searchContent.content, query)) {
          return searchContent;
        }
      }

      // Return main content even if not perfectly relevant
      return mainContent;
    } catch (error) {
      console.error(`Error scraping ${source.name}:`, error);
      return null;
    }
  }

  private async scrapeUrl(url: string, options: CategoryScrapingOptions): Promise<ExtractedContent | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        },
        redirect: 'follow'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      let html = await response.text();
      
      // Truncate if too long
      if (options.maxContentLength && html.length > options.maxContentLength) {
        html = html.substring(0, options.maxContentLength);
      }

      return await this.contentExtractor.extract(html, url);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${options.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildSearchUrl(source: CategorySource, query: string): string | null {
    const encodedQuery = encodeURIComponent(query);
    
    // Site-specific search URL patterns
    const searchPatterns: Record<string, string> = {
      'techcrunch.com': `${source.url}/search/${encodedQuery}`,
      'nature.com': `${source.url}/search?q=${encodedQuery}`,
      'science.org': `${source.url}/search?q=${encodedQuery}`,
      'sciencedaily.com': `${source.url}/search/?keyword=${encodedQuery}`,
      'theverge.com': `${source.url}/search?q=${encodedQuery}`,
      'arstechnica.com': `${source.url}/search/?query=${encodedQuery}`,
      'venturebeat.com': `${source.url}/search/?q=${encodedQuery}`,
      'scientificamerican.com': `${source.url}/search/?q=${encodedQuery}`,
      'newscientist.com': `${source.url}/search/?q=${encodedQuery}`,
      'phys.org': `${source.url}/search/?search=${encodedQuery}`,
      'carbonbrief.org': `${source.url}/search?q=${encodedQuery}`,
      'e360.yale.edu': `${source.url}/search?q=${encodedQuery}`
    };

    // Extract domain from URL
    try {
      const domain = new URL(source.url).hostname.replace('www.', '');
      return searchPatterns[domain] || null;
    } catch {
      return null;
    }
  }

  private isContentRelevant(content: string, query: string): boolean {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const contentLower = content.toLowerCase();
    
    // Check if at least 30% of query terms appear in content
    const matchingTerms = queryTerms.filter(term => contentLower.includes(term));
    const relevanceRatio = matchingTerms.length / queryTerms.length;
    
    return relevanceRatio >= 0.3 && content.length > 200;
  }

  // Method to check if a URL is scrapeable (respects robots.txt, etc.)
  async isUrlScrapeable(url: string): Promise<boolean> {
    try {
      // Basic check - could be enhanced with robots.txt parsing
      const response = await fetch(url, { 
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get content from multiple sources and merge
  async scrapeAndMergeContent(
    sources: CategorySource[], 
    query: string, 
    options: CategoryScrapingOptions = {}
  ): Promise<{
    mergedContent: string;
    sources: CategoryScrapingResult[];
    totalSources: number;
    successfulScrapes: number;
  }> {
    const results = await this.scrapeCategorySources(sources, query, options);
    
    const successfulResults = results.filter(r => r.content !== null);
    const mergedContent = successfulResults
      .map(r => `[Source: ${r.source.name}]\n${r.content!.content}`)
      .join('\n\n---\n\n');

    return {
      mergedContent,
      sources: results,
      totalSources: sources.length,
      successfulScrapes: successfulResults.length
    };
  }
}