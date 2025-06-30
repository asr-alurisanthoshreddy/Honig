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

// Fast Gemini response for immediate replies
async function getFastGeminiResponse(message: string): Promise<string> {
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
        maxOutputTokens: 1000, // Limit for faster responses
        temperature: 0.7,
      }
    });

    const prompt = `You are Honig, developed by Honig. Provide a helpful, concise response to: ${message}`;
    
    const result = await model.generateContent([prompt]);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error('Fast Gemini failed:', error);
    
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

// Optimized response function with multiple fast paths
export async function getResponse(message: string): Promise<string> {
  try {
    console.log('⚡ Processing query with optimized pipeline...');
    
    // 1. Check for instant responses first (0ms response time)
    const instantResponse = fastCache.getInstantResponse(message);
    if (instantResponse) {
      console.log('🚀 Returning instant response (0ms)');
      return instantResponse;
    }

    // 2. Determine processing strategy
    const needsWebSearch = shouldUseWebSearch(message);
    const isSimpleQuery = isSimpleConversationalQuery(message);
    
    // 3. Fast path for simple queries
    if (isSimpleQuery || !needsWebSearch) {
      console.log('📝 Using fast Gemini path for simple query');
      const response = await getFastGeminiResponse(message);
      fastCache.setCachedResponse(message, response);
      return response;
    }

    // 4. Use Honig for complex queries (only if configured and needed)
    if (isProduction && honigService.isConfigured() && needsWebSearch) {
      console.log('🔍 Using Honig for complex query');
      
      try {
        // Set a timeout for Honig processing
        const honigPromise = honigService.processQuery(message);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Honig timeout')), 15000)
        );
        
        const result = await Promise.race([honigPromise, timeoutPromise]);
        fastCache.setCachedResponse(message, result.response);
        return result.response;
      } catch (honigError) {
        console.warn('Honig failed or timed out, falling back to fast response:', honigError);
        const fallback = await getFastGeminiResponse(message);
        fastCache.setCachedResponse(message, fallback);
        return fallback;
      }
    } else {
      // Fallback to fast response
      console.log('📝 Using fast Gemini fallback');
      const response = await getFastGeminiResponse(message);
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
  
  // Skip for greetings and basic questions
  const simplePatterns = [
    /^(hi|hello|hey|thanks|thank you|bye|goodbye)$/i,
    /^(who are you|what are you|how are you)$/i,
    /^(help|what can you do|capabilities)$/i
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
    /\b(help|assist|support)\b/i
  ];
  
  return conversationalPatterns.some(pattern => pattern.test(queryLower)) && queryLower.length < 50;
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
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // All retries failed
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
    
    // Don't throw for non-critical operations
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