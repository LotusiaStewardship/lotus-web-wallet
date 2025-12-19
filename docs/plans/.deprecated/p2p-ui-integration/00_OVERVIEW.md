# P2P UI Integration Plan

## Overview

This plan outlines the comprehensive integration of P2P functionality into the lotus-web-wallet user interface. It builds upon the completed service layer refactoring (Phase 33) and addresses the UX gaps identified in the analysis documents.

**Goal**: Transform the P2P interface from a technical feature into an intuitive, user-friendly experience that enables wallet-to-wallet collaboration for multi-signature transactions, presence discovery, and peer communication.

---

## Current State Assessment

### Completed Work

| Phase | Document                 | Status                    |
| ----- | ------------------------ | ------------------------- |
| 09    | P2P System (refactor)    | ✅ Components scaffolded  |
| 19    | Integration P2P & MuSig2 | ✅ Basic integration      |
| 33    | P2P Services Integration | ✅ Service layer complete |

### Existing Components (`components/p2p/`)

| Component                    | Status    | Notes                     |
| ---------------------------- | --------- | ------------------------- |
| `HeroCard.vue`               | ✅ Exists | Connection status display |
| `OnboardingCard.vue`         | ✅ Exists | First-time user guidance  |
| `QuickActions.vue`           | ✅ Exists | Action buttons            |
| `PeerGrid.vue`               | ✅ Exists | Connected peers display   |
| `ActivityFeed.vue`           | ✅ Exists | P2P events                |
| `SignerList.vue`             | ✅ Exists | Available signers         |
| `SignerCard.vue`             | ✅ Exists | Individual signer         |
| `SessionList.vue`            | ✅ Exists | Active sessions           |
| `IncomingRequests.vue`       | ✅ Exists | Signing requests          |
| `RequestList.vue`            | ✅ Exists | Request management        |
| `SettingsPanel.vue`          | ✅ Exists | P2P settings              |
| `SigningRequestModal.vue`    | ✅ Exists | Request creation          |
| `SigningSessionProgress.vue` | ✅ Exists | Session progress          |

### Current Page (`pages/people/p2p.vue`)

- Basic connection status with HeroCard
- Onboarding card for disconnected state
- Quick actions when connected
- Peer grid and activity feed
- **Missing**: Tabs, incoming requests, sessions, signers, settings

---

## Gap Analysis Summary

Based on `P2P_UX_COMPREHENSIVE_ANALYSIS.md`:

### Critical Gaps (P0)

1. **Incoming requests not shown** - Component exists but never rendered
2. **Signing request flow incomplete** - Just logs to console
3. **No mental model/onboarding** - Users don't understand P2P
4. **Signer details view missing** - Can't evaluate signers

### High Priority Gaps (P1)

5. **No session management UI** - Can't track active sessions
6. **No messaging/communication** - Can't negotiate with peers
7. **Contact integration broken** - "Save as Contact" doesn't work
8. **Fragmented navigation** - P2P settings scattered
9. **No activity context** - Feed shows technical events only

### Medium Priority Gaps (P2)

10. **No social identity** - Peers are anonymous blobs
11. **No signing history** - No audit trail
12. **No group signing** - Limited to 1:1 requests
13. **No transaction preview** - Blind signing
14. **No offline mode** - Useless when disconnected

---

## Integration Phases

### Phase 1: Core P2P Page Structure

**Priority**: P0 | **Effort**: 1-2 days

Restructure the P2P page with proper tabs and integrate existing components:

- Add tab navigation (Overview, Signers, Sessions, Requests, Settings)
- Integrate `IncomingRequests` component prominently
- Add `SignerList` and `SessionList` to appropriate tabs
- Integrate `SettingsPanel` component

### Phase 2: Signing Request Flow

**Priority**: P0 | **Effort**: 2-3 days

Complete the end-to-end signing request flow:

- Wire up signing request submission to MuSig2 service
- Implement accept/reject handlers for incoming requests
- Add request status tracking
- Create transaction preview component
- Add request detail modal

### Phase 3: Session Management

**Priority**: P1 | **Effort**: 2 days

Implement full session lifecycle management:

- Display active sessions with progress indicators
- Add session detail view
- Implement session abort/cancel
- Add session history persistence
- Create session notifications

### Phase 4: Contact & Signer Integration

**Priority**: P1 | **Effort**: 1-2 days

Bridge P2P signers with the contacts system:

- Implement "Save as Contact" functionality
- Add P2P fields to contact model
- Show contacts' online status
- Add "Request Signature" from contact detail
- Create signer detail modal

### Phase 5: Presence & Discovery

**Priority**: P1 | **Effort**: 1-2 days

Enhance presence and peer discovery:

- Add presence toggle to P2P hub header
- Implement presence status options
- Improve activity feed with meaningful events
- Add peer discovery refresh
- Show signer advertisements in feed

### Phase 6: Polish & Accessibility

**Priority**: P2 | **Effort**: 1-2 days

Final polish and accessibility improvements:

- Add loading states and skeleton loaders
- Improve empty states with illustrations
- Add success celebrations
- Implement error recovery with retry
- Add keyboard navigation
- Ensure screen reader compatibility

---

## File Structure (Target)

```
pages/
└── people/
    └── p2p.vue                    # Main P2P hub with tabs

components/
└── p2p/
    ├── HeroCard.vue               # ✅ Connection status
    ├── OnboardingCard.vue         # ✅ First-time guidance
    ├── QuickActions.vue           # ✅ Action buttons
    ├── PeerGrid.vue               # ✅ Connected peers
    ├── ActivityFeed.vue           # ✅ P2P events
    ├── SignerList.vue             # ✅ Available signers
    ├── SignerCard.vue             # ✅ Individual signer
    ├── SignerDetailModal.vue      # 🆕 Signer profile
    ├── SessionList.vue            # ✅ Active sessions
    ├── SessionDetailModal.vue     # 🆕 Session details
    ├── IncomingRequests.vue       # ✅ Signing requests
    ├── RequestList.vue            # ✅ Request management
    ├── RequestDetailModal.vue     # 🆕 Request details
    ├── TransactionPreview.vue     # 🆕 TX preview
    ├── SettingsPanel.vue          # ✅ P2P settings
    ├── SigningRequestModal.vue    # ✅ Request creation
    ├── SigningSessionProgress.vue # ✅ Session progress
    └── PresenceToggle.vue         # 🆕 Presence control

stores/
├── p2p.ts                         # ✅ P2P state (refactored)
└── musig2.ts                      # ✅ MuSig2 state

services/
├── p2p.ts                         # ✅ P2P service (refactored)
└── musig2.ts                      # ✅ MuSig2 service
```

---

## Dependencies

### Required Before Starting

- ✅ Phase 33: P2P Services Integration (complete)
- ✅ Phase 32: MuSig2 Services Integration (complete)
- ✅ P2P store refactored to use service
- ✅ MuSig2 store refactored to use service

### External Dependencies

- `lotus-sdk` P2PCoordinator API
- `lotus-sdk` MuSig2P2PCoordinator API
- Nuxt UI components
- Pinia stores

---

## Success Metrics

### Functional Metrics

- [ ] Users can connect/disconnect from P2P network
- [ ] Users can see and respond to incoming signing requests
- [ ] Users can discover and request signatures from signers
- [ ] Users can track active signing sessions
- [ ] Users can save signers as contacts
- [ ] Users can control their presence status

### UX Metrics

- [ ] First-time users understand what P2P is for (onboarding)
- [ ] All actions have appropriate loading/success/error states
- [ ] Empty states provide actionable guidance
- [ ] Navigation is intuitive (no more than 2 clicks to any feature)

---

## Document Index

| Phase | Document                                                   | Priority |
| ----- | ---------------------------------------------------------- | -------- |
| 1     | [01_PAGE_STRUCTURE.md](./01_PAGE_STRUCTURE.md)             | P0       |
| 2     | [02_SIGNING_REQUEST_FLOW.md](./02_SIGNING_REQUEST_FLOW.md) | P0       |
| 3     | [03_SESSION_MANAGEMENT.md](./03_SESSION_MANAGEMENT.md)     | P1       |
| 4     | [04_CONTACT_INTEGRATION.md](./04_CONTACT_INTEGRATION.md)   | P1       |
| 5     | [05_PRESENCE_DISCOVERY.md](./05_PRESENCE_DISCOVERY.md)     | P1       |
| 6     | [06_POLISH_ACCESSIBILITY.md](./06_POLISH_ACCESSIBILITY.md) | P2       |

---

## Related Documents

- [P2P_UX_COMPREHENSIVE_ANALYSIS.md](../../analysis/P2P_UX_COMPREHENSIVE_ANALYSIS.md)
- [09_P2P_NETWORK.md](../ux-implementation/09_P2P_NETWORK.md)
- [09_P2P_SYSTEM.md](../refactor/09_P2P_SYSTEM.md)
- [19_INTEGRATION_P2P_MUSIG2.md](../refactor/19_INTEGRATION_P2P_MUSIG2.md)
- [33_P2P_SERVICES_INTEGRATION.md](../refactor/33_P2P_SERVICES_INTEGRATION.md)

---

_Last Updated: December 10, 2024_
