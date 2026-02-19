import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, ImportRequest, SearchRequest, SearchResult } from '../types/index.js';
import { getSearchHTML } from './ui/search';
import { getChatHTML, chatViewerScript } from './ui/chat';
import importExtension from './routes/import-extension.js';
import { nodeinfo } from './routes/nodeinfo';
import { webfinger } from './routes/webfinger';
import { actor } from './routes/actor';

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

app.get('/chats', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT id, title, summary, source, visibility, message_count, imported_at, created_at
    FROM chats
    WHERE visibility = 'public'
    ORDER BY imported_at DESC
  `).all();

  return c.json({ chats: results });
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

export default app;