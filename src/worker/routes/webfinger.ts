import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

export const webfinger = new Hono<{ Bindings: Bindings }>();

// WebFinger lookup - RFC 7033
webfinger.get('/webfinger', async (c) => {
  const resource = c.req.query('resource');
  
  if (!resource) {
    return c.json({ error: 'Missing resource parameter' }, 400);
  }

  // Parse acct:user@domain format
  const acctMatch = resource.match(/^acct:([^@]+)@(.+)$/);
  
  if (!acctMatch) {
    return c.json({ error: 'Invalid resource format. Expected acct:user@domain' }, 400);
  }

  const [, username, domain] = acctMatch;
  const instanceDomain = new URL(c.req.url).hostname;

  // Only respond for our domain
  if (domain !== instanceDomain) {
    return c.json({ error: 'Unknown domain' }, 404);
  }

  // Only support 'knowledge' as the username
  if (username !== 'knowledge') {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    subject: resource,
    aliases: [
      `https://${instanceDomain}/federation/actor`,
      `https://${instanceDomain}/@knowledge`
    ],
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: `https://${instanceDomain}/federation/actor`
      },
      {
        rel: 'http://webfinger.net/rel/profile-page',
        type: 'text/html',
        href: `https://${instanceDomain}`
      }
    ]
  });
});

export default webfinger;