import { Hono } from 'hono';
import { Env } from '../../types/index.js';
import { ChatSanitizer } from '../utils/sanitizer.js';

// ============================================
// TYPES - matches what capture.js sends
// ============================================

interface ContentBlock {
  type: 'text' | 'code' | 'artifact';
  content: string;
  language?: string;
  name?: string;
}

interface FileRef {
  name: string;
  type: string;
  size: number;
  id?: string | null;
  note: string;
}

interface ExtensionMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: ContentBlock[];
  timestamp: number;
  truncated: boolean;
  parent_message_uuid?: string | null;
  file_refs: FileRef[];
}

interface ExtensionImportRequest {
  id: string;
  title: string;
  summary?: string;
  model?: string;
  created_at?: string;
  updated_at?: string;
  message_count: number;
  messages: ExtensionMessage[];
  extension_version?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  try {
    const data: ExtensionImportRequest = await c.req.json();

    const {
      id: conversation_id,
      title,
      summary,
      created_at,
      messages,
    } = data;

    if (!conversation_id || !title || !messages?.length) {
      return c.json({ error: 'Missing required fields: id, title, messages' }, 400);
    }

    console.log(`📱 Extension import: "${title}" (${messages.length} messages)`);

    // ============================================
    // STEP 1: Create chat record
    // ============================================

    await c.env.DB.prepare(`
    INSERT OR REPLACE INTO chats 
      (id, title, summary, source, visibility, message_count, created_at, imported_at, model)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
      conversation_id,
      title,
      summary || null,
      'extension',
      'private',
      messages.length,
      created_at || null,
      new Date().toISOString(),
      data.model || null
    ).run();

    console.log(`✓ Chat record created: ${conversation_id}`);

    // ============================================
    // STEP 2: Store each message
    // ============================================

    // Sanitise all messages before storage
    const sanitizer = new ChatSanitizer();
    const sanitizedMessages = await sanitizer.redactChat(
      messages.map(m => ({ speaker: m.role, content: reconstructContent(m.content) })),
      { autoRedactCritical: true }
    );

    const redactedCount = sanitizedMessages.filter(m => m.redacted).length;
    if (redactedCount > 0) {
      console.log(`[import-extension] Redacted secrets from ${redactedCount} message(s)`);
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const fullContent = sanitizedMessages[i].content; // use sanitised content

      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO messages
          (id, chat_id, role, content, message_index, created_at, truncated)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        msg.id,
        conversation_id,
        msg.role,
        fullContent,
        i,
        msg.timestamp ? new Date(msg.timestamp).toISOString() : null,
        msg.truncated ? 1 : 0
      ).run();
    }

    console.log(`✓ Stored ${messages.length} messages`);

    // ============================================
    // STEP 3: Create chunks for semantic search
    // ============================================

    const chunks = buildSearchChunks(messages, sanitizedMessages);
    console.log(`✓ Built ${chunks.length} search chunks from ${messages.length} messages`);

    const vectors = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `${conversation_id}-chunk-${i}`;

      const embeddingResult = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: chunk.content
      });

      const embedding = embeddingResult.data[0];

      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO chunks
          (id, chat_id, message_id, chunk_index, content, metadata, vector_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        chunkId,
        conversation_id,
        chunk.message_id,
        i,
        chunk.content,
        JSON.stringify(chunk.metadata),
        chunkId,
        new Date().toISOString()
      ).run();

      vectors.push({
        id: chunkId,
        values: embedding,
        metadata: {
          chat_id: conversation_id,
          chunk_index: i,
          content_preview: chunk.content.substring(0, 200)
        }
      });
    }

    if (vectors.length > 0) {
      await c.env.VECTORIZE.upsert(vectors);
      console.log(`✓ Upserted ${vectors.length} vectors to Vectorize`);
    }

    return c.json({
      success: true,
      conversation_id,
      messages: messages.length,
      chunks: chunks.length,
    });

  } catch (error: any) {
    console.error('❌ Extension import error:', error);
    return c.json({
      error: 'Import failed',
      message: error.message,
      details: error.cause?.message || error.toString()
    }, 500);
  }
});

// ============================================
// RECONSTRUCT FULL MESSAGE TEXT
// ============================================

function reconstructContent(blocks: ContentBlock[]): string {
  return blocks.map(block => {
    if (block.type === 'code') {
      const lang = block.language && block.language !== 'text' ? block.language : '';
      return `\`\`\`${lang}\n${block.content}\n\`\`\``;
    }
    return block.content;
  }).join('\n\n');
}

// ============================================
// BUILD SEARCH CHUNKS
// Uses sanitized content so vectors never contain raw secrets
// ============================================

function buildSearchChunks(
  messages: ExtensionMessage[],
  sanitized: Array<{ speaker: string; content: string; redacted: boolean }>
) {
  const chunks: {
    content: string;
    message_id: string;
    metadata: Record<string, any>;
  }[] = [];

  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    if (msg.role === 'user' && messages[i + 1]?.role === 'assistant') {
      const userText = sanitized[i].content;
      const assistantText = sanitized[i + 1].content;

      chunks.push({
        content: `Q: ${userText}\n\nA: ${assistantText}`,
        message_id: msg.id,
        metadata: {
          type: 'qa_pair',
          message_index: i,
          speaker: 'both',
          has_code: messages[i + 1].content.some(b => b.type === 'code'),
          truncated: messages[i].truncated || messages[i + 1].truncated,
        }
      });

      i += 2;

    } else {
      const label = msg.role === 'user' ? 'User' : 'Assistant';

      chunks.push({
        content: `${label}: ${sanitized[i].content}`,
        message_id: msg.id,
        metadata: {
          type: 'standalone',
          message_index: i,
          speaker: msg.role,
          has_code: msg.content.some(b => b.type === 'code'),
          truncated: msg.truncated,
        }
      });

      i++;
    }
  }

  return chunks;
}

export default app;