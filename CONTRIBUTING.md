# Contributing to Chat Knowledge

Thanks for your interest in contributing to the federated AI knowledge commons! This project aims to preserve developer knowledge in a decentralized, privacy-first way.

## Ways to Contribute

### 🐛 Report Bugs
- Check if the bug has already been reported in [Issues](https://github.com/dannwaneri/chat-knowledge/issues)
- If not, create a new issue with:
  - Clear title and description
  - Steps to reproduce
  - Expected vs actual behavior
  - Your environment (OS, Node version, Wrangler version)

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

### Local Setup
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

# Create local D1 database
wrangler d1 create chat-knowledge-db-local

# Update wrangler.toml with the database ID

# Run migrations
wrangler d1 execute chat-knowledge-db-local --local --file=migrations/migration-federation.sql
wrangler d1 execute chat-knowledge-db-local --local --file=migrations/migration-sanitizer.sql

# Create Vectorize index
wrangler vectorize create chat-knowledge-embeddings-local --dimensions=768 --metric=cosine

# Start development server
npm run dev:worker
```

### Testing Your Changes
```bash
# Build TypeScript
npm run build

# Test import functionality
node dist/cli/import-html.js data/exports/test-chat.html "Test Import"

# Test search
curl -X POST http://localhost:8787/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test query", "maxResults": 5}'

# Test security scanner
node dist/cli/safe-share.js <chat-id>
```

## Code Guidelines

### TypeScript
- Use strict TypeScript typing
- Avoid `any` types unless absolutely necessary
- Add JSDoc comments for public functions

### Formatting
- Use 2 spaces for indentation
- Semicolons required
- Single quotes for strings

### File Structure
```
src/
├── worker/          # Cloudflare Worker code
│   ├── routes/      # API route handlers
│   └── utils/       # Utility functions
├── cli/             # Command-line tools
├── mcp-server/      # MCP integration
└── types/           # TypeScript type definitions
```

### Commit Messages
- Use present tense ("Add feature" not "Added feature")
- Be descriptive but concise
- Reference issues when applicable (#123)

Examples:
```
Add batch import CLI command
Fix security scanner false positives
Update ActivityPub federation protocol
```

## Pull Request Process

1. **Update documentation** - README, code comments, etc.
2. **Test thoroughly** - Ensure nothing breaks
3. **Keep it focused** - One feature/fix per PR
4. **Describe changes** - What and why
5. **Be responsive** - Reply to feedback promptly

### PR Checklist
- [ ] Code builds without errors (`npm run build`)
- [ ] Tested locally with real data
- [ ] Updated README if adding features
- [ ] No secrets or credentials in code
- [ ] Follows existing code style

## Areas We Need Help

### High Priority
- [ ] Batch import improvements (handle large files better)
- [ ] MCP server testing and debugging
- [ ] Federation protocol testing (need 2+ instances)
- [ ] Security scanner tuning (reduce false positives)

### Medium Priority
- [ ] Browser extension for one-click import
- [ ] Better error handling and logging
- [ ] Analytics dashboard
- [ ] Collections UI

### Documentation
- [ ] More code examples
- [ ] Video tutorials
- [ ] Architecture deep-dive
- [ ] Deployment guides (other platforms)

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

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping build the knowledge commons!** 🚀

Every contribution, no matter how small, helps preserve developer knowledge for everyone.