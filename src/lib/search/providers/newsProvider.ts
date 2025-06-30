import type { SearchProvider, SearchOptions } from '../searchEngine';
import type { SearchResult } from '../../types';

export class NewsProvider implements SearchProvider {
  name = 'NewsAPI';
  private apiKey: string;
  private baseUrl = 'https://newsapi.org/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error('NewsAPI key not configured');
    }

    const params = new URLSearchParams({
      q: query,
      apiKey: this.apiKey,
      pageSize: String(options.maxResults || 10),
      language: options.language || 'en',
      sortBy: 'relevancy'
    });

    if (options.timeRange && options.timeRange !== 'all') {
      const date = new Date();
      switch (options.timeRange) {
        case 'day':
          date.setDate(date.getDate() - 1);
          break;
        case 'week':
          date.setDate(date.getDate() - 7);
          break;
        case 'month':
          date.setMonth(date.getMonth() - 1);
          break;
        case 'year':
          date.setFullYear(date.getFullYear() - 1);
          break;
      }
      params.append('from', date.toISOString().split('T')[0]);
    }

    try {
      const response = await fetch(`${this.baseUrl}/everything?${params}`);
      
      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${data.message}`);
      }

      return data.articles.map((article: any, index: number) => ({
        title: article.title,
        url: article.url,
        snippet: article.description || '',
        source: 'newsapi',
        type: 'news' as const,
        relevanceScore: Math.max(0.1, 1 - (index * 0.1)),
        publishedAt: article.publishedAt,
        metadata: {
          author: article.author,
          sourceName: article.source?.name,
          imageUrl: article.urlToImage
        }
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('NewsAPI search error:', errorMessage);
      throw error;
    }
  }
}