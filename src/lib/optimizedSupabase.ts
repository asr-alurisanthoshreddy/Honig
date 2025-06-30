import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { HonigService } from './honigService';

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || 'placeholder-key';

// Check if properly configured
const isProduction = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Initialize HonigService only if configured
export const honigService = new HonigService();
if (isProduction) {
  honigService.init(supabase);
}

// Simple response cache for instant replies
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedResponse(query: string): string | null {
  const normalizedQuery = query.toLowerCase().trim();
  const cached = responseCache.get(normalizedQuery);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.response;
  }
  
  responseCache.delete(normalizedQuery);
  return null;
}

function setCachedResponse(query: string, response: string): void {
  const normalizedQuery = query.toLowerCase().trim();
  responseCache.set(normalizedQuery, {
    response,
    timestamp: Date.now()
  });
  
  // Clean old entries
  if (responseCache.size > 100) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are Honig, developed by Honig. Provide a helpful, accurate response to: ${message}`;
    
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

// Optimized response function with fast path
export async function getResponse(message: string): Promise<string> {
  try {
    console.log('⚡ Processing query with optimized pipeline...');
    
    // 1. Check cache first for instant response
    const cached = getCachedResponse(message);
    if (cached) {
      console.log('🚀 Returning cached response (instant)');
      return cached;
    }

    // 2. Determine if this needs complex processing
    const needsWebSearch = shouldUseWebSearch(message);
    
    if (!needsWebSearch) {
      console.log('📝 Using fast Gemini path for simple query');
      const response = await getFastGeminiResponse(message);
      setCachedResponse(message, response);
      return response;
    }

    // 3. Use Honig for complex queries (only if configured)
    if (isProduction && honigService.isConfigured()) {
      console.log('🔍 Using Honig for complex query');
      
      try {
        const result = await honigService.processQuery(message);
        setCachedResponse(message, result.response);
        return result.response;
      } catch (honigError) {
        console.warn('Honig failed, falling back to fast response:', honigError);
        const fallback = await getFastGeminiResponse(message);
        setCachedResponse(message, fallback);
        return fallback;
      }
    } else {
      // Fallback to fast response
      console.log('📝 Using fast Gemini fallback');
      const response = await getFastGeminiResponse(message);
      setCachedResponse(message, response);
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
  
  // Skip web search for simple queries
  if (queryLower.length < 10) return false;
  
  // Skip for greetings and basic questions
  const simplePatterns = [
    /^(hi|hello|hey|thanks|thank you|bye|goodbye)$/i,
    /^(who are you|what are you|how are you)$/i,
    /^(help|what can you do)$/i
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
    /\b(compare|vs|versus|difference between)\b/i
  ];
  
  return webSearchIndicators.some(pattern => pattern.test(queryLower));
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

// Enhanced query logging with better error handling
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
      console.error('Error logging query:', error);
      throw new Error(`Failed to persist chat message: ${error.message}`);
    }

    return data[0];
  } catch (error) {
    console.error('Failed to log query:', error);
    throw error;
  }
}

// Safe database operation wrapper
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Database operation '${operationName}' failed:`, error);
    return fallbackValue;
  }
}