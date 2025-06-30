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

// **ENHANCED: Two-stage processing - Format first, then follow-up**
export async function getResponse(message: string): Promise<string> {
  try {
    console.log('🤖 Processing query through enhanced two-stage pipeline...');
    
    // **STAGE 1: Check if this is a follow-up request for formatted content**
    const isFollowUpRequest = isFollowUpQuery(message);
    const isCodeRequest = isCodeGenerationRequest(message);
    
    if (isFollowUpRequest || isCodeRequest) {
      console.log('🎯 FOLLOW-UP/CODE DETECTED: Using two-stage processing');
      return await twoStageContentGeneration(message);
    }
    
    // Check if Honig service is configured
    if (isProduction) {
      const config = honigService.getConfiguration();
      
      if (!config.isConfigured) {
        console.warn('⚠️ Honig not configured, using enhanced Gemini fallback');
        return await twoStageContentGeneration(message);
      }
      
      // Determine if query should use Honig
      const shouldUseHonig = HonigService.shouldUseHonig(message);
      
      if (!shouldUseHonig) {
        console.log('📝 Using enhanced Gemini for simple query');
        return await twoStageContentGeneration(message);
      }
      
      // Process through Honig
      const result = await honigService.processQuery(message);
      
      console.log('✅ Honig processing completed:', {
        queryType: result.metadata.queryType,
        sourceCount: result.sources.length,
        confidence: result.metadata.confidence,
        processingTime: result.metadata.processingStages?.total
      });

      return result.response;
    } else {
      // Not in production or not configured - use basic response
      return await twoStageContentGeneration(message);
    }

  } catch (error) {
    console.error('Error in processing:', error);
    
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
    
    // Try two-stage processing as final fallback
    try {
      console.log('🔄 Falling back to two-stage processing');
      return await twoStageContentGeneration(message);
    } catch (fallbackError) {
      console.error('Even two-stage processing failed:', fallbackError);
      
      // Return a helpful message instead of crashing
      return "🔧 **Welcome to Honig!** \n\nThis is a powerful AI research assistant that can:\n\n🔍 **Search multiple sources** - Wikipedia, news, academic papers, forums\n🧠 **Intelligent analysis** - Understands your query type and selects best sources\n📊 **Comprehensive responses** - Combines information from various sources\n🎯 **Real-time information** - Gets the latest data on any topic\n\n**To get started:**\n1. Set up your API keys (see README.md)\n2. Ask any question and I'll search the web for answers\n3. Upload files for analysis\n4. Get real-time information on any topic\n\n*Currently running in demo mode - configure your API keys for full functionality.*";
    }
  }
}

// **ENHANCED: Two-stage content generation with better error handling**
async function twoStageContentGeneration(message: string): Promise<string> {
  console.log('🚀 TWO-STAGE PROCESSING: Format first, then generate content');
  
  try {
    // Validate API key first
    const geminiKey = validateGeminiApiKey();

    // Dynamic import to avoid build issues
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiKey);
    
    // Test connection with a simple model call first
    console.log('🔍 Testing API connection...');
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // **STAGE 1: Generate well-formatted content structure**
    console.log('📋 STAGE 1: Generating well-formatted content structure...');
    
    const stage1Prompt = `
You are Honig, an advanced AI assistant developed by Honig. You need to generate well-formatted, comprehensive content.

**USER REQUEST:** "${message}"

**CRITICAL FORMATTING REQUIREMENTS:**

1. **CLEAR STRUCTURE** - Use proper headings and subheadings
2. **BULLET POINTS** - Each point on a unique line with proper spacing
3. **NUMBERED LISTS** - For sequential content
4. **PROPER SPACING** - Clear separation between sections
5. **COMPREHENSIVE CONTENT** - Provide complete, detailed information

**FORMATTING GUIDELINES:**

# Main Heading
## Subheading
### Sub-subheading

**Bold Text** for emphasis

• Bullet point 1
• Bullet point 2
• Bullet point 3

1. Numbered item 1
2. Numbered item 2
3. Numbered item 3

**For Code Requests:**
- Provide 10-15 complete, working code examples
- Each example should be 50-200 lines of actual code
- Use proper code blocks with language specification
- Include detailed explanations for each example

**For General Requests:**
- Structure content with clear headings
- Use bullet points for lists
- Provide comprehensive information
- Ensure proper spacing and formatting

Generate your well-formatted, comprehensive response:
`;

    const stage1Result = await model.generateContent([stage1Prompt]);
    const stage1Response = await stage1Result.response;
    const formattedContent = stage1Response.text();

    console.log('✅ STAGE 1 COMPLETE: Content formatted and structured');
    return formattedContent;

  } catch (error) {
    console.error('💥 Two-stage processing failed:', error);
    
    // Return a helpful fallback message
    if (error instanceof Error && error.message.includes('VITE_GEMINI_API_KEY is not set')) {
      return "🔧 **Welcome to Honig!** \n\nThis is a powerful AI research assistant. To use AI features, you'll need to:\n\n1. **Get a Gemini API key** from [Google AI Studio](https://makersuite.google.com/app/apikey)\n2. **Set up your environment** (see README.md for details)\n3. **Configure your API keys**\n\nFor now, you can explore the interface and see how the app is structured!";
    }
    
    // Generic fallback
    return "Hello! I'm **Honig**, your AI research assistant. To get started, please configure your API keys as described in the README file. Once configured, I can help you with research, analysis, and much more!";
  }
}

// **ENHANCED: Better detection for code generation requests**
function isCodeGenerationRequest(message: string): boolean {
  const codePatterns = [
    // Direct code requests
    /give.*codes?/i,
    /provide.*codes?/i,
    /show.*codes?/i,
    /write.*codes?/i,
    /create.*codes?/i,
    /generate.*codes?/i,
    
    // Programming language mentions
    /in c\+\+/i,
    /using c\+\+/i,
    /c\+\+ code/i,
    /c\+\+ program/i,
    /c\+\+ example/i,
    /in python/i,
    /python code/i,
    /in java/i,
    /java code/i,
    
    // Programming concepts
    /algorithm/i,
    /function/i,
    /class/i,
    /program/i,
    /implementation/i,
    /solution/i,
    
    // Multiple items
    /all.*codes?/i,
    /codes? for all/i,
    /every.*code/i,
    /each.*code/i,
    /complete.*codes?/i
  ];

  return codePatterns.some(pattern => pattern.test(message));
}

// **ENHANCED: Better follow-up detection**
function isFollowUpQuery(message: string): boolean {
  const followUpPatterns = [
    // Code requests
    /give.*codes?/i,
    /provide.*codes?/i,
    /show.*codes?/i,
    /write.*codes?/i,
    /codes? for all/i,
    /all codes?/i,
    
    // Programming language specific
    /in c\+\+/i,
    /in python/i,
    /in java/i,
    /in javascript/i,
    /using c\+\+/i,
    /using python/i,
    
    // Solution requests
    /solutions? for all/i,
    /all solutions?/i,
    /solve all/i,
    /answers? for all/i,
    /all answers?/i,
    
    // Implementation requests
    /implement all/i,
    /create all/i,
    /build all/i,
    /make all/i,
    
    // Follow-up indicators
    /for all questions/i,
    /for each question/i,
    /for every question/i,
    /all of them/i,
    /each one/i,
    /every one/i,
    
    // Formatting requests
    /format.*content/i,
    /structure.*content/i,
    /organize.*content/i,
    /well.*formatted/i
  ];

  const messageText = message.toLowerCase().trim();
  
  // Check if message matches follow-up patterns
  const isFollowUp = followUpPatterns.some(pattern => pattern.test(messageText));
  
  if (isFollowUp) {
    console.log('🎯 FOLLOW-UP DETECTED:', messageText);
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