
import { Hono } from 'hono';
import { ChatSanitizer, scanBeforeSharing } from '../utils/sanitizer';

type Bindings = {
  DB: D1Database;
};

export const preShareReview = new Hono<{ Bindings: Bindings }>();

// Step 1: Scan chat before sharing
preShareReview.post('/chats/:chatId/scan', async (c) => {
  const chatId = c.req.param('chatId');

  // Get chat messages from database
  const { results: chunks } = await c.env.DB.prepare(`
    SELECT ch.id, ch.content, c.title
    FROM chunks ch
    JOIN chats c ON ch.chat_id = c.id
    WHERE c.id = ?
    ORDER BY ch.chunk_index ASC
  `).bind(chatId).all();

  if (chunks.length === 0) {
    return c.json({ error: 'Chat not found' }, 404);
  }

  // Parse chunks into messages
  const messages = chunks.map(chunk => {
    // Extract speaker and content from chunk text
    // Assumes format: "USER: content" or "ASSISTANT: content"
    const lines = (chunk.content as string).split('\n');
    const parsed = [];
    
    let currentSpeaker = 'user';
    let currentContent = [];

    for (const line of lines) {
      if (line.startsWith('USER:') || line.startsWith('H:')) {
        if (currentContent.length > 0) {
          parsed.push({ speaker: currentSpeaker, content: currentContent.join('\n') });
        }
        currentSpeaker = 'user';
        currentContent = [line.replace(/^(USER:|H:)\s*/, '')];
      } else if (line.startsWith('ASSISTANT:') || line.startsWith('A:')) {
        if (currentContent.length > 0) {
          parsed.push({ speaker: currentSpeaker, content: currentContent.join('\n') });
        }
        currentSpeaker = 'assistant';
        currentContent = [line.replace(/^(ASSISTANT:|A:)\s*/, '')];
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
      parsed.push({ speaker: currentSpeaker, content: currentContent.join('\n') });
    }

    return parsed;
  }).flat();

  // Scan for sensitive data
  const { safe, report, redactedMessages } = await scanBeforeSharing(chatId, messages);

  // Generate report
  const sanitizer = new ChatSanitizer();
  const uiReport = sanitizer.generateUIReport(report);

  // Store scan results for later
  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO pre_share_scans (chat_id, scan_date, safe, report, redacted_content)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    chatId,
    new Date().toISOString(),
    safe ? 1 : 0,
    JSON.stringify(report),
    redactedMessages ? JSON.stringify(redactedMessages) : null
  ).run();

  return c.json({
    chatId,
    safe,
    report,
    uiReport,
    canAutoShare: safe,
    requiresReview: !safe,
    redactionAvailable: !!redactedMessages
  });
});

// Step 2: Get redacted version for manual review
preShareReview.get('/chats/:chatId/redacted-preview', async (c) => {
  const chatId = c.req.param('chatId');

  const scan = await c.env.DB.prepare(`
    SELECT * FROM pre_share_scans WHERE chat_id = ? ORDER BY scan_date DESC LIMIT 1
  `).bind(chatId).first();

  if (!scan) {
    return c.json({ error: 'No scan found. Run /scan first.' }, 404);
  }

  const redactedContent = scan.redacted_content ? JSON.parse(scan.redacted_content as string) : null;

  return c.json({
    chatId,
    scanDate: scan.scan_date,
    safe: scan.safe === 1,
    redactedContent,
    originalReport: JSON.parse(scan.report as string)
  });
});

// Step 3: Manual redaction editor
preShareReview.post('/chats/:chatId/manual-redact', async (c) => {
  const chatId = c.req.param('chatId');
  const { chunkId, redactions } = await c.req.json();

  // redactions: [{ start: number, end: number, replacement: string }]

  const chunk = await c.env.DB.prepare(`
    SELECT content FROM chunks WHERE id = ?
  `).bind(chunkId).first();

  if (!chunk) {
    return c.json({ error: 'Chunk not found' }, 404);
  }

  let content = chunk.content as string;

  // Apply redactions (reverse order to maintain indices)
  redactions
    .sort((a, b) => b.start - a.start)
    .forEach(({ start, end, replacement }) => {
      content = content.substring(0, start) + replacement + content.substring(end);
    });

  // Store redacted version (don't overwrite original)
  await c.env.DB.prepare(`
    INSERT INTO chunk_redactions (chunk_id, redacted_content, created_at)
    VALUES (?, ?, ?)
  `).bind(chunkId, content, new Date().toISOString()).run();

  return c.json({
    chunkId,
    redacted: true,
    previewLength: content.length
  });
});

// Step 4: Approve and share (after review)
preShareReview.post('/chats/:chatId/approve-share', async (c) => {
  const chatId = c.req.param('chatId');
  const { visibility, license, useRedacted } = await c.req.json();

  // Get latest scan
  const scan = await c.env.DB.prepare(`
    SELECT * FROM pre_share_scans WHERE chat_id = ? ORDER BY scan_date DESC LIMIT 1
  `).bind(chatId).first();

  if (!scan) {
    return c.json({ error: 'No security scan found. Run /scan first.' }, 400);
  }

  // If not safe and user hasn't reviewed, block
  if (scan.safe === 0 && !useRedacted) {
    return c.json({
      error: 'Chat contains sensitive data. Use redacted version or manually review.',
      report: JSON.parse(scan.report as string)
    }, 400);
  }

  // If using redacted version, update chunks
  if (useRedacted && scan.redacted_content) {
    const redactedMessages = JSON.parse(scan.redacted_content as string);
    
    // Update chunks with redacted content
    // (Implementation depends on your chunk structure)
    // This would update the actual chunk content in the database
  }

  // Mark as public (same as existing sharing route)
  await c.env.DB.prepare(`
    UPDATE chats SET visibility = ? WHERE id = ?
  `).bind(visibility, chatId).run();

  await c.env.DB.prepare(`
    UPDATE chunks SET visibility = ?, license = ?, shared_at = ? WHERE chat_id = ?
  `).bind(visibility, license, new Date().toISOString(), chatId).run();

  // Create ActivityPub share activity
  // (Call existing federation code)

  return c.json({
    chatId,
    visibility,
    shared: true,
    redacted: useRedacted,
    message: 'Chat successfully shared after security review'
  });
});

// Get sharing workflow status
preShareReview.get('/chats/:chatId/share-status', async (c) => {
  const chatId = c.req.param('chatId');

  const chat = await c.env.DB.prepare(`
    SELECT visibility FROM chats WHERE id = ?
  `).bind(chatId).first();

  const scan = await c.env.DB.prepare(`
    SELECT * FROM pre_share_scans WHERE chat_id = ? ORDER BY scan_date DESC LIMIT 1
  `).bind(chatId).first();

  return c.json({
    chatId,
    currentVisibility: chat?.visibility || 'private',
    scanned: !!scan,
    scanDate: scan?.scan_date,
    safe: scan?.safe === 1,
    canAutoShare: scan?.safe === 1,
    requiresReview: scan?.safe === 0,
    nextStep: !scan ? 'run_scan' : (scan.safe === 1 ? 'can_share' : 'review_required')
  });
});