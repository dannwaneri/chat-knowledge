# Contributing to The Foundation

Thanks for your interest in contributing to the federated AI knowledge commons. This project aims to preserve developer knowledge in a decentralised, privacy-first way — and it only works if developers run their own instances and share.

## Ways to Contribute

### 🌐 Run Your Own Instance
The most valuable contribution. Deploy Foundation to your own Cloudflare account, capture your conversations, and federate with other instances. See README.md for setup.

### 🐛 Report Bugs
- Check [Issues](https://github.com/dannwaneri/chat-knowledge/issues) first
- Include: OS, browser, Node version, Wrangler version, steps to reproduce, expected vs actual behaviour

### 💡 Suggest Features
- Open an issue with the `enhancement` label
- Explain how it fits the federated, privacy-first vision

### 🔧 Submit Code
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test thoroughly (see Testing section)
5. Commit with clear messages: `git commit -m 'Add feature description'`
6. Push: `git push origin feature/your-feature`
7. Open a Pull Request

## Development Setup

### Prerequisites
- Node.js 18+
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`
- Chrome/Edge (for extension testing)

### Backend Setup

```bash
git clone https://github.com/YOUR_USERNAME/chat-knowledge.git
cd chat-knowledge
npm install
cp wrangler.toml.example wrangler.toml
wrangler login

# Create D1 database
wrangler d1 create chat-knowledge-db
# Add database_id to wrangler.toml

# Run migrations
wrangler d1 execute chat-knowledge-db --remote --file=schema.sql

# Create Vectorize index
wrangler vectorize create chat-knowledge-index --dimensions=768 --metric=cosine
# Add index name to wrangler.toml

# Generate RSA keypair
node -e "
const { generateKeyPairSync } = require('crypto');
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
console.log('PUBLIC:', publicKey);
console.log('PRIVATE:', privateKey);
"
# Store private key: wrangler secret put ACTIVITYPUB_PRIVATE_KEY
# Store API key: wrangler secret put API_KEY
# Update publicKeyPem in src/worker/routes/actor.ts

npm run dev
```

### Extension Setup

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `browser-extension/` folder

### CLI Capture Setup

```bash
# Install Claude Code if not already installed
npm install -g @anthropic-ai/claude-code

# Run CLI capture against your local dev instance
node cli/capture.cjs --api-key your-key --url http://localhost:8787
```

## Testing Your Changes

### Backend
```bash
# Test search
curl -X POST http://localhost:8787/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "maxResults": 5}'

# Test private chats (authenticated)
curl http://localhost:8787/api/private/chats \
  -H "X-API-Key: your-key"

# Test ActivityPub endpoints
curl http://localhost:8787/.well-known/nodeinfo
curl http://localhost:8787/federation/actor
curl http://localhost:8787/.well-known/webfinger?resource=acct:knowledge@localhost
```

### Extension
1. Navigate to claude.ai
2. Have a conversation (at least a few messages)
3. Click **Share to Foundation**
4. Check console (F12) for errors
5. Verify chat appears at your Worker URL

### CLI Capture
```bash
# Run Claude Code in a project to generate a session
cd some-project && claude
# Have a few exchanges, then /exit

# Run capture
node cli/capture.cjs --api-key your-key --url http://localhost:8787

# Run again — should skip (dedup test)
node cli/capture.cjs --api-key your-key --url http://localhost:8787
```

### Federation
1. Deploy your instance
2. From Mastodon, search for `@knowledge@your-worker.workers.dev`
3. Follow it
4. Check `wrangler tail` for signature verification logs
5. Verify follow appears in `federated_instances` table:
   ```bash
   wrangler d1 execute chat-knowledge-db --remote --command "SELECT * FROM federated_instances"
   ```

## File Structure

```
src/
├── worker/
│   ├── index.ts                    # Main app entry point + core API routes
│   ├── routes/
│   │   ├── actor.ts                # ActivityPub identity + public key
│   │   ├── broadcast.ts            # Signed outbound delivery to followers
│   │   ├── collections.ts          # Collections CRUD
│   │   ├── evaluator.ts            # Three-signal insight scorer
│   │   ├── federation-sign.ts      # HTTP signature signing + delivery
│   │   ├── import-extension.ts     # Browser extension capture endpoint
│   │   ├── inbox-handler.ts        # Inbound ActivityPub with signature verification
│   │   ├── insights.ts             # Insight extraction + retrieval (Kimi K2.5)
│   │   ├── nodeinfo.ts             # Federation discovery
│   │   └── webfinger.ts            # User lookup
│   └── ui/
│       ├── chat.ts                 # Conversation viewer
│       ├── chats.ts                # Chat list page
│       ├── collections.ts          # Collections pages
│       └── search.ts               # Homepage knowledge feed
├── mcp-server/
│   └── index.ts                    # MCP server for Claude Desktop
└── types/
    └── index.ts                    # TypeScript types

browser-extension/
├── manifest.json
├── capture.js                      # Captures Claude conversations
├── background.js                   # Sends to Worker
├── popup.html
└── popup.js

cli/
└── capture.cjs                     # Claude Code session importer

schema.sql                          # D1 database schema
wrangler.toml.example               # Config template
```

## Code Guidelines

### TypeScript
- Strict typing where practical
- Avoid `any` unless unavoidable
- JSDoc on public functions

### Formatting
- 2 spaces indentation
- Semicolons required
- Single quotes for strings

### Commit Messages
Present tense, descriptive:
```
Add CLI capture for Claude Code sessions
Fix HTTP signature verification for Pleroma instances
Update Kimi K2.5 response parsing for thinking model format
```

## Pull Request Checklist

- [ ] Builds without errors: `npm run build`
- [ ] Tested locally with real conversations
- [ ] Extension tested in Chrome (if UI changes)
- [ ] README updated (if adding features)
- [ ] No secrets or credentials in code
- [ ] Follows existing code style
- [ ] Mobile-friendly (if UI changes)

## Priority Areas

### High Priority
- [ ] Cross-instance search — query public chats from other Foundation instances
- [ ] Federated chat import — follow another instance, import their public chats
- [ ] Compatibility testing with non-Mastodon ActivityPub servers (Pleroma, Misskey, Pixelfed)
- [ ] Chrome Web Store publication

### Medium Priority
- [ ] Analytics dashboard
- [ ] Self-hosting guide for non-developers
- [ ] Batch insight re-extraction endpoint
- [ ] Mobile app

### Documentation
- [ ] Video walkthrough
- [ ] Architecture deep-dive
- [ ] Federation protocol notes

## Security

- Never commit API keys or secrets
- Use `wrangler secret put` for all sensitive values
- Sanitise user input in search queries
- HTTP signature verification is required for inbound federation — don't remove it

## Questions?

Open an issue with the `question` label or tag @dannwaneri.

## License

By contributing, you agree your contributions will be licensed under the MIT License.

---

**Every instance you run, every chat you share, adds to the commons.**