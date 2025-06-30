import React, { useState } from 'react';
import { ChevronDown, Cpu, Zap, Brain, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  availableModels: string[];
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  availableModels
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const modelInfo = {
    'gemini': {
      name: 'Gemini 2.0 Flash',
      icon: <Zap className="w-4 h-4" />,
      description: 'Fast, versatile AI for general tasks',
      color: 'text-blue-600 dark:text-blue-400'
    },
    'gpt-4': {
      name: 'GPT-4',
      icon: <Brain className="w-4 h-4" />,
      description: 'Advanced reasoning and creativity',
      color: 'text-green-600 dark:text-green-400'
    },
    'claude': {
      name: 'Claude',
      icon: <Code className="w-4 h-4" />,
      description: 'Excellent for analysis and coding',
      color: 'text-purple-600 dark:text-purple-400'
    }
  };

  const currentModel = modelInfo[selectedModel] || {
    name: selectedModel,
    icon: <Cpu className="w-4 h-4" />,
    description: 'AI Model',
    color: 'text-gray-600 dark:text-gray-400'
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className={currentModel.color}>
          {currentModel.icon}
        </span>
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {currentModel.name}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20"
            >
              <div className="p-2">
                {availableModels.map((model) => {
                  const info = modelInfo[model] || {
                    name: model,
                    icon: <Cpu className="w-4 h-4" />,
                    description: 'AI Model',
                    color: 'text-gray-600 dark:text-gray-400'
                  };

                  return (
                    <button
                      key={model}
                      onClick={() => {
                        onModelChange(model);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        selectedModel === model ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <span className={info.color}>
                        {info.icon}
                      </span>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {info.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {info.description}
                        </div>
                      </div>
                      {selectedModel === model && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModelSelector;