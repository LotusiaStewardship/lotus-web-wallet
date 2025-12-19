# Post-Refactor Remediation Plan

**Version**: 1.0.0  
**Date**: December 18, 2025  
**Status**: Planning Complete  
**Scope**: lotus-web-wallet P2P, MuSig2, and UI remediation  
**Priority**: P0/P1 (Critical/High)

---

## Critical Prerequisites

> ⚠️ **BEFORE IMPLEMENTING ANY CHANGES**, consult:
>
> - [07_HUMAN_CENTERED_UX.md](../../architecture/design/07_HUMAN_CENTERED_UX.md) — Human-centered UX principles (REQUIRED)
> - [05_COMPONENTS.md](../../architecture/05_COMPONENTS.md) — Component organization and design patterns
> - [03_SERVICES.md](../../architecture/03_SERVICES.md) — Service layer architecture

Every implementation must satisfy the UX checklist and principles defined in the Human-Centered UX document.

---

## Executive Summary

This unified remediation plan addresses issues identified after completing the **Unified Contact-Centric Refactor** (Phases 1-6). The refactor successfully migrated the wallet from a wallet-centric to a human-centric application, but several gaps remain:

1. **WebRTC Connectivity** (P0) - Browser-to-browser P2P connections don't work
2. **Discovery Cache Persistence** (P1) - Signers lost on page reload
3. **UI Pattern Consistency** (P1) - Duplicate components and inconsistent patterns

**Total Estimated Duration**: 8-12 days  
**Total Files Modified**: ~25 files across wallet and SDK

---

## Problem Statement

### Current Gaps

| Category              | Issue                                                                  | Impact                         | Priority |
| --------------------- | ---------------------------------------------------------------------- | ------------------------------ | -------- |
| **P2P Connectivity**  | Wallets cannot establish direct connections despite presence discovery | Shared wallets non-functional  | P0       |
| **P2P Connectivity**  | Advertisements missing relay addresses                                 | Peers undialable               | P0       |
| **P2P Connectivity**  | No connection attempt on presence discovery                            | Discovery without connectivity | P0       |
| **Cache Persistence** | `require()` vs `import()` creates separate module instances            | Signers lost on reload         | P1       |
| **Cache Persistence** | Debounced save may not complete before page unload                     | Data loss on navigation        | P1       |
| **UI Consistency**    | Duplicate SignerCard components in different directories               | Maintenance burden             | P1       |
| **UI Consistency**    | Inconsistent empty states, card styles, avatar rendering               | Poor UX consistency            | P1       |

### Root Causes

1. **WebRTC**: SDK doesn't expose relay circuit addresses; wallet doesn't attempt connections
2. **Cache**: CommonJS `require()` creates separate module instances from ES `import()`
3. **UI**: Iterative development without unified component audit

---

## Architecture Compliance

This plan follows the architecture guidelines in `docs/architecture/`:

| Principle                                              | How We Comply                                                   |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| **Centralized SDK Provider** (01_CORE_ARCHITECTURE.md) | All P2P operations through lotus-sdk                            |
| **Service-Store Separation** (02_STATE_MANAGEMENT.md)  | Connection logic in services, reactive state in stores          |
| **Stateless Services** (03_SERVICES.md)                | Services wrap external APIs, no internal state                  |
| **Event-Driven Architecture** (00_OVERVIEW.md)         | Connection events flow through callbacks                        |
| **Component Organization** (05_COMPONENTS.md)          | Shared components in `common/`, domain-specific in feature dirs |
| **Human-Centered UX** (design/07_HUMAN_CENTERED_UX.md) | Progressive disclosure, user-friendly language                  |

---

## Phase Overview

| Phase | Name                        | Priority | Effort   | Dependencies |
| ----- | --------------------------- | -------- | -------- | ------------ |
| 1     | Discovery Cache Fixes       | P1       | 1 day    | None         |
| 2     | SDK Relay Address Discovery | P0       | 2 days   | None         |
| 3     | Wallet Connectivity Layer   | P0       | 2-3 days | Phase 2      |
| 4     | MuSig2 Session Connectivity | P0       | 1-2 days | Phase 3      |
| 5     | UI Component Consolidation  | P1       | 1-2 days | None         |
| 6     | UI Pattern Standardization  | P1       | 1-2 days | Phase 5      |
| 7     | Testing & Verification      | P0       | 1-2 days | All phases   |

```
Week 1:  Phase 1 (Cache) + Phase 2 (SDK) + Phase 5 (UI Components)
Week 2:  Phase 3 (Wallet Connectivity) + Phase 6 (UI Patterns)
Week 3:  Phase 4 (MuSig2 Sessions) + Phase 7 (Testing)
```

---

## Phase 1: Discovery Cache Fixes

**Priority**: P1  
**Effort**: 1 day  
**Document**: [01_DISCOVERY_CACHE.md](./01_DISCOVERY_CACHE.md)

### Problem

The MuSig2 signer discovery cache doesn't persist between page reloads due to:

1. `require()` vs `import()` creating separate module instances
2. Debounced save not completing before page unload

### Tasks

| Task | Description                                 | File                          | Effort |
| ---- | ------------------------------------------- | ----------------------------- | ------ |
| 1.1  | Replace `require()` with top-level `import` | `stores/musig2.ts`            | 15m    |
| 1.2  | Add `beforeunload` handler to flush saves   | `services/discovery-cache.ts` | 15m    |
| 1.3  | Add diagnostic logging                      | `services/discovery-cache.ts` | 15m    |

### Success Criteria

- [ ] Discovered signers persist through page reload
- [ ] Console shows `[DiscoveryCache] Loaded X entries` on startup
- [ ] No data loss during rapid page navigation

---

## Phase 2: SDK Relay Address Discovery

**Priority**: P0  
**Effort**: 2 days  
**Document**: [02_SDK_RELAY_ADDRESSES.md](./02_SDK_RELAY_ADDRESSES.md)

### Problem

Browsers cannot bind to ports directly and must use relay addresses for incoming connections. The SDK doesn't properly expose these addresses.

### Tasks

| Task | Description                               | File                               | Effort |
| ---- | ----------------------------------------- | ---------------------------------- | ------ |
| 2.1  | Add `getRelayAddresses()` method          | `lotus-sdk/lib/p2p/coordinator.ts` | 2h     |
| 2.2  | Add `getBootstrapRelayAddresses()` method | `lotus-sdk/lib/p2p/coordinator.ts` | 2h     |
| 2.3  | Emit `ADDRESSES_AVAILABLE` event          | `lotus-sdk/lib/p2p/coordinator.ts` | 1h     |
| 2.4  | Add `connectToPeerViaRelay()` helper      | `lotus-sdk/lib/p2p/coordinator.ts` | 2h     |
| 2.5  | Update `P2PStats` interface               | `lotus-sdk/lib/p2p/types.ts`       | 30m    |

### Success Criteria

- [ ] `getBootstrapRelayAddresses()` returns dialable addresses
- [ ] `connectToPeerViaRelay()` establishes connections
- [ ] `RelayEvent.ADDRESSES_AVAILABLE` fires when connected to bootstrap

---

## Phase 3: Wallet Connectivity Layer

**Priority**: P0  
**Effort**: 2-3 days  
**Document**: [03_WALLET_CONNECTIVITY.md](./03_WALLET_CONNECTIVITY.md)

### Problem

The wallet doesn't include relay addresses in advertisements or attempt connections to discovered peers.

### Tasks

| Task | Description                                        | File              | Effort |
| ---- | -------------------------------------------------- | ----------------- | ------ |
| 3.1  | Include relay addresses in presence advertisements | `services/p2p.ts` | 2h     |
| 3.2  | Subscribe to `lotus/peers` topic                   | `services/p2p.ts` | 2h     |
| 3.3  | Add `connectToDiscoveredPeer()` function           | `services/p2p.ts` | 3h     |
| 3.4  | Implement connection retry with backoff            | `services/p2p.ts` | 2h     |
| 3.5  | Add `connectToOnlinePeer()` store action           | `stores/p2p.ts`   | 2h     |
| 3.6  | Track connection status per peer                   | `stores/p2p.ts`   | 2h     |
| 3.7  | Update `UIPresenceAdvertisement` type              | `types/p2p.ts`    | 1h     |

### Success Criteria

- [ ] Presence advertisements include relay addresses
- [ ] Wallet can connect to discovered peers
- [ ] Connection status tracked per peer

---

## Phase 4: MuSig2 Session Connectivity

**Priority**: P0  
**Effort**: 1-2 days  
**Document**: [04_MUSIG2_CONNECTIVITY.md](./04_MUSIG2_CONNECTIVITY.md)

### Problem

MuSig2 sessions fail because participants cannot establish direct communication for nonce/signature exchange.

### Tasks

| Task | Description                                       | File                                            | Effort |
| ---- | ------------------------------------------------- | ----------------------------------------------- | ------ |
| 4.1  | Connect to all participants before nonce exchange | `services/musig2.ts`                            | 3h     |
| 4.2  | Verify connectivity before announcing session     | `services/musig2.ts`                            | 2h     |
| 4.3  | Handle participant connection failures            | `services/musig2.ts`                            | 2h     |
| 4.4  | Add participant connection status to UI           | `stores/musig2.ts`                              | 2h     |
| 4.5  | Show connection status on participant list        | `components/shared-wallets/ParticipantList.vue` | 2h     |

### Success Criteria

- [ ] MuSig2 nonce exchange succeeds between connected wallets
- [ ] MuSig2 partial signature exchange succeeds
- [ ] Complete signing session works end-to-end

---

## Phase 5: UI Component Consolidation

**Priority**: P1  
**Effort**: 1-2 days  
**Document**: [05_UI_CONSOLIDATION.md](./05_UI_CONSOLIDATION.md)

### Problem

Duplicate components exist for the same functionality, creating maintenance burden and inconsistent UX.

### Tasks

| Task | Description                            | File                                             | Effort |
| ---- | -------------------------------------- | ------------------------------------------------ | ------ |
| 5.1  | Create unified `SignerCard`            | `components/common/SignerCard.vue`               | 3h     |
| 5.2  | Update P2P SignerList                  | `components/p2p/SignerList.vue`                  | 1h     |
| 5.3  | Update AvailableSigners                | `components/shared-wallets/AvailableSigners.vue` | 1h     |
| 5.4  | Delete duplicate SignerCard components | Multiple files                                   | 30m    |
| 5.5  | Create unified `SignerDetailModal`     | `components/common/SignerDetailModal.vue`        | 2h     |
| 5.6  | Align P2P HeroCard styling             | `components/p2p/HeroCard.vue`                    | 1h     |

### Success Criteria

- [ ] Zero duplicate components for same functionality
- [ ] Single source of truth for shared components
- [ ] No visual regressions

---

## Phase 6: UI Pattern Standardization

**Priority**: P1  
**Effort**: 1-2 days  
**Document**: [06_UI_PATTERNS.md](./06_UI_PATTERNS.md)

### Problem

Inconsistent patterns for empty states, cards, avatars, and badges across P2P/MuSig2/Contacts areas.

### Tasks

| Task | Description                                   | File                                    | Effort |
| ---- | --------------------------------------------- | --------------------------------------- | ------ |
| 6.1  | Standardize empty states to `UiAppEmptyState` | Multiple pages                          | 2h     |
| 6.2  | Standardize card wrappers                     | `components/p2p/`, `components/musig2/` | 2h     |
| 6.3  | Standardize skeleton loading states           | Multiple components                     | 1h     |
| 6.4  | Document badge color semantics                | `docs/architecture/`                    | 1h     |
| 6.5  | Standardize avatar rendering                  | Multiple components                     | 2h     |
| 6.6  | Standardize action button patterns            | Multiple components                     | 2h     |

### Success Criteria

- [ ] All empty states use `UiAppEmptyState`
- [ ] Consistent badge color usage
- [ ] Consistent avatar rendering with initials
- [ ] Predictable action button locations

---

## Phase 7: Testing & Verification

**Priority**: P0  
**Effort**: 1-2 days  
**Document**: [07_TESTING.md](./07_TESTING.md)

### Tasks

| Task | Description                                         | Effort |
| ---- | --------------------------------------------------- | ------ |
| 7.1  | Test relay address advertisement between wallets    | 2h     |
| 7.2  | Test WebRTC connection establishment via relay      | 2h     |
| 7.3  | Test MuSig2 session with connected participants     | 3h     |
| 7.4  | Test connection recovery after network interruption | 2h     |
| 7.5  | Test with 3+ participants                           | 2h     |
| 7.6  | Test discovery cache persistence                    | 1h     |
| 7.7  | Visual regression testing for UI changes            | 2h     |

### Success Criteria

- [ ] Two wallets can establish WebRTC connection
- [ ] MuSig2 signing session completes end-to-end
- [ ] Discovery cache persists through reload
- [ ] No visual regressions in P2P/MuSig2/Contacts UI

---

## Files Summary

### lotus-sdk Changes

| File                     | Change Type | Phase |
| ------------------------ | ----------- | ----- |
| `lib/p2p/coordinator.ts` | MODIFY      | 2     |
| `lib/p2p/types.ts`       | MODIFY      | 2     |

### Wallet Service Changes

| File                          | Change Type | Phase |
| ----------------------------- | ----------- | ----- |
| `services/discovery-cache.ts` | MODIFY      | 1     |
| `services/p2p.ts`             | MODIFY      | 3     |
| `services/musig2.ts`          | MODIFY      | 4     |

### Wallet Store Changes

| File               | Change Type | Phase |
| ------------------ | ----------- | ----- |
| `stores/musig2.ts` | MODIFY      | 1, 4  |
| `stores/p2p.ts`    | MODIFY      | 3     |

### Type Changes

| File           | Change Type | Phase |
| -------------- | ----------- | ----- |
| `types/p2p.ts` | MODIFY      | 3     |

### Component Changes

| File                                             | Change Type | Phase |
| ------------------------------------------------ | ----------- | ----- |
| `components/common/SignerCard.vue`               | CREATE      | 5     |
| `components/common/SignerDetailModal.vue`        | CREATE      | 5     |
| `components/p2p/SignerCard.vue`                  | DELETE      | 5     |
| `components/shared-wallets/SignerCard.vue`       | DELETE      | 5     |
| `components/p2p/SignerList.vue`                  | MODIFY      | 5     |
| `components/shared-wallets/AvailableSigners.vue` | MODIFY      | 5     |
| `components/shared-wallets/ParticipantList.vue`  | MODIFY      | 4, 6  |
| `components/p2p/HeroCard.vue`                    | MODIFY      | 5     |
| Multiple pages                                   | MODIFY      | 6     |

---

## Risk Assessment

| Risk                            | Impact | Mitigation                                  |
| ------------------------------- | ------ | ------------------------------------------- |
| WebRTC not supported in browser | High   | Feature detection, fallback to relay-only   |
| SDK changes break wallet        | High   | Version pinning, comprehensive testing      |
| Bootstrap server downtime       | High   | Multiple bootstrap nodes, health monitoring |
| UI changes cause regressions    | Medium | Visual testing, rollback plan               |
| Cache changes lose data         | Low    | JSON.parse handles invalid data gracefully  |

---

## Dependencies

### External Dependencies

- `@libp2p/webrtc` package (already in lotus-sdk)
- `@libp2p/circuit-relay-v2` package (already in lotus-sdk)
- Bootstrap server with circuit relay enabled (already configured)

### Internal Dependencies

```
Phase 1 (Cache) ──────────────────────────────────────────────┐
                                                              │
Phase 2 (SDK) ──────► Phase 3 (Wallet) ──────► Phase 4 (MuSig2) ──► Phase 7 (Testing)
                                                              │
Phase 5 (UI Components) ──────► Phase 6 (UI Patterns) ────────┘
```

---

## Document Index

| Document                                                 | Description                            |
| -------------------------------------------------------- | -------------------------------------- |
| [00_OVERVIEW.md](./00_OVERVIEW.md)                       | This document - comprehensive overview |
| [01_DISCOVERY_CACHE.md](./01_DISCOVERY_CACHE.md)         | Phase 1: Cache persistence fixes       |
| [02_SDK_RELAY_ADDRESSES.md](./02_SDK_RELAY_ADDRESSES.md) | Phase 2: SDK relay address discovery   |
| [03_WALLET_CONNECTIVITY.md](./03_WALLET_CONNECTIVITY.md) | Phase 3: Wallet connectivity layer     |
| [04_MUSIG2_CONNECTIVITY.md](./04_MUSIG2_CONNECTIVITY.md) | Phase 4: MuSig2 session connectivity   |
| [05_UI_CONSOLIDATION.md](./05_UI_CONSOLIDATION.md)       | Phase 5: Component consolidation       |
| [06_UI_PATTERNS.md](./06_UI_PATTERNS.md)                 | Phase 6: Pattern standardization       |
| [07_TESTING.md](./07_TESTING.md)                         | Phase 7: Testing and verification      |
| [STATUS.md](./STATUS.md)                                 | Implementation progress tracker        |

---

## Related Documentation

### Architecture

- `docs/architecture/00_OVERVIEW.md` - Architecture overview
- `docs/architecture/03_SERVICES.md` - Service layer patterns
- `docs/architecture/05_COMPONENTS.md` - Component organization
- `docs/architecture/design/07_HUMAN_CENTERED_UX.md` - UX principles

### Superseded Plans

This plan supersedes and unifies:

- `docs/plans/webrtc-connectivity-remediation/` - WebRTC connectivity
- `docs/plans/ui-pattern-consistency-remediation/` - UI patterns
- `docs/plans/discovery-cache-remediation/` - Cache persistence
- `docs/plans/unified-contact-centric-refactor/08_PHASE_REMAINING_ISSUES.md` - Remaining issues

---

_Created: December 18, 2025_  
_Status: Planning Complete - Ready for Implementation_
