import { Hono } from 'hono';
import { Env } from '../../types/index.js';

const evaluator = new Hono<{ Bindings: Env }>();

// Specificity scoring — runs at insertion time or on demand
// Three signals from the article:
// 1. Specificity — conditions included, not just conclusions
// 2. Usage — incremented when retrieved
// 3. Validation — promoted/flagged by human or evidence

function scoreSpecificity(content: string, context: string | null, type?: string): number {
  let score = 0.0;
  const text = content.toLowerCase();
  const ctx = (context || '').toLowerCase();

  // Base score for meaningful length
  if (content.length > 40) score += 0.15;
  if (content.length > 80) score += 0.10;
  if (content.length > 150) score += 0.05;

  // Concrete technical markers
  const hasNumbers = /\d+/.test(content);
  const hasThreshold = /\d+(\.\d+)?(%|ms|kb|mb|gb|token|call|request|second|minute)/i.test(content);
  const hasCode = /`[^`]+`|wrangler|npm|curl|SELECT|INSERT|WHERE|\.ts|\.js/i.test(content);

  if (hasNumbers) score += 0.10;
  if (hasThreshold) score += 0.15;
  if (hasCode) score += 0.15;

  // Named concepts, people, tools — specific nouns score higher than generic ones
  const hasNamedConcept = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/.test(content); // proper nouns
  const hasQuotedPhrase = /"[^"]{10,}"/.test(content); // direct quotes
  const hasCondition = /\b(when|if|because|after|before|only|unless|except|requires?|depends?)\b/i.test(content);
  const hasContrast = /\b(instead|rather than|not|avoid|unlike|vs|versus|over)\b/i.test(content);

  if (hasNamedConcept) score += 0.10;
  if (hasQuotedPhrase) score += 0.15;
  if (hasCondition) score += 0.10;
  if (hasContrast) score += 0.10;

  // Context quality
  if (context && context.length > 20) score += 0.05;
  if (context && /\b(because|since|due to|caused by|results in|prevents|fixes|means)\b/i.test(ctx)) score += 0.10;

  // Type-based baseline — commands and dead_ends are inherently specific
  if (type === 'command') score += 0.15;
  if (type === 'dead_end') score += 0.10;
  if (type === 'solution') score += 0.05;

  // Penalty for generic phrases
  const genericPhrases = [
    'what happened', 'why it matters', 'the conversation',
    'this is about', 'various topics', 'important to note',
    'the user is', 'the assistant'
  ];
  const isGeneric = genericPhrases.some(p => text.includes(p));
  if (isGeneric) score -= 0.3;

  return Math.max(0, Math.min(1, score));
}

// Score all insights for a chat
evaluator.post('/score/:chatId', async (c) => {
  const chatId = c.req.param('chatId');

  const { results: insights } = await c.env.DB.prepare(`
    SELECT id, type, content, context FROM insights WHERE chat_id = ?
  `).bind(chatId).all() as { results: any[] };

  if (!insights.length) {
    return c.json({ error: 'No insights found' }, 404);
  }

  let scored = 0;
  for (const insight of insights) {
    const score = scoreSpecificity(insight.content, insight.context, insight.type);
    await c.env.DB.prepare(`
      UPDATE insights SET score = ? WHERE id = ?
    `).bind(score, insight.id).run();
    scored++;
  }

  return c.json({ success: true, chatId, scored });
});

// Score all insights across entire knowledge base
evaluator.post('/score-all', async (c) => {
  const { results: insights } = await c.env.DB.prepare(`
    SELECT id, type, content, context FROM insights
  `).all() as { results: any[] };

  let scored = 0;
  for (const insight of insights) {
    const score = scoreSpecificity(insight.content, insight.context, insight.type);
    await c.env.DB.prepare(`
      UPDATE insights SET score = ? WHERE id = ?
    `).bind(score, insight.id).run();
    scored++;
  }

  return c.json({ success: true, scored });
});

// Promote an insight to semantic memory
evaluator.post('/promote/:insightId', async (c) => {
  const insightId = c.req.param('insightId');
  await c.env.DB.prepare(`
    UPDATE insights SET promoted = 1, flagged = 0 WHERE id = ?
  `).bind(insightId).run();
  return c.json({ success: true, insightId, promoted: true });
});

// Flag an insight for human review
evaluator.post('/flag/:insightId', async (c) => {
  const insightId = c.req.param('insightId');
  await c.env.DB.prepare(`
    UPDATE insights SET flagged = 1 WHERE id = ?
  `).bind(insightId).run();
  return c.json({ success: true, insightId, flagged: true });
});

// Increment usage count when an insight is retrieved
evaluator.post('/used/:insightId', async (c) => {
  const insightId = c.req.param('insightId');
  await c.env.DB.prepare(`
    UPDATE insights SET usage_count = usage_count + 1 WHERE id = ?
  `).bind(insightId).run();
  return c.json({ success: true });
});

// Get scored insights — sorted by score, filtered by promoted/flagged
evaluator.get('/review', async (c) => {
  const chatId = c.req.query('chatId');
  const minScore = parseFloat(c.req.query('minScore') || '0');
  const showFlagged = c.req.query('flagged') === 'true';

  let query = `
    SELECT i.id, i.chat_id, i.type, i.content, i.context,
           i.score, i.usage_count, i.promoted, i.flagged,
           ch.title as chat_title
    FROM insights i
    JOIN chats ch ON i.chat_id = ch.id
    WHERE i.score >= ?
  `;
  const params: any[] = [minScore];

  if (chatId) {
    query += ` AND i.chat_id = ?`;
    params.push(chatId);
  }

  if (showFlagged) {
    query += ` AND i.flagged = 1`;
  }

  query += ` ORDER BY i.score DESC, i.usage_count DESC LIMIT 100`;

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({ insights: results, total: results.length });
});

export { scoreSpecificity };
export default evaluator;