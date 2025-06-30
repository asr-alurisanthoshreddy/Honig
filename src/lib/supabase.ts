import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { HonigService } from './honigService';

// Get environment variables and clean them - with fallbacks for deployment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || 'placeholder-key';

// Only validate if not using placeholder values
const isProduction = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key';

if (isProduction) {
  // Validate URL format with better error handling
  try {
    const url = new URL(supabaseUrl);
    // Additional validation for Supabase URL format
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

// **ENHANCED: Validate Gemini API key and provide better error messages**
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

// **NEW: Enhanced Gemini response with conversation context for follow-up queries**
async function getGeminiResponseWithContext(message: string, conversationHistory: any[] = []): Promise<string> {
  try {
    console.log('🧠 Processing with conversation context...');
    console.log(`📚 Context: ${conversationHistory.length} previous messages`);
    
    // Validate API key first
    const geminiKey = validateGeminiApiKey();

    // Dynamic import to avoid build issues
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Build comprehensive context prompt
    let contextPrompt = `You are Honig, an advanced AI assistant developed by Honig. You have access to the complete conversation history and should use it to provide contextual, relevant responses.

**CRITICAL CONTEXT ANALYSIS INSTRUCTIONS:**

1. **ANALYZE CONVERSATION HISTORY:** Review all previous messages to understand what the user has shared, especially any file content or extracted information.

2. **DETECT FOLLOW-UP QUERIES:** Determine if the current query is asking for something specific based on previous content (like "codes for all questions" after file analysis).

3. **USE EXTRACTED CONTENT:** If the user previously shared file content with questions/problems, and now asks for "codes" or "solutions", provide specific code for those exact questions, NOT generic examples.

4. **MAINTAIN CONTEXT:** Reference specific information from previous messages and build upon what was already discussed.

**CONVERSATION HISTORY:**
`;

    // Add complete conversation history for context
    if (conversationHistory.length > 0) {
      conversationHistory.forEach((msg, index) => {
        if (msg.role === 'user') {
          contextPrompt += `\nUser Message ${index + 1}: ${msg.content}\n`;
        } else {
          // Include assistant responses, especially file analysis content
          const content = msg.content.length > 1000 ? msg.content.substring(0, 1000) + '...[truncated]' : msg.content;
          contextPrompt += `\nHonig Response ${index + 1}: ${content}\n`;
        }
      });
    }

    contextPrompt += `\n**CURRENT USER QUERY:** "${message}"

**RESPONSE INSTRUCTIONS:**

1. **If this is a follow-up query** (like asking for codes after file analysis):
   - Use the specific content from previous messages
   - Provide solutions for the exact questions/problems mentioned earlier
   - Reference the specific file content or extracted information
   - Do NOT provide generic examples

2. **If this is a new query:**
   - Provide a comprehensive response
   - Still reference relevant context from conversation history
   - Use proper formatting with headings and bullet points

3. **For code requests based on previous content:**
   - Extract the specific questions/problems from the conversation history
   - Provide working code solutions for each identified question
   - Use proper code blocks with language specification
   - Include explanations for each solution

4. **Always maintain conversation continuity:**
   - Reference what was discussed before
   - Build upon previous information
   - Show understanding of the full context

**FORMATTING REQUIREMENTS:**
- Use proper markdown formatting
- Structure responses with clear headings
- Put each bullet point on its own line
- Use code blocks for code examples
- Provide comprehensive, well-organized responses

Analyze the conversation history and provide a contextual response to the current query:`;

    const result = await model.generateContent([contextPrompt]);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error('💥 Contextual Gemini processing failed:', error);
    
    // Enhanced fallback with better error messages for expired/invalid API keys
    if (error instanceof Error) {
      if (error.message.includes('API key expired') || error.message.includes('API_KEY_INVALID')) {
        return "🔑 **API Key Expired**: Your Gemini API key has expired and needs to be renewed. Please:\n\n1. **Visit Google AI Studio**: Go to [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)\n2. **Generate a new API key**: Create a fresh API key for your project\n3. **Update your .env file**: Replace the old `VITE_GEMINI_API_KEY` with the new one\n4. **Restart the server**: Run `npm run dev` to reload the environment variables\n\nOnce updated, file analysis and AI features will work normally again.";
      }
      
      if (error.message.includes('API key not valid') || error.message.includes('Invalid API key') || error.message.includes('403')) {
        return "❌ **Invalid API Key**: Your Gemini API key appears to be incorrect. Please:\n\n1. **Check your .env file**: Ensure `VITE_GEMINI_API_KEY` is set correctly\n2. **Verify the key format**: Gemini API keys typically start with 'AIza'\n3. **Get a valid key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey) to generate a new key\n4. **Restart the server**: Run `npm run dev` after updating the .env file\n\nRefer to the README file for detailed setup instructions.";
      }
      
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return "⏳ **Usage Limit Reached**: I've reached my API usage limit. Please try again in a few minutes, or check your API quota in Google AI Studio.";
      }

      if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
        return "🌐 **Network Connection Issue**: I'm having trouble connecting to the AI service. This could be due to:\n\n• **Network connectivity** - Check your internet connection\n• **Firewall/VPN** - Ensure access to `generativelanguage.googleapis.com`\n• **Browser extensions** - Try disabling ad-blockers or privacy extensions\n• **API key issues** - Verify your Gemini API key is valid\n\nPlease check these items and try again.";
      }

      if (error.message.includes('VITE_GEMINI_API_KEY is not set')) {
        return "🔧 **Configuration Required**: To use AI features, you need to set up your API keys:\n\n1. **Get a Gemini API key** from [Google AI Studio](https://makersuite.google.com/app/apikey)\n2. **Create a .env file** in your project root\n3. **Add your API key**: `VITE_GEMINI_API_KEY=your_key_here`\n4. **Restart the application**\n\nFor now, you can explore the interface and see how the app works!";
      }
    }
    
    // Generic fallback
    return "Hello! I'm **Honig**, your AI research assistant. To use AI features, please configure your API keys as described in the README file. Once configured, I can help you with research, analysis, and much more!";
  }
}

// **ENHANCED: Main response function with conversation context**
export async function getResponse(message: string, conversationHistory: any[] = []): Promise<string> {
  try {
    console.log('🤖 Processing query with conversation context...');
    console.log(`📚 Conversation context: ${conversationHistory.length} messages`);
    
    // Check if Honig service is configured and should be used
    if (isProduction) {
      const config = honigService.getConfiguration();
      
      if (!config.isConfigured) {
        console.warn('⚠️ Honig not configured, using contextual Gemini');
        return await getGeminiResponseWithContext(message, conversationHistory);
      }
      
      // Determine if query should use Honig (for web search) or contextual Gemini (for follow-ups)
      const shouldUseHonig = HonigService.shouldUseHonig(message);
      const isFollowUpQuery = isFollowUpBasedOnContext(message, conversationHistory);
      
      // **KEY FEATURE: Use contextual Gemini for follow-up queries**
      if (isFollowUpQuery || !shouldUseHonig) {
        console.log('📝 Using contextual Gemini for follow-up/contextual query');
        return await getGeminiResponseWithContext(message, conversationHistory);
      }
      
      // Use Honig for web search queries
      console.log('🔍 Using Honig for web search query');
      const result = await honigService.processQuery(message);
      
      console.log('✅ Honig processing completed:', {
        queryType: result.metadata.queryType,
        sourceCount: result.sources.length,
        confidence: result.metadata.confidence,
        processingTime: result.metadata.processingStages?.total
      });

      return result.response;
    } else {
      // Not in production or not configured - use contextual response
      return await getGeminiResponseWithContext(message, conversationHistory);
    }

  } catch (error) {
    console.error('Error in processing:', error);
    
    // Try contextual Gemini as final fallback
    try {
      console.log('🔄 Falling back to contextual Gemini');
      return await getGeminiResponseWithContext(message, conversationHistory);
    } catch (fallbackError) {
      console.error('Even contextual Gemini failed:', fallbackError);
      
      // Return a helpful message instead of crashing
      return "🔧 **Welcome to Honig!** \n\nThis is a powerful AI research assistant that can:\n\n🔍 **Search multiple sources** - Wikipedia, news, academic papers, forums\n🧠 **Intelligent analysis** - Understands your query type and selects best sources\n📊 **Comprehensive responses** - Combines information from various sources\n🎯 **Real-time information** - Gets the latest data on any topic\n\n**To get started:**\n1. Set up your API keys (see README.md)\n2. Ask any question and I'll search the web for answers\n3. Upload files for analysis\n4. Get real-time information on any topic\n\n*Currently running in demo mode - configure your API keys for full functionality.*";
    }
  }
}

// **NEW: Function to detect follow-up queries based on conversation context**
function isFollowUpBasedOnContext(message: string, conversationHistory: any[]): boolean {
  const messageLower = message.toLowerCase().trim();
  
  // Check if this looks like a follow-up query
  const followUpIndicators = [
    // Code requests that reference previous content
    /give.*codes?.*for.*all/i,
    /codes?.*for.*all.*questions?/i,
    /provide.*codes?.*for.*all/i,
    /write.*codes?.*for.*all/i,
    /codes?.*for.*each/i,
    /codes?.*for.*every/i,
    /solutions?.*for.*all/i,
    /solve.*all.*questions?/i,
    /answers?.*for.*all/i,
    
    // References to previous content
    /based on.*above/i,
    /from.*previous/i,
    /using.*extracted/i,
    /for.*those.*questions?/i,
    /for.*these.*questions?/i,
    /regarding.*that/i,
    /about.*that/i,
    /from.*what.*you.*extracted/i,
    /using.*the.*file/i,
    /based.*on.*the.*file/i,
    
    // Programming language specific follow-ups
    /in.*c\+\+.*for.*all/i,
    /in.*python.*for.*all/i,
    /in.*java.*for.*all/i,
    /using.*c\+\+.*for.*all/i,
    /using.*python.*for.*all/i,
  ];
  
  const isFollowUpPattern = followUpIndicators.some(pattern => pattern.test(messageLower));
  
  // Check if there's relevant previous content (like file analysis)
  const hasRelevantContext = conversationHistory.some(msg => 
    msg.role === 'assistant' && (
      msg.content.includes('questions') ||
      msg.content.includes('problems') ||
      msg.content.includes('Table') ||
      msg.content.includes('extracted') ||
      msg.metadata?.fromFileAnalysis
    )
  );
  
  const isFollowUp = isFollowUpPattern && hasRelevantContext;
  
  if (isFollowUp) {
    console.log('🎯 FOLLOW-UP QUERY DETECTED:', messageLower);
    console.log('📚 Has relevant context:', hasRelevantContext);
  }
  
  return isFollowUp;
}

// Simple response for basic queries (only used for very basic greetings)
function getSimpleResponse(message: string): string {
  const messageLower = message.toLowerCase().trim();
  
  if (/^(hello|hi|hey)(\s|$)/i.test(messageLower)) {
    return "Hello! I'm **Honig**, your AI research assistant developed by **Honig**. I can help you find accurate, up-to-date information on any topic by searching and analyzing multiple sources in real-time. What would you like to research today?";
  }
  
  if (messageLower.includes('help')) {
    return "I'm **Honig**, developed by **Honig**. I can help you with:\n\n🔍 **Real-time Research** - Current events, latest developments, breaking news\n📚 **Factual Information** - Definitions, explanations, historical facts\n💭 **Multiple Perspectives** - Opinions, reviews, community discussions\n🔬 **Technical Topics** - Science, technology, academic subjects\n💻 **Programming & Code** - Code examples, algorithms, programming concepts\n📄 **File Analysis** - Upload and analyze documents, images, PDFs\n\nJust ask me any question and I'll search the most relevant sources to give you a comprehensive answer!";
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

// Function to get cached queries (for potential optimization)
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