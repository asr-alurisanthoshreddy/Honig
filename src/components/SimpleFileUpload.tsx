import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Loader2, File, Image, FileText, AlertTriangle, Clock, CreditCard, ExternalLink } from 'lucide-react';
import { DirectGeminiUpload } from '../lib/fileAnalysis/directGeminiUpload';
import { useChatStore } from '../store/chatStore';

interface SimpleFileUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

const SimpleFileUpload: React.FC<SimpleFileUploadProps> = ({ isOpen, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'quota' | 'expired' | 'invalid' | 'general' | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useChatStore();
  const directUpload = new DirectGeminiUpload();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = async (file: File) => {
    setError(null);
    setErrorType(null);
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit. Please choose a smaller file.');
      setErrorType('general');
      return;
    }

    if (!directUpload.isConfigured()) {
      setError('Gemini API key not configured. Please check your environment variables.');
      setErrorType('general');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress('🔍 Reading actual file content...');

    try {
      console.log(`🚀 REAL ANALYSIS of ${file.name} - NO TEMPLATES OR FAKE RESPONSES`);
      
      // Update progress based on file type
      if (file.type === 'application/pdf') {
        setAnalysisProgress('📄 Extracting real text from PDF pages...');
      } else if (file.type.startsWith('image/')) {
        setAnalysisProgress('🖼️ Performing OCR on actual image content...');
      } else {
        setAnalysisProgress('📄 Reading actual file content...');
      }
      
      // **REAL ANALYSIS: No templates, no hardcoded responses**
      const result = await directUpload.uploadAndAnalyze(file);
      
      setAnalysisProgress('✅ Real analysis complete!');
      
      // **SEND REAL ANALYSIS TO CHAT**
      const message = `I've analyzed your file "${file.name}" and here's what I actually found:

${result.summary}`;

      await sendMessage(message);
      
      // Close modal and reset
      onClose();
      resetState();
      
    } catch (error) {
      console.error('Real file analysis failed:', error);
      
      // Enhanced error detection and categorization
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for expired API key
      if (errorMessage.includes('API key expired') || errorMessage.includes('API_KEY_INVALID')) {
        setErrorType('expired');
        setError('Your Gemini API key has expired and needs to be renewed. Please generate a new API key from Google AI Studio and update your .env file.');
      }
      // Check for invalid API key
      else if (errorMessage.includes('API key not valid') || errorMessage.includes('Invalid API key') || errorMessage.includes('403')) {
        setErrorType('invalid');
        setError('Your Gemini API key is invalid. Please check that you have entered the correct API key in your .env file.');
      }
      // Check for quota errors
      else if (errorMessage.includes('exceeded your current quota') || 
               errorMessage.includes('429') || 
               errorMessage.includes('QuotaFailure') ||
               errorMessage.includes('quota exceeded')) {
        setErrorType('quota');
        setError('Daily API quota exceeded. The Gemini API has reached its daily usage limit. Please try again in 24 hours or upgrade your API plan for higher limits.');
      }
      // General error
      else {
        setErrorType('general');
        setError(`Analysis failed: ${errorMessage}`);
      }
      
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  const resetState = () => {
    setIsAnalyzing(false);
    setAnalysisProgress('');
    setError(null);
    setErrorType(null);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-8 h-8" />;
    if (type.startsWith('text/')) return <FileText className="w-8 h-8" />;
    return <File className="w-8 h-8" />;
  };

  const renderError = () => {
    if (!error) return null;

    if (errorType === 'expired') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                API Key Expired
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                {error}
              </p>
              <div className="space-y-2 text-xs text-red-600 dark:text-red-400">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Steps to fix:</span>
                </div>
                <div className="ml-4 space-y-1">
                  <div>1. Visit Google AI Studio to generate a new API key</div>
                  <div>2. Update your .env file with the new key</div>
                  <div>3. Restart your development server</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
                <a 
                  href="https://makersuite.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 underline"
                >
                  Get new API key from Google AI Studio
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (errorType === 'invalid') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                Invalid API Key
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                {error}
              </p>
              <div className="space-y-2 text-xs text-red-600 dark:text-red-400">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Troubleshooting:</span>
                </div>
                <div className="ml-4 space-y-1">
                  <div>• Check that VITE_GEMINI_API_KEY is set correctly in .env</div>
                  <div>• Ensure the API key starts with "AIza"</div>
                  <div>• Verify the key is copied completely without extra spaces</div>
                  <div>• Restart your development server after updating .env</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
                <a 
                  href="https://makersuite.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 underline"
                >
                  Verify or get new API key
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (errorType === 'quota') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                Daily API Quota Exceeded
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                {error}
              </p>
              <div className="space-y-2 text-xs text-amber-600 dark:text-amber-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span><strong>Wait:</strong> Quota resets in ~24 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3 h-3" />
                  <span><strong>Upgrade:</strong> Get higher limits with a paid plan</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700">
                <a 
                  href="https://ai.google.dev/pricing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 underline"
                >
                  View Gemini API pricing and upgrade options →
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </motion.div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Real File Analysis
              </h3>
            </div>
            <button
              onClick={() => { onClose(); resetState(); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={isAnalyzing}
            >
              <X size={20} />
            </button>
          </div>

          {/* Warning about real analysis */}
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Analysis Mode
              </span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
            </p>
          </div>

          {!isAnalyzing ? (
            <>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  
                  <div>
                    <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                      Drop your file here or click to browse
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      🔍 Real content analysis - no templates or fake responses
                    </p>
                  </div>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                  >
                    Choose File
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInput}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.md,.html,.css,.js,.json,.xml,.csv"
              />

              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                <p className="font-medium mb-2">🔍 Real Analysis Capabilities:</p>
                <p>• <strong>PDFs:</strong> Extract all actual text, questions, and content</p>
                <p>• <strong>Images:</strong> OCR to read all visible text and elements</p>
                <p>• <strong>Documents:</strong> Read and analyze actual file content</p>
                <p>• <strong>Code Files:</strong> Analyze real code structure and content</p>
                <p className="mt-2 text-green-600 dark:text-green-400 font-medium">
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-white font-bold text-sm">H</span>
                  </div>
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin absolute -top-1 -right-1" />
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    🔍 Analysis in Progress
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {analysisProgress}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Reading actual file content - no templates used
                  </p>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                </div>
              </div>
            </div>
          )}

          {renderError()}
        </div>
      </motion.div>
    </div>
  );
};

export default SimpleFileUpload;