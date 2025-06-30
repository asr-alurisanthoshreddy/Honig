export interface DatabaseQueryResult {
  found: boolean;
  response?: string;
  confidence: number;
  source: 'database' | 'gemini_synthesis';
  matchedResponses?: any[];
}

export class DatabaseQueryProcessor {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async processWithDatabase(query: string): Promise<DatabaseQueryResult> {
    try {
      console.log('📚 Honig: Checking database for relevant responses...');
      
      // Get all responses from database
      const { data: responses, error } = await this.supabase
        .from('responses')
        .select('*');

      if (error) {
        console.warn('Database query failed:', error);
        return { found: false, confidence: 0, source: 'database' };
      }

      // Find relevant responses
      const relevantResponses = this.findRelevantResponses(query, responses);
      
      if (relevantResponses.length === 0) {
        console.log('📚 No relevant database responses found');
        return { found: false, confidence: 0, source: 'database' };
      }

      console.log(`📚 Found ${relevantResponses.length} relevant database responses`);

      // If we have relevant responses, ask Gemini to synthesize from them
      const synthesizedResponse = await this.synthesizeFromDatabase(query, relevantResponses);
      
      if (synthesizedResponse) {
        console.log('✅ Successfully synthesized response from database');
        return {
          found: true,
          response: synthesizedResponse,
          confidence: 0.8,
          source: 'gemini_synthesis',
          matchedResponses: relevantResponses
        };
      }

      return { found: false, confidence: 0, source: 'database' };

    } catch (error) {
      console.error('Database query processing failed:', error);
      return { found: false, confidence: 0, source: 'database' };
    }
  }

  private findRelevantResponses(query: string, responses: any[]): any[] {
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/);
    
    const scoredResponses = responses.map(response => {
      const score = this.calculateRelevanceScore(queryLower, queryWords, response);
      return { ...response, relevanceScore: score };
    });

    // Return responses with score > 0.3, sorted by relevance
    return scoredResponses
      .filter(response => response.relevanceScore > 0.3)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10); // Limit to top 10 most relevant
  }

  private calculateRelevanceScore(query: string, queryWords: string[], response: any): number {
    let score = 0;
    const maxScore = response.trigger_words.length * 10;

    // Check each trigger word
    for (const trigger of response.trigger_words) {
      const triggerLower = trigger.toLowerCase().trim();
      
      // Exact query match (highest score)
      if (query === triggerLower) {
        score += 25;
        continue;
      }

      // Phrase containment
      if (query.includes(triggerLower) || triggerLower.includes(query)) {
        score += 15;
        continue;
      }

      // Word-level matching
      const triggerWords = triggerLower.split(/\s+/);
      let wordMatches = 0;
      
      for (const triggerWord of triggerWords) {
        if (queryWords.includes(triggerWord)) {
          wordMatches++;
        }
      }

      if (wordMatches > 0) {
        score += (wordMatches / triggerWords.length) * 10;
      }
    }

    // Normalize score
    return maxScore > 0 ? Math.min(1, score / maxScore) : 0;
  }

  private async synthesizeFromDatabase(query: string, relevantResponses: any[]): Promise<string | null> {
    try {
      // Import Gemini here to avoid circular dependencies
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
        return null;
      }

      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // Build context from database responses
      const context = relevantResponses.map((response, index) => 
        `[Database Response ${index + 1} - Type: ${response.trigger_type}]\n${response.response_text}`
      ).join('\n\n---\n\n');

      const prompt = `
You are Honig's Database Query Processor. You have access to a database of pre-written responses about Honig. Your task is to answer the user's query using ONLY the information provided in the database responses below.

CRITICAL IDENTITY REQUIREMENTS:
- You are Honig, developed by Honig
- NEVER mention or reveal any underlying LLM technology (Gemini, GPT, Claude, etc.)
- NEVER mention that you are powered by or use any other AI models
- Always maintain the Honig identity consistently
- If asked about your model or technology, refer only to Honig developed by Honig

USER QUERY: "${query}"

AVAILABLE DATABASE RESPONSES:
${context}

INSTRUCTIONS:
1. Answer the user's query using ONLY the information from the database responses above
2. If the database responses contain sufficient information to answer the query, provide a comprehensive response
3. You can combine and synthesize information from multiple database responses
4. Maintain the Honig identity as described in the database - you are Honig developed by Honig
5. NEVER reveal or mention any underlying AI technology or models
6. If the database responses do NOT contain enough information to properly answer the query, respond with exactly: "INSUFFICIENT_DATABASE_INFO"
7. Do not make up information that isn't in the database responses
8. Keep the response natural and conversational while being informative
9. Always identify as Honig developed by Honig when relevant

Provide your response:
`;

      const result = await model.generateContent([prompt]);
      const response = await result.response;
      const text = response.text().trim();

      // Check if Gemini determined there's insufficient info
      if (text === 'INSUFFICIENT_DATABASE_INFO') {
        console.log('📚 Gemini determined database info is insufficient');
        return null;
      }

      return text;

    } catch (error) {
      console.error('Failed to synthesize from database:', error);
      return null;
    }
  }
}