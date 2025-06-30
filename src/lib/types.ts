export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  type: 'web' | 'news' | 'knowledge' | 'academic' | 'category';
  relevanceScore?: number;
  publishedAt?: string;
  searchQuery?: string;
  retrievedAt?: string;
  metadata?: {
    author?: string;
    sourceName?: string;
    imageUrl?: string;
    position?: number;
    displayLink?: string;
    type?: string;
    attributes?: any;
    category?: string;
    scrapedAt?: string;
  };
}

export interface LLMProvider {
  name: string;
  generateResponse(prompt: string, context?: string): Promise<string>;
  supportsStreaming?: boolean;
  maxTokens?: number;
  costPerToken?: number;
}

export interface QueryClassification {
  needsLiveData: boolean;
  queryType: 'factual' | 'conversational' | 'creative' | 'analytical' | 'code';
  confidence: number;
  suggestedModel?: string | null | undefined;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
}