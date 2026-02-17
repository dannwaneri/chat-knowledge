import { Hono } from 'hono';
import { Env } from '../../types/index.js';

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
  id: string;                    // Claude's UUID for this message
  conversation_id: string;
  role: 'user' | 'assistant';
  content: ContentBlock[];       // parsed content blocks from capture.js
  timestamp: number;             // ms since epoch
  truncated: boolean;
  parent_message_uuid?: string | null;
  file_refs: FileRef[];
}

interface ExtensionImportRequest {
  id: string;                    // conversation UUID from Claude
  title: string;
  summary?: string;              // Claude auto-generates this
  created_at?: string;           // when conversation happened in Claude
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
      extension_version,
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
        (id, title, summary, source, visibility, message_count, created_at, imported_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      conversation_id,
      title,
      summary || null,
      'extension',
      'private',
      messages.length,
      created_at || null,
      new Date().toISOString()
    ).run();

    console.log(`✓ Chat record created: ${conversation_id}`);

    // ============================================
    // STEP 2: Store each message
    // New - messages are now the source of truth
    // ============================================

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      // Reconstruct full text from content blocks for storage
      // This is what the chat viewer will render
      const fullContent = reconstructContent(msg.content);

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
    // Chunks are derived from messages, not the source of truth
    // Each chunk references its source message via message_id
    // ============================================

    const chunks = buildSearchChunks(messages);
    console.log(`✓ Built ${chunks.length} search chunks from ${messages.length} messages`);

    const vectors = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `${conversation_id}-chunk-${i}`;

      // Generate embedding
      const embeddingResult = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: chunk.content
      });

      const embedding = embeddingResult.data[0];

      // Store chunk - clean content, no frontmatter headers
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

    // Upsert all vectors at once
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
// Joins content blocks back into readable markdown
// This is what the chat viewer renders
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
// Pairs user questions with assistant answers
// Each chunk links back to its source message
// Clean content only - no frontmatter headers
// ============================================

function buildSearchChunks(messages: ExtensionMessage[]) {
  const chunks: {
    content: string;
    message_id: string;
    metadata: Record<string, any>;
  }[] = [];

  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    if (msg.role === 'user' && messages[i + 1]?.role === 'assistant') {
      // Q&A pair - most useful unit for search
      const userText = extractText(messages[i].content);
      const assistantText = extractText(messages[i + 1].content);

      const combined = `Q: ${userText}\n\nA: ${assistantText}`;

      chunks.push({
        content: combined,
        message_id: msg.id,  // anchor to the user message
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
      // Standalone message (first message, orphaned messages, etc.)
      const text = extractText(msg.content);
      const label = msg.role === 'user' ? 'User' : 'Assistant';

      chunks.push({
        content: `${label}: ${text}`,
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

// ============================================
// EXTRACT PLAIN TEXT FROM CONTENT BLOCKS
// Used for building search chunks
// Keeps code blocks as code fences for context
// ============================================

function extractText(blocks: ContentBlock[]): string {
  return blocks.map(block => {
    if (block.type === 'code') {
      const lang = block.language && block.language !== 'text' ? block.language : '';
      // Keep code in chunks so searches for code patterns work
      return `\`\`\`${lang}\n${block.content}\n\`\`\``;
    }
    return block.content;
  }).join('\n\n').trim();
}

export default app;