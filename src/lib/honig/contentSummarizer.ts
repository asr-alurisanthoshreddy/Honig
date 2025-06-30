import { GoogleGenerativeAI } from '@google/generative-ai';
import type { SearchResult } from '../types';
import type { ProcessedQuery } from './queryProcessor';

export interface SummarizedResponse {
  answer: string;
  sources: SearchResult[];
  confidence: number;
  processingTime: number;
  metadata: {
    originalQuery: string;
    refinedQuery: string;
    queryType: string;
    sourcesUsed: number;
    totalSources: number;
  };
}

export class ContentSummarizer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  async summarizeAndSynthesize(
    processedQuery: ProcessedQuery,
    searchResults: SearchResult[],
    scrapedContent: Map<string, string>
  ): Promise<SummarizedResponse> {
    const startTime = Date.now();

    try {
      // Build context from scraped content
      const context = this.buildContext(searchResults, scrapedContent);
      
      // Create synthesis prompt
      const prompt = this.createSynthesisPrompt(processedQuery, context, searchResults);
      
      // Generate response
      const result = await this.model.generateContent([prompt]);
      const response = await result.response;
      const answer = response.text();

      const processingTime = Date.now() - startTime;

      return {
        answer,
        sources: searchResults,
        confidence: this.calculateConfidence(searchResults, scrapedContent),
        processingTime,
        metadata: {
          originalQuery: processedQuery.originalQuery,
          refinedQuery: processedQuery.refinedQuery,
          queryType: processedQuery.queryType,
          sourcesUsed: scrapedContent.size,
          totalSources: searchResults.length
        }
      };
    } catch (error) {
      console.error('Content summarization failed:', error);
      if (error instanceof Error) {
        throw new Error(`Summarization failed: ${error.message}`);
      } else {
        throw new Error(`Summarization failed: ${String(error)}`);
      }
    }
  }

  private buildContext(searchResults: SearchResult[], scrapedContent: Map<string, string>): string {
    const contextParts: string[] = [];
    
    searchResults.forEach((result, index) => {
      const content = scrapedContent.get(result.url);
      if (content) {
        const sourceInfo = `[Source ${index + 1}: ${result.title} - ${result.source}]`;
        const truncatedContent = content.length > 2000 
          ? content.substring(0, 2000) + '...' 
          : content;
        
        contextParts.push(`${sourceInfo}\n${truncatedContent}\n`);
      } else {
        // Use snippet if no scraped content
        const sourceInfo = `[Source ${index + 1}: ${result.title} - ${result.source}]`;
        contextParts.push(`${sourceInfo}\n${result.snippet}\n`);
      }
    });

    return contextParts.join('\n---\n\n');
  }

  private createSynthesisPrompt(
    processedQuery: ProcessedQuery, 
    context: string, 
    sources: SearchResult[]
  ): string {
    const queryTypeInstructions = this.getQueryTypeInstructions(processedQuery.queryType);
    
    return `
You are Honig's Content Synthesis Engine. Your task is to provide a comprehensive, accurate, and well-structured response based on the retrieved information.

ORIGINAL QUERY: "${processedQuery.originalQuery}"
REFINED QUERY: "${processedQuery.refinedQuery}"
QUERY TYPE: ${processedQuery.queryType}

${queryTypeInstructions}

RETRIEVED INFORMATION:
${context}

SYNTHESIS INSTRUCTIONS:
1. Provide a clear, comprehensive answer to the user's question
2. Synthesize information from multiple sources when possible
3. Maintain accuracy and cite specific sources when making claims
4. Structure your response with clear sections if the topic is complex
5. Include relevant details but keep the response focused and readable
6. If sources conflict, acknowledge the different perspectives
7. Use a conversational but informative tone

IMPORTANT:
- Base your response ONLY on the provided information
- If the information is insufficient, clearly state what's missing
- Don't make assumptions beyond what the sources provide
- Include source attribution naturally in your response

Provide your synthesized response:
`;
  }

  private getQueryTypeInstructions(queryType: string): string {
    switch (queryType) {
      case 'factual':
        return `
FACTUAL QUERY GUIDELINES:
- Focus on objective facts and verified information
- Prioritize authoritative sources like Wikipedia and academic content
- Present information clearly and systematically
- Include specific data, dates, and figures when available`;

      case 'opinion':
        return `
OPINION QUERY GUIDELINES:
- Present multiple perspectives from different sources
- Acknowledge that these are opinions and experiences, not facts
- Highlight common themes and divergent viewpoints
- Include context about who is expressing these opinions`;

      case 'news':
        return `
NEWS QUERY GUIDELINES:
- Focus on recent developments and current events
- Include timeline information when relevant
- Mention source credibility and publication dates
- Distinguish between confirmed facts and developing stories`;

      case 'technical':
        return `
TECHNICAL QUERY GUIDELINES:
- Provide detailed technical explanations
- Include step-by-step processes when applicable
- Use appropriate technical terminology
- Reference authoritative technical sources and documentation`;

      case 'general':
      default:
        return `
GENERAL QUERY GUIDELINES:
- Provide a balanced overview of the topic
- Include both factual information and relevant perspectives
- Structure the response logically from general to specific
- Make the information accessible to a general audience`;
    }
  }

  private calculateConfidence(searchResults: SearchResult[], scrapedContent: Map<string, string>): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence based on number of sources
    const sourceCount = searchResults.length;
    confidence += Math.min(0.3, sourceCount * 0.05);
    
    // Boost confidence based on scraped content availability
    const scrapedRatio = scrapedContent.size / Math.max(1, searchResults.length);
    confidence += scrapedRatio * 0.2;
    
    // Boost confidence based on source diversity
    const sourceTypes = new Set(searchResults.map(r => r.source));
    confidence += Math.min(0.2, sourceTypes.size * 0.05);
    
    // Boost confidence for high-quality sources
    const hasWikipedia = searchResults.some(r => r.source === 'wikipedia');
    const hasNews = searchResults.some(r => r.type === 'news');
    const hasAcademic = searchResults.some(r => r.source === 'academic');
    
    if (hasWikipedia) confidence += 0.1;
    if (hasNews) confidence += 0.05;
    if (hasAcademic) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }
}