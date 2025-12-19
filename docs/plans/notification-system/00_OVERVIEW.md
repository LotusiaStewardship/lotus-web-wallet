# Notification System Implementation Plan

## Overview

This plan completes the notification system integration for the lotus-web-wallet. While the core notification infrastructure exists (store, composable, UI component), it is **not integrated** with the rest of the application. This plan addresses that gap.

**Created**: December 11, 2024
**Scope**: Notification system integration, settings page, browser notifications
**Priority**: P2 (Medium)
**Estimated Effort**: 2-3 days

---

## Current State

### What Exists

| Component                                  | Status   | Notes                                  |
| ------------------------------------------ | -------- | -------------------------------------- |
| `stores/notifications.ts`                  | Complete | Full CRUD, preferences, persistence    |
| `composables/useNotifications.ts`          | Complete | Toast-based ephemeral notifications    |
| `components/layout/NotificationCenter.vue` | Complete | Dropdown UI with grouped notifications |
| Integration in `NavbarActions.vue`         | Complete | Bell icon with unread badge            |

### What's Missing

| Component                          | Status  | Notes                                    |
| ---------------------------------- | ------- | ---------------------------------------- |
| `pages/settings/notifications.vue` | Missing | Preferences page not created             |
| Wallet store integration           | Missing | No notifications for incoming txs        |
| MuSig2 store integration           | Missing | No notifications for signing requests    |
| P2P store integration              | Missing | No notifications for peer events         |
| Browser notification support       | Missing | Permission request, native notifications |
| Social notification integration    | Missing | No notifications for RANK activity       |

---

## Phase Summary

| Phase | Document                     | Focus Area                    | Priority | Est. Effort |
| ----- | ---------------------------- | ----------------------------- | -------- | ----------- |
| 1     | 01_SETTINGS_PAGE.md          | Notification preferences page | P1       | 0.5 days    |
| 2     | 02_WALLET_INTEGRATION.md     | Transaction notifications     | P1       | 0.5 days    |
| 3     | 03_P2P_MUSIG2_INTEGRATION.md | P2P and MuSig2 notifications  | P2       | 0.5 days    |
| 4     | 04_BROWSER_NOTIFICATIONS.md  | Native browser notifications  | P3       | 0.5 days    |
| 5     | 05_SOCIAL_INTEGRATION.md     | RANK voting notifications     | P3       | 0.5 days    |

**Total Estimated Effort**: 2-3 days

---

## Dependencies

### Internal Dependencies

| Dependency                | Required For | Status   |
| ------------------------- | ------------ | -------- |
| `stores/notifications.ts` | All phases   | Complete |
| `stores/wallet.ts`        | Phase 2      | Complete |
| `stores/musig2.ts`        | Phase 3      | Complete |
| `stores/p2p.ts`           | Phase 3      | Partial  |
| Chronik WebSocket         | Phase 2      | Complete |

### External Dependencies

| Dependency               | Required For | Status    |
| ------------------------ | ------------ | --------- |
| Browser Notification API | Phase 4      | Available |
| RANK API                 | Phase 5      | Available |

---

## Relationship to Other Plans

```
┌─────────────────────────────────────┐
│     lotus-web-wallet Plans          │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │  unified-p2p-musig2-ui      │    │
│  │  (P2P + MuSig2 UI)          │    │
│  │  - Uses Phase 3 of this     │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  unified-remaining-tasks    │    │
│  │  (Explorer, Social, Polish) │    │
│  │  - Uses Phase 5 of this     │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  notification-system        │◄───┼── THIS PLAN
│  │  (Notification Integration) │    │
│  │  - 5 phases                 │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

## Implementation Order

### Recommended Sequence

1. **Phase 1: Settings Page** (P1)

   - Quick win, provides user control
   - No dependencies on other phases

2. **Phase 2: Wallet Integration** (P1)

   - High user value (incoming transaction alerts)
   - Uses existing Chronik WebSocket

3. **Phase 3: P2P/MuSig2 Integration** (P2)

   - Should be done alongside unified-p2p-musig2-ui plan
   - Signing request notifications are critical

4. **Phase 4: Browser Notifications** (P3)

   - Nice-to-have for background alerts
   - Requires user permission

5. **Phase 5: Social Integration** (P3)
   - Lower priority
   - Should be done alongside unified-remaining-tasks Phase 2

---

## Success Criteria

### Functional Requirements

- [ ] Notification settings page accessible from Settings
- [ ] Users can enable/disable notification types
- [ ] Incoming transactions trigger persistent notifications
- [ ] Signing requests trigger persistent notifications
- [ ] Peer connection events trigger notifications (optional)
- [ ] Browser notifications work when app is in background
- [ ] Notifications link to relevant pages when clicked

### Technical Requirements

- [ ] No TypeScript errors
- [ ] Notification store used consistently across all stores
- [ ] Browser notification permission handled gracefully
- [ ] Notifications persist across page refreshes

---

## Files Structure

```
docs/plans/notification-system/
├── 00_OVERVIEW.md                    # This file
├── 01_SETTINGS_PAGE.md               # Notification preferences page
├── 02_WALLET_INTEGRATION.md          # Transaction notifications
├── 03_P2P_MUSIG2_INTEGRATION.md      # P2P and MuSig2 notifications
├── 04_BROWSER_NOTIFICATIONS.md       # Native browser notifications
├── 05_SOCIAL_INTEGRATION.md          # RANK voting notifications
└── STATUS.md                         # Progress tracking
```

---

## Notes

- This plan focuses on **integration** of the existing notification infrastructure
- The notification store and UI components are already complete
- Phase 3 should be coordinated with the `unified-p2p-musig2-ui` plan
- Phase 5 should be coordinated with the `unified-remaining-tasks` Phase 2 (Social/RANK)

---

_Created: December 11, 2024_
