#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// ── Config ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let apiKey = process.env.FOUNDATION_API_KEY || '';
let workerUrl = process.env.FOUNDATION_URL || 'https://chat-knowledge-api.fpl-test.workers.dev';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--api-key' && args[i + 1]) { apiKey = args[++i]; }
  else if (args[i] === '--url' && args[i + 1]) { workerUrl = args[++i]; }
  else if (args[i] === '--help') {
    console.log([
      'Foundation CLI Capture — imports Claude Code sessions into Foundation',
      '',
      'Usage:',
      '  node capture.cjs [options]',
      '  npm run capture -- [options]',
      '',
      'Options:',
      '  --api-key <key>   Foundation API key (or set FOUNDATION_API_KEY env var)',
      '  --url <url>       Foundation Worker URL (or set FOUNDATION_URL env var)',
      '  --help            Show this help',
      '',
      'Examples:',
      '  node capture.cjs --api-key Dans417',
      '  FOUNDATION_API_KEY=Dans417 node capture.cjs',
    ].join('\n'));
    process.exit(0);
  }
}

if (!apiKey) {
  console.error('Error: API key required. Use --api-key or set FOUNDATION_API_KEY env var.');
  console.error('Run with --help for usage.');
  process.exit(1);
}

// ── Paths ─────────────────────────────────────────────────────────────────────

function getClaudeProjectsDir() {
  const home = os.homedir();
  // Windows: C:\Users\<user>\.claude\projects
  // Unix: ~/.claude/projects
  return path.join(home, '.claude', 'projects');
}

// ── Session discovery ─────────────────────────────────────────────────────────

function findSessionFiles(projectsDir) {
  if (!fs.existsSync(projectsDir)) {
    console.log('No Claude Code sessions found (directory does not exist): ' + projectsDir);
    return [];
  }

  const files = [];

  // Walk all subdirectories
  const projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(projectsDir, d.name));

  for (const projectDir of projectDirs) {
    const entries = fs.readdirSync(projectDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const fullPath = path.join(projectDir, entry.name);
        const stat = fs.statSync(fullPath);
        files.push({ path: fullPath, mtime: stat.mtimeMs, projectDir });
      }
      // Also check sessions/ subdirectory
      if (entry.isDirectory() && entry.name === 'sessions') {
        const sessionsDir = path.join(projectDir, 'sessions');
        const sessionEntries = fs.readdirSync(sessionsDir, { withFileTypes: true });
        for (const se of sessionEntries) {
          if (se.isFile() && se.name.endsWith('.jsonl')) {
            const fullPath = path.join(sessionsDir, se.name);
            const stat = fs.statSync(fullPath);
            files.push({ path: fullPath, mtime: stat.mtimeMs, projectDir });
          }
        }
      }
    }
  }

  // Sort newest first
  files.sort((a, b) => b.mtime - a.mtime);
  return files;
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseSessionFile(filePath) {
  const sessionId = path.basename(filePath, '.jsonl');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());

  const messages = [];
  let title = null;
  let model = null;
  let cwd = null;
  let gitBranch = null;
  let messageIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    let record;
    try {
      record = JSON.parse(lines[i]);
    } catch (e) {
      console.warn('  Warning: skipping malformed line ' + (i + 1) + ' in ' + path.basename(filePath));
      continue;
    }

    // Skip non-message records
    if (record.type === 'file-history-snapshot') continue;
    if (record.type === 'system') continue;
    if (record.isMeta === true) continue;

    // Capture metadata from first records
    if (!cwd && record.cwd) cwd = record.cwd;
    if (!gitBranch && record.gitBranch) gitBranch = record.gitBranch;

    // Only process user and assistant message records
    if (record.type !== 'user' && record.type !== 'assistant') continue;
    if (!record.message) continue;

    const role = record.message.role;
    if (role !== 'user' && role !== 'assistant') continue;

    // Extract text content
    let textContent = '';
    const raw = record.message.content;

    if (typeof raw === 'string') {
      textContent = raw;
    } else if (Array.isArray(raw)) {
      // Skip messages that are purely tool feedback with no user text
      const allToolResults = raw.every(c => c.type === 'tool_result');
      if (allToolResults) continue;

      // Claude Code tool names that are file/system ops — not artifact outputs
      const FILE_OPS = new Set([
        'Read', 'Write', 'Edit', 'MultiEdit', 'Bash',
        'Glob', 'Grep', 'LS', 'NotebookRead', 'NotebookEdit',
        'WebSearch', 'WebFetch', 'TodoRead', 'TodoWrite',
      ]);

      const parts = [];
      for (const block of raw) {
        if (block.type === 'text' && block.text) {
          parts.push(block.text);
        } else if (block.type === 'tool_use' && block.input && !FILE_OPS.has(block.name)) {
          // Artifact tool_use — voice humanizer outputs, structured responses, etc.
          const artifactContent =
            (typeof block.input.content === 'string' ? block.input.content : null) ||
            (typeof block.input.text    === 'string' ? block.input.text    : null) ||
            (typeof block.input        === 'string'  ? block.input         : null);
          if (artifactContent) {
            const label = block.input.title || block.name || 'artifact';
            parts.push(`[${label}]\n${artifactContent}`);
          }
        }
        // thinking blocks and tool_result blocks inside mixed messages are intentionally skipped
      }
      textContent = parts.join('\n\n').trim();
    }

    if (!textContent) continue;

    // Capture model from assistant messages
    if (role === 'assistant' && record.message && record.message.model) {
      model = record.message.model;
    }

    // Derive title from first user message
    if (!title && role === 'user') {
      title = textContent.substring(0, 80).replace(/\n/g, ' ').trim();
    }

    messages.push({
      role,
      content: textContent,
      message_index: messageIndex++,
    });
  }

  if (!title) {
    title = sessionId.substring(0, 36);
  }

  return { sessionId, title, messages, model, metadata: { cwd, gitBranch, source: 'claude-code-cli' } };
}

// ── Import ────────────────────────────────────────────────────────────────────

async function importSession(parsed) {
  const url = workerUrl.replace(/\/$/, '') + '/api/import/cli';

  const body = JSON.stringify({
    sessionId: parsed.sessionId,
    title: parsed.title,
    messages: parsed.messages,
    model: parsed.model,
    metadata: parsed.metadata,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body,
  });

  if (res.status === 401) {
    throw new Error('Unauthorized — check your API key');
  }
  if (res.status === 409) {
    return { skipped: true };
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error('HTTP ' + res.status + ': ' + text);
  }

  const data = await res.json();
  return { skipped: false, chatId: data.chatId, messagesImported: data.messagesImported };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const projectsDir = getClaudeProjectsDir();
  console.log('Scanning: ' + projectsDir);

  const files = findSessionFiles(projectsDir);
  if (!files.length) {
    console.log('No session files found.');
    process.exit(0);
  }

  console.log('Found ' + files.length + ' session file' + (files.length !== 1 ? 's' : '') + '\n');

  let found = files.length;
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    let parsed;
    try {
      parsed = parseSessionFile(file.path);
    } catch (e) {
      console.error('Failed to parse: ' + path.basename(file.path) + ' — ' + e.message);
      failed++;
      continue;
    }

    if (!parsed.messages.length) {
      console.log('Skipped (empty): ' + parsed.title);
      skipped++;
      continue;
    }

    try {
      const result = await importSession(parsed);
      if (result.skipped) {
        console.log('Skipped (already imported): ' + parsed.title);
        skipped++;
      } else {
        console.log('Imported: ' + parsed.title + ' (' + result.messagesImported + ' messages)');
        imported++;
      }
    } catch (e) {
      console.error('Failed: ' + parsed.title + ' — ' + e.message);
      failed++;
      // If unauthorized, abort immediately
      if (e.message.includes('Unauthorized')) {
        console.error('\nAborting: fix your API key and try again.');
        process.exit(1);
      }
    }
  }

  console.log('\n─────────────────────────────────');
  console.log('Found: ' + found + ' | Imported: ' + imported + ' | Skipped: ' + skipped + ' | Failed: ' + failed);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
