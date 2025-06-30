import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider } from '../../types';

export class GeminiProvider implements LLMProvider {
  name = 'Gemini';
  maxTokens = 30720;
  costPerToken = 0.00025; // Approximate cost per 1K tokens
  supportsStreaming = true;

  private genAI: GoogleGenerativeAI;
  private model: any;
  private isHealthy = false;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
      throw new Error('Valid Gemini API key is required');
    }
    
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      this.isHealthy = true;
    } catch (error) {
      console.error('Failed to initialize Gemini provider:', error);
      throw new Error(`Gemini initialization failed: ${error.message}`);
    }
  }

  async generateResponse(prompt: string, context?: string): Promise<string> {
    if (!this.isHealthy) {
      throw new Error('Gemini provider is not properly initialized');
    }

    try {
      let fullPrompt = prompt;
      
      if (context) {
        fullPrompt = `Context: ${context}\n\nQuery: ${prompt}\n\nPlease provide a comprehensive answer based on the context provided. If the context doesn't contain enough information to fully answer the question, clearly state what information is missing.`;
      }

      const result = await this.model.generateContent([fullPrompt]);
      const response = await result.response;
      
      return response.text();
    } catch (error: any) {
      console.error('Gemini API error:', error);
      
      // Handle specific error types
      if (error?.message?.includes('API key not valid') || error?.message?.includes('API_KEY_INVALID')) {
        this.isHealthy = false;
        throw new Error('Invalid Gemini API key. Please check your VITE_GEMINI_API_KEY environment variable.');
      } else if (error?.message?.includes('503') || error?.message?.includes('overloaded')) {
        throw new Error('The AI service is currently experiencing high traffic. Please try again in a moment.');
      } else if (error?.message?.includes('quota') || error?.message?.includes('QUOTA_EXCEEDED')) {
        throw new Error('API quota exceeded. Please try again later.');
      } else if (error?.message?.includes('safety') || error?.message?.includes('SAFETY')) {
        throw new Error('The request was blocked due to safety concerns. Please rephrase your question.');
      } else if (error?.message?.includes('400')) {
        throw new Error('Invalid request format. Please try rephrasing your question.');
      } else {
        throw new Error(`AI service error: ${error.message}`);
      }
    }
  }

  async generateStreamingResponse(prompt: string, context?: string): Promise<AsyncIterable<string>> {
    if (!this.isHealthy) {
      throw new Error('Gemini provider is not properly initialized');
    }

    try {
      let fullPrompt = prompt;
      
      if (context) {
        fullPrompt = `Context: ${context}\n\nQuery: ${prompt}\n\nPlease provide a comprehensive answer based on the context provided.`;
      }

      const result = await this.model.generateContentStream([fullPrompt]);
      
      return {
        async *[Symbol.asyncIterator]() {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              yield chunkText;
            }
          }
        }
      };
    } catch (error: any) {
      console.error('Gemini streaming error:', error);
      
      if (error?.message?.includes('API key not valid')) {
        this.isHealthy = false;
        throw new Error('Invalid Gemini API key for streaming');
      }
      
      throw new Error(`Streaming failed: ${error.message}`);
    }
  }

  isHealthy(): boolean {
    return this.isHealthy;
  }

  getModelInfo() {
    return {
      name: this.name,
      maxTokens: this.maxTokens,
      costPerToken: this.costPerToken,
      supportsStreaming: this.supportsStreaming,
      capabilities: [
        'text-generation',
        'code-generation', 
        'analysis',
        'multilingual'
      ],
      isHealthy: this.isHealthy
    };
  }
}