export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
    startOffset: number;
    endOffset: number;
    title?: string;
    url?: string;
    type?: string;
    sourceName?: string;
    scrapedAt?: Date;
    category?: string;
  };
  embedding?: number[];
  relevanceScore?: number;
}

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  preserveSentences?: boolean;
  minChunkSize?: number;
}

export class DocumentChunker {
  private defaultOptions: ChunkingOptions = {
    chunkSize: 1000,
    chunkOverlap: 200,
    preserveSentences: true,
    minChunkSize: 100
  };

  chunk(content: string, source: string, options: ChunkingOptions = {}): DocumentChunk[] {
    const opts = { ...this.defaultOptions, ...options };
    
    if (!content || content.trim().length < opts.minChunkSize!) {
      return [];
    }

    const chunks: DocumentChunk[] = [];
    let currentPosition = 0;
    let chunkIndex = 0;

    while (currentPosition < content.length) {
      const chunkEnd = Math.min(currentPosition + opts.chunkSize!, content.length);
      let chunkContent = content.substring(currentPosition, chunkEnd);

      // If preserving sentences and not at the end, try to end at sentence boundary
      if (opts.preserveSentences && chunkEnd < content.length) {
        const sentenceEnd = this.findSentenceEnd(chunkContent);
        if (sentenceEnd > opts.minChunkSize!) {
          chunkContent = chunkContent.substring(0, sentenceEnd);
        }
      }

      // Skip if chunk is too small (unless it's the last chunk)
      if (chunkContent.trim().length >= opts.minChunkSize! || chunkEnd >= content.length) {
        chunks.push({
          id: `${source}-chunk-${chunkIndex}`,
          content: chunkContent.trim(),
          metadata: {
            source,
            chunkIndex,
            totalChunks: 0, // Will be updated after all chunks are created
            startOffset: currentPosition,
            endOffset: currentPosition + chunkContent.length
          }
        });
        chunkIndex++;
      }

      // Move position forward, accounting for overlap
      const actualChunkLength = chunkContent.length;
      currentPosition += Math.max(actualChunkLength - opts.chunkOverlap!, 1);
    }

    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  private findSentenceEnd(text: string): number {
    // Look for sentence endings, preferring those followed by whitespace
    const sentenceEnders = /[.!?]+\s/g;
    let match;
    let lastEnd = 0;

    while ((match = sentenceEnders.exec(text)) !== null) {
      lastEnd = match.index + match[0].length;
    }

    // If no sentence ending found, look for paragraph breaks
    if (lastEnd === 0) {
      const paragraphEnd = text.lastIndexOf('\n\n');
      if (paragraphEnd > 0) {
        lastEnd = paragraphEnd + 2;
      }
    }

    // If still no good break point, look for any period
    if (lastEnd === 0) {
      const periodIndex = text.lastIndexOf('.');
      if (periodIndex > text.length * 0.5) { // Only if it's in the latter half
        lastEnd = periodIndex + 1;
      }
    }

    return lastEnd || text.length;
  }

  chunkMultiple(documents: Array<{ content: string; source: string; metadata?: any }>, options: ChunkingOptions = {}): DocumentChunk[] {
    const allChunks: DocumentChunk[] = [];

    documents.forEach(doc => {
      const chunks = this.chunk(doc.content, doc.source, options);
      
      // Add additional metadata if provided
      if (doc.metadata) {
        chunks.forEach(chunk => {
          Object.assign(chunk.metadata, doc.metadata);
        });
      }

      allChunks.push(...chunks);
    });

    return allChunks;
  }

  // Utility method to merge overlapping chunks if needed
  mergeOverlappingChunks(chunks: DocumentChunk[], similarityThreshold = 0.8): DocumentChunk[] {
    if (chunks.length <= 1) return chunks;

    const merged: DocumentChunk[] = [];
    let currentChunk = chunks[0];

    for (let i = 1; i < chunks.length; i++) {
      const nextChunk = chunks[i];
      
      // Check if chunks are from the same source and have significant overlap
      if (currentChunk.metadata.source === nextChunk.metadata.source) {
        const overlap = this.calculateOverlap(currentChunk.content, nextChunk.content);
        
        if (overlap > similarityThreshold) {
          // Merge chunks
          currentChunk = {
            ...currentChunk,
            content: this.mergeContent(currentChunk.content, nextChunk.content),
            metadata: {
              ...currentChunk.metadata,
              endOffset: nextChunk.metadata.endOffset
            }
          };
          continue;
        }
      }

      merged.push(currentChunk);
      currentChunk = nextChunk;
    }

    merged.push(currentChunk);
    return merged;
  }

  private calculateOverlap(content1: string, content2: string): number {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private mergeContent(content1: string, content2: string): string {
    // Simple merge - in practice, you might want more sophisticated logic
    const sentences1 = content1.split(/[.!?]+/).filter(s => s.trim());
    const sentences2 = content2.split(/[.!?]+/).filter(s => s.trim());
    
    // Remove duplicate sentences
    const allSentences = [...sentences1];
    sentences2.forEach(sentence => {
      if (!sentences1.some(s1 => this.calculateOverlap(s1, sentence) > 0.7)) {
        allSentences.push(sentence);
      }
    });
    
    return allSentences.join('. ') + '.';
  }
}