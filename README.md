# ContextStream

AI-powered documentation and code search platform.

## Features

- 🔍 **Intelligent Search**: AI-powered semantic search across your documentation
- 📚 **Multi-Source Support**: Index documentation from GitHub, websites, and more
- 🤖 **AI Chat**: Ask questions about your documentation in natural language
- 🔄 **Auto-Sync**: Automatic synchronization with your documentation sources
- 🎨 **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- 🔐 **Authentication**: Secure authentication with OAuth providers
- 💳 **Subscription Management**: Built-in Stripe integration for billing

## Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API key
- 2GB RAM minimum (4GB recommended)

### One-Command Deploy

```bash
# Download and run
curl -o docker-compose.yml https://raw.githubusercontent.com/yourusername/context-stream/main/docker-compose.bundle.yml

# Create environment file
cat > .env << EOF
OPENAI_API_KEY=your-api-key-here
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
EOF

# Start the application
docker-compose up -d

# Open http://localhost:3000 in your browser
```

## Deployment Options

ContextStream offers flexible deployment options to suit your needs:

### 🚀 Quick Deploy (All-in-One)

Perfect for testing or small deployments. Everything runs in a single container.

- **Image**: `jimseiwert/context-stream:bundle-latest`
- **What's included**: App + Worker + PostgreSQL + Redis
- **Best for**: Demos, development, small teams
- **Resources**: 2GB RAM, 10GB disk

[View Bundle Deployment Guide →](DEPLOYMENT.md#option-1-all-in-one-bundle-simplest)

### 🐳 Docker Compose (Recommended)

Production-ready multi-container setup with better performance and scalability.

- **Images**:
  - `jimseiwert/context-stream:app-latest` (Web app)
  - `jimseiwert/context-stream:worker-latest` (Background jobs)
  - `pgvector/pgvector:pg16` (PostgreSQL with vector support)
  - `redis:7-alpine` (Redis for queues)
- **Best for**: Production deployments, better scaling
- **Resources**: 4GB RAM, 20GB disk

[View Docker Compose Guide →](DEPLOYMENT.md#option-2-multi-container-setup-recommended)

### ☸️ Kubernetes / Helm

Enterprise-ready deployment with auto-scaling and high availability.

- **Helm Chart**: `contextstream/contextstream`
- **Best for**: Large-scale deployments, enterprise
- **Features**: Auto-scaling, high availability, managed services support

[View Kubernetes Guide →](DEPLOYMENT.md#kubernetes-deployment)

## Documentation

- [📖 Deployment Guide](DEPLOYMENT.md) - Complete deployment instructions
- [⚙️ Configuration Guide](CONFIGURATION.md) - Environment variables and settings
- [🐳 Docker Images](https://hub.docker.com/r/jimseiwert/context-stream) - Available Docker images
- [📦 Helm Chart](helm/contextstream/README.md) - Kubernetes deployment
- [🔧 API Documentation](docs/API.md) - REST API reference

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer / Ingress                 │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        ┌──────────┐          ┌──────────┐
        │   App    │          │   App    │  (Multiple replicas)
        │ (Next.js)│          │ (Next.js)│
        └────┬─────┘          └────┬─────┘
             │                     │
             └──────────┬──────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │PostgreSQL│    │  Redis  │    │ Worker  │
   │(pgvector)│    │ (Queue) │    │  (Jobs) │
   └─────────┘    └─────────┘    └─────────┘
```

## Development

### Local Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/context-stream.git
cd context-stream

# Install dependencies
npm install

# Setup database
docker-compose up -d postgres redis

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run dev

# In another terminal, start the worker
npm run worker
```

### Building Docker Images

```bash
# Build app image
docker build -f Dockerfile.app -t jimseiwert/context-stream:app-latest .

# Build worker image
docker build -f Dockerfile.worker -t jimseiwert/context-stream:worker-latest .

# Build bundle image
docker build -f Dockerfile.bundle -t jimseiwert/context-stream:bundle-latest .
```

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key for embeddings |
| `BETTER_AUTH_SECRET` | Secret for authentication (32+ characters) |
| `NEXTAUTH_SECRET` | Secret for NextAuth (32+ characters) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `BETTER_AUTH_URL` | Public URL of your app | `http://localhost:3000` |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID | - |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app secret | - |
| `GOOGLE_CLIENT_ID` | Google OAuth app client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app secret | - |
| `STRIPE_SECRET_KEY` | Stripe secret key | - |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | - |

[View Complete Configuration Guide →](DEPLOYMENT.md#environment-variables)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 16 with pgvector extension
- **Queue**: Bull (Redis-based)
- **Authentication**: Better Auth
- **AI**: OpenAI Embeddings & GPT-4
- **Deployment**: Docker, Kubernetes

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@contextstream.dev
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/context-stream/discussions)
- 🐛 Bug Reports: [GitHub Issues](https://github.com/yourusername/context-stream/issues)
- 📖 Documentation: [Wiki](https://github.com/yourusername/context-stream/wiki)

## Roadmap

- [ ] Support for more documentation sources
- [ ] Advanced analytics and insights
- [ ] API for third-party integrations
- [ ] Self-hosted embedding models
- [ ] Multi-tenant support
- [ ] Advanced permission controls

## Acknowledgments

Built with amazing open-source tools:

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [pgvector](https://github.com/pgvector/pgvector)
- [Bull](https://github.com/OptimalBits/bull)
- [OpenAI](https://openai.com/)
- [TailwindCSS](https://tailwindcss.com/)

---

Made with ❤️ by the ContextStream team
