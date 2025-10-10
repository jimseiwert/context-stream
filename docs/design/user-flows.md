# ContextStream User Flows

## Overview

This document maps detailed user journeys for all MVP features in ContextStream. Each flow includes entry points, decision points, error handling, and success criteria aligned with the user personas from the product requirements.

**Target Users:**
- Alex - AI-First Full-Stack Developer (Primary)
- Jordan - DevRel Engineer (Primary)
- Morgan - Engineering Manager (Primary)
- Sam - Independent AI Consultant (Secondary)

---

## Flow 1: Onboarding & Account Setup

### Entry Point
New user visits ContextStream for the first time

### User Goal
Get set up quickly and add first documentation source within 10 minutes

### Steps

#### 1. Landing Page
**State:**
- Clean hero section explaining value proposition
- "Get Started" CTA button (primary)
- "View Demo" link (secondary)
- Screenshots showing dashboard and search results

**Visual Hierarchy:**
- Hero headline: "Make Any Documentation AI-Accessible in Minutes"
- Sub-headline: "Open-source MCP server that indexes websites and codebases"
- 3 key benefits with icons
- Social proof: GitHub stars, user count

**User Actions:**
- Click "Get Started" → Sign Up
- Click "View Demo" → Demo video modal
- Scroll to learn more

**Design Notes:**
- Minimal text, maximum clarity
- Dark mode default (developer tool aesthetic)
- Fast load time (<2s)

#### 2. Sign Up / Authentication
**State:**
- OAuth options: GitHub (primary), Google (secondary)
- Or: Email/password form
- Link to sign in for existing users

**Form Fields:**
- Email (required)
- Password (required, min 8 characters)
- Checkbox: "I agree to Terms of Service"

**Validation:**
- Inline validation on blur
- Clear error messages
- Password strength indicator

**User Actions:**
- Sign up with GitHub (recommended for developers) → Skip to step 4
- Sign up with Google → Skip to step 4
- Sign up with email → Continue to step 3

**Error Handling:**
- Email already exists: "Account exists. Sign in instead?"
- Invalid email format: "Please enter a valid email"
- Weak password: "Password must be at least 8 characters"

#### 3. Email Verification (if email signup)
**State:**
- Check email message with resend option
- User checks inbox, clicks verification link
- Redirect to app with success toast

**User Actions:**
- Click verification link in email → Step 4
- Didn't receive email? Click "Resend" button

#### 4. Welcome Screen / Quick Setup
**State:**
- Welcome message personalized with user name
- Brief explanation of ContextStream (2-3 sentences)
- "Add Your First Source" CTA
- "I'll do this later" skip link

**Visual:**
- Friendly illustration (not intimidating)
- Progress indicator: "1 of 3 steps"

**User Actions:**
- Click "Add Your First Source" → Step 5
- Click "Skip for now" → Dashboard (empty state)

#### 5. Add First Documentation Source
**State:**
- Modal or dedicated page with form
- Input field for URL
- Dropdown to select source type (Website, GitHub)
- Examples shown as placeholder text

**Form:**
```
Documentation URL *
[https://docs.python.org]
Examples: docs.python.org, react.dev, github.com/facebook/react

Source Type
[ Website ▾ ]
```

**User Actions:**
- Enter URL and submit → Step 6
- Click "Cancel" → Dashboard (empty state)

**Validation:**
- URL format validation
- Check if URL is accessible (200 status)
- Duplicate source detection

**Error Handling:**
- Invalid URL: "Please enter a valid URL"
- URL not accessible: "Unable to reach this URL. Check the address."
- Already indexed: "This source has already been added"

#### 6. Indexing Progress
**State:**
- Progress screen showing scraping status
- Progress bar with percentage
- Live stats: "Scraped 42 of ~150 pages"
- Estimated time remaining

**Visual:**
- Animated progress indicator
- List of recently indexed pages (live update)
- "This may take a few minutes" message

**User Actions:**
- Wait for completion → Step 7
- Click "Continue in background" → Dashboard with indexing banner
- Click "Cancel" → Confirmation modal

**Background Process:**
- If user navigates away, show persistent banner
- Send browser notification when complete

#### 7. Success & Next Steps
**State:**
- Success message with summary
- Stats: "Indexed 147 pages in 3 minutes"
- Quick win: "Try searching for [example query]"
- Next steps suggestions

**User Actions:**
- Click "Go to Dashboard" → Dashboard
- Click "Search Now" → Search page with example query pre-filled
- Click "Add Another Source" → Back to step 5

**Success Toast:**
"Source added successfully! 147 pages indexed."

### Success Criteria
- User completes sign-up in <2 minutes
- First source indexed in <10 minutes total
- User understands how to search indexed content
- User feels confident adding more sources

### Drop-off Points (and mitigation)
1. **Landing page**: Make value prop crystal clear with demo video
2. **Sign up**: Offer GitHub OAuth for frictionless auth
3. **Email verification**: Auto-login after verification
4. **Indexing wait time**: Show progress and allow background processing
5. **Empty dashboard**: Provide clear next steps and examples

---

## Flow 2: Adding a Documentation Source

### Entry Point
- Dashboard empty state CTA
- Dashboard "Add Source" button
- Settings → Sources → "Add New"

### User Goal
Add new documentation website or GitHub repo to index

### Steps

#### 1. Source Creation Modal
**State:**
- Modal overlays current page
- Form with required fields
- Optional advanced settings (collapsed)

**Form Fields:**
```
Source Name (optional)
[React Documentation]
Leave blank to auto-detect from URL

Documentation URL *
[https://react.dev]

Source Type *
● Website (selected)
○ GitHub Repository
○ Confluence

Advanced Settings (collapsed)
▼ Click to expand
```

**Advanced Settings:**
- Max pages to index
- Update frequency (daily, weekly, manual)
- Authentication (if needed)
- Custom CSS selectors for content

**User Actions:**
- Fill form and click "Add Source" → Step 2
- Click "Cancel" or press Esc → Close modal
- Toggle advanced settings

**Real-time Validation:**
- URL preview: Show fetched title and description
- Estimated pages: "~240 pages detected"
- Estimated time: "About 5-8 minutes"

**Error States:**
- Invalid URL format
- URL not reachable
- Site blocks scraping (robots.txt)
- Duplicate source exists

#### 2. Scraping Confirmation
**State:**
- Preview of what will be indexed
- Estimated time and pages
- Option to customize settings before starting

**Preview:**
```
Source: React Documentation
URL: https://react.dev
Pages: ~240 estimated
Time: 5-8 minutes
Storage: ~15 MB
```

**User Actions:**
- Click "Start Indexing" → Step 3
- Click "Customize Settings" → Expand advanced options
- Click "Cancel" → Back to dashboard

#### 3. Live Indexing Progress
**State:**
- Redirect to source detail page
- Progress bar and live stats
- List of recently indexed pages (auto-updating)
- Option to continue in background

**Progress Display:**
```
Indexing React Documentation...

Progress: [████████░░░░░░] 42 / 240 pages (18%)
Time elapsed: 1m 23s
Estimated remaining: 6m 15s

Recently indexed:
✓ react.dev/learn/tutorial
✓ react.dev/learn/thinking-in-react
✓ react.dev/reference/react/useState
```

**User Actions:**
- Wait on page (see live progress)
- Click "Background" → Dashboard with banner
- Click "Cancel Indexing" → Confirmation modal

**Error Handling:**
- Individual page errors: Show count but continue
- Critical errors: Stop indexing, show error message
- Network issues: Pause and retry with exponential backoff

#### 4. Completion & Verification
**State:**
- Success screen with summary
- Preview of indexed content
- Suggestions for next actions

**Summary:**
```
✓ Indexing Complete!

React Documentation
240 pages indexed in 7 minutes
Storage used: 14.2 MB
Last updated: Just now

Top Pages:
1. Learn React
2. useState Hook
3. useEffect Hook
```

**User Actions:**
- Click "View Source" → Source detail page
- Click "Search Content" → Search page
- Click "Done" → Dashboard

**Success Toast:**
"React Documentation indexed successfully! 240 pages ready to search."

### Alternative Path: GitHub Repository

**Differences:**
- GitHub URL format validation
- Repository structure preview
- File type selection (include/exclude patterns)
- Branch selection
- Authentication with GitHub token (optional for private repos)

**Form Fields:**
```
Repository URL *
[https://github.com/facebook/react]

Branch
[main ▾]

File Types to Index
☑ JavaScript/TypeScript (.js, .jsx, .ts, .tsx)
☑ Markdown (.md)
☑ Configuration (.json, .yaml)
☐ Styles (.css, .scss)

Authentication (optional)
[GitHub Personal Access Token]
Required for private repositories
```

### Edge Cases

**Case 1: Site Requires Authentication**
- Detect auth requirement during initial fetch
- Show auth setup form
- Support: Basic auth, cookie-based, API key
- Securely store credentials (encrypted)

**Case 2: Site Blocks Scraping**
- Detect robots.txt restrictions
- Show message: "This site doesn't allow automated scraping"
- Suggest alternatives: Manual upload, API integration

**Case 3: Very Large Site (>1000 pages)**
- Show warning before starting
- Suggest URL patterns to limit scope
- Offer to index in batches
- Allow pausing and resuming

**Case 4: Duplicate Content Detected**
- Show message: "Similar source already exists: [Source Name]"
- Options: "Update existing" or "Add as new"
- Highlight differences if updating

### Success Criteria
- User can add source in <2 minutes (excluding indexing time)
- 95%+ sources index successfully
- Clear feedback at every step
- Errors are actionable with suggested fixes

---

## Flow 3: Searching Documentation

### Entry Point
- Dashboard search bar (prominent, always visible)
- Dedicated search page
- Keyboard shortcut: `/` (focus search)
- MCP query from Claude Desktop

### User Goal
Find specific information across indexed documentation quickly

### Steps

#### 1. Search Initiation
**State:**
- Empty search bar with placeholder
- Keyboard shortcut hint shown
- Recent searches displayed (optional)

**Search Bar:**
```
[🔍] Search documentation...            /
     Press / to focus
```

**Visual Design:**
- Large, prominent search input
- Full-width on search page
- Sticky in header on other pages
- Dark mode optimized

**User Actions:**
- Click search bar → Step 2
- Press `/` → Focus search bar
- Type immediately (search bar auto-focused on page load)

#### 2. Search Input & Suggestions
**State:**
- Active search input
- Real-time suggestions as user types
- Filter options visible

**Autocomplete:**
- Show suggestions after 2 characters
- Suggest: Recent searches, popular queries, indexed page titles
- Highlight matching text

**Filters:**
```
All Sources ▾    |    All Types ▾    |    Any Date ▾
```

**User Actions:**
- Type query → See live results (Step 3)
- Select suggestion → Jump to Step 3 with selected query
- Adjust filters → Refine results

**Keyboard Navigation:**
- `↓` / `↑`: Navigate suggestions
- `Enter`: Search / select suggestion
- `Esc`: Close suggestions, clear search

#### 3. Search Results Display
**State:**
- List of relevant results
- Each result shows: title, snippet, source, relevance score
- Pagination or infinite scroll
- Sidebar filters (desktop)

**Result Card:**
```
┌─────────────────────────────────────────┐
│ useState Hook - React Docs       [★ 95%]│
│ react.dev/reference/react/useState      │
│                                          │
│ useState is a React Hook that lets you  │
│ add a **state variable** to your compon │
│ ent. Call useState at the top level...  │
│                                          │
│ React Documentation • Updated 3 days ago│
└─────────────────────────────────────────┘
```

**Result Anatomy:**
- **Title**: Bold, clickable, primary color
- **URL**: Small, secondary text
- **Snippet**: 2-3 lines with query terms highlighted
- **Metadata**: Source name, update timestamp
- **Relevance Score**: Visual indicator (optional, can be hidden)

**No Results State:**
```
No results found for "your query"

Suggestions:
• Check your spelling
• Try different keywords
• Remove filters
• Browse all sources
```

**User Actions:**
- Click result → Step 4 (open page)
- Refine search query → Update results
- Adjust filters → Update results
- Click "Load more" → Show next page of results

#### 4. View Result Detail
**State:**
- Full page content displayed
- Source and navigation context shown
- Option to open original URL
- Related pages suggested

**Page View:**
```
┌─────────────────────────────────────────┐
│ ← Back to results       [Open Original]│
│                                          │
│ useState Hook                            │
│ React Documentation                      │
│                                          │
│ [Full page content rendered here...]    │
│                                          │
│ Related Pages:                           │
│ • useEffect Hook                        │
│ • Component State                       │
│ • Hooks API Reference                   │
└─────────────────────────────────────────┘
```

**User Actions:**
- Read content
- Click "Open Original" → External link (new tab)
- Click related page → View that page
- Click "Back" → Return to search results
- Copy content for AI assistant

### Alternative Path: MCP Search (Claude Desktop)

**Flow:**
1. User asks Claude a question
2. Claude queries ContextStream via MCP
3. ContextStream returns relevant docs
4. Claude synthesizes answer with citations

**User sees:**
- Claude's answer (with ContextStream context)
- Citations to specific pages
- Option to view source in browser

**Design Consideration:**
- MCP responses optimized for AI consumption (structured data)
- Include metadata: source URL, relevance score, last updated
- Chunk content appropriately (512 token chunks)

### Search Filters & Advanced Options

**Filters:**
- **Source**: Filter by specific documentation source
- **Type**: Website, GitHub, Confluence
- **Date**: Last 24h, Last week, Last month, Custom range
- **Language**: Detected languages (if multilingual docs)

**Sort Options:**
- Relevance (default)
- Date (newest first)
- Title (A-Z)

**Search Operators:**
```
"exact phrase" - Exact match
site:react.dev - Limit to specific source
type:github - Filter by source type
```

### Edge Cases

**Case 1: Very Long Query**
- Support up to 500 characters
- Warn if query is too vague
- Suggest breaking into multiple searches

**Case 2: Ambiguous Query**
- Show results from multiple topics
- Group by source or topic
- Suggest related queries

**Case 3: Outdated Results**
- Highlight stale content (>30 days old)
- Show "Update available" badge
- Allow triggering re-index from results

**Case 4: No Sources Indexed**
- Empty state: "No sources to search"
- CTA: "Add your first documentation source"

### Success Criteria
- Results appear in <2 seconds (p95)
- Top 3 results are relevant 85%+ of time
- Users find answer in <5 clicks
- Search is intuitive without tutorial

### Performance Targets
- Hybrid search (BM25 + vector) < 1.5s
- Autocomplete suggestions < 200ms
- Results page load < 1s
- Smooth scrolling and interaction (60 FPS)

---

## Flow 4: Managing Documentation Sources

### Entry Point
- Dashboard "Sources" section
- Navigation: "Sources" menu item
- Source detail page actions

### User Goal
View, update, pause, or remove documentation sources

### Steps

#### 1. Sources Overview
**State:**
- List of all indexed sources
- Each source shows: status, page count, last updated
- Actions: Update, Pause, Delete
- Sorting and filtering options

**Source List:**
```
┌──────────────────────────────────────────────────────────┐
│ React Documentation                        [•••]          │
│ react.dev                                                 │
│ ✓ Active • 240 pages • Updated 2 days ago               │
│ ────────────────────────────────────────────────────────│
│ Python Docs                                 [•••]          │
│ docs.python.org                                          │
│ 🔄 Updating • 487 pages • Update in progress...         │
│ ────────────────────────────────────────────────────────│
│ Vue.js Guide                                [•••]          │
│ vuejs.org                                                │
│ ⏸️ Paused • 156 pages • Updated 2 weeks ago            │
└──────────────────────────────────────────────────────────┘
```

**Filters & Sorting:**
```
Status: [All ▾]  |  Type: [All ▾]  |  Sort: [Last Updated ▾]

Search sources...
```

**User Actions:**
- Click source card → Source detail page (Step 2)
- Click "•••" menu → Show action menu
- Click "Add Source" → Add source flow
- Search sources by name/URL

#### 2. Source Detail Page
**State:**
- Full source information
- Statistics and metrics
- Indexed pages list
- Update settings

**Page Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ ← Sources                              [Update] [Settings]│
│                                                            │
│ React Documentation                                        │
│ https://react.dev                                         │
│ ✓ Active • Last updated 2 days ago                       │
│                                                            │
│ Statistics                                                │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│ │   240        │ │   14.2 MB    │ │   98.5%      │      │
│ │   Pages      │ │   Storage    │ │   Success    │      │
│ └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                            │
│ Pages                                      [Search pages] │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Learn React                                           │ │
│ │ react.dev/learn                                       │ │
│ ├──────────────────────────────────────────────────────┤ │
│ │ useState Hook                                        │ │
│ │ react.dev/reference/react/useState                   │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**User Actions:**
- Click "Update" → Trigger re-index (Step 3)
- Click "Settings" → Edit source settings (Step 4)
- Search pages within source
- View individual page details

#### 3. Update Source
**State:**
- Confirmation modal
- Show what will be updated
- Option to force full re-index

**Update Options:**
```
Update React Documentation?

This will:
✓ Check for new pages
✓ Update modified pages
✓ Remove deleted pages

Last successful update: 2 days ago

○ Quick update (only changed pages)
● Full re-index (all pages)

Estimated time: 5-8 minutes

[Cancel]  [Start Update]
```

**User Actions:**
- Click "Start Update" → Begin update (show progress like initial indexing)
- Click "Cancel" → Close modal

**Progress:**
- Similar to initial indexing flow
- Shows: added pages, updated pages, removed pages
- Can continue in background

#### 4. Edit Source Settings
**State:**
- Form with current settings
- Advanced options expanded
- Save/Cancel actions

**Settings Form:**
```
Source Name
[React Documentation]

Update Schedule
● Automatic (daily)
○ Automatic (weekly)
○ Manual only

Max Pages
[1000]
Leave blank for unlimited

Exclusion Patterns
[/blog/*, /archive/*]
Pages matching these patterns won't be indexed

Authentication (optional)
[Configure Authentication]

[Cancel]  [Save Changes]
```

**User Actions:**
- Edit settings and click "Save" → Update source config
- Click "Cancel" → Discard changes

**Validation:**
- Check valid URL patterns
- Warn if max pages is very low
- Validate authentication credentials

#### 5. Pause Source
**Action:** Pause automatic updates (don't delete data)

**Confirmation:**
```
Pause React Documentation?

Automatic updates will be paused. You can
still search indexed content and manually
update when needed.

[Cancel]  [Pause]
```

**Effect:**
- Source status changes to "Paused"
- No automatic updates
- Content remains searchable

#### 6. Delete Source
**Action:** Permanently remove source and all indexed data

**Confirmation Modal:**
```
⚠️ Delete React Documentation?

This will permanently delete:
• All 240 indexed pages
• 14.2 MB of stored content
• Update history and settings

This action cannot be undone.

Type "DELETE" to confirm:
[___________]

[Cancel]  [Delete Source]
```

**User Actions:**
- Type "DELETE" exactly → Enable delete button
- Click "Delete Source" → Permanently remove
- Click "Cancel" → Close modal

**After Deletion:**
- Redirect to sources list
- Show success toast
- Source removed from MCP searches immediately

### Bulk Actions

**State:**
- Select multiple sources (checkboxes)
- Bulk action bar appears at bottom

**Bulk Actions:**
```
3 sources selected

[Update All]  [Pause]  [Delete]  [Cancel Selection]
```

### Source Status Indicators

**Active** (Green)
- Regular updates running
- All pages indexed successfully
- No errors

**Updating** (Blue)
- Re-index in progress
- Show progress percentage

**Paused** (Yellow)
- Automatic updates disabled
- Content still searchable

**Error** (Red)
- Last update failed
- Show error message and suggested fix

**Pending** (Gray)
- Initial indexing queued
- Waiting to start

### Success Criteria
- Users can manage sources without confusion
- Update process completes successfully 95%+ of time
- Deletion requires deliberate confirmation (prevent accidents)
- Source status always clear and actionable

---

## Flow 5: Dashboard Overview

### Entry Point
- User logs in
- User clicks "Dashboard" in navigation
- Default landing page after auth

### User Goal
Get quick overview of system status, recent activity, and take common actions

### Dashboard Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Header: Logo | Search | User Menu                             │
├──────┬───────────────────────────────────────────────────────┤
│      │                                                         │
│ Nav  │ Dashboard                        [+ Add Source]        │
│      │                                                         │
│ Home │ Overview Statistics                                    │
│ Srcs │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│ Srch │ │    8    │ │  1,247  │ │  142 MB │ │   15    │      │
│ Sets │ │ Sources │ │  Pages  │ │ Storage │ │ Queries │      │
│      │ └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
│      │                                                         │
│      │ Recent Sources                     [View All →]        │
│      │ ┌───────────────────────────────────────────────────┐ │
│      │ │ React Docs  • ✓ Active  • 240 pages  • 2d ago   │ │
│      │ │ Python Docs • 🔄 Updating • 487 pages • now      │ │
│      │ │ Vue Guide   • ⏸️ Paused  • 156 pages  • 2w ago  │ │
│      │ └───────────────────────────────────────────────────┘ │
│      │                                                         │
│      │ Recent Activity                                        │
│      │ ┌───────────────────────────────────────────────────┐ │
│      │ │ 🔍 Searched "useState hook" → 12 results          │ │
│      │ │ ✓ React Docs updated successfully (240 pages)    │ │
│      │ │ ➕ Added new source: Python Docs                 │ │
│      │ └───────────────────────────────────────────────────┘ │
│      │                                                         │
│      │ Quick Actions                                          │
│      │ [Search Docs] [Add Source] [View Sources]            │
└──────┴───────────────────────────────────────────────────────┘
```

### Dashboard Components

#### 1. Overview Statistics
**Metrics Displayed:**
- Total sources indexed
- Total pages indexed
- Total storage used
- Search queries (last 7 days)

**Interaction:**
- Click stat card → Navigate to relevant section
- Tooltip shows trend (up/down from last period)

#### 2. Recent Sources
**Display:**
- Last 3-5 sources updated
- Status badge (Active, Updating, Paused, Error)
- Key metrics: page count, last updated
- Quick actions: Update, Settings

**Interaction:**
- Click source → Source detail page
- Click "View All" → Sources list page

#### 3. Recent Activity
**Events Shown:**
- Searches performed
- Sources added/updated
- Indexing completed
- Errors encountered

**Display:**
- Reverse chronological order
- Last 5-10 events
- Icons for event types
- Timestamps (relative: "2h ago")

#### 4. Quick Actions
**Buttons:**
- Search documentation
- Add new source
- View all sources
- Settings

### Empty State (New User)

```
┌──────────────────────────────────────────────────────────┐
│              Welcome to ContextStream!                    │
│                                                           │
│              [Illustration: Searching docs]               │
│                                                           │
│    Get started by adding your first documentation        │
│    source. We'll index it and make it searchable         │
│    via Claude and other AI tools.                        │
│                                                           │
│               [+ Add Your First Source]                  │
│                                                           │
│    Popular sources:                                      │
│    • React (react.dev)                                  │
│    • Python (docs.python.org)                           │
│    • Vue.js (vuejs.org)                                 │
└──────────────────────────────────────────────────────────┘
```

### Success Criteria
- Dashboard loads in <1 second
- Status of all sources immediately visible
- Quick access to common actions (search, add source)
- Activity log helps users track what happened

---

## Flow 6: Settings & Configuration

### Entry Point
- Navigation: "Settings" menu item
- User profile dropdown → "Settings"
- First-time setup wizard

### User Goal
Configure account, API keys, workspaces, and system preferences

### Settings Sections

#### 1. Profile Settings
```
Profile
┌──────────────────────────────────────┐
│ Name                                 │
│ [Alex Thompson]                      │
│                                      │
│ Email                                │
│ [alex@example.com]                  │
│ ✓ Verified                          │
│                                      │
│ Avatar                               │
│ [👤]  [Upload new image]            │
│                                      │
│ Password                             │
│ ••••••••  [Change Password]         │
│                                      │
│      [Cancel]  [Save Changes]       │
└──────────────────────────────────────┘
```

#### 2. API Keys (MCP Authentication)
```
API Keys
┌──────────────────────────────────────────────────────┐
│ Create API keys to authenticate Claude Desktop       │
│ and other MCP clients.                               │
│                                                      │
│ Your API Keys                                        │
│ ┌────────────────────────────────────────────────┐  │
│ │ Claude Desktop                                  │  │
│ │ sk_live_...xyz123  • Created 5 days ago       │  │
│ │ Last used: 2 hours ago              [Revoke]  │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ [+ Create New API Key]                              │
└──────────────────────────────────────────────────────┘
```

**Create API Key Flow:**
1. Click "+ Create New API Key"
2. Modal: Enter key name (e.g., "Claude Desktop", "VS Code")
3. Generate key
4. Show key once (copy to clipboard)
5. Warning: "Save this key. You won't see it again."

#### 3. Workspaces (Phase 2)
```
Workspaces
┌──────────────────────────────────────────────────────┐
│ Separate documentation sources by project            │
│                                                      │
│ Your Workspaces                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ Personal                                        │  │
│ │ 5 sources • Default workspace       [Settings] │  │
│ ├────────────────────────────────────────────────┤  │
│ │ Work - Project Alpha                           │  │
│ │ 3 sources • Client project          [Settings] │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ [+ Create New Workspace]                            │
└──────────────────────────────────────────────────────┘
```

#### 4. Preferences
```
Preferences
┌──────────────────────────────────────┐
│ Appearance                           │
│ ● Dark mode (recommended)            │
│ ○ Light mode                         │
│ ○ System default                     │
│                                      │
│ Search Settings                      │
│ Results per page                     │
│ [20 ▾]                              │
│                                      │
│ ☑ Show relevance scores             │
│ ☑ Highlight search terms            │
│ ☑ Open results in new tab           │
│                                      │
│ Notifications                        │
│ ☑ Indexing complete                 │
│ ☑ Update available                  │
│ ☐ Weekly summary email              │
│                                      │
│      [Cancel]  [Save Changes]       │
└──────────────────────────────────────┘
```

#### 5. Embedding Provider
```
Embedding Provider
┌──────────────────────────────────────┐
│ Choose how to generate embeddings     │
│ for semantic search.                  │
│                                       │
│ ● OpenAI (recommended)                │
│   Fast, high-quality embeddings       │
│   API Key: [sk-...xyz] [Change]      │
│                                       │
│ ○ Local (offline)                     │
│   Runs on your machine, slower        │
│   No external API calls               │
│                                       │
│      [Cancel]  [Save Changes]        │
└──────────────────────────────────────┘
```

### Success Criteria
- All settings clearly labeled
- Changes save immediately with confirmation
- Sensitive data (API keys) handled securely
- Settings persist across sessions

---

## Error Handling Patterns

### Network Errors
**Trigger:** API request fails due to network issue

**User sees:**
- Toast notification: "Connection lost. Retrying..."
- Retry automatically (exponential backoff)
- After 3 retries: "Unable to connect. Check your internet."
- Action: "Retry" button

**Design:**
- Don't block UI for temporary issues
- Allow user to continue working
- Queue operations if possible

### Rate Limiting
**Trigger:** User exceeds rate limit

**User sees:**
- Toast: "Too many requests. Please wait 60 seconds."
- Timer countdown in UI
- Disable actions temporarily

**Prevention:**
- Show limits in settings
- Warn when approaching limit

### Validation Errors
**Trigger:** User input is invalid

**User sees:**
- Inline error message below input
- Red border on input field
- Error icon
- Specific, actionable error message

**Examples:**
- "URL must start with https://"
- "Workspace name must be 3-50 characters"
- "This email is already registered"

### Server Errors
**Trigger:** Backend error (500, 503)

**User sees:**
- Error page or modal
- "Something went wrong"
- Error ID for support
- "Retry" and "Report Issue" buttons

**Design:**
- Don't expose technical details
- Provide way to report issue
- Log error details for debugging

### Stale Data Warning
**Trigger:** Source hasn't updated in >30 days

**User sees:**
- Warning badge on source card
- "Last updated 45 days ago"
- Suggestion: "Update now?"

---

## Mobile Responsive Patterns

### Mobile Breakpoint: <768px

**Dashboard:**
- Stack cards vertically
- Collapse sidebar to bottom navigation
- Reduce padding and font sizes
- Single-column layout

**Search:**
- Full-screen search on mobile
- Simplified filters (drawer)
- Tap to expand result snippets

**Forms:**
- Stack fields vertically
- Larger touch targets (min 44x44px)
- Native mobile inputs (date picker, etc.)

**Navigation:**
- Bottom tab bar (Dashboard, Sources, Search, Settings)
- Hamburger menu for secondary nav

---

## Accessibility Patterns

### Keyboard Navigation
- `Tab`: Navigate between interactive elements
- `Enter`: Activate buttons, links
- `Space`: Toggle checkboxes, buttons
- `/`: Focus search (global shortcut)
- `Esc`: Close modals, clear search
- Arrow keys: Navigate lists, dropdowns

### Screen Readers
- All images have alt text
- Form fields have associated labels
- Error messages linked to inputs (aria-describedby)
- Loading states announced (aria-live)
- Page titles describe content

### Focus Management
- Visible focus indicators (3px ring)
- Focus trapped in modals
- Focus returned after modal close
- Skip links for main content

---

## Success Metrics

### User Engagement
- **Activation Rate**: % users who index first source within 24h (Target: 70%+)
- **Retention**: % users active after 7/30/90 days (Target: 60%/40%/30%)
- **Sources per User**: Average sources indexed (Target: 10+ after 1 month)
- **Search Frequency**: Searches per active user per day (Target: 15+)

### Performance
- **Time to First Source**: Median time from signup to first indexed source (Target: <10 min)
- **Search Speed**: p95 latency for search queries (Target: <2s)
- **Indexing Success Rate**: % of sources that index successfully (Target: 95%+)

### User Satisfaction
- **Task Success Rate**: % users who complete intended task (Target: 85%+)
- **Error Rate**: Errors encountered per session (Target: <2%)
- **NPS Score**: Net Promoter Score (Target: 50+)

---

## Changelog

**Version 1.0** (2025-10-09)
- Initial user flows for MVP features
- All Phase 1 features documented
- Mobile and accessibility patterns included
- Error handling and edge cases defined
