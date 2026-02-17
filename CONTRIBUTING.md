# Contributing to The Foundation

Thanks for your interest in contributing to the federated AI knowledge commons! This project aims to preserve developer knowledge in a decentralized, privacy-first way.

## Ways to Contribute

### 🐛 Report Bugs
- Check if the bug has already been reported in [Issues](https://github.com/dannwaneri/chat-knowledge/issues)
- If not, create a new issue with:
  - Clear title and description
  - Steps to reproduce
  - Expected vs actual behavior
  - Your environment (OS, browser, Node version, Wrangler version)

### 💡 Suggest Features
- Open an issue with the `enhancement` label
- Describe the feature and why it would be useful
- Consider how it fits with the federated, privacy-first vision

### 🔧 Submit Code
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit with clear messages (`git commit -m 'Add amazing feature'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

### Prerequisites
- Node.js 18+
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`
- Chrome/Edge browser (for extension testing)

### Backend Setup
```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/chat-knowledge.git
cd chat-knowledge

# Install dependencies
npm install

# Copy config template
cp wrangler.toml.example wrangler.toml

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create chat-knowledge-db

# Update wrangler.toml with the database ID

# Run migrations
wrangler d1 execute chat-knowledge-db --remote --file=schema.sql

# Create Vectorize index
wrangler vectorize create chat-knowledge-index --dimensions=768 --metric=cosine

# Update wrangler.toml with Vectorize index name

# Generate RSA keypair for ActivityPub
node generate-keypair.mjs
# Store public key in src/routes/actor.ts
# Store private key: wrangler secret put ACTIVITYPUB_PRIVATE_KEY

# Start development server
npm run dev
```

### Extension Setup
```bash
# In Chrome/Edge:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the extension/ folder from your clone
```

### Testing Your Changes

**Backend:**
```bash
# Test search endpoint
curl -X POST http://localhost:8787/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test query", "maxResults": 5}'

# Test chat retrieval
curl http://localhost:8787/chat/<chat-id>

# Test ActivityPub endpoints
curl http://localhost:8787/.well-known/nodeinfo
curl http://localhost:8787/federation/actor
```

**Extension:**
1. Navigate to claude.ai
2. Start a conversation
3. Click the "Share to Foundation" button
4. Check browser console for errors (F12)
5. Verify conversation appears at your Worker URL

**Search & UI:**
1. Visit your Worker URL
2. Search for captured conversations
3. Click a result
4. Verify it scrolls to the highlighted message
5. Test on mobile (Chrome DevTools device emulation)

## Code Guidelines

### TypeScript
- Use strict TypeScript typing
- Avoid `any` types unless absolutely necessary
- Add JSDoc comments for public functions

### Formatting
- Use 2 spaces for indentation
- Semicolons required
- Single quotes for strings
- Run `npm run format` before committing

### File Structure
```
src/
├── routes/          # API route handlers
│   ├── import-extension.ts    # Conversation capture
│   ├── search.ts              # Search endpoint
│   ├── chats.ts               # Chat retrieval
│   ├── nodeinfo.ts            # Federation discovery
│   ├── webfinger.ts           # User lookup
│   ├── actor.ts               # ActivityPub identity
│   └── inbox-handler.ts       # Federation activities
├── ui/              # Frontend templates
│   ├── search.ts              # Homepage + search UI
│   └── chat.ts                # Conversation viewer
└── index.ts         # Main app entry point

extension/           # Browser extension
├── manifest.json
├── capture.js       # Captures conversations
├── background.js    # Sends to Worker
├── popup.html       # Extension popup
└── popup.js         # Popup logic

mcp/                # MCP server integration
└── server.ts

schema.sql          # Database schema
wrangler.toml       # Cloudflare config
```

### Commit Messages
- Use present tense ("Add feature" not "Added feature")
- Be descriptive but concise
- Reference issues when applicable (#123)

Examples:
```
Add passage-level scroll highlighting
Fix extension capture on long conversations
Update ActivityPub inbox handler
Improve mobile navigation layout
```

## Pull Request Process

1. **Update documentation** - README, code comments, etc.
2. **Test thoroughly** - Ensure nothing breaks
3. **Keep it focused** - One feature/fix per PR
4. **Describe changes** - What and why
5. **Be responsive** - Reply to feedback promptly

### PR Checklist
- [ ] Code builds without errors (`npm run build`)
- [ ] Tested locally with real conversations
- [ ] Extension tested in Chrome
- [ ] Updated README if adding features
- [ ] No secrets or credentials in code
- [ ] Follows existing code style
- [ ] Mobile-friendly (if UI changes)

## Areas We Need Help

### High Priority
- [ ] Test Mastodon follow flow (requires Mastodon account)
- [ ] HTTP signature verification for ActivityPub
- [ ] Cross-instance search
- [ ] Collections feature (curate by topic)
- [ ] Extension popup stats improvement

### Medium Priority
- [ ] MCP server integration
- [ ] Analytics dashboard
- [ ] Better error handling
- [ ] Chrome Web Store preparation
- [ ] Mobile app (React Native?)

### Documentation
- [ ] Video tutorials
- [ ] Self-hosting guide for non-developers
- [ ] Federation setup guide
- [ ] Architecture deep-dive

### Testing
- [ ] Federation with multiple instances
- [ ] Large conversation handling (1000+ messages)
- [ ] Edge cases in message parsing
- [ ] Mobile browser testing

## Questions?

- Open an issue with the `question` label
- Tag @dannwaneri for urgent matters
- Be patient - this is maintained by volunteers

## Code of Conduct

### Our Standards
- Be respectful and inclusive
- Focus on what's best for the community
- Show empathy towards others
- Accept constructive criticism gracefully

### Unacceptable Behavior
- Harassment, discrimination, or trolling
- Publishing others' private information
- Spam or self-promotion unrelated to the project

## Federation Testing

If you want to help test federation:

1. **Deploy your own instance:**
   - Follow the README setup
   - Deploy to your own Cloudflare account
   - Generate your own RSA keypair

2. **Test discovery:**
   - Search for your instance from Mastodon
   - Verify WebFinger works
   - Test Follow activity

3. **Report issues:**
   - What worked, what didn't
   - Include logs from both instances
   - Network requests (use browser DevTools)

## Performance Considerations

- Vectorize operations are async - don't block the response
- D1 queries should use prepared statements
- Cache aggressively where possible
- Keep Worker execution time < 50ms when possible

## Security

- Never commit API keys or secrets
- Use `wrangler secret` for sensitive data
- Sanitize user input in search queries
- Rate limit public endpoints
- Review ActivityPub security best practices

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping build the knowledge commons!** 🚀

Every contribution, no matter how small, helps preserve developer knowledge for everyone.