export interface ParsedMessage {
    speaker: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }
  
  export interface ParsedChat {
    title: string;
    messages: ParsedMessage[];
  }
  
  export interface Chunk {
    content: string;
    tokens: number;
    metadata: {
      speaker?: string;
      messageIndex?: number;
      type: string;
    };
  }
  
  export class ChatParser {
    parseChatExport(text: string): ParsedChat {
      // Normalize line endings first
      const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Try multiple split strategies
      let sections: string[] = [];
      
      // Strategy 1: Split by double newlines
      sections = normalized.split('\n\n');
      console.log(`🔍 Strategy 1 (\\n\\n): ${sections.length} sections`);
      
      // If that didn't work, try single newlines
      if (sections.length < 10) {
        sections = normalized.split('\n');
        console.log(`🔍 Strategy 2 (\\n): ${sections.length} sections`);
      }
      
      // Filter out empty/very short lines
      const filteredSections = sections
        .map(s => s.trim())
        .filter(s => s.length > 30); // Keep meaningful content
      
      console.log(`🔍 After filtering: ${filteredSections.length} sections`);
      
      // Group into chunks of ~5 lines each for better context
      const messages: ParsedMessage[] = [];
      const linesPerMessage = 10;
      
      for (let i = 0; i < filteredSections.length; i += linesPerMessage) {
        const chunk = filteredSections.slice(i, i + linesPerMessage).join('\n\n');
        if (chunk.trim().length > 0) {
          messages.push({
            speaker: messages.length % 2 === 0 ? 'user' : 'assistant',
            content: chunk
          });
        }
      }
  
      console.log(`🔍 Final: ${messages.length} messages`);
  
      const title = normalized.substring(0, 100).replace(/\n/g, ' ').trim();
      
      return { title, messages };
    }
  
    chunkMessages(messages: ParsedMessage[], maxTokens = 1000): Chunk[] {
      const chunks: Chunk[] = [];
  
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const tokens = this.estimateTokens(message.content);
  
        chunks.push({
          content: message.content,
          tokens,
          metadata: {
            messageIndex: i,
            type: 'section'
          }
        });
      }
      
      return chunks;
    }
  
    private estimateTokens(text: string): number {
      return Math.ceil(text.length / 4);
    }
  
    cleanup() {
      // No cleanup needed
    }
  }