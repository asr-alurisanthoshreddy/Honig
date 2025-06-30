import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { HonigService } from './honigService';
import { FollowUpProcessor, type ConversationContext, type FollowUpAnalysis } from './followUpProcessor';
import { FastResponseCache } from './fastResponseCache';

// Initialize cache
const responseCache = new FastResponseCache();

// Get environment variables and clean them - with fallbacks for deployment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || 'placeholder-key';

// Only validate if not using placeholder values
const isProduction = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key';

if (isProduction) {
  try {
    const url = new URL(supabaseUrl);
    if (!url.hostname.includes('supabase.co') && !url.hostname.includes('localhost')) {
      console.warn('URL does not appear to be a standard Supabase URL format');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Invalid Supabase URL:', supabaseUrl);
    throw new Error(
      `Invalid Supabase URL format: "${supabaseUrl}". Please check your VITE_SUPABASE_URL in .env file. The URL should start with https:// and typically end with .supabase.co. Error: ${errorMessage}`
    );
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Create and initialize HonigService after supabase is ready - only if configured
export const honigService = new HonigService();
if (isProduction) {
  honigService.init(supabase);
}

// User profile functions
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
}

function validateGeminiApiKey(): string {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  
  if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
    throw new Error('❌ VITE_GEMINI_API_KEY is not set in your .env file. Please add your Gemini API key to continue.');
  }
  
  if (geminiKey.length < 20) {
    throw new Error('❌ The Gemini API key appears to be invalid (too short). Please check your API key.');
  }
  
  if (!geminiKey.startsWith('AIza')) {
    console.warn('⚠️ Warning: Gemini API keys typically start with "AIza". Please verify your API key is correct.');
  }
  
  return geminiKey;
}

// Enhanced response function with follow-up processing and caching
export async function getResponse(message: string, conversationContext?: ConversationContext): Promise<string> {
  try {
    console.log('🚀 Processing query with enhanced follow-up detection...');
    
    // Check cache first for fast responses
    const cachedResponse = responseCache.get(message);
    if (cachedResponse) {
      console.log('⚡ Returning cached response for faster processing');
      return cachedResponse.response;
    }

    // Analyze if this is a follow-up query
    const context: ConversationContext = conversationContext || { messages: [] };
    const followUpAnalysis: FollowUpAnalysis = FollowUpProcessor.analyzeFollowUp(message, context);
    
    console.log('🔍 Follow-up analysis:', {
      isFollowUp: followUpAnalysis.isFollowUp,
      confidence: followUpAnalysis.confidence,
      queryType: followUpAnalysis.queryType
    });

    let processedMessage = message;
    
    // If it's a follow-up, enhance with context
    if (followUpAnalysis.isFollowUp && followUpAnalysis.contextNeeded) {
      console.log('🔗 Enhancing follow-up query with conversation context');
      processedMessage = FollowUpProcessor.enhanceQueryWithContext(message, context, followUpAnalysis);
    }

    // Check if Honig service is configured
    if (isProduction) {
      const config = honigService.getConfiguration();
      
      if (!config.isConfigured) {
        console.warn('⚠️ Honig not configured, using enhanced Gemini fallback');
        return await fastGeminiResponse(processedMessage, followUpAnalysis);
      }
      
      // Determine if query should use Honig (follow-ups usually don't need web search)
      const shouldUseHonig = !followUpAnalysis.isFollowUp && HonigService.shouldUseHonig(message);
      
      if (!shouldUseHonig) {
        console.log('📝 Using fast Gemini for follow-up/simple query');
        return await fastGeminiResponse(processedMessage, followUpAnalysis);
      }
      
      // Process through Honig for complex queries
      const result = await honigService.processQuery(processedMessage);
      
      // Cache the response for future use
      responseCache.set(message, result.response, result.sources, result.metadata);
      
      console.log('✅ Honig processing completed:', {
        queryType: result.metadata.queryType,
        sourceCount: result.sources.length,
        confidence: result.metadata.confidence,
        processingTime: result.metadata.processingStages?.total
      });

      return result.response;
    } else {
      // Not in production or not configured - use fast response
      return await fastGeminiResponse(processedMessage, followUpAnalysis);
    }

  } catch (error) {
    console.error('Error in processing:', error);
    
    // Enhanced fallback with better error messages
    if (error instanceof Error) {
      if (error.message.includes('API key expired') || error.message.includes('API_KEY_INVALID')) {
        return "🔑 **API Key Expired**: Your Gemini API key has expired and needs to be renewed. Please visit [Google AI Studio](https://makersuite.google.com/app/apikey) to generate a new key and update your .env file.";
      }
      
      if (error.message.includes('API key not valid') || error.message.includes('Invalid API key') || error.message.includes('403')) {
        return "❌ **Invalid API Key**: Your Gemini API key appears to be incorrect. Please check your VITE_GEMINI_API_KEY environment variable and ensure it's a valid Gemini API key.";
      }
      
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return "⏳ **Usage Limit Reached**: I've reached my API usage limit. Please try again in a few minutes.";
      }
    }
    
    // Try fast fallback
    try {
      console.log('🔄 Falling back to fast Gemini response');
      return await fastGeminiResponse(message, { isFollowUp: false, confidence: 0, contextNeeded: false, queryType: 'new' });
    } catch (fallbackError) {
      console.error('Even fast fallback failed:', fallbackError);
      return "🔧 **Welcome to Honig!** I'm your AI research assistant. To get started, please configure your API keys as described in the README file.";
    }
  }
}

// Fast Gemini response for follow-ups and simple queries
async function fastGeminiResponse(message: string, followUpAnalysis: FollowUpAnalysis): Promise<string> {
  console.log('⚡ Using fast Gemini response for quick processing');
  
  try {
    const geminiKey = validateGeminiApiKey();
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let prompt = message;
    
    // Optimize prompt based on follow-up analysis
    if (followUpAnalysis.isFollowUp) {
      prompt = `You are Honig, developed by Honig. This is a follow-up question in an ongoing conversation. 

${message}

Provide a direct, helpful response that addresses this follow-up question. Be concise but comprehensive.`;
    } else {
      prompt = `You are Honig, an AI assistant developed by Honig. Provide a helpful, accurate response to this query:

${message}

Be informative and well-structured in your response.`;
    }

    const result = await model.generateContent([prompt]);
    const response = await result.response;
    const text = response.text();

    // Cache the response
    responseCache.set(message, text);
    
    return text;

  } catch (error) {
    console.error('💥 Fast Gemini response failed:', error);
    throw error;
  }
}

// Simple response for basic queries
function getSimpleResponse(message: string): string {
  const messageLower = message.toLowerCase().trim();
  
  if (/^(hello|hi|hey)(\s|$)/i.test(messageLower)) {
    return "Hello! I'm **Honig**, your AI research assistant developed by **Honig**. I can help you find accurate, up-to-date information on any topic by searching and analyzing multiple sources in real-time. What would you like to research today?";
  }
  
  if (messageLower.includes('help')) {
    return "I'm **Honig**, developed by **Honig**. I can help you with research, current events, technical topics, and much more. Just ask me any question!";
  }
  
  return "I'm **Honig**, your AI research assistant developed by **Honig**. I can help you find accurate, current information on any topic. What would you like to know?";
}

// Enhanced query logging with sources
export async function logQuery(
  userId: string | null,
  query: string,
  response: string,
  sources: any[] = [],
  conversationId?: string
) {
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
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Failed to log query:', error);
    return null;
  }
}

// Function to get cached queries
export async function getCachedQuery(query: string, maxAgeMinutes = 60) {
  if (!isProduction) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .rpc('get_cached_query', {
        search_query: query,
        max_age_minutes: maxAgeMinutes
      });

    if (error) throw error;
    
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error getting cached query:', error);
    return null;
  }
}