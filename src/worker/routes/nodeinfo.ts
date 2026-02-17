import { Hono } from 'hono';

// Add this type definition
type Bindings = {
  DB: D1Database;
};

// Update the Hono type
export const nodeinfo = new Hono<{ Bindings: Bindings }>();

// NodeInfo discovery endpoint
nodeinfo.get('/nodeinfo', (c) => {
  return c.json({
    links: [
      {
        rel: 'http://nodeinfo.diaspora.software/ns/schema/2.0',
        href: `${new URL(c.req.url).origin}/.well-known/nodeinfo/2.0`
      }
    ]
  });
});

// NodeInfo schema 2.0
nodeinfo.get('/nodeinfo/2.0', async (c) => {
  // Count stats from D1
  const chatCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM chats').first();
  const messageCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM messages').first();
  
  return c.json({
    version: '2.0',
    software: {
      name: 'the-foundation',
      version: '0.1.0',
      repository: 'https://github.com/dannwaneri/chat-knowledge'
    },
    protocols: ['activitypub'],
    services: {
      outbound: [],
      inbound: []
    },
    usage: {
      users: {
        total: 1,
        activeMonth: 1,
        activeHalfyear: 1
      },
      localPosts: chatCount?.count || 0,
      localComments: messageCount?.count || 0
    },
    openRegistrations: false,
    metadata: {
      nodeName: 'The Foundation',
      nodeDescription: 'Federated knowledge commons for AI conversations',
      maintainer: {
        name: 'Daniel Nwaneri',
        email: 'danielnwaneri41@gmail.com'
      }
    }
  });
});

export default nodeinfo;