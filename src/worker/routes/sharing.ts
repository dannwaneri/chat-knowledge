
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  VECTORIZE: any;
  INSTANCE_DOMAIN: string;
};

export const sharing = new Hono<{ Bindings: Bindings }>();

// Update chunk visibility
sharing.put('/chunks/:id/visibility', async (c) => {
  const id = c.req.param('id');
  const { visibility, license } = await c.req.json();

  if (!['private', 'unlisted', 'public'].includes(visibility)) {
    return c.json({ error: 'Invalid visibility value' }, 400);
  }

  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    UPDATE chunks 
    SET visibility = ?, 
        license = ?,
        shared_at = CASE WHEN visibility = 'private' AND ? != 'private' THEN ? ELSE shared_at END
    WHERE id = ?
  `).bind(visibility, license || 'CC-BY', visibility, now, id).run();

  // If making public, create ActivityPub activity
  if (visibility === 'public') {
    await createShareActivity(c.env.DB, id, c.env.INSTANCE_DOMAIN);
  }

  return c.json({ 
    id,
    visibility,
    message: 'Visibility updated successfully' 
  });
});

// Bulk update chat visibility
sharing.put('/chats/:chatId/visibility', async (c) => {
  const chatId = c.req.param('chatId');
  const { visibility, license } = await c.req.json();

  if (!['private', 'unlisted', 'public'].includes(visibility)) {
    return c.json({ error: 'Invalid visibility value' }, 400);
  }

  // Update chat
  await c.env.DB.prepare(`
    UPDATE chats SET visibility = ? WHERE id = ?
  `).bind(visibility, chatId).run();

  // Update all chunks in this chat
  const now = new Date().toISOString();
  
  await c.env.DB.prepare(`
    UPDATE chunks 
    SET visibility = ?, 
        license = ?,
        shared_at = CASE WHEN visibility = 'private' AND ? != 'private' THEN ? ELSE shared_at END
    WHERE chat_id = ?
  `).bind(visibility, license || 'CC-BY', visibility, now, chatId).run();

  // Get chunk IDs for ActivityPub
  if (visibility === 'public') {
    const { results } = await c.env.DB.prepare(`
      SELECT id FROM chunks WHERE chat_id = ?
    `).bind(chatId).all();

    // Create share activities for all chunks
    for (const chunk of results) {
      await createShareActivity(c.env.DB, chunk.id as string, c.env.INSTANCE_DOMAIN);
    }
  }

  return c.json({ 
    chatId,
    visibility,
    message: 'Chat visibility updated successfully' 
  });
});

// Get public chunks (for sharing/discovery)
sharing.get('/public', async (c) => {
  const limit = Number(c.req.query('limit')) || 20;
  const offset = Number(c.req.query('offset')) || 0;
  const category = c.req.query('category');

  let query = `
    SELECT 
      ch.id,
      ch.content,
      ch.chat_id,
      ch.visibility,
      ch.license,
      ch.shared_at,
      ch.share_count,
      c.title as chat_title,
      c.category
    FROM chunks ch
    JOIN chats c ON ch.chat_id = c.id
    WHERE ch.visibility = 'public'
  `;

  const params = [];
  
  if (category) {
    query += ` AND c.category = ?`;
    params.push(category);
  }

  query += ` ORDER BY ch.shared_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({ 
    chunks: results,
    count: results.length 
  });
});

// Get sharing analytics for a chunk
sharing.get('/chunks/:id/analytics', async (c) => {
  const id = c.req.param('id');

  const chunk = await c.env.DB.prepare(`
    SELECT 
      id,
      visibility,
      share_count,
      shared_at
    FROM chunks
    WHERE id = ?
  `).bind(id).first();

  if (!chunk) {
    return c.json({ error: 'Chunk not found' }, 404);
  }

  // Get recent analytics
  const { results: analytics } = await c.env.DB.prepare(`
    SELECT 
      event_type,
      source_instance,
      created_at
    FROM knowledge_analytics
    WHERE chunk_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).bind(id).all();

  // Aggregate stats
  const stats = {
    total_views: analytics.filter(a => a.event_type === 'view').length,
    search_hits: analytics.filter(a => a.event_type === 'search_hit').length,
    federated_fetches: analytics.filter(a => a.event_type === 'federated_fetch').length,
    unique_instances: new Set(analytics.map(a => a.source_instance).filter(Boolean)).size
  };

  return c.json({ 
    chunk,
    stats,
    recent_activity: analytics.slice(0, 10)
  });
});

// Create a collection
sharing.post('/collections', async (c) => {
  const { name, description, visibility, chunk_ids } = await c.req.json();

  const collectionId = crypto.randomUUID();

  await c.env.DB.prepare(`
    INSERT INTO collections (id, name, description, visibility)
    VALUES (?, ?, ?, ?)
  `).bind(collectionId, name, description, visibility || 'private').run();

  // Add chunks to collection
  if (chunk_ids && chunk_ids.length > 0) {
    for (let i = 0; i < chunk_ids.length; i++) {
      await c.env.DB.prepare(`
        INSERT INTO collection_items (id, collection_id, chunk_id, position)
        VALUES (?, ?, ?, ?)
      `).bind(crypto.randomUUID(), collectionId, chunk_ids[i], i).run();
    }
  }

  return c.json({ 
    id: collectionId,
    message: 'Collection created successfully' 
  }, 201);
});

// Get collection with chunks
sharing.get('/collections/:id', async (c) => {
  const id = c.req.param('id');

  const collection = await c.env.DB.prepare(`
    SELECT * FROM collections WHERE id = ?
  `).bind(id).first();

  if (!collection) {
    return c.json({ error: 'Collection not found' }, 404);
  }

  const { results: chunks } = await c.env.DB.prepare(`
    SELECT 
      ch.id,
      ch.content,
      ch.chat_id,
      ch.visibility,
      c.title as chat_title,
      ci.position
    FROM collection_items ci
    JOIN chunks ch ON ci.chunk_id = ch.id
    JOIN chats c ON ch.chat_id = c.id
    WHERE ci.collection_id = ?
    ORDER BY ci.position ASC
  `).bind(id).all();

  return c.json({ 
    collection,
    chunks 
  });
});

// Helper: Create ActivityPub share activity
async function createShareActivity(db: D1Database, chunkId: string, instanceDomain: string) {
  const activityId = crypto.randomUUID();
  
  const chunk = await db.prepare(`
    SELECT ch.*, c.title, c.category
    FROM chunks ch
    JOIN chats c ON ch.chat_id = c.id
    WHERE ch.id = ?
  `).bind(chunkId).first();

  if (!chunk) return;

  const activity = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Create',
    id: `https://${instanceDomain}/activities/${activityId}`,
    actor: `https://${instanceDomain}/actor`,
    object: {
      type: 'Note',
      id: `https://${instanceDomain}/knowledge/${chunkId}`,
      content: chunk.content,
      name: chunk.title,
      tag: chunk.category ? [chunk.category] : [],
      attributedTo: `https://${instanceDomain}/actor`,
      license: chunk.license,
      published: chunk.shared_at || new Date().toISOString()
    }
  };

  await db.prepare(`
    INSERT INTO federation_activities 
    (id, activity_type, actor, object_type, object_id, raw_activity, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    activityId,
    'Create',
    `https://${instanceDomain}/actor`,
    'chunk',
    chunkId,
    JSON.stringify(activity),
    'pending'
  ).run();
}