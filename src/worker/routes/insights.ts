import { Hono } from 'hono';
import { Env } from '../../types/index.js';
import { scoreSpecificity } from './evaluator.js';

const insights = new Hono<{ Bindings: Env }>();

const PAGE_SIZE = 50;
const PAGES_PER_PASS = 2; // 100 messages per pass

interface InsightItem {
  content: string;
  context?: string;
}

interface InsightPayload {
  decisions?: InsightItem[];
  solutions?: InsightItem[];
  commands?: InsightItem[];
  patterns?: InsightItem[];
  dead_ends?: InsightItem[];
  relationships?: InsightItem[];
  commitments?: InsightItem[];
  context?: InsightItem[];
}

const INSIGHT_TYPES = [
  'decisions',
  'solutions',
  'commands',
  'patterns',
  'dead_ends',
  'relationships',
  'commitments',
  'context',
] as const;

const typeMap: Record<string, string> = {
  decisions: 'decision',
  solutions: 'solution',
  commands: 'command',
  patterns: 'pattern',
  dead_ends: 'dead_end',
  relationships: 'relationship',
  commitments: 'commitment',
  context: 'context',
};

// Phrases that indicate the model hallucinated template content instead of real insights
const PLACEHOLDER_PATTERNS = [
  /^what happened/i,
  /^why it matters/i,
  /^the conversation (is about|discuss|covers|shows)/i,
  /^patterns of behavior/i,
  /^decisions (made|about) how/i,
  /^solutions? to the problem/i,
  /^background (or situational|info)/i,
  /^(user|assistant) is (interacting|discussing|working)/i,
  /^no \w+ found/i,
  /^(example|sample|placeholder)/i,
];

function isPlaceholder(content: string): boolean {
  if (!content || content.trim().length < 15) return true;
  return PLACEHOLDER_PATTERNS.some(p => p.test(content.trim()));
}

async function fetchPagedMessages(
  db: any,
  chatId: string,
  totalMessages: number,
  pass: number = 0
): Promise<string> {
  const totalPages = Math.ceil(totalMessages / PAGE_SIZE);

  if (totalMessages <= PAGE_SIZE * PAGES_PER_PASS) {
    const { results } = await db.prepare(`
      SELECT role, content, message_index
      FROM messages
      WHERE chat_id = ?
      ORDER BY message_index ASC
    `).bind(chatId).all();
    return results
      .map((m: any) => `[${m.role.toUpperCase()}]: ${(m.content as string).substring(0, 400)}`)
      .join('\n\n');
  }

  const startPage = pass * PAGES_PER_PASS;
  const endPage = Math.min(startPage + PAGES_PER_PASS, totalPages);
  if (startPage >= totalPages) return '';

  const allMessages: any[] = [];
  for (let page = startPage; page < endPage; page++) {
    const { results } = await db.prepare(`
      SELECT role, content, message_index
      FROM messages
      WHERE chat_id = ?
      ORDER BY message_index ASC
      LIMIT ? OFFSET ?
    `).bind(chatId, PAGE_SIZE, page * PAGE_SIZE).all();
    allMessages.push(...results);
  }

  return allMessages
    .map((m: any) => `[${m.role.toUpperCase()}]: ${(m.content as string).substring(0, 400)}`)
    .join('\n\n');
}

function tryParsePayload(obj: any): InsightPayload | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const hasKnownKey = INSIGHT_TYPES.some(t => t in obj);
  return hasKnownKey ? (obj as InsightPayload) : null;
}

function parseInsightResponse(responseText: string): InsightPayload | null {
  let raw = responseText.trim();
  raw = raw.replace(/```json|```/g, '').trim();

  // Attempt 1: parse the whole thing
  try {
    const parsed = JSON.parse(raw);

    // Direct payload object
    const direct = tryParsePayload(parsed);
    if (direct) return direct;

    // {"response": <object>} wrapper
    if (parsed?.response && typeof parsed.response === 'object') {
      const wrapped = tryParsePayload(parsed.response);
      if (wrapped) return wrapped;
    }

    // {"response": "<json string>"} — Workers AI sometimes double-encodes
    if (parsed?.response && typeof parsed.response === 'string') {
      try {
        const inner = JSON.parse(parsed.response.replace(/```json|```/g, '').trim());
        const innerPayload = tryParsePayload(inner);
        if (innerPayload) return innerPayload;
      } catch (_) {}
    }
  } catch (_) {}

  // Attempt 2: extract first {...} block from messy response
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const extracted = JSON.parse(match[0]);
      const payload = tryParsePayload(extracted);
      if (payload) return payload;
    } catch (_) {}
  }

  return null;
}

async function extractInsightsFromConversation(
  ai: any,
  chatTitle: string,
  conversation: string,
): Promise<{ type: string; content: string; context: string }[]> {
  const SYSTEM_PROMPT = `You are a precise knowledge extractor. You return ONLY valid JSON — no markdown, no explanation, no preamble.

STRICT RULES:
1. Every item must contain SPECIFIC information extracted directly from the conversation text
2. NEVER use generic phrases like "what happened", "why it matters", "the conversation is about", "decisions about how", "patterns of behavior", "no X found"
3. NEVER copy category descriptions or the example format into your response content
4. content must be a concrete fact, decision, command, or observation — not a meta-description
5. context must explain the specific circumstances — not restate the category definition
6. If you cannot find real examples of a category in the conversation, use an empty array []
7. Return ONLY the JSON object, nothing else`;

  const USER_PROMPT = `Extract insights from this conversation titled "${chatTitle}".

Return a JSON object with these keys. Each key maps to an array of {"content": "...", "context": "..."} objects (up to 3 per category):

{
  "decisions": [],
  "solutions": [],
  "commands": [],
  "patterns": [],
  "dead_ends": [],
  "relationships": [],
  "commitments": [],
  "context": []
}

BAD example (do not do this):
{"content": "decisions made and why", "context": "why it matters"}

GOOD example:
{"content": "chose Cloudflare Workers over AWS Lambda for zero cold starts", "context": "FPL Hub needs <300ms response time for 500K daily API calls"}

Conversation:
${conversation}`;

  let responseText = '';

  // Kimi K2.5 on Workers AI — frontier quality, no external API cost
  const result = await ai.run('@cf/moonshotai/kimi-k2.5', {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT },
    ],
    max_tokens: 8192,
  } as any) as any;

  responseText = result?.choices?.[0]?.message?.content
    || result?.choices?.[0]?.message?.reasoning
    || (typeof result.response === 'string' ? result.response : '')
    || result?.result?.response
    || '';

  const payload = parseInsightResponse(responseText);
  if (!payload) return [];

  const extracted: { type: string; content: string; context: string }[] = [];

  for (const key of INSIGHT_TYPES) {
    const items = payload[key];
    if (!Array.isArray(items)) continue;
    const typeName = typeMap[key];

    for (const item of items) {
      if (!item.content || isPlaceholder(item.content)) continue;
      if (item.context && isPlaceholder(item.context)) item.context = '';
      extracted.push({
        type: typeName,
        content: item.content,
        context: item.context || '',
      });
    }
  }

  return extracted;
}

insights.post('/extract/:chatId', async (c) => {
  const chatId = c.req.param('chatId');

  const chat = await c.env.DB.prepare(`
    SELECT id, title FROM chats WHERE id = ?
  `).bind(chatId).first() as any;

  if (!chat) return c.json({ error: 'Chat not found' }, 404);

  const existing = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM insights WHERE chat_id = ?
  `).bind(chatId).first() as { count: number };

  const forceReextract = c.req.query('force') === 'true';

  if (existing.count > 0 && !forceReextract) {
    return c.json({ message: 'Insights already extracted', count: existing.count });
  }

  const countResult = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM messages WHERE chat_id = ?
  `).bind(chatId).first() as { count: number };

  if (!countResult.count) {
    return c.json({ error: 'No messages found' }, 404);
  }

  const totalPages = Math.ceil(countResult.count / PAGE_SIZE);
  const totalPasses = Math.ceil(totalPages / PAGES_PER_PASS);
  const passesToRun = Math.min(totalPasses, 4); // max 4 passes = 1200 messages

  const allExtracted: { type: string; content: string; context: string }[] = [];

  for (let pass = 0; pass < passesToRun; pass++) {
    const conversation = await fetchPagedMessages(c.env.DB, chatId, countResult.count, pass);
    if (!conversation) break;

    const passInsights = await extractInsightsFromConversation(c.env.AI, chat.title, conversation);
    allExtracted.push(...passInsights);
  }

  // Count guard: always block if extraction returned 0 (parsing failure)
  // For force=true, proceed even if count is lower — user explicitly requested re-extraction
  if (existing.count > 0) {
    if (allExtracted.length === 0) {
      return c.json({
        success: false,
        message: `Extraction returned 0 insights — likely a parsing failure. Existing ${existing.count} insights preserved.`,
        newCount: 0,
        existingCount: existing.count,
      });
    }
    // Delete existing before inserting new set
    await c.env.DB.prepare(`DELETE FROM insights WHERE chat_id = ?`).bind(chatId).run();
  }

  // Insert all extracted insights with specificity scores
  let totalInserted = 0;
  for (const item of allExtracted) {
    if (!item.content || !item.type) continue;
    const score = scoreSpecificity(item.content, item.context || null, item.type);
    const id = `${chatId}-insight-${item.type}-${totalInserted}`;
    await c.env.DB.prepare(`
      INSERT INTO insights (id, chat_id, type, content, context, score)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, chatId, item.type, item.content, item.context || null, score).run();
    totalInserted++;
  }

  return c.json({
    success: true,
    chatId,
    insightsExtracted: totalInserted,
    messagesRead: countResult.count,
    passesRun: passesToRun,
  });
});

insights.get('/:chatId', async (c) => {
  const chatId = c.req.param('chatId');

  // Optional minScore filter
  const minScoreParam = c.req.query('minScore');
  let minScore: number | null = null;

  if (minScoreParam !== undefined) {
    const parsed = parseFloat(minScoreParam);
    if (isNaN(parsed)) {
      return c.json({ error: 'minScore must be a valid number between 0.0 and 1.0' }, 400);
    }
    minScore = parsed;
  }

  const query = minScore !== null
    ? `SELECT id, type, content, context, score, usage_count, promoted, flagged, created_at
       FROM insights
       WHERE chat_id = ?
         AND length(content) > 20
         AND content NOT LIKE 'No % found%'
         AND score >= ?
       ORDER BY score DESC, type ASC`
    : `SELECT id, type, content, context, score, usage_count, promoted, flagged, created_at
       FROM insights
       WHERE chat_id = ?
         AND length(content) > 20
         AND content NOT LIKE 'No % found%'
       ORDER BY score DESC, type ASC`;

  const { results } = minScore !== null
    ? await c.env.DB.prepare(query).bind(chatId, minScore).all()
    : await c.env.DB.prepare(query).bind(chatId).all();

  const grouped = results.reduce((acc: any, insight: any) => {
    if (!acc[insight.type]) acc[insight.type] = [];
    acc[insight.type].push(insight);
    return acc;
  }, {});

  // Increment usage_count for all retrieved insights
  if (results.length > 0) {
    const updateQuery = minScore !== null
      ? `UPDATE insights SET usage_count = usage_count + 1
         WHERE chat_id = ? AND length(content) > 20
         AND content NOT LIKE 'No % found%' AND score >= ?`
      : `UPDATE insights SET usage_count = usage_count + 1
         WHERE chat_id = ? AND length(content) > 20
         AND content NOT LIKE 'No % found%'`;

    minScore !== null
      ? await c.env.DB.prepare(updateQuery).bind(chatId, minScore).run()
      : await c.env.DB.prepare(updateQuery).bind(chatId).run();
  }

  return c.json({ chatId, insights: grouped, total: results.length });
});

insights.post('/extract-from-summary/:chatId', async (c) => {
  const chatId = c.req.param('chatId');

  const chat = await c.env.DB.prepare(`
    SELECT id, title, summary FROM chats WHERE id = ?
  `).bind(chatId).first() as any;

  if (!chat) return c.json({ error: 'Chat not found' }, 404);
  if (!chat.summary) return c.json({ error: 'No summary available for this chat' }, 400);

  const forceReextract = c.req.query('force') === 'true';

  const existing = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM insights WHERE chat_id = ? AND source = 'summary'
  `).bind(chatId).first() as { count: number };

  if (existing.count > 0 && !forceReextract) {
    return c.json({ message: 'Summary insights already extracted', count: existing.count });
  }

  const passInsights = await extractInsightsFromConversation(c.env.AI, chat.title, chat.summary);

  if (!passInsights.length) {
    return c.json({ error: 'No insights extracted', source: 'summary' }, 500);
  }

  await c.env.DB.prepare(`
    DELETE FROM insights WHERE chat_id = ? AND source = 'summary'
  `).bind(chatId).run();

  let totalInserted = 0;
  for (const item of passInsights) {
    if (!item.content || !item.type) continue;
    const score = scoreSpecificity(item.content, item.context || null, item.type);
    const id = `${chatId}-summary-${item.type}-${totalInserted}`;
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO insights (id, chat_id, type, content, context, score, source)
      VALUES (?, ?, ?, ?, ?, ?, 'summary')
    `).bind(id, chatId, item.type, item.content, item.context || null, score).run();
    totalInserted++;
  }

  return c.json({
    success: true,
    chatId,
    insightsExtracted: totalInserted,
    model: 'kimi-k2.5',
    source: 'summary',
  });
});





insights.post('/extract/:chatId/page', async (c) => {
  const chatId = c.req.param('chatId');
  const passParam = c.req.query('pass');
  const force = c.req.query('force') === 'true';

  // Validate pass param
  const pass = parseInt(passParam || '0', 10);
  if (isNaN(pass) || pass < 0 || String(pass) !== passParam && passParam !== undefined) {
    return c.json({ error: 'pass must be a non-negative integer' }, 400);
  }

  const chat = await c.env.DB.prepare(
    'SELECT id, title FROM chats WHERE id = ?'
  ).bind(chatId).first() as any;
  if (!chat) return c.json({ error: 'Chat not found' }, 404);

  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM messages WHERE chat_id = ?'
  ).bind(chatId).first() as { count: number };

  if (!countResult.count) {
    return c.json({ error: 'No messages found' }, 404);
  }

  const totalPages = Math.ceil(countResult.count / PAGE_SIZE);
  const totalPasses = Math.ceil(totalPages / PAGES_PER_PASS);

  // Pass beyond range — nothing to do
  if (pass >= totalPasses) {
    return c.json({ done: true, totalPasses });
  }

  // Pass 0 + force=true — clear existing insights before starting
  if (pass === 0 && force) {
    await c.env.DB.prepare(
      'DELETE FROM insights WHERE chat_id = ?'
    ).bind(chatId).run();
  }

  // Extract this pass
  const conversation = await fetchPagedMessages(c.env.DB, chatId, countResult.count, pass);
  if (!conversation) {
    return c.json({ done: true, totalPasses });
  }

  const passInsights = await extractInsightsFromConversation(c.env.AI, chat.title, conversation);

  // Query live count AFTER potential delete, BEFORE inserting — collision-safe ID offset
  const existingCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM insights WHERE chat_id = ?'
  ).bind(chatId).first() as { count: number };
  const idOffset = existingCount.count;

  let inserted = 0;
  for (const item of passInsights) {
    if (!item.content || !item.type) continue;
    const score = scoreSpecificity(item.content, item.context || null, item.type);
    const id = `${chatId}-insight-${item.type}-${idOffset + inserted}`;
    await c.env.DB.prepare(`
  INSERT OR REPLACE INTO insights (id, chat_id, type, content, context, score)
  VALUES (?, ?, ?, ?, ?, ?)
`).bind(id, chatId, item.type, item.content, item.context || null, score).run();
    inserted++;
  }

  const done = pass >= totalPasses - 1;

  return c.json({
    success: true,
    pass,
    totalPasses,
    done,
    insightsThisPass: inserted,
    messagesRead: Math.min(PAGE_SIZE * PAGES_PER_PASS, countResult.count - pass * PAGE_SIZE * PAGES_PER_PASS),
  });
});

export default insights;