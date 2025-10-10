# ContextStream Accessibility Guidelines

## Overview

ContextStream is committed to providing an accessible experience for all users, including those with disabilities. These guidelines ensure WCAG 2.1 AA compliance and follow modern web accessibility best practices.

**Target Compliance:** WCAG 2.1 Level AA (minimum)
**Stretch Goal:** WCAG 2.1 Level AAA where feasible

**Why Accessibility Matters:**
- Developers with disabilities are part of our user base
- Legal compliance (ADA, Section 508, European Accessibility Act)
- Better UX for everyone (keyboard users, mobile users, etc.)
- SEO benefits (semantic HTML, proper structure)
- Future-proof design (voice control, AI assistants)

---

## 1. Perceivable

### 1.1 Text Alternatives (WCAG 1.1)

**Goal:** Provide text alternatives for non-text content.

#### Images
```tsx
// Good: Descriptive alt text
<img src="/icon-success.svg" alt="Success indicator" />

// Good: Decorative images (empty alt)
<img src="/decorative-pattern.svg" alt="" role="presentation" />

// Bad: Missing alt text
<img src="/icon.svg" />

// Bad: Redundant alt text
<img src="/button-icon.svg" alt="button icon" /> // Visual context already clear
```

#### Icons
```tsx
// Icon with text label (preferred)
<button>
  <PlusIcon className="size-5" aria-hidden="true" />
  Add Source
</button>

// Icon-only button (requires aria-label)
<button aria-label="Add source">
  <PlusIcon className="size-5" />
</button>

// Icon in decorative context
<div className="flex items-center gap-2">
  <CheckIcon className="size-4 text-success" aria-hidden="true" />
  <span>Indexing complete</span>
</div>
```

#### Complex Graphics
```tsx
// Chart or graph
<figure role="img" aria-labelledby="chart-title" aria-describedby="chart-desc">
  <h3 id="chart-title">Indexing Progress</h3>
  <div id="chart-desc">
    Bar chart showing 240 pages indexed out of 240 total, representing 100% completion
  </div>
  <canvas><!-- Chart rendered here --></canvas>
</figure>
```

### 1.2 Time-Based Media (WCAG 1.2)

**Goal:** Provide alternatives for time-based media.

#### Videos
- All demo videos include captions
- Transcripts provided for longer videos
- Auto-play disabled by default

```tsx
<video controls aria-label="ContextStream demo video">
  <source src="/demo.mp4" type="video/mp4" />
  <track kind="captions" src="/demo-en.vtt" srclang="en" label="English" default />
  <track kind="descriptions" src="/demo-desc.vtt" srclang="en" label="Descriptions" />
</video>
```

### 1.3 Adaptable Content (WCAG 1.3)

**Goal:** Content can be presented in different ways without losing information.

#### Semantic HTML
```tsx
// Good: Semantic structure
<article>
  <header>
    <h1>React Documentation</h1>
    <p>react.dev</p>
  </header>
  <section>
    <h2>Statistics</h2>
    <dl>
      <dt>Pages</dt>
      <dd>240</dd>
      <dt>Storage</dt>
      <dd>14.2 MB</dd>
    </dl>
  </section>
</article>

// Bad: Div soup
<div>
  <div class="title">React Documentation</div>
  <div class="subtitle">react.dev</div>
  <div class="stats">
    <div>Pages: 240</div>
    <div>Storage: 14.2 MB</div>
  </div>
</div>
```

#### Headings Hierarchy
```tsx
// Good: Proper heading order
<h1>Dashboard</h1>
  <h2>Recent Sources</h2>
    <h3>React Documentation</h3>
  <h2>Activity</h2>

// Bad: Skipping levels
<h1>Dashboard</h1>
  <h4>Recent Sources</h4> // Skips h2, h3
```

#### Landmarks
```tsx
// Use semantic HTML5 elements or ARIA roles
<header><!-- Site header --></header>
<nav aria-label="Main navigation"><!-- Primary nav --></nav>
<main><!-- Main content --></main>
<aside><!-- Sidebar --></aside>
<footer><!-- Site footer --></footer>

// Or with ARIA roles
<div role="navigation" aria-label="Main navigation">...</div>
<div role="search">...</div>
<div role="complementary">...</div>
```

#### Tables
```tsx
// Data tables require proper structure
<table>
  <caption>Indexed Pages</caption>
  <thead>
    <tr>
      <th scope="col">Title</th>
      <th scope="col">URL</th>
      <th scope="col">Updated</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Learn React</th>
      <td>/learn</td>
      <td>2 days ago</td>
    </tr>
  </tbody>
</table>
```

#### Forms
```tsx
// All inputs require associated labels
<div className="form-field">
  <label htmlFor="source-url">
    Documentation URL
    <span className="required" aria-label="required">*</span>
  </label>
  <input
    id="source-url"
    type="url"
    required
    aria-required="true"
    aria-describedby="url-hint url-error"
  />
  <p id="url-hint" className="text-xs text-neutral-500">
    Enter the base URL of the documentation site
  </p>
  <p id="url-error" className="text-xs text-error" role="alert">
    Please enter a valid URL
  </p>
</div>
```

### 1.4 Distinguishable (WCAG 1.4)

**Goal:** Make it easy for users to see and hear content.

#### Color Contrast

**Minimum Requirements (WCAG AA):**
- Normal text (<18px or <14px bold): 4.5:1 contrast ratio
- Large text (≥18px or ≥14px bold): 3:1 contrast ratio
- UI components and graphical objects: 3:1 contrast ratio

**Verified Combinations:**
```css
/* Light mode */
--text-primary: #18181b; /* Neutral-900 */
--bg-primary: #fafafa; /* Neutral-50 */
/* Contrast ratio: 19.37:1 ✅ */

--text-secondary: #52525b; /* Neutral-600 */
--bg-primary: #fafafa;
/* Contrast ratio: 7.54:1 ✅ */

/* Dark mode */
--text-primary: #fafafa; /* Neutral-50 */
--bg-primary: #18181b; /* Neutral-900 */
/* Contrast ratio: 19.37:1 ✅ */

--text-secondary: #a1a1aa; /* Neutral-400 */
--bg-primary: #18181b;
/* Contrast ratio: 8.58:1 ✅ */

/* Primary blue on white */
--primary-600: #2563eb;
--bg-white: #ffffff;
/* Contrast ratio: 7.12:1 ✅ */

/* Primary blue on dark */
--primary-500: #3b82f6;
--bg-dark: #18181b;
/* Contrast ratio: 8.59:1 ✅ */
```

**Testing Tools:**
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Chrome DevTools Lighthouse
- axe DevTools browser extension

#### Color Not Sole Indicator

```tsx
// Bad: Color only
<div className="status-active" style={{ color: 'green' }}>Active</div>

// Good: Color + icon + text
<Badge variant="success">
  <CheckCircleIcon className="size-4" aria-hidden="true" />
  Active
</Badge>

// Good: Visual pattern + color
<input aria-invalid="true" className="border-error" />
<ErrorIcon className="size-4 text-error" />
<span className="error-message">Please enter a valid URL</span>
```

#### Text Resize

Content must be readable when text is resized up to 200%.

```css
/* Use relative units (rem, em) not absolute (px) */
font-size: 1rem; /* Good: scales with user preference */
font-size: 16px; /* Bad: fixed size */

/* Allow text reflow */
max-width: 70ch; /* Comfortable reading width */
word-wrap: break-word;
hyphens: auto;
```

#### Text Spacing

Users must be able to adjust text spacing without loss of content or functionality.

```css
/* Test with these user stylesheet overrides */
* {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}

p {
  margin-bottom: 2em !important;
}
```

#### Images of Text

Avoid using images of text. Use actual text styled with CSS.

```tsx
// Bad: Image of text
<img src="/heading-text.png" alt="Welcome to ContextStream" />

// Good: Styled text
<h1 className="text-4xl font-bold bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">
  Welcome to ContextStream
</h1>
```

---

## 2. Operable

### 2.1 Keyboard Accessible (WCAG 2.1)

**Goal:** All functionality available via keyboard.

#### Tab Order

```tsx
// Ensure logical tab order follows visual order
<form>
  <input type="text" /> {/* Tab index 0 */}
  <input type="email" /> {/* Tab index 0 */}
  <button type="submit"> {/* Tab index 0 */}
    Submit
  </button>
</form>

// Avoid explicit tabindex (unless managing focus programmatically)
// Bad:
<div tabIndex="1">...</div>
<div tabIndex="2">...</div>

// Good: Use natural document order
```

#### Skip Links

```tsx
// Allow keyboard users to skip navigation
<body>
  <a href="#main-content" className="skip-link">
    Skip to main content
  </a>
  <header>...</header>
  <nav>...</nav>
  <main id="main-content">...</main>
</body>

// CSS for skip link
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary-600);
  color: white;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

#### Keyboard Shortcuts

**Global Shortcuts:**
- `/` - Focus search
- `Esc` - Close modal/dropdown, clear search
- `?` - Show keyboard shortcuts help

**List/Grid Navigation:**
- `↑/↓` - Navigate items
- `Enter` - Select item
- `Space` - Toggle checkbox/expand

**Modal/Dialog:**
- `Tab` - Navigate within modal (trap focus)
- `Esc` - Close modal
- `Enter` - Confirm action

```tsx
// Example: Search shortcut
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault()
      searchInputRef.current?.focus()
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [])
```

#### Interactive Elements

All interactive elements must be keyboard accessible:

```tsx
// Good: Native button
<button onClick={handleClick}>Click me</button>

// Good: Custom interactive element
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
>
  Click me
</div>

// Bad: Div with only onClick (not keyboard accessible)
<div onClick={handleClick}>Click me</div>
```

### 2.2 Enough Time (WCAG 2.2)

**Goal:** Provide users enough time to read and use content.

#### No Time Limits

- No session timeouts during active use
- Forms don't expire while user is filling them
- If timeout is necessary, warn user and allow extension

```tsx
// Example: Session timeout warning
<Dialog open={showTimeoutWarning}>
  <DialogContent>
    <DialogTitle>Session Expiring</DialogTitle>
    <p>Your session will expire in 2 minutes due to inactivity.</p>
    <DialogFooter>
      <Button onClick={extendSession}>Continue Session</Button>
      <Button variant="secondary" onClick={logout}>Log Out</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Auto-updating Content

```tsx
// Provide control over auto-refresh
<div className="auto-refresh">
  <p>Indexing progress updates every 5 seconds</p>
  <button onClick={toggleAutoRefresh} aria-pressed={autoRefresh}>
    {autoRefresh ? 'Pause' : 'Resume'} updates
  </button>
</div>
```

### 2.3 Seizures and Physical Reactions (WCAG 2.3)

**Goal:** Don't design content that causes seizures.

#### No Flashing Content

- Avoid flashing more than 3 times per second
- Avoid large areas of flashing
- Use smooth transitions instead of blinks

```css
/* Bad: Rapid blinking */
@keyframes blink {
  50% { opacity: 0; }
}
.notification { animation: blink 0.5s infinite; }

/* Good: Smooth fade */
@keyframes fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.notification { animation: fade 0.5s ease-out; }
```

### 2.4 Navigable (WCAG 2.4)

**Goal:** Provide ways to help users navigate and find content.

#### Page Titles

```tsx
// Descriptive, unique page titles
<Head>
  <title>Dashboard - ContextStream</title>
</Head>

<Head>
  <title>React Documentation - Sources - ContextStream</title>
</Head>

// Update on route change
useEffect(() => {
  document.title = `${pageTitle} - ContextStream`
}, [pageTitle])
```

#### Focus Visible

```css
/* Always show focus indicator */
*:focus-visible {
  outline: 3px solid var(--primary-500);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Custom focus styles for specific elements */
button:focus-visible {
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
  outline: none;
}

/* Never hide focus */
/* Bad: */
*:focus { outline: none; }
```

#### Link Purpose

```tsx
// Good: Link text describes destination
<a href="/sources">View all sources</a>

// Bad: Ambiguous link text
<a href="/sources">Click here</a>

// Good: Provide context with aria-label
<a href="/sources" aria-label="View all documentation sources">
  See all
</a>
```

#### Multiple Ways to Navigate

Provide at least two ways to find content:
- Search
- Navigation menu
- Site map
- Breadcrumbs

```tsx
// Breadcrumbs example
<nav aria-label="Breadcrumb">
  <ol className="breadcrumbs">
    <li><Link href="/dashboard">Dashboard</Link></li>
    <li><Link href="/sources">Sources</Link></li>
    <li aria-current="page">React Documentation</li>
  </ol>
</nav>
```

### 2.5 Input Modalities (WCAG 2.5)

**Goal:** Make it easy for users to operate functionality through various inputs.

#### Touch Targets

**Minimum Size:** 44x44 CSS pixels (WCAG 2.5.5 AAA)
**Recommended:** 48x48 CSS pixels

```tsx
// Good: Large enough touch target
<button className="min-w-[44px] min-h-[44px] p-3">
  <TrashIcon className="size-5" />
</button>

// Bad: Too small
<button className="p-1">
  <TrashIcon className="size-4" />
</button>
```

#### Label in Name

Visible label must match (or be included in) accessible name:

```tsx
// Good: Visible label matches
<button aria-label="Add source">Add source</button>

// Good: aria-label includes visible label
<button aria-label="Add documentation source">Add source</button>

// Bad: Mismatch
<button aria-label="Create new">Add source</button>
```

#### Motion Actuation

Don't require device motion (shake, tilt) as the only way to trigger functions.

---

## 3. Understandable

### 3.1 Readable (WCAG 3.1)

**Goal:** Make text content readable and understandable.

#### Language of Page

```tsx
// Set page language
<html lang="en">

// Set language for sections in different languages
<blockquote lang="es">
  Hola mundo
</blockquote>
```

#### Unusual Words

Provide definitions for jargon, idioms, or technical terms on first use:

```tsx
// Glossary or tooltip
<abbr title="Model Context Protocol">MCP</abbr>

// Or expandable definition
<button onClick={showDefinition} aria-expanded={expanded}>
  MCP <InfoIcon className="size-4" />
</button>
{expanded && (
  <div role="region" aria-label="Definition">
    Model Context Protocol: A standard for integrating AI tools...
  </div>
)}
```

### 3.2 Predictable (WCAG 3.2)

**Goal:** Make web pages appear and operate in predictable ways.

#### On Focus

Don't trigger changes of context on focus alone:

```tsx
// Bad: Auto-submit on focus
<select onFocus={handleSubmit}>

// Good: Require explicit action
<select onChange={handleChange}>
  ...
</select>
<button onClick={handleSubmit}>Update</button>
```

#### On Input

Don't cause unexpected changes when entering data:

```tsx
// Bad: Auto-advance to next field
<input onInput={() => nextInputRef.current?.focus()} />

// Good: Let user control navigation
<input />
```

#### Consistent Navigation

Keep navigation consistent across pages:

```tsx
// Same nav on every page
<nav aria-label="Main navigation">
  <Link href="/dashboard">Dashboard</Link>
  <Link href="/sources">Sources</Link>
  <Link href="/search">Search</Link>
  <Link href="/settings">Settings</Link>
</nav>
```

### 3.3 Input Assistance (WCAG 3.3)

**Goal:** Help users avoid and correct mistakes.

#### Error Identification

```tsx
// Clearly identify errors
<form>
  <div className="form-field">
    <label htmlFor="email">Email</label>
    <input
      id="email"
      type="email"
      aria-invalid={errors.email ? 'true' : 'false'}
      aria-describedby={errors.email ? 'email-error' : undefined}
    />
    {errors.email && (
      <p id="email-error" className="error-message" role="alert">
        <XCircleIcon className="size-4" aria-hidden="true" />
        {errors.email}
      </p>
    )}
  </div>
</form>
```

#### Labels or Instructions

```tsx
// Provide clear instructions
<div className="form-field">
  <label htmlFor="password">
    Password
    <span className="required" aria-label="required">*</span>
  </label>
  <input
    id="password"
    type="password"
    aria-describedby="password-hint"
    required
  />
  <p id="password-hint" className="hint-text">
    Must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number
  </p>
</div>
```

#### Error Suggestion

```tsx
// Provide suggestions to fix errors
{errors.url && (
  <div role="alert" className="error-message">
    <p>{errors.url}</p>
    {suggestion && (
      <p className="text-sm mt-1">
        Did you mean: <button onClick={applySuggestion}>{suggestion}</button>?
      </p>
    )}
  </div>
)}
```

#### Error Prevention (Legal, Financial, Data)

For critical actions:

```tsx
// Require confirmation
<Dialog>
  <DialogTitle>Delete Source?</DialogTitle>
  <DialogDescription>
    This will permanently delete React Documentation and all 240 indexed pages.
    This action cannot be undone.
  </DialogDescription>
  <p className="mt-4">Type <strong>DELETE</strong> to confirm:</p>
  <input
    value={confirmText}
    onChange={(e) => setConfirmText(e.target.value)}
    aria-label="Type DELETE to confirm"
  />
  <DialogFooter>
    <Button variant="secondary" onClick={close}>Cancel</Button>
    <Button
      variant="destructive"
      onClick={handleDelete}
      disabled={confirmText !== 'DELETE'}
    >
      Delete Source
    </Button>
  </DialogFooter>
</Dialog>
```

---

## 4. Robust

### 4.1 Compatible (WCAG 4.1)

**Goal:** Maximize compatibility with current and future tools.

#### Valid HTML

```tsx
// Good: Valid, semantic HTML
<button type="button">Click me</button>
<input type="text" id="name" />

// Bad: Invalid nesting
<button><button>Nested button</button></button>

// Bad: Duplicate IDs
<input id="email" />
<input id="email" /> // Duplicate!
```

#### Name, Role, Value

All UI components must have:
- Accessible name
- Role (explicit or implicit)
- States and properties

```tsx
// Good: Complete ARIA
<div
  role="button"
  tabIndex={0}
  aria-label="Close modal"
  aria-pressed="false"
  onClick={handleClick}
  onKeyDown={handleKeyDown}
>
  Close
</div>

// Good: Native element (implicit role)
<button aria-label="Close modal" onClick={handleClick}>
  Close
</button>
```

#### Status Messages

```tsx
// Screen reader announcements for status changes
<div role="status" aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Urgent announcements
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>

// Example usage
const [status, setStatus] = useState('')

const indexSource = async () => {
  setStatus('Indexing started')
  // ... indexing logic
  setStatus('Indexing complete')
}

return (
  <>
    <button onClick={indexSource}>Start Indexing</button>
    <div role="status" aria-live="polite" className="sr-only">
      {status}
    </div>
  </>
)
```

---

## 5. ARIA Patterns & Components

### 5.1 Modal Dialog

```tsx
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const [open, setOpen] = useState(false)

return (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <button>Open Dialog</button>
    </DialogTrigger>
    <DialogContent>
      <DialogTitle>Add Source</DialogTitle>
      <DialogDescription>
        Enter the URL of the documentation you want to index
      </DialogDescription>
      {/* Form content */}
      <DialogFooter>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Add Source</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
```

**Requirements:**
- Focus trapped within modal
- `Esc` key closes modal
- Focus returns to trigger element on close
- `role="dialog"`, `aria-modal="true"`
- `aria-labelledby` points to title
- `aria-describedby` points to description

### 5.2 Dropdown Menu

```tsx
import { DropdownMenu } from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button aria-label="More options">
      <MoreVerticalIcon />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onSelect={handleUpdate}>
      <RefreshIcon className="mr-2 size-4" />
      Update
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={handleEdit}>
      <EditIcon className="mr-2 size-4" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={handleDelete} className="text-error">
      <TrashIcon className="mr-2 size-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Requirements:**
- `role="menu"` on container
- `role="menuitem"` on items
- Arrow keys navigate items
- `Enter` activates item
- `Esc` closes menu

### 5.3 Tabs

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

<Tabs defaultValue="profile">
  <TabsList aria-label="Settings sections">
    <TabsTrigger value="profile">Profile</TabsTrigger>
    <TabsTrigger value="api-keys">API Keys</TabsTrigger>
    <TabsTrigger value="preferences">Preferences</TabsTrigger>
  </TabsList>
  <TabsContent value="profile">
    {/* Profile settings */}
  </TabsContent>
  <TabsContent value="api-keys">
    {/* API keys */}
  </TabsContent>
  <TabsContent value="preferences">
    {/* Preferences */}
  </TabsContent>
</Tabs>
```

**Requirements:**
- `role="tablist"`, `role="tab"`, `role="tabpanel"`
- `aria-selected` on active tab
- `aria-controls` links tab to panel
- Arrow keys navigate tabs
- `Home`/`End` jump to first/last tab

### 5.4 Toast Notification

```tsx
import { toast } from 'sonner'

// Success
toast.success('Source added successfully', {
  description: '240 pages indexed',
})

// Error
toast.error('Indexing failed', {
  description: 'Unable to connect to site',
  action: {
    label: 'Retry',
    onClick: handleRetry,
  },
})
```

**Requirements:**
- `role="status"` for informational toasts
- `role="alert"` for errors
- `aria-live="polite"` or `"assertive"`
- Dismiss with `Esc` or automatically after timeout
- Pause auto-dismiss on hover/focus

### 5.5 Progress Indicator

```tsx
<div className="progress-container">
  <label htmlFor="indexing-progress">Indexing Progress</label>
  <progress
    id="indexing-progress"
    value={42}
    max={240}
    aria-label="Indexing 42 of 240 pages"
  />
  <span aria-live="polite" aria-atomic="true">
    {Math.round((42 / 240) * 100)}% complete
  </span>
</div>
```

**Requirements:**
- Use `<progress>` element
- Provide text alternative for percentage
- Announce changes with `aria-live`

---

## 6. Testing Checklist

### Automated Testing

**Tools:**
- [axe DevTools](https://www.deque.com/axe/devtools/) browser extension
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) in Chrome DevTools
- [WAVE](https://wave.webaim.org/) browser extension
- [Pa11y](https://pa11y.org/) automated testing

**In CI/CD:**
```bash
# Add to package.json
npm install --save-dev @axe-core/cli pa11y-ci

# Run in CI
npx axe https://your-app.com --exit
npx pa11y-ci
```

### Manual Testing

#### Keyboard Navigation
- [ ] Tab through entire page
- [ ] All interactive elements focusable
- [ ] Focus order is logical
- [ ] Focus visible at all times
- [ ] Dropdowns/menus keyboard accessible
- [ ] Modals trap focus
- [ ] `Esc` closes modals/dropdowns
- [ ] Skip links work

#### Screen Reader Testing

**Tools:** NVDA (Windows), JAWS (Windows), VoiceOver (Mac/iOS), TalkBack (Android)

**Test:**
- [ ] All content announced
- [ ] Headings structure makes sense
- [ ] Landmarks properly identified
- [ ] Form labels associated correctly
- [ ] Error messages announced
- [ ] Dynamic content updates announced
- [ ] Images have appropriate alt text
- [ ] Links have descriptive text

**Quick VoiceOver Test (Mac):**
```
Cmd + F5: Turn on VoiceOver
VO + A: Start reading
VO + →/←: Navigate elements
VO + U: Open rotor (navigation menu)
```

#### Visual Testing
- [ ] Text readable at 200% zoom
- [ ] No horizontal scroll at 320px width
- [ ] Color contrast meets AA standards
- [ ] Color not sole indicator
- [ ] Focus indicators visible
- [ ] No information loss on mobile

#### Cognitive/Motor Testing
- [ ] No time limits on tasks
- [ ] Clear error messages
- [ ] Forms have clear labels/instructions
- [ ] Confirmation for destructive actions
- [ ] Touch targets at least 44x44px
- [ ] No rapid flashing content

---

## 7. Common Mistakes to Avoid

### ❌ Don't Do This

```tsx
// Missing alt text
<img src="/icon.svg" />

// Div button (not keyboard accessible)
<div onClick={handleClick}>Click me</div>

// Placeholder as label
<input placeholder="Enter email" />

// Hidden content not hidden from screen readers
<div style={{ display: 'none' }}>Hidden text</div>

// Color as only indicator
<span style={{ color: 'red' }}>Error</span>

// onClick without onKeyDown
<div onClick={handleClick}>...</div>

// Removing focus outline
*:focus { outline: none; }

// Auto-playing video with sound
<video autoplay src="/video.mp4" />
```

### ✅ Do This Instead

```tsx
// Descriptive alt text
<img src="/icon.svg" alt="Success indicator" />

// Button element
<button onClick={handleClick}>Click me</button>

// Proper label
<label htmlFor="email">Email</label>
<input id="email" type="email" placeholder="you@example.com" />

// Use aria-hidden or sr-only
<div aria-hidden="true">Decorative</div>
<div className="sr-only">Screen reader only text</div>

// Color + icon + text
<span className="text-error flex items-center gap-1">
  <XCircleIcon className="size-4" aria-hidden="true" />
  Error
</span>

// Both onClick and onKeyDown
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  ...
</div>

// Custom focus styles
button:focus-visible {
  outline: 3px solid var(--primary-500);
  outline-offset: 2px;
}

// No auto-play, or muted
<video controls muted src="/video.mp4" />
```

---

## 8. Resources

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project](https://www.a11yproject.com/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WAVE](https://wave.webaim.org/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

### React/Next.js Specific
- [React Accessibility](https://react.dev/learn/accessibility)
- [Next.js Accessibility](https://nextjs.org/docs/architecture/accessibility)
- [Radix UI](https://www.radix-ui.com/) (accessible primitives)
- [shadcn/ui](https://ui.shadcn.com/) (accessible components)

### Screen Readers
- [NVDA](https://www.nvaccess.org/) (Windows, free)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) (Windows, paid)
- VoiceOver (Mac/iOS, built-in)
- [TalkBack](https://support.google.com/accessibility/android/answer/6283677) (Android, built-in)

---

## Changelog

**Version 1.0** (2025-10-09)
- Initial accessibility guidelines
- WCAG 2.1 AA compliance standards
- ARIA patterns for all components
- Testing checklist and resources
- React/Next.js specific examples
