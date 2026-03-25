// src/worker/routes/broadcast.ts
import { Hono } from 'hono';
import { Env } from '../../types/index.js';
import { signAndSend } from './federation-sign.js';

const broadcast = new Hono<{ Bindings: Env }>();

broadcast.post('/broadcast', async (c) => {
  const apiKey = c.req.header('X-API-Key');
  if (apiKey !== c.env.API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { activity } = await c.req.json();
  if (!activity) {
    return c.json({ error: 'Missing activity in request body' }, 400);
  }

  const privateKey = (c.env as any).ACTIVITYPUB_PRIVATE_KEY;
  if (!privateKey) {
    return c.json({ error: 'ACTIVITYPUB_PRIVATE_KEY not configured' }, 500);
  }

  const instanceDomain = new URL(c.req.url).hostname;
  const keyId = `https://${instanceDomain}/federation/actor#main-key`;

  // Fetch all active followers with a stored inbox
  const { results: followers } = await c.env.DB.prepare(`
    SELECT instance_url, shared_inbox
    FROM federated_instances
    WHERE status = 'active'
  `).all() as { results: any[] };

  if (!followers.length) {
    return c.json({ message: 'No active followers', sent: 0, failed: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const follower of followers) {
    const inboxUrl = follower.shared_inbox || follower.instance_url;

    try {
      const { ok } = await signAndSend(privateKey, keyId, inboxUrl, activity);
      ok ? sent++ : failed++;
    } catch (e) {
      console.error(`[broadcast] Error sending to ${inboxUrl}:`, e);
      failed++;
    }
  }

  return c.json({ sent, failed, total: followers.length });
});

export default broadcast;