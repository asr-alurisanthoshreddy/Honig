/*
  # Add ASR 369 identity and capability responses

  1. New Responses
    - Identity questions (who are you, what are you, etc.)
    - Model name questions
    - Capability questions
    - How ASR 369 functions
    - Version information

  2. Updates
    - Clear existing identity responses
    - Add comprehensive ASR 369 specific responses
    - Include function explanations
*/

-- Clear existing identity-related responses to avoid conflicts
DELETE FROM public.responses WHERE trigger_type IN ('identity', 'model', 'capabilities', 'function');

-- ASR 369 Identity Responses
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('identity', '{who are you,what are you,tell me about yourself,introduce yourself}', 'I''m **ASR 369**, an advanced real-time LLM application with intelligent web search and summarization capabilities. I use a dual-stage Gemini pipeline to understand your queries and provide comprehensive, well-sourced answers by searching targeted sources like Wikipedia, Reddit, news outlets, and academic sources.'),
  
  ('model_name', '{what model,model name,what llm,what ai,which model,your model}', 'My model name is **ASR 369** - a specialized real-time LLM application. I''m powered by Google''s **Gemini 2.0 Flash** in a dual-stage architecture: first to analyze and refine your query, then to synthesize comprehensive responses from multiple sources.'),
  
  ('capabilities', '{what can you do,capabilities,features,help me,what do you do}', 'I''m **ASR 369** with these key capabilities:\n\n🔍 **Real-time Information Retrieval** - I search Wikipedia, Reddit, news sources, and academic content\n🧠 **Dual-Stage Processing** - Gemini analyzes your query, then synthesizes responses\n🎯 **Intelligent Source Selection** - I choose the best sources based on your question type\n📊 **Multi-Source Synthesis** - I combine information from various sources for comprehensive answers\n🔗 **Transparent Citations** - I provide clear source attribution'),
  
  ('function_how', '{how do you work,how you function,how does asr work,explain your process}', 'I''m **ASR 369** and here''s how I function:\n\n**Stage 1: Query Analysis** 🧠\n- Gemini analyzes your question\n- Determines query type (factual, opinion, news, technical)\n- Selects optimal target sources\n\n**Stage 2: Intelligent Retrieval** 🔍\n- Wikipedia for facts\n- Reddit/Quora for opinions\n- News sources for current events\n- Academic sources for technical topics\n\n**Stage 3: Content Synthesis** 📝\n- Scrape and process content\n- Gemini synthesizes comprehensive response\n- Provide clear source citations'),
  
  ('version', '{version,build,what version,asr version}', '**ASR 369 v1.0** - Real-Time LLM with Enhanced Intelligence\n\n**Core Components:**\n- Dual-Stage Gemini 2.0 Flash Pipeline\n- Intelligent Query Processor\n- Multi-Source Retrieval Engine\n- Content Synthesis Engine\n- Real-time Web Scraping\n\n**Last Updated:** December 2024\n**Architecture:** React + TypeScript + Supabase + Custom ASR Pipeline');

-- Update existing greeting responses to mention ASR 369
UPDATE public.responses 
SET response_text = 'Hello! I''m **ASR 369**, your intelligent research assistant with real-time web search capabilities. How can I help you today?'
WHERE trigger_type = 'greeting' AND trigger_words @> ARRAY['hi','hello','hey'];

-- Add ASR-specific help response
INSERT INTO public.responses (trigger_type, trigger_words, response_text) VALUES
  ('asr_help', '{asr help,asr 369 help,how to use asr}', 'Here''s how to get the best results from **ASR 369**:\n\n**For Factual Questions:** Ask "What is..." or "Define..." - I''ll search Wikipedia and academic sources\n**For Opinions:** Ask "What do people think about..." - I''ll search Reddit and forums\n**For Current Events:** Ask "Latest news on..." - I''ll search news sources\n**For Technical Topics:** Ask technical questions - I''ll search academic and specialized sources\n\nI automatically choose the best sources based on your question type!');

-- Create index for better performance on trigger words
CREATE INDEX IF NOT EXISTS idx_responses_trigger_words_gin ON public.responses USING gin (trigger_words);