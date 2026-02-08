
-- Store security scan results
CREATE TABLE IF NOT EXISTS pre_share_scans (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    chat_id TEXT NOT NULL,
    scan_date DATETIME NOT NULL,
    safe INTEGER NOT NULL, -- 0 = issues found, 1 = safe
    report TEXT NOT NULL, -- JSON of full SanitizationReport
    redacted_content TEXT, -- JSON of auto-redacted messages
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE INDEX idx_pre_share_scans_chat ON pre_share_scans(chat_id, scan_date DESC);

-- Store manual redactions
CREATE TABLE IF NOT EXISTS chunk_redactions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    chunk_id TEXT NOT NULL,
    redacted_content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
);

CREATE INDEX idx_chunk_redactions_chunk ON chunk_redactions(chunk_id);

-- Track share approvals (audit log)
CREATE TABLE IF NOT EXISTS share_approvals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    chat_id TEXT NOT NULL,
    approved_by TEXT, -- Future: user ID
    scan_id TEXT,
    used_redacted BOOLEAN DEFAULT 0,
    visibility TEXT NOT NULL,
    license TEXT,
    approved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (scan_id) REFERENCES pre_share_scans(id)
);

CREATE INDEX idx_share_approvals_chat ON share_approvals(chat_id);
CREATE INDEX idx_share_approvals_date ON share_approvals(approved_at DESC);