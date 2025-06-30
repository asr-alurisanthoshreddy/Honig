// Fast response cache for instant replies to common queries
export class FastResponseCache {
  private cache = new Map<string, { response: string; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  // Common responses for instant replies
  private readonly commonResponses = new Map([
    ['hi', 'Hello! I\'m **Honig**, your AI research assistant. How can I help you today?'],
    ['hello', 'Hello! I\'m **Honig**, your AI research assistant. How can I help you today?'],
    ['hey', 'Hey there! I\'m **Honig**. What would you like to research or learn about?'],
    ['who are you', 'I\'m **Honig**, an advanced AI research assistant developed by **Honig**. I can help you find accurate, up-to-date information on any topic by searching multiple sources in real-time.'],
    ['what are you', 'I\'m **Honig**, an AI assistant specialized in real-time information retrieval and research. I can search Wikipedia, news sources, academic papers, and forums to provide comprehensive answers.'],
    ['help', 'I\'m **Honig** and I can help you with:\n\n🔍 **Research** - Find information on any topic\n📰 **Current Events** - Latest news and developments\n💻 **Programming** - Code examples and technical help\n📚 **Learning** - Explanations and educational content\n\nJust ask me anything!'],
    ['thanks', 'You\'re welcome! I\'m always here to help with your research and questions.'],
    ['thank you', 'You\'re very welcome! Feel free to ask me anything else you\'d like to know.']
  ]);

  getInstantResponse(query: string): string | null {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check common responses first
    if (this.commonResponses.has(normalizedQuery)) {
      return this.commonResponses.get(normalizedQuery)!;
    }

    // Check cache
    const cached = this.cache.get(normalizedQuery);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.response;
    }

    // Clean expired entries
    if (cached) {
      this.cache.delete(normalizedQuery);
    }

    return null;
  }

  setCachedResponse(query: string, response: string): void {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Don't cache common responses (they're already in memory)
    if (this.commonResponses.has(normalizedQuery)) {
      return;
    }

    this.cache.set(normalizedQuery, {
      response,
      timestamp: Date.now()
    });

    // Clean old entries if cache is too large
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const fastCache = new FastResponseCache();