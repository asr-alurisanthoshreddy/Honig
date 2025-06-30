import React from 'react';
import { Search, Globe, Clock, Database, Target, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface SearchIndicatorProps {
  isSearching: boolean;
  searchStage?: 'classifying' | 'category_search' | 'web_search' | 'scraping' | 'processing' | 'generating';
  sourcesFound?: number;
  categoriesMatched?: string[];
}

const SearchIndicator: React.FC<SearchIndicatorProps> = ({
  isSearching,
  searchStage = 'classifying',
  sourcesFound = 0,
  categoriesMatched = []
}) => {
  if (!isSearching) return null;

  const stages = {
    classifying: {
      icon: <Target className="w-4 h-4" />,
      text: 'Analyzing query and identifying relevant categories...',
      color: 'text-purple-600 dark:text-purple-400'
    },
    category_search: {
      icon: <Target className="w-4 h-4" />,
      text: `Searching specialized sources in ${categoriesMatched.join(', ')}...`,
      color: 'text-blue-600 dark:text-blue-400'
    },
    web_search: {
      icon: <Search className="w-4 h-4" />,
      text: 'Searching general web sources...',
      color: 'text-blue-600 dark:text-blue-400'
    },
    scraping: {
      icon: <Globe className="w-4 h-4" />,
      text: `Extracting content from ${sourcesFound} sources...`,
      color: 'text-green-600 dark:text-green-400'
    },
    processing: {
      icon: <Database className="w-4 h-4" />,
      text: 'Processing and ranking content...',
      color: 'text-purple-600 dark:text-purple-400'
    },
    generating: {
      icon: <Zap className="w-4 h-4" />,
      text: 'Generating response with citations...',
      color: 'text-orange-600 dark:text-orange-400'
    }
  };

  const currentStage = stages[searchStage];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className={currentStage.color}
      >
        {currentStage.icon}
      </motion.div>
      
      <div className="flex-1">
        <span className="text-gray-700 dark:text-gray-300">
          {currentStage.text}
        </span>
        
        {categoriesMatched.length > 0 && searchStage === 'category_search' && (
          <div className="flex gap-1 mt-1">
            {categoriesMatched.map((category, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {category}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2
            }}
            className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
};

export default SearchIndicator;