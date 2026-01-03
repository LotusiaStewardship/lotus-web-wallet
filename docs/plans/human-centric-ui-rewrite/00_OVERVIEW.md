# Human-Centric UI/UX Complete Rewrite

## Overview

This plan defines a **complete rewrite** of the lotus-web-wallet UI/UX, centered around two fundamental concepts:

1. **People** — The humans you interact with
2. **Activity** — Everything that happens on the network

This is NOT a refactor. This plan assumes all existing pages are deleted and rebuilt from scratch with a unified, human-centric design philosophy.

**Created**: December 2024  
**Scope**: Complete UI/UX rewrite  
**Priority**: P0 (Critical)  
**Estimated Effort**: 40-60 days

---

## The Problem

The current implementation suffers from:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT STATE PROBLEMS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ❌ FRAGMENTED ARCHITECTURE                                      │
│     • Plugins, composables, and components don't share a         │
│       unified mental model                                       │
│     • P2P, MuSig2, Contacts exist as separate silos              │
│     • No cohesive "story" connecting features                    │
│                                                                  │
│  ❌ FEATURE-CENTRIC INSTEAD OF HUMAN-CENTRIC                     │
│     • Navigation organized by technical features                 │
│     • "Transact", "Explore", "People" are abstract categories    │
│     • Users think: "What happened?" not "Where's the explorer?"  │
│                                                                  │
│  ❌ NO ACTIVITY FOCUS                                            │
│     • No unified "what's new" experience                         │
│     • Notifications scattered across features                    │
│     • No reason to return to the app regularly                   │
│                                                                  │
│  ❌ PEOPLE ARE SECONDARY                                         │
│     • Contacts buried under "People" menu                        │
│     • Shared wallets disconnected from contact relationships     │
│     • P2P presence not integrated into daily experience          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Vision

Transform the wallet into a **relationship and activity hub**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE NEW VISION                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  "What happened while I was away?"                               │
│  ─────────────────────────────────                               │
│  • Unified activity feed across ALL sources                      │
│  • Transactions, P2P events, signing requests, social votes      │
│  • Chronological, filterable, actionable                         │
│                                                                  │
│  "Who am I interacting with?"                                    │
│  ────────────────────────────                                    │
│  • People are first-class citizens                               │
│  • Every action connects to a person                             │
│  • Relationships deepen over time (activity history)             │
│                                                                  │
│  "What can I do right now?"                                      │
│  ──────────────────────────                                      │
│  • Clear, contextual actions                                     │
│  • Smart suggestions based on activity                           │
│  • Progressive disclosure of advanced features                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## How Successful Apps Do This

### Patterns from Industry Leaders

| App           | People-Centric      | Activity-Centric               | Key Insight                         |
| ------------- | ------------------- | ------------------------------ | ----------------------------------- |
| **WhatsApp**  | Contacts + Groups   | Chat list sorted by recency    | Activity IS the home screen         |
| **Venmo**     | Friends feed        | Social transaction feed        | Activity creates engagement         |
| **Slack**     | DMs + Channels      | Unread/mentions/threads        | Activity badges drive return visits |
| **Twitter/X** | Following/Followers | Timeline + Notifications       | Two-tab activity model              |
| **Discord**   | Servers + Friends   | Channels + DMs + Notifications | Activity organized by relationship  |
| **Cash App**  | Contacts            | Activity tab                   | Simple two-concept model            |

### Key Insights

1. **Activity is the hook** — Users return to see "what's new"
2. **People provide context** — Activity without people is meaningless
3. **Recency matters** — Sort by "last interaction", not alphabetically
4. **Badges drive engagement** — Unread counts create urgency
5. **Actions flow from context** — Don't make users navigate to act

---

## New Information Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEW NAVIGATION MODEL                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      BOTTOM NAV                          │    │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐      │    │
│  │  │ Home │  │People│  │  +   │  │Activity│ │Settings│    │    │
│  │  │  🏠  │  │  👥  │  │  ➕  │  │  🔔   │  │  ⚙️  │      │    │
│  │  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  HOME (/)                                                        │
│  ─────────                                                       │
│  • Balance overview                                              │
│  • Quick actions (Send, Receive, Scan)                           │
│  • Recent activity preview (3-5 items)                           │
│  • Online contacts preview                                       │
│  • Pending actions requiring attention                           │
│                                                                  │
│  PEOPLE (/people)                                                │
│  ────────────────                                                │
│  • Contacts (sorted by recency, not alphabetically)              │
│  • Shared Wallets (collaborative relationships)                  │
│  • Online Now (P2P presence)                                     │
│  • Discover (find new signers)                                   │
│                                                                  │
│  ACTION (+)                                                      │
│  ──────────                                                      │
│  • Quick action sheet (Send, Receive, Scan, Create Wallet)       │
│  • Context-aware suggestions                                     │
│                                                                  │
│  ACTIVITY (/activity)                                            │
│  ────────────────────                                            │
│  • Unified feed: transactions, P2P, signing, social              │
│  • Filters: All, Transactions, Requests, Social                  │
│  • Unread/new indicators                                         │
│  • Actionable items inline                                       │
│                                                                  │
│  SETTINGS (/settings)                                            │
│  ────────────────────                                            │
│  • ALL configuration in one place                                │
│  • Wallet, Network, P2P, Notifications, Security, About          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Activity as the Engagement Engine

Activity is the primary retention mechanism. Users return to answer: **"What happened?"**

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED ACTIVITY MODEL                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ACTIVITY SOURCES:                                               │
│  ─────────────────                                               │
│  • Blockchain: Incoming/outgoing transactions                    │
│  • P2P: Peer connections, signer discovery                       │
│  • MuSig2: Signing requests, session updates, completions        │
│  • Social: RANK votes received, profile updates                  │
│  • System: Wallet events, network status changes                 │
│                                                                  │
│  ACTIVITY STATES:                                                │
│  ────────────────                                                │
│  • 🔴 New/Unread — Requires attention                            │
│  • 🟡 Pending — Awaiting action or confirmation                  │
│  • ✅ Complete — Resolved, can be archived                       │
│  • ❌ Failed — Needs retry or acknowledgment                     │
│                                                                  │
│  ACTIVITY ACTIONS:                                               │
│  ─────────────────                                               │
│  • Inline actions (Approve, Reject, View, Retry)                 │
│  • Navigate to detail                                            │
│  • Mark as read                                                  │
│  • Archive/dismiss                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. People as the Relationship Layer

Every interaction connects to a person. People provide meaning to activity.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PEOPLE-CENTRIC MODEL                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CONTACT = RELATIONSHIP                                          │
│  ──────────────────────                                          │
│  • Name + Avatar (human identity)                                │
│  • Address + Public Key (cryptographic identity)                 │
│  • Presence (online/offline via P2P)                             │
│  • Capabilities (can sign, can receive)                          │
│  • History (all activity with this person)                       │
│                                                                  │
│  RELATIONSHIP DEPTH:                                             │
│  ──────────────────                                              │
│  Level 0: Address only (can send/receive)                        │
│  Level 1: + Public key (can create shared wallets)               │
│  Level 2: + P2P connected (real-time presence)                   │
│  Level 3: + Shared wallets (active collaboration)                │
│                                                                  │
│  PEOPLE VIEWS:                                                   │
│  ─────────────                                                   │
│  • Recent: Sorted by last interaction                            │
│  • Favorites: User-pinned contacts                               │
│  • Online: Currently connected via P2P                           │
│  • Shared Wallets: Collaborative relationships                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Home as the Command Center

Home answers: **"What do I need to know right now?"**

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOME SCREEN DESIGN                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    BALANCE CARD                          │    │
│  │  ┌─────────────────────────────────────────────────────┐│    │
│  │  │           1,234.56 XPI                              ││    │
│  │  │      ≈ $12.34 USD (if available)                    ││    │
│  │  │                                                      ││    │
│  │  │  [Send]  [Receive]  [Scan]                          ││    │
│  │  └─────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🔔 NEEDS ATTENTION (if any)                            │    │
│  │  ─────────────────────────                              │    │
│  │  • Alice requested your signature (2m ago) [View]       │    │
│  │  • Backup reminder: Secure your wallet [Backup]         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  👥 ONLINE NOW                                          │    │
│  │  ─────────────                                          │    │
│  │  [Alice 🟢] [Bob 🟢] [Carol 🟢] [+3 more]               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  📊 RECENT ACTIVITY                          [View All] │    │
│  │  ─────────────────                                      │    │
│  │  ↓ Received 100 XPI from Alice • 2h ago                 │    │
│  │  ↑ Sent 50 XPI to Bob • Yesterday                       │    │
│  │  🔐 Signed tx with Carol • 2 days ago                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase Summary

| Phase | Document              | Focus Area                            | Priority | Est. Effort |
| ----- | --------------------- | ------------------------------------- | -------- | ----------- |
| 1     | 01_FOUNDATION.md      | Core infrastructure, stores, types    | P0       | 3-4 days    |
| 2     | 02_ACTIVITY_SYSTEM.md | Unified activity store and feed       | P0       | 4-5 days    |
| 3     | 03_PEOPLE_SYSTEM.md   | People hub, contacts, presence        | P0       | 4-5 days    |
| 4     | 04_HOME_PAGE.md       | Command center home screen            | P0       | 3-4 days    |
| 5     | 05_ACTION_FLOWS.md    | Send, Receive, Scan, Create Wallet    | P0       | 5-6 days    |
| 6     | 06_SHARED_WALLETS.md  | Collaborative wallet experience       | P0       | 5-6 days    |
| 7     | 07_SETTINGS.md        | Comprehensive settings page           | P1       | 3-4 days    |
| 8     | 08_EXPLORER.md        | Blockchain explorer integration       | P1       | 3-4 days    |
| 9     | 09_POLISH.md          | Animations, accessibility, edge cases | P2       | 4-5 days    |
| 10    | 10_VERIFICATION.md    | Testing, performance, release         | P0       | 3-4 days    |

**Total Estimated Effort**: 40-60 days

---

## Success Criteria

### User Experience

- [ ] User can answer "What happened?" within 2 seconds of opening app
- [ ] User can find any contact within 3 taps
- [ ] User can complete a send transaction within 30 seconds
- [ ] User understands what actions are available at any screen
- [ ] User receives clear feedback for every action

### Technical

- [ ] All pages built from scratch (no legacy code)
- [ ] Unified activity store powers all activity displays
- [ ] People store integrates contacts, P2P, and MuSig2
- [ ] No orphaned composables or components
- [ ] TypeScript strict mode, no errors
- [ ] Lighthouse performance > 90

### Engagement

- [ ] Activity feed shows all relevant events
- [ ] Unread badges appear on navigation
- [ ] Push notifications work for key events
- [ ] Users have reason to return daily

---

## Files Structure

```
docs/plans/human-centric-ui-rewrite/
├── 00_OVERVIEW.md                 # This file
├── 01_FOUNDATION.md               # Core infrastructure
├── 02_ACTIVITY_SYSTEM.md          # Unified activity
├── 03_PEOPLE_SYSTEM.md            # People hub
├── 04_HOME_PAGE.md                # Command center
├── 05_ACTION_FLOWS.md             # Send, Receive, etc.
├── 06_SHARED_WALLETS.md           # Collaborative wallets
├── 07_SETTINGS.md                 # Comprehensive settings
├── 08_EXPLORER.md                 # Blockchain explorer
├── 09_POLISH.md                   # Final polish
├── 10_VERIFICATION.md             # Testing & release
└── STATUS.md                      # Progress tracking
```

---

## Design Philosophy References

This plan implements the principles from:

- [00_PHILOSOPHY.md](../../architecture/design/00_PHILOSOPHY.md) — Contact-centric design
- [07_HUMAN_CENTERED_UX.md](../../architecture/design/07_HUMAN_CENTERED_UX.md) — Human-centered UX
- [04_UI_PATTERNS.md](../../architecture/design/04_UI_PATTERNS.md) — UI patterns

---

## Key Decisions

### 1. Bottom Navigation with 5 Items

- **Home**: Balance + quick actions + preview
- **People**: Contacts + shared wallets + presence
- **Action (+)**: Quick action sheet (FAB-style)
- **Activity**: Unified feed with filters
- **Settings**: All configuration

### 2. Activity-First, Not Feature-First

Instead of "Transact > History", activity is a top-level concept. Users think in terms of "what happened", not "where is the history feature".

### 3. People Sorted by Recency

Contacts are sorted by last interaction, not alphabetically. This surfaces the people you actually interact with.

### 4. Inline Actions in Activity Feed

Users can act on activity items without navigating away. Approve a signing request, view a transaction, retry a failed action—all inline.

### 5. Settings as the Single Configuration Hub

No more scattered settings across P2P, Network, Notifications pages. One comprehensive Settings page with clear sections.

---

_This document establishes the vision for a complete UI/UX rewrite of the Lotus Web Wallet._
