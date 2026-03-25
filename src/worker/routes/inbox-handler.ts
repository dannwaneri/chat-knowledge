import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  ACTIVITYPUB_PRIVATE_KEY: string;
};

export const inbox = new Hono<{ Bindings: Bindings }>();

// Process incoming ActivityPub activities
inbox.post('/inbox', async (c) => {
  try {
    const activity = await c.req.json();
    const instanceDomain = new URL(c.req.url).hostname;
    
    console.log('Received activity:', activity.type, 'from', activity.actor);

    const valid = await verifySignature(c.req.raw);
    if (!valid) {
      console.warn('[inbox] Rejected unverified activity from:', activity.actor);
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Route based on activity type
    switch (activity.type) {
      case 'Follow':
        await handleFollow(c.env.DB, activity, instanceDomain, c.env.ACTIVITYPUB_PRIVATE_KEY);
        break;
      
      case 'Undo':
        if (activity.object?.type === 'Follow') {
          await handleUnfollow(c.env.DB, activity);
        }
        break;
      
      case 'Create':
        await handleCreate(c.env.DB, activity);
        break;
      
      default:
        console.log('Unsupported activity type:', activity.type);
    }

    // Log the activity
    await c.env.DB.prepare(`
      INSERT INTO federation_activities 
      (id, activity_type, actor, object_id, raw_activity, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      activity.id || crypto.randomUUID(),
      activity.type,
      activity.actor,
      typeof activity.object === 'string' ? activity.object : activity.object?.id || 'unknown',
      JSON.stringify(activity),
      new Date().toISOString()
    ).run();

    return c.json({ message: 'Accepted' }, 202);
  } catch (error) {
    console.error('Error processing inbox activity:', error);
    return c.json({ error: 'Failed to process activity' }, 500);
  }
});

async function verifySignature(req: Request): Promise<boolean> {
  try {
    const signatureHeader = req.headers.get('Signature');
    if (!signatureHeader) {
      console.warn('[inbox] No Signature header — rejecting');
      return false;
    }

    // Parse Signature header into key=value pairs
    const params: Record<string, string> = {};
    for (const part of signatureHeader.split(',')) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const k = part.slice(0, eq).trim();
      const v = part.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
      params[k] = v;
    }

    const { keyId, headers: signedHeaders, signature } = params;
    if (!keyId || !signedHeaders || !signature) {
      console.warn('[inbox] Missing Signature params');
      return false;
    }

    // Fetch actor's public key
    const actorUrl = keyId.includes('#') ? keyId.split('#')[0] : keyId;
    const actorRes = await fetch(actorUrl, {
      headers: { 'Accept': 'application/activity+json' }
    });
    if (!actorRes.ok) {
      console.warn('[inbox] Could not fetch actor:', actorUrl);
      return false;
    }
    const actor = await actorRes.json() as any;
    const publicKeyPem: string = actor?.publicKey?.publicKeyPem;
    if (!publicKeyPem) {
      console.warn('[inbox] Actor has no publicKey.publicKeyPem');
      return false;
    }

    // Rebuild signing string from signed headers
    const url = new URL(req.url);
    const headerMap: Record<string, string> = {
      '(request-target)': `post ${url.pathname}`,
      'host': req.headers.get('host') || url.host,
      'date': req.headers.get('date') || '',
      'digest': req.headers.get('digest') || '',
      'content-type': req.headers.get('content-type') || '',
    };

    const signingString = signedHeaders
      .split(' ')
      .map(h => `${h}: ${headerMap[h] ?? req.headers.get(h) ?? ''}`)
      .join('\n');

    // Import public key
    const pemContents = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s/g, '');

    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    const publicKey = await crypto.subtle.importKey(
      'spki',
      binaryDer.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Verify signature
    const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    const encoder = new TextEncoder();
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      sigBytes,
      encoder.encode(signingString)
    );

    if (!valid) {
      console.warn('[inbox] Signature verification FAILED from:', keyId);
    } else {
      console.log('[inbox] Signature verified OK from:', keyId);
    }

    return valid;
  } catch (e) {
    console.error('[inbox] Signature verification error:', e);
    return false;
  }
}

// Handle Follow activity
async function handleFollow(db: D1Database, activity: any, instanceDomain: string, privateKey?: string) {
  const followerActor = activity.actor;
  const followerDomain = new URL(followerActor).hostname;

  console.log('Processing Follow from:', followerActor);

  // Fetch actor to get inbox URL
  let inboxUrl: string | null = null;
  let sharedInboxUrl: string | null = null;
  try {
    const actorResponse = await fetch(followerActor, {
      headers: { 'Accept': 'application/activity+json' }
    });
    if (actorResponse.ok) {
      const actor = await actorResponse.json() as any;
      inboxUrl = actor.inbox || null;
      sharedInboxUrl = actor.endpoints?.sharedInbox || actor.inbox || null;
    }
  } catch (e) {
    console.error('Failed to fetch follower actor:', e);
  }

  const existing = await db.prepare(`
    SELECT id FROM federated_instances WHERE instance_url = ?
  `).bind(followerActor).first();

  if (!existing) {
    await db.prepare(`
      INSERT INTO federated_instances 
      (id, instance_url, instance_name, shared_inbox, status, last_seen, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      followerActor,
      followerDomain,
      sharedInboxUrl,
      'active',
      new Date().toISOString(),
      new Date().toISOString()
    ).run();
  } else {
    await db.prepare(`
      UPDATE federated_instances 
      SET last_seen = ?, status = 'active', shared_inbox = ?
      WHERE instance_url = ?
    `).bind(new Date().toISOString(), sharedInboxUrl, followerActor).run();
  }

  // Send Accept activity back — now signed
  const acceptActivity = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Accept',
    id: `https://${instanceDomain}/federation/activities/${crypto.randomUUID()}`,
    actor: `https://${instanceDomain}/federation/actor`,
    object: activity
  };

  const keyId = `https://${instanceDomain}/federation/actor#main-key`;
  await deliverActivity(followerActor, acceptActivity, privateKey, keyId);
}

// Handle Unfollow (Undo Follow)
async function handleUnfollow(db: D1Database, activity: any) {
  const followerActor = activity.actor;

  console.log('Processing Unfollow from:', followerActor);

  await db.prepare(`
    UPDATE federated_instances 
    SET status = 'inactive'
    WHERE instance_url = ?
  `).bind(followerActor).run();

  console.log('Unfollowed:', followerActor);
}

// Handle Create activity (federated content)
async function handleCreate(db: D1Database, activity: any) {
  const object = activity.object;
  
  if (object.type !== 'Note' && object.type !== 'Question') {
    console.log('Ignoring non-Note/Question object');
    return;
  }

  console.log('Received federated content:', object.id);

  // Get or create instance
  const actorDomain = new URL(activity.actor).hostname;
  let instance = await db.prepare(`
    SELECT id FROM federated_instances WHERE instance_url LIKE ?
  `).bind(`%${actorDomain}%`).first();

  if (!instance) {
    const instanceId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO federated_instances (id, instance_url, instance_name, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(instanceId, `https://${actorDomain}`, actorDomain, 'active', new Date().toISOString()).run();
    instance = { id: instanceId };
  }

  // Store in federated_knowledge table
  await db.prepare(`
    INSERT INTO federated_knowledge 
    (id, instance_id, remote_id, content, title, author, source_url, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    instance.id,
    object.id,
    object.content,
    object.name || object.summary || null,
    activity.actor,
    object.url || object.id,
    new Date().toISOString()
  ).run();

  console.log('Imported federated knowledge from:', actorDomain);
}

// Deliver activity to remote inbox
async function deliverActivity(actorUrl: string, activity: any, privateKey?: string, keyId?: string) {
  try {
    const actorResponse = await fetch(actorUrl, {
      headers: { 'Accept': 'application/activity+json' }
    });

    if (!actorResponse.ok) {
      console.error('Failed to fetch actor:', actorUrl);
      return;
    }

    const actor = await actorResponse.json() as any;
    const inboxUrl = actor.endpoints?.sharedInbox || actor.inbox;

    if (!inboxUrl) {
      console.error('Actor has no inbox:', actorUrl);
      return;
    }

    if (privateKey && keyId) {
      const { signAndSend } = await import('./federation-sign.js');
      await signAndSend(privateKey, keyId, inboxUrl, activity);
    } else {
      // Unsigned fallback — used for Accept during Follow handling
      const response = await fetch(inboxUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/activity+json',
          'Accept': 'application/activity+json'
        },
        body: JSON.stringify(activity)
      });
      console.log(`[federation] Unsigned delivery to ${inboxUrl}: ${response.status}`);
    }
  } catch (error) {
    console.error('Error delivering activity:', error);
  }
}

export default inbox;