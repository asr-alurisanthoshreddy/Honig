import type { SearchResult } from '../types';

export interface SearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  name: string;
}

export interface SearchOptions {
  maxResults?: number;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
  language?: string;
  region?: string;
  safeSearch?: boolean;
}

export class SearchEngine {
  private providers: SearchProvider[] = [];
  private defaultProvider: SearchProvider | null = null;

  addProvider(provider: SearchProvider, isDefault = false) {
    this.providers.push(provider);
    if (isDefault || !this.defaultProvider) {
      this.defaultProvider = provider;
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.defaultProvider) {
      throw new Error('No search provider configured');
    }

    try {
      const results = await this.defaultProvider.search(query, {
        maxResults: 10,
        timeRange: 'all',
        safeSearch: true,
        ...options
      });

      return results.map(result => ({
        ...result,
        searchQuery: query,
        retrievedAt: new Date().toISOString()
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Search failed with ${this.defaultProvider.name}:`, errorMessage);
      throw new Error(`Search failed: ${errorMessage}`);
    }
  }

  async searchMultiple(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const promises = this.providers.map(async provider => {
      try {
        return await provider.search(query, options);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Search failed with ${provider.name}:`, errorMessage);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const combined = results.flat();
    
    // Deduplicate by URL
    const seen = new Set<string>();
    return combined.filter(result => {
      if (seen.has(result.url)) return false;
      seen.add(result.url);
      return true;
    });
  }

  getProviders(): string[] {
    return this.providers.map(p => p.name);
  }
}