import { Hono } from 'hono';
import { Env } from '../../types/index.js';

const collections = new Hono<{ Bindings: Env }>();

// Create a collection
collections.post('/', async (c) => {
  const { title, description, visibility = 'private' } = await c.req.json();
  if (!title) return c.json({ error: 'Title required' }, 400);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO collections (id, title, description, visibility)
    VALUES (?, ?, ?, ?)
  `).bind(id, title, description || null, visibility).run();

  return c.json({ success: true, id, title, visibility });
});

// List all collections (public only for anonymous; all for API key holders)
collections.get('/', async (c) => {
  const apiKey = c.req.header('X-API-Key');
  const isPrivate = apiKey === c.env.API_KEY;

  const sql = isPrivate
    ? `SELECT c.*, COUNT(cc.chat_id) as chat_count
       FROM collections c
       LEFT JOIN collection_chats cc ON c.id = cc.collection_id
       GROUP BY c.id
       ORDER BY c.updated_at DESC`
    : `SELECT c.*, COUNT(cc.chat_id) as chat_count
       FROM collections c
       LEFT JOIN collection_chats cc ON c.id = cc.collection_id
       WHERE c.visibility = 'public'
       GROUP BY c.id
       ORDER BY c.updated_at DESC`;

  const { results } = await c.env.DB.prepare(sql).all();

  return c.json({ collections: results });
});

// Get a collection with its chats and aggregated insights
collections.get('/:collectionId', async (c) => {
  const collectionId = c.req.param('collectionId');

  const collection = await c.env.DB.prepare(`
    SELECT * FROM collections WHERE id = ?
  `).bind(collectionId).first();

  if (!collection) return c.json({ error: 'Collection not found' }, 404);

  // Get chats in this collection
  const { results: chats } = await c.env.DB.prepare(`
    SELECT ch.id, ch.title, ch.summary, ch.message_count, ch.imported_at, cc.added_at
    FROM chats ch
    JOIN collection_chats cc ON ch.id = cc.chat_id
    WHERE cc.collection_id = ?
    ORDER BY cc.added_at DESC
  `).bind(collectionId).all();

  // Get aggregated insights from all chats in this collection
  const { results: insights } = await c.env.DB.prepare(`
    SELECT i.id, i.type, i.content, i.context, i.score, i.promoted, i.chat_id, ch.title as chat_title
    FROM insights i
    JOIN collection_chats cc ON i.chat_id = cc.chat_id
    JOIN chats ch ON i.chat_id = ch.id
    WHERE cc.collection_id = ?
      AND length(i.content) > 20
      AND i.content NOT LIKE 'No % found%'
      AND i.content NOT LIKE 'what happened%'
      AND i.content NOT LIKE 'patterns of%'
      AND i.content NOT LIKE 'The conversation is about%'
    ORDER BY i.type, i.created_at ASC
  `).bind(collectionId).all();

  // Group insights by type
  const groupedInsights = insights.reduce((acc: any, insight: any) => {
    if (!acc[insight.type]) acc[insight.type] = [];
    acc[insight.type].push(insight);
    return acc;
  }, {});

  return c.json({
    collection,
    chats,
    insights: groupedInsights,
    totalInsights: insights.length
  });
});

// Add a chat to a collection
collections.post('/:collectionId/chats', async (c) => {
  const collectionId = c.req.param('collectionId');
  const { chatId } = await c.req.json();

  const collection = await c.env.DB.prepare(`
    SELECT id FROM collections WHERE id = ?
  `).bind(collectionId).first();

  if (!collection) return c.json({ error: 'Collection not found' }, 404);

  const chat = await c.env.DB.prepare(`
    SELECT id FROM chats WHERE id = ?
  `).bind(chatId).first();

  if (!chat) return c.json({ error: 'Chat not found' }, 404);

  await c.env.DB.prepare(`
    INSERT OR IGNORE INTO collection_chats (collection_id, chat_id)
    VALUES (?, ?)
  `).bind(collectionId, chatId).run();

  // Update collection updated_at
  await c.env.DB.prepare(`
    UPDATE collections SET updated_at = datetime('now') WHERE id = ?
  `).bind(collectionId).run();

  return c.json({ success: true, collectionId, chatId });
});

// Remove a chat from a collection
collections.delete('/:collectionId/chats/:chatId', async (c) => {
  const collectionId = c.req.param('collectionId');
  const chatId = c.req.param('chatId');

  await c.env.DB.prepare(`
    DELETE FROM collection_chats WHERE collection_id = ? AND chat_id = ?
  `).bind(collectionId, chatId).run();

  await c.env.DB.prepare(`
    UPDATE collections SET updated_at = datetime('now') WHERE id = ?
  `).bind(collectionId).run();

  return c.json({ success: true });
});

// Delete a collection
collections.delete('/:collectionId', async (c) => {
  const collectionId = c.req.param('collectionId');

  await c.env.DB.prepare(`
    DELETE FROM collections WHERE id = ?
  `).bind(collectionId).run();

  return c.json({ success: true });
});

// Toggle collection visibility
collections.post('/:collectionId/visibility', async (c) => {
  const collectionId = c.req.param('collectionId');
  const { visibility } = await c.req.json();

  if (!['public', 'private'].includes(visibility)) {
    return c.json({ error: 'Invalid visibility value' }, 400);
  }

  await c.env.DB.prepare(`
    UPDATE collections SET visibility = ?, updated_at = datetime('now') WHERE id = ?
  `).bind(visibility, collectionId).run();

  return c.json({ success: true, collectionId, visibility });
});

export default collections;