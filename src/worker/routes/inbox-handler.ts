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

    // TODO: Verify HTTP signature here
    // For now, we'll trust the activity (SECURITY RISK - fix in production)

    // Route based on activity type
    switch (activity.type) {
      case 'Follow':
        await handleFollow(c.env.DB, activity, instanceDomain);
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

// Handle Follow activity
async function handleFollow(db: D1Database, activity: any, instanceDomain: string) {
  const followerActor = activity.actor;
  const followerDomain = new URL(followerActor).hostname;

  console.log('Processing Follow from:', followerActor);

  // Check if already following
  const existing = await db.prepare(`
    SELECT id FROM federated_instances WHERE instance_url = ?
  `).bind(followerActor).first();

  if (!existing) {
    // Add new follower
    await db.prepare(`
      INSERT INTO federated_instances 
      (id, instance_url, instance_name, status, last_seen, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      followerActor,
      followerDomain,
      'active',
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    console.log('Added new follower:', followerDomain);
  } else {
    // Update last_seen
    await db.prepare(`
      UPDATE federated_instances 
      SET last_seen = ?, status = 'active'
      WHERE instance_url = ?
    `).bind(new Date().toISOString(), followerActor).run();

    console.log('Updated existing follower:', followerDomain);
  }

  // Send Accept activity back to the follower
  const acceptActivity = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Accept',
    id: `https://${instanceDomain}/federation/activities/${crypto.randomUUID()}`,
    actor: `https://${instanceDomain}/federation/actor`,
    object: activity
  };

  // Deliver Accept to follower's inbox
  await deliverActivity(followerActor, acceptActivity);
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
async function deliverActivity(actorUrl: string, activity: any) {
  try {
    // Fetch actor to get their inbox
    const actorResponse = await fetch(actorUrl, {
      headers: {
        'Accept': 'application/activity+json'
      }
    });

    if (!actorResponse.ok) {
      console.error('Failed to fetch actor:', actorUrl);
      return;
    }

    const actor = await actorResponse.json() as any;
    const inboxUrl = actor.inbox;

    if (!inboxUrl) {
      console.error('Actor has no inbox:', actorUrl);
      return;
    }

    // TODO: Sign the request with HTTP signatures
    // For now, send unsigned (many servers will accept it for Accept activities)
    const response = await fetch(inboxUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/activity+json',
        'Accept': 'application/activity+json'
      },
      body: JSON.stringify(activity)
    });

    if (response.ok) {
      console.log('Delivered activity to:', inboxUrl);
    } else {
      console.error('Failed to deliver activity:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Error delivering activity:', error);
  }
}

export default inbox;