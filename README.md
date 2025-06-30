# 🔹 Honig: Real-Time LLM with Intelligent Web Search & Summarization

Honig is a sophisticated AI assistant that leverages real-time web search and Retrieval-Augmented Generation (RAG) to deliver accurate and context-aware answers. The system uses a dual-stage Gemini pipeline for optimal results.

## 🚀 Live Demo

**Deployed Application:** https://charming-pithivier-97db65.netlify.app

The application is deployed and ready to use! You can:
- ✅ **Try it immediately** - The app works in demo mode without any setup
- ✅ **Explore the interface** - See all features and capabilities
- ✅ **Test basic functionality** - Chat interface, file upload, dark mode
- ⚙️ **Configure for full features** - Add API keys for AI capabilities

## 🎯 Quick Start (No Setup Required)

1. **Visit the live demo**: https://charming-pithivier-97db65.netlify.app
2. **Explore the interface** - Try the chat, toggle dark mode, explore features
3. **See the app in action** - All UI components are fully functional

## 🔧 Full Setup (For AI Features)

To unlock AI capabilities and real-time search:

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd honig
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:

```env
# Required for AI Features
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Required for Database Features (Optional)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Enhanced Search Capabilities
VITE_SERPER_API_KEY=your_serper_api_key_here
VITE_NEWS_API_KEY=your_newsapi_key_here
```

### 3. Get Your API Keys

#### **Gemini API Key (Required for AI)**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env` as `VITE_GEMINI_API_KEY`

#### **Supabase Setup (Optional - for user accounts)**
1. Visit [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API
4. Copy Project URL and anon key
5. Add to `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

#### **Search APIs (Optional - for enhanced search)**
- **Serper API**: [serper.dev](https://serper.dev) - For Google Search
- **NewsAPI**: [newsapi.org](https://newsapi.org) - For news sources

### 4. Run the Application
```bash
npm run dev
```

## 🌟 Features

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

## 🏗 Architecture

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

## 🚀 Deployment

The application is automatically deployed to Netlify and includes:

- ✅ **Production-ready build** with optimized assets
- ✅ **Environment variable support** for API keys
- ✅ **Graceful fallbacks** when APIs aren't configured
- ✅ **Mobile-responsive design** for all devices
- ✅ **Dark mode support** with system preference detection

### **Deploy Your Own**

1. **Fork this repository**
2. **Connect to Netlify** (or your preferred hosting platform)
3. **Set environment variables** in your hosting platform's dashboard
4. **Deploy** - The app will work immediately, with full features when configured

## 🛠 Troubleshooting

### **App Shows Blank Page**
- Check browser console for JavaScript errors
- Ensure environment variables are properly set
- Try clearing browser cache and refreshing

### **AI Features Not Working**
1. Verify your Gemini API key is valid and properly configured
2. Check that the API key starts with "AIza"
3. Ensure you have sufficient quota/credits
4. Check the browser console for specific error messages

### **Database Connection Issues**
1. Verify your Supabase project has the required tables
2. Check that Row Level Security policies are properly configured
3. Ensure your database migrations have been applied

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

**Live Demo**: https://charming-pithivier-97db65.netlify.app