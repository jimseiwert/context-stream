# ContextStream Design Documentation

**Version:** 1.0
**Last Updated:** 2025-10-09
**Status:** Complete (MVP Foundation)

---

## Overview

This directory contains comprehensive design documentation for ContextStream, an AI-powered documentation and codebase context platform. The design system is optimized for developer tools with a focus on speed, clarity, and accessibility.

**Design Philosophy:**
- Developer-first UX with keyboard-driven workflows
- Bold simplicity: function over decoration
- Dark mode as primary theme
- WCAG 2.1 AA accessibility compliance
- Built for Next.js 14+, Tailwind CSS 3+, and shadcn/ui

---

## Documentation Structure

### 📘 [Design System](./design-system.md)
**Complete design tokens, components, and implementation guidelines**

Contains:
- **Color System:** Brand colors, semantic colors, neutral scales, dark mode
- **Typography:** Font families, type scale, responsive typography
- **Spacing & Layout:** 4px grid system, breakpoints, containers
- **Elevation & Shadows:** Shadow system for depth hierarchy
- **Border Radius:** Consistent rounding scale
- **Animation & Motion:** Timing, easing, common animations
- **Iconography:** Lucide Icons library and usage
- **Component Patterns:** Buttons, cards, forms, navigation, badges, toasts
- **Dark Mode:** Primary theme implementation
- **Design Tokens Export:** Code-ready token definitions

**Use this for:**
- Frontend implementation
- Component development
- Visual consistency
- Style guide reference

---

### 🔄 [User Flows](./user-flows.md)
**Detailed user journeys for all MVP features**

Contains:
- **Onboarding Flow:** Account setup to first indexed source
- **Adding Sources:** Step-by-step source creation process
- **Search Flow:** Finding documentation across sources
- **Source Management:** Viewing, updating, pausing, deleting sources
- **Dashboard Overview:** Main landing page structure
- **Settings & Configuration:** Account, API keys, preferences
- **Error Handling:** Network errors, validation, server errors
- **Mobile Patterns:** Responsive adaptations
- **Accessibility Patterns:** Keyboard navigation, screen readers

**Use this for:**
- Understanding user needs
- Feature implementation planning
- UX testing and validation
- Identifying edge cases

---

### 📐 [Wireframes](./wireframes.md)
**Text-based wireframes for all key pages**

Contains:
- **Landing Page:** Marketing site layout
- **Dashboard:** Main overview with stats and recent activity
- **Sources List:** All indexed sources with filters
- **Source Detail:** Individual source statistics and pages
- **Search Page:** Search interface and results
- **Add Source Modal:** Source creation form
- **Indexing Progress:** Live progress tracking
- **Settings Page:** Tabbed settings interface
- **Empty States:** New user onboarding states
- **Error States:** Failure scenarios
- **Responsive Layouts:** Mobile, tablet, desktop variations

**Use this for:**
- Page structure reference
- Layout implementation
- Responsive design planning
- Component placement

---

### ♿ [Accessibility Guidelines](./accessibility-guidelines.md)
**WCAG 2.1 AA compliance patterns and testing**

Contains:
- **Perceivable:** Text alternatives, color contrast, adaptable content
- **Operable:** Keyboard access, touch targets, predictable behavior
- **Understandable:** Clear language, error handling, consistent navigation
- **Robust:** Valid HTML, ARIA patterns, status messages
- **Component Patterns:** Modals, dropdowns, tabs, toasts, progress
- **Testing Checklist:** Automated and manual testing procedures
- **Common Mistakes:** Anti-patterns to avoid
- **Resources:** Tools, documentation, screen readers

**Use this for:**
- Accessibility implementation
- Component development
- Testing and validation
- Compliance verification

---

## Quick Start for Developers

### 1. Review Design System
Start with `design-system.md` to understand:
- Color palette and usage
- Typography scale
- Spacing system
- Component variants

### 2. Check User Flows
Review `user-flows.md` for the feature you're building to understand:
- User expectations
- Happy paths and edge cases
- Error handling requirements
- Success criteria

### 3. Reference Wireframes
Use `wireframes.md` to implement:
- Page layouts
- Component placement
- Responsive behavior
- Empty and error states

### 4. Implement Accessibly
Follow `accessibility-guidelines.md` to ensure:
- Keyboard navigation works
- Screen readers can access content
- Color contrast is sufficient
- ARIA patterns are correct

---

## Implementation Stack

### Core Technologies
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript 5.3+
- **Styling:** Tailwind CSS 3+
- **Components:** shadcn/ui
- **Icons:** Lucide Icons

### Design Tokens in Code

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // See design-system.md for complete palette
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      // See design-system.md for complete configuration
    },
  },
}
```

### Component Library Setup

```bash
# Install shadcn/ui components
npx shadcn-ui@latest init

# Add components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
```

---

## Design Principles

### 1. Developer-First
**Target Users:** AI-first developers, DevRel engineers, engineering managers

**Implications:**
- Keyboard-driven workflows (shortcuts like `/` for search)
- Dense information display (developers can handle complexity)
- Terminal-inspired aesthetics
- Fast, minimal animations
- Dark mode as default

### 2. Bold Simplicity
**What it means:**
- Every element has a purpose (no decorative fluff)
- Clear visual hierarchy using size, weight, color
- Generous whitespace for breathing room
- One primary action per screen section
- Progressive disclosure of complexity

**What it doesn't mean:**
- Boring or minimal (bold ≠ decoration, simple ≠ empty)
- Removing helpful guidance or context

### 3. Speed & Efficiency
**Performance Targets:**
- Page load: <1 second
- Search results: <2 seconds
- Smooth 60 FPS interactions
- Instant feedback on actions

**UX Efficiency:**
- Minimize clicks to accomplish tasks
- Provide keyboard shortcuts
- Show loading states immediately
- Allow background operations

### 4. Trustworthy & Transparent
**Why developers need to trust ContextStream:**
- They're giving us their documentation (sensitive)
- Results inform critical decisions
- Integration with AI workflows requires accuracy

**How we build trust:**
- Show data sources for search results
- Display last updated timestamps
- Expose system status (indexing progress, errors)
- Clear error messages with suggested fixes
- No hidden magic (explain what's happening)

### 5. Accessible by Default
**Commitment:**
- WCAG 2.1 AA minimum (AAA where feasible)
- Keyboard navigation for all features
- Screen reader optimized
- Respect user motion preferences
- Clear focus indicators

**Why it matters:**
- Legal compliance
- Broader user base (developers with disabilities exist)
- Better UX for everyone (keyboard users, mobile, etc.)
- Future-proof (voice control, AI assistants)

---

## Target User Personas

### Alex - AI-First Developer
**Profile:** 29, Senior Full-Stack Developer
**Needs:** Fast access to accurate, up-to-date docs while coding with Claude
**Pain Points:** Outdated AI responses, copy-pasting docs, context limits
**Workflow:** Heavy keyboard user, multiple monitors, dark mode always

### Jordan - DevRel Engineer
**Profile:** 34, Developer Relations at open-source framework
**Needs:** Ensure docs are AI-accessible, track what's being searched
**Pain Points:** Community asks already-answered questions, fragmented docs
**Workflow:** Content creation, community support, analytics monitoring

### Morgan - Engineering Manager
**Profile:** 42, Platform Team Manager
**Needs:** Team knowledge management, reduce onboarding time
**Pain Points:** Scattered internal docs, tribal knowledge, slow onboarding
**Workflow:** Strategic planning, team productivity, tool evaluation

### Sam - Independent Consultant
**Profile:** 37, Technical Consultant
**Needs:** Quick context switching between client projects
**Pain Points:** Multiple tech stacks, billable hours spent researching
**Workflow:** Multi-project juggling, efficiency-focused, cloud-sync needed

---

## Design Decisions & Rationale

### Why Dark Mode as Default?
**Rationale:**
- Target users are developers who typically use dark editors
- Reduces eye strain during long sessions
- Terminal/command-line aesthetic feels familiar
- Developer tool convention (GitHub, VS Code, Dash, DevDocs)

**Implementation:** Still provide light mode, but optimize for dark first.

---

### Why Minimal Animations?
**Rationale:**
- Developers prioritize speed over polish
- Animations can feel like delays if overused
- Respect `prefers-reduced-motion`
- Developer tools (terminals, IDEs) rarely animate

**Implementation:** Fast transitions (100-200ms), no decorative effects, functional only (loading, state changes, navigation).

---

### Why Keyboard-First Navigation?
**Rationale:**
- Developers rarely leave keyboard while coding
- Efficiency over mouse precision
- Terminal muscle memory (Vim, Emacs shortcuts)
- Accessibility benefit (screen readers, motor disabilities)

**Implementation:** `/` for search, `Esc` for close, arrow keys for lists, tab for navigation, visible focus.

---

### Why shadcn/ui Over Other Component Libraries?
**Rationale:**
- Copy-paste approach (full code ownership, no npm bloat)
- Radix UI primitives (accessible by default)
- Tailwind CSS integration (consistent with our system)
- Highly customizable (not opinionated styles)
- Modern stack (React Server Components, TypeScript)

**Alternatives considered:**
- **Material UI:** Too opinionated, Google aesthetic doesn't fit
- **Chakra UI:** Runtime styles, heavier bundle size
- **Ant Design:** Enterprise/admin aesthetic, not developer tool
- **Headless UI:** Good, but shadcn/ui provides more batteries-included

---

### Why Inter & JetBrains Mono?
**Rationale:**
- **Inter:** Designed for UIs, legible at small sizes, open-source, widely adopted
- **JetBrains Mono:** Developer-focused, excellent ligatures, clear character differentiation (0/O, 1/l/I)

**Alternatives considered:**
- **SF Pro / System Fonts:** Good fallback, but Inter is more refined
- **IBM Plex:** Excellent, but Inter has better small-size legibility
- **Fira Code:** Great ligatures, but JetBrains Mono is more modern

---

## MVP Scope (Phase 1)

### In Scope
✅ Dashboard with source overview
✅ Add documentation sources (websites)
✅ Live indexing progress
✅ Search across all indexed sources
✅ Source management (update, pause, delete)
✅ Settings (profile, API keys, preferences)
✅ Dark mode (primary theme)
✅ Keyboard navigation
✅ WCAG 2.1 AA accessibility
✅ Mobile responsive
✅ Empty and error states

### Out of Scope (Future Phases)
❌ GitHub repository indexing (Phase 2)
❌ Workspaces/multi-tenancy (Phase 2)
❌ Light mode theme (Phase 2)
❌ Advanced analytics (Phase 2)
❌ Collaborative features (Phase 3)
❌ Custom scrapers/plugins (Phase 3)
❌ Mobile native apps (Phase 4)

---

## Component Checklist

### shadcn/ui Components Needed

**Forms:**
- [x] Button
- [x] Input
- [x] Label
- [x] Textarea
- [x] Select
- [x] Checkbox
- [x] Radio Group

**Layout:**
- [x] Card (with Header, Content, Footer)
- [x] Separator
- [x] Tabs

**Feedback:**
- [x] Toast (using Sonner)
- [x] Dialog (Modal)
- [x] Alert Dialog
- [x] Progress

**Navigation:**
- [x] Dropdown Menu
- [x] Navigation Menu
- [x] Breadcrumb

**Data Display:**
- [x] Badge
- [x] Table
- [x] Skeleton (loading)

**Utilities:**
- [x] Tooltip
- [x] Popover
- [x] Command (search palette)

---

## Testing Strategy

### Visual Regression Testing
**Tools:** Playwright, Chromatic
**Scope:** All page layouts, component states, responsive breakpoints

### Accessibility Testing
**Automated:** axe DevTools, Lighthouse, Pa11y
**Manual:** Keyboard navigation, screen reader (VoiceOver, NVDA)
**Scope:** Every page and component

### Cross-Browser Testing
**Browsers:** Chrome, Firefox, Safari, Edge
**Devices:** Desktop (1920x1080, 1366x768), Tablet (iPad), Mobile (iPhone, Android)

### Performance Testing
**Tools:** Lighthouse, WebPageTest
**Targets:**
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Cumulative Layout Shift: <0.1
- Largest Contentful Paint: <2.5s

---

## Handoff Checklist

### Before Development Starts
- [ ] Design system reviewed and approved
- [ ] User flows validated with user research
- [ ] Wireframes cover all MVP screens
- [ ] Accessibility requirements understood
- [ ] Component library selected and set up
- [ ] Design tokens exported to code

### During Development
- [ ] Regular design reviews (weekly)
- [ ] Component library built in Storybook
- [ ] Accessibility tested continuously
- [ ] Responsive layouts tested on real devices
- [ ] Empty and error states implemented

### Before Launch
- [ ] Complete accessibility audit
- [ ] Cross-browser testing passed
- [ ] Performance targets met
- [ ] User testing completed (5-10 users)
- [ ] Design documentation updated with any changes

---

## Maintenance & Updates

### When to Update These Docs

**Design System:**
- New components added
- Color palette changes
- Typography scale adjustments
- Spacing system modifications

**User Flows:**
- New features added
- User feedback reveals pain points
- Edge cases discovered in production
- Significant flow changes

**Wireframes:**
- Major layout changes
- New page templates
- Responsive behavior updates

**Accessibility Guidelines:**
- WCAG updates
- New ARIA patterns needed
- Screen reader compatibility issues

### Versioning
- Major version: Breaking changes to design system
- Minor version: New components, flows, or patterns
- Patch version: Documentation fixes, clarifications

---

## Related Documentation

### Product
- `/docs/product-manager-output.md` - User personas, features, success metrics
- `/docs/ARCHITECTURE_NEXTJS.md` - Technical architecture and stack

### Design
- `/docs/design/design-system.md` - Core design system
- `/docs/design/user-flows.md` - User journeys
- `/docs/design/wireframes.md` - Page layouts
- `/docs/design/accessibility-guidelines.md` - A11y standards

---

## Contact & Feedback

### Questions?
- Design questions: Refer to specific design doc section
- Implementation questions: Check architecture docs
- Accessibility questions: See accessibility guidelines

### Feedback
- Found an inconsistency? Document it and suggest a fix
- Missing a pattern? Check if it's in future scope or propose addition
- Accessibility issue? Flag immediately and refer to guidelines

---

## Changelog

### Version 1.0 (2025-10-09)
- Initial design system documentation
- Complete user flows for MVP features
- Wireframes for all key pages
- WCAG 2.1 AA accessibility guidelines
- Implementation guidance for Next.js + Tailwind + shadcn/ui

---

## Appendix: Design Resources

### Design Tools
- **Figma:** Component library and prototypes (coming soon)
- **Storybook:** Component documentation and testing
- **Chromatic:** Visual regression testing

### Color Tools
- [Coolors](https://coolors.co/) - Palette generation
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colorable](https://colorable.jxnblk.com/) - Contrast tester

### Typography Tools
- [Type Scale](https://typescale.com/) - Scale calculator
- [Modular Scale](https://www.modularscale.com/)

### Layout Tools
- [Grid Calculator](https://gridcalculator.dk/)
- [Responsive Breakpoints](https://www.responsivebreakpoints.com/)

### Accessibility Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WAVE](https://wave.webaim.org/)
- [Color Oracle](https://colororacle.org/) - Color blindness simulator

### Icon Resources
- [Lucide Icons](https://lucide.dev/) - Primary icon library
- [Heroicons](https://heroicons.com/) - Alternative
- [Feather Icons](https://feathericons.com/)

### Inspiration
- [DevDocs](https://devdocs.io/) - Documentation browser
- [Dash](https://kapeli.com/dash) - Offline documentation
- [Linear](https://linear.app/) - Developer tool design
- [Vercel](https://vercel.com/) - Modern web UI
- [GitHub](https://github.com/) - Developer platform
- [Arc Browser](https://arc.net/) - Modern browser UX

---

**Last Updated:** 2025-10-09
**Maintained By:** Design Team
**Status:** Active (MVP Documentation Complete)
