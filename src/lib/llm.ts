import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.error('Missing Gemini API key');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to get direct Gemini response with retry mechanism
export async function getGeminiResponse(query: string, maxRetries = 3): Promise<string> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Updated to the correct model name

      const result = await model.generateContent([
        "You are a helpful AI assistant. Answer questions clearly and accurately. For factual or knowledge-based questions, provide detailed information. For conversational queries, be friendly and engaging.",
        query
      ]);

      const response = await result.response;
      return response.text();
    } catch (error: any) {
      attempt++;
      
      // Check if it's a 503 error or other retryable error
      if (error?.message?.includes('503') || error?.message?.includes('overloaded')) {
        if (attempt < maxRetries) {
          // Exponential backoff: wait longer between each retry
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 8000);
          console.log(`Retrying request (attempt ${attempt} of ${maxRetries})`);
          await delay(backoffDelay);
          continue;
        }
      }
      
      // Log only the error message, not the full error object
      console.error('Gemini API error:', error.message);
      
      // Return a more specific error message based on the error type
      if (error?.message?.includes('503') || error?.message?.includes('overloaded')) {
        return "I'm experiencing high traffic at the moment. Please try your question again in a few seconds.";
      } else if (error?.message?.includes('quota')) {
        return "I've reached my usage limit. Please try again later.";
      } else {
        return "I encountered an issue processing your request. Please try again.";
      }
    }
  }
  
  return "The service is temporarily unavailable. Please try again in a moment.";
}