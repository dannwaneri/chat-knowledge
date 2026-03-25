# The Foundation: Federated AI Knowledge Commons

> Capture your Claude conversations. Extract insights. Share them on the decentralised web via ActivityPub.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dannwaneri/chat-knowledge)

## The Problem

**Knowledge collapse is happening in real-time.**

- Stack Overflow questions down 78% since ChatGPT launched — 3,862 questions in December 2025 vs 200,000 at peak
- Every developer is solving the same problems. Nobody knows it.
- Best debugging solutions live in private AI chats, never indexed, never discoverable
- AI trains on AI-generated content with no human verification loop

## The Solution

**A federated knowledge commons using ActivityPub.** Like Mastodon, but for developer knowledge.

Run your own instance. Capture your best AI conversations. Share them publicly. Other developers — and future AI models — can learn from what you built.

Self-hosted • Privacy-first • Developer-owned • Fully federated

## Features

🔍 **Semantic Search** — Find insights across conversations using AI embeddings  
🎯 **Passage-Level Precision** — Click a result, land on the exact message  
🧠 **Insight Extraction** — Kimi K2.5 extracts decisions, commands, patterns, dead ends  
🌐 **ActivityPub Federation** — Full two-way federation with HTTP signature verification  
⚡ **Browser Extension** — Auto-captures Claude.ai conversations via internal API  
💻 **CLI Capture** — Imports Claude Code sessions from `~/.claude/projects/`  
🤖 **MCP Integration** — Query your full private knowledge base from Claude Desktop  
🔒 **Privacy-First** — All chats private by default. You control what's public  
👤 **Owner Auth** — Login/logout in the UI. Management controls gated behind your API key  
💰 **Edge-Native** — Self-hosted on Cloudflare Workers (~$2/month, free tier works)

## Live Demo

Production instance: https://chat-knowledge-api.fpl-test.workers.dev

Follow on the fediverse: `@knowledge@chat-knowledge-api.fpl-test.workers.dev`

## Quick Start

### Prerequisites
- Node.js 18+
- Cloudflare account (free tier works)
- Wrangler CLI: `npm install -g wrangler`
- Chrome/Edge browser (for extension)

### 1. Deploy Worker Backend

```bash
git clone https://github.com/dannwaneri/chat-knowledge.git
cd chat-knowledge
npm install
wrangler login

# Create D1 database
wrangler d1 create chat-knowledge-db
# Copy wrangler.toml.example → wrangler.toml and add your database_id

# Run schema
wrangler d1 execute chat-knowledge-db --remote --file=schema.sql

# Create Vectorize index
wrangler vectorize create chat-knowledge-index --dimensions=768 --metric=cosine
# Add index name to wrangler.toml

# Generate RSA keypair for ActivityPub federation
node -e "
const { generateKeyPairSync } = require('crypto');
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
console.log('PUBLIC KEY:');
console.log(publicKey);
console.log('PRIVATE KEY:');
console.log(privateKey);
"
# Store private key: wrangler secret put ACTIVITYPUB_PRIVATE_KEY
# Update publicKeyPem in src/worker/routes/actor.ts with public key

# Set your API key (used for owner login and MCP access)
wrangler secret put API_KEY

# Deploy
npm run deploy
```

### 2. Install Browser Extension

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `browser-extension/` folder

Then navigate to any Claude conversation and click **Share to Foundation**.

### 3. CLI Capture for Claude Code Sessions

```bash
npm run capture -- --api-key YOUR_API_KEY
```

Scans `~/.claude/projects/` for Claude Code sessions, imports new ones, skips duplicates.

```bash
# Options
npm run capture -- --api-key YOUR_KEY --url https://your-worker.workers.dev
```

### 4. MCP Server (Claude Desktop)

Add to your Claude Desktop config:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "chat-knowledge": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker.workers.dev/mcp",
        "--header",
        "X-API-Key:your-api-key-here"
      ]
    }
  }
}
```

Restart Claude Desktop. The MCP server runs on Cloudflare — no local process needed.

## Privacy Model

All captured chats are **private by default**. Visitors only see what you explicitly make public.

```
Capture chat → private by default
     ↓
Review in your instance (owner login)
     ↓
Toggle to public via the UI
     ↓
Appears on homepage + federated to ActivityPub followers
```

### Owner Login

Visit your instance, click **Owner login** in the nav, enter your API key. Management controls (visibility toggles, private chat list) appear when logged in.

### Access Levels

| Access | Endpoint | Sees |
|--------|----------|------|
| Public visitors | `/chats`, `/search` | Public chats only |
| Owner (browser) | Same + API key | All chats + management controls |
| MCP / Claude Desktop | `/api/private/chats` + API key | All chats |

## Architecture

**Stack:**
- **Runtime**: Cloudflare Workers
- **Database**: D1 (SQLite at the edge)
- **Vector Store**: Vectorize (768-dim embeddings)
- **Embeddings**: Workers AI (bge-base-en-v1.5)
- **Insight Extraction**: Workers AI (Kimi K2.5 / @cf/moonshotai/kimi-k2.5)
- **Federation**: ActivityPub with HTTP signatures

**Capture pipeline:**

```
Browser Extension or CLI
    ↓
Fetch conversation from Claude API / parse .jsonl
    ↓
POST to Worker
    ↓
  ├── Store in D1 (chats + messages + chunks)
  ├── Generate embeddings → index in Vectorize
  └── Trigger async insight extraction (Kimi K2.5)
         ↓
  Extract: decisions, commands, patterns, dead ends, context
  Score with three-signal evaluator (usage, validation, specificity)
  Store scored insights in D1
```

**Federation pipeline:**

```
Incoming activity (Follow, Undo, Create)
    ↓
Verify HTTP signature against sender's public key
    ↓
Process activity (store follower, send signed Accept)
    ↓
On chat → public: auto-broadcast signed Note to all followers
```

## ActivityPub Federation

Foundation is a full ActivityPub actor on the fediverse.

**Endpoints:**
- `/.well-known/nodeinfo` — Instance metadata
- `/.well-known/webfinger` — User discovery
- `/federation/actor` — Actor profile with public key
- `/federation/inbox` — Receives activities (signature-verified)
- `/federation/followers` — Follower collection
- `/federation/outbox` — Outbox

**To follow from Mastodon:**
Search for `@knowledge@your-worker-domain.workers.dev`

**Inbound verification:** All incoming activities are verified against the sender's public key using RSASSA-PKCS1-v1_5 + SHA-256. Unsigned activities are rejected with 401.

**Outbound signing:** All delivered activities (Accept, broadcast Notes) are signed with your private key.

**Auto-broadcast:** When you toggle a chat from private → public, Foundation automatically delivers a signed Note to all followers with the chat title, summary, and link.

**Manual broadcast:**
```powershell
Invoke-RestMethod -Uri "https://your-worker.workers.dev/api/federation/broadcast" `
  -Method POST `
  -Headers @{"X-API-Key"="your-key"; "Content-Type"="application/json"} `
  -Body '{"activity": {"@context": "https://www.w3.org/ns/activitystreams", "type": "Create", "actor": "https://your-worker.workers.dev/federation/actor", "object": {"type": "Note", "content": "Hello fediverse!"}}}'
```

## Insight Extraction

Foundation uses Kimi K2.5 (`@cf/moonshotai/kimi-k2.5`) on Workers AI to extract structured insights from every captured conversation.

**Insight types:**
- `command` — copy-ready commands and exact values
- `decision` — architectural choices and why
- `solution` — bugs fixed, approaches that worked
- `pattern` — recurring approaches worth reusing
- `dead_end` — what failed and why
- `commitment` — open threads and deferred decisions
- `context` — background needed to understand the work

**Quality:** Kimi K2.5 produces 3-4x more insights than Llama 3.3 70B on the same conversation (14 → 46 on a 1,168-message session) at zero additional API cost.

## Roadmap

**Completed:**
- [x] Browser extension — auto-capture via Claude internal API
- [x] CLI capture — Claude Code sessions from `~/.claude/projects/`
- [x] Semantic search with Vectorize
- [x] Passage-level scroll-to-highlight
- [x] Insight extraction — Kimi K2.5, 8 insight types
- [x] Three-signal evaluator scoring (usage, validation, specificity)
- [x] ActivityPub federation — full two-way with HTTP signatures
- [x] Auto-broadcast on chat → public
- [x] Collections — group chats by topic
- [x] Owner auth — login/logout in UI
- [x] Chat + collection visibility toggles in UI
- [x] Model field capture (tracks which LLM generated each conversation)
- [x] MCP server for Claude Desktop
- [x] `minScore` filtering on insights API

**Next:**
- [ ] Cross-instance search
- [ ] Federated chat import (follow another Foundation instance, import their public chats)
- [ ] Chrome Web Store publication
- [ ] Self-hosting guide for non-developers

## Troubleshooting

**Extension not capturing?**
- Confirm you're on claude.ai
- Look for "Share to Foundation" button
- Check browser console (F12) for errors

**CLI not finding sessions?**
- Run Claude Code in a project first: `cd your-project && claude`
- Check `~/.claude/projects/` exists after use

**Insights not extracting?**
- Check wrangler tail for extraction logs
- Kimi K2.5 requires `max_tokens: 8192` — verify in `insights.ts`

**Search returning no results?**
- Wait ~30 seconds after capture for Vectorize indexing
- Search only returns public chats for unauthenticated visitors

**MCP not connecting?**
- Verify `API_KEY` secret: `wrangler secret list`
- Fully restart Claude Desktop (quit from tray)
- Test: `curl -H "X-API-Key: your-key" https://your-worker.workers.dev/api/private/chats`

**ActivityPub not federating?**
- Verify `ACTIVITYPUB_PRIVATE_KEY` secret is set
- Check public key in `actor.ts` matches the stored private key
- Test: `curl https://your-worker.workers.dev/federation/actor`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guide.

**Priority areas:**
- Run your own instance and federate with others
- Test ActivityPub compatibility with non-Mastodon servers
- Cross-instance search implementation
- Documentation improvements

## Related Articles

- [The Foundation Update: From Theory to Working Federation](https://dev.to/the-foundation/the-foundation-update-from-theory-to-working-federation-2ejm)
- [I Built a Federated AI Knowledge Commons](https://dev.to/the-foundation/i-built-federated-ai-knowledge-commons-heres-how-56oj)
- [How to Build a Production RAG System with Cloudflare Workers](https://www.freecodecamp.org/news/build-a-production-rag-system-with-cloudflare-workers-handbook) — freeCodeCamp

## Author

Built by [Daniel Nwaneri](https://github.com/dannwaneri) — Cloudflare Workers specialist, edge computing, AI integration

---

**The knowledge commons doesn't rebuild itself. But we can build it together.**