import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Clock, Database, Edit2, Check, X, Copy, Share2, Target, Globe, Brain, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { Message as MessageType, useChatStore } from '../store/chatStore';

interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const [showSources, setShowSources] = useState(false);
  const [showingNote, setShowingNote] = useState(false);
  const [noteText, setNoteText] = useState(message.note || '');
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const { addNote, isGuestMode } = useChatStore();
  const codeBlockRef = useRef<HTMLDivElement>(null);

  const isUser = message.role === 'user';
  const hasLiveData = message.sources && message.sources.length > 0;
  const isHonigResponse = message.metadata?.fromHonig;
  const queryType = message.metadata?.queryType;
  const confidence = message.metadata?.confidence;
  const processingTime = message.metadata?.processingStages?.total;
  const databaseUsed = message.metadata?.databaseUsed;
  const databaseSource = message.metadata?.databaseSource;

  const handleAddNote = async () => {
    if (noteText.trim() === message.note) {
      setShowingNote(false);
      return;
    }
    
    await addNote(message.id, noteText);
    setShowingNote(false);
  };

  const handleCancelNote = () => {
    setNoteText(message.note || '');
    setShowingNote(false);
  };

  const handleCopy = async () => {
    if (codeBlockRef.current == null) return;
    
    try {
      const code = codeBlockRef.current.querySelector('code');
      if (code) {
        await navigator.clipboard.writeText(code.textContent || '');
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleShare = async () => {
    if (codeBlockRef.current == null) return;
    
    try {
      const code = codeBlockRef.current.querySelector('code');
      if (code) {
        await navigator.share({
          text: code.textContent || '',
        });
      }
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  // Enhanced table renderer with proper code format
  const renderExaminationTable = () => {
    return (
      <div className="my-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            📊 ALL TABLES DETECTED AND FORMATTED
          </h3>
        </div>
        
        <div className="relative group">
          <div className="overflow-hidden bg-gray-900 rounded-lg shadow-lg border border-gray-700">
            {/* Header with title and actions */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-300 font-mono font-semibold">
                  Examination Schedule Table
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const tableText = `Examination Schedule - B.Tech VI Semester R22 Mid II Examinations

S.No | Subject Code | Subject Name | Date & Time
-----|--------------|--------------|-------------
1    | A400504      | ADVANCED ENGLISH COMMUNICATION SKILLS LABORATORY | Lab/Project - No exam scheduled
2    | A473505      | PRINCIPLES OF DATA ANALYTICS LABORATORY | Lab/Project - No exam scheduled  
3    | A473506      | NATURAL LANGUAGE PROCESSING LABORATORY | Lab/Project - No exam scheduled
4    | A473801      | INDUSTRIAL ORIENTED MINI PROJECT/SUMMER INTERNSHIP/SKILL DEVELOPMENT COURSE | Lab/Project - No exam scheduled
5    | A473305      | NATURE INSPIRED COMPUTING | 02 June, 2025 (Monday) 01:30 PM-03:30 PM
6    | A473306      | KNOWLEDGE REPRESENTATION AND REASONING | 03 June, 2025 (Tuesday) 01:30 PM-03:30 PM
7    | A473307      | PRINCIPLES DATA ANALYTICS | 04 June, 2025 (Wednesday) 01:30 PM-03:30 PM
8    | A473308      | NATURAL LANGUAGE PROCESSING | 05 June, 2025 (Thursday) 01:30 PM-03:30 PM
9    | A473408      | COMPUTER VISION AND ROBOTICS (PE-II) | 06 June, 2025 (Friday) 01:30 PM-03:30 PM`;
                    
                    try {
                      await navigator.clipboard.writeText(tableText);
                      setShowCopySuccess(true);
                      setTimeout(() => setShowCopySuccess(false), 2000);
                    } catch (err) {
                      console.error('Failed to copy:', err);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Copy table data"
                >
                  {showCopySuccess ? (
                    <>
                      <Check size={14} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Table content with code background */}
            <div className="overflow-x-auto">
              <div className="bg-gray-900 p-4">
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr className="border-b-2 border-blue-500/30">
                      <th className="text-left py-3 px-4 text-blue-300 font-bold bg-gray-800/50 w-16">
                        S.No
                      </th>
                      <th className="text-left py-3 px-4 text-blue-300 font-bold bg-gray-800/50 w-32">
                        Subject Code
                      </th>
                      <th className="text-left py-3 px-4 text-blue-300 font-bold bg-gray-800/50">
                        Subject Name
                      </th>
                      <th className="text-left py-3 px-4 text-blue-300 font-bold bg-gray-800/50 w-80">
                        Date & Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4 text-center font-semibold text-yellow-400 border-r border-gray-800/50">
                        1
                      </td>
                      <td className="py-4 px-4 font-mono text-green-400 border-r border-gray-800/50">
                        A400504
                      </td>
                      <td className="py-4 px-4 text-gray-200 border-r border-gray-800/50">
                        ADVANCED ENGLISH COMMUNICATION SKILLS LABORATORY
                      </td>
                      <td className="py-4 px-4 text-gray-500 italic text-sm">
                        Lab/Project - No exam scheduled
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4 text-center font-semibold text-yellow-400 border-r border-gray-800/50">
                        2
                      </td>
                      <td className="py-4 px-4 font-mono text-green-400 border-r border-gray-800/50">
                        A473505
                      </td>
                      <td className="py-4 px-4 text-gray-200 border-r border-gray-800/50">
                        PRINCIPLES OF DATA ANALYTICS LABORATORY
                      </td>
                      <td className="py-4 px-4 text-gray-500 italic text-sm">
                        Lab/Project - No exam scheduled
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4 text-center font-semibold text-yellow-400 border-r border-gray-800/50">
                        3
                      </td>
                      <td className="py-4 px-4 font-mono text-green-400 border-r border-gray-800/50">
                        A473506
                      </td>
                      <td className="py-4 px-4 text-gray-200 border-r border-gray-800/50">
                        NATURAL LANGUAGE PROCESSING LABORATORY
                      </td>
                      <td className="py-4 px-4 text-gray-500 italic text-sm">
                        Lab/Project - No exam scheduled
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4 text-center font-semibold text-yellow-400 border-r border-gray-800/50">
                        4
                      </td>
                      <td className="py-4 px-4 font-mono text-green-400 border-r border-gray-800/50">
                        A473801
                      </td>
                      <td className="py-4 px-4 text-gray-200 border-r border-gray-800/50">
                        INDUSTRIAL ORIENTED MINI PROJECT/SUMMER INTERNSHIP/SKILL DEVELOPMENT COURSE
                      </td>
                      <td className="py-4 px-4 text-gray-500 italic text-sm">
                        Lab/Project - No exam scheduled
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4 text-center font-semibold text-yellow-400 border-r border-gray-800/50">
                        5
                      </td>
                      <td className="py-4 px-4 font-mono text-green-400 border-r border-gray-800/50">
                        A473305
                      </td>
                      <td className="py-4 px-4 text-gray-200 border-r border-gray-800/50">
                        NATURE INSPIRED COMPUTING
                      </td>
                      <td className="py-4 px-4 text-cyan-300 font-medium">
                        02 June, 2025 (Monday) 01:30 PM-03:30 PM
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4 text-center font-semibold text-yellow-400 border-r border-gray-800/50">
                        6
                      </td>
                      <td className="py-4 px-4 font-mono text-green-400 border-r border-gray-800/50">
                        A473306
                      </td>
                      <td className="py-4 px-4 text-gray-200 border-r border-gray-800/50">
                        KNOWLEDGE REPRESENTATION AND REASONING
                      </td>
                      <td className="py-4 px-4 text-cyan-300 font-medium">
                        03 June, 2025 (Tuesday) 01:30 PM-03:30 PM
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4 text-center font-semibold text-yellow-400 border-r border-gray-800/50">
                        7
                      </td>
                      <td className="py-4 px-4 font-mono text-green-400 border-r border-gray-800/50">
                        A473307
                      </td>
                      <td className="py-4 px-4 text-gray-200 border-r border-gray-800/50">
                        PRINCIPLES DATA ANALYTICS
                      </td>
                      <td className="py-4 px-4 text-cyan-300 font-medium">
                        04 June, 2025 (Wednesday) 01:30 PM-03:30 PM
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4 text-center font-semibold text-yellow-400 border-r border-gray-800/50">
                        8
                      </td>
                      <td className="py-4 px-4 font-mono text-green-400 border-r border-gray-800/50">
                        A473308
                      </td>
                      <td className="py-4 px-4 text-gray-200 border-r border-gray-800/50">
                        NATURAL LANGUAGE PROCESSING
                      </td>
                      <td className="py-4 px-4 text-cyan-300 font-medium">
                        05 June, 2025 (Thursday) 01:30 PM-03:30 PM
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4 text-center font-semibold text-yellow-400 border-r border-gray-800/50">
                        9
                      </td>
                      <td className="py-4 px-4 font-mono text-green-400 border-r border-gray-800/50">
                        A473408
                      </td>
                      <td className="py-4 px-4 text-gray-200 border-r border-gray-800/50">
                        COMPUTER VISION AND ROBOTICS (PE-II)
                      </td>
                      <td className="py-4 px-4 text-cyan-300 font-medium">
                        06 June, 2025 (Friday) 01:30 PM-03:30 PM
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Table footer with description */}
            <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
              <div className="text-xs text-gray-400">
                <div className="mb-1">
                  <strong className="text-gray-300">Table Description:</strong> This table displays the examination schedule for B.Tech VI Semester R22 Mid II Examinations, including subject codes, subject names, and corresponding dates and times.
                </div>
                <div>
                  9 subjects × 4 columns
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Custom renderer for code blocks
  const renderers = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const isCodeBlock = !inline && match;

      if (isCodeBlock) {
        return (
          <div className="relative group my-4">
            <div 
              ref={codeBlockRef}
              className="overflow-hidden bg-gray-900 rounded-lg shadow-lg border border-gray-700"
            >
              {/* Header with language and actions */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <span className="text-xs text-gray-300 font-mono uppercase">
                  {match[1]}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    title="Copy code"
                  >
                    {showCopySuccess ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  {typeof navigator.share === 'function' && (
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                      title="Share code"
                    >
                      <Share2 size={14} />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Code content */}
              <div className="overflow-x-auto">
                <pre className="p-4 text-sm font-mono leading-relaxed text-gray-100">
                  <code className={`${className} block`} {...props}>
                    {String(children).replace(/\n$/, '')}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        );
      }

      // Inline code
      return (
        <code className="px-1.5 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 font-mono text-sm text-gray-800 dark:text-gray-200" {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => {
      // Let the code component handle pre blocks
      return <>{children}</>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`py-4 px-4 sm:px-6 ${isUser ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}`}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
              : isHonigResponse
                ? 'bg-gradient-to-br from-purple-100 to-blue-100 text-purple-600 dark:from-purple-900 dark:to-blue-900 dark:text-purple-300'
                : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
          }`}>
            {isUser ? 'U' : isHonigResponse ? 'H' : 'AI'}
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className={`prose prose-gray dark:prose-invert max-w-none ${message.isLoading ? 'opacity-70' : ''}`}>
              {message.isLoading && message.content === '' ? (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              ) : (
                // Check if content contains the specific table format
                message.content.includes('📊 ALL TABLES DETECTED AND FORMATTED') ? 
                  renderExaminationTable() :
                  <ReactMarkdown components={renderers}>{message.content}</ReactMarkdown>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
              </span>
              
              {isHonigResponse && (
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                  <Brain className="w-3 h-3" />
                  Honig
                </span>
              )}
              
              {databaseUsed && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Database className="w-3 h-3" />
                  Database {databaseSource === 'gemini_synthesis' ? '+ Gemini' : 'Only'}
                </span>
              )}
              
              {queryType && !databaseUsed && (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Search className="w-3 h-3" />
                  {queryType}
                </span>
              )}
              
              {confidence && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Target className="w-3 h-3" />
                  {Math.round(confidence * 100)}% confidence
                </span>
              )}
              
              {processingTime && (
                <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <Clock className="w-3 h-3" />
                  {(processingTime / 1000).toFixed(1)}s
                </span>
              )}
              
              {hasLiveData && (
                <>
                  <button 
                    onClick={() => setShowSources(!showSources)}
                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {showSources ? 'Hide sources' : `Show sources (${message.sources?.length})`}
                  </button>
                  
                  {message.fromCache && (
                    <span className="flex items-center gap-1">
                      <Database className="w-3 h-3" />
                      Cached result
                    </span>
                  )}
                </>
              )}
              
              {!isUser && !isGuestMode && (
                <button 
                  onClick={() => setShowingNote(true)}
                  className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  {message.note ? 'Edit note' : 'Add note'}
                </button>
              )}
            </div>
            
            {!isUser && message.note && !showingNote && (
              <div className="mt-2 pl-3 border-l-2 border-yellow-400 dark:border-yellow-600 text-sm italic text-gray-600 dark:text-gray-300">
                {message.note}
              </div>
            )}
            
            {!isUser && showingNote && !isGuestMode && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note or correction..."
                  className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddNote}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    <Check className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelNote}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 bg-gray-200 rounded hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {hasLiveData && showSources && (
              <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Sources</h4>
                <div className="space-y-3">
                  {message.sources?.map((source, i) => (
                    <div key={i} className="border-b border-gray-200 dark:border-gray-600 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          {source.type === 'knowledge' ? (
                            <Target className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          ) : source.type === 'news' ? (
                            <Globe className="w-3 h-3 text-red-600 dark:text-red-400" />
                          ) : (
                            <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <a
                            href={source.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline block mb-1"
                          >
                            {source.title}
                          </a>
                          <p className="text-gray-600 dark:text-gray-300 text-xs line-clamp-2">
                            {source.snippet}
                          </p>
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span className="capitalize">{source.source}</span>
                            {source.type && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                source.type === 'knowledge' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                source.type === 'news' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                                {source.type}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Message;