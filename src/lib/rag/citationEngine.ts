import type { DocumentChunk } from './documentChunker';

export interface Citation {
  id: string;
  source: string;
  title?: string;
  url?: string;
  snippet: string;
  relevanceScore: number;
}

export class CitationEngine {
  generateCitations(chunks: DocumentChunk[], generatedText: string): Map<string, string[]> {
    const citations = new Map<string, string[]>();
    
    // Split generated text into sentences
    const sentences = generatedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    sentences.forEach((sentence, sentenceIndex) => {
      const sentenceKey = `sentence_${sentenceIndex}`;
      const supportingChunks = this.findSupportingChunks(sentence.trim(), chunks);
      
      if (supportingChunks.length > 0) {
        citations.set(sentenceKey, supportingChunks.map(chunk => chunk.id));
      }
    });

    return citations;
  }

  private findSupportingChunks(sentence: string, chunks: DocumentChunk[]): DocumentChunk[] {
    const sentenceWords = this.extractKeywords(sentence);
    
    return chunks
      .map(chunk => ({
        chunk,
        similarity: this.calculateSimilarity(sentenceWords, chunk.content)
      }))
      .filter(({ similarity }) => similarity > 0.3) // Threshold for relevance
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3) // Top 3 supporting chunks
      .map(({ chunk }) => chunk);
  }

  private extractKeywords(text: string): string[] {
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  private calculateSimilarity(keywords: string[], content: string): number {
    const contentLower = content.toLowerCase();
    let matches = 0;
    let totalWeight = 0;

    keywords.forEach(keyword => {
      const weight = keyword.length / 5; // Longer keywords get more weight
      totalWeight += weight;
      
      if (contentLower.includes(keyword)) {
        matches += weight;
      }
    });

    return totalWeight > 0 ? matches / totalWeight : 0;
  }

  formatCitations(citations: Map<string, string[]>, chunks: DocumentChunk[]): string {
    if (citations.size === 0) return '';

    const chunkMap = new Map(chunks.map(chunk => [chunk.id, chunk]));
    const uniqueSources = new Set<string>();
    
    citations.forEach(chunkIds => {
      chunkIds.forEach(id => {
        const chunk = chunkMap.get(id);
        if (chunk?.metadata.url) {
          uniqueSources.add(chunk.metadata.url);
        }
      });
    });

    const sourceList = Array.from(uniqueSources).map((url, index) => {
      const chunk = chunks.find(c => c.metadata.url === url);
      const title = chunk?.metadata.title || 'Unknown Title';
      return `[${index + 1}] ${title} - ${url}`;
    });

    return sourceList.length > 0 ? `\n\n**Sources:**\n${sourceList.join('\n')}` : '';
  }

  // Generate inline citations for specific claims
  generateInlineCitations(text: string, chunks: DocumentChunk[]): string {
    const sentences = text.split(/([.!?]+)/);
    let citationCounter = 1;
    const usedSources = new Set<string>();

    const citatedText = sentences.map(part => {
      if (!/[.!?]+/.test(part) && part.trim().length > 20) {
        const supportingChunks = this.findSupportingChunks(part, chunks);
        
        if (supportingChunks.length > 0) {
          const newSources = supportingChunks.filter(chunk => 
            chunk.metadata.url && !usedSources.has(chunk.metadata.url)
          );
          
          if (newSources.length > 0) {
            newSources.forEach(chunk => {
              if (chunk.metadata.url) {
                usedSources.add(chunk.metadata.url);
              }
            });
            
            const citationNumbers = Array.from({length: newSources.length}, (_, i) => 
              citationCounter + i
            ).join(',');
            
            citationCounter += newSources.length;
            return `${part} [${citationNumbers}]`;
          }
        }
      }
      return part;
    }).join('');

    return citatedText;
  }
}