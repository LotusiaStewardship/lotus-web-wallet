# Unified Contact-Centric Refactor - Status Tracker

**Last Updated**: December 18, 2025  
**Overall Status**: 🟡 In Progress - Phase 6 Complete

---

## Progress Overview

| Phase | Name                         | Status      | Progress | Est. Duration |
| ----- | ---------------------------- | ----------- | -------- | ------------- |
| 1     | Foundation                   | ✅ Complete | 100%     | 1-2 weeks     |
| 2     | BIP44 Multi-Address          | ✅ Complete | 100%     | 2-3 weeks     |
| 3     | P2P Infrastructure           | ✅ Complete | 100%     | 1-2 weeks     |
| 4     | Contact System Refactor      | ✅ Complete | 100%     | 1-2 weeks     |
| 5     | MuSig2 Integration (N-of-N)  | ✅ Complete | 100%     | 1-2 weeks     |
| 6     | UI/UX Restructure            | ✅ Complete | 100%     | 2-3 weeks     |
| 7     | Polish & Release             | Not Started | 0%       | 1-2 weeks     |
| 8     | Remaining Issues & Bug Fixes | Not Started | 0%       | 1-2 weeks     |

**Total Estimated Duration**: 11-16 weeks

---

## Phase 1: Foundation

**Status**: ✅ Complete  
**Document**: [01_PHASE_FOUNDATION.md](./01_PHASE_FOUNDATION.md)  
**Completed**: December 18, 2025

| Task                         | Priority | Status      | Notes                                                                                     |
| ---------------------------- | -------- | ----------- | ----------------------------------------------------------------------------------------- |
| Create `types/identity.ts`   | P0       | ✅ Complete | Identity, IdentitySignerCapabilities, IdentityLevel, IdentityInput, IdentityUpdate        |
| Create `types/accounts.ts`   | P0       | ✅ Complete | AccountPurpose, AccountConfig, DerivedAddress, AccountState, BIP44 constants              |
| Create `utils/identity.ts`   | P0       | ✅ Complete | isValidPublicKey, deriveAddressFromPublicKey, createIdentity, getIdentityLevel, + helpers |
| Create `stores/identity.ts`  | P0       | ✅ Complete | Identity store with CRUD, persistence, presence tracking                                  |
| Update `services/storage.ts` | P0       | ✅ Complete | Added IDENTITIES, DISCOVERY_CACHE, MIGRATION_VERSION keys                                 |
| Update `types/index.ts`      | P0       | ✅ Complete | Export new identity and accounts types                                                    |

**Files Created**:

- [x] `types/identity.ts` - Unified identity types with IdentitySignerCapabilities (renamed to avoid MuSig2 conflict)
- [x] `types/accounts.ts` - BIP44 account types with path builders
- [x] `utils/identity.ts` - 12 utility functions for identity operations
- [x] `stores/identity.ts` - Full Pinia store with persistence

**Files Modified**:

- [x] `services/storage.ts` - Added 3 new storage keys
- [x] `types/index.ts` - Added exports for new types

---

## Phase 2: BIP44 Multi-Address

**Status**: ✅ Complete  
**Document**: [02_PHASE_BIP44.md](./02_PHASE_BIP44.md)  
**Completed**: December 18, 2025

| Task                                    | Priority | Status      | Notes                                                    |
| --------------------------------------- | -------- | ----------- | -------------------------------------------------------- |
| Add multi-account state to wallet store | P0       | ✅ Complete | `accounts`, `accountUtxos`, `_accountKeys` Maps added    |
| Refactor `buildWalletFromMnemonic()`    | P0       | ✅ Complete | Derives keys for PRIMARY and MUSIG2 accounts             |
| Add account-aware getters               | P0       | ✅ Complete | 8 new getters: getPrivateKeyHex, getPublicKeyHex, etc.   |
| Update crypto worker                    | P0       | ✅ Complete | accountIndex, addressIndex, isChange params added        |
| Implement storage migration             | P0       | ⏭️ Deferred | Not needed - clean implementation without legacy support |
| Update Chronik subscriptions            | P0       | ✅ Complete | subscribeToMultipleScripts, subscribeToAllAccounts       |

**Files Modified**:

- [x] `stores/wallet.ts` - Multi-account state, \_deriveAccountKeys, account-aware getters
- [x] `workers/crypto.worker.ts` - Account-aware derivation with BIP44 path params
- [x] `types/crypto-worker.ts` - DeriveKeysRequest/Response with account params
- [x] `composables/useCryptoWorker.ts` - deriveKeys with account parameters
- [x] `services/chronik.ts` - ChronikSubscription, subscribeToMultipleScripts

---

## Phase 3: P2P Infrastructure

**Status**: ✅ Complete (Wallet-side)  
**Document**: [03_PHASE_P2P.md](./03_PHASE_P2P.md)  
**Completed**: December 18, 2025

| Task                                 | Priority | Status      | Notes                                                       |
| ------------------------------------ | -------- | ----------- | ----------------------------------------------------------- |
| Create P2P initialization plugin     | P0       | ✅ Complete | `plugins/p2p.client.ts` - auto-connects on startup          |
| Add P2P settings to settings store   | P0       | ✅ Complete | Already existed in `stores/p2p.ts` with full implementation |
| Create discovery cache service       | P0       | ✅ Complete | `services/discovery-cache.ts` - LocalStorage-backed cache   |
| Inject cache into MuSig2 store       | P0       | ✅ Complete | `_updateDiscoveryCache`, `_restoreCachedSigners` in store   |
| Fix signer deduplication             | P0       | ✅ Complete | `_handleSignerDiscovered` deduplicates by publicKey         |
| Add expired signer cleanup           | P0       | ✅ Complete | `_cleanupExpiredSigners`, periodic interval                 |
| SDK: Add DiscoveryCache interface    | P0       | ✅ Complete | `IDiscoveryCache` interface added to SDK                    |
| SDK: Deterministic advertisement IDs | P0       | ✅ Complete | `generateSignerAdId()` now deterministic                    |

**Files Created**:

- [x] `plugins/p2p.client.ts` - P2P auto-connect plugin
- [x] `services/discovery-cache.ts` - LocalStorage-backed discovery cache

**Files Modified**:

- [x] `stores/musig2.ts` - Signer deduplication, cache integration, expiry cleanup

**SDK Changes Completed**:

All SDK changes have been implemented in `lotus-sdk`:

- [x] `lib/p2p/discovery/types.ts` - Added `IDiscoveryCache`, `DiscoveryCacheEntry`, `InMemoryDiscoveryCache`
- [x] `lib/p2p/discovery/dht-discoverer.ts` - Constructor accepts optional `externalCache` parameter
- [x] `lib/p2p/musig2/discovery-extension.ts` - Deterministic IDs, passes cache to discoverer
- [x] `lib/p2p/musig2/coordinator.ts` - Constructor accepts `discoveryCache` parameter
- [x] `lib/p2p/discovery/index.ts` - Exports new cache types and updated factory functions

**Wallet Integration Completed**:

The wallet now passes the `SDKDiscoveryCacheAdapter` to the `MuSig2P2PCoordinator`:

- [x] `services/discovery-cache.ts` - Added `SDKDiscoveryCacheAdapter` class that implements `IDiscoveryCache`
- [x] `services/discovery-cache.ts` - Added `getSDKCacheAdapter()` function to get the adapter singleton
- [x] `services/musig2.ts` - Updated `initializeMuSig2()` to pass the cache adapter to the coordinator

**How It Works**:

1. On MuSig2 initialization, the wallet creates an `SDKDiscoveryCacheAdapter` wrapping the `LocalStorageDiscoveryCache`
2. This adapter is passed to `MuSig2P2PCoordinator` as the 5th constructor parameter
3. The SDK's `DHTDiscoverer` uses this cache for persistence
4. Discovered signers are automatically persisted to localStorage and restored on page reload

---

## Phase 4: Contact System Refactor

**Status**: ✅ Complete  
**Document**: [04_PHASE_CONTACTS.md](./04_PHASE_CONTACTS.md)  
**Completed**: December 18, 2025

| Task                                 | Priority | Status      | Notes                                                               |
| ------------------------------------ | -------- | ----------- | ------------------------------------------------------------------- |
| Update Contact type with identityId  | P0       | ✅ Complete | Added `identityId` field, `ContactWithIdentity`, `OnlineStatus`     |
| Update `addContact()`                | P0       | ✅ Complete | Creates identity, derives address from publicKey                    |
| Implement `addFromSigner()`          | P0       | ✅ Complete | Auto-derives address, checks for existing contacts                  |
| Implement multi-signal online status | P0       | ✅ Complete | `getOnlineStatusForContact()`, `contactsWithIdentity` getter        |
| Add lookup functions                 | P0       | ✅ Complete | `findByAddress`, `findByPublicKey`, `findByPeerId` (identity-aware) |

**Files Modified**:

- [x] `types/contact.ts` - Added `identityId`, `ContactWithIdentity`, `OnlineStatus`, activity tracking fields
- [x] `types/index.ts` - Export new `OnlineStatus` and `ContactWithIdentity` types
- [x] `stores/contacts.ts` - Identity integration, address derivation, multi-signal online status

**Key Changes**:

1. **Contact-Identity Linking**: Contacts now have optional `identityId` field linking to Identity store
2. **Address Derivation**: `addContact()` automatically derives address from publicKey via Identity store
3. **Multi-Signal Online Status**: `getOnlineStatusForContact()` checks:
   - Direct P2P connection
   - Identity presence state
   - Recent lastSeenAt timestamp
4. **Enhanced Lookup**: `findByPublicKey()` and `findByPeerId()` check both `identityId` and legacy fields
5. **Signer Integration**: `addFromSigner()` creates contacts from discovered signers with derived addresses
6. **ContactWithIdentity**: New computed getter provides contacts with resolved identity data

---

## Phase 5: MuSig2 Integration (N-of-N)

**Status**: ✅ Complete  
**Document**: [05_PHASE_MUSIG2.md](./05_PHASE_MUSIG2.md)  
**Completed**: December 18, 2025

> **Note**: MuSig2 is always n-of-n (all participants must sign). Supports 2-of-2, 3-of-3, 5-of-5, 10-of-10, etc.

| Task                                                   | Priority | Status      | Notes                                                     |
| ------------------------------------------------------ | -------- | ----------- | --------------------------------------------------------- |
| Implement n-of-n key aggregation in createSharedWallet | P0       | ✅ Complete | Uses createMuSigTaprootAddress from SDK                   |
| Use MuSig2 account key                                 | P0       | ✅ Complete | Gets key from AccountPurpose.MUSIG2 account               |
| Update CreateSharedWalletModal                         | P0       | ✅ Complete | 3-step wizard, multi-contact selection, n-of-n preview    |
| Enable offline wallet viewing                          | P0       | ✅ Complete | canView always true, canSpend requires P2P + all online   |
| Fix participant online status                          | P0       | ✅ Complete | Multi-signal: P2P, identity presence, recent activity     |
| Require all n online to spend                          | P0       | ✅ Complete | spendDisabledReason shows offline participant names       |
| Update signer advertisement                            | P0       | ✅ Complete | Uses MuSig2 public key via \_publishSignerAdvertisement   |
| Update signing operations                              | P0       | ✅ Complete | getMuSig2SigningKey, getMuSig2PrivateKey helper functions |

**Files Modified**:

- [x] `stores/musig2.ts` - Key aggregation via createMuSigTaprootAddress, MuSig2 account key usage
- [x] `services/musig2.ts` - MuSig2 key for signing/advertising, helper functions
- [x] `components/musig2/CreateSharedWalletModal.vue` - 3-step wizard, participantPublicKeys, n-of-n display
- [x] `pages/people/shared-wallets/[id].vue` - Offline viewing, canSpend with n-of-n check
- [x] `components/shared-wallets/ParticipantList.vue` - Multi-signal status detection

**Key Changes**:

1. **Key Aggregation**: `createSharedWallet()` now uses `createMuSigTaprootAddress()` from SDK to compute Taproot MuSig2 addresses
2. **Key Isolation**: All MuSig2 operations use `AccountPurpose.MUSIG2` key, isolated from primary spending key
3. **Offline Viewing**: Wallet details always viewable; spending requires P2P + all participants online
4. **Multi-Signal Status**: Participant status checks P2P connection, identity presence, and recent activity
5. **N-of-N Enforcement**: Spend button disabled with helpful message showing which participants are offline

---

## Phase 6: UI/UX Restructure

**Status**: ✅ Complete  
**Document**: [06_PHASE_UI.md](./06_PHASE_UI.md)  
**Completed**: December 18, 2025

| Task                                 | Priority | Status      | Notes                                                    |
| ------------------------------------ | -------- | ----------- | -------------------------------------------------------- |
| Create AddressDisplay component      | P0       | ✅ Complete | Contact-aware display with copy/add-to-contacts actions  |
| Create AccountSelector component     | P1       | ✅ Complete | Dropdown for PRIMARY/MUSIG2 account selection            |
| Create AccountBadge component        | P1       | ✅ Complete | Visual badge with icons and colors per account type      |
| Update ContactCard component         | P0       | ✅ Complete | Multi-signal online status, MuSig2 badge, shared wallets |
| Update navigation structure          | P0       | ✅ Complete | "People" already elevated in existing navigation         |
| Add loading skeletons                | P0       | ✅ Complete | Skeleton states in AvailableSigners, progress banner     |
| Fix tab navigation defaults          | P0       | ✅ Complete | Proper defaults, URL update only on user interaction     |
| Update transaction history           | P0       | ✅ Complete | TxItem uses AddressDisplay for contact integration       |
| Create `useDismissible()` composable | P0       | ✅ Complete | Full composable with registry and settings integration   |
| Create dismissible UI components     | P0       | ✅ Complete | DismissibleBanner, FeatureIntro, FirstTimeTooltip        |
| Add feature introductions            | P0       | ✅ Complete | Components ready for use in Shared Wallets, P2P, etc.    |
| Create terminology utility           | P1       | ✅ Complete | formatTechnicalTerm, formatTechnicalMessage helpers      |
| Add dismissed prompts settings       | P1       | ✅ Complete | Settings page shows dismissed prompts with reset option  |

**Files Created**:

- [x] `components/common/AddressDisplay.vue` - Contact-aware address display
- [x] `components/wallet/AccountSelector.vue` - Account selection dropdown
- [x] `components/wallet/AccountBadge.vue` - Account type badge
- [x] `composables/useDismissible.ts` - Dismissible UI composable with registry
- [x] `components/common/DismissibleBanner.vue` - Dismissible banner component
- [x] `components/common/FeatureIntro.vue` - Feature introduction modal
- [x] `components/common/FirstTimeTooltip.vue` - First-time tooltip component
- [x] `utils/terminology.ts` - User-friendly terminology translations

**Files Modified**:

- [x] `components/contacts/ContactCard.vue` - Multi-signal status, MuSig2 badge, shared wallets, activity stats
- [x] `components/shared-wallets/AvailableSigners.vue` - Skeleton loading, progress banner, improved empty state
- [x] `pages/people/shared-wallets/index.vue` - Proper tab defaults, URL update on user interaction only
- [x] `components/history/TxItem.vue` - Contact integration via AddressDisplay
- [x] `pages/settings/index.vue` - Dismissed prompts management section

**Key Changes**:

1. **Contact-Aware Displays**: AddressDisplay shows contact name/avatar when address matches a contact
2. **Multi-Signal Online Status**: ContactCard uses identity presence, P2P connection, and recent activity
3. **Relationship Indicators**: MuSig2 badge, shared wallet count, favorite star visible at a glance
4. **Loading Skeletons**: AvailableSigners shows skeleton cards during initial discovery
5. **Dismissible UI Pattern**: All educational UI can be dismissed with "Don't show again"
6. **Settings Integration**: Dismissed prompts can be re-enabled from Settings page
7. **User-Friendly Terms**: Terminology utility translates technical jargon

---

## Phase 7: Polish & Release

**Status**: Not Started  
**Document**: [07_PHASE_POLISH.md](./07_PHASE_POLISH.md)

| Task                           | Priority | Status      | Notes                            |
| ------------------------------ | -------- | ----------- | -------------------------------- |
| Write unit tests               | P0       | Not Started | Identity store, utilities        |
| Write n-of-n integration tests | P0       | Not Started | 2-of-2, 3-of-3, 5-of-5, 10-of-10 |
| Write E2E tests                | P0       | Not Started | Full n-of-n signing flow         |
| Update documentation           | P1       | Not Started | README, architecture docs        |
| Performance optimization       | P1       | Not Started | Lazy derivation, caching         |
| Final QA                       | P0       | Not Started | Full regression testing          |
| Verify UX checklist compliance | P0       | Not Started | All features pass UX checklist   |

---

## Phase 8: Remaining Issues & Bug Fixes

**Status**: Not Started  
**Document**: [08_PHASE_REMAINING_ISSUES.md](./08_PHASE_REMAINING_ISSUES.md)

> **Note**: This phase addresses issues identified in `TODO.md` that were not fully covered by Phases 1-7.

| Task                                           | Priority | Status      | Notes                                     |
| ---------------------------------------------- | -------- | ----------- | ----------------------------------------- |
| 8.1 Chronik WS subscription filtering          | P0       | Not Started | Only subscribe to receivable addresses    |
| 8.2 Contact state persistence in shared wallet | P0       | Not Started | Fix persistence bug in participants tab   |
| 8.3 Network-aware address derivation           | P1       | Not Started | Livenet vs testnet UX                     |
| 8.4 WebRTC integration for online status       | P2       | Not Started | Accurate reachability detection           |
| 8.5 Main wallet address in P2P advertisements  | P0       | Not Started | Include PRIMARY address in advertisements |

---

## Issue Mapping

| Issue                                      | Phase | Priority | Status                                            |
| ------------------------------------------ | ----- | -------- | ------------------------------------------------- |
| Fragmented identity model                  | 1, 4  | HIGH     | ✅ Complete (Phase 1 + Phase 4)                   |
| Single address for all operations          | 2     | HIGH     | ✅ Complete (Phase 2)                             |
| Auto-connect not working                   | 3     | HIGH     | ✅ Complete (Phase 3)                             |
| Signers lost on refresh                    | 3     | HIGH     | ✅ Complete (Phase 3 - discovery cache)           |
| Shared wallet "Address pending"            | 5     | HIGH     | ✅ Complete (Phase 5 - createMuSigTaprootAddress) |
| Contacts from signers have empty addresses | 4     | HIGH     | ✅ Complete (Phase 4 - addFromSigner)             |
| N-of-N participant coordination            | 5     | HIGH     | ✅ Complete (Phase 5 - n-of-n canSpend check)     |
| Duplicate signer entries                   | 3     | MEDIUM   | ✅ Complete (Phase 3 - publicKey dedup)           |
| Participants show offline incorrectly      | 4, 5  | MEDIUM   | ✅ Complete (Phase 5 - multi-signal status)       |
| Wallet-centric navigation                  | 6     | MEDIUM   | ✅ Complete (People section elevated)             |
| No progressive disclosure                  | 6     | MEDIUM   | ✅ Complete (dismissible UI, feature intros)      |
| Chronik subscribes to MuSig2 keys          | 8     | HIGH     | ⬜ Pending (Phase 8 - subscription filtering)     |
| Contact persistence in shared wallet       | 8     | HIGH     | ⬜ Pending (Phase 8 - persistence bug fix)        |
| Network-aware address derivation           | 8     | MEDIUM   | ⬜ Pending (Phase 8 - livenet/testnet UX)         |
| Main address missing from P2P ads          | 8     | HIGH     | ⬜ Pending (Phase 8 - advertisement format)       |

---

## SDK Changes Required

| File                                    | Change                        | Phase | Status   |
| --------------------------------------- | ----------------------------- | ----- | -------- |
| `lib/p2p/discovery/types.ts`            | Add DiscoveryCache interface  | 3     | Complete |
| `lib/p2p/discovery/dht-discoverer.ts`   | Use cache interface           | 3     | Complete |
| `lib/p2p/musig2/discovery-extension.ts` | Deterministic IDs, pass cache | 3     | Complete |
| `lib/p2p/musig2/coordinator.ts`         | Accept cache in constructor   | 3     | Complete |

**SDK Changes Completed (December 18, 2025)**:

- Added `IDiscoveryCache` and `DiscoveryCacheEntry` interfaces to `types.ts`
- Added `InMemoryDiscoveryCache` default implementation
- Updated `DHTDiscoverer` constructor to accept optional `externalCache` parameter
- Updated `MuSig2Discovery` constructor to accept and pass cache to discoverer
- Updated `MuSig2P2PCoordinator` constructor to accept `discoveryCache` parameter
- Made `generateSignerAdId()` deterministic (removed `Date.now()` from hash)
- Exported new cache types from `discovery/index.ts`

---

## Timeline Summary

```
Week 1-2:   Phase 1 (Foundation)
Week 3-5:   Phase 2 (BIP44 Multi-Address)
Week 5-6:   Phase 3 (P2P Infrastructure)
Week 6-7:   Phase 4 (Contact System Refactor)
Week 7-8:   Phase 5 (MuSig2 Integration)
Week 9-11:  Phase 6 (UI/UX Restructure)
Week 11-12: Phase 7 (Polish & Migration)
Week 12-14: Phase 8 (Remaining Issues & Bug Fixes)
```

---

## Legend

| Symbol | Meaning      |
| ------ | ------------ |
| ⬜     | Not Started  |
| 🟡     | In Progress  |
| ✅     | Completed    |
| ❌     | Blocked      |
| 🔄     | Needs Review |

---

## Notes

- SDK changes should be made first in Phase 3 to unblock wallet-side work
- Phase 1 must be completed before Phases 2, 4, and 5 can begin
- Phase 2 must be completed before Phase 5 (MuSig2 key isolation)
- Phase 4 should be completed before Phase 6 (UI needs contact-identity linking)
- All phases must be completed before Phase 7 (final polish)
- **No backward compatibility required** - clean implementation without legacy support
- **MuSig2 is always n-of-n** - all participants must sign (not m-of-n like FROST)

---

## Related Documents

### This Plan

- [00_OVERVIEW.md](./00_OVERVIEW.md) - Comprehensive plan overview
- [01_PHASE_FOUNDATION.md](./01_PHASE_FOUNDATION.md) - Phase 1 details
- [02_PHASE_BIP44.md](./02_PHASE_BIP44.md) - Phase 2 details
- [03_PHASE_P2P.md](./03_PHASE_P2P.md) - Phase 3 details
- [04_PHASE_CONTACTS.md](./04_PHASE_CONTACTS.md) - Phase 4 details
- [05_PHASE_MUSIG2.md](./05_PHASE_MUSIG2.md) - Phase 5 details
- [06_PHASE_UI.md](./06_PHASE_UI.md) - Phase 6 details
- [07_PHASE_POLISH.md](./07_PHASE_POLISH.md) - Phase 7 details
- [08_PHASE_REMAINING_ISSUES.md](./08_PHASE_REMAINING_ISSUES.md) - Phase 8 details

### Superseded Plans

- `docs/plans/bip44-multi-address/` - Original BIP44 plan
- `docs/plans/p2p-contact-integration/` - Original P2P/Contact plan

### Design Philosophy

- `docs/architecture/design/` - Contact-centric design documents

---

_Created: December 18, 2025_  
_Status: Planning Complete - Ready for Implementation_
