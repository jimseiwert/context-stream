# ContextStream — Claude Code Guide

## Project Overview
Open-source documentation indexing platform exposing an MCP server for AI tools (Claude, Cursor, Zed). MIT licensed. Hosted SaaS at contextstream.dev; also fully self-hostable.

## Tech Stack
- **Next.js 15** App Router, TypeScript
- **Tailwind CSS v4** + shadcn/ui
- **Drizzle ORM** — schema in `src/lib/db/schema/` (migrated from Prisma)
- **NextAuth.js** — `src/lib/auth/`
- **Stripe** — `src/lib/stripe/`
- **Hybrid search** (vector + keyword) — `src/lib/search/`
- **Embeddings**: OpenAI / Azure / Vertex — `src/lib/embeddings/`
- **PDF microservice** — `services/pdf-parser/`

## Route Structure
```
src/app/
  (public)/          # Marketing pages — no auth required
    page.tsx         # Home /
    pricing/         # /pricing
    docs/            # /docs
    privacy/         # /privacy
    terms/           # /terms
  (auth)/            # Auth pages — noindex
    login/
    register/
    forgot-password/
  layout.tsx         # Root layout — title template: "%s — ContextStream"
  opengraph-image.tsx # Branded 1200×630 OG image via next/og
  robots.ts          # robots.txt
  sitemap.ts         # XML sitemap
  manifest.ts        # PWA manifest
```

**Middleware**: Uses a **protected-route allowlist** — unknown routes fall through to Next.js 404 (not redirect to /login).

## Design System

### Dark Theme (default)
- Background: `#030711` (`--background: 224 71.4% 4.1%`)
- Foreground: `#f8fafc`
- Primary text (public pages): `#dce4f0`
- Muted text: `#7a8eaa`

### Brand Colors
| Purpose | Hex |
|---------|-----|
| Brand green (primary CTA) | `#10b981` |
| Brand cyan | `#06b6d4` |
| Brand blue | `#3b82f6` |
| Brand amber | `#f59e0b` |

### Logo (`public/logo.svg`)
Hexagonal node network, 200×200 viewBox. Three gradients:
- grad1 (TL→BR): `#10b981 → #06b6d4 → #3b82f6`
- grad2 (TR→BL): `#f59e0b → #06b6d4 → #10b981`
- grad3 (BL→TR): `#3b82f6 → #10b981`

When embedding in `next/og` (Satori): strip `<animateMotion>`, `<animate>`, and `filter="url(#glow)"`. Rename gradient IDs to avoid collisions (e.g. `og-grad1`).

### Typography
- Sans: Inter → system-ui
- Mono: JetBrains Mono → SF Mono

## SEO / Metadata Rules
- Each route under `(public)/` has its own `layout.tsx` with full metadata (title, description, canonical, openGraph, twitter, JSON-LD)
- **Always** re-specify `openGraph.images` in child metadata — Next.js does NOT deep-merge from parent
- **Always** set `twitter.card: "summary_large_image"` explicitly in child overrides
- Auth pages: `robots: { index: false, follow: false }`

## Subscriptions
Plans: Free / Starter ($9) / Pro ($19) / Team ($49) — `src/lib/subscriptions/plans.ts`
