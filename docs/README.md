# ContextStream Documentation

Welcome to the ContextStream documentation. This directory contains all architectural decisions, design specifications, and implementation guides.

## 📚 Documentation Index

### Core Architecture

1. **[ARCHITECTURE_NEXTJS.md](./ARCHITECTURE_NEXTJS.md)** ⭐
   - Full-stack Next.js 14+ architecture
   - Technology stack and directory structure
   - Baseline Prisma schema
   - API design and implementation patterns
   - Deployment strategies (Docker, Vercel)
   - **Start here** for understanding the overall system

2. **[GLOBAL_SOURCE_ARCHITECTURE.md](./GLOBAL_SOURCE_ARCHITECTURE.md)** 🔥
   - **Enhanced data model** with source sharing
   - Global vs workspace-scoped sources
   - Role-based access control (SUPER_ADMIN, ADMIN, USER)
   - Storage deduplication (99% savings on popular sources)
   - Admin tools for managing sources
   - Complete migration guide
   - **Critical for production implementation**

### Product & Requirements

3. **[product-manager-output.md](./product-manager-output.md)** 📋
   - User personas (AI-First Developer, DevRel Engineer, etc.)
   - Feature specifications (MVP through Phase 4)
   - User stories and acceptance criteria
   - Success metrics and KPIs
   - Competitive analysis
   - Go-to-market strategy

### Design System

4. **[design/](./design/)** 🎨
   - **design-system.md** - Colors, typography, components
   - **user-flows.md** - Detailed user journeys
   - **wireframes.md** - Page layouts (text-based)
   - **accessibility-guidelines.md** - WCAG 2.1 AA compliance
   - **README.md** - Design system overview

---

## 🚀 Quick Start Guide

### For New Developers

1. **Understand the Product**
   - Read [product-manager-output.md](./product-manager-output.md) (Executive Summary + User Personas)
   - Understand the problem we're solving and who we're solving it for

2. **Learn the Architecture**
   - Read [ARCHITECTURE_NEXTJS.md](./ARCHITECTURE_NEXTJS.md) (Sections 1-3)
   - Understand Next.js structure, tech stack, and API design

3. **Critical: Global Sources**
   - **Must read:** [GLOBAL_SOURCE_ARCHITECTURE.md](./GLOBAL_SOURCE_ARCHITECTURE.md)
   - This is the **production data model** - the baseline in ARCHITECTURE_NEXTJS.md is for reference only
   - Understand source scoping, permissions, and storage efficiency

4. **Review Design Specs**
   - Browse [design/](./design/) to understand UI/UX patterns
   - Use wireframes as reference during implementation

### For Frontend Engineers

Priority reading order:
1. [design/design-system.md](./design/design-system.md) - Component specs
2. [design/user-flows.md](./design/user-flows.md) - Interaction patterns
3. [design/wireframes.md](./design/wireframes.md) - Page layouts
4. [ARCHITECTURE_NEXTJS.md](./ARCHITECTURE_NEXTJS.md) - Section 5 (Frontend Architecture)

### For Backend Engineers

Priority reading order:
1. [GLOBAL_SOURCE_ARCHITECTURE.md](./GLOBAL_SOURCE_ARCHITECTURE.md) - **Start here!**
2. [ARCHITECTURE_NEXTJS.md](./ARCHITECTURE_NEXTJS.md) - Sections 2-4 (Data, API, Core Features)
3. [product-manager-output.md](./product-manager-output.md) - Feature specs

### For Product/UX

Priority reading order:
1. [product-manager-output.md](./product-manager-output.md) - User stories
2. [design/user-flows.md](./design/user-flows.md) - User journeys
3. [design/wireframes.md](./design/wireframes.md) - UI layouts

---

## 📖 Document Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                  Product Requirements                       │
│              (product-manager-output.md)                    │
│  • User personas                                            │
│  • Feature specs                                            │
│  • Success metrics                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
┌────────▼────────┐    ┌─────────▼──────────┐
│  UX/UI Design   │    │   Architecture     │
│  (design/)      │    │  (ARCHITECTURE_*)  │
│                 │    │                    │
│  • Components   │    │  • Data models     │
│  • User flows   │    │  • API design      │
│  • Wireframes   │    │  • Tech stack      │
└─────────────────┘    └────────┬───────────┘
                                │
                    ┌───────────┴──────────┐
                    │                      │
          ┌─────────▼────────┐   ┌────────▼──────────────┐
          │  Baseline Schema │   │  Global Source Model  │
          │  (Reference)     │   │  (PRODUCTION)         │
          │                  │   │                       │
          │  • Simple model  │   │  • Source sharing     │
          │  • 1:1 workspace │   │  • RBAC               │
          │    to source     │   │  • Deduplication      │
          └──────────────────┘   └───────────────────────┘
```

---

## 🔑 Key Concepts

### Source Scoping (CRITICAL)

**Global Sources:**
- Shared across all workspaces
- Admin-managed and curated
- Stored once, referenced many times
- Example: React docs, Python docs, TypeScript docs
- **99% storage savings** for popular documentation

**Workspace Sources:**
- Private to specific workspace
- User-managed
- Can be promoted to global by admins
- Example: Internal wikis, client-specific docs

### User Roles

**SUPER_ADMIN:**
- Full system access
- Manage global sources
- Manage user roles
- View all workspaces

**ADMIN:**
- Manage global sources
- Promote/demote sources
- View usage analytics

**USER:**
- Manage workspace sources
- Access global sources
- Standard user features

### Storage Efficiency

Without global sources:
```
100 workspaces × React docs (500MB) = 50GB total
```

With global sources:
```
1 × React docs (500MB) = 500MB total
Savings: 49.5GB (99%)
```

---

## 📊 Implementation Status

| Component | Status | Documentation |
|-----------|--------|---------------|
| Product Requirements | ✅ Complete | product-manager-output.md |
| Architecture Design | ✅ Complete | ARCHITECTURE_NEXTJS.md |
| Global Source Design | ✅ Complete | GLOBAL_SOURCE_ARCHITECTURE.md |
| UX/UI Design | ✅ Complete | design/ |
| Database Schema | 📝 Planned | See GLOBAL_SOURCE_ARCHITECTURE.md |
| API Implementation | 📝 Planned | See ARCHITECTURE_NEXTJS.md |
| Frontend Implementation | 📝 Planned | See design/ |
| Testing Strategy | 📝 Planned | All docs include testing sections |

---

## 🛠️ Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Database schema with global sources
- [ ] Permission system (roles + RBAC)
- [ ] Basic API endpoints
- [ ] Authentication (NextAuth)

### Phase 2: Core Features (Weeks 5-8)
- [ ] Source management (add, update, delete)
- [ ] Web scraping pipeline
- [ ] Embedding generation
- [ ] Hybrid search

### Phase 3: Admin Tools (Weeks 9-12)
- [ ] Admin dashboard
- [ ] Source promotion workflow
- [ ] Usage analytics
- [ ] User management

### Phase 4: Frontend (Weeks 13-16)
- [ ] Dashboard UI
- [ ] Source management UI
- [ ] Search interface
- [ ] Admin UI

### Phase 5: Polish & Launch (Weeks 17-20)
- [ ] Testing (unit, integration, E2E)
- [ ] Documentation
- [ ] Performance optimization
- [ ] Production deployment

---

## 📝 Documentation Standards

### When Creating New Documents

1. **Include a header** with:
   - Document version
   - Last updated date
   - Status (Draft, Review, Approved, Implemented)

2. **Add to this index** (docs/README.md)

3. **Link from related documents**

4. **Use consistent formatting:**
   - Markdown format
   - Code blocks with language tags
   - Clear section headers
   - Examples for complex concepts

### When Updating Documents

1. Update "Last Updated" date in header
2. Add changelog entry at bottom (optional for major changes)
3. Update related documents if necessary
4. Notify team of breaking changes

---

## 🤝 Contributing

### Proposing Architecture Changes

1. Create a new markdown file in `docs/`
2. Follow the format of existing docs
3. Include:
   - Problem statement
   - Proposed solution
   - Trade-offs
   - Migration strategy (if applicable)
4. Submit for team review

### Reporting Issues

- Unclear documentation: Open an issue
- Missing information: Open an issue or PR
- Incorrect information: Open a PR with correction

---

## 📞 Getting Help

**Architecture Questions:**
- Refer to ARCHITECTURE_NEXTJS.md and GLOBAL_SOURCE_ARCHITECTURE.md
- Check the implementation examples in each doc

**Design Questions:**
- Refer to design/ directory
- Check wireframes and user flows

**Product Questions:**
- Refer to product-manager-output.md
- Check user stories and acceptance criteria

**Still Stuck?**
- Ask in team chat
- Schedule architecture review meeting
- Open a discussion issue

---

## 🎯 Success Metrics

We measure documentation quality by:

✅ **Clarity**: New developers can understand the system in < 1 day
✅ **Completeness**: All major decisions are documented
✅ **Accuracy**: Documentation matches implementation
✅ **Maintainability**: Easy to update as system evolves
✅ **Discoverability**: Easy to find relevant information

---

## 📚 External Resources

### Next.js
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

### Prisma
- [Prisma Documentation](https://www.prisma.io/docs)
- [pgvector Guide](https://github.com/pgvector/pgvector)

### shadcn/ui
- [Component Library](https://ui.shadcn.com/)
- [Installation Guide](https://ui.shadcn.com/docs/installation/next)

### Authentication
- [NextAuth.js v5](https://next-auth.js.org/)
- [Auth.js Documentation](https://authjs.dev/)

---

**Last Updated:** 2025-01-09
**Maintained By:** Engineering Team
