# Unified Master Implementation Plan

## Overview

This master plan consolidates and orders all pending implementation work for the lotus-web-wallet into a single, dependency-aware execution plan. It unifies the following four plans:

1. **background-service-worker** - Service worker architecture, background operations, crypto offloading
2. **notification-system** - Notification integration across all features
3. **unified-p2p-musig2-ui** - P2P networking and MuSig2 multi-signature UI
4. **unified-remaining-tasks** - Explorer, Social/RANK, code cleanup, polish

**Created**: December 11, 2024
**Scope**: Complete lotus-web-wallet feature implementation
**Priority**: P0 (Critical Path)
**Estimated Effort**: 35-50 days

---

## Why a Unified Plan?

The four existing plans have significant interdependencies:

| Plan A                    | Plan B                  | Dependency                                                |
| ------------------------- | ----------------------- | --------------------------------------------------------- |
| background-service-worker | notification-system     | SW Phase 4 enables true background notifications          |
| background-service-worker | unified-p2p-musig2-ui   | SW Phase 3 enables session monitoring for MuSig2          |
| notification-system       | unified-p2p-musig2-ui   | Notification Phase 3 integrates with P2P/MuSig2 events    |
| notification-system       | unified-remaining-tasks | Notification Phase 5 integrates with Social/RANK          |
| unified-p2p-musig2-ui     | unified-remaining-tasks | Cross-feature integration requires P2P/MuSig2 completion  |
| unified-remaining-tasks   | ALL                     | Final verification requires all other work to be complete |

By unifying these plans, we:

1. **Eliminate blocking dependencies** - Work is ordered to prevent waiting
2. **Enable parallel work streams** - Independent tasks can proceed simultaneously
3. **Ensure proper foundation** - Infrastructure is built before features that depend on it
4. **Provide clear milestones** - Progress is measurable at each phase

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           UNIFIED IMPLEMENTATION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  PHASE 1-2: INFRASTRUCTURE FOUNDATION                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Service Worker Setup │ Notification Settings │ useUtils Deprecation   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    ▼                                            │
│  PHASE 3-5: CORE FEATURE DEVELOPMENT                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  P2P/MuSig2 Foundation │ Network Monitor │ Wallet Notifications        │   │
│  │  P2P Core Integration  │ Session Monitor │ P2P/MuSig2 Notifications    │   │
│  │  MuSig2 Core           │ Crypto Worker   │ Explorer Detail Pages       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    ▼                                            │
│  PHASE 6-8: ADVANCED FEATURES                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Unified Signing Flow │ Push Notifications │ Social/RANK Voting        │   │
│  │  Contact Integration  │ Browser Notifs     │ Social Notifications      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    ▼                                            │
│  PHASE 9-10: INTEGRATION & POLISH                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Cross-Feature Integration │ State Sync │ Polish & Accessibility       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│                                    ▼                                            │
│  PHASE 11: VERIFICATION                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Final Testing │ Performance Audit │ Accessibility Audit │ Release     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase Summary

| Phase | Document                             | Focus Area                                    | Priority | Est. Effort | Source Plans            |
| ----- | ------------------------------------ | --------------------------------------------- | -------- | ----------- | ----------------------- |
| 1     | 01_INFRASTRUCTURE_FOUNDATION.md      | SW setup, notification settings, useUtils     | P0       | 2-3 days    | SW-1, NS-1, URT-3       |
| 2     | 02_P2P_MUSIG2_FOUNDATION.md          | Navigation, shared components, routes         | P0       | 2-3 days    | PM-1                    |
| 3     | 03_NETWORK_AND_WALLET_INTEGRATION.md | Network monitor, wallet notifications         | P0       | 2-3 days    | SW-2, NS-2              |
| 4     | 04_P2P_CORE_INTEGRATION.md           | P2P page, signers, presence                   | P0       | 2-3 days    | PM-2                    |
| 5     | 05_MUSIG2_CORE_AND_SESSION.md        | Shared wallets, session monitor               | P0       | 3-4 days    | PM-3, SW-3              |
| 6     | 06_SIGNING_FLOW_AND_NOTIFICATIONS.md | Unified signing, P2P/MuSig2 notifications     | P0       | 3-4 days    | PM-4, NS-3              |
| 7     | 07_EXPLORER_AND_SOCIAL.md            | Explorer detail, Social/RANK voting           | P1       | 4-6 days    | URT-1, URT-2            |
| 8     | 08_PUSH_AND_BROWSER_NOTIFICATIONS.md | SW push, browser notifications, social notifs | P1       | 2-3 days    | SW-4, NS-4, NS-5        |
| 9     | 09_CONTACT_AND_CROSS_FEATURE.md      | Contact integration, cross-feature UX         | P1       | 3-4 days    | PM-5, URT-6             |
| 10    | 10_POLISH_AND_STATE_SYNC.md          | Polish, accessibility, state sync, crypto     | P2       | 4-5 days    | PM-6, URT-4, SW-5, SW-6 |
| 11    | 11_FINAL_VERIFICATION.md             | Testing, audits, release preparation          | P0       | 2-3 days    | URT-5                   |

**Legend**: SW = background-service-worker, NS = notification-system, PM = unified-p2p-musig2-ui, URT = unified-remaining-tasks

**Total Estimated Effort**: 35-50 days

---

## Source Plan Mapping

### background-service-worker (7-9 days)

| Original Phase | Unified Phase | Notes                              |
| -------------- | ------------- | ---------------------------------- |
| Phase 1        | Phase 1       | Service Worker Foundation          |
| Phase 2        | Phase 3       | Network Monitor                    |
| Phase 3        | Phase 5       | Session Monitor (with MuSig2 core) |
| Phase 4        | Phase 8       | Push Notifications                 |
| Phase 5        | Phase 10      | State Synchronization              |
| Phase 6        | Phase 10      | Crypto Worker                      |

### notification-system (2-3 days)

| Original Phase | Unified Phase | Notes                  |
| -------------- | ------------- | ---------------------- |
| Phase 1        | Phase 1       | Settings Page          |
| Phase 2        | Phase 3       | Wallet Integration     |
| Phase 3        | Phase 6       | P2P/MuSig2 Integration |
| Phase 4        | Phase 8       | Browser Notifications  |
| Phase 5        | Phase 8       | Social Integration     |

### unified-p2p-musig2-ui (14-18 days)

| Original Phase | Unified Phase | Notes                              |
| -------------- | ------------- | ---------------------------------- |
| Phase 1        | Phase 2       | Foundation & Shared Infrastructure |
| Phase 2        | Phase 4       | P2P Core Integration               |
| Phase 3        | Phase 5       | MuSig2 Core Integration            |
| Phase 4        | Phase 6       | Unified Signing Flow               |
| Phase 5        | Phase 9       | Contact & Social Integration       |
| Phase 6        | Phase 10      | Polish & Accessibility             |

### unified-remaining-tasks (10-15 days)

| Original Phase | Unified Phase | Notes                     |
| -------------- | ------------- | ------------------------- |
| Phase 1        | Phase 7       | Explorer Detail Pages     |
| Phase 2        | Phase 7       | Social/RANK Voting        |
| Phase 3        | Phase 1       | Deprecate useUtils        |
| Phase 4        | Phase 10      | Polish & Accessibility    |
| Phase 5        | Phase 11      | Final Verification        |
| Phase 6        | Phase 9       | Cross-Feature Integration |

---

## Dependencies Graph

```
Phase 1 (Infrastructure)
    │
    ├──► Phase 2 (P2P/MuSig2 Foundation)
    │        │
    │        ├──► Phase 4 (P2P Core)
    │        │        │
    │        │        └──► Phase 5 (MuSig2 Core + Session)
    │        │                 │
    │        │                 └──► Phase 6 (Signing Flow + Notifications)
    │        │                          │
    │        │                          └──► Phase 9 (Contact + Cross-Feature)
    │        │
    │        └──► Phase 3 (Network + Wallet Notifications)
    │                 │
    │                 └──► Phase 8 (Push + Browser Notifications)
    │
    └──► Phase 7 (Explorer + Social) [Can run parallel to Phases 4-6]
             │
             └──► Phase 8 (Social Notifications)

Phase 9 + Phase 10 (Polish) ──► Phase 11 (Final Verification)
```

---

## Parallel Work Opportunities

The following phases can be worked on simultaneously by different developers:

### Stream A: P2P/MuSig2 Track

- Phase 2 → Phase 4 → Phase 5 → Phase 6 → Phase 9

### Stream B: Background Services Track

- Phase 1 → Phase 3 → Phase 8 → Phase 10

### Stream C: Explorer/Social Track (Independent)

- Phase 7 (can start after Phase 1, runs parallel to Stream A)

### Convergence Points

- **Phase 8**: Requires Phase 3 (wallet notifications) and Phase 6 (P2P/MuSig2 notifications)
- **Phase 9**: Requires Phase 6 (signing flow complete)
- **Phase 10**: Requires Phase 9 (cross-feature integration)
- **Phase 11**: Requires all other phases complete

---

## Success Criteria

### Infrastructure (Phases 1-2)

- [ ] Service worker registers and activates
- [ ] Notification settings page accessible
- [ ] useUtils.ts deleted with no remaining imports
- [ ] P2P/MuSig2 routes and shared components created

### Core Features (Phases 3-6)

- [ ] Background transaction detection works
- [ ] P2P connection and signer discovery functional
- [ ] Shared wallets can be created, funded, and spent from
- [ ] Signing requests flow end-to-end
- [ ] Notifications trigger for all key events

### Advanced Features (Phases 7-8)

- [ ] Explorer detail pages show full information
- [ ] Social/RANK voting works with confirmation
- [ ] Push notifications work in background
- [ ] Browser notifications respect user preferences

### Integration (Phases 9-10)

- [ ] Contacts integrate with P2P and shared wallets
- [ ] Cross-feature navigation is seamless
- [ ] Loading states and error handling complete
- [ ] Accessibility audit passes WCAG AA

### Verification (Phase 11)

- [ ] All functional tests pass
- [ ] No TypeScript or ESLint errors
- [ ] Lighthouse performance > 90
- [ ] Cross-browser testing complete

---

## Files Structure

```
docs/plans/unified-master-plan/
├── 00_OVERVIEW.md                        # This file
├── 01_INFRASTRUCTURE_FOUNDATION.md       # SW setup, notifications settings, useUtils
├── 02_P2P_MUSIG2_FOUNDATION.md           # Navigation, shared components, routes
├── 03_NETWORK_AND_WALLET_INTEGRATION.md  # Network monitor, wallet notifications
├── 04_P2P_CORE_INTEGRATION.md            # P2P page, signers, presence
├── 05_MUSIG2_CORE_AND_SESSION.md         # Shared wallets, session monitor
├── 06_SIGNING_FLOW_AND_NOTIFICATIONS.md  # Unified signing, P2P/MuSig2 notifications
├── 07_EXPLORER_AND_SOCIAL.md             # Explorer detail, Social/RANK voting
├── 08_PUSH_AND_BROWSER_NOTIFICATIONS.md  # SW push, browser notifications
├── 09_CONTACT_AND_CROSS_FEATURE.md       # Contact integration, cross-feature UX
├── 10_POLISH_AND_STATE_SYNC.md           # Polish, accessibility, state sync, crypto
├── 11_FINAL_VERIFICATION.md              # Testing, audits, release
└── STATUS.md                             # Progress tracking
```

---

## Superseded Plans

This unified plan supersedes and consolidates:

| Plan                      | Location                                | Status     |
| ------------------------- | --------------------------------------- | ---------- |
| background-service-worker | `docs/plans/background-service-worker/` | Superseded |
| notification-system       | `docs/plans/notification-system/`       | Superseded |
| unified-p2p-musig2-ui     | `docs/plans/unified-p2p-musig2-ui/`     | Superseded |
| unified-remaining-tasks   | `docs/plans/unified-remaining-tasks/`   | Superseded |

The original plans remain for detailed reference but this unified plan should be used for implementation tracking.

---

## Design Philosophy

This plan follows the architectural principles established in the analysis documents:

1. **Wallet-First Mentality** - Every address shows contact/wallet context
2. **Card-Based Layouts** - Consistent UI patterns across all features
3. **Mobile-First Design** - Touch-friendly, responsive layouts
4. **Cross-Feature Navigation** - Seamless movement between features
5. **Progressive Enhancement** - Core functionality works without advanced features

---

## Notes

- Service worker requires HTTPS in production (localhost exempt for dev)
- Safari has limited Push API support - graceful degradation required
- All P2P operations use the service layer, not direct SDK access
- Components follow the established design system patterns
- Testing should verify both functionality and UX

---

_Created: December 11, 2024_
_Status: Planning_
_Supersedes: background-service-worker, notification-system, unified-p2p-musig2-ui, unified-remaining-tasks_
