import type { SearchResult } from '../types';

export interface SourceConfig {
  name: string;
  baseUrl: string;
  searchPath: string;
  priority: number;
  maxResults: number;
}

export class SourceRetriever {
  private sources: Map<string, SourceConfig> = new Map();
  private serperApiKey: string;
  private newsApiKey: string;

  constructor(serperApiKey?: string, newsApiKey?: string) {
    this.serperApiKey = serperApiKey || '';
    this.newsApiKey = newsApiKey || '';
    this.initializeSources();
  }

  private initializeSources() {
    // Wikipedia
    this.sources.set('wikipedia', {
      name: 'Wikipedia',
      baseUrl: 'https://en.wikipedia.org',
      searchPath: '/w/api.php',
      priority: 9,
      maxResults: 3
    });

    // Reddit (via Google Search with site filter)
    this.sources.set('reddit', {
      name: 'Reddit',
      baseUrl: 'https://www.reddit.com',
      searchPath: '',
      priority: 8,
      maxResults: 4
    });

    // Quora (via Google Search with site filter)
    this.sources.set('quora', {
      name: 'Quora',
      baseUrl: 'https://www.quora.com',
      searchPath: '',
      priority: 7,
      maxResults: 3
    });

    // News sources
    this.sources.set('news', {
      name: 'News',
      baseUrl: '',
      searchPath: '',
      priority: 9,
      maxResults: 5
    });

    // Academic/Technical forums
    this.sources.set('academic', {
      name: 'Academic',
      baseUrl: '',
      searchPath: '',
      priority: 8,
      maxResults: 3
    });

    // General forums
    this.sources.set('forums', {
      name: 'Forums',
      baseUrl: '',
      searchPath: '',
      priority: 6,
      maxResults: 3
    });
  }

  async retrieveFromSources(
    searchTerms: string[], 
    targetSources: string[], 
    refinedQuery: string
  ): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    
    console.log(`🔍 Honig: Retrieving from sources: ${targetSources.join(', ')}`);
    
    for (const sourceType of targetSources) {
      try {
        const results = await this.retrieveFromSource(sourceType, searchTerms, refinedQuery);
        allResults.push(...results);
      } catch (error) {
        console.error(`Failed to retrieve from ${sourceType}:`, error);
      }
    }

    // Sort by relevance and priority
    return allResults
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 15); // Limit total results
  }

  private async retrieveFromSource(
    sourceType: string, 
    searchTerms: string[], 
    refinedQuery: string
  ): Promise<SearchResult[]> {
    const source = this.sources.get(sourceType);
    if (!source) return [];

    switch (sourceType) {
      case 'wikipedia':
        return this.searchWikipedia(searchTerms, refinedQuery);
      
      case 'reddit':
        return this.searchReddit(searchTerms, refinedQuery);
      
      case 'quora':
        return this.searchQuora(searchTerms, refinedQuery);
      
      case 'news':
        return this.searchNews(searchTerms, refinedQuery);
      
      case 'academic':
        return this.searchAcademic(searchTerms, refinedQuery);
      
      case 'forums':
        return this.searchForums(searchTerms, refinedQuery);
      
      default:
        return [];
    }
  }

  private async searchWikipedia(searchTerms: string[], query: string): Promise<SearchResult[]> {
    try {
      const searchQuery = searchTerms.join(' ');
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*&srlimit=3`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.query?.search) return [];
      
      return data.query.search.map((item: any, index: number) => ({
        title: item.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
        snippet: item.snippet.replace(/<[^>]*>/g, ''), // Remove HTML tags
        source: 'wikipedia',
        type: 'knowledge' as const,
        relevanceScore: Math.max(0.1, 0.9 - (index * 0.1)),
        metadata: {
          wordcount: item.wordcount,
          timestamp: item.timestamp
        }
      }));
    } catch (error) {
      console.error('Wikipedia search failed:', error);
      return [];
    }
  }

  private async searchReddit(searchTerms: string[], query: string): Promise<SearchResult[]> {
    if (!this.serperApiKey) return [];

    try {
      const searchQuery = `site:reddit.com ${searchTerms.join(' ')}`;
      return this.searchWithSerper(searchQuery, 'reddit', 4);
    } catch (error) {
      console.error('Reddit search failed:', error);
      return [];
    }
  }

  private async searchQuora(searchTerms: string[], query: string): Promise<SearchResult[]> {
    if (!this.serperApiKey) return [];

    try {
      const searchQuery = `site:quora.com ${searchTerms.join(' ')}`;
      return this.searchWithSerper(searchQuery, 'quora', 3);
    } catch (error) {
      console.error('Quora search failed:', error);
      return [];
    }
  }

  private async searchNews(searchTerms: string[], query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // Try NewsAPI first
    if (this.newsApiKey) {
      try {
        const newsResults = await this.searchWithNewsAPI(searchTerms.join(' '));
        results.push(...newsResults);
      } catch (error) {
        console.error('NewsAPI search failed:', error);
      }
    }

    // Fallback to Serper for news
    if (results.length === 0 && this.serperApiKey) {
      try {
        const serperResults = await this.searchWithSerper(searchTerms.join(' '), 'news', 5);
        results.push(...serperResults);
      } catch (error) {
        console.error('Serper news search failed:', error);
      }
    }

    return results;
  }

  private async searchAcademic(searchTerms: string[], query: string): Promise<SearchResult[]> {
    if (!this.serperApiKey) return [];

    try {
      const searchQuery = `${searchTerms.join(' ')} site:arxiv.org OR site:scholar.google.com OR site:researchgate.net`;
      return this.searchWithSerper(searchQuery, 'academic', 3);
    } catch (error) {
      console.error('Academic search failed:', error);
      return [];
    }
  }

  private async searchForums(searchTerms: string[], query: string): Promise<SearchResult[]> {
    if (!this.serperApiKey) return [];

    try {
      const searchQuery = `${searchTerms.join(' ')} site:stackoverflow.com OR site:stackexchange.com OR site:discourse.org`;
      return this.searchWithSerper(searchQuery, 'forums', 3);
    } catch (error) {
      console.error('Forums search failed:', error);
      return [];
    }
  }

  private async searchWithSerper(query: string, sourceType: string, maxResults: number): Promise<SearchResult[]> {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.serperApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num: maxResults
      })
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    
    const results: SearchResult[] = [];

    // Process organic results
    if (data.organic) {
      results.push(...data.organic.map((item: any, index: number) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet || '',
        source: sourceType,
        type: sourceType === 'news' ? 'news' as const : 'web' as const,
        relevanceScore: Math.max(0.1, 0.9 - (index * 0.1)),
        metadata: {
          position: item.position,
          displayLink: item.displayLink
        }
      })));
    }

    return results;
  }

  private async searchWithNewsAPI(query: string): Promise<SearchResult[]> {
    const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${this.newsApiKey}&pageSize=5&sortBy=relevancy`);
    
    // Handle NewsAPI quota exceeded (426 Payment Required)
    if (response.status === 426) {
      console.warn('NewsAPI quota exceeded or payment required. Skipping NewsAPI search.');
      return [];
    }
    
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.articles) return [];

    return data.articles.map((article: any, index: number) => ({
      title: article.title,
      url: article.url,
      snippet: article.description || '',
      source: 'news',
      type: 'news' as const,
      relevanceScore: Math.max(0.1, 0.9 - (index * 0.1)),
      publishedAt: article.publishedAt,
      metadata: {
        author: article.author,
        sourceName: article.source?.name,
        imageUrl: article.urlToImage
      }
    }));
  }
}