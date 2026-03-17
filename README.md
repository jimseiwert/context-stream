# 🌊 ContextStream

> Your personal AI-powered documentation search engine. Index, search, and chat with your docs using cutting-edge semantic search.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Pulls](https://img.shields.io/docker/pulls/jimseiwert/context-stream)](https://hub.docker.com/r/jimseiwert/context-stream)
[![GitHub Stars](https://img.shields.io/github/stars/jimseiwert/context-stream?style=social)](https://github.com/jimseiwert/context-stream)

**ContextStream** is an open-source platform that brings the power of AI-driven semantic search to your documentation. Whether you're building an internal knowledge base, indexing your company's docs, or just want to search through your favorite frameworks' documentation faster, ContextStream has you covered.

## ✨ Why ContextStream?

Traditional documentation search relies on keyword matching, which often misses the mark. ContextStream uses **AI embeddings and semantic search** to understand what you're actually asking for - not just matching keywords, but understanding intent and context.

- 🧠 **Semantic Search**: Ask questions naturally, get relevant answers
- 🔌 **Multiple Sources**: GitHub repos, websites, wikis, and more
- 💬 **AI Chat Interface**: Ask questions, get answers from your docs
- 🔄 **Auto-Sync**: Keep your docs fresh with automatic updates
- 🎯 **MCP Integration**: Works with Claude and other AI coding assistants
- 🔐 **Privacy-First**: Self-hosted, your data stays yours
- 🚀 **Fast & Efficient**: Hybrid BM25 + vector search for optimal results

## 💖 Support This Project

ContextStream is **free and open-source**, but hosting, development, and maintenance require time and resources. If you find this project helpful, please consider supporting it!

### 🌟 Ways to Support

- **Star this repo** - It helps with visibility!
- **Sponsor on GitHub** - [Become a sponsor](https://github.com/sponsors/jimseiwert) to help keep this project alive
- **Share** - Tell others about ContextStream
- **Contribute** - Code, docs, bug reports, and ideas are all welcome!

### 💝 Current Sponsors

Your logo here! Be the first to support this project and get your name/logo featured here.

*Interested in sponsoring? [Get in touch](mailto:support@contextstream.dev)*

## 🚀 Quick Start

Get up and running in under 5 minutes!

### Prerequisites

- Docker and Docker Compose
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- 2GB RAM minimum (4GB recommended)

### One-Command Deploy

```bash
# Download docker-compose file
curl -o docker-compose.yml https://raw.githubusercontent.com/jimseiwert/context-stream/main/docker/docker-compose.production.yml

# Create environment file
cat > .env << EOF
OPENAI_API_KEY=your-api-key-here
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
EOF

# Start ContextStream
docker-compose up -d

# Visit http://localhost:3000 🎉
```

That's it! You now have your own AI-powered documentation search engine running locally.

## 🎯 Use Cases

- **Developer Teams**: Index your internal wikis, API docs, and codebases
- **Content Teams**: Search through marketing materials, guides, and knowledge bases
- **Students/Researchers**: Build a personal search engine for your research papers and notes
- **Open Source Maintainers**: Make your project's docs more discoverable
- **AI Coding Assistants**: Use with Claude Code or other AI tools via MCP

## 🐳 Deployment Options

Choose the deployment that fits your needs:

### Docker Compose (Recommended)
Production-ready setup with separate services for better performance.

[📖 Docker Compose Setup Guide](DEPLOYMENT.md#option-2-multi-container-setup-recommended)

### Kubernetes / Helm
Enterprise-ready with auto-scaling and high availability.

[📖 Kubernetes Setup Guide](DEPLOYMENT.md#kubernetes-deployment)

## 🛠️ Tech Stack

Built with modern, battle-tested technologies:

- **Frontend**: Next.js 15, React 19, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: PostgreSQL 16 with pgvector
- **Search**: Hybrid BM25 + Vector similarity
- **Queue**: Bull (Redis-based)
- **Auth**: Better Auth with OAuth support
- **AI**: OpenAI Embeddings & GPT-4
- **Deployment**: Docker, Kubernetes

## 📚 Core Features

### Intelligent Search
Uses hybrid search combining traditional BM25 with AI vector embeddings for the best of both worlds.

### Multi-Workspace Support
Organize your docs into workspaces - personal, team, or global. Control access and permissions.

### MCP Server Integration
Built-in Model Context Protocol server for seamless integration with Claude Code and other AI coding assistants. Search your docs without leaving your editor!

### Auto-Sync & Webhooks
Keep your docs fresh with automatic synchronization. Set schedules or use webhooks for instant updates.

### Modern UI
Clean, responsive interface built with Next.js and Tailwind. Works great on desktop and mobile.

## 🤝 Contributing

We ❤️ contributions! Whether you're fixing bugs, adding features, improving docs, or just discussing ideas, you're welcome here.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

Check out our [Contributing Guide](CONTRIBUTING.md) for more details.

### Good First Issues

New to the project? Look for issues tagged with [`good first issue`](https://github.com/jimseiwert/context-stream/labels/good%20first%20issue) - these are great starting points!

## 🔧 Development Setup

Want to contribute or run locally? Here's how:

```bash
# Clone the repo
git clone https://github.com/jimseiwert/context-stream.git
cd context-stream

# Install dependencies
npm install

# Start dependencies (PostgreSQL, Redis)
docker-compose up -d postgres redis

# Setup environment
cp .env.example .env
# Edit .env with your values

# Run migrations
npm run db:migrate

# Start dev server
npm run dev

# In another terminal, start the worker
npm run worker
```

Visit `http://localhost:3000` and start hacking! 🎉

## 📖 Documentation

- [🚀 Deployment Guide](DEPLOYMENT.md) - Complete deployment instructions
- [⚙️ Configuration](CONFIGURATION.md) - Environment variables and settings
- [🐳 Docker Images](https://hub.docker.com/r/jimseiwert/context-stream) - Available images
- [☸️ Helm Chart](helm/contextstream/README.md) - Kubernetes deployment
- [🔌 API Docs](docs/API.md) - REST API reference
- [🤖 MCP Integration](docs/MCP.md) - Model Context Protocol setup

## 🗺️ Roadmap

Exciting features on the horizon:

- [ ] Multi-modal search (images, diagrams, code screenshots)
- [ ] Local embedding models (no OpenAI dependency)
- [ ] More data sources (Notion, Confluence, Google Docs)
- [ ] Advanced analytics and insights
- [ ] Browser extension for quick searches
- [ ] Mobile app
- [ ] Plugin system for custom integrations
- [ ] Self-hosted LLM support (Ollama, LM Studio)

Have an idea? [Open an issue](https://github.com/jimseiwert/context-stream/issues/new) or start a [discussion](https://github.com/jimseiwert/context-stream/discussions)!

## 📊 Project Stats

- **Stars**: ⭐ [Star us on GitHub](https://github.com/jimseiwert/context-stream)
- **Docker Pulls**: 🐳 Check out our [Docker Hub](https://hub.docker.com/r/jimseiwert/context-stream)
- **Contributors**: 👥 See all our amazing [contributors](https://github.com/jimseiwert/context-stream/graphs/contributors)

## 💬 Community & Support

Join our community and get help:

- **Discussions**: [GitHub Discussions](https://github.com/jimseiwert/context-stream/discussions) - Ask questions, share ideas
- **Issues**: [GitHub Issues](https://github.com/jimseiwert/context-stream/issues) - Bug reports and feature requests
- **Email**: support@contextstream.dev - Direct support
- **Discord**: Coming soon! 🎮

## 🙏 Acknowledgments

ContextStream wouldn't be possible without these amazing open-source projects:

- [Next.js](https://nextjs.org/) - The React framework
- [Drizzle ORM](https://orm.drizzle.team/) - Lightweight TypeScript ORM
- [pgvector](https://github.com/pgvector/pgvector) - Vector similarity search for PostgreSQL
- [Bull](https://github.com/OptimalBits/bull) - Premium queue package
- [Better Auth](https://www.better-auth.com/) - Modern authentication
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components

And a huge thanks to all our [contributors](https://github.com/jimseiwert/context-stream/graphs/contributors)! 🎉

## 📄 License

ContextStream is open-source software licensed under the [MIT License](LICENSE).

You're free to use, modify, and distribute this software. See the LICENSE file for full details.

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=jimseiwert/context-stream&type=Date)](https://star-history.com/#jimseiwert/context-stream&Date)

---

<div align="center">

**Made with ❤️ by the open-source community**

[⭐ Star this repo](https://github.com/jimseiwert/context-stream) • [🐦 Follow updates](https://twitter.com/jimseiwert) • [💬 Join discussions](https://github.com/jimseiwert/context-stream/discussions)

</div>
