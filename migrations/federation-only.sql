-- Federation tables only (without duplicates)
CREATE TABLE IF NOT EXISTS federated_instances (
    id TEXT PRIMARY KEY,
    instance_url TEXT NOT NULL UNIQUE,
    instance_name TEXT,
    admin_email TEXT,
    shared_inbox TEXT,
    public_key TEXT,
    status TEXT DEFAULT 'active',
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS federated_knowledge (
    id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL,
    knowledge_id TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instance_id) REFERENCES federated_instances(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS federation_activities (
    id TEXT PRIMARY KEY,
    activity_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    object_id TEXT,
    raw_activity TEXT NOT NULL,
    processed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_analytics (
    id TEXT PRIMARY KEY,
    chunk_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    source_instance TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner TEXT,
    visibility TEXT DEFAULT 'private',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collection_items (
    collection_id TEXT NOT NULL,
    chunk_id TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, chunk_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_federated_knowledge_instance ON federated_knowledge(instance_id);
CREATE INDEX IF NOT EXISTS idx_federation_activities_type ON federation_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_analytics_chunk ON knowledge_analytics(chunk_id);
CREATE INDEX IF NOT EXISTS idx_collections_owner ON collections(owner);
