# Human-Centric UI/UX Rewrite - Status Tracker

> Central tracking document for the human-centric UI/UX complete rewrite.
> Last Updated: December 2024

---

## Overview

This document tracks the progress of the human-centric UI/UX rewrite, which completely rebuilds the lotus-web-wallet UI around two core concepts:

1. **People** — The humans you interact with
2. **Activity** — Everything that happens on the network

---

## Phase Status Summary

| Phase | Document              | Focus Area                            | Priority | Status         | Progress |
| ----- | --------------------- | ------------------------------------- | -------- | -------------- | -------- |
| 1     | 01_FOUNDATION.md      | Core infrastructure, stores, types    | P0       | ✅ Complete    | 100%     |
| 2     | 02_ACTIVITY_SYSTEM.md | Unified activity store and feed       | P0       | ✅ Complete    | 100%     |
| 3     | 03_PEOPLE_SYSTEM.md   | People hub, contacts, presence        | P0       | ✅ Complete    | 100%     |
| 4     | 04_HOME_PAGE.md       | Command center home screen            | P0       | ✅ Complete    | 100%     |
| 5     | 05_ACTION_FLOWS.md    | Send, Receive, Scan, Create Wallet    | P0       | ✅ Complete    | 100%     |
| 6     | 06_SHARED_WALLETS.md  | Collaborative wallet experience       | P0       | ✅ Complete    | 100%     |
| 7     | 07_SETTINGS.md        | Comprehensive settings page           | P1       | ✅ Complete    | 100%     |
| 8     | 08_EXPLORER.md        | Blockchain explorer integration       | P1       | ✅ Complete    | 100%     |
| 9     | 09_POLISH.md          | Animations, accessibility, edge cases | P2       | ✅ Complete    | 100%     |
| 10    | 10_VERIFICATION.md    | Testing, performance, release         | P0       | 🟡 In Progress | 60%      |
| 11    | 11_BUGFIXES.md        | Bugfixes & improvements from testing  | P0       | 🟡 In Progress | 33%      |
| 11.1  | -                     | BIP44 multi-wallet & address mgmt     | P0       | 🔲 Not Started | 0%       |
| 11.2  | -                     | URL params & cross-component comms    | P0       | 🔲 Not Started | 0%       |
| 11.3  | -                     | Send flow revamp                      | P1       | ✅ Complete    | 100%     |
| 11.4  | -                     | Wallet export/restore improvements    | P1       | 🔲 Not Started | 0%       |
| 11.5  | -                     | People discovery & P2P UI             | P1       | 🔲 Not Started | 0%       |
| 11.6  | -                     | UI polish & terminology               | P2       | ✅ Complete    | 100%     |

**Legend**: 🔲 Not Started | 🟡 In Progress | ✅ Complete | ⏸️ Blocked

---

## Estimated Timeline

| Phase    | Effort   | Cumulative |
| -------- | -------- | ---------- |
| Phase 1  | 3-4 days | 3-4 days   |
| Phase 2  | 4-5 days | 7-9 days   |
| Phase 3  | 4-5 days | 11-14 days |
| Phase 4  | 3-4 days | 14-18 days |
| Phase 5  | 5-6 days | 19-24 days |
| Phase 6  | 5-6 days | 24-30 days |
| Phase 7  | 3-4 days | 27-34 days |
| Phase 8  | 3-4 days | 30-38 days |
| Phase 9  | 4-5 days | 34-43 days |
| Phase 10 | 3-4 days | 37-47 days |

**Total Estimated Effort**: 40-60 days

---

## Key Decisions

### Navigation Model

- **5-item bottom navigation**: Home, People, Action (+), Activity, Settings
- **Action button** opens quick action sheet (Send, Receive, Scan, New Wallet)
- **Activity as top-level** — not buried under Transact

### Sorting Philosophy

- **People sorted by recency** — not alphabetically
- **Activity sorted by timestamp** — newest first
- **Favorites pinned** — but still sorted by recency within

### Modal-Based Actions

- **Send, Receive, Scan are modals** — not pages
- **Can be triggered from anywhere** — maintains context
- **Wizard-style flows** — step by step with clear progress

### Unified Stores

- **Activity store** — aggregates all event types
- **People store** — unifies contacts, P2P, shared wallets
- **Settings store** — single source for all configuration

---

## Architecture Changes

### New Page Structure

```
pages/
├── index.vue                    # Home (command center)
├── people/
│   ├── index.vue               # People hub
│   ├── [id].vue                # Person detail
│   └── wallets/
│       ├── index.vue           # Shared wallets list
│       └── [id].vue            # Shared wallet detail
├── activity/
│   └── index.vue               # Unified activity feed
├── settings/
│   └── index.vue               # Comprehensive settings
└── explore/
    └── [...slug].vue           # Explorer (catch-all)
```

### Deleted Pages

The following pages from the current implementation will be deleted:

- `/transact/*` — Actions become modals
- `/people/contacts.vue` — Merged into People hub
- `/people/p2p.vue` — Integrated into People
- `/settings/network.vue` — Merged into Settings
- `/settings/notifications.vue` — Merged into Settings
- `/settings/p2p.vue` — Merged into Settings
- `/settings/backup.vue` — Becomes modal in Settings
- `/settings/restore.vue` — Becomes modal in Settings
- `/settings/security.vue` — Merged into Settings
- `/settings/about.vue` — Merged into Settings
- `/settings/advertise.vue` — Merged into Settings
- `/explore/index.vue` — Replaced by catch-all
- `/explore/explorer/*` — Replaced by catch-all
- `/explore/social/*` — Deferred (not in initial scope)

---

## Dependencies

### Phase Dependencies

```
Phase 1 (Foundation)
    │
    ├──► Phase 2 (Activity System)
    │        │
    │        └──► Phase 4 (Home Page) ──► Phase 9 (Polish)
    │
    ├──► Phase 3 (People System)
    │        │
    │        ├──► Phase 4 (Home Page)
    │        │
    │        └──► Phase 6 (Shared Wallets)
    │
    └──► Phase 5 (Action Flows)
             │
             └──► Phase 6 (Shared Wallets)

Phase 7 (Settings) — Can run parallel after Phase 1
Phase 8 (Explorer) — Can run parallel after Phase 1

All Phases ──► Phase 10 (Verification)
```

### Parallel Work Opportunities

- **Phase 7 (Settings)** can start after Phase 1
- **Phase 8 (Explorer)** can start after Phase 1
- **Phase 9 (Polish)** can start after Phase 4

---

## Blockers

None currently identified.

---

## Risks

| Risk                       | Likelihood | Impact | Mitigation               |
| -------------------------- | ---------- | ------ | ------------------------ |
| Scope creep                | Medium     | High   | Strict adherence to plan |
| Store migration complexity | Medium     | Medium | Incremental migration    |
| P2P integration issues     | Low        | Medium | Fallback to offline mode |
| Performance regression     | Low        | High   | Continuous benchmarking  |

---

## Success Criteria

### User Experience

- [ ] User can answer "What happened?" within 2 seconds
- [ ] User can find any contact within 3 taps
- [ ] User can complete send within 30 seconds
- [ ] User understands available actions at any screen
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

## Change Log

| Date     | Phase  | Change                                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| Dec 2024 | -      | Created human-centric UI rewrite plan                                                                                                                                                                                                                                                                                                                                                         |
| Dec 2024 | -      | Created 00_OVERVIEW.md                                                                                                                                                                                                                                                                                                                                                                        |
| Dec 2024 | -      | Created all 10 phase documents                                                                                                                                                                                                                                                                                                                                                                |
| Dec 2024 | -      | Created STATUS.md                                                                                                                                                                                                                                                                                                                                                                             |
| Dec 2024 | 1      | **Phase 1 Complete**: Created new page structure, types, navigation components, updated layout                                                                                                                                                                                                                                                                                                |
| Dec 2024 | 2      | **Phase 2 Complete**: Rewrote activity store with composition API, persistence, read/unread tracking, ActivityItem component, date grouping                                                                                                                                                                                                                                                   |
| Dec 2024 | 3      | **Phase 3 Complete**: Created People store with persistence, PersonAvatar/PersonCard/PersonChip/SharedWalletCard/AddContactModal components, updated People hub and detail pages                                                                                                                                                                                                              |
| Dec 2024 | -      | **Form Components**: Created centralized form components (FormField, FormInput, FormTextarea, FormCheckbox, FormSection) for consistent form styling                                                                                                                                                                                                                                          |
| Dec 2024 | 4      | **Phase 4 Complete**: Created BalanceCard, NeedsAttentionCard, OnlineNowCard, SharedWalletsPreview, RecentActivityCard, GettingStartedCard, ActivityItemCompact components; rewrote Home page                                                                                                                                                                                                 |
| Dec 2024 | 5      | **Phase 5 Complete**: Created SendModal (multi-step wizard), ReceiveModal (QR + copy/share), ScanModal (camera QR scanner); wired to BalanceCard quick actions                                                                                                                                                                                                                                |
| Dec 2024 | 5      | **Phase 5 Fix**: Changed modals from UModal to USlideover with #content slot; wired mobile ActionSheet quick actions to modals in layout                                                                                                                                                                                                                                                      |
| Dec 2024 | 6      | **Phase 6 Complete**: Created CreateWalletModal (multi-step wizard), SigningRequestCard, SpendModal; updated shared wallets list and detail pages                                                                                                                                                                                                                                             |     |
| Dec 2024 | 7      | **Phase 7 Complete**: Created SettingsSection, SettingsItem, BackupModal, ViewPhraseModal components; rewrote Settings page with all sections (Wallet, Network, P2P, Security, Appearance, About, Danger Zone)                                                                                                                                                                                |
| Dec 2024 | 7.1    | **Phase 7.1 Complete**: Created RestoreWalletModal, stores/settings.ts; fixed settings toggle persistence with computed getter/setter pattern; fixed app initialization to load P2P settings and auto-connect; fixed MuSig2 initialization flow for signer toggle; added tooltip and click handler to navbar connection indicator                                                             |
| Dec 2024 | 8      | **Phase 8 Complete**: Created ExplorerHome, TransactionDetail, AddressDetail, BlockDetail, AddressDisplay components; updated explorer page with search functionality, contact resolution, and full blockchain data display using useExplorerApi                                                                                                                                              |
| Dec 2024 | 9      | **Phase 9 Complete**: Created PersonCardSkeleton, ActivityItemSkeleton, SharedWalletCardSkeleton, ErrorState, NetworkErrorBanner, SuccessAnimation, OfflineIndicator, SkipLinks, KeyboardShortcutsModal components; created useAnnounce composable and shortcuts.client.ts plugin; integrated accessibility components into layout                                                            |
| Dec 2024 | 10     | **Phase 10 Testing**: Updated verification checklist with test results; identified 15+ issues across navigation, activity, send flow, people, explorer, and settings                                                                                                                                                                                                                          |
| Dec 2024 | 11     | **Phase 11 Created**: Created 11_BUGFIXES.md with 6 sub-phases organized by context scope: 11.1 BIP44 (high), 11.2 URL params (medium), 11.3 Send flow (medium), 11.4 Export/Restore (medium), 11.5 People Discovery (high), 11.6 UI Polish (low)                                                                                                                                             |
| Dec 2024 | 11.6   | **Phase 11.6 Complete**: Fixed QR code rendering in ReceiveModal using qrcode-vue3; replaced "Coinbase" with "Block Reward" terminology; redesigned mobile navbar with balance/network/search; added close button to ActionSheet; added Opt+Shift+A shortcut; added Taproot/Legacy indicator with tooltip                                                                                     |
| Dec 2024 | 11.3   | **Phase 11.3 Complete**: Revamped SendModal with full-width inputs, percentage-based quick buttons, network-aware address validation, network mismatch warning, improved confirmation screen; **rewrote draft store** with simplified API (direct setAddress/setAmount/setSendMax instead of ID-based recipients); updated SendModal and useWallet composable for new API                     |
| Dec 2024 | 11.4   | **Phase 11.4 Complete**: Removed redundant wallet export (history is on blockchain); **rewrote RestoreWalletModal** with 12 individual word fields, visual validation feedback, auto-advance on space/tab, paste detection to split phrase, keyboard navigation (arrows/backspace), clear all button                                                                                          |
| Dec 2024 | 11.2   | **Phase 11.2 Complete**: Wired query params to modals (`?add=true&address=`, `?send=`, `?create=true`, `?backup=true`); added `initialAddress` prop to AddContactModal; **all modals now clear query params on close** to prevent re-opening on refresh; **fixed `markAllAsRead`** - legacy items from wallet/P2P/MuSig2 stores now use `lastReadTimestamp` for read state                    |     |
| Dec 2024 | 11.7   | **Phase 11.7 Complete**: Documented query parameter consistency pattern; audited all existing query param → modal mappings; established pattern for future implementations                                                                                                                                                                                                                    |
| Dec 2024 | 11.5   | **Phase 11.5 Restructured**: Renamed from "People Discovery & P2P UI" to "Contact Identity & Sharing"; focuses on establishing PRIMARY BIP44 address as human identity; defines Contact URI spec (`lotus-contact://`); P2P discovery moved to new Phase 11.8                                                                                                                                  |
| Dec 2024 | 11.8   | **Phase 11.8 Created**: New comprehensive phase for P2P Discovery & Presence System; spans lotus-web-wallet, lotus-sdk, and lotus-dht-server; documents architectural constraints (DHT key/value only, GossipSub for discovery, "last seen" semantics); defines bootstrap node API requirements (`/presence` endpoints)                                                                       |
| Dec 2024 | 11.5   | **Phase 11.5 Complete**: Established PRIMARY BIP44 address as human identity; created Contact URI spec (`lotus-contact://`); implemented `useContactUri` composable; created ShareMyContactModal and ShareContactModal with distinct purple QR styling; updated ScanModal to recognize contact URIs; **wired scanned contacts to AddContactModal** via query params with name/pubkey pre-fill |
| Dec 2024 | 11.5.1 | **Phase 11.5.1 Complete**: Consolidated shared wallet storage architecture - `peopleStore` is now single source of truth; extended `types/people.ts` SharedWallet with MuSig2 fields; `musig2Store.createSharedWallet()` delegates to `peopleStore.addSharedWallet()`; removed duplicate storage from musig2Store; updated all composables and UI components to use canonical types           |
| Dec 2024 | 11.5.2 | **Phase 11.5.2 Complete**: Implemented QR code scanning - installed `vue-qrcode-reader` library; rewrote ScanModal to use `QrcodeStream` component for real-time QR detection; wired scan results to appropriate actions (Contact URI → AddContactModal, Payment URI/Address → SendModal); added manual entry handler                                                                         |

---

## Notes

- This is a **complete rewrite**, not a refactor
- All existing pages are considered deleted
- Focus on People and Activity as core concepts
- Settings consolidated into single comprehensive page
- Actions are modals, not pages

---

_This document should be updated as each phase progresses._
