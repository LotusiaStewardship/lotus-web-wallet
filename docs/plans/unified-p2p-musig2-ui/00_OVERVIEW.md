# Unified P2P & MuSig2 UI Integration Plan

## Executive Summary

This document serves as the master plan for integrating P2P networking and MuSig2 multi-signature functionality into a cohesive user experience. These two systems are deeply interrelated—P2P provides the communication layer while MuSig2 provides the cryptographic signing protocol—and must be integrated together for a seamless user experience.

**Goal**: Enable users to discover peers, create shared wallets, and collaboratively sign transactions through an intuitive, unified interface.

---

## Why Unify These Plans?

The original separate plans (`musig2-ui-integration` and `p2p-ui-integration`) had significant overlap:

| Overlapping Area          | MuSig2 Plan                  | P2P Plan                     |
| ------------------------- | ---------------------------- | ---------------------------- |
| **Signing Requests**      | 07_SIGNING_REQUESTS.md       | 02_SIGNING_REQUEST_FLOW.md   |
| **Session Management**    | 08_SESSION_MANAGEMENT.md     | 03_SESSION_MANAGEMENT.md     |
| **Contact Integration**   | 09_CONTACT_INTEGRATION.md    | 04_CONTACT_INTEGRATION.md    |
| **Navigation/Page Setup** | 01_NAVIGATION_ENTRY_POINTS   | 01_PAGE_STRUCTURE.md         |
| **Transaction Preview**   | TransactionPreview component | TransactionPreview component |

By unifying these plans, we:

1. **Eliminate duplicate work** - Single implementation for shared components
2. **Ensure consistency** - One UX pattern for signing flows
3. **Reduce complexity** - Clearer dependencies and implementation order
4. **Improve maintainability** - Single source of truth for collaborative features

---

## Current State Assessment

### Completed Foundation (from Refactor STATUS.md)

| Phase                                 | Status      | Relevance                      |
| ------------------------------------- | ----------- | ------------------------------ |
| Phase 9: P2P System                   | ✅ Complete | 14 P2P components scaffolded   |
| Phase 10: MuSig2 System               | ✅ Complete | 8 MuSig2 components scaffolded |
| Phase 19: Integration P2P & MuSig2    | ✅ Complete | Basic integration done         |
| Phase 32: MuSig2 Services Integration | ✅ Complete | Service uses correct SDK APIs  |
| Phase 33: P2P Services Integration    | ✅ Complete | Service uses correct SDK APIs  |

### Existing Components

**P2P Components (`components/p2p/`)**:

- `HeroCard.vue` - Connection status display
- `OnboardingCard.vue` - First-time user guidance
- `QuickActions.vue` - Action buttons
- `PeerGrid.vue` - Connected peers display
- `ActivityFeed.vue` - P2P events
- `SignerList.vue` - Available signers
- `SignerCard.vue` - Individual signer
- `SessionList.vue` - Active sessions
- `IncomingRequests.vue` - Signing requests
- `RequestList.vue` - Request management
- `SettingsPanel.vue` - P2P settings
- `SigningRequestModal.vue` - Request creation
- `SigningSessionProgress.vue` - Session progress

**MuSig2 Components (`components/musig2/`)**:

- `SharedWalletCard.vue` - Wallet summary card
- `SharedWalletList.vue` - List of shared wallets
- `SharedWalletDetail.vue` - Detailed wallet view
- `CreateSharedWalletModal.vue` - Create new shared wallet
- `FundWalletModal.vue` - Fund shared wallet
- `ProposeSpendModal.vue` - Propose spend transaction
- `SigningProgress.vue` - Signing session progress
- `TransactionPreview.vue` - Transaction preview

### Critical Gaps

1. **No unified navigation** - P2P and MuSig2 features scattered
2. **Components not integrated** - Scaffolded but not wired up
3. **Signing flow incomplete** - Request submission logs to console
4. **No shared wallet pages** - Missing `/people/shared-wallets/` routes
5. **Contact integration broken** - "Save as Contact" shows placeholder
6. **No transaction preview** - Users sign blind
7. **No session tracking UI** - Can't monitor signing progress

---

## Unified Architecture

### Component Hierarchy

```
pages/
├── people/
│   ├── index.vue              # People hub (contacts, shared wallets, P2P stats)
│   ├── contacts.vue           # Contact management
│   ├── p2p.vue                # P2P network hub with tabs
│   └── shared-wallets/
│       ├── index.vue          # Shared wallets list
│       └── [id].vue           # Wallet detail (dynamic route)

components/
├── p2p/                       # P2P-specific components
│   ├── HeroCard.vue
│   ├── SignerList.vue
│   ├── SignerCard.vue
│   ├── SignerDetailModal.vue  # NEW
│   ├── SessionList.vue
│   ├── SessionDetailModal.vue # NEW
│   ├── RequestList.vue
│   ├── RequestDetailModal.vue # NEW
│   ├── PresenceToggle.vue     # NEW
│   └── ...
├── musig2/                    # MuSig2-specific components
│   ├── SharedWalletCard.vue
│   ├── SharedWalletList.vue
│   ├── SharedWalletDetail.vue
│   ├── CreateSharedWalletModal.vue
│   ├── IncomingRequestCard.vue # NEW
│   ├── ParticipantSelector.vue # NEW
│   └── ...
└── shared/                    # Shared between P2P and MuSig2
    ├── TransactionPreview.vue # Unified TX preview
    ├── SigningProgress.vue    # Unified progress indicator
    └── ContactPicker.vue      # Contact selection for both
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UI LAYER                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ P2P Page    │  │ Shared      │  │ Contact     │  │ Home Page   │        │
│  │             │  │ Wallets     │  │ Detail      │  │             │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            STORE LAYER                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ P2P Store   │◄─┤ MuSig2      │◄─┤ Contact     │  │ Wallet      │        │
│  │             │  │ Store       │  │ Store       │  │ Store       │        │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘  └─────────────┘        │
└─────────┼────────────────┼──────────────────────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVICE LAYER                                       │
│  ┌─────────────┐  ┌─────────────┐                                           │
│  │ P2P Service │  │ MuSig2      │                                           │
│  │             │  │ Service     │                                           │
│  └──────┬──────┘  └──────┬──────┘                                           │
└─────────┼────────────────┼──────────────────────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            lotus-sdk                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐                           │
│  │   P2PCoordinator    │  │ MuSig2P2PCoordinator│                           │
│  └─────────────────────┘  └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation & Shared Infrastructure

**Priority**: P0 | **Effort**: 2-3 days

- Unified navigation structure (People hub redesign)
- Shared component consolidation (TransactionPreview, SigningProgress)
- Contact model extension (publicKey, signerCapabilities)
- Route setup for shared wallets

### Phase 2: P2P Core Integration

**Priority**: P0 | **Effort**: 2-3 days

- P2P page tab structure
- Signer discovery and display
- Presence toggle and status
- Activity feed enhancement

### Phase 3: MuSig2 Core Integration

**Priority**: P0 | **Effort**: 3-4 days

- Shared wallets page and list
- Wallet creation flow
- Wallet detail view
- Funding flow

### Phase 4: Unified Signing Flow

**Priority**: P0 | **Effort**: 3-4 days

- Signing request initiation (from P2P and shared wallets)
- Incoming request handling
- Session management and progress
- Transaction preview and approval

### Phase 5: Contact & Social Integration

**Priority**: P1 | **Effort**: 2 days

- Save signer as contact
- Contact P2P status display
- Request signature from contact
- Shared wallets with contact

### Phase 6: Polish & Accessibility

**Priority**: P2 | **Effort**: 2 days

- Loading states and skeletons
- Empty states with guidance
- Error handling and recovery
- Notifications and badges
- Keyboard navigation

---

## Document Index

| Phase | Document                                                 | Focus Area                            | Priority |
| ----- | -------------------------------------------------------- | ------------------------------------- | -------- |
| 1     | [01_FOUNDATION.md](./01_FOUNDATION.md)                   | Navigation, shared components, routes | P0       |
| 2     | [02_P2P_CORE.md](./02_P2P_CORE.md)                       | P2P page structure, signers, presence | P0       |
| 3     | [03_MUSIG2_CORE.md](./03_MUSIG2_CORE.md)                 | Shared wallets, creation, funding     | P0       |
| 4     | [04_SIGNING_FLOW.md](./04_SIGNING_FLOW.md)               | Unified signing requests and sessions | P0       |
| 5     | [05_CONTACT_INTEGRATION.md](./05_CONTACT_INTEGRATION.md) | P2P + contacts bridge                 | P1       |
| 6     | [06_POLISH.md](./06_POLISH.md)                           | Loading states, errors, accessibility | P2       |

---

## Success Criteria

### Functional Requirements

- [ ] User can connect to P2P network and see connection status
- [ ] User can discover signers and view their capabilities
- [ ] User can save signers as contacts with public keys
- [ ] User can create shared wallets with contacts
- [ ] User can fund shared wallets
- [ ] User can propose spending from shared wallets
- [ ] User can receive and respond to signing requests
- [ ] User can track signing session progress
- [ ] User can see shared wallet balances on home page

### UX Requirements

- [ ] Clear mental model for P2P vs MuSig2 features
- [ ] Consistent signing flow regardless of entry point
- [ ] Appropriate loading states for all async operations
- [ ] Meaningful empty states with actionable guidance
- [ ] Error messages with recovery options
- [ ] Navigation badges for pending actions

---

## Risk Assessment

| Risk                               | Impact | Mitigation                                           |
| ---------------------------------- | ------ | ---------------------------------------------------- |
| P2P connectivity issues            | High   | Clear status indicators, retry logic, offline mode   |
| Participant offline during signing | High   | Timeout handling, session persistence, notifications |
| Key aggregation failures           | Medium | Validation before creation, clear error messages     |
| Balance sync delays                | Low    | "Last updated" timestamp, manual refresh             |
| Complex UX for non-technical users | Medium | Onboarding tooltips, progressive disclosure          |

---

## Dependencies

### Required Before Starting

- ✅ Phase 32: MuSig2 Services Integration (complete)
- ✅ Phase 33: P2P Services Integration (complete)
- ✅ P2P store refactored to use service
- ✅ MuSig2 store refactored to use service

### External Dependencies

- `lotus-sdk` P2PCoordinator API
- `lotus-sdk` MuSig2P2PCoordinator API
- Nuxt UI components
- Pinia stores

---

## Related Documents

- [MuSig2 UI Integration Plan](../musig2-ui-integration/00_OVERVIEW.md) (superseded)
- [P2P UI Integration Plan](../p2p-ui-integration/00_OVERVIEW.md) (superseded)
- [Refactor STATUS.md](../refactor/STATUS.md)
- [P2P_UX_COMPREHENSIVE_ANALYSIS.md](../../analysis/P2P_UX_COMPREHENSIVE_ANALYSIS.md)
- [MUSIG2_UI_GAP_ANALYSIS.md](../../analysis/MUSIG2_UI_GAP_ANALYSIS.md)

---

_Created: December 11, 2024_
_Status: Planning_
_Supersedes: musig2-ui-integration, p2p-ui-integration_
