import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, ImportRequest, SearchRequest, SearchResult } from '../types/index.js';
import { getSearchHTML } from './ui/search';
import { getChatHTML, chatViewerScript } from './ui/chat';
import { getCollectionsHTML, getCollectionDetailHTML } from './ui/collections';
import { getChatsHTML } from './ui/chats';
import importExtension from './routes/import-extension.js';
import { nodeinfo } from './routes/nodeinfo';
import { webfinger } from './routes/webfinger';
import { actor } from './routes/actor';
import { FoundationMCP } from "../mcp-server/index.js";
import { ChatSanitizer } from './utils/sanitizer.js';
import insightsRoute from './routes/insights.js';
import collectionsRoute from './routes/collections.js';
import evaluatorRoute from './routes/evaluator.js';
import broadcastRoute from './routes/broadcast.js';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Accept'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// ============================================
// WEB UI ROUTES
// ============================================

app.get('/', (c) => {
  return c.html(getSearchHTML());
});

app.get('/view/:chatId', (c) => {
  return c.html(getChatHTML());
});

app.get('/collections', (c) => {
  return c.html(getCollectionsHTML());
});

app.get('/collections/:collectionId', (c) => {
  return c.html(getCollectionDetailHTML());
});

app.get('/chat-viewer.js', (c) => {
  return c.text(chatViewerScript, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=3600'
  });
});

// ============================================
// API DOCUMENTATION
// ============================================

app.get('/api', (c) => {
  return c.json({
    name: 'Chat Knowledge API',
    version: '1.0.0',
    description: 'Federated AI knowledge commons using ActivityPub',
    endpoints: {
      import: 'POST /import',
      search: 'POST /search',
      chats: 'GET /chats',
      chat: 'GET /chat/:chatId',
      federation: {
        nodeinfo: 'GET /.well-known/nodeinfo',
        webfinger: 'GET /.well-known/webfinger',
        activitypub: 'GET /federation/*'
      },
      sharing: {
        markPublic: 'POST /api/sharing/chats/:chatId/public',
        getPublic: 'GET /api/sharing/public'
      },
      security: {
        scan: 'POST /api/pre-share-review/chats/:chatId/scan',
        approve: 'POST /api/pre-share-review/chats/:chatId/approve'
      }
    },
    repository: 'https://github.com/dannwaneri/chat-knowledge',
    documentation: 'https://github.com/dannwaneri/chat-knowledge#readme'
  });
});

// ============================================
// FEDERATION & SHARING ROUTES
// ============================================


app.route('/api/import/extension', importExtension);
app.route('/.well-known', nodeinfo);
app.route('/.well-known', webfinger);
app.route('/federation', actor);
app.route('/api/insights', insightsRoute);
app.route('/api/collections', collectionsRoute);
app.route('/api/evaluator', evaluatorRoute);
app.route('/api/federation', broadcastRoute);

// ============================================
// CORE API ENDPOINTS
// ============================================

app.post('/import', async (c) => {
  const { chatId, title, chunks, metadata }: ImportRequest = await c.req.json();

  await c.env.DB.prepare(`
    INSERT INTO chats (id, title, imported_at, metadata, message_count)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    chatId,
    title,
    new Date().toISOString(),
    JSON.stringify(metadata || {}),
    chunks.length
  ).run();

  const vectors = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkId = `${chatId}-chunk-${i}`;
    
    const embeddingResult = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: chunk.content
    });

    const embedding = embeddingResult.data[0];

    await c.env.DB.prepare(`
      INSERT INTO chunks (id, chat_id, chunk_index, content, tokens, metadata, vector_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      chunkId,
      chatId,
      i,
      chunk.content,
      chunk.tokens,
      JSON.stringify(chunk.metadata || {}),
      chunkId,
      new Date().toISOString()
    ).run();

    vectors.push({
      id: chunkId,
      values: embedding,
      metadata: {
        chat_id: chatId,
        chunk_index: i,
        content_preview: chunk.content.substring(0, 200)
      }
    });
  }

  await c.env.VECTORIZE.upsert(vectors);

  return c.json({ 
    success: true, 
    chatId, 
    chunksProcessed: chunks.length 
  });
});

app.post('/search', async (c) => {
  const { query, maxResults = 5 }: SearchRequest = await c.req.json();

  const queryEmbeddingResult = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: query
  });

  const queryEmbedding = queryEmbeddingResult.data[0];

  const results = await c.env.VECTORIZE.query(queryEmbedding, {
    topK: maxResults * 2,
    returnMetadata: true
  });

  const chunks: SearchResult[] = (await Promise.all(
    results.matches.slice(0, maxResults).map(async (match) => {
      const chunk = await c.env.DB.prepare(`
        SELECT c.*, ch.title as chat_title, ch.imported_at as chat_imported_at,
               ch.summary as chat_summary, ch.source as chat_source
        FROM chunks c
        JOIN chats ch ON c.chat_id = ch.id
        WHERE c.id = ? AND ch.visibility = 'public'
      `).bind(match.id).first();

      if (!chunk) {
        console.log(`Chunk ${match.id} not found (stale Vectorize entry)`);
        return null;
      }

      return {
        content: chunk.content as string,
        chatTitle: chunk.chat_title as string,
        chatId: chunk.chat_id as string,
        relevance: match.score || 0,
        metadata: JSON.parse(chunk.metadata as string || '{}'),
        chatMetadata: {
          importedAt: chunk.chat_imported_at,
          source: chunk.chat_source,
          summary: chunk.chat_summary
        }
      };
    })
  )).filter(Boolean) as SearchResult[];

  return c.json({ 
    query,
    results: chunks,
    count: chunks.length
  });
});


app.get('/api/private/chats', async (c) => {
  const apiKey = c.req.header('X-API-Key');
  if (apiKey !== c.env.API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { results } = await c.env.DB.prepare(`
    SELECT id, title, summary, source, visibility, message_count, imported_at, created_at
    FROM chats
    ORDER BY imported_at DESC
  `).all();

  return c.json({ chats: results });
});


app.all("/mcp/*", async (c) => {
  const apiKey = c.req.header("X-API-Key") || "";
  if (apiKey !== c.env.API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return FoundationMCP.serve("/mcp").fetch(
    c.req.raw,
    c.env,
    c.executionCtx
  );
});

app.get('/chats', async (c) => {
  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    const { results } = await c.env.DB.prepare(`
    SELECT id, title, summary, source, visibility, message_count, imported_at, created_at, model
    FROM chats WHERE visibility = 'public' ORDER BY imported_at DESC
    `).all();
    return c.json({ chats: results });
  }
  return c.html(getChatsHTML());
});

app.get('/chat/:chatId', async (c) => {
  const chatId = c.req.param('chatId');

  // Check Accept header - serve HTML for browser, JSON for API
  const accept = c.req.header('Accept') || '';
  if (!accept.includes('application/json')) {
    return c.html(getChatHTML());
  }

  // Fetch chat metadata
  const chat = await c.env.DB.prepare(`
    SELECT id, title, summary, source, visibility, message_count, created_at, imported_at
    FROM chats WHERE id = ?
  `).bind(chatId).first();

  if (!chat) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  // Fetch messages in order (source of truth)
  const { results: messages } = await c.env.DB.prepare(`
    SELECT id, role, content, message_index, created_at, truncated
    FROM messages
    WHERE chat_id = ?
    ORDER BY message_index ASC
  `).bind(chatId).all();

  return c.json({
    chat,
    messages,
    count: messages.length
  });
});

// Paginated messages endpoint
app.get('/api/chats/:chatId/messages', async (c) => {
  const chatId = c.req.param('chatId');
  const offset = parseInt(c.req.query('offset') || '0');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);

  const chat = await c.env.DB.prepare(`
    SELECT id, title FROM chats WHERE id = ?
  `).bind(chatId).first();

  if (!chat) return c.json({ error: 'Chat not found' }, 404);

  const { results: messages } = await c.env.DB.prepare(`
    SELECT role, content, message_index
    FROM messages
    WHERE chat_id = ?
    ORDER BY message_index ASC
    LIMIT ? OFFSET ?
  `).bind(chatId, limit, offset).all();

  const total = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM messages WHERE chat_id = ?
  `).bind(chatId).first() as { count: number };

  return c.json({
    chatId,
    messages,
    offset,
    limit,
    total: total.count,
    hasMore: offset + limit < total.count
  });
});


// Auto-broadcast when chat goes public
app.post('/api/chats/:chatId/visibility', async (c) => {
  const apiKey = c.req.header('X-API-Key');
  if (apiKey !== c.env.API_KEY) return c.json({ error: 'Unauthorized' }, 401);
  const chatId = c.req.param('chatId');
  const { visibility } = await c.req.json();
  if (!['public', 'private'].includes(visibility)) return c.json({ error: 'Invalid visibility value' }, 400);
  await c.env.DB.prepare(`UPDATE chats SET visibility = ? WHERE id = ?`).bind(visibility, chatId).run();
  // Auto-broadcast to followers when chat goes public
  if (visibility === 'public') {
    const chat = await c.env.DB.prepare(
      `SELECT title, summary FROM chats WHERE id = ?`
    ).bind(chatId).first() as any;
    if (chat) {
      const instanceDomain = new URL(c.req.url).hostname;
      const privateKey = (c.env as any).ACTIVITYPUB_PRIVATE_KEY;
      const keyId = `https://${instanceDomain}/federation/actor#main-key`;
      const summary = chat.summary
        ? chat.summary.substring(0, 200).replace(/\*\*/g, '').replace(/\n/g, ' ') + '…'
        : '';
      const activity = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Create',
        id: `https://${instanceDomain}/federation/activities/${crypto.randomUUID()}`,
        actor: `https://${instanceDomain}/federation/actor`,
        object: {
          type: 'Note',
          id: `https://${instanceDomain}/notes/${chatId}`,
          content: `<p><strong>${chat.title}</strong></p>${summary ? `<p>${summary}</p>` : ''}<p><a href="https://${instanceDomain}/view/${chatId}">Read on Foundation →</a></p>`,
          url: `https://${instanceDomain}/view/${chatId}`,
          attributedTo: `https://${instanceDomain}/federation/actor`,
          published: new Date().toISOString(),
          to: ['https://www.w3.org/ns/activitystreams#Public']
        }
      };
      if (privateKey) {
        c.executionCtx.waitUntil(
          (async () => {
            try {
              const { results: followers } = await c.env.DB.prepare(
                `SELECT shared_inbox, instance_url FROM federated_instances WHERE status = 'active'`
              ).all() as { results: any[] };
              const { signAndSend } = await import('./routes/federation-sign.js');
              for (const follower of followers) {
                const inboxUrl = follower.shared_inbox || follower.instance_url;
                await signAndSend(privateKey, keyId, inboxUrl, activity).catch(e =>
                  console.error('[broadcast] Failed to deliver to', inboxUrl, e)
                );
              }
              console.log(`[broadcast] Auto-broadcast complete for chat ${chatId}`);
            } catch (e) {
              console.error('[broadcast] Auto-broadcast error:', e);
            }
          })()
        );
      }
    }
  }
  return c.json({ success: true, chatId, visibility });
});


// CLI capture endpoint
app.post('/api/import/cli', async (c) => {
  const apiKey = c.req.header('X-API-Key');
  if (apiKey !== c.env.API_KEY) return c.json({ error: 'Unauthorized' }, 401);

  const { sessionId, title, messages, model, metadata } = await c.req.json();
  if (!sessionId || !title || !Array.isArray(messages)) {
    return c.json({ error: 'Missing required fields: sessionId, title, messages' }, 400);
  }

  // Dedup check
  const existing = await c.env.DB.prepare(
    `SELECT id FROM chats WHERE id = ?`
  ).bind(sessionId).first();

  if (existing) return c.json({ error: 'Already exists' }, 409);

  // Insert chat
  await c.env.DB.prepare(`
    INSERT INTO chats (id, title, source, model, visibility, message_count, imported_at, created_at)
    VALUES (?, ?, ?, ?, 'private', ?, datetime('now'), datetime('now'))
  `).bind(
    sessionId,
    title,
    'claude-code-cli',
    model || null,
    messages.length
  ).run();

  // Sanitise messages before storage
  const sanitizer = new ChatSanitizer();
  const sanitized = await sanitizer.redactChat(
    messages.map((m: any) => ({ speaker: m.role, content: m.content })),
    { autoRedactCritical: true }
  );
  const redactedCount = sanitized.filter((m: any) => m.redacted).length;
  if (redactedCount > 0) {
    console.log(`[import-cli] Redacted secrets from ${redactedCount} message(s)`);
  }
  // Replace messages content with sanitised versions
  messages.forEach((m: any, i: number) => { m.content = sanitized[i].content; });

  // Insert messages + build Vectorize vectors
  const vectors: { id: string; values: number[]; metadata: Record<string, VectorizeVectorMetadata> }[] = [];

  for (const msg of messages) {
    const msgId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO messages (id, chat_id, role, content, message_index, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      msgId,
      sessionId,
      msg.role,
      msg.content,
      msg.message_index
    ).run();

    // Only vectorize non-empty content
    if (msg.content && msg.content.trim().length > 10) {
      try {
        const embeddingResult = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: msg.content.substring(0, 2000) // cap to avoid token limits
        });
        const embedding = embeddingResult.data[0];
        if (embedding) {
          const chunkId = `${sessionId}-msg-${msg.message_index}`;
          // Insert into chunks table for search
          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO chunks (id, chat_id, chunk_index, content, tokens, metadata, vector_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            chunkId,
            sessionId,
            msg.message_index,
            msg.content.substring(0, 2000),
            Math.ceil(msg.content.length / 4),
            JSON.stringify({ message_index: msg.message_index, role: msg.role }),
            chunkId
          ).run();
          vectors.push({
            id: chunkId,
            values: embedding,
            metadata: {
              chat_id: sessionId,
              chunk_index: msg.message_index,
              content_preview: msg.content.substring(0, 200)
            }
          });
        }
      } catch (e) {
        console.warn(`[cli-import] Embedding failed for message ${msg.message_index}:`, e);
      }
    }
  }

  // Upsert all vectors to Vectorize
  if (vectors.length > 0) {
    await c.env.VECTORIZE.upsert(vectors);
    console.log(`[cli-import] Vectorized ${vectors.length} messages for session ${sessionId}`);
  }

  // Trigger async insight extraction
  c.executionCtx.waitUntil(
    fetch(`${c.req.url.split('/api/')[0]}/api/insights/${sessionId}/extract`, {
      method: 'POST',
      headers: { 'X-API-Key': c.env.API_KEY }
    }).catch(() => {})
  );

  return c.json({ success: true, chatId: sessionId, messagesImported: messages.length });
});

export default app;

export { FoundationMCP };