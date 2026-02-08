-- Chats table (metadata about each imported chat)
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  source_file TEXT,
  metadata TEXT,
  message_count INTEGER DEFAULT 0
);

-- Chunks table (the actual searchable content)
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  metadata TEXT,
  vector_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chunks_chat_id ON chunks(chat_id);
CREATE INDEX IF NOT EXISTS idx_chunks_vector_id ON chunks(vector_id);
CREATE INDEX IF NOT EXISTS idx_chats_imported_at ON chats(imported_at);