import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  VECTORIZE: any;
  AI: any;
  INSTANCE_DOMAIN: string;
};

export const federatedSearch = new Hono<{ Bindings: Bindings }>();

// Search across local + federated knowledge
federatedSearch.post('/search', async (c) => {
  const { query, maxResults = 10, includeFederated = true, instances = [] } = await c.req.json();

  // 1. Search local knowledge (private + public)
  const localResults = await searchLocal(c.env, query, maxResults);

  if (!includeFederated) {
    return c.json({
      query,
      results: localResults,
      sources: ['local']
    });
  }

  // 2. Search federated knowledge (from other instances)
  const federatedResults = await searchFederated(c.env, query, maxResults / 2);

  // 3. Optionally query other instances directly
  let remoteResults = [];
  if (instances.length > 0) {
    remoteResults = await queryRemoteInstances(instances, query, maxResults / 2);
  }

  // 4. Combine and rank results
  const allResults = [
    ...localResults.map(r => ({ ...r, source: 'local' })),
    ...federatedResults.map(r => ({ ...r, source: 'federated' })),
    ...remoteResults.map(r => ({ ...r, source: 'remote' }))
  ].sort((a, b) => b.score - a.score).slice(0, maxResults);

  return c.json({
    query,
    results: allResults,
    sources: {
      local: localResults.length,
      federated: federatedResults.length,
      remote: remoteResults.length
    }
  });
});

// Discover federated instances
federatedSearch.get('/instances', async (c) => {
  const status = c.req.query('status') || 'active';

  const { results } = await c.env.DB.prepare(`
    SELECT 
      id,
      instance_url,
      instance_name,
      status,
      last_seen,
      created_at
    FROM federated_instances
    WHERE status = ?
    ORDER BY last_seen DESC
  `).bind(status).all();

  return c.json({ instances: results });
});

// Add federated instance
federatedSearch.post('/instances', async (c) => {
  const { instance_url } = await c.req.json();

  // Discover instance metadata via WebFinger
  const metadata = await discoverInstance(instance_url);

  const id = crypto.randomUUID();

  await c.env.DB.prepare(`
    INSERT INTO federated_instances 
    (id, instance_url, instance_name, admin_email, shared_inbox, public_key, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    instance_url,
    metadata.name || instance_url,
    metadata.admin_email || null,
    metadata.shared_inbox || null,
    metadata.public_key || null,
    'pending'
  ).run();

  return c.json({ 
    id,
    instance_url,
    message: 'Instance added, pending approval' 
  }, 201);
});

// Endpoint for other instances to query your public knowledge
federatedSearch.post('/federation/query', async (c) => {
  const { query, maxResults = 5 } = await c.req.json();
  const requestingInstance = c.req.header('X-Instance-Domain');

  // Only return public knowledge
  const results = await searchPublicOnly(c.env, query, maxResults) as any[];

  // Log the federated query
  for (const result of results) {
    await c.env.DB.prepare(`
      INSERT INTO knowledge_analytics (id, chunk_id, event_type, source_instance)
      VALUES (?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      result.id,
      'federated_fetch',
      requestingInstance || 'unknown'
    ).run();
  }

  return c.json({
    query,
    instance: c.env.INSTANCE_DOMAIN,
    results: results.map(r => ({
      id: r.id,
      content: r.content,
      title: r.chat_title,
      category: r.category,
      license: r.license,
      url: `https://${c.env.INSTANCE_DOMAIN}/knowledge/${r.id}`,
      score: r.score
    }))
  });
});

// Helper: Search local knowledge
async function searchLocal(env: Bindings, query: string, limit: number) {
  // Generate embedding for query
  const { data } = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: query });
  const embedding = data[0];

  // Search Vectorize
  const vectorResults = await env.VECTORIZE.query(embedding, { topK: limit });

  // Get full chunk data
  const chunkIds = vectorResults.matches.map(m => m.id);
  
  if (chunkIds.length === 0) return [];

  const placeholders = chunkIds.map(() => '?').join(',');
  
  const { results } = await env.DB.prepare(`
    SELECT 
      ch.id,
      ch.content,
      ch.chat_id,
      ch.visibility,
      ch.license,
      c.title as chat_title,
      c.category
    FROM chunks ch
    JOIN chats c ON ch.chat_id = c.id
    WHERE ch.id IN (${placeholders})
  `).bind(...chunkIds).all();

  // Merge with scores
  return results.map(chunk => {
    const match = vectorResults.matches.find(m => m.id === chunk.id);
    return {
      ...chunk,
      score: match?.score || 0
    };
  });
}

// Helper: Search federated knowledge (already imported from other instances)
async function searchFederated(env: Bindings, query: string, limit: number) {
  // Generate embedding
  const { data } = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: query });
  const embedding = data[0];

  // For now, simple text search on federated_knowledge table
  // TODO: Add federated content to Vectorize for semantic search
  const { results } = await env.DB.prepare(`
    SELECT 
      fk.*,
      fi.instance_name,
      fi.instance_url
    FROM federated_knowledge fk
    JOIN federated_instances fi ON fk.instance_id = fi.id
    WHERE fk.content LIKE ?
    ORDER BY fk.imported_at DESC
    LIMIT ?
  `).bind(`%${query}%`, limit).all();

  return results.map(r => ({
    ...r,
    score: 0.5, // Placeholder score for text search
    is_federated: true
  }));
}

// Helper: Query remote instances directly
async function queryRemoteInstances(instances: string[], query: string, limit: number) {
  const results = [];

  for (const instanceUrl of instances) {
    try {
      const response = await fetch(`${instanceUrl}/federation/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Instance-Domain': instanceUrl // Your domain
        },
        body: JSON.stringify({ query, maxResults: limit })
      });

      if (response.ok) {
        const data = await response.json() as any;
        results.push(...data.results.map(r => ({
          ...r,
          remote_instance: instanceUrl,
          is_remote: true
        })));
      }
    } catch (error) {
      console.error(`Failed to query ${instanceUrl}:`, error);
    }
  }

  return results;
}

// Helper: Search only public knowledge
async function searchPublicOnly(env: Bindings, query: string, limit: number) {
  const { data } = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: query });
  const embedding = data[0];

  const vectorResults = await env.VECTORIZE.query(embedding, { 
    topK: limit * 2, // Get more, then filter
    filter: { visibility: 'public' } // If Vectorize supports metadata filtering
  });

  const chunkIds = vectorResults.matches.map(m => m.id);
  
  if (chunkIds.length === 0) return [];

  const placeholders = chunkIds.map(() => '?').join(',');
  
  const { results } = await env.DB.prepare(`
    SELECT 
      ch.id,
      ch.content,
      ch.visibility,
      ch.license,
      c.title as chat_title,
      c.category
    FROM chunks ch
    JOIN chats c ON ch.chat_id = c.id
    WHERE ch.id IN (${placeholders})
    AND ch.visibility = 'public'
  `).bind(...chunkIds).all();

  return results.map(chunk => {
    const match = vectorResults.matches.find(m => m.id === chunk.id);
    return {
      ...chunk,
      score: match?.score || 0
    };
  }).slice(0, limit);
}

// Helper: Discover instance via WebFinger
async function discoverInstance(instanceUrl: string) {
  try {
    // Try NodeInfo
    const nodeInfoResponse = await fetch(`${instanceUrl}/.well-known/nodeinfo/2.0`);
    if (nodeInfoResponse.ok) {
      const nodeInfo = await nodeInfoResponse.json() as any;
      return {
        name: nodeInfo.metadata?.nodeName || instanceUrl,
        admin_email: nodeInfo.metadata?.adminEmail,
        shared_inbox: `${instanceUrl}/federation/inbox`,
        public_key: null // TODO: Fetch from actor endpoint
      };
    }
  } catch (error) {
    console.error('Failed to discover instance:', error);
  }

  return {
    name: instanceUrl,
    admin_email: null,
    shared_inbox: `${instanceUrl}/federation/inbox`,
    public_key: null
  };
}