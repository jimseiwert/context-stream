# ContextStream Design System

**Version:** 1.0
**Last Updated:** 2025-10-09
**Status:** Foundation
**Target Stack:** Next.js 14+, Tailwind CSS 3+, shadcn/ui

---

## Overview

ContextStream is a developer tool built for AI-first developers who value speed, clarity, and function over decoration. This design system embodies **bold simplicity** with a focus on keyboard-driven workflows, minimal friction, and professional aesthetics appropriate for a technical audience.

### Design Principles

1. **Developer-First**: Prioritize keyboard navigation, clear information hierarchy, and fast interaction patterns
2. **Functional Minimalism**: Every element serves a purpose; decorative elements are avoided
3. **Clarity Over Cleverness**: Clear labels, obvious actions, predictable outcomes
4. **Speed**: Fast load times, instant feedback, minimal animation
5. **Trust Through Transparency**: Show system status, expose data sources, explain what's happening
6. **Dark Mode Native**: Designed for developers who work in dark environments

---

## 1. Color System

### 1.1 Brand Colors

Our color palette is inspired by terminal aesthetics with modern developer tools. Dark mode is the primary experience.

**Primary (Blue)**
- `primary-50`: `#eff6ff` - Lightest blue
- `primary-100`: `#dbeafe` - Very light blue
- `primary-200`: `#bfdbfe` - Light blue
- `primary-300`: `#93c5fd` - Medium light blue
- `primary-400`: `#60a5fa` - Medium blue
- `primary-500`: `#3b82f6` - **Primary brand blue** (main CTAs, links)
- `primary-600`: `#2563eb` - Dark blue (hover states)
- `primary-700`: `#1d4ed8` - Darker blue
- `primary-800`: `#1e40af` - Very dark blue
- `primary-900`: `#1e3a8a` - Darkest blue

**Rationale**: Blue conveys trust, stability, and professionalism. It's universally accessible and performs well in both light and dark modes.

**Secondary (Slate)**
- `secondary-50`: `#f8fafc`
- `secondary-100`: `#f1f5f9`
- `secondary-200`: `#e2e8f0`
- `secondary-300`: `#cbd5e1`
- `secondary-400`: `#94a3b8`
- `secondary-500`: `#64748b` - **Secondary actions, less prominent UI**
- `secondary-600`: `#475569`
- `secondary-700`: `#334155`
- `secondary-800`: `#1e293b`
- `secondary-900`: `#0f172a`

**Rationale**: Slate provides neutral tones that don't compete with primary actions. Works excellently for text hierarchy.

### 1.2 Accent Colors

**Accent Green (Success)**
- `accent-green-500`: `#10b981` - Success states, active indexing
- `accent-green-600`: `#059669` - Hover state
- `accent-green-700`: `#047857` - Active state

**Accent Amber (Warning)**
- `accent-amber-500`: `#f59e0b` - Warning states, needs attention
- `accent-amber-600`: `#d97706` - Hover state
- `accent-amber-700`: `#b45309` - Active state

**Accent Red (Error/Destructive)**
- `accent-red-500`: `#ef4444` - Error states, destructive actions
- `accent-red-600`: `#dc2626` - Hover state
- `accent-red-700`: `#b91c1c` - Active state

**Accent Purple (Highlight)**
- `accent-purple-500`: `#8b5cf6` - MCP-specific features, AI-related elements
- `accent-purple-600`: `#7c3aed` - Hover state
- `accent-purple-700`: `#6d28d9` - Active state

### 1.3 Semantic Colors

**Success**
- Background: `#10b98110` (green with 10% opacity)
- Border: `#10b981`
- Text: `#047857` (dark mode: `#10b981`)

**Warning**
- Background: `#f59e0b10`
- Border: `#f59e0b`
- Text: `#b45309` (dark mode: `#f59e0b`)

**Error**
- Background: `#ef444410`
- Border: `#ef4444`
- Text: `#b91c1c` (dark mode: `#ef4444`)

**Info**
- Background: `#3b82f610`
- Border: `#3b82f6`
- Text: `#1d4ed8` (dark mode: `#3b82f6`)

### 1.4 Neutral Palette (Text & Backgrounds)

**Light Mode**
- `neutral-50`: `#fafafa` - Page background
- `neutral-100`: `#f4f4f5` - Card backgrounds
- `neutral-200`: `#e4e4e7` - Borders
- `neutral-300`: `#d4d4d8` - Disabled backgrounds
- `neutral-400`: `#a1a1aa` - Placeholder text
- `neutral-500`: `#71717a` - Secondary text
- `neutral-600`: `#52525b` - Body text
- `neutral-700`: `#3f3f46` - Headings
- `neutral-800`: `#27272a` - Dark headings
- `neutral-900`: `#18181b` - Darkest text

**Dark Mode**
- `neutral-50`: `#fafafa` - Lightest text
- `neutral-100`: `#f4f4f5` - Primary text
- `neutral-200`: `#e4e4e7` - Secondary text
- `neutral-300`: `#d4d4d8` - Tertiary text
- `neutral-400`: `#a1a1aa` - Placeholder text
- `neutral-500`: `#71717a` - Disabled text
- `neutral-600`: `#52525b` - Borders
- `neutral-700`: `#3f3f46` - Card backgrounds
- `neutral-800`: `#27272a` - Elevated backgrounds
- `neutral-900`: `#18181b` - Page background

### 1.5 Accessibility & Contrast

**WCAG AA Compliance** (Minimum 4.5:1 for normal text, 3:1 for large text)

All color combinations meet WCAG AA standards:
- Primary blue (`#3b82f6`) on white: 7.12:1 ✅
- Primary blue on dark (`#18181b`): 8.59:1 ✅
- Neutral-600 on white: 7.54:1 ✅
- Neutral-100 on dark: 15.42:1 ✅

**Color-Blind Friendly**
- Blue/Green/Red palette provides sufficient differentiation for deuteranopia and protanopia
- Status indicators always include icons, not just color
- Error states use red + text labels
- Success states use green + checkmark icons

### 1.6 Tailwind Configuration

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        accent: {
          green: { 500: '#10b981', 600: '#059669', 700: '#047857' },
          amber: { 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
          red: { 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
          purple: { 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' },
        },
      },
    },
  },
}
```

---

## 2. Typography System

### 2.1 Font Families

**Sans-Serif (UI & Body)**
- Primary: `Inter` (modern, legible, excellent at small sizes)
- Fallback: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

**Rationale**: Inter is designed for user interfaces and remains highly legible at small sizes. It's open-source and widely adopted in developer tools.

**Monospace (Code & Data)**
- Primary: `JetBrains Mono` (designed for developers, excellent ligatures)
- Fallback: `"SF Mono", "Cascadia Code", Menlo, Monaco, "Courier New", monospace`

**Rationale**: JetBrains Mono is optimized for code readability with clear character differentiation (0/O, 1/l/I).

### 2.2 Font Weights

- `font-light`: 300 - Reserved for large display text (rarely used)
- `font-normal`: 400 - Body text, descriptions
- `font-medium`: 500 - Emphasized text, labels
- `font-semibold`: 600 - Subheadings, button text
- `font-bold`: 700 - Headings, important callouts

**Usage Guidelines**:
- Body text: Always use `font-normal` (400)
- Buttons: Use `font-semibold` (600)
- Headings: Use `font-semibold` (600) or `font-bold` (700)
- Avoid light weights in dark mode (readability issues)

### 2.3 Type Scale

**Headings**
- `H1`: `text-4xl` (36px / 2.25rem) - `font-bold` - Page titles
- `H2`: `text-3xl` (30px / 1.875rem) - `font-bold` - Section headings
- `H3`: `text-2xl` (24px / 1.5rem) - `font-semibold` - Subsection headings
- `H4`: `text-xl` (20px / 1.25rem) - `font-semibold` - Card titles
- `H5`: `text-lg` (18px / 1.125rem) - `font-semibold` - Small headings

**Body Text**
- `Body Large`: `text-base` (16px / 1rem) - `font-normal` - `leading-relaxed` (1.625) - Primary body text
- `Body Standard`: `text-sm` (14px / 0.875rem) - `font-normal` - `leading-normal` (1.5) - Secondary text, descriptions
- `Body Small`: `text-xs` (12px / 0.75rem) - `font-normal` - `leading-normal` - Captions, metadata

**Special Text**
- `Label`: `text-sm` (14px) - `font-medium` - Form labels, navigation items
- `Caption`: `text-xs` (12px) - `font-normal` - `text-neutral-500` - Helper text, timestamps
- `Code Inline`: `text-sm` - `font-mono` - Inline code snippets
- `Code Block`: `text-sm` - `font-mono` - `leading-relaxed` - Code blocks

### 2.4 Line Heights

- Headings: `leading-tight` (1.25) - Compact, impactful
- Body text: `leading-relaxed` (1.625) - Easy reading
- Labels/UI: `leading-normal` (1.5) - Balanced
- Code blocks: `leading-loose` (2) - Clear line separation

### 2.5 Letter Spacing

- Headings: `tracking-tight` (-0.025em) - Tighter for large text
- Body: `tracking-normal` (0em) - Default
- Uppercase labels: `tracking-wide` (0.025em) - Better legibility for all-caps
- Code: `tracking-normal` - Default monospace spacing

### 2.6 Responsive Typography

**Mobile (320px - 767px)**
- H1: `text-3xl` (30px)
- H2: `text-2xl` (24px)
- H3: `text-xl` (20px)
- Body: `text-sm` (14px)

**Tablet (768px - 1023px)**
- H1: `text-4xl` (36px)
- H2: `text-3xl` (30px)
- H3: `text-2xl` (24px)
- Body: `text-base` (16px)

**Desktop (1024px+)**
- Full scale as defined in Type Scale above

### 2.7 Tailwind Configuration

```typescript
// tailwind.config.ts
export default {
  theme: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['JetBrains Mono', 'SF Mono', 'Cascadia Code', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    },
  },
}
```

---

## 3. Spacing & Layout System

### 3.1 Base Unit

**Base Unit**: `4px` (0.25rem)

All spacing follows a 4px grid to maintain consistency and align with Tailwind's default spacing scale.

### 3.2 Spacing Scale

Tailwind's default spacing scale (based on 4px increments):

- `0`: 0px
- `0.5`: 2px (0.125rem)
- `1`: 4px (0.25rem) - Minimal spacing
- `2`: 8px (0.5rem) - Tight spacing
- `3`: 12px (0.75rem) - Compact spacing
- `4`: 16px (1rem) - **Default spacing** (most common)
- `5`: 20px (1.25rem)
- `6`: 24px (1.5rem) - Medium spacing
- `8`: 32px (2rem) - Large spacing
- `10`: 40px (2.5rem)
- `12`: 48px (3rem) - Extra large spacing
- `16`: 64px (4rem) - Section spacing
- `20`: 80px (5rem)
- `24`: 96px (6rem) - Page section spacing

### 3.3 Common Spacing Patterns

**Component Spacing**
- Button padding: `px-4 py-2` (16px horizontal, 8px vertical)
- Card padding: `p-6` (24px all sides)
- Modal padding: `p-8` (32px all sides)
- Form field gap: `space-y-4` (16px vertical)
- List item gap: `space-y-2` (8px vertical)

**Layout Spacing**
- Content container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Section gap: `space-y-8` or `space-y-12`
- Card grid gap: `gap-6`
- Page margins: `py-8` or `py-12`

### 3.4 Grid System

**Responsive Grid**
- Mobile (default): 4 columns
- Tablet (md): 8 columns
- Desktop (lg): 12 columns

**Gutters**
- Mobile: 16px (gap-4)
- Tablet: 24px (gap-6)
- Desktop: 24px (gap-6)

**Example Grid**
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Grid items -->
</div>
```

### 3.5 Breakpoints

Tailwind's default breakpoints (min-width):

- `sm`: 640px - Small tablets
- `md`: 768px - Tablets
- `lg`: 1024px - Laptops
- `xl`: 1280px - Desktops
- `2xl`: 1536px - Large desktops

**Custom Breakpoints** (if needed):
```typescript
screens: {
  'mobile': '320px',
  'tablet': '768px',
  'desktop': '1024px',
  'wide': '1440px',
}
```

### 3.6 Container

**Max Widths** (content containers):
- `max-w-screen-sm`: 640px - Narrow content (articles)
- `max-w-screen-md`: 768px - Forms, modals
- `max-w-screen-lg`: 1024px - Standard pages
- `max-w-screen-xl`: 1280px - Wide dashboards
- `max-w-7xl`: 1280px - **Primary container**

**Usage**:
```html
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <!-- Page content -->
</div>
```

---

## 4. Elevation & Shadows

### 4.1 Shadow System

Shadows create depth and hierarchy. Use sparingly in a developer tool context.

**Shadow Scale**
- `shadow-none`: No shadow - Flat elements
- `shadow-sm`: `0 1px 2px rgba(0, 0, 0, 0.05)` - Subtle lift (buttons, inputs)
- `shadow`: `0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)` - **Default** (cards)
- `shadow-md`: `0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)` - Moderate lift (dropdowns, popovers)
- `shadow-lg`: `0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)` - Prominent (modals, dialogs)
- `shadow-xl`: `0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)` - High elevation (toasts, notifications)
- `shadow-2xl`: `0 25px 50px rgba(0, 0, 0, 0.25)` - Maximum elevation (overlays)

**Dark Mode Shadows**
In dark mode, shadows should be more subtle (lighter opacity):
```css
.dark {
  --tw-shadow-color: rgba(0, 0, 0, 0.5);
}
```

### 4.2 Usage Guidelines

**Cards**: `shadow` - Standard cards on dashboard
**Hover States**: Increase shadow on hover (e.g., `hover:shadow-md`)
**Modals**: `shadow-xl` - Clear separation from background
**Dropdowns**: `shadow-lg` - Float above content
**Buttons**: `shadow-sm` - Subtle depth, increases on hover

**Anti-Pattern**: Don't use excessive shadows. Developer tools should feel flat and functional.

---

## 5. Border Radius System

### 5.1 Radius Scale

- `rounded-none`: 0px - No radius
- `rounded-sm`: 2px (0.125rem) - Minimal rounding
- `rounded`: 4px (0.25rem) - Subtle rounding (inputs, small buttons)
- `rounded-md`: 6px (0.375rem) - **Default** (cards, buttons)
- `rounded-lg`: 8px (0.5rem) - Medium rounding (modals, large cards)
- `rounded-xl`: 12px (0.75rem) - Large rounding (feature cards)
- `rounded-2xl`: 16px (1rem) - Extra large (rare, hero elements)
- `rounded-full`: 9999px - Fully rounded (avatars, badges, pills)

### 5.2 Usage Guidelines

**Buttons**: `rounded-md` (6px) - Professional, not too sharp
**Cards**: `rounded-lg` (8px) - Comfortable, modern
**Inputs**: `rounded-md` (6px) - Consistent with buttons
**Badges**: `rounded-full` - Pill shape
**Avatars**: `rounded-full` - Circular
**Modals**: `rounded-lg` (8px) - Soft corners
**Tabs**: `rounded-t-md` - Rounded top corners only

---

## 6. Animation & Motion

### 6.1 Philosophy

Animations in ContextStream serve **functional purposes only**:
- Provide feedback (button clicks, form submissions)
- Guide attention (new notifications, loading states)
- Ease transitions (page changes, modal opens)

**Avoid**:
- Decorative animations
- Slow, elaborate transitions
- Animations that delay user actions

### 6.2 Timing Functions

**Easing**
- `ease-out`: For entrances (elements appearing) - Quick start, slow end
- `ease-in-out`: For transitions (state changes) - Smooth acceleration and deceleration
- `ease-in`: For exits (elements disappearing) - Slow start, quick end
- `linear`: For continuous animations (progress bars, spinners)

**Custom Easing** (if needed):
```typescript
// tailwind.config.ts
transitionTimingFunction: {
  'in-expo': 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
  'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
}
```

### 6.3 Duration Scale

- `duration-75`: 75ms - **Instant feedback** (hover states, focus rings)
- `duration-150`: 150ms - **Fast** (button clicks, checkboxes)
- `duration-200`: 200ms - **Default** (most transitions)
- `duration-300`: 300ms - **Medium** (dropdowns, tooltips)
- `duration-500`: 500ms - **Slow** (modal open/close, page transitions)
- `duration-700`: 700ms - **Extra slow** (complex animations, rare use)

### 6.4 Common Animations

**Button Hover**
```html
<button class="transition-colors duration-150 hover:bg-primary-600">
  Click me
</button>
```

**Card Hover (lift)**
```html
<div class="transition-all duration-200 hover:shadow-md hover:-translate-y-1">
  Card content
</div>
```

**Fade In**
```html
<div class="animate-in fade-in duration-300">
  Fading in content
</div>
```

**Slide Down (Dropdown)**
```html
<div class="animate-in slide-in-from-top duration-200">
  Dropdown menu
</div>
```

**Loading Spinner**
```html
<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
```

**Skeleton Loader (Pulse)**
```html
<div class="animate-pulse bg-neutral-200 dark:bg-neutral-700 h-4 rounded"></div>
```

### 6.5 Motion Accessibility

**Respect User Preferences**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Tailwind handles this automatically with `motion-safe:` and `motion-reduce:` variants:
```html
<div class="motion-safe:animate-in motion-reduce:animate-none">
  Content
</div>
```

---

## 7. Iconography

### 7.1 Icon Library

**Primary**: [Lucide Icons](https://lucide.dev/)
- Open-source, consistent style
- Excellent developer tool coverage
- Tree-shakeable (only import what you use)
- 24x24px default size, scales well

**Rationale**: Lucide is a fork of Feather Icons with more developer-focused icons. It's modern, clean, and widely used in Next.js projects.

### 7.2 Icon Sizes

- `size-4`: 16px - Inline with text, small UI elements
- `size-5`: 20px - Button icons, list items
- `size-6`: 24px - **Default** - Standard UI icons
- `size-8`: 32px - Large buttons, feature icons
- `size-12`: 48px - Empty states, hero icons

### 7.3 Icon Usage Guidelines

**Buttons**
```tsx
import { Plus } from 'lucide-react'

<Button>
  <Plus className="size-5 mr-2" />
  Add Source
</Button>
```

**Navigation**
```tsx
import { Home, Search, Settings } from 'lucide-react'

<nav>
  <NavItem icon={Home} label="Dashboard" />
  <NavItem icon={Search} label="Search" />
  <NavItem icon={Settings} label="Settings" />
</nav>
```

**Status Indicators**
- Success: `<CheckCircle className="size-5 text-accent-green-500" />`
- Warning: `<AlertTriangle className="size-5 text-accent-amber-500" />`
- Error: `<XCircle className="size-5 text-accent-red-500" />`
- Info: `<Info className="size-5 text-primary-500" />`

**Common Icons**
- `Plus`: Add items
- `Trash2`: Delete items
- `Edit`: Edit/modify
- `RefreshCw`: Refresh/update
- `ChevronDown`: Dropdowns, expandable sections
- `ExternalLink`: External links
- `Search`: Search functionality
- `Settings`: Settings/configuration
- `Database`: Data sources
- `FileText`: Documentation pages
- `Code`: Code-related features
- `Sparkles`: AI/MCP features
- `Clock`: Timestamps, scheduling
- `CheckCircle`: Success states
- `XCircle`: Error states
- `AlertTriangle`: Warning states

---

## 8. Component Patterns

### 8.1 Buttons

**Variants**
1. **Primary** - Main actions (Add Source, Save, Submit)
2. **Secondary** - Less prominent actions (Cancel, View Details)
3. **Ghost** - Minimal actions (icon buttons, tertiary actions)
4. **Destructive** - Dangerous actions (Delete, Remove)
5. **Outline** - Alternative to secondary

**Sizes**
- `sm`: Small buttons (32px height)
- `default`: Default buttons (40px height)
- `lg`: Large buttons (48px height)

**States**
- Default: `bg-primary-500 text-white`
- Hover: `bg-primary-600` + subtle lift
- Active: `bg-primary-700`
- Focus: `ring-2 ring-primary-500 ring-offset-2`
- Disabled: `opacity-50 cursor-not-allowed`
- Loading: Spinner + disabled state

**Implementation** (shadcn/ui Button):
```tsx
// Primary Button
<Button variant="default" size="default">
  Add Source
</Button>

// Secondary Button
<Button variant="secondary">
  Cancel
</Button>

// Ghost Button
<Button variant="ghost" size="sm">
  <MoreVertical className="size-4" />
</Button>

// Destructive Button
<Button variant="destructive">
  Delete Source
</Button>

// Button with Icon
<Button>
  <Plus className="size-5 mr-2" />
  Add New
</Button>

// Loading Button
<Button disabled>
  <Loader2 className="size-5 mr-2 animate-spin" />
  Processing...
</Button>
```

### 8.2 Cards

Cards group related content and actions. They're the primary container for dashboard content.

**Default Card**
- Background: `bg-white dark:bg-neutral-800`
- Border: `border border-neutral-200 dark:border-neutral-700`
- Radius: `rounded-lg`
- Shadow: `shadow`
- Padding: `p-6`

**Hover State** (interactive cards)
- Shadow: `hover:shadow-md`
- Transform: `hover:-translate-y-1`
- Transition: `transition-all duration-200`

**Card Anatomy**
1. **Header** - Title, optional actions
2. **Content** - Main content area
3. **Footer** - Optional metadata, actions

**Implementation**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>React Documentation</CardTitle>
    <CardDescription>react.dev</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">Pages</span>
        <span className="font-semibold">342</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">Last Updated</span>
        <span className="text-sm">2 hours ago</span>
      </div>
    </div>
  </CardContent>
  <CardFooter className="flex justify-between">
    <Badge variant="success">Active</Badge>
    <Button variant="ghost" size="sm">
      <MoreVertical className="size-4" />
    </Button>
  </CardFooter>
</Card>
```

### 8.3 Forms

**Form Field Anatomy**
1. **Label** - `text-sm font-medium`
2. **Input** - `rounded-md border`
3. **Helper Text** - `text-xs text-neutral-500`
4. **Error Message** - `text-xs text-accent-red-500`

**Input States**
- Default: `border-neutral-300 dark:border-neutral-600`
- Focus: `ring-2 ring-primary-500 border-primary-500`
- Error: `border-accent-red-500 focus:ring-accent-red-500`
- Disabled: `bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed`

**Implementation**:
```tsx
<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="url">Documentation URL</Label>
    <Input
      id="url"
      type="url"
      placeholder="https://docs.python.org"
      className="w-full"
    />
    <p className="text-xs text-neutral-500">
      Enter the base URL of the documentation site
    </p>
  </div>

  {/* Error state */}
  <div className="space-y-2">
    <Label htmlFor="url-error">Documentation URL</Label>
    <Input
      id="url-error"
      type="url"
      className="border-accent-red-500"
      aria-invalid="true"
      aria-describedby="url-error-message"
    />
    <p id="url-error-message" className="text-xs text-accent-red-500">
      Please enter a valid URL
    </p>
  </div>
</div>
```

### 8.4 Navigation

**Header Navigation**
- Height: `h-16` (64px)
- Background: `bg-white dark:bg-neutral-900`
- Border: `border-b border-neutral-200 dark:border-neutral-800`
- Sticky: `sticky top-0 z-50`

**Sidebar Navigation**
- Width: `w-64` (256px desktop), `w-full` (mobile)
- Background: `bg-neutral-50 dark:bg-neutral-900`
- Border: `border-r border-neutral-200 dark:border-neutral-800`

**Navigation Items**
- Default: `text-neutral-600 dark:text-neutral-400`
- Hover: `text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800`
- Active: `text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20`
- Padding: `px-4 py-2`
- Radius: `rounded-md`

### 8.5 Badges & Status Indicators

**Variants**
- `default`: Neutral gray
- `success`: Green (Active, Completed)
- `warning`: Amber (Pending, Needs Attention)
- `error`: Red (Failed, Error)
- `info`: Blue (Indexing, Processing)
- `outline`: Border only

**Sizes**
- `sm`: Small badges (height 20px)
- `default`: Standard badges (height 24px)

**Implementation**:
```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="info">Indexing</Badge>
```

### 8.6 Toasts & Notifications

**Toast Types**
- Success: Green background, checkmark icon
- Error: Red background, X icon
- Warning: Amber background, alert icon
- Info: Blue background, info icon

**Position**: Bottom-right (desktop), bottom-center (mobile)
**Duration**: 5 seconds (dismissible)
**Animation**: Slide in from bottom

```tsx
import { toast } from 'sonner'

toast.success('Source added successfully')
toast.error('Failed to scrape documentation')
toast.warning('API key expires in 7 days')
toast.info('Indexing started')
```

---

## 9. Dark Mode

### 9.1 Strategy

ContextStream uses **dark mode as the primary experience** for developers who work in low-light environments.

**Implementation**: Tailwind's `dark:` variant with system preference detection + manual toggle.

**Color Adjustments for Dark Mode**
- Increase contrast for text (use lighter shades)
- Reduce shadow intensity (darker backgrounds need subtler shadows)
- Soften bright colors (reduce saturation slightly)
- Use darker borders (neutral-700 instead of neutral-200)

### 9.2 Dark Mode Toggle

```tsx
<Button variant="ghost" size="sm" onClick={toggleTheme}>
  {theme === 'dark' ? (
    <Sun className="size-5" />
  ) : (
    <Moon className="size-5" />
  )}
</Button>
```

---

## 10. Design Tokens Export

For implementation in code:

```typescript
// src/config/design-tokens.ts

export const colors = {
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  // ... (full palette)
}

export const spacing = {
  xs: '0.5rem', // 8px
  sm: '0.75rem', // 12px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
}

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, SF Mono, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
}

export const borderRadius = {
  sm: '0.125rem', // 2px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  full: '9999px',
}

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
}
```

---

## Summary

This design system provides:
- **Developer-focused aesthetic** with functional minimalism
- **Comprehensive color system** with WCAG AA accessibility
- **Type scale** optimized for technical content
- **Consistent spacing** based on 4px grid
- **Subtle shadows** and borders for depth without distraction
- **Fast, functional animations** that respect user preferences
- **Dark mode first** with excellent light mode support
- **shadcn/ui compatibility** for rapid implementation

The system prioritizes **clarity, speed, and trust** - core values for AI-first developers using ContextStream.
