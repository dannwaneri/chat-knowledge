import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, ImportRequest, SearchRequest, SearchResult } from '../types/index.js';
import { sharing } from './routes/sharing';
import { federatedSearch } from './routes/federated-search';
import { activitypub } from './routes/activitypub';
import { preShareReview } from './routes/pre-share-review';

const app = new Hono<{ Bindings: Env }>();


app.use('/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));


app.get('/', (c) => {
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


app.route('/api/sharing', sharing);
app.route('/api/federated-search', federatedSearch);
app.route('/api/pre-share-review', preShareReview);
app.route('/.well-known', activitypub);
app.route('/federation', activitypub);


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

  const chunks: SearchResult[] = await Promise.all(
    results.matches.slice(0, maxResults).map(async (match) => {
      const chunk = await c.env.DB.prepare(`
        SELECT c.*, ch.title as chat_title, ch.metadata as chat_metadata
        FROM chunks c
        JOIN chats ch ON c.chat_id = ch.id
        WHERE c.id = ?
      `).bind(match.id).first();

      if (!chunk) {
        throw new Error(`Chunk ${match.id} not found`);
      }

      return {
        content: chunk.content as string,
        chatTitle: chunk.chat_title as string,
        chatId: chunk.chat_id as string,
        relevance: match.score || 0,
        metadata: JSON.parse(chunk.metadata as string),
        chatMetadata: JSON.parse(chunk.chat_metadata as string)
      };
    })
  );

  return c.json({ 
    query,
    results: chunks,
    count: chunks.length
  });
});

app.get('/chats', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT id, title, imported_at, message_count, metadata
    FROM chats
    ORDER BY imported_at DESC
  `).all();

  return c.json({ chats: results });
});

app.get('/chat/:chatId', async (c) => {
  const chatId = c.req.param('chatId');
  
  const chat = await c.env.DB.prepare(`
    SELECT * FROM chats WHERE id = ?
  `).bind(chatId).first();

  if (!chat) {
    return c.json({ error: 'Chat not found' }, 404);
  }

  const { results: chunks } = await c.env.DB.prepare(`
    SELECT * FROM chunks WHERE chat_id = ? ORDER BY chunk_index
  `).bind(chatId).all();

  return c.json({ 
    chat: {
      ...chat,
      metadata: JSON.parse(chat.metadata as string)
    },
    chunks: chunks.map(ch => ({
      ...ch,
      metadata: JSON.parse(ch.metadata as string)
    }))
  });
});

export default app;