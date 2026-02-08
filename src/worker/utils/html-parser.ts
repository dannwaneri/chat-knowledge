import { JSDOM } from 'jsdom';

interface ParsedMessage {
  speaker: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ParsedChat {
  title: string;
  messages: ParsedMessage[];
  metadata: {
    source: 'claude-ai-html';
    savedAt: string;
    messageCount: number;
  };
}

export class ClaudeHTMLParser {
  /**
   * Parse HTML file saved from claude.ai
   * Handles Chrome's "Save Page As" format
   */
  parseHTML(htmlContent: string): ParsedChat {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    // Extract title from <title> tag or page header
    const title = this.extractTitle(document);

    // Extract messages from conversation
    const messages = this.extractMessages(document);

    return {
      title,
      messages,
      metadata: {
        source: 'claude-ai-html',
        savedAt: new Date().toISOString(),
        messageCount: messages.length
      }
    };
  }

  private extractTitle(document: Document): string {
    // Try <title> tag first
    const titleElement = document.querySelector('title');
    if (titleElement?.textContent) {
      // Remove " - Claude" suffix if present
      return titleElement.textContent.replace(/ - Claude$/, '').trim();
    }

    // Fallback to first h1 or strong text
    const h1 = document.querySelector('h1');
    if (h1?.textContent) {
      return h1.textContent.trim();
    }

    // Fallback to first user message
    const firstMessage = document.querySelector('[data-test-render-count]');
    if (firstMessage?.textContent) {
      return firstMessage.textContent.substring(0, 100).trim() + '...';
    }

    return 'Untitled Chat';
  }

  private extractMessages(document: Document): ParsedMessage[] {
    const messages: ParsedMessage[] = [];

    // Claude.ai uses data-test-render-count for message containers
    const messageElements = document.querySelectorAll('[data-test-render-count]');

    messageElements.forEach((element) => {
      const message = this.parseMessageElement(element as Element);
      if (message) {
        messages.push(message);
      }
    });

    // Fallback: if no data-test-render-count, try generic approach
    if (messages.length === 0) {
      return this.extractMessagesGeneric(document);
    }

    return messages;
  }

  private parseMessageElement(element: Element): ParsedMessage | null {
    // Detect speaker by icon or class
    const isUser = this.isUserMessage(element);
    const speaker = isUser ? 'user' : 'assistant';

    // Extract content - get all text while preserving structure
    const content = this.extractContent(element);

    if (!content || content.trim().length === 0) {
      return null;
    }

    return {
      speaker,
      content: content.trim()
    };
  }

  private isUserMessage(element: Element): boolean {
    // Check for user icon
    const userIcon = element.querySelector('[data-icon="user"]');
    if (userIcon) return true;

    // Check for common class patterns
    const classList = element.className || '';
    if (classList.includes('user') || classList.includes('human')) {
      return true;
    }

    // Check for Claude/assistant icon
    const claudeIcon = element.querySelector('[data-icon="claude"]');
    if (claudeIcon) return false;

    // Default to assistant if unclear
    return false;
  }

  private extractContent(element: Element): string {
    // Clone to avoid modifying original
    const clone = element.cloneNode(true) as Element;

    // Remove icon containers
    const icons = clone.querySelectorAll('[data-icon]');
    icons.forEach(icon => icon.remove());

    // Remove metadata elements
    const metadata = clone.querySelectorAll('[class*="metadata"]');
    metadata.forEach(meta => meta.remove());

    // Get text content, preserving code blocks
    const codeBlocks = clone.querySelectorAll('pre, code');
    const codeContents = new Map<string, string>();
    
    codeBlocks.forEach((block, index) => {
      const placeholder = `__CODE_BLOCK_${index}__`;
      codeContents.set(placeholder, block.textContent || '');
      block.textContent = placeholder;
    });

    // Get text content
    let content = clone.textContent || '';

    // Restore code blocks with proper formatting
    codeContents.forEach((code, placeholder) => {
      content = content.replace(placeholder, `\n\`\`\`\n${code}\n\`\`\`\n`);
    });

    // Clean up whitespace
    content = content
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .trim();

    return content;
  }

  private extractMessagesGeneric(document: Document): ParsedMessage[] {
    // Generic fallback for different HTML structures
    const messages: ParsedMessage[] = [];
    
    // Try to find alternating message pattern
    const paragraphs = document.querySelectorAll('p, div');
    let currentSpeaker: 'user' | 'assistant' = 'user';

    paragraphs.forEach((p) => {
      const text = p.textContent?.trim();
      if (text && text.length > 10) { // Ignore short/empty elements
        messages.push({
          speaker: currentSpeaker,
          content: text
        });
        // Toggle speaker
        currentSpeaker = currentSpeaker === 'user' ? 'assistant' : 'user';
      }
    });

    return messages;
  }

  /**
   * Convert parsed chat to import format
   */
  toImportFormat(parsed: ParsedChat): string {
    const lines: string[] = [];

    // Add title as comment
    lines.push(`# ${parsed.title}`);
    lines.push('');

    // Add messages in H:/A: format
    parsed.messages.forEach((msg) => {
      const prefix = msg.speaker === 'user' ? 'H: ' : 'A: ';
      lines.push(prefix + msg.content);
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Extract and chunk for direct database import
   */
  extractChunks(
    parsed: ParsedChat, 
    maxTokens: number = 500
  ): Array<{ content: string; tokens: number; metadata: any }> {
    const chunks: Array<{ content: string; tokens: number; metadata: any }> = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;

    parsed.messages.forEach((msg, index) => {
      const messageText = `${msg.speaker.toUpperCase()}: ${msg.content}`;
      const estimatedTokens = Math.ceil(messageText.length / 4); // Rough estimate

      if (currentTokens + estimatedTokens > maxTokens && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          content: currentChunk.join('\n\n'),
          tokens: currentTokens,
          metadata: {
            messageIndex: index,
            source: 'claude-ai-html',
            type: 'conversation'
          }
        });
        currentChunk = [];
        currentTokens = 0;
      }

      currentChunk.push(messageText);
      currentTokens += estimatedTokens;
    });

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join('\n\n'),
        tokens: currentTokens, 
        metadata: {
          messageIndex: parsed.messages.length - 1,
          source: 'claude-ai-html',
          type: 'conversation'
        }
      });
    }

    return chunks;
  }
}

// CLI usage example
export async function parseHTMLFile(filePath: string): Promise<ParsedChat> {
  const fs = await import('fs');
  const htmlContent = fs.readFileSync(filePath, 'utf-8');
  
  const parser = new ClaudeHTMLParser();
  return parser.parseHTML(htmlContent);
}

// Export for use in import CLI
export function convertHTMLToText(filePath: string): string {
  const fs = require('fs');
  const htmlContent = fs.readFileSync(filePath, 'utf-8');
  
  const parser = new ClaudeHTMLParser();
  const parsed = parser.parseHTML(htmlContent);
  
  return parser.toImportFormat(parsed);
}