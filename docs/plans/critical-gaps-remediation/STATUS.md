# Critical Gaps Remediation - Status Tracker

> Tracking document for critical gaps identified after unified master plan completion.
> Last Updated: December 11, 2024 (Phase 2 Complete)

---

## Overview

This plan addresses critical functionality gaps discovered during post-implementation review of the Unified Master Plan. These gaps prevent core features from functioning as designed.

---

## Phase Status Summary

| Phase | Document                  | Focus Area                        | Priority | Status         | Progress |
| ----- | ------------------------- | --------------------------------- | -------- | -------------- | -------- |
| 1     | 01_ADVERTISE_PAGE.md      | P2P signer advertisement settings | P0       | ✅ Complete    | 100%     |
| 2     | 02_P2P_SETTINGS.md        | Advanced P2P configuration        | P1       | ✅ Complete    | 100%     |
| 3     | 03_WALLET_RESTORE.md      | Seed phrase restore flow          | P1       | 🔲 Not Started | 0%       |
| 4     | 04_BACKUP_VERIFICATION.md | Backup verification integration   | P1       | 🔲 Not Started | 0%       |
| 5     | 05_HISTORY_EXPORT.md      | Transaction history export        | P2       | 🔲 Not Started | 0%       |
| 6     | 06_QR_SCANNER.md          | QR code scanning for send         | P2       | 🔲 Not Started | 0%       |

**Legend**: 🔲 Not Started | 🟡 In Progress | ✅ Complete | ⏸️ Blocked

---

## Phase 1: Advertise Page

### Status: ✅ Complete

### Tasks

- [x] Create `pages/settings/advertise.vue`
- [x] Add signer enable/disable toggle
- [x] Add transaction type selection
- [x] Add fee configuration
- [x] Add amount range configuration
- [x] Add nickname field
- [x] Integrate with MuSig2 store (uses existing `advertiseSigner`/`withdrawSigner` methods)
- [x] MuSig2 store already has signer advertisement methods
- [x] MuSig2 store already has signer withdrawal methods
- [x] Update QuickActions handler in P2P page
- [x] All "Become a Signer" CTAs now navigate to `/settings/advertise`

---

## Phase 2: P2P Settings

### Status: ✅ Complete

### Tasks

- [x] Create `pages/settings/p2p.vue`
- [x] Add auto-connect toggle
- [x] Add max connections setting
- [x] Add DHT enable/disable
- [x] Add GossipSub enable/disable
- [x] Add bootstrap peer management
- [x] Add link to settings index
- [x] Persist settings via P2P store (using `services/storage.ts` pattern)
- [x] Add `P2PSettings` interface and store actions (`loadSettings`, `saveSettings`, `updateSettings`, `resetSettings`)
- [x] Add connection status display
- [x] Add reconnect button to apply changes immediately

---

## Phase 3: Wallet Restore

### Status: 🔲 Not Started

### Tasks

- [ ] Create `pages/settings/restore.vue`
- [ ] Add warning step
- [ ] Add seed phrase input
- [ ] Add validation (12/24 words)
- [ ] Add confirmation step
- [ ] Add `initializeFromMnemonic` to wallet store
- [ ] Add success state
- [ ] Add link to settings index

---

## Phase 4: Backup Verification

### Status: 🔲 Not Started

### Tasks

- [ ] Verify `VerifyBackup.vue` component works
- [ ] Integrate verification into backup page
- [ ] Add verification status tracking
- [ ] Add "Verify Now" button
- [ ] Create `BackupReminder.vue` banner
- [ ] Persist verification status

---

## Phase 5: History Export

### Status: 🔲 Not Started

### Tasks

- [ ] Create `useExport` composable
- [ ] Add export button to history page
- [ ] Add export modal with options
- [ ] Implement CSV export
- [ ] Implement JSON export
- [ ] Add date range filtering
- [ ] Add custom date range

---

## Phase 6: QR Scanner

### Status: 🔲 Not Started

### Tasks

- [ ] Create `useQRScanner` composable
- [ ] Create `QRScanner.vue` component
- [ ] Add scan button to send page
- [ ] Implement camera access
- [ ] Implement QR code detection
- [ ] Parse BIP21 URIs
- [ ] Handle permission denied
- [ ] Fill form with scanned data

---

## Blockers

| Phase | Blocker | Impact | Resolution |
| ----- | ------- | ------ | ---------- |
| 1     | None    | -      | -          |

---

## Dependencies

### Phase Dependencies

```
Phase 1 (Advertise) ─── No dependencies, can start immediately
    │
    └──► Unblocks P2P/MuSig2 functionality

Phase 2 (P2P Settings) ─── No dependencies
Phase 3 (Restore) ─── No dependencies
Phase 4 (Backup Verification) ─── Depends on existing VerifyBackup component
Phase 5 (History Export) ─── No dependencies
Phase 6 (QR Scanner) ─── Requires QR library installation
```

---

## Estimated Timeline

| Phase   | Effort   | Cumulative   |
| ------- | -------- | ------------ |
| Phase 1 | 1-2 days | 1-2 days     |
| Phase 2 | 0.5 days | 1.5-2.5 days |
| Phase 3 | 1 day    | 2.5-3.5 days |
| Phase 4 | 0.5 days | 3-4 days     |
| Phase 5 | 0.5 days | 3.5-4.5 days |
| Phase 6 | 1-2 days | 4.5-6.5 days |

**Total Estimated Effort**: 5-7 days

---

## Change Log

| Date       | Phase | Change                                          |
| ---------- | ----- | ----------------------------------------------- |
| 2024-12-11 | -     | Created critical gaps remediation plan          |
| 2024-12-11 | -     | Identified 6 critical gaps from analysis review |
| 2024-12-11 | -     | Created all phase documents                     |
| 2024-12-11 | -     | Created STATUS.md                               |
| 2024-12-11 | 1     | Completed Phase 1: Advertise Page               |
| 2024-12-11 | 2     | Completed Phase 2: P2P Settings Page            |

---

## Notes

- Phase 1 is a **hard blocker** for P2P/MuSig2 functionality
- All phases can be worked on independently except Phase 4 (depends on existing component)
- QR Scanner (Phase 6) requires installing a QR code library
- All new settings pages should use `SettingsBackButton` component

---

_This document should be updated as each phase progresses._
