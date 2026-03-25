import { Hono } from 'hono';
import { inbox } from './inbox-handler';

type Bindings = {
  DB: D1Database;
  ACTIVITYPUB_PRIVATE_KEY: string;
};

export const actor = new Hono<{ Bindings: Bindings }>();

// ActivityPub Actor - represents The Foundation instance
actor.get('/actor', async (c) => {
  const instanceDomain = new URL(c.req.url).hostname;

  const actorData = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1'
    ],
    type: 'Application',
    id: `https://${instanceDomain}/federation/actor`,
    preferredUsername: 'knowledge',
    name: 'The Foundation',
    summary: 'Federated knowledge commons for AI conversations. Preserving valuable insights from the AI era.',
    url: `https://${instanceDomain}`,
    manuallyApprovesFollowers: false,
    discoverable: true,
    published: '2026-02-17T00:00:00Z',
    
    // Endpoints
    inbox: `https://${instanceDomain}/federation/inbox`,
    outbox: `https://${instanceDomain}/federation/outbox`,
    followers: `https://${instanceDomain}/federation/followers`,
    following: `https://${instanceDomain}/federation/following`,
    
    // Public key for HTTP signature verification
    publicKey: {
      id: `https://${instanceDomain}/federation/actor#main-key`,
      owner: `https://${instanceDomain}/federation/actor`,
      publicKeyPem: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqFWUukHzzSrQtVmgNLsi
V/JmvzztzDgv0bYQ8aTCvFjr5v6mfwm4kwxvqqP9Ywph8sK3xgS6/kz95R3NpKdx
5Aa+WbwHJyzaixaVMTM+9sZuU8TdbQW+tGXo/YtJ5tW67n1MO39WHFO04NF6CcZo
Bc99BxVMUxnBdRPWXcEaABsawbaunKfreV1j4p7dp1X078VaOKgrVN33XRlMf8TC
SE//QhIWSI4FqbvIcwy7W0mAFhXWl8hAdjsbuzYNnWvnUrZb0Z75OZH3v0HmqeEI
VGTzc3I84w2WBMO824cQ5ZPdb6wyf7mMws4A1VUNsQ23ghWOWS6BXGQNVb4f45FZ
7wIDAQAB
-----END PUBLIC KEY-----`
    },
    
    // Icon/Avatar
    icon: {
      type: 'Image',
      mediaType: 'image/png',
      url: `https://${instanceDomain}/icon.png`
    }
  };

  return c.body(JSON.stringify(actorData), 200, {
    'Content-Type': 'application/activity+json; charset=utf-8'
  });
});

// Followers collection
actor.get('/followers', async (c) => {
  const instanceDomain = new URL(c.req.url).hostname;

  // Query federated instances that follow us
  const { results } = await c.env.DB.prepare(`
    SELECT instance_url 
    FROM federated_instances 
    WHERE status = 'active'
  `).all();

  const followersData = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'OrderedCollection',
    id: `https://${instanceDomain}/federation/followers`,
    totalItems: results.length,
    orderedItems: results.map(r => r.instance_url)
  };

  return c.body(JSON.stringify(followersData), 200, {
    'Content-Type': 'application/activity+json; charset=utf-8'
  });
});

// Following collection
actor.get('/following', async (c) => {
  const instanceDomain = new URL(c.req.url).hostname;

  const { results } = await c.env.DB.prepare(`
    SELECT instance_url 
    FROM federated_instances 
    WHERE status = 'active'
  `).all();

  const followingData = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'OrderedCollection',
    id: `https://${instanceDomain}/federation/following`,
    totalItems: results.length,
    orderedItems: results.map(r => r.instance_url)
  };

  return c.body(JSON.stringify(followingData), 200, {
    'Content-Type': 'application/activity+json; charset=utf-8'
  });
});

// Outbox - published activities
actor.get('/outbox', async (c) => {
  const instanceDomain = new URL(c.req.url).hostname;
  const page = Number(c.req.query('page')) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  // For now, return empty outbox
  // Later: query federation_activities table
  const outboxData = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'OrderedCollection',
    id: `https://${instanceDomain}/federation/outbox`,
    totalItems: 0,
    orderedItems: []
  };

  return c.body(JSON.stringify(outboxData), 200, {
    'Content-Type': 'application/activity+json; charset=utf-8'
  });
});

// Mount the real inbox handler
actor.route('/', inbox);

export default actor;