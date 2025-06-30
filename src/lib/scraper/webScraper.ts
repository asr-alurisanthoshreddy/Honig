import { ContentExtractor, type ExtractedContent } from './contentExtractor';

export interface ScrapingOptions {
  timeout?: number;
  userAgent?: string;
  maxContentLength?: number;
  followRedirects?: boolean;
  useCorsProxy?: boolean;
}

export class WebScraper {
  private contentExtractor: ContentExtractor;
  private defaultOptions: ScrapingOptions = {
    timeout: 10000,
    userAgent: 'Mozilla/5.0 (compatible; LiveLLMAgent/1.0)',
    maxContentLength: 50000,
    followRedirects: true,
    useCorsProxy: false
  };

  // List of domains known to have CORS issues
  private corsProblematicDomains = [
    'reddit.com',
    'twitter.com',
    'x.com',
    'facebook.com',
    'instagram.com',
    'linkedin.com',
    'researchgate.net',
    'academia.edu'
  ];

  constructor() {
    this.contentExtractor = new ContentExtractor();
  }

  async scrape(url: string, options: ScrapingOptions = {}): Promise<ExtractedContent> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      // Validate URL
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }

      // Check if this domain is known to have CORS issues
      const domain = urlObj.hostname.toLowerCase();
      const hasCorsIssues = this.corsProblematicDomains.some(problematicDomain => 
        domain.includes(problematicDomain)
      );

      if (hasCorsIssues) {
        console.warn(`⚠️ Skipping ${domain} - known CORS restrictions`);
        throw new Error(`CORS_BLOCKED: ${domain} blocks cross-origin requests`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

      try {
        // Try direct fetch first
        let fetchUrl = url;
        
        // For some sites, try using a CORS proxy as fallback
        if (opts.useCorsProxy) {
          fetchUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        }

        const response = await fetch(fetchUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': opts.userAgent!,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache'
          },
          redirect: opts.followRedirects ? 'follow' : 'manual',
          mode: 'cors'
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let html: string;
        
        if (opts.useCorsProxy) {
          const data = await response.json();
          html = data.contents;
        } else {
          const contentType = response.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
            throw new Error(`Unsupported content type: ${contentType}`);
          }
          html = await response.text();
        }
        
        // Truncate if too long
        if (opts.maxContentLength && html.length > opts.maxContentLength) {
          html = html.substring(0, opts.maxContentLength);
        }

        return await this.contentExtractor.extract(html, url);
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${opts.timeout}ms`);
      }
      
      // Handle specific error types
      if (error instanceof Error && (error.message.includes('CORS') || error.message.includes('cors'))) {
        throw new Error(`CORS_BLOCKED: ${url} - Cross-origin request blocked by browser`);
      }
      
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        // Try with CORS proxy if not already tried
        if (!opts.useCorsProxy && !this.corsProblematicDomains.some(domain => url.includes(domain))) {
          console.log(`🔄 Retrying ${url} with CORS proxy...`);
          try {
            return await this.scrape(url, { ...opts, useCorsProxy: true });
          } catch (proxyError) {
            const proxyErrorMessage = proxyError instanceof Error ? proxyError.message : String(proxyError);
            const originalErrorMessage = error.message;
            throw new Error(`FETCH_FAILED: ${url} - ${originalErrorMessage} (proxy also failed: ${proxyErrorMessage})`);
          }
        } else {
          throw new Error(`FETCH_FAILED: ${url} - ${error.message}`);
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Scraping failed for ${url}:`, errorMessage);
      throw new Error(`SCRAPE_ERROR: Failed to scrape ${url}: ${errorMessage}`);
    }
  }

  async scrapeMultiple(urls: string[], options: ScrapingOptions = {}): Promise<(ExtractedContent | Error)[]> {
    const promises = urls.map(url => 
      Promise.resolve().then(async () => {
        try {
          return await this.scrape(url, options);
        } catch (error) {
          // Return error object instead of throwing
          const errorMessage = error instanceof Error ? error.message : String(error);
          return new Error(`${url}: ${errorMessage}`);
        }
      })
    );

    return Promise.all(promises);
  }

  isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  // Check if a URL is likely to have CORS issues
  hasCorsIssues(url: string): boolean {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      return this.corsProblematicDomains.some(problematicDomain => 
        domain.includes(problematicDomain)
      );
    } catch {
      return false;
    }
  }

  // Get scrapeable URLs from a list (filters out problematic ones)
  filterScrapeableUrls(urls: string[]): string[] {
    return urls.filter(url => {
      if (!this.isValidUrl(url)) return false;
      if (this.hasCorsIssues(url)) {
        console.warn(`⚠️ Filtering out ${url} - known CORS issues`);
        return false;
      }
      return true;
    });
  }
}