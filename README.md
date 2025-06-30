# 🔹 Honig: Real-Time LLM with Intelligent Web Search & Summarization

Honig is a sophisticated AI assistant that leverages real-time web search and Retrieval-Augmented Generation (RAG) to deliver accurate and context-aware answers. The system uses a dual-stage Gemini pipeline for optimal results.

## 🚨 **IMPORTANT: Setup Required**

**Before using this application, you MUST configure your Supabase credentials:**

1. **Create a Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project
2. **Get Your Credentials**: 
   - Navigate to your project dashboard
   - Go to Settings → API
   - Copy your Project URL and anon/public key
3. **Update Environment Variables**: 
   - Open the `.env` file in your project root
   - Replace `your_supabase_project_url_here` with your actual Supabase URL
   - Replace `your_supabase_anon_key_here` with your actual anon key
4. **Restart the Development Server**: Run `npm run dev` again after updating the `.env` file

## 🧠 How Honig Works

Honig uses an intelligent dual-stage processing pipeline:

### Stage 1: Query Processing with Gemini
- Analyzes and refines the user's raw query
- Determines query type (factual, opinion, news, technical, general)
- Selects optimal target sources based on query characteristics
- Generates refined search terms for better results

### Stage 2: Intelligent Source Retrieval
Based on the query type, Honig targets specific sources:

- **📚 Wikipedia** - For fact-based or entity-specific queries
- **💭 Reddit & Quora** - For opinion-based or community-driven questions  
- **🗞️ News Sources** - For current events and recent developments
- **🔬 Academic Sources** - For technical and scientific topics
- **🌐 General Forums** - For broader community insights

### Stage 3: Content Synthesis with Gemini
- Scrapes and processes content from retrieved sources
- Uses Gemini again to synthesize a comprehensive response
- Provides clear source attribution and citations
- Ensures accuracy and relevance

## 🚀 Features

### 🎯 **Intelligent Query Classification**
- Automatically detects query intent and type
- Routes to optimal sources based on content needs
- Adapts search strategy for different question types

### 🔍 **Multi-Source Intelligence**
- **Wikipedia API** for factual information
- **Google Search** (via Serper) for general web content
- **NewsAPI** for current events and breaking news
- **Site-specific searches** for Reddit, Quora, and academic sources

### 🧠 **Dual-Stage Gemini Pipeline**
- **Stage 1**: Query understanding and refinement
- **Stage 2**: Content synthesis and response generation
- Ensures both relevance and articulation

### 📊 **Transparent Processing**
- Real-time processing indicators
- Source attribution and confidence scores
- Processing time breakdown
- Query type classification display

### 💾 **Advanced Data Management**
- Conversation persistence (when logged in)
- Guest mode for immediate access
- Source caching for improved performance
- User annotations and notes

## 🛠 Technology Stack

### **AI & Processing**
- **Google Gemini 2.0 Flash** - Dual-stage query processing and synthesis
- **Custom Query Processor** - Intelligent query classification
- **Multi-Source Retrieval Engine** - Targeted content gathering
- **Content Synthesizer** - Comprehensive response generation

### **Search & Data Sources**
- **Serper API** - Google Search integration
- **NewsAPI** - Real-time news and articles
- **Wikipedia API** - Factual and encyclopedic content
- **Site-specific Search** - Reddit, Quora, academic sources

### **Frontend & Backend**
- **React 18** with TypeScript
- **Supabase** - Database and authentication
- **Tailwind CSS** - Modern styling
- **Framer Motion** - Smooth animations

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Google Gemini API key (required)
- Serper.dev API key (recommended)
- NewsAPI key (recommended)

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd honig
npm install
```

### 2. **CRITICAL: Supabase Setup**
**The application will not work without proper Supabase configuration:**

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose your organization and create the project

2. **Get Your Credentials**:
   - In your Supabase dashboard, go to Settings → API
   - Copy the "Project URL" 
   - Copy the "anon public" key

3. **Configure Environment Variables**:
   ```env
   # Replace with your actual Supabase credentials
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Apply Database Schema**:
   - The database migrations will be automatically applied
   - Ensure your Supabase project has the required tables (users, conversations, queries, responses)

### 3. Environment Setup
Copy `.env.example` to `.env` and configure:

```env
# Supabase Configuration (REQUIRED)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI/LLM Configuration (REQUIRED)
VITE_GEMINI_API_KEY=your_gemini_api_key

# Search APIs for Enhanced Capabilities (RECOMMENDED)
VITE_SERPER_API_KEY=your_serper_api_key
VITE_NEWS_API_KEY=your_newsapi_key
```

### 4. Start Development
```bash
npm run dev
```

**If you see "Failed to fetch" errors, double-check your Supabase credentials in the `.env` file.**

## 🔧 API Keys Setup

### **Supabase Setup (REQUIRED)**
1. Visit [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API
4. Copy Project URL and anon key
5. Add to `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### **Gemini API Key (REQUIRED)**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env` as `VITE_GEMINI_API_KEY`

### **Serper API Key (RECOMMENDED)**
1. Sign up at [Serper.dev](https://serper.dev)
2. Get your API key from the dashboard
3. Add to `.env` as `VITE_SERPER_API_KEY`

### **NewsAPI Key (RECOMMENDED)**
1. Register at [NewsAPI.org](https://newsapi.org)
2. Get your free API key
3. Add to `.env` as `VITE_NEWS_API_KEY`

## 🎯 Usage Examples

### **Factual Queries** (→ Wikipedia, Academic)
```
"What is quantum computing?"
"Who invented the transistor?"
"Define machine learning"
```

### **Opinion-Based Queries** (→ Reddit, Quora)
```
"What do people think about electric cars?"
"Best programming language for beginners?"
"Reviews of the latest iPhone"
```

### **Current Events** (→ News Sources)
```
"Latest developments in AI this week"
"Recent climate change news"
"Current stock market trends"
```

### **Technical Topics** (→ Academic, Forums)
```
"How does neural network training work?"
"Explain blockchain consensus mechanisms"
"Best practices for React performance"
```

## 🏗 Honig Architecture

### **Query Processing Pipeline**
1. **Input Analysis**: Gemini analyzes the raw user query
2. **Query Classification**: Determines type (factual, opinion, news, technical, general)
3. **Source Selection**: Chooses optimal sources based on query type
4. **Search Optimization**: Generates refined search terms

### **Source Retrieval Engine**
- **Wikipedia API**: Direct API calls for encyclopedic content
- **Serper Integration**: Google Search with site-specific filtering
- **NewsAPI**: Real-time news and article retrieval
- **Content Scraping**: Intelligent web scraping with quality scoring

### **Content Synthesis**
- **Multi-Source Aggregation**: Combines content from various sources
- **Relevance Ranking**: Scores and prioritizes content chunks
- **Gemini Synthesis**: Second Gemini call for comprehensive response
- **Citation Engine**: Automatic source attribution

## 🛠 Troubleshooting

### **"Failed to fetch" Error**
This error typically means your Supabase credentials are incorrect or missing:

1. Check your `.env` file has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Verify the credentials in your Supabase dashboard (Settings → API)
3. Restart your development server after updating `.env`
4. Ensure your Supabase project is active and not paused

### **Honig Not Working**
1. Verify your Gemini API key is valid and properly configured
2. Check that at least one search provider (Serper or NewsAPI) is configured
3. Ensure your API keys have sufficient quota/credits
4. Check the browser console for specific error messages

### **Database Connection Issues**
1. Verify your Supabase project has the required tables
2. Check that Row Level Security policies are properly configured
3. Ensure your database migrations have been applied

## 🚀 Deployment

### **Netlify Deployment**
```bash
npm run build
# Deploy dist/ folder to Netlify
```

### **Environment Variables**
Ensure all API keys are configured in your deployment environment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the [Issues](../../issues) page
2. Review the documentation
3. Create a new issue with detailed information

---

**Honig: Intelligent Research at the Speed of Thought** 🧠⚡