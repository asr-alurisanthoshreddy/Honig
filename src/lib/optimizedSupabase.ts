import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { HonigService } from './honigService';
import { fastCache } from './fastResponseCache';

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || 'placeholder-key';

// Check if properly configured
const isProduction = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-info': 'honig-app'
    }
  }
});

// Initialize HonigService only if configured
export const honigService = new HonigService();
if (isProduction) {
  honigService.init(supabase);
}

// Enhanced Gemini response with FULL conversation context and SPECIFIC email formatting
async function getContextualGeminiResponse(message: string, conversationHistory: any[] = []): Promise<string> {
  try {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
    
    if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
      return "🔧 **Welcome to Honig!** To use AI features, please configure your Gemini API key in the .env file. See the README for setup instructions.";
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      }
    });

    // Build comprehensive conversation context
    let contextPrompt = `You are Honig, an AI research assistant developed by Honig. You maintain conversation context and provide helpful, well-structured responses.

CRITICAL FORMATTING RULES:

1. **EMAIL/LETTER FORMATTING RULE (ONLY when specifically requested):**
   - ONLY format emails/letters in code blocks when user explicitly asks to "write email", "write letter", "compose email", "draft email", "write mail", etc.
   - When formatting emails in code blocks, use this EXACT format:
   
   \`\`\`
   Subject: [Subject based on conversation]
   To: [Recipient]
   From: [Sender]
   
   Dear [Name],
   
   [Email body that references conversation context]
   
   Best regards,
   [Sender Name]
   \`\`\`

2. **STRUCTURED RESPONSE FORMATTING (for all other responses):**
   - Use proper headings with ## and ###
   - Put each bullet point on its own unique line
   - Use proper spacing between sections
   - Structure information clearly with headings and subheadings
   - Example format:
   
   ## Main Topic
   
   ### Subtopic 1
   
   • Bullet point 1
   
   • Bullet point 2
   
   • Bullet point 3
   
   ### Subtopic 2
   
   • Another bullet point
   
   • Another bullet point

CONVERSATION CONTEXT RULES:
- ALWAYS reference previous messages when relevant
- Build upon previous information shared
- Remember what the user told you earlier
- Use context to provide more personalized responses

`;

    // Add COMPLETE conversation history for context
    if (conversationHistory.length > 0) {
      contextPrompt += "FULL CONVERSATION HISTORY:\n";
      
      conversationHistory.forEach((msg, index) => {
        if (msg.role === 'user') {
          contextPrompt += `User: ${msg.content}\n`;
        } else {
          // Include more of the assistant's response for better context
          const content = msg.content.length > 500 ? msg.content.substring(0, 500) + '...' : msg.content;
          contextPrompt += `Honig: ${content}\n`;
        }
      });
      contextPrompt += "\n";
    }

    // Check if this is SPECIFICALLY an email/letter request
    const isEmailRequest = /^(write|compose|draft|create|send)\s+(an?\s+)?(email|mail|letter|message)\s+(to|for|about)/i.test(message) ||
                          /^(write|compose|draft|create)\s+(me\s+)?(an?\s+)?(email|mail|letter)/i.test(message) ||
                          /email.*to|mail.*to|letter.*to/i.test(message);
    
    if (isEmailRequest) {
      contextPrompt += `CRITICAL EMAIL FORMATTING INSTRUCTIONS:
The user is SPECIFICALLY asking you to write an email or letter. You MUST:

1. Format the ENTIRE email/letter content in a code block using markdown
2. Use proper email structure (Subject, To, From, Body)
3. Base the content on the previous conversation context
4. Make it professional and relevant to what was discussed
5. Reference specific information from our conversation

MANDATORY FORMAT:
\`\`\`
Subject: [Relevant Subject Based on Our Conversation]
To: [Recipient]
From: [Sender]

Dear [Name],

[Email body that references and builds upon our previous conversation]

Best regards,
[Sender Name]
\`\`\`

IMPORTANT: The ENTIRE email must be inside the code block. Do not add any text outside the code block except for a brief introduction.

`;
    } else {
      contextPrompt += `STRUCTURED RESPONSE FORMATTING INSTRUCTIONS:
The user is asking for information or help (NOT an email/letter). You MUST:

1. Provide well-structured information with proper headings
2. Use ## for main headings and ### for subheadings
3. Put each bullet point on its own unique line with proper spacing
4. Use clear sections and proper spacing between them
5. Make the response easy to read and well-organized

EXAMPLE FORMAT:
## Main Topic

### Key Points

• First important point

• Second important point

• Third important point

### Additional Information

• More details here

• Another detail

### Summary

• Final summary point

`;
    }

    // Add context-aware instructions
    if (conversationHistory.length > 0) {
      contextPrompt += `CONTEXT-AWARE RESPONSE INSTRUCTIONS:
- Reference specific information from our conversation
- Build upon what we've already discussed
- Use the user's name or details if they've shared them
- Connect your response to previous topics
- Show that you remember and understand the conversation flow

`;
    }

    contextPrompt += `Current user message: ${message}

Provide a helpful response that maintains conversation context and follows all formatting rules above.`;

    const result = await model.generateContent([contextPrompt]);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error('Contextual Gemini failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return "❌ **API Key Issue**: Please check your Gemini API key configuration.";
      }
      if (error.message.includes('quota')) {
        return "⏳ **Usage Limit**: API quota reached. Please try again later.";
      }
    }
    
    return "I'm experiencing technical difficulties. Please try again in a moment.";
  }
}

// Optimized response function with FULL conversation context
export async function getResponse(message: string, conversationHistory: any[] = []): Promise<string> {
  try {
    console.log('⚡ Processing query with FULL conversation context...');
    console.log(`📚 Context: ${conversationHistory.length} messages`);
    
    // 1. Check for instant responses first (only for new conversations)
    const instantResponse = fastCache.getInstantResponse(message);
    if (instantResponse && conversationHistory.length === 0) {
      console.log('🚀 Returning instant response (0ms)');
      return instantResponse;
    }

    // 2. Determine processing strategy
    const needsWebSearch = shouldUseWebSearch(message);
    const isSimpleQuery = isSimpleConversationalQuery(message);
    const isEmailRequest = /^(write|compose|draft|create|send)\s+(an?\s+)?(email|mail|letter|message)\s+(to|for|about)/i.test(message) ||
                          /^(write|compose|draft|create)\s+(me\s+)?(an?\s+)?(email|mail|letter)/i.test(message) ||
                          /email.*to|mail.*to|letter.*to/i.test(message);
    const hasContext = conversationHistory.length > 0;
    const isFollowUp = message.toLowerCase().includes('based on') || 
                      message.toLowerCase().includes('regarding that') || 
                      message.toLowerCase().includes('about that') ||
                      message.toLowerCase().includes('from what') ||
                      message.toLowerCase().includes('using the');
    
    // 3. ALWAYS use contextual response for emails, follow-ups, or when there's conversation history
    if (hasContext || isEmailRequest || isFollowUp) {
      console.log('📝 Using contextual Gemini with FULL conversation history');
      console.log(`🔗 Context details: ${conversationHistory.length} messages, isEmail: ${isEmailRequest}, isFollowUp: ${isFollowUp}`);
      const response = await getContextualGeminiResponse(message, conversationHistory);
      fastCache.setCachedResponse(message, response);
      return response;
    }

    // 4. Fast path for simple queries without context
    if (isSimpleQuery || !needsWebSearch) {
      console.log('📝 Using fast Gemini path for simple query');
      const response = await getContextualGeminiResponse(message, []);
      fastCache.setCachedResponse(message, response);
      return response;
    }

    // 5. Use Honig for complex queries (only if configured and needed)
    if (isProduction && honigService.isConfigured() && needsWebSearch) {
      console.log('🔍 Using Honig for complex query');
      
      try {
        const honigPromise = honigService.processQuery(message);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Honig timeout')), 15000)
        );
        
        const result = await Promise.race([honigPromise, timeoutPromise]);
        fastCache.setCachedResponse(message, result.response);
        return result.response;
      } catch (honigError) {
        console.warn('Honig failed or timed out, falling back to contextual response:', honigError);
        const fallback = await getContextualGeminiResponse(message, conversationHistory);
        fastCache.setCachedResponse(message, fallback);
        return fallback;
      }
    } else {
      // Fallback to contextual response
      console.log('📝 Using contextual Gemini fallback');
      const response = await getContextualGeminiResponse(message, conversationHistory);
      fastCache.setCachedResponse(message, response);
      return response;
    }

  } catch (error) {
    console.error('Error in getResponse:', error);
    return "I apologize, but I'm experiencing technical difficulties. Please try again.";
  }
}

// Determine if query needs web search
function shouldUseWebSearch(query: string): boolean {
  const queryLower = query.toLowerCase().trim();
  
  // Skip web search for short queries
  if (queryLower.length < 15) return false;
  
  // Skip for greetings, emails, and basic questions
  const simplePatterns = [
    /^(hi|hello|hey|thanks|thank you|bye|goodbye)$/i,
    /^(who are you|what are you|how are you)$/i,
    /^(help|what can you do|capabilities)$/i,
    /^(write|compose|draft|create|send)\s+(an?\s+)?(email|mail|letter|message)/i,
    /email.*to|mail.*to|letter.*to/i,
    /based on|regarding that|about that|from what|using the/i
  ];
  
  if (simplePatterns.some(pattern => pattern.test(queryLower))) {
    return false;
  }
  
  // Use web search for specific indicators
  const webSearchIndicators = [
    /\b(latest|recent|current|news|today|this week|this month)\b/i,
    /\b(what happened|breaking|update|development)\b/i,
    /\b(price|stock|market|crypto|bitcoin)\b/i,
    /\b(weather|forecast|temperature)\b/i,
    /\b(compare|vs|versus|difference between)\b/i,
    /\b(review|opinion|what do people think)\b/i
  ];
  
  return webSearchIndicators.some(pattern => pattern.test(queryLower));
}

// Check if query is simple conversational
function isSimpleConversationalQuery(query: string): boolean {
  const queryLower = query.toLowerCase().trim();
  
  const conversationalPatterns = [
    /^(what is|define|explain|tell me about|how does|why does)/i,
    /^(can you|could you|would you|will you)/i,
    /\b(help|assist|support)\b/i,
    /^(write|compose|draft|create|send)\s+(an?\s+)?(email|mail|letter|message)/i,
    /email.*to|mail.*to|letter.*to/i
  ];
  
  return conversationalPatterns.some(pattern => pattern.test(queryLower)) && queryLower.length < 100;
}

// Enhanced user profile function with error handling
export async function upsertUserProfile(user: {
  id: string;
  email?: string;
  user_metadata?: {
    avatar_url?: string;
    name?: string;
  };
}) {
  if (!isProduction) {
    console.warn('Supabase not configured - user profile operations disabled');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url
      })
      .select();

    if (error) {
      console.error('Error upserting user profile:', error);
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Failed to upsert user profile:', error);
    return null;
  }
}

// Enhanced query logging with better error handling and retry logic
export async function logQuery(
  userId: string | null,
  query: string,
  response: string,
  sources: any[] = [],
  conversationId?: string
): Promise<any> {
  if (!isProduction) {
    console.log('Query logging disabled - Supabase not configured');
    return null;
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase
        .from('queries')
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          query_text: query,
          response_text: response,
          sources: sources,
        })
        .select();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`✅ Query logged successfully on attempt ${attempt}`);
      return data[0];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  console.error('❌ All retry attempts failed for query logging');
  throw new Error(`Failed to persist chat message after ${maxRetries} attempts: ${lastError?.message}`);
}

// Safe database operation wrapper with better error handling
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName: string
): Promise<T> {
  try {
    const result = await operation();
    console.log(`✅ Database operation '${operationName}' succeeded`);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Database operation '${operationName}' failed:`, errorMessage);
    
    if (operationName.includes('load') || operationName.includes('persist')) {
      return fallbackValue;
    }
    
    throw error;
  }
}

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  if (!isProduction) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    return !error;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}