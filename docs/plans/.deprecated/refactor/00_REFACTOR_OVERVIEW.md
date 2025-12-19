# Lotus Web Wallet Complete Refactor Plan

## Executive Summary

This document serves as the master index for the complete refactoring of the lotus-web-wallet. After extensive iteration and analysis, we've identified that the current implementation suffers from:

1. **Architectural spaghetti** - Features were added incrementally without a cohesive design
2. **Inconsistent UX patterns** - Different pages use different layouts, loading states, and navigation
3. **Incomplete features** - P2P, MuSig2, and Social features are partially implemented
4. **Poor separation of concerns** - Stores mix business logic, UI state, and SDK interactions
5. **Missing user mental models** - Users don't understand what features are for or how to use them

This refactor is a **fresh start** that applies all lessons learned from the analysis documents.

---

## Guiding Principles

### 1. User-First Design

Every feature must answer: "What can the user do here, and why would they want to?"

### 2. Consistent Patterns

One way to do things. Same loading states, same navigation, same card layouts everywhere.

### 3. Progressive Disclosure

Simple by default, advanced when needed. Don't overwhelm new users.

### 4. Mobile-First

Design for mobile, enhance for desktop. No horizontal scrolling tables.

### 5. Offline-Resilient

Cache what we can, queue what we can't, always show something useful.

### 6. Testable Architecture

Clear separation between UI, state, and SDK interactions.

---

## Plan Documents

The refactor is split into the following documents:

| Document                                                   | Focus Area                                        | Priority |
| ---------------------------------------------------------- | ------------------------------------------------- | -------- |
| [01_ARCHITECTURE.md](./01_ARCHITECTURE.md)                 | Overall architecture, folder structure, data flow | P0       |
| [02_DESIGN_SYSTEM.md](./02_DESIGN_SYSTEM.md)               | Component library, patterns, styling conventions  | P0       |
| [03_STORES_REFACTOR.md](./03_STORES_REFACTOR.md)           | Pinia stores redesign, state management           | P0       |
| [04_COMPOSABLES_REFACTOR.md](./04_COMPOSABLES_REFACTOR.md) | Composables cleanup, SDK integration              | P0       |
| [05_WALLET_CORE.md](./05_WALLET_CORE.md)                   | Home, Send, Receive, History pages                | P1       |
| [06_CONTACTS_SYSTEM.md](./06_CONTACTS_SYSTEM.md)           | Contacts page and integration                     | P1       |
| [07_EXPLORER_PAGES.md](./07_EXPLORER_PAGES.md)             | Explorer index, blocks, transactions, addresses   | P1       |
| [08_SOCIAL_PAGES.md](./08_SOCIAL_PAGES.md)                 | Social/RANK pages and voting                      | P2       |
| [09_P2P_SYSTEM.md](./09_P2P_SYSTEM.md)                     | P2P hub, discovery, presence                      | P2       |
| [10_MUSIG2_SYSTEM.md](./10_MUSIG2_SYSTEM.md)               | MuSig2 signing, shared wallets                    | P2       |
| [11_SETTINGS_PAGES.md](./11_SETTINGS_PAGES.md)             | Settings organization and pages                   | P2       |
| [12_ONBOARDING_FLOW.md](./12_ONBOARDING_FLOW.md)           | First-time user experience                        | P3       |

---

## Current State Summary

### Files to Refactor

#### Pages (10 files + subpages)

- `pages/index.vue` - Wallet home
- `pages/send.vue` - Send transactions (32KB - needs splitting)
- `pages/receive.vue` - Receive address
- `pages/history.vue` - Transaction history
- `pages/contacts.vue` - Contact management
- `pages/p2p.vue` - P2P hub (27KB - needs splitting)
- `pages/discover.vue` - Redirect to P2P
- `pages/explorer/*` - Explorer pages (5 files)
- `pages/social/*` - Social pages (2 files)
- `pages/settings/*` - Settings pages (6 files)

#### Components (25+ files)

- Core: `ActivityItem`, `BalanceDisplay`, `ContactAvatar`, etc.
- Explorer: `ExplorerAddressDisplay`, `ExplorerTxItem`, etc.
- P2P: `SignerCard`, `SigningRequestModal`, etc.
- Social: `SocialActivityItem`, `SocialProfileCard`, etc.
- Contacts: `ContactCard`, `ContactForm`, etc.

#### Stores (4 files)

- `stores/wallet.ts` - 53KB, needs splitting
- `stores/p2p.ts` - 21KB, needs cleanup
- `stores/contacts.ts` - 10KB, minor updates
- `stores/network.ts` - 7KB, minor updates

#### Composables (6 files)

- `composables/useBitcore.ts` - SDK access
- `composables/useMuSig2.ts` - 28KB, needs cleanup
- `composables/useUtils.ts` - 18KB, needs splitting
- `composables/useExplorerApi.ts` - 15KB, minor updates
- `composables/useRankApi.ts` - 13KB, minor updates
- `composables/useAvatars.ts` - 4KB, keep as-is

---

## Key Lessons Learned

### From COMPLETE_UX_GAP_ANALYSIS.md

- No onboarding flow - users are dropped in with no guidance
- No global search - can't find transactions, contacts, or profiles
- Inconsistent loading states across pages
- No notification system beyond toasts
- Navigation has too many top-level items

### From MUSIG2_UI_GAP_ANALYSIS.md

- Phase 1 (Key Aggregation) UI is completely missing
- Phase 2 (Address Funding) UI is completely missing
- Phase 3 (Signing) is partial - incoming requests never shown
- No shared wallet concept in UI
- Users sign blind without transaction preview

### From P2P_UX_COMPREHENSIVE_ANALYSIS.md

- No mental model for what P2P is for
- Signers shown without context
- No communication channel between peers
- Activity feed shows technical events, not meaningful activity
- Signing request flow is incomplete (just logs to console)

### From SETTINGS_UX_ANALYSIS.md

- Settings are scattered across multiple pages
- Back navigation was inconsistent (now fixed)
- P2P settings split between 3 pages

### From WALLET_STORE_OVERHAUL.md

- Race conditions between SDK loading and UI rendering
- UTXO state not properly synced with draft transactions
- Missing network validation in transaction building

---

## Implementation Approach

### Phase 1: Foundation (Week 1)

1. Establish new architecture and folder structure
2. Create design system components
3. Refactor stores with clean interfaces
4. Refactor composables with clear responsibilities

### Phase 2: Core Wallet (Week 2)

1. Rebuild Home page with proper balance display
2. Rebuild Send page with confirmation flow
3. Rebuild Receive page with payment requests
4. Rebuild History page with filtering

### Phase 3: Supporting Features (Week 3)

1. Rebuild Contacts with groups and activity
2. Rebuild Explorer with consistent patterns
3. Rebuild Settings with logical organization

### Phase 4: Advanced Features (Week 4)

1. Rebuild P2P hub with proper onboarding
2. Implement MuSig2 complete flow
3. Rebuild Social with voting actions

### Phase 5: Polish (Week 5)

1. Add onboarding flow
2. Add global search
3. Add notification center
4. Mobile optimization pass

---

## Success Criteria

1. **Consistency**: Every page uses the same patterns
2. **Completeness**: All features work end-to-end
3. **Clarity**: Users understand what each feature does
4. **Performance**: No jank, proper loading states
5. **Maintainability**: Clear code organization, easy to extend

---

## Next Steps

1. Review and approve this overview
2. Start with [01_ARCHITECTURE.md](./01_ARCHITECTURE.md)
3. Proceed through documents in order
4. Each document contains specific file changes and code examples

---

_Created: December 2024_
_Status: Planning_
