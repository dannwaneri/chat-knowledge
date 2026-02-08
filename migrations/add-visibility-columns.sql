-- Add visibility and sharing columns to existing tables
ALTER TABLE chats ADD COLUMN visibility TEXT DEFAULT 'private';
ALTER TABLE chats ADD COLUMN category TEXT;

ALTER TABLE chunks ADD COLUMN visibility TEXT DEFAULT 'private';
ALTER TABLE chunks ADD COLUMN license TEXT;
ALTER TABLE chunks ADD COLUMN shared_at DATETIME;
