import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ProcessedQuery {
  originalQuery: string;
  refinedQuery: string;
  queryType: 'factual' | 'opinion' | 'news' | 'technical' | 'general';
  targetSources: string[];
  searchTerms: string[];
  confidence: number;
}

export class QueryProcessor {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  async processQuery(userQuery: string): Promise<ProcessedQuery> {
    const prompt = `
You are Honig's Query Processing Engine. Analyze the user's query and provide a structured response.

User Query: "${userQuery}"

Analyze this query and respond with a JSON object containing:
1. refinedQuery: A more precise, search-optimized version of the query
2. queryType: One of "factual", "opinion", "news", "technical", "general"
3. targetSources: Array of recommended source types from ["wikipedia", "reddit", "quora", "news", "academic", "forums"]
4. searchTerms: Array of 3-5 key search terms
5. confidence: Confidence score (0-1) in the analysis

Query Type Guidelines:
- "factual": Seeking objective facts, definitions, or data (use Wikipedia, academic sources)
- "opinion": Seeking perspectives, experiences, reviews (use Reddit, Quora, forums)
- "news": Current events, recent developments (use news sources)
- "technical": Programming, science, engineering topics (use academic, specialized forums)
- "general": Broad topics needing multiple perspectives (use mixed sources)

Respond ONLY with valid JSON:
`;

    try {
      const result = await this.model.generateContent([prompt]);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        originalQuery: userQuery,
        refinedQuery: parsed.refinedQuery || userQuery,
        queryType: parsed.queryType || 'general',
        targetSources: parsed.targetSources || ['wikipedia', 'news'],
        searchTerms: parsed.searchTerms || [userQuery],
        confidence: parsed.confidence || 0.7
      };
    } catch (error) {
      console.error('Query processing failed:', error);
      
      // Fallback processing
      return this.fallbackProcessing(userQuery);
    }
  }

  private fallbackProcessing(query: string): ProcessedQuery {
    const queryLower = query.toLowerCase();
    
    // Simple heuristics for fallback
    let queryType: ProcessedQuery['queryType'] = 'general';
    let targetSources: string[] = ['wikipedia', 'news'];
    
    if (queryLower.includes('what is') || queryLower.includes('define') || queryLower.includes('who is')) {
      queryType = 'factual';
      targetSources = ['wikipedia', 'academic'];
    } else if (queryLower.includes('opinion') || queryLower.includes('review') || queryLower.includes('experience')) {
      queryType = 'opinion';
      targetSources = ['reddit', 'quora', 'forums'];
    } else if (queryLower.includes('latest') || queryLower.includes('recent') || queryLower.includes('news')) {
      queryType = 'news';
      targetSources = ['news'];
    } else if (queryLower.includes('code') || queryLower.includes('programming') || queryLower.includes('technical')) {
      queryType = 'technical';
      targetSources = ['academic', 'forums'];
    }

    return {
      originalQuery: query,
      refinedQuery: query,
      queryType,
      targetSources,
      searchTerms: query.split(' ').filter(word => word.length > 2).slice(0, 5),
      confidence: 0.6
    };
  }
}