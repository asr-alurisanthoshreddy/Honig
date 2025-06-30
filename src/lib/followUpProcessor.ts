export interface ConversationContext {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: any;
  }>;
  currentTopic?: string;
  lastQuery?: string;
  lastResponse?: string;
}

export interface FollowUpAnalysis {
  isFollowUp: boolean;
  confidence: number;
  contextNeeded: boolean;
  queryType: 'clarification' | 'continuation' | 'related' | 'new';
  suggestedContext?: string;
}

export class FollowUpProcessor {
  private static readonly FOLLOW_UP_INDICATORS = [
    // Direct references
    /\b(this|that|it|they|them|these|those)\b/i,
    
    // Continuation words
    /\b(also|additionally|furthermore|moreover|besides|plus)\b/i,
    
    // Clarification requests
    /\b(what about|how about|what if|can you|could you)\b/i,
    
    // Expansion requests
    /\b(more|explain|elaborate|detail|expand|tell me more)\b/i,
    
    // Comparison requests
    /\b(compare|versus|vs|difference|similar|like)\b/i,
    
    // Sequential indicators
    /\b(next|then|after|before|first|second|third)\b/i,
    
    // Question words with context dependency
    /^(why|how|when|where|which|who)\b/i,
    
    // Short queries (likely follow-ups)
    /^.{1,20}$/,
    
    // Pronouns at start
    /^(it|this|that|they|these|those)\b/i
  ];

  static analyzeFollowUp(currentQuery: string, context: ConversationContext): FollowUpAnalysis {
    const query = currentQuery.trim().toLowerCase();
    
    // Quick checks for obvious follow-ups
    if (query.length < 5) {
      return {
        isFollowUp: true,
        confidence: 0.9,
        contextNeeded: true,
        queryType: 'clarification'
      };
    }

    let followUpScore = 0;
    let totalChecks = 0;

    // Check for follow-up indicators
    this.FOLLOW_UP_INDICATORS.forEach(pattern => {
      totalChecks++;
      if (pattern.test(query)) {
        followUpScore++;
      }
    });

    // Check for pronouns without clear antecedents
    const pronouns = ['it', 'this', 'that', 'they', 'them', 'these', 'those'];
    const hasPronouns = pronouns.some(pronoun => query.includes(pronoun));
    
    if (hasPronouns) {
      followUpScore += 2;
      totalChecks += 2;
    }

    // Check if query is very short (likely a follow-up)
    if (query.length < 30) {
      followUpScore++;
      totalChecks++;
    }

    // Check for question words at the beginning (often follow-ups)
    if (/^(why|how|when|where|which|who|what)\b/.test(query)) {
      followUpScore++;
      totalChecks++;
    }

    const confidence = totalChecks > 0 ? followUpScore / totalChecks : 0;
    const isFollowUp = confidence > 0.3;

    // Determine query type
    let queryType: FollowUpAnalysis['queryType'] = 'new';
    if (isFollowUp) {
      if (query.includes('what') || query.includes('explain') || query.includes('clarify')) {
        queryType = 'clarification';
      } else if (query.includes('more') || query.includes('also') || query.includes('additionally')) {
        queryType = 'continuation';
      } else if (query.includes('similar') || query.includes('related') || query.includes('like')) {
        queryType = 'related';
      } else {
        queryType = 'clarification';
      }
    }

    return {
      isFollowUp,
      confidence,
      contextNeeded: isFollowUp,
      queryType,
      suggestedContext: isFollowUp ? this.buildContextSummary(context) : undefined
    };
  }

  private static buildContextSummary(context: ConversationContext): string {
    if (!context.messages || context.messages.length === 0) {
      return '';
    }

    // Get last few messages for context
    const recentMessages = context.messages.slice(-6); // Last 3 exchanges
    
    let contextSummary = 'Previous conversation context:\n\n';
    
    recentMessages.forEach((msg, index) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      const content = msg.content.length > 200 
        ? msg.content.substring(0, 200) + '...' 
        : msg.content;
      
      contextSummary += `${role}: ${content}\n\n`;
    });

    return contextSummary;
  }

  static enhanceQueryWithContext(query: string, context: ConversationContext, analysis: FollowUpAnalysis): string {
    if (!analysis.isFollowUp || !analysis.contextNeeded) {
      return query;
    }

    const contextSummary = this.buildContextSummary(context);
    
    return `Based on our previous conversation:

${contextSummary}

Current follow-up question: ${query}

Please provide a response that takes into account the previous context and directly addresses this follow-up question.`;
  }
}