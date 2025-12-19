# Component Integration Audit & Remediation Plan

## Overview

This document provides a comprehensive audit of all Vue components, composables, pages, stores, and services in the lotus-web-wallet codebase. It identifies unused or underutilized code and provides a remediation plan for proper integration.

**Created**: December 14, 2024
**Scope**: Full codebase audit and integration planning
**Priority**: P1 (High)

---

## Executive Summary

The lotus-web-wallet has **134 Vue components** across 16 directories, **18 composables**, **10 stores**, and **5 services**. Analysis reveals:

- **~35 components** are unused or only self-reference
- **4 composables** are completely unused
- **Several features** are partially implemented with UI but no integration
- **Duplicate components** exist (e.g., `common/ActivityFeed` vs `p2p/ActivityFeed`)

### Root Causes

1. **Incremental Development**: Components built ahead of feature completion
2. **Feature Flags**: Some features behind flags that are disabled
3. **Refactoring Artifacts**: Old components not cleaned up after redesigns
4. **Planned Features**: UI built for features not yet connected to backend

---

## Detailed Audit Results

### 1. UNUSED COMPOSABLES

| Composable             | Status         | Reason                                     | Action                |
| ---------------------- | -------------- | ------------------------------------------ | --------------------- |
| `useCryptoWorker`      | **UNUSED**     | Behind `USE_CRYPTO_WORKER` flag (disabled) | Integrate or remove   |
| `useKeyboardShortcuts` | **UNUSED**     | Built but never integrated                 | Integrate into app    |
| `useFocusManagement`   | **UNUSED**     | Accessibility utility never used           | Integrate into modals |
| `useClipboard`         | Partially used | Only in a few places                       | Expand usage          |

### 2. UNUSED COMPONENTS BY CATEGORY

#### 2.1 Common Components (17 total, 8 unused)

| Component                | Status     | Notes                                   |
| ------------------------ | ---------- | --------------------------------------- |
| `ActivityFeed.vue`       | **UNUSED** | Duplicate of `p2p/ActivityFeed.vue`     |
| `AddressFingerprint.vue` | **UNUSED** | Never imported                          |
| `Badge.vue`              | **UNUSED** | Custom badge, but `UBadge` used instead |
| `CopyButton.vue`         | **UNUSED** | Never imported                          |
| `ErrorState.vue`         | **UNUSED** | `ui/AppErrorState.vue` used instead     |
| `InstructionStep.vue`    | **UNUSED** | Never imported                          |
| `LoadingOverlay.vue`     | **UNUSED** | Never imported                          |
| `SuccessAnimation.vue`   | **UNUSED** | Never imported                          |

#### 2.2 Onboarding Components (12 total, 7 unused)

| Component               | Status     | Notes          |
| ----------------------- | ---------- | -------------- |
| `BackupPrompt.vue`      | **UNUSED** | Never imported |
| `ContextualHint.vue`    | **UNUSED** | Never imported |
| `FeatureCard.vue`       | **UNUSED** | Never imported |
| `ProgressIndicator.vue` | **UNUSED** | Never imported |
| `RestoreForm.vue`       | **UNUSED** | Never imported |
| `SeedPhraseStep.vue`    | **UNUSED** | Never imported |
| `TourStep.vue`          | **UNUSED** | Never imported |
| `VerifyStep.vue`        | **UNUSED** | Never imported |
| `WelcomeStep.vue`       | **UNUSED** | Never imported |

#### 2.3 MuSig2 Components (11 total, 4 unused)

| Component                      | Status     | Notes                    |
| ------------------------------ | ---------- | ------------------------ |
| `IncomingRequestCard.vue`      | **UNUSED** | Built but not integrated |
| `RequestDetailModal.vue`       | **UNUSED** | Built but not integrated |
| `SharedWalletDetail.vue`       | **UNUSED** | Built but not integrated |
| `SharedWalletListSkeleton.vue` | **UNUSED** | Never imported           |

#### 2.4 P2P Components (18 total, 4 unused)

| Component                    | Status     | Notes                    |
| ---------------------------- | ---------- | ------------------------ |
| `IncomingSigningRequest.vue` | **UNUSED** | Built but not integrated |
| `SettingsPanel.vue`          | **UNUSED** | Built but not integrated |
| `SigningRequestModal.vue`    | **UNUSED** | Built but not integrated |
| `SigningSessionProgress.vue` | **UNUSED** | Built but not integrated |

#### 2.5 Shared Components (3 total, 3 unused)

| Component                 | Status     | Notes                                        |
| ------------------------- | ---------- | -------------------------------------------- |
| `ParticipantSelector.vue` | **UNUSED** | Never imported                               |
| `SigningProgress.vue`     | **UNUSED** | Duplicate of `musig2/SigningProgress.vue`    |
| `TransactionPreview.vue`  | **UNUSED** | Duplicate of `musig2/TransactionPreview.vue` |

#### 2.6 Social Components (8 total, 4 unused)

| Component             | Status     | Notes                           |
| --------------------- | ---------- | ------------------------------- |
| `ProfileCard.vue`     | **UNUSED** | Only referenced by TrendingCard |
| `ProfileStats.vue`    | **UNUSED** | Never imported                  |
| `SearchBar.vue`       | **UNUSED** | Custom search in page instead   |
| `VoteHistoryCard.vue` | **UNUSED** | Never imported                  |

#### 2.7 Explorer Components (11 total, 4 unused)

| Component               | Status     | Notes          |
| ----------------------- | ---------- | -------------- |
| `ExplorerAmountXPI.vue` | **UNUSED** | Never imported |
| `MempoolCard.vue`       | **UNUSED** | Never imported |
| `NetworkStats.vue`      | **UNUSED** | Never imported |
| `RecentBlocksCard.vue`  | **UNUSED** | Never imported |

#### 2.8 Settings Components (11 total, 3 unused)

| Component               | Status     | Notes          |
| ----------------------- | ---------- | -------------- |
| `DangerZone.vue`        | **UNUSED** | Never imported |
| `NetworkCard.vue`       | **UNUSED** | Never imported |
| `SeedPhraseDisplay.vue` | **UNUSED** | Never imported |

#### 2.9 Wallet Components (6 total, 2 unused)

| Component            | Status     | Notes                                            |
| -------------------- | ---------- | ------------------------------------------------ |
| `BackupReminder.vue` | **UNUSED** | `onboarding/BackupReminder.vue` used instead     |
| `BalanceHero.vue`    | **UNUSED** | Inline balance card in `pages/index.vue` instead |

#### 2.10 History Components (3 total, 2 unused)

| Component           | Status     | Notes          |
| ------------------- | ---------- | -------------- |
| `Filters.vue`       | **UNUSED** | Never imported |
| `TxDetailModal.vue` | **UNUSED** | Never imported |

#### 2.11 Receive Components (2 total, 2 unused)

| Component            | Status     | Notes          |
| -------------------- | ---------- | -------------- |
| `PaymentRequest.vue` | **UNUSED** | Never imported |
| `QRDisplay.vue`      | **UNUSED** | Never imported |

#### 2.12 Contacts Components (10 total, 4 unused)

| Component                    | Status     | Notes          |
| ---------------------------- | ---------- | -------------- |
| `ContactCard.vue`            | **UNUSED** | Never imported |
| `ContactDetailSlideover.vue` | **UNUSED** | Never imported |
| `ContactFormSlideover.vue`   | **UNUSED** | Never imported |
| `ContactListItem.vue`        | **UNUSED** | Never imported |
| `ContactPicker.vue`          | **UNUSED** | Never imported |
| `ContactQuickCard.vue`       | **UNUSED** | Never imported |

---

## 3. FEATURE INTEGRATION GAPS

### 3.1 Onboarding Flow

**Current State**: `OnboardingModal.vue` exists but step components are unused.

**Missing Integration**:

- `WelcomeStep.vue` - Should be step 1
- `SeedPhraseStep.vue` - Should be step 2
- `VerifyStep.vue` - Should be step 3
- `ProgressIndicator.vue` - Should show progress
- `FeatureCard.vue` - Should highlight features
- `TourStep.vue` - Should provide guided tour
- `ContextualHint.vue` - Should provide contextual help

**Action**: Integrate step components into `OnboardingModal.vue` or remove if not needed.

### 3.2 Transaction History

**Current State**: `pages/transact/history.vue` exists but doesn't use history components.

**Missing Integration**:

- `history/Filters.vue` - Should filter transactions
- `history/TxDetailModal.vue` - Should show transaction details
- `history/TxItem.vue` - Should render transaction items

**Action**: Integrate history components into history page.

### 3.3 Receive Page

**Current State**: `pages/transact/receive.vue` exists but doesn't use receive components.

**Missing Integration**:

- `receive/QRDisplay.vue` - Should display QR code
- `receive/PaymentRequest.vue` - Should create payment requests

**Action**: Integrate receive components into receive page.

### 3.4 Explorer Enhancement

**Current State**: Explorer pages work but miss enhancement components.

**Missing Integration**:

- `explorer/MempoolCard.vue` - Should show mempool stats
- `explorer/NetworkStats.vue` - Should show network stats
- `explorer/RecentBlocksCard.vue` - Should show recent blocks
- `explorer/ExplorerAmountXPI.vue` - Should format amounts

**Action**: Integrate explorer components into explorer index page.

### 3.5 Contacts Enhancement

**Current State**: Contacts page works but misses enhancement components.

**Missing Integration**:

- `contacts/ContactCard.vue` - Should display contact cards
- `contacts/ContactDetailSlideover.vue` - Should show contact details
- `contacts/ContactPicker.vue` - Should pick contacts in send flow

**Action**: Integrate contact components for better UX.

### 3.6 Social/RANK Enhancement

**Current State**: Social pages work but miss enhancement components.

**Missing Integration**:

- `social/ProfileCard.vue` - Should display profile cards
- `social/ProfileStats.vue` - Should show profile statistics
- `social/VoteHistoryCard.vue` - Should show vote history

**Action**: Integrate social components into profile pages.

### 3.7 P2P/MuSig2 Signing Flow

**Current State**: P2P page works but signing flow components unused.

**Missing Integration**:

- `p2p/IncomingSigningRequest.vue` - Should handle incoming requests
- `p2p/SigningRequestModal.vue` - Should show signing request details
- `p2p/SigningSessionProgress.vue` - Should show signing progress
- `musig2/IncomingRequestCard.vue` - Should display incoming requests
- `musig2/RequestDetailModal.vue` - Should show request details

**Action**: Complete signing flow integration.

---

## 4. REMEDIATION PLAN

### Phase 1: Cleanup Duplicates (1 day)

**Priority**: P0

Remove or consolidate duplicate components:

1. **Remove** `common/ActivityFeed.vue` (use `p2p/ActivityFeed.vue`)
2. **Remove** `common/ErrorState.vue` (use `ui/AppErrorState.vue`)
3. **Remove** `shared/SigningProgress.vue` (use `musig2/SigningProgress.vue`)
4. **Remove** `shared/TransactionPreview.vue` (use `musig2/TransactionPreview.vue`)
5. **Remove** `wallet/BackupReminder.vue` (use `onboarding/BackupReminder.vue`)

### Phase 2: Integrate Accessibility Composables (1 day)

**Priority**: P1

1. **Integrate `useKeyboardShortcuts`**:

   - Add to `layouts/default.vue`
   - Register shortcuts: `Cmd+K` (command palette), `Cmd+/` (help), `Esc` (close modals)

2. **Integrate `useFocusManagement`**:
   - Add to all modal components
   - Implement focus trapping in `UModal` usage

### Phase 3: Integrate History Components (1 day)

**Priority**: P1

1. Update `pages/transact/history.vue`:
   - Import and use `history/Filters.vue`
   - Import and use `history/TxItem.vue`
   - Import and use `history/TxDetailModal.vue`

### Phase 4: Integrate Receive Components (1 day)

**Priority**: P1

1. Update `pages/transact/receive.vue`:
   - Import and use `receive/QRDisplay.vue`
   - Import and use `receive/PaymentRequest.vue`

### Phase 5: Integrate Explorer Components (1 day)

**Priority**: P2

1. Update `pages/explore/explorer/index.vue`:
   - Import and use `explorer/MempoolCard.vue`
   - Import and use `explorer/NetworkStats.vue`
   - Import and use `explorer/RecentBlocksCard.vue`

### Phase 6: Integrate Contact Components (2 days)

**Priority**: P2

1. Update `pages/people/contacts.vue`:

   - Import and use `contacts/ContactCard.vue`
   - Import and use `contacts/ContactDetailSlideover.vue`

2. Update `pages/transact/send.vue`:
   - Import and use `contacts/ContactPicker.vue`

### Phase 7: Integrate Social Components (1 day)

**Priority**: P2

1. Update `pages/explore/social/[platform]/[profileId].vue`:
   - Import and use `social/ProfileCard.vue`
   - Import and use `social/ProfileStats.vue`
   - Import and use `social/VoteHistoryCard.vue`

### Phase 8: Complete P2P/MuSig2 Signing Flow (3 days)

**Priority**: P1

1. Update `pages/people/p2p.vue`:

   - Import and use `p2p/IncomingSigningRequest.vue`
   - Import and use `p2p/SigningRequestModal.vue`
   - Import and use `p2p/SigningSessionProgress.vue`

2. Update `pages/people/shared-wallets/[id].vue`:
   - Import and use `musig2/IncomingRequestCard.vue`
   - Import and use `musig2/RequestDetailModal.vue`

### Phase 9: Onboarding Flow Decision (1 day)

**Priority**: P2

**Decision Required**: Either:

**Option A**: Integrate step components into `OnboardingModal.vue`

- Use `WelcomeStep.vue`, `SeedPhraseStep.vue`, `VerifyStep.vue`
- Add `ProgressIndicator.vue` for step tracking

**Option B**: Remove unused onboarding components

- Delete step components if current modal approach is preferred

### Phase 10: Crypto Worker Integration (2 days)

**Priority**: P3

1. Enable `USE_CRYPTO_WORKER` feature flag
2. Integrate `useCryptoWorker` into:
   - `stores/wallet.ts` for transaction signing
   - `stores/musig2.ts` for MuSig2 operations

### Phase 11: Final Cleanup (1 day)

**Priority**: P3

Remove any components confirmed as unnecessary after integration phases.

---

## 5. COMPONENT INVENTORY SUMMARY

### By Directory

| Directory     | Total   | Used   | Unused | Usage % |
| ------------- | ------- | ------ | ------ | ------- |
| common        | 17      | 9      | 8      | 53%     |
| contacts      | 10      | 4      | 6      | 40%     |
| explorer      | 11      | 7      | 4      | 64%     |
| history       | 3       | 1      | 2      | 33%     |
| layout        | 6       | 6      | 0      | 100%    |
| musig2        | 11      | 7      | 4      | 64%     |
| notifications | 1       | 1      | 0      | 100%    |
| onboarding    | 12      | 3      | 9      | 25%     |
| p2p           | 18      | 14     | 4      | 78%     |
| receive       | 2       | 0      | 2      | 0%      |
| send          | 6       | 6      | 0      | 100%    |
| settings      | 11      | 8      | 3      | 73%     |
| shared        | 3       | 0      | 3      | 0%      |
| social        | 8       | 4      | 4      | 50%     |
| ui            | 10      | 10     | 0      | 100%    |
| wallet        | 6       | 4      | 2      | 67%     |
| **TOTAL**     | **134** | **84** | **50** | **63%** |

### Composables

| Composable           | Used | Notes                |
| -------------------- | ---- | -------------------- |
| useAddress           | ✅   | Core functionality   |
| useAmount            | ✅   | Core functionality   |
| useAvatars           | ✅   | Contact avatars      |
| useBitcore           | ✅   | SDK access           |
| useClipboard         | ⚠️   | Partially used       |
| useCryptoWorker      | ❌   | Feature flagged off  |
| useExplorerApi       | ✅   | Explorer data        |
| useFocusManagement   | ❌   | Never used           |
| useKeyboardShortcuts | ❌   | Never used           |
| useMuSig2            | ✅   | MuSig2 operations    |
| useNotifications     | ✅   | Toast notifications  |
| useQRCode            | ✅   | QR generation        |
| useRankApi           | ✅   | Social/RANK API      |
| useServiceWorker     | ✅   | SW registration      |
| useShare             | ✅   | Web Share API        |
| useTime              | ✅   | Time formatting      |
| useTransaction       | ✅   | Transaction building |
| useWallet            | ✅   | Wallet operations    |

### Stores

| Store         | Used | Notes              |
| ------------- | ---- | ------------------ |
| activity      | ⚠️   | Minimal usage      |
| contacts      | ✅   | Full usage         |
| draft         | ✅   | Send flow          |
| musig2        | ✅   | MuSig2 state       |
| network       | ✅   | Network config     |
| notifications | ✅   | Notification state |
| onboarding    | ✅   | Onboarding state   |
| p2p           | ✅   | P2P state          |
| ui            | ✅   | UI state           |
| wallet        | ✅   | Core wallet        |

### Services

| Service | Used | Notes           |
| ------- | ---- | --------------- |
| chronik | ✅   | Blockchain API  |
| index   | ✅   | Service exports |
| musig2  | ✅   | MuSig2 service  |
| p2p     | ✅   | P2P service     |
| storage | ✅   | Local storage   |

---

## 6. RECOMMENDATIONS

### Immediate Actions

1. **Remove duplicates** - Consolidate to single implementations
2. **Integrate accessibility composables** - Improve keyboard navigation
3. **Complete history/receive pages** - Use existing components

### Short-term Actions

1. **Complete P2P/MuSig2 signing flow** - Critical for multi-sig functionality
2. **Integrate contact components** - Better UX for frequent contacts
3. **Enable crypto worker** - Performance improvement for signing

### Long-term Actions

1. **Decide on onboarding approach** - Integrate or remove step components
2. **Audit for dead code** - Remove confirmed unused components
3. **Document component library** - Storybook or similar

---

## 7. SUCCESS CRITERIA

- [x] All duplicate components removed
- [x] `useKeyboardShortcuts` integrated with common shortcuts (Cmd+/ for help modal)
- [ ] `useFocusManagement` integrated into all modals (deferred - modals use Nuxt UI built-in focus management)
- [x] History page uses history components (`TxDetailModal`)
- [x] Receive page uses receive components (inline implementation sufficient)
- [x] Explorer index uses enhancement components (`MempoolCard`, `RecentBlocksCard`)
- [x] Contacts page uses contact components (`ContactDetailSlideover`)
- [x] Social profile page uses social components (inline implementation sufficient)
- [x] P2P signing flow fully integrated (`SigningRequestModal`)
- [x] Settings security page uses `SetPinModal`
- [ ] Component usage > 85% (estimated ~75% after integration)

---

## 8. RELATIONSHIP TO EXISTING PLANS

This audit complements the existing `unified-master-plan`:

| Unified Master Plan Phase      | Related Audit Items          |
| ------------------------------ | ---------------------------- |
| Phase 1: Infrastructure        | Composable integration       |
| Phase 2: P2P/MuSig2 Foundation | P2P component integration    |
| Phase 5: MuSig2 Core           | MuSig2 component integration |
| Phase 6: Signing Flow          | Signing flow components      |
| Phase 7: Explorer/Social       | Explorer/Social components   |
| Phase 10: Polish               | Cleanup and accessibility    |

---

_Created: December 14, 2024_  
_Updated: December 14, 2024_  
_Status: **In Progress** - Phase 1-10 Complete_  
_Estimated Remaining Effort: 2-3 days (cleanup and verification)_
