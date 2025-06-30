import type { SearchProvider, SearchOptions } from '../searchEngine';
import type { SearchResult } from '../../types';

export class SerperProvider implements SearchProvider {
  name = 'Serper';
  private apiKey: string;
  private baseUrl = 'https://google.serper.dev/search';
  private isHealthy = false;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_serper_api_key_here') {
      throw new Error('Valid Serper API key is required');
    }
    
    this.apiKey = apiKey;
    this.isHealthy = true;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isHealthy) {
      throw new Error('Serper provider is not properly configured');
    }

    const searchParams = {
      q: query,
      num: options.maxResults || 10,
      gl: options.region || 'us',
      hl: options.language || 'en'
    };

    if (options.timeRange && options.timeRange !== 'all') {
      const timeMap = {
        day: 'd1',
        week: 'w1', 
        month: 'm1',
        year: 'y1'
      };
      searchParams['tbs'] = `qdr:${timeMap[options.timeRange]}`;
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchParams)
      });

      if (!response.ok) {
        if (response.status === 403) {
          this.isHealthy = false;
          throw new Error(`Serper API authentication failed (403). Please check your API key.`);
        } else if (response.status === 429) {
          throw new Error(`Serper API rate limit exceeded. Please try again later.`);
        } else if (response.status === 402) {
          throw new Error(`Serper API quota exceeded. Please check your billing.`);
        } else {
          throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      return this.parseResults(data);
    } catch (error) {
      console.error('Serper search error:', error);
      
      // Mark as unhealthy if it's an auth issue
      if (error.message.includes('403') || error.message.includes('authentication')) {
        this.isHealthy = false;
      }
      
      throw error;
    }
  }

  private parseResults(data: any): SearchResult[] {
    const results: SearchResult[] = [];

    // Organic results
    if (data.organic) {
      results.push(...data.organic.map((item: any) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet || '',
        source: 'serper',
        type: 'web' as const,
        relevanceScore: 0.8,
        metadata: {
          position: item.position,
          displayLink: item.displayLink
        }
      })));
    }

    // News results
    if (data.news) {
      results.push(...data.news.map((item: any) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet || '',
        source: 'serper',
        type: 'news' as const,
        relevanceScore: 0.9,
        publishedAt: item.date,
        metadata: {
          imageUrl: item.imageUrl,
          source: item.source
        }
      })));
    }

    // Knowledge graph
    if (data.knowledgeGraph) {
      const kg = data.knowledgeGraph;
      results.unshift({
        title: kg.title,
        url: kg.website || kg.descriptionLink || '',
        snippet: kg.description || '',
        source: 'serper',
        type: 'knowledge' as const,
        relevanceScore: 1.0,
        metadata: {
          type: kg.type,
          imageUrl: kg.imageUrl,
          attributes: kg.attributes
        }
      });
    }

    return results;
  }

  isHealthy(): boolean {
    return this.isHealthy;
  }
}