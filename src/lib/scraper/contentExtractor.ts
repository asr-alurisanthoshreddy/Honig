import * as cheerio from 'cheerio';

export interface ExtractedContent {
  title: string;
  content: string;
  metadata: {
    author?: string;
    publishedAt?: string;
    description?: string;
    keywords?: string[];
    language?: string;
  };
  readabilityScore: number;
}

export class ContentExtractor {
  private static readonly CONTENT_SELECTORS = [
    'article',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.story-body',
    'main',
    '#content',
    '.main-content'
  ];

  private static readonly NOISE_SELECTORS = [
    'nav',
    'header',
    'footer',
    '.sidebar',
    '.advertisement',
    '.ads',
    '.social-share',
    '.comments',
    '.related-posts',
    'script',
    'style',
    'noscript'
  ];

  async extract(html: string, url: string): Promise<ExtractedContent> {
    const $ = cheerio.load(html);
    
    // Remove noise elements
    ContentExtractor.NOISE_SELECTORS.forEach(selector => {
      $(selector).remove();
    });

    const title = this.extractTitle($);
    const content = this.extractMainContent($);
    const metadata = this.extractMetadata($);
    const readabilityScore = this.calculateReadabilityScore(content);

    return {
      title,
      content: this.cleanContent(content),
      metadata,
      readabilityScore
    };
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    // Try multiple title sources in order of preference
    const titleSources = [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'h1',
      'title',
      '.article-title',
      '.post-title'
    ];

    for (const selector of titleSources) {
      const title = $(selector).first().attr('content') || $(selector).first().text();
      if (title && title.trim().length > 0) {
        return title.trim();
      }
    }

    return 'Untitled';
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    // Try content selectors in order of preference
    for (const selector of ContentExtractor.CONTENT_SELECTORS) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text();
        if (text.length > 200) { // Minimum content length
          return text;
        }
      }
    }

    // Fallback: extract all paragraph text
    const paragraphs = $('p').map((_, el) => $(el).text()).get();
    return paragraphs.join('\n\n');
  }

  private extractMetadata($: cheerio.CheerioAPI) {
    return {
      author: $('meta[name="author"]').attr('content') || 
              $('meta[property="article:author"]').attr('content') ||
              $('.author').first().text() || undefined,
      
      publishedAt: $('meta[property="article:published_time"]').attr('content') ||
                   $('meta[name="date"]').attr('content') ||
                   $('time').first().attr('datetime') || undefined,
      
      description: $('meta[name="description"]').attr('content') ||
                   $('meta[property="og:description"]').attr('content') || undefined,
      
      keywords: $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || [],
      
      language: $('html').attr('lang') || 
                $('meta[http-equiv="content-language"]').attr('content') || undefined
    };
  }

  private calculateReadabilityScore(content: string): number {
    if (!content || content.length < 100) return 0;

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = this.estimateSyllables(words);
    
    // Simplified Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, score / 100));
  }

  private estimateSyllables(words: string[]): number {
    const totalSyllables = words.reduce((sum, word) => {
      return sum + this.countSyllables(word.toLowerCase());
    }, 0);
    
    return totalSyllables / words.length;
  }

  private countSyllables(word: string): number {
    if (word.length <= 3) return 1;
    
    const vowels = word.match(/[aeiouy]+/g);
    let count = vowels ? vowels.length : 1;
    
    // Adjust for silent e
    if (word.endsWith('e')) count--;
    
    return Math.max(1, count);
  }

  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n\n') // Clean up line breaks
      .trim();
  }
}