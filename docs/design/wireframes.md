# ContextStream Wireframes

## Overview

This document provides text-based wireframes for all key pages in the ContextStream MVP. These wireframes define layout structure, component placement, and responsive behavior for implementation.

**Breakpoints:**
- Mobile: 320-767px
- Tablet: 768-1023px
- Desktop: 1024px+

**Design System Reference:** See `design-system.md` for colors, typography, spacing, and component specs.

---

## 1. Landing Page (Unauthenticated)

### Desktop Layout (1024px+)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header (h-16, fixed, bg-neutral-900, border-b)                         │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │ [Logo] ContextStream    [Features] [Docs] [GitHub]  [Sign In] │││   │
│ └──────────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────┤
│ Hero Section (min-h-screen, flex items-center, bg-gradient)            │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │                                                                    │   │
│ │         Make Any Documentation AI-Accessible in Minutes          │   │
│ │            (text-5xl, font-bold, text-center)                    │   │
│ │                                                                    │   │
│ │     Open-source MCP server that indexes websites and codebases   │   │
│ │            (text-xl, text-neutral-300, text-center)              │   │
│ │                                                                    │   │
│ │                  [Get Started →] [View Demo]                     │   │
│ │              (primary button)  (secondary button)                │   │
│ │                                                                    │   │
│ │                   ▼ See how it works                              │   │
│ │                                                                    │   │
│ └──────────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────┤
│ Features Section (py-24, bg-neutral-900)                                │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │              Built for AI-First Developers                        │   │
│ │                  (text-3xl, font-bold)                           │   │
│ │                                                                    │   │
│ │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│ │ │ [Icon: ⚡]  │  │ [Icon: 🔍] │  │ [Icon: 🔒] │               │   │
│ │ │ Fast Setup  │  │ Smart Search│  │ Private &   │               │   │
│ │ │             │  │             │  │ Secure      │               │   │
│ │ │ Index docs  │  │ Hybrid BM25 │  │ Self-host   │               │   │
│ │ │ in minutes  │  │ + vector    │  │ your data   │               │   │
│ │ └─────────────┘  └─────────────┘  └─────────────┘               │   │
│ │                                                                    │   │
│ │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│ │ │ [Icon: 🔄] │  │ [Icon: 📚] │  │ [Icon: 🌐] │               │   │
│ │ │ Auto-Update │  │ MCP Native  │  │ Open Source │               │   │
│ │ │             │  │             │  │             │               │   │
│ │ │ Stay current│  │ Works with  │  │ MIT license │               │   │
│ │ │ with docs   │  │ Claude AI   │  │ free forever│               │   │
│ │ └─────────────┘  └─────────────┘  └─────────────┘               │   │
│ └──────────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────┤
│ Demo Section (py-24, bg-neutral-800)                                    │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │                   See ContextStream in Action                     │   │
│ │                                                                    │   │
│ │     ┌─────────────────────────────────────────────────────┐       │   │
│ │     │ [Screenshot/Video: Dashboard with indexed sources]  │       │   │
│ │     │                                                      │       │   │
│ │     │   React Docs ✓    Python Docs ✓    Vue Guide ✓     │       │   │
│ │     │   240 pages       487 pages         156 pages       │       │   │
│ │     └─────────────────────────────────────────────────────┘       │   │
│ │                                                                    │   │
│ │                    [Try it Free →]                                │   │
│ └──────────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────┤
│ CTA Section (py-16, bg-primary-600)                                     │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │           Ready to make your docs AI-accessible?                  │   │
│ │                (text-3xl, font-bold, text-white)                 │   │
│ │                                                                    │   │
│ │         [Get Started - It's Free →]    [Star on GitHub]          │   │
│ │                                                                    │   │
│ └──────────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────┤
│ Footer (py-12, bg-neutral-900, border-t)                                │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │ [Logo] ContextStream                                              │   │
│ │                                                                    │   │
│ │ Product          Resources        Company                         │   │
│ │ Features         Documentation     About                          │   │
│ │ Pricing          API Reference     Blog                           │   │
│ │ Changelog        GitHub            Contact                        │   │
│ │                                                                    │   │
│ │ © 2025 ContextStream. Open source under MIT license.             │   │
│ └──────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (320-767px)

```
┌──────────────────────────────────┐
│ Header (h-14, fixed, bg-dark)    │
│ [☰] ContextStream      [Sign In] │
├──────────────────────────────────┤
│ Hero (min-h-screen, p-4)         │
│                                  │
│  Make Any Documentation          │
│  AI-Accessible                   │
│  (text-3xl, font-bold)          │
│                                  │
│  Open-source MCP server          │
│  (text-base)                     │
│                                  │
│  [Get Started →] (full-width)   │
│  [View Demo] (full-width)       │
│                                  │
├──────────────────────────────────┤
│ Features (py-12, stack)          │
│                                  │
│  ┌────────────────────────────┐ │
│  │ [Icon] Fast Setup          │ │
│  │ Index docs in minutes      │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ [Icon] Smart Search        │ │
│  │ Hybrid BM25 + vector       │ │
│  └────────────────────────────┘ │
│                                  │
│  [See all features →]           │
│                                  │
├──────────────────────────────────┤
│ CTA (py-8)                       │
│  Get Started Free                │
│  [Create Account]                │
└──────────────────────────────────┘
```

---

## 2. Dashboard (Main Overview)

### Desktop Layout with Sidebar

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header (h-16, fixed, bg-neutral-900, border-b, z-50)                   │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │ [Logo] ContextStream    [Search: Press / to focus ................]│││
│ │                                                                    │   │
│ │                                             [🔔] [⚙️] [User ▾]  │   │
│ └──────────────────────────────────────────────────────────────────┘   │
├──────────┬─────────────────────────────────────────────────────────────┤
│ Sidebar  │ Main Content (flex-1, overflow-y-auto)                      │
│ (w-64)   │ ┌───────────────────────────────────────────────────────┐   │
│          │ │ Dashboard                           [+ Add Source] │││ │   │
│ ┌──────┐ │ │                                                       │   │
│ │ [🏠] │ │ │ Overview Statistics (grid, grid-cols-4, gap-6)       │   │
│ │ Home │ │ │ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────┐│   │
│ └──────┘ │ │ │     8     │ │   1,247   │ │  142 MB   │ │  15   ││   │
│ (active) │ │ │  Sources  │ │   Pages   │ │  Storage  │ │Queries││   │
│          │ │ │           │ │           │ │           │ │(7 days││   │
│ ┌──────┐ │ │ │ +2 this   │ │ +156 new  │ │ +12 MB   │ │  +3   ││   │
│ │ [📚] │ │ │ │  week     │ │  pages    │ │           │ │       ││   │
│ │Source│ │ │ └───────────┘ └───────────┘ └───────────┘ └───────┘│   │
│ │  s   │ │ │                                                       │   │
│ └──────┘ │ │ Recent Sources                        [View All →]  │   │
│          │ │ ┌───────────────────────────────────────────────────┐│   │
│ ┌──────┐ │ │ │ React Documentation              [•••]            ││   │
│ │ [🔍] │ │ │ │ react.dev                                         ││   │
│ │Search│ │ │ │ ✓ Active • 240 pages • Updated 2 days ago        ││   │
│ └──────┘ │ │ ├───────────────────────────────────────────────────┤│   │
│          │ │ │ Python Docs                      [•••]            ││   │
│ ┌──────┐ │ │ │ docs.python.org                                   ││   │
│ │ [⚙️] │ │ │ │ 🔄 Updating • 487 pages • Update in progress...  ││   │
│ │ Sett │ │ │ ├───────────────────────────────────────────────────┤│   │
│ │ ings│ │ │ │ Vue.js Guide                     [•••]            ││   │
│ └──────┘ │ │ │ vuejs.org                                         ││   │
│          │ │ │ ⏸️ Paused • 156 pages • Updated 2 weeks ago      ││   │
│ ─────────│ │ └───────────────────────────────────────────────────┘│   │
│          │ │                                                       │   │
│ [Theme]  │ │ Recent Activity                                      │   │
│ [Help]   │ │ ┌───────────────────────────────────────────────────┐│   │
│          │ │ │ 🔍 Searched "useState hook" → 12 results          ││   │
│          │ │ │ 2 hours ago                                       ││   │
│          │ │ ├───────────────────────────────────────────────────┤│   │
│          │ │ │ ✓ React Docs updated successfully (240 pages)    ││   │
│          │ │ │ 2 days ago                                        ││   │
│          │ │ ├───────────────────────────────────────────────────┤│   │
│          │ │ │ ➕ Added new source: Python Docs                 ││   │
│          │ │ │ 3 days ago                                        ││   │
│          │ │ └───────────────────────────────────────────────────┘│   │
│          │ │                                                       │   │
│          │ │ Quick Actions                                        │   │
│          │ │ [Search Documentation] [Add Source] [View Sources]  │   │
│          │ └───────────────────────────────────────────────────────┘   │
└──────────┴─────────────────────────────────────────────────────────────┘
```

### Mobile Layout (Bottom Nav)

```
┌──────────────────────────────────┐
│ Header (h-14, fixed, top-0)      │
│ [☰] ContextStream       [🔍] [•]│
├──────────────────────────────────┤
│ Content (pb-16, overflow-scroll) │
│                                  │
│ Dashboard                        │
│                                  │
│ Statistics (grid-cols-2)         │
│ ┌──────────┐ ┌──────────┐       │
│ │    8     │ │  1,247   │       │
│ │ Sources  │ │  Pages   │       │
│ └──────────┘ └──────────┘       │
│ ┌──────────┐ ┌──────────┐       │
│ │ 142 MB   │ │   15     │       │
│ │ Storage  │ │ Queries  │       │
│ └──────────┘ └──────────┘       │
│                                  │
│ Recent Sources                   │
│ ┌──────────────────────────────┐ │
│ │ React Documentation          │ │
│ │ ✓ Active • 240 pages         │ │
│ │ Updated 2d ago         [•••] │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ Python Docs                  │ │
│ │ 🔄 Updating • 487 pages      │ │
│ │ Now                    [•••] │ │
│ └──────────────────────────────┘ │
│                                  │
│ [+ Add Source] (full-width)     │
│                                  │
├──────────────────────────────────┤
│ Bottom Nav (h-16, fixed, bottom) │
│ [🏠 Home] [📚 Sources] [🔍 Sear│
│                                  │
└──────────────────────────────────┘
```

---

## 3. Sources List Page

### Desktop Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header (same as dashboard)                                              │
├──────────┬─────────────────────────────────────────────────────────────┤
│ Sidebar  │ Main Content                                                 │
│          │ ┌───────────────────────────────────────────────────────┐   │
│          │ │ Sources                             [+ Add Source] │││ │   │
│          │ │                                                       │   │
│          │ │ Filter & Sort                                        │   │
│          │ │ ┌────────┐ ┌────────┐ ┌────────┐ [Search sources...]│   │
│          │ │ │Status ▾│ │Type   ▾│ │Sort   ▾│                    │   │
│          │ │ │All     │ │All     │ │Recent  │                    │   │
│          │ │ └────────┘ └────────┘ └────────┘                    │   │
│          │ │                                                       │   │
│          │ │ Active Sources (3)                                   │   │
│          │ │ ┌───────────────────────────────────────────────────┐│   │
│          │ │ │ React Documentation                        [•••]  ││   │
│          │ │ │ https://react.dev                                 ││   │
│          │ │ │ ┌─────────────────────────────────────────────┐   ││   │
│          │ │ │ │ ✓ Active                                    │   ││   │
│          │ │ │ │                                             │   ││   │
│          │ │ │ │ 240 pages • 14.2 MB • Updated 2 days ago   │   ││   │
│          │ │ │ │ Next update: In 5 days (auto-weekly)       │   ││   │
│          │ │ │ │                                             │   ││   │
│          │ │ │ │ [Update Now] [Settings]                    │   ││   │
│          │ │ │ └─────────────────────────────────────────────┘   ││   │
│          │ │ └───────────────────────────────────────────────────┘│   │
│          │ │                                                       │   │
│          │ │ ┌───────────────────────────────────────────────────┐│   │
│          │ │ │ Python Documentation                       [•••]  ││   │
│          │ │ │ https://docs.python.org                           ││   │
│          │ │ │ ┌─────────────────────────────────────────────┐   ││   │
│          │ │ │ │ ✓ Active                                    │   ││   │
│          │ │ │ │                                             │   ││   │
│          │ │ │ │ 487 pages • 32.5 MB • Updated 5 hours ago  │   ││   │
│          │ │ │ │ Next update: Tomorrow (auto-daily)         │   ││   │
│          │ │ │ │                                             │   ││   │
│          │ │ │ │ [Update Now] [Settings]                    │   ││   │
│          │ │ │ └─────────────────────────────────────────────┘   ││   │
│          │ │ └───────────────────────────────────────────────────┘│   │
│          │ │                                                       │   │
│          │ │ Paused Sources (1)                                   │   │
│          │ │ ┌───────────────────────────────────────────────────┐│   │
│          │ │ │ Vue.js Guide                               [•••]  ││   │
│          │ │ │ https://vuejs.org                                 ││   │
│          │ │ │ ⏸️ Paused • 156 pages • Updated 2 weeks ago      ││   │
│          │ │ │ [Resume] [Settings]                               ││   │
│          │ │ └───────────────────────────────────────────────────┘│   │
│          │ └───────────────────────────────────────────────────────┘   │
└──────────┴─────────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌──────────────────────────────────┐
│ Header                           │
│ [←] Sources        [+] [Filter] │
├──────────────────────────────────┤
│ Content (overflow-scroll)        │
│                                  │
│ [Search sources..............]  │
│                                  │
│ Active (3)                       │
│ ┌──────────────────────────────┐ │
│ │ React Documentation          │ │
│ │ react.dev                    │ │
│ │ ✓ Active • 240 pages         │ │
│ │ Updated 2d ago               │ │
│ │                              │ │
│ │ [Update] [Settings]    [•••] │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Python Docs                  │ │
│ │ docs.python.org              │ │
│ │ ✓ Active • 487 pages         │ │
│ │ Updated 5h ago               │ │
│ │                              │ │
│ │ [Update] [Settings]    [•••] │ │
│ └──────────────────────────────┘ │
│                                  │
│ Paused (1)                       │
│ ┌──────────────────────────────┐ │
│ │ Vue.js Guide                 │ │
│ │ ⏸️ Paused • 156 pages        │ │
│ │ [Resume]               [•••] │ │
│ └──────────────────────────────┘ │
│                                  │
│ [+ Add New Source] (sticky)     │
├──────────────────────────────────┤
│ Bottom Nav                       │
└──────────────────────────────────┘
```

---

## 4. Source Detail Page

### Desktop Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header (same as dashboard)                                              │
├──────────┬─────────────────────────────────────────────────────────────┤
│ Sidebar  │ Main Content                                                 │
│          │ ┌───────────────────────────────────────────────────────┐   │
│          │ │ [← Sources]                [Update] [Settings] [•••] │   │
│          │ │                                                       │   │
│          │ │ React Documentation                                  │   │
│          │ │ https://react.dev                                    │   │
│          │ │ ✓ Active • Last updated 2 days ago                   │   │
│          │ │                                                       │   │
│          │ │ Statistics (grid-cols-4, gap-4)                      │   │
│          │ │ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐│   │
│          │ │ │    240    │ │  14.2 MB  │ │   98.5%   │ │   23    ││   │
│          │ │ │   Pages   │ │  Storage  │ │  Success  │ │ Updates ││   │
│          │ │ └───────────┘ └───────────┘ └───────────┘ └─────────┘│   │
│          │ │                                                       │   │
│          │ │ Update History (Recent activity timeline)            │   │
│          │ │ ┌───────────────────────────────────────────────────┐│   │
│          │ │ │ ✓ Manual update completed                         ││   │
│          │ │ │   240 pages indexed • 2 days ago                  ││   │
│          │ │ ├───────────────────────────────────────────────────┤│   │
│          │ │ │ ✓ Auto-update completed                           ││   │
│          │ │ │   238 pages indexed (2 new) • 9 days ago         ││   │
│          │ │ ├───────────────────────────────────────────────────┤│   │
│          │ │ │ ✓ Initial indexing completed                      ││   │
│          │ │ │   240 pages indexed • 16 days ago                 ││   │
│          │ │ └───────────────────────────────────────────────────┘│   │
│          │ │                                                       │   │
│          │ │ Indexed Pages            [Search pages............] │   │
│          │ │ ┌───────────────────────────────────────────────────┐│   │
│          │ │ │ Title                          URL        Updated ││   │
│          │ │ ├───────────────────────────────────────────────────┤│   │
│          │ │ │ Learn React               /learn         2d ago   ││   │
│          │ │ │ Tutorial                  /learn/...     2d ago   ││   │
│          │ │ │ useState Hook             /reference/... 2d ago   ││   │
│          │ │ │ useEffect Hook            /reference/... 2d ago   ││   │
│          │ │ │ ...                       ...            ...      ││   │
│          │ │ │                                                    ││   │
│          │ │ │ Showing 240 pages       [1] 2 3 4 ... 24 [Next →]││   │
│          │ │ └───────────────────────────────────────────────────┘│   │
│          │ └───────────────────────────────────────────────────────┘   │
└──────────┴─────────────────────────────────────────────────────────────┘
```

---

## 5. Search Page

### Desktop Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header (same, but search bar is active/focused)                        │
├──────────┬─────────────────────────────────────────────────────────────┤
│ Sidebar  │ Main Content                                                 │
│          │ ┌───────────────────────────────────────────────────────┐   │
│          │ │ Search Documentation                                  │   │
│          │ │                                                       │   │
│          │ │ [🔍 Search across all indexed docs...............] │││ │   │
│          │ │                                                       │   │
│          │ │ Filters                                              │   │
│          │ │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │   │
│          │ │ │Source ▾│ │Type   ▾│ │Date   ▾│ │Sort   ▾│         │   │
│          │ │ │All     │ │All     │ │Any     │ │Releva│           │   │
│          │ │ └────────┘ └────────┘ └────────┘ └────────┘         │   │
│          │ │                                                       │   │
│          │ │ Results for "useState hook"                          │   │
│          │ │ Found 12 results in 0.42 seconds                     │   │
│          │ │                                                       │   │
│          │ │ ┌───────────────────────────────────────────────────┐│   │
│          │ │ │ useState Hook - React Docs              [95% ⭐]  ││   │
│          │ │ │ react.dev/reference/react/useState                ││   │
│          │ │ │                                                    ││   │
│          │ │ │ useState is a React Hook that lets you add a      ││   │
│          │ │ │ **state variable** to your component. Call        ││   │
│          │ │ │ useState at the top level of your component...    ││   │
│          │ │ │                                                    ││   │
│          │ │ │ React Documentation • Updated 2 days ago          ││   │
│          │ │ └───────────────────────────────────────────────────┘│   │
│          │ │                                                       │   │
│          │ │ ┌───────────────────────────────────────────────────┐│   │
│          │ │ │ State: A Component's Memory           [87% ⭐]    ││   │
│          │ │ │ react.dev/learn/state-a-components-memory         ││   │
│          │ │ │                                                    ││   │
│          │ │ │ Components need to "remember" things: the current ││   │
│          │ │ │ input value, the current image, the shopping cart ││   │
│          │ │ │ In React, this kind of component-specific memory  ││   │
│          │ │ │ is called **state**. You can add state to a...    ││   │
│          │ │ │                                                    ││   │
│          │ │ │ React Documentation • Updated 2 days ago          ││   │
│          │ │ └───────────────────────────────────────────────────┘│   │
│          │ │                                                       │   │
│          │ │ ┌───────────────────────────────────────────────────┐│   │
│          │ │ │ Hooks API Reference                   [76% ⭐]    ││   │
│          │ │ │ react.dev/reference/react/hooks                   ││   │
│          │ │ │                                                    ││   │
│          │ │ │ Hooks let you use different React features from   ││   │
│          │ │ │ your components. You can either use the built-in  ││   │
│          │ │ │ Hooks or combine them to build your own. This     ││   │
│          │ │ │ page lists all built-in Hooks in React...         ││   │
│          │ │ │                                                    ││   │
│          │ │ │ React Documentation • Updated 2 days ago          ││   │
│          │ │ └───────────────────────────────────────────────────┘│   │
│          │ │                                                       │   │
│          │ │ [Load More Results]                                  │   │
│          │ └───────────────────────────────────────────────────────┘   │
└──────────┴─────────────────────────────────────────────────────────────┘
```

### Empty State (No Query)

```
┌──────────────────────────────────┐
│ Search Documentation             │
│                                  │
│ [🔍 Search...................]   │
│                                  │
│ ┌──────────────────────────────┐ │
│ │                              │ │
│ │       [Icon: Search]         │ │
│ │                              │ │
│ │  Search Across All Your      │ │
│ │  Indexed Documentation       │ │
│ │                              │ │
│ │  Try searching for:          │ │
│ │  • "useState hook"          │ │
│ │  • "API authentication"     │ │
│ │  • "deployment guide"       │ │
│ │                              │ │
│ │  Press / to focus search     │ │
│ │                              │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### No Results State

```
┌──────────────────────────────────┐
│ Search Results                   │
│                                  │
│ No results found for "xyz123"   │
│                                  │
│ ┌──────────────────────────────┐ │
│ │                              │ │
│ │    [Icon: Empty Search]      │ │
│ │                              │ │
│ │  No Results Found            │ │
│ │                              │ │
│ │  Suggestions:                │ │
│ │  • Check your spelling       │ │
│ │  • Try different keywords    │ │
│ │  • Remove filters           │ │
│ │  • Browse all sources       │ │
│ │                              │ │
│ │  [Browse All Sources →]     │ │
│ │                              │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

---

## 6. Add Source Modal

### Desktop Modal (Centered Overlay)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Dark overlay, 75% opacity]                                             │
│                                                                         │
│      ┌─────────────────────────────────────────────────────────┐       │
│      │ Add Documentation Source                           [✕]  │       │
│      ├─────────────────────────────────────────────────────────┤       │
│      │                                                          │       │
│      │ Source Name (optional)                                  │       │
│      │ [React Documentation...........................]        │       │
│      │ Leave blank to auto-detect from URL                     │       │
│      │                                                          │       │
│      │ Documentation URL *                                     │       │
│      │ [https://react.dev..........................]           │       │
│      │                                                          │       │
│      │ Source Type *                                           │       │
│      │ ● Website (documentation site)                          │       │
│      │ ○ GitHub Repository                                     │       │
│      │ ○ Confluence                                            │       │
│      │                                                          │       │
│      │ ▼ Advanced Settings (collapsed)                         │       │
│      │                                                          │       │
│      │ Preview                                                 │       │
│      │ ┌────────────────────────────────────────────────────┐ │       │
│      │ │ ✓ URL is valid and accessible                      │ │       │
│      │ │ ✓ Detected: React Documentation                    │ │       │
│      │ │ 📄 Estimated pages: ~240                           │ │       │
│      │ │ ⏱️ Estimated time: 5-8 minutes                     │ │       │
│      │ └────────────────────────────────────────────────────┘ │       │
│      │                                                          │       │
│      │                    [Cancel]  [Add Source →] (primary)   │       │
│      └─────────────────────────────────────────────────────────┘       │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Advanced Settings (Expanded)

```
      │ ▼ Advanced Settings (expanded)                          │
      │ ┌────────────────────────────────────────────────────┐ │
      │ │ Max Pages to Index                                 │ │
      │ │ [1000................] (optional, blank = unlimited) │
      │ │                                                      │ │
      │ │ Update Frequency                                   │ │
      │ │ [ Daily ▾ ] (options: Hourly, Daily, Weekly,      │ │
      │ │              Manual Only)                          │ │
      │ │                                                      │ │
      │ │ Authentication (if required)                       │ │
      │ │ [ None ▾ ] (options: Basic Auth, Cookie, API Key) │ │
      │ │                                                      │ │
      │ │ Content Selectors (optional)                       │ │
      │ │ CSS selector for main content:                     │ │
      │ │ [main, article, .content...................]        │ │
      │ │                                                      │ │
      │ │ Exclusion Patterns                                 │ │
      │ │ [/blog/*, /archive/*...................]            │ │
      │ │ Pages matching these won't be indexed              │ │
      │ └────────────────────────────────────────────────────┘ │
```

### Mobile Modal (Full Screen)

```
┌──────────────────────────────────┐
│ [✕] Add Source                   │
├──────────────────────────────────┤
│                                  │
│ Source Name                      │
│ [React Documentation.........]   │
│                                  │
│ URL *                            │
│ [https://react.dev...........]   │
│                                  │
│ Type *                           │
│ [ Website ▾ ]                   │
│                                  │
│ ▼ Advanced Settings             │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ✓ Valid URL                  │ │
│ │ ~240 pages                   │ │
│ │ ~5-8 minutes                 │ │
│ └──────────────────────────────┘ │
│                                  │
│ [Cancel]  [Add Source →]        │
│                                  │
└──────────────────────────────────┘
```

---

## 7. Indexing Progress Page

### Desktop Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header                                                                  │
├──────────┬─────────────────────────────────────────────────────────────┤
│ Sidebar  │ Main Content (centered)                                      │
│          │ ┌───────────────────────────────────────────────────────┐   │
│          │ │                                                       │   │
│          │ │        Indexing React Documentation                  │   │
│          │ │                                                       │   │
│          │ │   [Animated spinner icon or progress circle]         │   │
│          │ │                                                       │   │
│          │ │   Progress: 42 / 240 pages (18%)                     │   │
│          │ │   ┌────────────────────────────────────────────┐     │   │
│          │ │   │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│     │   │
│          │ │   └────────────────────────────────────────────┘     │   │
│          │ │                                                       │   │
│          │ │   Time elapsed: 1m 23s                               │   │
│          │ │   Estimated remaining: 6m 15s                        │   │
│          │ │                                                       │   │
│          │ │   Recently indexed:                                  │   │
│          │ │   ┌────────────────────────────────────────────┐     │   │
│          │ │   │ ✓ react.dev/learn/tutorial                 │     │   │
│          │ │   │ ✓ react.dev/learn/thinking-in-react        │     │   │
│          │ │   │ ✓ react.dev/reference/react/useState       │     │   │
│          │ │   │ ✓ react.dev/reference/react/useEffect      │     │   │
│          │ │   │ ✓ react.dev/reference/react/useContext     │     │   │
│          │ │   └────────────────────────────────────────────┘     │   │
│          │ │                                                       │   │
│          │ │   [Continue in Background]  [Cancel]                 │   │
│          │ │                                                       │   │
│          │ └───────────────────────────────────────────────────────┘   │
└──────────┴─────────────────────────────────────────────────────────────┘
```

### Completion Success Screen

```
┌──────────────────────────────────┐
│                                  │
│     [Icon: Checkmark in circle]  │
│                                  │
│  Indexing Complete!              │
│                                  │
│  React Documentation             │
│  240 pages indexed in 7 minutes  │
│  Storage used: 14.2 MB           │
│  Last updated: Just now          │
│                                  │
│  Top Pages:                      │
│  • Learn React                  │
│  • useState Hook                │
│  • useEffect Hook               │
│                                  │
│  [View Source] [Search Now] [Done│
│                                  │
└──────────────────────────────────┘
```

---

## 8. Settings Page

### Desktop Layout (Tabbed)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header                                                                  │
├──────────┬─────────────────────────────────────────────────────────────┤
│ Sidebar  │ Main Content                                                 │
│          │ ┌───────────────────────────────────────────────────────┐   │
│          │ │ Settings                                              │   │
│          │ │                                                       │   │
│          │ │ Tabs: [Profile] [API Keys] [Workspaces] [Preferences] │  │
│          │ │ ───────────────────────────────────────────────────   │   │
│          │ │                                                       │   │
│          │ │ Profile                                              │   │
│          │ │ ┌────────────────────────────────────────────────┐   │   │
│          │ │ │ Name                                            │   │   │
│          │ │ │ [Alex Thompson...........................]      │   │   │
│          │ │ │                                                 │   │   │
│          │ │ │ Email                                           │   │   │
│          │ │ │ [alex@example.com........................]      │   │   │
│          │ │ │ ✓ Verified                                      │   │   │
│          │ │ │                                                 │   │   │
│          │ │ │ Avatar                                          │   │   │
│          │ │ │ [👤]  [Upload new image]                       │   │   │
│          │ │ │                                                 │   │   │
│          │ │ │ Password                                        │   │   │
│          │ │ │ ••••••••  [Change Password]                    │   │   │
│          │ │ │                                                 │   │   │
│          │ │ │ Danger Zone                                     │   │   │
│          │ │ │ [Delete Account]                                │   │   │
│          │ │ │                                                 │   │   │
│          │ │ │      [Cancel]  [Save Changes]                  │   │   │
│          │ │ └────────────────────────────────────────────────┘   │   │
│          │ └───────────────────────────────────────────────────────┘   │
└──────────┴─────────────────────────────────────────────────────────────┘
```

### API Keys Tab

```
│          │ │ API Keys                                         │   │
│          │ │ ┌────────────────────────────────────────────────┐│   │
│          │ │ │ Create API keys to authenticate Claude Desktop││   │
│          │ │ │ and other MCP clients.                         ││   │
│          │ │ │                                                 ││   │
│          │ │ │ Your API Keys                                  ││   │
│          │ │ │ ┌───────────────────────────────────────────┐  ││   │
│          │ │ │ │ Claude Desktop                            │  ││   │
│          │ │ │ │ sk_live_...xyz123                        │  ││   │
│          │ │ │ │ Created: 5 days ago                      │  ││   │
│          │ │ │ │ Last used: 2 hours ago         [Revoke]  │  ││   │
│          │ │ │ ├───────────────────────────────────────────┤  ││   │
│          │ │ │ │ VS Code Extension                        │  ││   │
│          │ │ │ │ sk_live_...abc456                        │  ││   │
│          │ │ │ │ Created: 12 days ago                     │  ││   │
│          │ │ │ │ Never used                     [Revoke]  │  ││   │
│          │ │ │ └───────────────────────────────────────────┘  ││   │
│          │ │ │                                                 ││   │
│          │ │ │ [+ Create New API Key]                         ││   │
│          │ │ └────────────────────────────────────────────────┘│   │
```

### Preferences Tab

```
│          │ │ Preferences                                      │   │
│          │ │ ┌────────────────────────────────────────────────┐│   │
│          │ │ │ Appearance                                     ││   │
│          │ │ │ ● Dark mode (recommended)                      ││   │
│          │ │ │ ○ Light mode                                   ││   │
│          │ │ │ ○ System default                               ││   │
│          │ │ │                                                 ││   │
│          │ │ │ Search Settings                                ││   │
│          │ │ │ Results per page                               ││   │
│          │ │ │ [20 ▾] (10, 20, 50, 100)                      ││   │
│          │ │ │                                                 ││   │
│          │ │ │ ☑ Show relevance scores                       ││   │
│          │ │ │ ☑ Highlight search terms                      ││   │
│          │ │ │ ☑ Open results in new tab                     ││   │
│          │ │ │                                                 ││   │
│          │ │ │ Notifications                                  ││   │
│          │ │ │ ☑ Indexing complete                           ││   │
│          │ │ │ ☑ Update available                            ││   │
│          │ │ │ ☐ Weekly summary email                        ││   │
│          │ │ │                                                 ││   │
│          │ │ │ Embedding Provider                             ││   │
│          │ │ │ ● OpenAI (recommended)                         ││   │
│          │ │ │   API Key: [Configure]                         ││   │
│          │ │ │ ○ Local (offline, slower)                      ││   │
│          │ │ │                                                 ││   │
│          │ │ │      [Cancel]  [Save Changes]                 ││   │
│          │ │ └────────────────────────────────────────────────┘│   │
```

---

## 9. Empty States

### Dashboard Empty State (New User)

```
┌──────────────────────────────────────────────┐
│                                              │
│         [Illustration: Document + AI]        │
│                                              │
│      Welcome to ContextStream!               │
│                                              │
│  Get started by adding your first            │
│  documentation source. We'll index it        │
│  and make it searchable via Claude and       │
│  other AI tools.                             │
│                                              │
│      [+ Add Your First Source]               │
│                                              │
│  Popular sources:                            │
│  • React (react.dev)                        │
│  • Python (docs.python.org)                 │
│  • Vue.js (vuejs.org)                       │
│  • Next.js (nextjs.org)                     │
│                                              │
└──────────────────────────────────────────────┘
```

### Sources Empty State

```
┌──────────────────────────────────────────────┐
│                                              │
│         [Icon: Empty folder/database]        │
│                                              │
│      No Sources Yet                          │
│                                              │
│  Add documentation sources to start          │
│  indexing content for AI-powered search.     │
│                                              │
│      [+ Add Source]                          │
│                                              │
└──────────────────────────────────────────────┘
```

### Search Empty State (No Sources)

```
┌──────────────────────────────────────────────┐
│                                              │
│         [Icon: Search with X]                │
│                                              │
│      No Sources to Search                    │
│                                              │
│  Add documentation sources before you        │
│  can start searching.                        │
│                                              │
│      [Add Your First Source →]              │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 10. Error States

### Indexing Error

```
┌──────────────────────────────────────────────┐
│                                              │
│         [Icon: Alert triangle]               │
│                                              │
│      Indexing Failed                         │
│                                              │
│  React Documentation                         │
│  https://react.dev                           │
│                                              │
│  Error: Site returned 403 Forbidden          │
│  This site may block automated scraping.     │
│                                              │
│  Suggestions:                                │
│  • Check robots.txt permissions             │
│  • Try adding authentication                │
│  • Contact site administrator               │
│                                              │
│  [Try Again]  [Edit Settings]  [Cancel]     │
│                                              │
└──────────────────────────────────────────────┘
```

### Network Error (Toast)

```
┌────────────────────────────────────┐
│ [!] Connection Lost                │
│                                    │
│ Unable to connect to server.       │
│ Retrying in 5 seconds...           │
│                            [Retry] │
└────────────────────────────────────┘
```

---

## 11. Responsive Breakpoint Summary

### Component Adaptations

**Dashboard:**
- Desktop (1024px+): Sidebar + main content + stat grid (4 cols)
- Tablet (768-1023px): Collapsible sidebar + stat grid (2 cols)
- Mobile (<768px): Bottom nav + stat grid (2 cols) + stack

**Sources List:**
- Desktop: Grid with 2-3 columns of cards
- Tablet: 2 columns
- Mobile: 1 column (stacked)

**Search:**
- Desktop: Sidebar filters + results
- Tablet: Drawer filters + results
- Mobile: Full-width with filter modal

**Modals:**
- Desktop: Centered overlay (max-w-2xl)
- Tablet: Centered overlay (max-w-lg)
- Mobile: Full-screen takeover

**Forms:**
- Desktop: 2-column layout for related fields
- Tablet: 2-column for short fields, 1-column for long
- Mobile: Always 1-column, full-width inputs

---

## Implementation Notes

### Tailwind Classes Reference

**Layout:**
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Sidebar: `w-64 h-screen fixed left-0 top-16`
- Main content: `ml-64 pt-16`

**Cards:**
- Base: `bg-neutral-800 border border-neutral-700 rounded-lg p-6 shadow`
- Hover: `hover:shadow-md hover:-translate-y-1 transition-all duration-200`

**Buttons:**
- Primary: `bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md font-semibold`
- Secondary: `bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-md`

**Typography:**
- H1: `text-4xl font-bold text-neutral-50`
- H2: `text-3xl font-bold text-neutral-50`
- Body: `text-sm text-neutral-300`

### Component Library (shadcn/ui)

Required components:
- Button
- Card (CardHeader, CardContent, CardFooter)
- Input
- Label
- Badge
- Dialog (Modal)
- Toast
- Progress
- Tabs
- Dropdown Menu
- Select
- Checkbox

---

## Changelog

**Version 1.0** (2025-10-09)
- Initial wireframes for all MVP pages
- Desktop and mobile layouts
- Empty and error states
- Component patterns and responsive behavior
