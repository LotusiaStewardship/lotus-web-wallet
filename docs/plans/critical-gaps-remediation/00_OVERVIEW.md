# Critical Gaps Remediation Plan

## Overview

This plan identifies and addresses critical functionality gaps discovered after completing all 11 phases of the Unified Master Plan. These gaps represent missing pieces that are essential for the P2P/MuSig2 system to function as designed, or that align with the core design philosophy established throughout the refactor.

**Created**: December 11, 2024
**Scope**: Missing critical functionality from unified master plan implementation
**Priority**: P0 (Critical Path)
**Estimated Effort**: 5-7 days

---

## Background

The Unified Master Plan successfully implemented:

- Service worker architecture and background operations
- Notification system integration
- P2P/MuSig2 UI components and flows
- Explorer and Social enhancements
- Cross-feature integration and polish

However, during post-implementation review, several critical gaps were identified that prevent the system from functioning as designed.

---

## Critical Gaps Identified

### Gap 1: Missing `/settings/advertise` Page (P0 - BLOCKER)

**Impact**: **P2P/MuSig2 is completely non-functional without this page.**

**Problem**: The `/settings/advertise` page does not exist, but is referenced throughout the codebase:

- `pages/settings/index.vue` links to it
- `components/p2p/SignerList.vue` empty state links to it
- `components/p2p/QuickActions.vue` emits `becomeSigner` event expecting navigation to it
- `components/p2p/SettingsPanel.vue` references it

**What Should Exist**: A page where users can:

- Enable/disable signer advertisement
- Configure transaction types they support (Spend, CoinJoin, Escrow, Swap)
- Set their fee structure
- Configure amount ranges
- Set their public nickname
- View their signer status

**Source**: `docs/analysis/P2P_UX_COMPREHENSIVE_ANALYSIS.md`, `docs/analysis/SETTINGS_UX_ANALYSIS.md`

---

### Gap 2: Missing `/settings/p2p` Page (P1)

**Impact**: Advanced P2P configuration is inaccessible.

**Problem**: The `/settings/p2p` page for advanced P2P configuration (DHT settings, GossipSub, NAT traversal) does not exist.

**What Should Exist**: A page with:

- Bootstrap peer configuration
- DHT settings
- GossipSub configuration
- NAT traversal options
- Connection limits

**Source**: `docs/analysis/SETTINGS_UX_ANALYSIS.md`

---

### Gap 3: Missing `/settings/restore` Page (P1)

**Impact**: Users cannot restore wallets from seed phrase.

**Problem**: The restore wallet functionality page does not exist. While backup exists, there's no corresponding restore flow.

**What Should Exist**: A page where users can:

- Enter a 12/24 word seed phrase
- Validate the seed phrase
- Restore wallet from seed
- See confirmation of successful restore

**Source**: `docs/analysis/COMPLETE_UX_GAP_ANALYSIS.md`

---

### Gap 4: Backup Verification Flow Incomplete (P1)

**Impact**: Users may not properly verify their backup.

**Problem**: The backup page shows the seed phrase but the verification step (asking users to confirm words) exists as a component (`components/settings/VerifyBackup.vue`) but may not be fully integrated.

**What Should Exist**:

- After viewing seed phrase, prompt user to verify
- Ask user to select/type specific words in order
- Mark wallet as "backed up" after verification
- Show reminder banner if not backed up

**Source**: `docs/analysis/COMPLETE_UX_GAP_ANALYSIS.md`

---

### Gap 5: Transaction History Export Missing (P2)

**Impact**: Users cannot export transaction history for records/taxes.

**Problem**: The history page has no export functionality despite being mentioned in plans.

**What Should Exist**:

- Export button on history page
- CSV, JSON, PDF format options
- Date range selection
- Include all transaction details

**Source**: `docs/analysis/COMPLETE_UX_GAP_ANALYSIS.md`, `docs/plans/.deprecated/ux-implementation/05_TRANSACTION_HISTORY.md`

---

### Gap 6: QR Code Scanning for Send (P2)

**Impact**: Users must manually enter addresses instead of scanning.

**Problem**: The send page has no QR code scanning capability. The `useQRCode` composable exists for generating QR codes but not for scanning.

**What Should Exist**:

- QR scanner button next to address input on send page
- Parse BIP21 payment URIs (lotus:address?amount=X)
- Auto-fill amount from payment request
- Camera permission handling

**Source**: `docs/analysis/COMPLETE_UX_GAP_ANALYSIS.md`

---

## Phase Summary

| Phase | Document                  | Focus Area                        | Priority | Est. Effort |
| ----- | ------------------------- | --------------------------------- | -------- | ----------- |
| 1     | 01_ADVERTISE_PAGE.md      | P2P signer advertisement settings | P0       | 1-2 days    |
| 2     | 02_P2P_SETTINGS.md        | Advanced P2P configuration        | P1       | 0.5 days    |
| 3     | 03_WALLET_RESTORE.md      | Seed phrase restore flow          | P1       | 1 day       |
| 4     | 04_BACKUP_VERIFICATION.md | Backup verification integration   | P1       | 0.5 days    |
| 5     | 05_HISTORY_EXPORT.md      | Transaction history export        | P2       | 0.5 days    |
| 6     | 06_QR_SCANNER.md          | QR code scanning for send         | P2       | 1-2 days    |

**Total Estimated Effort**: 5-7 days

---

## Dependencies

### Internal Dependencies

| Dependency           | Required For | Status   |
| -------------------- | ------------ | -------- |
| P2P Store            | Phase 1      | Complete |
| MuSig2 Store         | Phase 1      | Complete |
| Wallet Store         | Phase 3      | Complete |
| useQRCode composable | Phase 6      | Partial  |
| Notification Store   | All          | Complete |

### External Dependencies

| Dependency             | Required For | Status    |
| ---------------------- | ------------ | --------- |
| Camera API             | Phase 6      | Available |
| File System Access API | Phase 5      | Available |
| lotus-sdk P2P          | Phase 1, 2   | Available |

---

## Implementation Order

### Critical Path (Must Complete First)

1. **Phase 1: Advertise Page** (P0)
   - Without this, P2P/MuSig2 cannot function
   - Users cannot become signers
   - All "Become a Signer" CTAs lead to 404

### High Priority (Should Complete)

2. **Phase 3: Wallet Restore** (P1)

   - Core wallet functionality
   - Users cannot recover wallets

3. **Phase 4: Backup Verification** (P1)

   - Security-critical
   - Ensures users properly back up

4. **Phase 2: P2P Settings** (P1)
   - Advanced configuration
   - Can be minimal initially

### Medium Priority (Nice to Have)

5. **Phase 5: History Export** (P2)

   - User convenience
   - Tax/record keeping

6. **Phase 6: QR Scanner** (P2)
   - User convenience
   - Mobile-first experience

---

## Success Criteria

### Functional Requirements

- [ ] Users can navigate to `/settings/advertise` and configure signer settings
- [ ] Users can enable/disable signer advertisement
- [ ] Users can restore wallet from seed phrase
- [ ] Users can verify their backup with word selection
- [ ] Users can export transaction history
- [ ] Users can scan QR codes to fill send form

### Technical Requirements

- [ ] No 404 errors for settings pages
- [ ] All "Become a Signer" CTAs work
- [ ] P2P store correctly publishes signer advertisement
- [ ] Restore flow validates seed phrases
- [ ] Export generates valid CSV/JSON files
- [ ] QR scanner handles camera permissions gracefully

---

## Files Structure

```
docs/plans/critical-gaps-remediation/
├── 00_OVERVIEW.md                # This file
├── 01_ADVERTISE_PAGE.md          # P2P signer advertisement
├── 02_P2P_SETTINGS.md            # Advanced P2P configuration
├── 03_WALLET_RESTORE.md          # Seed phrase restore
├── 04_BACKUP_VERIFICATION.md     # Backup verification flow
├── 05_HISTORY_EXPORT.md          # Transaction export
├── 06_QR_SCANNER.md              # QR code scanning
└── STATUS.md                     # Progress tracking
```

---

## Design Philosophy Alignment

This plan follows the architectural principles established in the analysis documents:

1. **Wallet-First Mentality** - Restore and backup are core wallet functions
2. **Card-Based Layouts** - All new pages use consistent card patterns
3. **Mobile-First Design** - QR scanning is essential for mobile UX
4. **Cross-Feature Navigation** - Settings pages use contextual back navigation
5. **Progressive Enhancement** - Core functionality works, advanced features enhance

---

## Notes

- Phase 1 is a **hard blocker** for P2P/MuSig2 functionality
- All new settings pages should use `SettingsBackButton` component
- QR scanning requires HTTPS in production (camera access)
- Restore flow should warn about overwriting existing wallet
- Export should respect user's date/number format preferences

---

_Created: December 11, 2024_
_Status: Planning_
_Follows: unified-master-plan (completed)_
