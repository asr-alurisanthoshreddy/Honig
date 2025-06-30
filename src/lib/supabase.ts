import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { HonigService } from './honigService';

// Get environment variables and clean them
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Create and initialize HonigService after supabase is ready
export const honigService = new HonigService();
honigService.init(supabase);

// User profile functions
export async function upsertUserProfile(user: {
  id: string;
  email?: string;
  user_metadata?: {
    avatar_url?: string;
    name?: string;
  };
}) {
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
  
  if (!geminiKey) {
    throw new Error('❌ VITE_GEMINI_API_KEY is not set in your .env file. Please add your Gemini API key to continue.');
  }
  
  if (geminiKey === 'your_gemini_api_key_here') {
    throw new Error('❌ Please replace "your_gemini_api_key_here" with your actual Gemini API key in the .env file.');
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
    }
    
    // Try two-stage processing as final fallback
    try {
      console.log('🔄 Falling back to two-stage processing');
      return await twoStageContentGeneration(message);
    } catch (fallbackError) {
      console.error('Even two-stage processing failed:', fallbackError);
      
      // Provide specific error guidance based on the fallback error
      if (fallbackError instanceof Error) {
        if (fallbackError.message.includes('API key expired') || fallbackError.message.includes('API_KEY_INVALID')) {
          return "🔑 **API Key Expired**: Your Gemini API key has expired. Please visit [Google AI Studio](https://makersuite.google.com/app/apikey) to generate a new key, update your .env file, and restart the development server.";
        }
        
        if (fallbackError.message.includes('Failed to fetch')) {
          return "🚨 **Connection Failed**: Unable to reach the AI service. Please:\n\n1. **Check your internet connection**\n2. **Verify your Gemini API key** in the `.env` file\n3. **Restart the development server** with `npm run dev`\n4. **Disable browser extensions** that might block API requests\n5. **Check for firewall/VPN restrictions**\n\nIf the problem persists, please check the browser console for more details.";
        }
      }
      
      return "❌ **Technical Difficulties**: I'm currently experiencing issues. Please check your configuration and try again. If the problem persists, please review the setup instructions in the README file.";
    }
  }
}

// **ENHANCED: Two-stage content generation with better error handling**
async function twoStageContentGeneration(message: string): Promise<string> {
  console.log('🚀 TWO-STAGE PROCESSING: Format first, then generate content');
  
  // Validate API key first
  const geminiKey = validateGeminiApiKey();

  try {
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

**EXAMPLE STRUCTURE FOR CODE:**

# 💻 Complete C++ Programming Examples

## 🔧 Data Structures

### 1. Linked List Implementation
\`\`\`cpp
// Complete working code here (50+ lines)
\`\`\`

### 2. Binary Tree Operations
\`\`\`cpp
// Complete working code here (50+ lines)
\`\`\`

## 🧮 Algorithms

### 3. Sorting Algorithms
\`\`\`cpp
// Complete working code here (50+ lines)
\`\`\`

Generate your well-formatted, comprehensive response:
`;

    const stage1Result = await model.generateContent([stage1Prompt]);
    const stage1Response = await stage1Result.response;
    const formattedContent = stage1Response.text();

    console.log('✅ STAGE 1 COMPLETE: Content formatted and structured');

    // **STAGE 2: Verify and enhance the formatted content**
    console.log('🔍 STAGE 2: Verifying and enhancing formatted content...');
    
    const stage2Prompt = `
You are Honig's content verification system. Review and enhance the formatted content to ensure it meets all requirements.

**ORIGINAL USER REQUEST:** "${message}"

**FORMATTED CONTENT TO REVIEW:**
${formattedContent}

**VERIFICATION CHECKLIST:**

1. ✅ **Structure Check** - Are headings and subheadings properly formatted?
2. ✅ **Bullet Points** - Are all bullet points on unique lines with proper spacing?
3. ✅ **Content Completeness** - Is the content comprehensive and detailed?
4. ✅ **Code Quality** - If code examples, are they complete and working?
5. ✅ **Formatting** - Is spacing and formatting consistent?

**ENHANCEMENT INSTRUCTIONS:**

If the content is well-formatted and complete:
- Return it as-is with minor improvements if needed

If the content needs improvement:
- Fix formatting issues
- Add missing bullet points or spacing
- Ensure all code examples are complete
- Improve structure and clarity

**FINAL REQUIREMENTS:**
- Each bullet point must be on a unique line
- Proper spacing between sections
- Clear headings and subheadings
- Complete, working code examples (if applicable)
- Comprehensive, detailed content

Return the final, perfectly formatted content:
`;

    const stage2Result = await model.generateContent([stage2Prompt]);
    const stage2Response = await stage2Result.response;
    const finalContent = stage2Response.text();

    console.log('✅ TWO-STAGE PROCESSING COMPLETE: Content formatted and verified');
    return finalContent;

  } catch (error) {
    console.error('💥 Two-stage processing failed:', error);
    
    // Provide specific error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes('API key expired') || error.message.includes('API_KEY_INVALID')) {
        throw new Error(`API key expired: Your Gemini API key has expired and needs to be renewed. Please visit Google AI Studio to generate a new key and update your VITE_GEMINI_API_KEY in the .env file.`);
      }
      
      if (error.message.includes('Failed to fetch')) {
        throw new Error(`Network connection failed: Unable to reach Google's AI service. Please check your internet connection and ensure access to generativelanguage.googleapis.com is not blocked by firewalls or browser extensions.`);
      }
      
      if (error.message.includes('API key not valid') || error.message.includes('403')) {
        throw new Error(`Invalid API key: Your Gemini API key appears to be incorrect or expired. Please verify your VITE_GEMINI_API_KEY in the .env file.`);
      }
      
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error(`API quota exceeded: You've reached your usage limit. Please try again later or check your quota in Google AI Studio.`);
      }
      
      throw new Error(`Two-stage processing failed: ${error.message}`);
    } else {
      throw new Error(`Two-stage processing failed: ${String(error)}`);
    }
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