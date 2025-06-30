export interface CategorySource {
  name: string;
  url: string;
  selectors?: {
    title?: string;
    content?: string;
    article?: string;
  };
  updateFrequency?: 'daily' | 'weekly' | 'monthly';
  priority?: number;
}

export interface Category {
  name: string;
  keywords: string[];
  sources: CategorySource[];
  description: string;
}

export class CategoryManager {
  private categories: Map<string, Category> = new Map();

  constructor() {
    this.initializeCategories();
  }

  private initializeCategories() {
    // Technology Category
    this.addCategory({
      name: 'technology',
      description: 'Technology, AI, software development, and tech industry news',
      keywords: [
        'ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning',
        'programming', 'software', 'development', 'coding', 'javascript', 'python',
        'react', 'node', 'api', 'database', 'cloud', 'aws', 'azure', 'google cloud',
        'tech', 'technology', 'startup', 'silicon valley', 'venture capital',
        'blockchain', 'cryptocurrency', 'bitcoin', 'ethereum', 'web3', 'nft',
        'mobile', 'app', 'ios', 'android', 'framework', 'library', 'open source',
        'github', 'stackoverflow', 'developer', 'engineer', 'computer science'
      ],
      sources: [
        {
          name: 'TechCrunch',
          url: 'https://techcrunch.com',
          selectors: {
            title: 'h1, .post-title',
            content: '.article-content, .post-content',
            article: 'article, .post'
          },
          priority: 9
        },
        {
          name: 'Hacker News',
          url: 'https://news.ycombinator.com',
          selectors: {
            title: '.storylink',
            content: '.comment',
            article: '.athing'
          },
          priority: 8
        },
        {
          name: 'The Verge Tech',
          url: 'https://www.theverge.com/tech',
          selectors: {
            title: 'h1, .c-page-title',
            content: '.c-entry-content',
            article: 'article'
          },
          priority: 8
        },
        {
          name: 'Ars Technica',
          url: 'https://arstechnica.com',
          selectors: {
            title: 'h1.heading',
            content: '.post-content',
            article: 'article'
          },
          priority: 7
        },
        {
          name: 'MIT Technology Review',
          url: 'https://www.technologyreview.com',
          selectors: {
            title: 'h1',
            content: '.content',
            article: 'article'
          },
          priority: 9
        }
      ]
    });

    // Biology & Life Sciences
    this.addCategory({
      name: 'biology',
      description: 'Biology, life sciences, medical research, and health',
      keywords: [
        'biology', 'biotech', 'biotechnology', 'genetics', 'dna', 'rna', 'gene',
        'medical', 'medicine', 'health', 'healthcare', 'pharmaceutical', 'drug',
        'clinical trial', 'research', 'study', 'protein', 'cell', 'molecular',
        'neuroscience', 'brain', 'cancer', 'disease', 'treatment', 'therapy',
        'vaccine', 'virus', 'bacteria', 'microbiome', 'crispr', 'genome',
        'evolution', 'ecology', 'environment', 'species', 'organism'
      ],
      sources: [
        {
          name: 'Nature',
          url: 'https://www.nature.com',
          selectors: {
            title: 'h1.c-article-title',
            content: '.c-article-body',
            article: 'article'
          },
          priority: 10
        },
        {
          name: 'Science Magazine',
          url: 'https://www.science.org',
          selectors: {
            title: 'h1.article__headline',
            content: '.article__body',
            article: 'article'
          },
          priority: 10
        },
        {
          name: 'PubMed Central',
          url: 'https://www.ncbi.nlm.nih.gov/pmc',
          selectors: {
            title: '.content-title',
            content: '.article',
            article: '.article'
          },
          priority: 9
        },
        {
          name: 'Cell',
          url: 'https://www.cell.com',
          selectors: {
            title: 'h1.article-header__title',
            content: '.article-text',
            article: 'article'
          },
          priority: 9
        },
        {
          name: 'BioWorld',
          url: 'https://www.bioworld.com',
          selectors: {
            title: 'h1',
            content: '.article-body',
            article: 'article'
          },
          priority: 7
        }
      ]
    });

    // Environment & Climate
    this.addCategory({
      name: 'environment',
      description: 'Environmental science, climate change, and sustainability',
      keywords: [
        'environment', 'environmental', 'climate', 'climate change', 'global warming',
        'sustainability', 'renewable energy', 'solar', 'wind', 'green energy',
        'carbon', 'emissions', 'pollution', 'conservation', 'biodiversity',
        'ecosystem', 'wildlife', 'forest', 'ocean', 'water', 'air quality',
        'recycling', 'waste', 'plastic', 'sustainable', 'eco-friendly',
        'paris agreement', 'cop', 'ipcc', 'greenhouse gas', 'fossil fuel'
      ],
      sources: [
        {
          name: 'Environmental Science & Technology',
          url: 'https://pubs.acs.org/journal/esthag',
          selectors: {
            title: 'h1.article_header-title',
            content: '.article_content',
            article: 'article'
          },
          priority: 9
        },
        {
          name: 'Yale Environment 360',
          url: 'https://e360.yale.edu',
          selectors: {
            title: 'h1.article-title',
            content: '.article-body',
            article: 'article'
          },
          priority: 8
        },
        {
          name: 'Carbon Brief',
          url: 'https://www.carbonbrief.org',
          selectors: {
            title: 'h1.post-title',
            content: '.post-content',
            article: 'article'
          },
          priority: 8
        },
        {
          name: 'Environmental Research Letters',
          url: 'https://iopscience.iop.org/journal/1748-9326',
          selectors: {
            title: 'h1.wd-jnl-art-title',
            content: '.wd-jnl-art-abstract, .article-text',
            article: 'article'
          },
          priority: 9
        }
      ]
    });

    // Startups & Business
    this.addCategory({
      name: 'startups',
      description: 'Startups, entrepreneurship, venture capital, and business',
      keywords: [
        'startup', 'startups', 'entrepreneur', 'entrepreneurship', 'venture capital',
        'vc', 'funding', 'investment', 'investor', 'seed', 'series a', 'series b',
        'ipo', 'acquisition', 'merger', 'business', 'company', 'unicorn',
        'valuation', 'revenue', 'growth', 'scale', 'pivot', 'product market fit',
        'mvp', 'minimum viable product', 'accelerator', 'incubator', 'y combinator',
        'techstars', 'angel investor', 'pitch', 'demo day', 'exit strategy'
      ],
      sources: [
        {
          name: 'TechCrunch Startups',
          url: 'https://techcrunch.com/category/startups',
          selectors: {
            title: 'h1.article__title',
            content: '.article-content',
            article: 'article'
          },
          priority: 9
        },
        {
          name: 'Crunchbase News',
          url: 'https://news.crunchbase.com',
          selectors: {
            title: 'h1.post-title',
            content: '.post-content',
            article: 'article'
          },
          priority: 8
        },
        {
          name: 'VentureBeat',
          url: 'https://venturebeat.com',
          selectors: {
            title: 'h1.article-title',
            content: '.article-content',
            article: 'article'
          },
          priority: 8
        },
        {
          name: 'Forbes Startups',
          url: 'https://www.forbes.com/startups',
          selectors: {
            title: 'h1',
            content: '.article-body',
            article: 'article'
          },
          priority: 7
        }
      ]
    });

    // Science (General)
    this.addCategory({
      name: 'science',
      description: 'General science, physics, chemistry, and research',
      keywords: [
        'science', 'scientific', 'research', 'study', 'physics', 'chemistry',
        'mathematics', 'math', 'quantum', 'particle', 'atom', 'molecule',
        'experiment', 'theory', 'hypothesis', 'discovery', 'breakthrough',
        'nobel prize', 'peer review', 'journal', 'publication', 'academic',
        'university', 'laboratory', 'scientist', 'researcher', 'professor'
      ],
      sources: [
        {
          name: 'Science Daily',
          url: 'https://www.sciencedaily.com',
          selectors: {
            title: 'h1#headline',
            content: '#story_text',
            article: '#story'
          },
          priority: 8
        },
        {
          name: 'Scientific American',
          url: 'https://www.scientificamerican.com',
          selectors: {
            title: 'h1.article-title',
            content: '.article-text',
            article: 'article'
          },
          priority: 8
        },
        {
          name: 'New Scientist',
          url: 'https://www.newscientist.com',
          selectors: {
            title: 'h1.article-title',
            content: '.article-content',
            article: 'article'
          },
          priority: 7
        },
        {
          name: 'Phys.org',
          url: 'https://phys.org',
          selectors: {
            title: 'h1.news-article__title',
            content: '.news-article__text',
            article: 'article'
          },
          priority: 7
        }
      ]
    });
  }

  private addCategory(category: Category) {
    this.categories.set(category.name, category);
  }

  classifyQuery(query: string): string[] {
    const queryLower = query.toLowerCase();
    const matchedCategories: Array<{ category: string; score: number }> = [];

    for (const [categoryName, category] of this.categories) {
      let score = 0;
      
      for (const keyword of category.keywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          // Give higher scores for exact matches and longer keywords
          const keywordScore = keyword.length > 3 ? 2 : 1;
          score += keywordScore;
        }
      }

      if (score > 0) {
        matchedCategories.push({ category: categoryName, score });
      }
    }

    // Sort by score and return top categories
    return matchedCategories
      .sort((a, b) => b.score - a.score)
      .slice(0, 2) // Top 2 categories
      .map(item => item.category);
  }

  getCategorySources(categoryName: string): CategorySource[] {
    const category = this.categories.get(categoryName);
    if (!category) return [];
    
    // Sort by priority (higher priority first)
    return category.sources.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  getAllCategories(): Category[] {
    return Array.from(this.categories.values());
  }

  getCategoryByName(name: string): Category | undefined {
    return this.categories.get(name);
  }

  // Get sources for multiple categories
  getMultipleCategorySources(categoryNames: string[]): CategorySource[] {
    const allSources: CategorySource[] = [];
    
    for (const categoryName of categoryNames) {
      const sources = this.getCategorySources(categoryName);
      allSources.push(...sources);
    }

    // Remove duplicates and sort by priority
    const uniqueSources = allSources.filter((source, index, self) => 
      index === self.findIndex(s => s.url === source.url)
    );

    return uniqueSources.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
}