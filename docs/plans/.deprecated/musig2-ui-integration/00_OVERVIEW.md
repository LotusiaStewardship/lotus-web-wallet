# MuSig2 UI Integration Plan

## Executive Summary

This document serves as the master index for integrating the MuSig2 UI into the lotus-web-wallet. The integration builds upon:

1. **Phase 32 Service Refactor** - MuSig2 service now correctly uses the lotus-sdk `MuSig2P2PCoordinator` API
2. **Existing Components** - Scaffolded components in `components/musig2/` are ready for integration
3. **Gap Analysis** - `MUSIG2_UI_GAP_ANALYSIS.md` identifies all missing UI elements

**Goal**: Enable users to complete the full MuSig2 workflow from shared wallet creation to collaborative spending.

---

## Current State Assessment

### What Exists

| Layer                  | Status        | Notes                                      |
| ---------------------- | ------------- | ------------------------------------------ |
| **lotus-sdk**          | ✅ Complete   | Full MuSig2 cryptographic support          |
| **services/musig2.ts** | ✅ Refactored | Correctly wraps SDK APIs (Phase 32)        |
| **stores/musig2.ts**   | ✅ Refactored | Uses service layer, manages reactive state |
| **types/musig2.ts**    | ✅ Complete   | Type definitions for all MuSig2 entities   |
| **components/musig2/** | ⚠️ Scaffolded | 8 components exist but not integrated      |
| **pages/**             | ❌ Missing    | No dedicated MuSig2 pages                  |
| **Navigation**         | ❌ Missing    | No entry points to MuSig2 features         |

### Scaffolded Components

```
components/musig2/
├── CreateSharedWalletModal.vue   # Create new shared wallet
├── FundWalletModal.vue           # Fund shared wallet
├── ProposeSpendModal.vue         # Propose spending from shared wallet
├── SharedWalletCard.vue          # Display wallet in list
├── SharedWalletDetail.vue        # Full wallet detail view
├── SharedWalletList.vue          # List of all shared wallets
├── SigningProgress.vue           # Signing session progress indicator
└── TransactionPreview.vue        # Preview transaction before signing
```

### Critical Gaps (from MUSIG2_UI_GAP_ANALYSIS.md)

1. **Phase 1 Missing** - No UI to create aggregated keys/shared addresses
2. **Phase 2 Missing** - No UI to fund or view shared wallet balances
3. **Phase 3 Partial** - Signing works but incoming requests not shown
4. **No shared wallet concept** - Users can't manage multi-sig wallets
5. **No transaction preview** - Users sign blind

---

## MuSig2 Complete User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MuSig2 COMPLETE USER JOURNEY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: SETUP (Create Shared Wallet)                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. User navigates to Shared Wallets section                                │
│  2. Clicks "Create Shared Wallet"                                           │
│  3. Selects participants from contacts (with public keys)                   │
│  4. Names the wallet and adds description                                   │
│  5. System aggregates keys and generates shared address                     │
│  6. Wallet appears in list with QR code for funding                         │
│                                                                             │
│  PHASE 2: FUNDING (Deposit to Shared Wallet)                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. User views shared wallet detail                                         │
│  2. Clicks "Fund" or shares address with others                             │
│  3. Sends funds from personal wallet to shared address                      │
│  4. Balance updates automatically via Chronik                               │
│                                                                             │
│  PHASE 3: SPENDING (Collaborative Transaction)                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. User clicks "Spend" on shared wallet                                    │
│  2. Enters recipient, amount, and purpose                                   │
│  3. Reviews transaction preview                                             │
│  4. Initiates signing session (notifies other participants)                 │
│  5. All participants approve and provide partial signatures                 │
│  6. System aggregates signatures and broadcasts transaction                 │
│                                                                             │
│  PHASE 4: RECEIVING REQUESTS (Co-signer Experience)                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. User receives notification of incoming signing request                  │
│  2. Reviews transaction details and purpose                                 │
│  3. Approves or rejects the request                                         │
│  4. If approved, provides partial signature                                 │
│  5. Sees session progress and completion                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Plan Documents

| Document                                                         | Focus Area                                                   | Priority |
| ---------------------------------------------------------------- | ------------------------------------------------------------ | -------- |
| [01_NAVIGATION_ENTRY_POINTS.md](./01_NAVIGATION_ENTRY_POINTS.md) | Navigation structure, entry points, information architecture | P0       |
| [02_SHARED_WALLETS_PAGE.md](./02_SHARED_WALLETS_PAGE.md)         | Main shared wallets page, list view, wallet cards            | P0       |
| [03_WALLET_CREATION_FLOW.md](./03_WALLET_CREATION_FLOW.md)       | Create shared wallet wizard, participant selection           | P0       |
| [04_WALLET_DETAIL_VIEW.md](./04_WALLET_DETAIL_VIEW.md)           | Wallet detail page, balance, history, participants           | P1       |
| [05_FUNDING_FLOW.md](./05_FUNDING_FLOW.md)                       | Fund shared wallet, deposit tracking                         | P1       |
| [06_SPENDING_FLOW.md](./06_SPENDING_FLOW.md)                     | Propose spend, transaction builder, signing initiation       | P1       |
| [07_SIGNING_REQUESTS.md](./07_SIGNING_REQUESTS.md)               | Incoming requests, approval flow, notifications              | P1       |
| [08_SESSION_MANAGEMENT.md](./08_SESSION_MANAGEMENT.md)           | Active sessions, progress tracking, completion               | P2       |
| [09_CONTACT_INTEGRATION.md](./09_CONTACT_INTEGRATION.md)         | Public key storage, eligible contacts, signer discovery      | P2       |
| [10_TESTING_VERIFICATION.md](./10_TESTING_VERIFICATION.md)       | Test scenarios, verification checklist                       | P3       |

---

## Architecture Overview

### Component Hierarchy

```
pages/
├── people/
│   └── shared-wallets/
│       ├── index.vue              # Shared wallets list page
│       └── [id].vue               # Wallet detail page (dynamic route)

components/musig2/
├── SharedWalletList.vue           # List container
├── SharedWalletCard.vue           # Individual wallet card
├── SharedWalletDetail.vue         # Full detail view
├── CreateSharedWalletModal.vue    # Creation wizard
├── FundWalletModal.vue            # Funding modal
├── ProposeSpendModal.vue          # Spend proposal modal
├── SigningProgress.vue            # Session progress
├── TransactionPreview.vue         # Transaction preview
├── IncomingRequestCard.vue        # NEW: Incoming request display
├── ParticipantSelector.vue        # NEW: Select contacts for wallet
└── SignerStatusBadge.vue          # NEW: Online/offline status
```

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   UI Components │ ──▶ │  MuSig2 Store   │ ──▶ │ MuSig2 Service  │
│   (Vue)         │     │  (Pinia)        │     │  (Stateless)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       ▼
        │                       │              ┌─────────────────┐
        │                       │              │   lotus-sdk     │
        │                       │              │ MuSig2P2PCoord. │
        │                       │              └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │              ┌─────────────────┐              │
        │              │ Contact Store   │              │
        │              │ (Public Keys)   │              │
        │              └─────────────────┘              │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        P2P Network                               │
│  (Signer Discovery, Session Coordination, Message Exchange)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration with Existing Refactor

This plan builds upon the existing refactor phases:

| Refactor Phase                               | Relevance to MuSig2 UI                      |
| -------------------------------------------- | ------------------------------------------- |
| **Phase 10: MUSIG2_SYSTEM.md**               | Defined store structure and component specs |
| **Phase 19: INTEGRATION_P2P_MUSIG2.md**      | Integration checklist for P2P and MuSig2    |
| **Phase 31: SERVICES_INTEGRATION.md**        | Service layer pattern                       |
| **Phase 32: MUSIG2_SERVICES_INTEGRATION.md** | Service correctly uses SDK APIs             |

### Dependencies

- **Contact Store**: Must support `publicKey` field for MuSig2 participants
- **P2P Store**: Must be initialized before MuSig2 operations
- **Wallet Store**: Provides user's public key for wallet creation
- **Chronik Service**: Fetches shared wallet balances and history

---

## Implementation Phases

### Phase A: Foundation (Days 1-2)

- Navigation entry points
- Shared wallets page structure
- Component integration scaffolding

### Phase B: Core Flows (Days 3-5)

- Wallet creation wizard
- Wallet detail view
- Funding flow

### Phase C: Signing Flows (Days 6-8)

- Spend proposal flow
- Incoming request handling
- Session progress tracking

### Phase D: Polish (Days 9-10)

- Contact integration
- Notifications
- Error handling
- Testing

---

## Success Criteria

1. **Complete Flow**: User can create shared wallet → fund it → spend from it
2. **Co-signer Experience**: User can receive, review, and approve signing requests
3. **Visibility**: Shared wallets appear in wallet overview with balances
4. **Feedback**: Clear progress indicators for all async operations
5. **Error Handling**: Graceful handling of offline participants, timeouts, rejections

---

## Risk Assessment

| Risk                               | Mitigation                                       |
| ---------------------------------- | ------------------------------------------------ |
| P2P connectivity issues            | Show clear connection status, retry logic        |
| Participant offline during signing | Timeout handling, session persistence            |
| Key aggregation failures           | Validation before creation, clear error messages |
| Balance sync delays                | Show "last updated" timestamp, manual refresh    |

---

## Next Steps

1. Review and approve this overview
2. Start with [01_NAVIGATION_ENTRY_POINTS.md](./01_NAVIGATION_ENTRY_POINTS.md)
3. Proceed through documents in priority order
4. Each document contains specific implementation details

---

_Created: December 2024_
_Status: Planning_
_Depends On: Phase 32 (MUSIG2_SERVICES_INTEGRATION.md)_
