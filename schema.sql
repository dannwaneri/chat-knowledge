-- ============================================
-- THE FOUNDATION - Clean Schema
-- Apply this AFTER nuke.sql
-- ============================================

-- Core: conversation metadata
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,                          -- Claude auto-generates this
  source TEXT DEFAULT 'extension',       -- 'extension' | future sources
  visibility TEXT DEFAULT 'private',     -- 'private' | 'public'
  message_count INTEGER DEFAULT 0,
  created_at TEXT,                       -- when conversation happened in Claude
  imported_at TEXT NOT NULL              -- when captured by extension
);

CREATE INDEX IF NOT EXISTS idx_chats_imported_at ON chats(imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_visibility ON chats(visibility);

-- ============================================

-- Core: actual conversation turns (THE MISSING TABLE)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,                   -- UUID from Claude's API
  chat_id TEXT NOT NULL,
  role TEXT NOT NULL,                    -- 'user' | 'assistant'
  content TEXT NOT NULL,                 -- full message text as markdown
  message_index INTEGER NOT NULL,        -- preserves conversation order
  created_at TEXT,                       -- timestamp from Claude's API
  truncated INTEGER DEFAULT 0,           -- 0 = complete, 1 = truncated
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_order ON messages(chat_id, message_index);

-- ============================================

-- Search: index derived from messages
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  message_id TEXT,                       -- links back to source message
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,                         -- JSON: type, language, etc
  vector_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chunks_chat_id ON chunks(chat_id);
CREATE INDEX IF NOT EXISTS idx_chunks_message_id ON chunks(message_id);
CREATE INDEX IF NOT EXISTS idx_chunks_vector_id ON chunks(vector_id);

-- ============================================

-- Federation: other Foundation instances
CREATE TABLE IF NOT EXISTS federated_instances (
  id TEXT PRIMARY KEY,
  instance_url TEXT NOT NULL UNIQUE,
  instance_name TEXT,
  admin_email TEXT,
  shared_inbox TEXT,
  public_key TEXT,
  status TEXT DEFAULT 'active',          -- 'active' | 'pending' | 'blocked'
  last_seen TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_federated_instances_status ON federated_instances(status);

-- ============================================

-- Federation: knowledge pulled from other instances
CREATE TABLE IF NOT EXISTS federated_knowledge (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  remote_id TEXT NOT NULL,               -- ID on the remote instance
  title TEXT,
  content TEXT NOT NULL,
  author TEXT,                           -- @username@instance.domain
  source_url TEXT,                       -- link back to original
  imported_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (instance_id) REFERENCES federated_instances(id) ON DELETE CASCADE,
  UNIQUE(instance_id, remote_id)
);

CREATE INDEX IF NOT EXISTS idx_federated_knowledge_instance ON federated_knowledge(instance_id);

-- ============================================

-- Federation: ActivityPub inbox/outbox log
CREATE TABLE IF NOT EXISTS federation_activities (
  id TEXT PRIMARY KEY,
  activity_type TEXT NOT NULL,           -- 'Create' | 'Update' | 'Delete' | 'Announce'
  actor TEXT NOT NULL,
  object_id TEXT,
  object_type TEXT,                      -- 'chunk' | 'chat'
  status TEXT DEFAULT 'pending',         -- 'pending' | 'sent' | 'received' | 'failed'
  raw_activity TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_federation_activities_status ON federation_activities(status);

-- ============================================

-- Security: scan results before publishing
CREATE TABLE IF NOT EXISTS pre_share_scans (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  chat_id TEXT NOT NULL,
  scan_date TEXT NOT NULL,
  safe INTEGER NOT NULL,                 -- 1 = safe, 0 = issues found
  report TEXT NOT NULL,                  -- JSON of full scan report
  redacted_content TEXT,                 -- JSON of auto-redacted content
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pre_share_scans_chat ON pre_share_scans(chat_id);

-- ============================================

-- Security: audit log of publish decisions
CREATE TABLE IF NOT EXISTS share_approvals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  chat_id TEXT NOT NULL,
  scan_id TEXT,
  visibility TEXT NOT NULL,
  license TEXT,
  approved_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (scan_id) REFERENCES pre_share_scans(id)
);

CREATE INDEX IF NOT EXISTS idx_share_approvals_chat ON share_approvals(chat_id);

-- ============================================

-- Security: specific content redacted within public chats
CREATE TABLE IF NOT EXISTS chunk_redactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  chunk_id TEXT NOT NULL,
  redacted_content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chunk_redactions_chunk ON chunk_redactions(chunk_id);