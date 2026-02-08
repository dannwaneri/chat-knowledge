

import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  INSTANCE_DOMAIN: string;
  INSTANCE_NAME: string;
  ADMIN_EMAIL: string;
};

export const activitypub = new Hono<{ Bindings: Bindings }>();

// WebFinger - Discovery protocol
activitypub.get('/webfinger', async (c) => {
  const resource = c.req.query('resource');
  
  if (!resource || !resource.startsWith('acct:')) {
    return c.json({ error: 'Invalid resource parameter' }, 400);
  }

  const [, username, domain] = resource.match(/acct:(.+)@(.+)/) || [];

  if (domain !== c.env.INSTANCE_DOMAIN) {
    return c.json({ error: 'Unknown domain' }, 404);
  }

  return c.json({
    subject: resource,
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: `https://${c.env.INSTANCE_DOMAIN}/federation/actor`
      },
      {
        rel: 'http://webfinger.net/rel/profile-page',
        type: 'text/html',
        href: `https://${c.env.INSTANCE_DOMAIN}`
      }
    ]
  });
});

// NodeInfo 2.0 - Instance metadata
activitypub.get('/nodeinfo/2.0', async (c) => {
  // Get stats
  const stats = await c.env.DB.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM chats) as total_chats,
      (SELECT COUNT(*) FROM chunks WHERE visibility = 'public') as public_chunks,
      (SELECT COUNT(*) FROM federated_instances WHERE status = 'active') as federated_instances
  `).first();

  return c.json({
    version: '2.0',
    software: {
      name: 'chat-knowledge',
      version: '0.1.0',
      repository: 'https://github.com/yourusername/chat-knowledge'
    },
    protocols: ['activitypub'],
    services: {
      inbound: [],
      outbound: []
    },
    openRegistrations: false,
    usage: {
      users: {
        total: 1 // Single user for now
      },
      localPosts: stats?.public_chunks || 0
    },
    metadata: {
      nodeName: c.env.INSTANCE_NAME,
      nodeDescription: 'Federated AI chat knowledge sharing',
      totalChats: stats?.total_chats || 0,
      federatedInstances: stats?.federated_instances || 0
    }
  });
});

// Actor - Represents the instance
activitypub.get('/actor', async (c) => {
  return c.json({
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1'
    ],
    type: 'Application',
    id: `https://${c.env.INSTANCE_DOMAIN}/federation/actor`,
    name: c.env.INSTANCE_NAME,
    preferredUsername: 'knowledge',
    summary: 'Federated AI chat knowledge sharing platform',
    url: `https://${c.env.INSTANCE_DOMAIN}`,
    inbox: `https://${c.env.INSTANCE_DOMAIN}/federation/inbox`,
    outbox: `https://${c.env.INSTANCE_DOMAIN}/federation/outbox`,
    followers: `https://${c.env.INSTANCE_DOMAIN}/federation/followers`,
    following: `https://${c.env.INSTANCE_DOMAIN}/federation/following`,
    publicKey: {
      id: `https://${c.env.INSTANCE_DOMAIN}/federation/actor#main-key`,
      owner: `https://${c.env.INSTANCE_DOMAIN}/federation/actor`,
      publicKeyPem: '-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----' // TODO: Generate
    }
  }, {
    headers: {
      'Content-Type': 'application/activity+json'
    }
  });
});

// Inbox - Receive activities from other instances
activitypub.post('/inbox', async (c) => {
  try {
    const activity = await c.req.json();
    
    // TODO: Verify HTTP signatures
    
    console.log('Received activity:', activity.type, 'from', activity.actor);

    // Process activity based on type
    switch (activity.type) {
      case 'Create':
        await handleCreate(c.env.DB, activity);
        break;
      
      case 'Update':
        await handleUpdate(c.env.DB, activity);
        break;
      
      case 'Delete':
        await handleDelete(c.env.DB, activity);
        break;
      
      case 'Like':
        await handleLike(c.env.DB, activity);
        break;
      
      case 'Announce':
        await handleAnnounce(c.env.DB, activity);
        break;
      
      default:
        console.log('Unsupported activity type:', activity.type);
    }

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO federation_activities 
      (id, activity_type, actor, object_id, raw_activity, processed)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      activity.type,
      activity.actor,
      activity.object?.id || 'unknown',
      JSON.stringify(activity),
      0  // processed = false
    ).run();

    return c.json({ message: 'Accepted' }, 202);
  } catch (error) {
    console.error('Error processing inbox activity:', error);
    return c.json({ error: 'Failed to process activity' }, 500);
  }
});

// Outbox - Activities sent by this instance
activitypub.get('/outbox', async (c) => {
  const page = Number(c.req.query('page')) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const { results: activities } = await c.env.DB.prepare(`
    SELECT 
      id,
      activity_type,
      object_id,
      raw_activity,
      created_at
    FROM federation_activities
    WHERE processed = 1
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  const orderedItems = activities.map(a => {
    try {
      return JSON.parse(a.raw_activity as string);
    } catch {
      return null;
    }
  }).filter(Boolean);

  return c.json({
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'OrderedCollection',
    id: `https://${c.env.INSTANCE_DOMAIN}/federation/outbox`,
    totalItems: orderedItems.length,
    orderedItems
  }, {
    headers: {
      'Content-Type': 'application/activity+json'
    }
  });
});

// Followers collection
activitypub.get('/followers', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT instance_url, instance_name
    FROM federated_instances
    WHERE status = 'active'
  `).all();

  return c.json({
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'OrderedCollection',
    totalItems: results.length,
    orderedItems: results.map(i => i.instance_url)
  }, {
    headers: {
      'Content-Type': 'application/activity+json'
    }
  });
});

// Following collection
activitypub.get('/following', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT instance_url, instance_name
    FROM federated_instances
    WHERE status = 'active'
  `).all();

  return c.json({
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'OrderedCollection',
    totalItems: results.length,
    orderedItems: results.map(i => i.instance_url)
  }, {
    headers: {
      'Content-Type': 'application/activity+json'
    }
  });
});

// Activity handlers

async function handleCreate(db: D1Database, activity: any) {
  // Extract knowledge from the activity
  const object = activity.object;
  
  if (object.type !== 'Note') {
    console.log('Ignoring non-Note object');
    return;
  }

  // Get or create instance
  const actorDomain = new URL(activity.actor).hostname;
  let instance = await db.prepare(`
    SELECT id FROM federated_instances WHERE instance_url LIKE ?
  `).bind(`%${actorDomain}%`).first();

  if (!instance) {
    const instanceId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO federated_instances (id, instance_url, instance_name, status)
      VALUES (?, ?, ?, ?)
    `).bind(instanceId, `https://${actorDomain}`, actorDomain, 'active').run();
    instance = { id: instanceId };
  }

  // Store in federated_knowledge
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO federated_knowledge 
    (id, instance_id, remote_id, content, title, author, tags, license, source_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    instance.id,
    object.id,
    object.content,
    object.name || null,
    activity.actor,
    JSON.stringify(object.tag || []),
    object.license || 'unknown',
    object.url || object.id
  ).run();

  console.log('Imported federated knowledge:', id);
}

async function handleUpdate(db: D1Database, activity: any) {
  // Update existing federated knowledge
  const object = activity.object;
  
  await db.prepare(`
    UPDATE federated_knowledge
    SET content = ?, title = ?, last_updated = CURRENT_TIMESTAMP
    WHERE remote_id = ?
  `).bind(object.content, object.name, object.id).run();
}

async function handleDelete(db: D1Database, activity: any) {
  // Delete federated knowledge
  await db.prepare(`
    DELETE FROM federated_knowledge WHERE remote_id = ?
  `).bind(activity.object.id || activity.object).run();
}

async function handleLike(db: D1Database, activity: any) {
  // Track engagement (optional)
  console.log('Like received for:', activity.object);
}

async function handleAnnounce(db: D1Database, activity: any) {
  // Handle boosts/shares (optional)
  console.log('Announce received for:', activity.object);
}