# The Foundation: Federated AI Knowledge Commons

> Capture your Claude conversations. Search them semantically. Share them safely via ActivityPub.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dannwaneri/chat-knowledge)

## The Problem

**Knowledge collapse is happening in real-time.**

- Stack Overflow traffic down 78% since ChatGPT launched
- Best debugging solutions live in private AI chats  
- No attribution, no discovery, no commons
- AI trains on AI-generated content with no human verification

## The Solution

**Federated knowledge sharing using ActivityPub.** Like Mastodon, but for developer knowledge.

Self-hosted • Privacy-first • Developer-owned

## Features

🔍 **Semantic Search** - Find insights across conversations using AI embeddings  
🎯 **Passage-Level Precision** - Click a result, land on the exact message  
🌐 **ActivityPub Federation** - Discoverable on Mastodon, ready to federate  
⚡ **Browser Extension** - Auto-captures via Claude's internal API  
💰 **Edge-Native** - Self-hosted on Cloudflare Workers (free tier works)  
📱 **Mobile-Friendly** - Clean UI that works everywhere

## Live Demo

Production instance: https://chat-knowledge-api.fpl-test.workers.dev

**Working features:**
- ✅ Browser extension auto-capture (44 messages, 0 truncation)
- ✅ Semantic search: 0.80+ relevance scores
- ✅ Passage-level navigation with scroll-to-highlight
- ✅ ActivityPub endpoints (NodeInfo, WebFinger, Actor)
- ✅ Homepage with recent conversations grid
- ✅ Clean conversation viewer with syntax highlighting

## Quick Start

### Prerequisites
- Node.js 18+
- Cloudflare account (free tier works)
- Wrangler CLI installed
- Chrome/Edge browser (for extension)

### Installation

#### 1. Deploy Worker Backend

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

# Copy wrangler.toml.example to wrangler.toml
# Update database_id with your D1 database ID

# Run migrations
wrangler d1 execute chat-knowledge-db --remote --file=schema.sql

# Create Vectorize index
wrangler vectorize create chat-knowledge-index --dimensions=768 --metric=cosine

# Update wrangler.toml with Vectorize index name

# Generate RSA keypair for ActivityPub
node generate-keypair.mjs

# Store private key as secret
wrangler secret put ACTIVITYPUB_PRIVATE_KEY
# (paste private key when prompted)

# Update src/routes/actor.ts with public key

# Deploy
npm run deploy
```

#### 2. Install Browser Extension

```bash
# In Chrome/Edge:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the extension/ folder
```

### Using the Extension

1. **Navigate to any Claude conversation** on claude.ai
2. **Look for "📚 Share to Foundation" button** (injected into the page)
3. **Click it** - conversation automatically captured
4. **See confirmation:** "✅ Captured X messages"
5. **Search your knowledge** at your Worker URL

#### What Gets Captured

✅ **Captured:**
- All user messages and Claude responses
- Complete text (no truncation)
- Code blocks with language tags
- Timestamps on every message
- Claude's auto-generated summary
- File attachment metadata

❌ **Not Captured:**
- File contents (metadata only)
- Images (not in API response)

### Searching Your Knowledge

Visit your Worker URL to search:
- Homepage shows recent conversations
- Search box for semantic queries
- Click results → land on exact message with highlight
- "Passage X of Y" labels for multiple matches

## Architecture

**Stack:**
- **Edge Runtime**: Cloudflare Workers
- **Database**: D1 (SQLite at the edge)
- **Vector Store**: Vectorize (768-dim embeddings)
- **AI Model**: Workers AI (bge-base-en-v1.5)
- **Federation**: ActivityPub protocol

**How It Works:**

```
Browser Extension
    ↓
Auto-detects org ID → Fetches conversation from Claude API
    ↓
Sends to Worker
    ↓
Worker Processing:
  - Store in D1 (chats + messages + chunks)
  - Generate embeddings via Workers AI
  - Index in Vectorize
    ↓
Search:
  - Query → embedding → Vectorize match
  - Return passage snippets with message_index
  - UI scrolls to exact message, highlights it
    ↓
Federation:
  - ActivityPub Actor with RSA keypair
  - Inbox processes Follow activities
  - Discoverable on Mastodon
```

## Why This Approach Works

**Previous Attempt (Clipboard Capture):**
- ❌ Required manual Ctrl+A, Ctrl+C
- ❌ Broke with Claude UI changes
- ❌ Only captured partial conversations
- ❌ Complex timestamp-based parsing

**Current Approach (API-Based):**
- ✅ Auto-captures via Claude's internal API
- ✅ Zero configuration (org ID auto-detected)
- ✅ Complete conversations (all messages, artifacts)
- ✅ Won't break with UI updates
- ✅ Clean, structured data

## ActivityPub Federation

The Foundation is discoverable on the fediverse:

**Working endpoints:**
- `/.well-known/nodeinfo` - Instance metadata
- `/.well-known/webfinger` - User discovery
- `/federation/actor` - ActivityPub identity
- `/federation/inbox` - Receive Follow activities
- `/federation/followers` - Follower collection
- `/federation/following` - Following collection

**To follow from Mastodon:**
Search for `@knowledge@your-worker-domain.workers.dev`

## Why This Matters

**It solves knowledge collapse:**
- ✅ Insights stay discoverable (semantic search)
- ✅ Attribution preserved (source tracking)
- ✅ No platform risk (self-hosted)
- ✅ Can't be enshittified (you own the instance)

**It's truly decentralized:**
- ActivityPub = proven federation (powers Mastodon's 10M+ users)
- Developer-owned instances
- No corporate overlord
- Open protocol

**It's viable at scale:**
- Edge-native architecture
- D1 for storage, Vectorize for search
- ~$2/month on free tier
- <100ms search latency

## Roadmap

**Completed:**
- [x] Browser extension with API-based capture
- [x] Semantic search with Vectorize
- [x] Passage-level scroll-to-highlight
- [x] ActivityPub federation infrastructure
- [x] Homepage with recent conversations
- [x] Clean conversation viewer
- [x] Mobile-friendly UI

**Next Month:**
- [ ] Test Mastodon follow flow
- [ ] MCP server integration
- [ ] Collections feature
- [ ] Analytics dashboard

**3-6 Months:**
- [ ] Federated Q&A (separate product, same protocol)
- [ ] Cross-instance search
- [ ] Mobile app
- [ ] Chrome Web Store publication

## Contributing

This is infrastructure for the developer commons. Contributions welcome!

**Ways to help:**
- 🐛 Report bugs via Issues
- 💡 Suggest features
- 🔧 Submit PRs
- 📝 Improve documentation
- 🌐 Run your own instance and federate

## Troubleshooting

### Extension not capturing?
- Make sure you're on claude.ai (not other sites)
- Look for the "Share to Foundation" button
- Check browser console for errors (F12)
- Reload the extension at chrome://extensions

### Search not finding conversations?
- Wait ~30 seconds after capture for indexing
- Try broader search terms
- Check Worker logs: `wrangler tail`

### ActivityPub not working?
- Verify public key is in actor.ts
- Verify private key stored: `wrangler secret list`
- Test endpoints manually with curl

## License

MIT License - see LICENSE file

## Related Articles

1. [The Foundation Update: From Theory to Working Federation](https://dev.to/the-foundation/the-foundation-update-from-theory-to-working-federation-2ejm) - What changed and why
2. [I Built Federated AI Knowledge Commons](https://dev.to/the-foundation/i-built-federated-ai-knowledge-commons-heres-how-56oj) - Original launch article

## Author

Built by [Daniel Nwaneri](https://github.com/dannwaneri)  
Cloudflare Workers specialist • AI integration • Edge computing

---

**The knowledge commons doesn't rebuild itself. But we can build it together.**

Star ⭐ this repo if you believe in preserving developer knowledge!