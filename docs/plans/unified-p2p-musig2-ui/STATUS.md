# Unified P2P & MuSig2 UI Integration - Status Tracker

> Central tracking document for the unified P2P and MuSig2 UI integration.
> Last Updated: December 11, 2024

---

## Overview

This plan unifies the previously separate `musig2-ui-integration` and `p2p-ui-integration` plans into a single cohesive implementation strategy. The two systems are deeply interrelated—P2P provides the communication layer while MuSig2 provides the cryptographic signing protocol.

**Goal**: Enable users to discover peers, create shared wallets, and collaboratively sign transactions through an intuitive, unified interface.

---

## Phase Status Summary

| Phase | Document                  | Focus Area                            | Priority | Status      | Progress |
| ----- | ------------------------- | ------------------------------------- | -------- | ----------- | -------- |
| 1     | 01_FOUNDATION.md          | Navigation, shared components, routes | P0       | ✅ Complete | 100%     |
| 2     | 02_P2P_CORE.md            | P2P page structure, signers, presence | P0       | ✅ Complete | 100%     |
| 3     | 03_MUSIG2_CORE.md         | Shared wallets, creation, funding     | P0       | ✅ Complete | 100%     |
| 4     | 04_SIGNING_FLOW.md        | Unified signing requests and sessions | P0       | ✅ Complete | 100%     |
| 5     | 05_CONTACT_INTEGRATION.md | P2P + contacts bridge                 | P1       | ✅ Complete | 100%     |
| 6     | 06_POLISH.md              | Loading states, errors, accessibility | P2       | ✅ Complete | 100%     |

---

## Prerequisites

| Requirement                             | Status      |
| --------------------------------------- | ----------- |
| Phase 32: MuSig2 Services Integration   | ✅ Complete |
| Phase 33: P2P Services Integration      | ✅ Complete |
| P2P store refactored to use service     | ✅ Complete |
| MuSig2 store refactored to use service  | ✅ Complete |
| P2P components scaffolded (Phase 9)     | ✅ Complete |
| MuSig2 components scaffolded (Phase 10) | ✅ Complete |

---

## Phase 1: Foundation & Shared Infrastructure

### Status: ✅ Complete

### Tasks

#### Routes & Pages

- [x] Create `pages/people/shared-wallets/index.vue`
- [x] Create `pages/people/shared-wallets/[id].vue`
- [x] Update `pages/people/index.vue` with hub design

#### Shared Components

- [x] Create `components/shared/TransactionPreview.vue`
- [x] Create `components/shared/SigningProgress.vue`
- [x] Create `components/shared/ParticipantSelector.vue`

#### Contact Model

- [x] Add `publicKey` field to Contact interface
- [x] Add `peerId` field to Contact interface (already existed)
- [x] Add `signerCapabilities` field to Contact interface
- [x] Add `lastSeenOnline` field to Contact interface
- [x] Add `contactsWithPublicKeys` getter to contacts store (already existed)
- [x] Add `findByPeerId` getter to contacts store (already existed)
- [x] Add `findByPublicKey` getter to contacts store

#### Navigation

- [x] Add pending requests badge to People nav item
- [x] Verify navigation works between all People sub-pages

---

## Phase 2: P2P Core Integration

### Status: ✅ Complete

### Tasks

#### P2P Page

- [x] Add tab navigation to `pages/people/p2p.vue`
- [x] Integrate all tab content components
- [x] Add query param support for tab selection
- [x] Wire up all event handlers
- [x] Add modal components to template

#### Components

- [x] Create `SignerDetailModal.vue`
- [x] Create `SessionDetailModal.vue`
- [x] Create `PresenceToggle.vue`
- [x] Update `ActivityFeed.vue` with event types

#### Store Verification

- [x] Verify `p2pStore.connected` getter
- [x] Verify `p2pStore.connectedPeers` state
- [x] Verify `p2pStore.activityEvents` state
- [x] Verify `musig2Store.discoveredSigners` state
- [x] Verify `musig2Store.activeSessions` state
- [x] Verify `musig2Store.incomingRequests` state

---

## Phase 3: MuSig2 Core Integration

### Status: ✅ Complete (via Unified Master Plan Phase 5)

### Tasks

#### Components

- [x] Update `SharedWalletList.vue` with refresh and proper layout
- [x] Update `SharedWalletCard.vue` with participant info and actions
- [x] Update `CreateSharedWalletModal.vue` with full wizard flow
- [x] Update `SharedWalletDetail.vue` with all sections
- [x] Update `FundWalletModal.vue` with funding options

#### Store

- [x] Verify `createSharedWallet` action
- [x] Verify `deleteSharedWallet` action
- [x] Verify `refreshSharedWalletBalances` action
- [x] Verify `sharedWallets` state persistence

#### Pages

- [x] Verify `pages/people/shared-wallets/index.vue` works
- [x] Verify `pages/people/shared-wallets/[id].vue` works
- [x] Verify navigation between pages

---

## Phase 4: Unified Signing Flow

### Status: ✅ Complete (via Unified Master Plan Phase 6)

### Tasks

#### Components

- [x] Update `ProposeSpendModal.vue` with full wizard flow (details → preview → progress)
- [x] Create `RequestDetailModal.vue` for incoming requests
- [x] Create `IncomingRequestCard.vue` for prominent display
- [x] Update `SigningRequestModal.vue` for P2P requests (already functional)
- [x] Update `RequestList.vue` with status tracking

#### Store Methods

- [x] Verify `proposeSpend` action
- [x] Verify `acceptRequest` action
- [x] Verify `rejectRequest` action
- [x] Verify `cancelRequest` action
- [x] Verify `abortSession` action

#### Integration

- [x] Wire up P2P page request handlers
- [x] Wire up shared wallet spend handlers
- [x] Add request notifications
- [x] Add session progress tracking

---

## Phase 5: Contact & Social Integration

### Status: ✅ Complete (via Unified Master Plan Phase 9)

### Tasks

#### Contact Detail

- [x] Add P2P section to `ContactDetailSlideover.vue`
- [x] Show online status
- [x] Show public key with copy
- [x] Show signer capabilities
- [x] Show shared wallets with contact
- [x] Add "Request Signature" action
- [x] Add "Create Shared Wallet" action

#### Contact Form

- [x] Add public key input field
- [x] Add public key validation
- [x] Add info alert about public keys

#### Contact List

- [x] Add online status indicator to list items
- [x] Add MuSig2-ready badge

#### Store Updates

- [x] Add `updateLastSeen` action
- [x] Add `updateSignerCapabilities` action
- [x] Add `_validatePublicKey` helper (via existing validation in ContactForm)
- [x] Add `isPeerOnline` getter to P2P store

#### P2P Integration

- [x] Implement `handleSaveSignerAsContact` in P2P page
- [x] Auto-update contact last seen on peer events

---

## Phase 6: Polish & Accessibility

### Status: ✅ Complete (via Unified Master Plan Phase 10)

### Tasks

#### Loading States

- [x] Create `SignerListSkeleton.vue`
- [x] Create `SharedWalletListSkeleton.vue`
- [x] Create `LoadingOverlay.vue`
- [x] Add loading states to all async operations

#### Empty States

- [x] Add empty state to signers list (uses UiAppEmptyState)
- [x] Add empty state to sessions list (uses UiAppEmptyState)
- [x] Add empty state to requests list (uses UiAppEmptyState)
- [x] Add empty state to shared wallets list (uses UiAppEmptyState)

#### Error Handling

- [x] Create `ErrorState.vue` component
- [x] Add error handling to all async operations
- [x] Add retry functionality where appropriate

#### Success Feedback

- [x] Create `SuccessAnimation.vue`
- [x] Add success feedback to key actions

#### Notifications

- [x] Create `useP2PNotifications` composable (via notification store methods)
- [x] Add notification for incoming requests
- [x] Add notification for session completion
- [x] Add navigation badges

#### Accessibility

- [x] Add ARIA labels to interactive elements
- [x] Implement focus management in modals (`useFocusManagement.ts`)
- [ ] Test with screen reader (pending manual verification)

---

## Superseded Plans

This unified plan supersedes the following separate plans:

| Plan                  | Location                            | Status     |
| --------------------- | ----------------------------------- | ---------- |
| MuSig2 UI Integration | `docs/plans/musig2-ui-integration/` | Superseded |
| P2P UI Integration    | `docs/plans/p2p-ui-integration/`    | Superseded |

The separate plans remain for reference but should not be used for implementation.

---

## Key Overlaps Unified

| Feature               | Previously In | Now In                     |
| --------------------- | ------------- | -------------------------- |
| Signing Requests      | Both plans    | Phase 4                    |
| Session Management    | Both plans    | Phase 4                    |
| Contact Integration   | Both plans    | Phase 5                    |
| Transaction Preview   | Both plans    | Phase 1 (shared component) |
| Navigation/Page Setup | Both plans    | Phase 1                    |

---

## Estimated Timeline

| Phase   | Effort   | Cumulative |
| ------- | -------- | ---------- |
| Phase 1 | 2-3 days | 2-3 days   |
| Phase 2 | 2-3 days | 4-6 days   |
| Phase 3 | 3-4 days | 7-10 days  |
| Phase 4 | 3-4 days | 10-14 days |
| Phase 5 | 2 days   | 12-16 days |
| Phase 6 | 2 days   | 14-18 days |

**Total Estimated Effort**: 14-18 days

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

## Notes

- All P2P operations should use the service layer, not direct SDK access
- Components should follow the existing design system patterns
- Testing should verify both functionality and UX
- The unified approach eliminates duplicate work and ensures consistency

---

## Change Log

| Date       | Phase | Change                                                                                                                                         |
| ---------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 2024-12-11 | -     | Created unified plan from musig2-ui-integration and p2p-ui-integration                                                                         |
| 2024-12-11 | -     | Created 00_OVERVIEW.md                                                                                                                         |
| 2024-12-11 | -     | Created 01_FOUNDATION.md                                                                                                                       |
| 2024-12-11 | -     | Created 02_P2P_CORE.md                                                                                                                         |
| 2024-12-11 | -     | Created 03_MUSIG2_CORE.md                                                                                                                      |
| 2024-12-11 | -     | Created 04_SIGNING_FLOW.md                                                                                                                     |
| 2024-12-11 | -     | Created 05_CONTACT_INTEGRATION.md                                                                                                              |
| 2024-12-11 | -     | Created 06_POLISH.md                                                                                                                           |
| 2024-12-11 | -     | Created STATUS.md                                                                                                                              |
| 2024-12-11 | 1     | **Phase 1 Complete**: Routes, shared components, contact model, nav                                                                            |
| 2024-12-11 | 2     | **Phase 2 Complete**: P2P page tabs, SignerDetailModal, SessionDetailModal, PresenceToggle, ActivityFeed enhanced                              |
| 2024-12-11 | 3     | **Phase 3 Complete**: CreateSharedWalletModal wizard, session monitor SW integration, store SW methods                                         |
| 2024-12-11 | 4     | **Phase 4 Complete**: ProposeSpendModal wizard, RequestDetailModal, IncomingRequestCard, store notification methods                            |
| 2024-12-11 | 5     | **Phase 5 Complete**: ContactDetailSlideover P2P section, ContactForm public key, ContactCard online status, store updates                     |
| 2024-12-11 | 6     | **Phase 6 Complete**: Skeleton components, ErrorState, SuccessAnimation, LoadingOverlay, useFocusManagement (via Unified Master Plan Phase 10) |

---

_This document should be updated as each phase progresses._
