# The Foundation: Federated AI Knowledge Commons

> Save your best Claude conversations. Share them safely. Build together.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dannwaneri/chat-knowledge)

## The Problem

**15,000+ hours of developer insights are trapped in private AI chats.**

- Stack Overflow traffic down 78% since ChatGPT launched
- Best debugging solutions live in closed Claude conversations  
- No attribution, no discovery, no commons
- Knowledge collapse is happening in real-time

[Read the full analysis →](https://dev.to/the-foundation/i-built-federated-ai-knowledge-commons-heres-how-56oj)

## The Solution

**Federated knowledge sharing using ActivityPub.** Like Mastodon, but for developer knowledge.

Self-hosted • Privacy-first • Developer-owned

## Features

🔒 **Security Scanner** - Auto-detects API keys, Bearer tokens, private URLs before sharing  
🔍 **Semantic Search** - Find insights across all your chats using AI embeddings  
🌐 **ActivityPub Federation** - Connect with other developers' knowledge bases  
⚡ **HTML Import** - Save Claude chat (Ctrl+S), import automatically  
🎯 **Safe by Default** - Nothing goes public without security review  
💰 **Edge-Native** - Self-hosted on Cloudflare Workers

## Live Demo

Production instance: https://chat-knowledge-api.fpl-test.workers.dev

**Test Results:**
- ✅ Imported 4.6MB chat file (136 messages → 91 chunks)
- ✅ Security scan detected 599 issues (3 critical secrets caught)
- ✅ Semantic search: 0.78 relevance score
- ✅ ActivityPub endpoints responding

## Quick Start

### Prerequisites
- Node.js 18+
- Cloudflare account (free tier works)
- Wrangler CLI installed

### Installation
```bash
# Clone the repo
git clone https://github.com/dannwaneri/chat-knowledge.git
cd chat-knowledge

# Install dependencies
npm install

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create chat-knowledge-db

# Run migrations
wrangler d1 execute chat-knowledge-db --remote --file=migrations/migration-federation.sql
wrangler d1 execute chat-knowledge-db --remote --file=migrations/migration-sanitizer.sql

# Create Vectorize index
wrangler vectorize create chat-knowledge-embeddings --dimensions=768 --metric=cosine

# Copy wrangler.toml.example to wrangler.toml and update with your IDs

# Deploy
npm run deploy
```

### Import Your First Chat
```bash
# Save Claude chat as HTML (Ctrl+S in browser)
# Import it:
npm run build
node dist/cli/import-html.js path/to/chat.html "My First Import"

# Search it:
curl -X POST https://your-worker.workers.dev/search \
  -H "Content-Type: application/json" \
  -d '{"query": "how to debug Vectorize", "maxResults": 5}'
```

## Architecture

**Stack:**
- **Edge Runtime**: Cloudflare Workers
- **Database**: D1 (SQLite at the edge)
- **Vector Store**: Vectorize (768-dim embeddings)
- **AI Model**: Workers AI (bge-base-en-v1.5)
- **Federation**: ActivityPub protocol

**Flow:**
```
HTML Import → Parse → Chunk → Generate Embeddings → Store (D1 + Vectorize)
                    ↓
              Security Scan → Flag Risks → Manual Review → Approve
                    ↓
              Share Publicly → ActivityPub → Federate
```

## Why This Matters

**It solves knowledge collapse:**
- ✅ Insights stay discoverable (semantic search)
- ✅ Attribution preserved (source tracking)
- ✅ Privacy respected (security scanner)
- ✅ No platform risk (self-hosted)

**It's truly decentralized:**
- ActivityPub = proven federation (powers Mastodon's 10M+ users)
- Developer-owned instances
- No corporate overlord
- No "rug pull" risk

**It's viable at scale:**
- Edge-native architecture built on Cloudflare Workers
- D1 for persistent storage, Vectorize for semantic search
- Production-tested with real developer conversations

## Roadmap

**Immediate:**
- [x] HTML import workflow
- [x] Security scanner
- [x] Semantic search
- [x] ActivityPub endpoints
- [x] Production deployment

**Next Month:**
- [ ] MCP server integration (natural language commands in Claude Code)
- [ ] Batch import (process 50+ historical chats)
- [ ] First federation test (connect with another instance)
- [ ] Collections feature (curate knowledge by topic)

**3-6 Months:**
- [ ] 10+ federated instances
- [ ] Cross-instance search
- [ ] Analytics dashboard
- [ ] Browser extension

## Contributing

This is infrastructure for the developer commons. Contributions welcome!

**Ways to help:**
- 🐛 Report bugs via Issues
- 💡 Suggest features
- 🔧 Submit PRs (see CONTRIBUTING.md)
- 📝 Improve documentation
- 🌐 Run your own instance and federate

## License

MIT License - see LICENSE file

## Related Articles

1. [My Chrome Tabs Tell a Story](https://dev.to/dannwaneri/chrome-tabs-story) - The observation
2. [We're Creating a Knowledge Collapse](https://dev.to/dannwaneri/knowledge-collapse) - The problem  
3. [I Shipped the Solution to Knowledge Collapse in 21 Days](https://dev.to/the-foundation/i-built-federated-ai-knowledge-commons-heres-how-56oj) - The solution (you're here)

## Author

Built by [Daniel Nwaneri](https://github.com/dannwaneri)  
Specialist in Cloudflare Workers, AI integration, and edge computing

---

**The knowledge commons doesn't rebuild itself. But we can build it together.**

Star ⭐ this repo if you believe in preserving developer knowledge!