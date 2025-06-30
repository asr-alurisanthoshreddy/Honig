export interface CachedResponse {
  query: string;
  response: string;
  timestamp: Date;
  sources?: any[];
  metadata?: any;
}

export class FastResponseCache {
  private cache = new Map<string, CachedResponse>();
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  set(query: string, response: string, sources?: any[], metadata?: any): void {
    const normalizedQuery = this.normalizeQuery(query);
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(normalizedQuery, {
      query: normalizedQuery,
      response,
      timestamp: new Date(),
      sources,
      metadata
    });
  }

  get(query: string): CachedResponse | null {
    const normalizedQuery = this.normalizeQuery(query);
    const cached = this.cache.get(normalizedQuery);

    if (!cached) {
      return null;
    }

    // Check if cache entry is still valid
    const now = new Date();
    const age = now.getTime() - cached.timestamp.getTime();
    
    if (age > this.CACHE_DURATION) {
      this.cache.delete(normalizedQuery);
      return null;
    }

    return cached;
  }

  clear(): void {
    this.cache.clear();
  }

  // Find similar queries for follow-ups
  findSimilar(query: string, threshold = 0.7): CachedResponse | null {
    const normalizedQuery = this.normalizeQuery(query);
    const queryWords = normalizedQuery.split(' ');

    let bestMatch: CachedResponse | null = null;
    let bestScore = 0;

    for (const cached of this.cache.values()) {
      const cachedWords = cached.query.split(' ');
      const similarity = this.calculateSimilarity(queryWords, cachedWords);
      
      if (similarity > threshold && similarity > bestScore) {
        bestScore = similarity;
        bestMatch = cached;
      }
    }

    return bestMatch;
  }

  private calculateSimilarity(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
}