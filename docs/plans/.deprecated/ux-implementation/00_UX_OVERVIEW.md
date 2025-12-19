# Lotus Web Wallet UX Implementation Plan

## Executive Summary

This document outlines the comprehensive plan for implementing a brand new UX for the lotus-web-wallet. The refactored architecture (stores, composables, services, types, and components) is complete. The old `pages/` folder has been deleted. We now need to build a completely new set of pages and layouts that leverage the new architecture while addressing all gaps identified in `COMPLETE_UX_GAP_ANALYSIS.md`.

**Goal**: Transform the wallet from a technical demo into a polished, user-friendly application that serves as the gateway to the Lotus ecosystem.

---

## Current State

### What We Have (Completed in Refactor)

- **Types** (`types/`): Comprehensive type definitions for wallet, transaction, contact, network, p2p, musig2, and UI
- **Services** (`services/`): Stateless wrappers for chronik, storage, p2p, and musig2
- **Utils** (`utils/`): Pure utility functions for constants, formatting, validation, and helpers
- **Stores** (`stores/`): Refactored Pinia stores with clean interfaces
- **Composables** (`composables/`): Refactored composables with clear responsibilities
- **Components** (`components/`):
  - `ui/` - Design system components (AppCard, AppHeroCard, AppEmptyState, etc.)
  - `common/` - Shared utility components (AddressFingerprint, AmountDisplay, etc.)
  - `wallet/` - Wallet-specific components
  - `send/` - Send flow components
  - `receive/` - Receive flow components
  - `history/` - Transaction history components
  - `contacts/` - Contact management components
  - `explorer/` - Explorer components
  - `social/` - Social/RANK components
  - `p2p/` - P2P network components
  - `musig2/` - MuSig2 signing components
  - `settings/` - Settings components
  - `onboarding/` - Onboarding flow components
- **Layout** (`layouts/default.vue`): Dashboard layout with sidebar navigation

### What We Need to Build

- **Pages** (`pages/`): All pages deleted, need complete rebuild
- **New Layout Patterns**: Mobile-first, bottom navigation, command palette
- **New User Flows**: Onboarding, payment requests, voting, signing requests

---

## Design Principles

### 1. Mobile-First Responsive Design

- Bottom navigation on mobile
- Sidebar on desktop
- Touch-friendly targets (min 44px)
- No horizontal scrolling

### 2. Progressive Disclosure

- Simple by default
- Advanced features behind toggles
- Contextual help and tooltips

### 3. Consistent Patterns

- Same loading states everywhere
- Same error handling everywhere
- Same card layouts everywhere
- Same navigation patterns everywhere

### 4. User-Centric Language

- No technical jargon (UTXOs → Coins)
- Action-oriented labels
- Clear feedback messages

### 5. Accessibility

- WCAG AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast verification

---

## Phase Overview

| Phase | Document                                                   | Focus                                                 | Priority | Estimated Effort | Status     |
| ----- | ---------------------------------------------------------- | ----------------------------------------------------- | -------- | ---------------- | ---------- |
| 1     | [01_LAYOUT_NAVIGATION.md](./01_LAYOUT_NAVIGATION.md)       | New layout system, mobile navigation, command palette | P0       | 2-3 days         | 🔲 Pending |
| 2     | [02_ONBOARDING_FLOW.md](./02_ONBOARDING_FLOW.md)           | Welcome screen, wallet setup, getting started         | P0       | 2-3 days         | 🔲 Pending |
| 3     | [03_WALLET_HOME.md](./03_WALLET_HOME.md)                   | Home page with balance, quick actions, activity       | P0       | 2-3 days         | 🔲 Pending |
| 4     | [04_SEND_RECEIVE.md](./04_SEND_RECEIVE.md)                 | Send with confirmation, receive with payment requests | P0       | 3-4 days         | 🔲 Pending |
| 5     | [05_TRANSACTION_HISTORY.md](./05_TRANSACTION_HISTORY.md)   | History with search, filter, export                   | P1       | 2-3 days         | 🔲 Pending |
| 6     | [06_CONTACTS_SYSTEM.md](./06_CONTACTS_SYSTEM.md)           | Contacts with groups, activity, verification          | P1       | 2-3 days         | 🔲 Pending |
| 7     | [07_EXPLORER_PAGES.md](./07_EXPLORER_PAGES.md)             | Explorer with search, mempool, raw data               | P1       | 2-3 days         | 🔲 Pending |
| 8     | [08_SOCIAL_VOTING.md](./08_SOCIAL_VOTING.md)               | Social with inline voting, profile search             | P2       | 2-3 days         | 🔲 Pending |
| 9     | [09_P2P_NETWORK.md](./09_P2P_NETWORK.md)                   | P2P hub with onboarding, messaging, sessions          | P2       | 3-4 days         | 🔲 Pending |
| 10    | [10_SETTINGS_SECURITY.md](./10_SETTINGS_SECURITY.md)       | Settings with security, privacy, backup verification  | P2       | 2-3 days         | 🔲 Pending |
| 11    | [11_NOTIFICATIONS.md](./11_NOTIFICATIONS.md)               | Notification center, push notifications               | P3       | 2-3 days         | 🔲 Pending |
| 12    | [12_POLISH_ACCESSIBILITY.md](./12_POLISH_ACCESSIBILITY.md) | Keyboard shortcuts, accessibility audit, performance  | P3       | 2-3 days         | 🔲 Pending |

**Total Estimated Effort**: 4-6 weeks

### Priority Legend

- **P0 (Critical)**: Must be implemented first - core wallet functionality
- **P1 (High)**: Important features that complete the core experience
- **P2 (Medium)**: Advanced features that enhance the experience
- **P3 (Lower)**: Polish and optimization

---

## Navigation Structure (New)

### Desktop Sidebar (Simplified)

```
┌─────────────────┐
│ 🌸 Lotus Wallet │
├─────────────────┤
│ 🏠 Home         │  ← Balance, quick actions, recent activity
│ 💸 Transact     │  ← Send, Receive, History (grouped)
│ 👥 People       │  ← Contacts, P2P Network (grouped)
│ 🔍 Explore      │  ← Explorer, Social/RANK (grouped)
├─────────────────┤
│ ⚙️ Settings     │
└─────────────────┘
```

### Mobile Bottom Navigation

```
┌─────────────────────────────────────────┐
│  🏠      💸      👥      🔍      ⚙️     │
│ Home  Transact People  Explore Settings │
└─────────────────────────────────────────┘
```

### Command Palette (Cmd+K)

- Quick actions: Send, Receive, Scan QR
- Search: Contacts, Transactions, Addresses, Blocks
- Navigation: All pages
- Recent items

---

## Key UX Improvements by Area

### Global

- [ ] Onboarding flow for new users
- [ ] Command palette (Cmd+K)
- [ ] Notification center
- [ ] Keyboard shortcuts
- [ ] Offline support indicators
- [ ] Consistent loading states (skeletons)
- [ ] Actionable error states

### Wallet Core

- [ ] Balance with fiat conversion (optional)
- [ ] Balance change indicator
- [ ] Quick actions (Send, Receive, Scan, Request)
- [ ] Transaction confirmation modal
- [ ] Success animations
- [ ] QR code scanning

### Send/Receive

- [ ] QR code scanning for addresses
- [ ] Payment request generation (BIP21)
- [ ] Transaction preview before sending
- [ ] "Add to contacts" prompt for new recipients
- [ ] Estimated confirmation time

### History

- [ ] Search by address, amount, txid
- [ ] Filter by type, date, amount
- [ ] Sort options
- [ ] Export to CSV/JSON
- [ ] Transaction categories/tags
- [ ] Pagination/virtual scrolling

### Contacts

- [ ] Contact groups
- [ ] Per-contact transaction history
- [ ] Contact verification (QR)
- [ ] Import/export
- [ ] Quick stats

### Explorer

- [ ] Universal search bar
- [ ] Mempool view
- [ ] Raw transaction data
- [ ] Share buttons

### Social/RANK

- [ ] Inline voting on profile cards
- [ ] Profile search
- [ ] Vote modal with amount
- [ ] Profile claiming (future)

### P2P

- [ ] Incoming signing requests prominently displayed
- [ ] Complete signing flow
- [ ] P2P onboarding/explanation
- [ ] Session management
- [ ] Peer messaging (future)

### Settings

- [ ] Security settings (PIN, auto-lock)
- [ ] Privacy settings
- [ ] Backup verification quiz
- [ ] Backup reminder
- [ ] Notification preferences

---

## File Structure (Target)

```
pages/
├── index.vue                    # Home (balance, quick actions, activity)
├── onboarding.vue               # First-time user flow
├── transact/
│   ├── index.vue                # Transact hub (send/receive tabs)
│   ├── send.vue                 # Send page
│   ├── receive.vue              # Receive page
│   └── history.vue              # Transaction history
├── people/
│   ├── index.vue                # People hub
│   ├── contacts.vue             # Contacts list
│   └── p2p.vue                  # P2P network
├── explore/
│   ├── index.vue                # Explore hub
│   ├── explorer/
│   │   ├── index.vue            # Explorer home
│   │   ├── block/[hash].vue     # Block detail
│   │   ├── tx/[txid].vue        # Transaction detail
│   │   └── address/[addr].vue   # Address detail
│   └── social/
│       ├── index.vue            # Social home
│       └── [platform]/[id].vue  # Profile detail
├── settings/
│   ├── index.vue                # Settings hub
│   ├── security.vue             # Security settings
│   ├── privacy.vue              # Privacy settings
│   ├── backup.vue               # Backup & restore
│   ├── network.vue              # Network settings
│   ├── notifications.vue        # Notification preferences
│   └── about.vue                # About & help
└── [...slug].vue                # 404 catch-all
```

---

## Success Metrics

1. **Time to First Transaction**: < 2 minutes for new users
2. **Feature Discoverability**: 80% of users find key features without help
3. **Error Recovery**: 100% of errors have actionable recovery paths
4. **Mobile Usability**: Full functionality on mobile devices
5. **Accessibility**: WCAG AA compliance
6. **Performance**: < 3s initial load, < 100ms interactions

---

## Dependencies

- Nuxt UI v3 components
- Lucide icons
- vue-qrcode-reader (for QR scanning)
- @vueuse/core (for keyboard shortcuts, etc.)
- Existing refactored stores, composables, services

---

## Next Steps

1. Review and approve this overview
2. Start with [01_LAYOUT_NAVIGATION.md](./01_LAYOUT_NAVIGATION.md)
3. Proceed through phases in order
4. Each phase document contains specific implementation details

---

_Created: December 2024_
_Status: Planning_
_Related Documents:_

- `docs/analysis/COMPLETE_UX_GAP_ANALYSIS.md`
- `docs/plans/refactor/` (completed refactor plans)
