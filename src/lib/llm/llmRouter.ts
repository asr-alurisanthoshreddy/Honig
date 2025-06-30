import type { LLMProvider, QueryClassification } from '../types';

export class LLMRouter {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProvider: string | null = null;

  addProvider(name: string, provider: LLMProvider, isDefault = false) {
    this.providers.set(name, provider);
    if (isDefault || !this.defaultProvider) {
      this.defaultProvider = name;
    }
  }

  classifyQuery(query: string): QueryClassification {
    const queryLower = query.toLowerCase();
    
    // Check if needs live data - be more specific about what requires live data
    const needsLiveData = this.needsLiveData(queryLower);
    
    // Determine query type
    let queryType: QueryClassification['queryType'] = 'conversational';
    let suggestedModel = this.defaultProvider;
    
    // Code-related queries
    if (this.isCodeQuery(queryLower)) {
      queryType = 'code';
      suggestedModel = 'gemini'; // Good for code generation
    }
    // Factual queries (but not necessarily needing live data)
    else if (this.isFactualQuery(queryLower)) {
      queryType = 'factual';
      suggestedModel = 'gemini'; // Good for factual responses
    }
    // Creative queries
    else if (this.isCreativeQuery(queryLower)) {
      queryType = 'creative';
      suggestedModel = 'gemini'; // Use available model
    }
    // Analytical queries
    else if (this.isAnalyticalQuery(queryLower)) {
      queryType = 'analytical';
      suggestedModel = 'gemini'; // Good for analysis and reasoning
    }

    // Determine time range for live data queries
    let timeRange: QueryClassification['timeRange'] = 'all';
    if (needsLiveData) {
      if (/\b(today|now|breaking|live)\b/i.test(query)) {
        timeRange = 'day';
      } else if (/\b(this week|recent|latest)\b/i.test(query)) {
        timeRange = 'week';
      } else if (/\b(this month|current)\b/i.test(query)) {
        timeRange = 'month';
      }
    }

    return {
      needsLiveData,
      queryType,
      confidence: 0.8,
      suggestedModel: suggestedModel || this.defaultProvider,
      timeRange
    };
  }

  async generateResponse(
    query: string, 
    context?: string, 
    preferredModel?: string
  ): Promise<string> {
    const classification = this.classifyQuery(query);
    const modelName = preferredModel || classification.suggestedModel || this.defaultProvider;
    
    if (!modelName) {
      throw new Error('No LLM provider available');
    }

    const provider = this.providers.get(modelName);
    if (!provider) {
      throw new Error(`LLM provider '${modelName}' not found`);
    }

    // Build enhanced prompt based on query type
    const enhancedPrompt = this.buildPrompt(query, context, classification);
    
    return provider.generateResponse(enhancedPrompt, context);
  }

  private buildPrompt(query: string, context?: string, classification?: QueryClassification): string {
    let prompt = '';

    // Add context if available
    if (context) {
      prompt += `Based on the following information:\n\n${context}\n\n`;
    }

    // Add type-specific instructions
    if (classification) {
      switch (classification.queryType) {
        case 'code':
          prompt += 'Provide clear, well-commented code examples. Use proper syntax highlighting and explain the solution step by step.\n\n';
          break;
        case 'factual':
          if (context) {
            prompt += 'Provide accurate, well-sourced information. Be precise and cite specific details from the context when available.\n\n';
          } else {
            prompt += 'Provide accurate, comprehensive information. Draw from your knowledge base to give a detailed and informative response.\n\n';
          }
          break;
        case 'creative':
          prompt += 'Be creative and engaging while maintaining accuracy. Feel free to use examples and analogies.\n\n';
          break;
        case 'analytical':
          prompt += 'Provide a thorough analysis with clear reasoning. Break down complex topics into understandable parts.\n\n';
          break;
        case 'conversational':
          prompt += 'Provide a helpful, conversational response. Be friendly and informative.\n\n';
          break;
      }
    }

    prompt += `Question: ${query}`;

    return prompt;
  }

  private needsLiveData(query: string): boolean {
    // Be more specific about what actually needs live data
    const liveDataIndicators = [
      // Time-sensitive queries with explicit time references
      /\b(latest|recent|current|today|yesterday|this week|this month|now|breaking)\b/i,
      /\b(news|updates|developments|happening|just announced)\b/i,
      
      // Market/financial queries (these change frequently)
      /\b(stock price|market|trading|crypto|bitcoin|ethereum|price of)\b/i,
      
      // Weather queries (always current)
      /\b(weather|temperature|forecast|rain|snow)\b/i,
      
      // Sports scores/results (time-sensitive)
      /\b(score|game|match|tournament|championship|standings)\b/i,
      
      // Technology/product releases (when asking for latest)
      /\b(latest.*(release|launch|announcement|version|update))\b/i,
      
      // Events and schedules (time-sensitive)
      /\b(schedule|event|conference|meeting|deadline)\b/i,
      
      // Real-time data
      /\b(live|real.?time|streaming|status)\b/i
    ];

    // Historical or general knowledge queries should NOT trigger live data
    const historicalIndicators = [
      /\bwho (is|was)\b/i,
      /\bwhat (is|was)\b/i,
      /\bwhen (did|was)\b/i,
      /\bwhere (is|was)\b/i,
      /\bhow (does|did)\b/i,
      /\bexplain\b/i,
      /\bdefinition\b/i,
      /\bhistory of\b/i,
      /\bborn in\b/i,
      /\bdied in\b/i
    ];

    // If it's a historical/general knowledge query, don't use live data
    if (historicalIndicators.some(pattern => pattern.test(query))) {
      return false;
    }

    return liveDataIndicators.some(pattern => pattern.test(query));
  }

  private isCodeQuery(query: string): boolean {
    const codeKeywords = [
      'code', 'program', 'script', 'function', 'class', 'method',
      'write', 'create', 'generate', 'implement', 'debug',
      'python', 'javascript', 'java', 'c++', 'typescript',
      'html', 'css', 'sql', 'php', 'ruby', 'swift',
      'algorithm', 'solution', 'example', 'syntax'
    ];

    return codeKeywords.some(keyword => query.includes(keyword));
  }

  private isFactualQuery(query: string): boolean {
    const factualIndicators = [
      /^(what|who|where|when|which|how many|how much)\b/i,
      /\b(definition|meaning|explain|describe|tell me about)\b/i,
      /\b(fact|information|data|statistics|history)\b/i,
      /\b(born|died|invented|discovered|founded)\b/i
    ];

    return factualIndicators.some(pattern => pattern.test(query));
  }

  private isCreativeQuery(query: string): boolean {
    const creativeKeywords = [
      'story', 'poem', 'creative', 'imagine', 'invent',
      'brainstorm', 'idea', 'design', 'artistic', 'novel'
    ];

    return creativeKeywords.some(keyword => query.includes(keyword));
  }

  private isAnalyticalQuery(query: string): boolean {
    const analyticalKeywords = [
      'analyze', 'compare', 'contrast', 'evaluate', 'assess',
      'pros and cons', 'advantages', 'disadvantages', 'impact',
      'relationship', 'correlation', 'trend', 'pattern'
    ];

    return analyticalKeywords.some(keyword => query.includes(keyword));
  }

  getAvailableModels(): string[] {
    return Array.from(this.providers.keys());
  }

  getProviderInfo(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }
}