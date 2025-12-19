# Responsibility Consolidation Remediation Plan

**Created**: December 2024  
**Status**: Planning  
**Scope**: Full-stack refactor with UI/UX completeness  
**Estimated Effort**: 8-10 days (expanded to include UI consolidation)

---

## Overview

This remediation plan addresses the structural issues identified in `docs/analysis/responsibility-consolidation/`. The plan is **UI/UX complete**, meaning every backend change includes corresponding frontend updates to prevent creating additional technical debt.

---

## Goals

1. **Eliminate private state leakage** - No store accesses another store's `_` prefixed properties
2. **Consolidate identity data** - Single source of truth for entity information
3. **Create clean API boundaries** - Stores expose public methods, not internal state
4. **Update all affected UI** - Every component using affected stores is updated
5. **Consolidate duplicate UI components** - Eliminate redundant components for streamlined UX
6. **Standardize UX patterns** - Consistent visual treatment across the application
7. **Maintain backwards compatibility** - Existing functionality continues to work

---

## Affected Components Summary

### Stores (6)

- `wallet.ts` - Add public API for transaction context
- `draft.ts` - Use wallet public API
- `identity.ts` - Become canonical source for entity data
- `contacts.ts` - Simplify to relationship metadata
- `p2p.ts` - Update identity store on peer events
- `musig2.ts` - Reference identity store for signer data

### Components (35)

See `02_COMPONENT_MIGRATION.md` for complete list

### Pages (11)

See `02_COMPONENT_MIGRATION.md` for complete list

### Composables (4)

- `useMuSig2.ts` - Simplify to thin wrapper
- `useAddress.ts` - Consolidate address utilities
- `useContactContext.ts` - New facade composable
- `useSharedWalletContext.ts` - New facade composable

---

## Phase Structure

| Phase | Name                       | Focus                             | Duration |
| ----- | -------------------------- | --------------------------------- | -------- |
| 1     | Wallet API                 | Fix private state leakage         | 0.5 days |
| 2     | Identity Consolidation     | Unify entity data                 | 1.5 days |
| 3     | Facade Composables         | Create clean component interfaces | 1 day    |
| 4     | Component Migration        | Update all affected UI            | 2 days   |
| 5     | UI Component Consolidation | Merge duplicate components        | 2 days   |
| 6     | UX Pattern Standardization | Consistent visual patterns        | 1 day    |
| 7     | Cleanup & Testing          | Remove deprecated code, verify    | 1 day    |

---

## Phase 1: Wallet API (0.5 days)

**Goal**: Eliminate `draft.ts` → `wallet.ts` private state access

### Backend Changes

1. **wallet.ts**: Add public methods

   - `getTransactionBuildContext()` - Returns script, addressType, etc.
   - `isReadyForSigning()` - Boolean check
   - `signTransactionHex(tx)` - Sign and return hex
   - `getScriptHex()` - Get script as hex string

2. **draft.ts**: Replace all `walletStore._*` access with public API

### UI Changes

None - this is internal refactoring only.

### Verification

- [ ] Send transaction (P2PKH)
- [ ] Send transaction (P2TR)
- [ ] Send max
- [ ] Multi-recipient send
- [ ] Coin control

---

## Phase 2: Identity Consolidation (1.5 days)

**Goal**: Make `identity.ts` the single source of truth for entity data

### Backend Changes

1. **identity.ts**: Add methods

   - `getOnlineStatus(publicKeyHex)` - Multi-signal online detection
   - `updateFromPeerConnection(peerId, multiaddrs)` - P2P updates
   - `markOfflineByPeerId(peerId)` - P2P disconnection
   - `updateFromSignerDiscovery(signer)` - MuSig2 updates

2. **p2p.ts**: Update identity on peer events

   - `_handlePeerConnected` → call `identityStore.updateFromPeerConnection`
   - `_handlePeerDisconnected` → call `identityStore.markOfflineByPeerId`

3. **musig2.ts**: Update identity on signer discovery

   - `_handleSignerDiscovered` → call `identityStore.updateFromSignerDiscovery`

4. **contacts.ts**: Simplify
   - Remove complex `getOnlineStatusForContact()` logic
   - Delegate to `identityStore.getOnlineStatus()`
   - Add migration for legacy contacts without `identityId`

### UI Changes

Components that display online status must be updated:

| Component                    | Current               | After                             |
| ---------------------------- | --------------------- | --------------------------------- |
| `ContactCard.vue`            | Multiple store checks | `identityStore.getOnlineStatus()` |
| `ContactDetailSlideover.vue` | Multiple store checks | `identityStore.getOnlineStatus()` |
| `SignerCard.vue`             | `signer.isOnline`     | `identityStore.getOnlineStatus()` |
| `SignerList.vue`             | `signer.isOnline`     | `identityStore.getOnlineStatus()` |
| `ParticipantList.vue`        | Multiple store checks | `identityStore.getOnlineStatus()` |

### Verification

- [ ] Contact shows correct online status
- [ ] Signer shows correct online status
- [ ] Shared wallet participant shows correct online status
- [ ] Status updates when peer connects/disconnects
- [ ] Legacy contacts are migrated on app load

---

## Phase 3: Facade Composables (1 day)

**Goal**: Create clean interfaces for complex multi-store operations

### New Composables

1. **useContactContext(contactId)**

   ```typescript
   interface ContactContext {
     contact: Contact | null
     identity: Identity | null
     onlineStatus: OnlineStatus
     sharedWallets: SharedWallet[]
     transactionHistory: TransactionHistoryItem[]
     canMuSig2: boolean
     // Actions
     send: () => void
     edit: () => void
     delete: () => void
     createSharedWallet: () => void
   }
   ```

2. **useSharedWalletContext(walletId)**

   ```typescript
   interface SharedWalletContext {
     wallet: SharedWallet | null
     participants: ParticipantWithIdentity[]
     sessions: WalletSigningSession[]
     balance: WalletBalance
     // Actions
     proposeSpend: (params) => Promise<void>
     refreshBalance: () => Promise<void>
     delete: () => void
   }
   ```

3. **useSignerContext()**
   ```typescript
   interface SignerContext {
     discoveredSigners: SignerWithIdentity[]
     isAdvertising: boolean
     myConfig: SignerConfig | null
     // Actions
     advertise: (config) => Promise<void>
     withdraw: () => Promise<void>
     refresh: () => Promise<void>
   }
   ```

### UI Changes

Components will import facade composables instead of multiple stores:

**Before**:

```typescript
const contactsStore = useContactsStore()
const walletStore = useWalletStore()
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
```

**After**:

```typescript
const { contact, identity, onlineStatus, sharedWallets } =
  useContactContext(contactId)
```

---

## Phase 4: Component Migration (2 days)

**Goal**: Update all 35 components and 11 pages to use new APIs

See `02_COMPONENT_MIGRATION.md` for detailed component-by-component changes.

### Priority Order

1. **Critical Path** (Day 1 AM)

   - `ContactCard.vue`
   - `ContactDetailSlideover.vue`
   - `SignerCard.vue`
   - `SignerList.vue`

2. **Shared Wallets** (Day 1 PM)

   - `CreateSharedWalletModal.vue`
   - `ProposeSpendModal.vue`
   - `ParticipantList.vue`
   - `AvailableSigners.vue`

3. **P2P Components** (Day 2 AM)

   - `NetworkStatus.vue`
   - `PresenceToggle.vue`
   - `SigningSessionProgress.vue`
   - `RequestList.vue`

4. **Remaining Components** (Day 2 PM)
   - All other affected components
   - All affected pages

---

## Phase 5: Cleanup & Testing (1 day)

**Goal**: Remove deprecated code and verify everything works

### Cleanup Tasks

1. Remove deprecated fields from `Contact` interface
2. Remove legacy online status logic from `contacts.ts`
3. Remove duplicate address utilities
4. Clean up `useMuSig2.ts` legacy stubs

### Testing Checklist

See `03_TESTING_CHECKLIST.md` for complete verification steps.

---

## Risk Mitigation

### Data Migration

Legacy contacts without `identityId` will be migrated on app load:

- Contacts with `publicKey` → Create identity, set `identityId`
- Contacts with `peerId` only → Keep legacy fields until identity discovered
- Contacts with neither → No migration needed (address-only contacts)

### Rollback Strategy

Each phase can be rolled back independently:

- Phase 1: Revert wallet.ts and draft.ts
- Phase 2: Revert identity.ts, p2p.ts, musig2.ts, contacts.ts
- Phase 3: Delete new composables
- Phase 4: Revert component changes
- Phase 5: N/A (cleanup only)

### Feature Flags

Consider adding feature flags for gradual rollout:

```typescript
const USE_IDENTITY_CONSOLIDATION = true
const USE_FACADE_COMPOSABLES = true
```

---

## Success Criteria

1. **No private state access** - `grep "Store\(\)\._"` returns no results
2. **Single source of truth** - All online status queries go through identity store
3. **Clean component imports** - Components import ≤2 stores or 1 facade composable
4. **All tests pass** - Existing functionality preserved
5. **No console warnings** - No deprecation warnings in production

---

## Document Index

| Document                      | Description                            |
| ----------------------------- | -------------------------------------- |
| `00_MASTER_PLAN.md`           | This document - overview and phases    |
| `01_PHASE_DETAILS.md`         | Detailed implementation for each phase |
| `02_COMPONENT_MIGRATION.md`   | Component-by-component changes         |
| `03_TESTING_CHECKLIST.md`     | Verification steps                     |
| `04_API_REFERENCE.md`         | New public APIs                        |
| `05_UI_UX_IMPACT_ANALYSIS.md` | User-facing changes                    |
| `06_EXECUTION_TIMELINE.md`    | Day-by-day breakdown                   |
| `07_UI_CONSOLIDATION.md`      | UI component consolidation (NEW)       |

---

## Related Analysis

- `docs/analysis/responsibility-consolidation/` - Backend responsibility analysis
- `docs/analysis/ui-ux-consolidation/` - UI/UX consolidation analysis
