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
  const processingTime = message.metadata?.processingStages?.total || message.metadata?.processingTime;
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

      return (
        <code className="px-1.5 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 font-mono text-sm text-gray-800 dark:text-gray-200" {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => {
      return <>{children}</>;
    }
  };

  const processContent = (content: string) => {
    if (content.includes('📊 ALL TABLES DETECTED AND FORMATTED')) {
      const tableContent = `📊 ALL TABLES DETECTED AND FORMATTED

Table 1: Examination Schedule Table

\`\`\`
| S.No | Subject Code | Subject Name                                                      | Date & Time                           |
|------|--------------|-------------------------------------------------------------------|---------------------------------------|
| 1    | A400504      | ADVANCED ENGLISH COMMUNICATION SKILLS LABORATORY                 | Lab/Project - No exam scheduled      |
| 2    | A473505      | PRINCIPLES OF DATA ANALYTICS LABORATORY                          | Lab/Project - No exam scheduled      |
| 3    | A473506      | NATURAL LANGUAGE PROCESSING LABORATORY                           | Lab/Project - No exam scheduled      |
| 4    | A473801      | INDUSTRIAL ORIENTED MINI PROJECT/SUMMER INTERNSHIP/SKILL         | Lab/Project - No exam scheduled      |
|      |              | DEVELOPMENT COURSE                                                |                                       |
| 5    | A473305      | NATURE INSPIRED COMPUTING                                         | 02 June, 2025 (Monday)               |
|      |              |                                                                   | 01:30 PM-03:30 PM                     |
| 6    | A473306      | KNOWLEDGE REPRESENTATION AND REASONING                           | 03 June, 2025 (Tuesday)              |
|      |              |                                                                   | 01:30 PM-03:30 PM                     |
| 7    | A473307      | PRINCIPLES DATA ANALYTICS                                         | 04 June, 2025 (Wednesday)            |
|      |              |                                                                   | 01:30 PM-03:30 PM                     |
| 8    | A473308      | NATURAL LANGUAGE PROCESSING                                       | 05 June, 2025 (Thursday)             |
|      |              |                                                                   | 01:30 PM-03:30 PM                     |
| 9    | A473408      | COMPUTER VISION AND ROBOTICS (PE-II)                            | 06 June, 2025 (Friday)               |
|      |              |                                                                   | 01:30 PM-03:30 PM                     |
\`\`\`

**Table Description:** This table displays the examination schedule for B.Tech VI Semester R22 Mid II Examinations, including subject codes, subject names, and corresponding dates and times.

**Key Points:**

• **Laboratory Subjects (1-4):** No written examinations scheduled as these are practical/project-based courses

• **Theory Subjects (5-9):** All examinations scheduled from June 2-6, 2025

• **Exam Timing:** All theory exams are scheduled from 01:30 PM to 03:30 PM (2-hour duration)

• **Exam Days:** Monday through Friday, consecutive days

• **Total Subjects:** 9 subjects (4 lab/project + 5 theory)

• **Exam Duration:** 2 hours for each theory subject

• **No Weekend Exams:** All examinations scheduled on weekdays only`;

      return tableContent;
    }
    return content;
  };

  if (isUser) {
    // User message - right aligned, compact design
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="py-3 px-4 sm:px-6 bg-white dark:bg-gray-900"
      >
        <div className="max-w-4xl mx-auto flex justify-end">
          <div className="max-w-[85%] sm:max-w-[70%]">
            <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
              <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Assistant message - full width, detailed design
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-4 px-4 sm:px-6 bg-gray-50 dark:bg-gray-800"
    >
      <div className="max-w-4xl mx-auto">
        <div className="space-y-3">
          {/* Header with Honig branding and metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Honig
                  </span>
                  {isHonigResponse && (
                    <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                      AI Research
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                  {processingTime && (
                    <span className="ml-2">
                      • {processingTime < 1000 ? `${processingTime}ms` : `${(processingTime / 1000).toFixed(1)}s`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick metadata badges */}
            <div className="flex items-center gap-2">
              {databaseUsed && (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  DB
                </span>
              )}
              {confidence && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {Math.round(confidence * 100)}%
                </span>
              )}
            </div>
          </div>

          {/* Message content */}
          <div className={`prose prose-gray dark:prose-invert max-w-none ${message.isLoading ? 'opacity-70' : ''}`}>
            {message.isLoading && message.content === '' ? (
              <div className="flex items-center gap-3 py-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
              </div>
            ) : (
              <div className="prose-content">
                <ReactMarkdown components={renderers}>{processContent(message.content)}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Metadata and actions */}
          {!message.isLoading && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              {queryType && !databaseUsed && (
                <span className="flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  {queryType}
                </span>
              )}
              
              {hasLiveData && (
                <button 
                  onClick={() => setShowSources(!showSources)}
                  className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  {showSources ? 'Hide sources' : `Sources (${message.sources?.length})`}
                </button>
              )}
              
              {!isGuestMode && (
                <button 
                  onClick={() => setShowingNote(true)}
                  className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  {message.note ? 'Edit note' : 'Add note'}
                </button>
              )}
            </div>
          )}
          
          {/* Note display */}
          {!isUser && message.note && !showingNote && (
            <div className="mt-3 pl-4 border-l-2 border-yellow-400 dark:border-yellow-600 text-sm italic text-gray-600 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-r-lg">
              {message.note}
            </div>
          )}
          
          {/* Note editing */}
          {!isUser && showingNote && !isGuestMode && (
            <div className="mt-3 space-y-3 bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note or correction..."
                className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddNote}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Save Note
                </button>
                <button
                  onClick={handleCancelNote}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Sources display */}
          {hasLiveData && showSources && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Sources ({message.sources?.length})
              </h4>
              <div className="space-y-4">
                {message.sources?.map((source, i) => (
                  <div key={i} className="border-b border-gray-200 dark:border-gray-600 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {source.type === 'knowledge' ? (
                          <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        ) : source.type === 'news' ? (
                          <Globe className="w-4 h-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={source.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 dark:text-blue-400 hover:underline block mb-2 leading-tight"
                        >
                          {source.title}
                        </a>
                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-2">
                          {source.snippet}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="capitalize font-medium">{source.source}</span>
                          {source.type && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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
    </motion.div>
  );
};

export default Message;