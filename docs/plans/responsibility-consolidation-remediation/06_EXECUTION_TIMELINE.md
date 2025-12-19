# Execution Timeline

Day-by-day breakdown of the remediation work.

**Updated**: December 2024 - Expanded to include UI consolidation phases

---

## Prerequisites

Before starting:

- [ ] Review all plan documents
- [ ] Review UI/UX consolidation analysis (`docs/analysis/ui-ux-consolidation/`)
- [ ] Ensure test environment is working
- [ ] Create feature branch: `refactor/responsibility-consolidation`

---

## Day 1: Foundation (Phases 1 & 2a)

### Morning: Phase 1 - Wallet API

**Duration**: 2-3 hours

| Task                             | File               | Est. Time |
| -------------------------------- | ------------------ | --------- |
| Add TransactionBuildContext type | `stores/wallet.ts` | 10 min    |
| Add getTransactionBuildContext() | `stores/wallet.ts` | 15 min    |
| Add isReadyForSigning()          | `stores/wallet.ts` | 10 min    |
| Add signTransactionHex()         | `stores/wallet.ts` | 15 min    |
| Add getScriptHex()               | `stores/wallet.ts` | 5 min     |
| Add getInternalPubKeyString()    | `stores/wallet.ts` | 5 min     |
| Add getMerkleRootHex()           | `stores/wallet.ts` | 5 min     |
| Update draft.ts \_buildContext() | `stores/draft.ts`  | 20 min    |
| Update draft.ts send()           | `stores/draft.ts`  | 30 min    |
| Test transaction sending         | -                  | 30 min    |

**Checkpoint**: All transaction types work (P2PKH, P2TR, send max, multi-recipient)

### Afternoon: Phase 2a - Identity Store Enhancement

**Duration**: 3-4 hours

| Task                            | File                 | Est. Time |
| ------------------------------- | -------------------- | --------- |
| Add OnlineStatus type           | `stores/identity.ts` | 5 min     |
| Add getOnlineStatus()           | `stores/identity.ts` | 20 min    |
| Add updateFromPeerConnection()  | `stores/identity.ts` | 15 min    |
| Add markOfflineByPeerId()       | `stores/identity.ts` | 10 min    |
| Add updateFromSignerDiscovery() | `stores/identity.ts` | 20 min    |
| Add batchUpdatePresence()       | `stores/identity.ts` | 15 min    |
| Export new methods              | `stores/identity.ts` | 5 min     |
| Test identity store             | -                    | 30 min    |

**Checkpoint**: Identity store has all new methods, unit tests pass

---

## Day 2: Integration (Phases 2b & 2c)

### Morning: Phase 2b - Store Integration

**Duration**: 3-4 hours

| Task                             | File               | Est. Time |
| -------------------------------- | ------------------ | --------- |
| Update peer connected handler    | `stores/p2p.ts`    | 30 min    |
| Update peer disconnected handler | `stores/p2p.ts`    | 20 min    |
| Update signer discovery handler  | `stores/musig2.ts` | 30 min    |
| Test P2P → Identity updates      | -                  | 30 min    |
| Test MuSig2 → Identity updates   | -                  | 30 min    |

**Checkpoint**: Identity store updates when peers connect/disconnect and signers discovered

### Afternoon: Phase 2c - Contacts Simplification

**Duration**: 3-4 hours

| Task                                 | File                 | Est. Time |
| ------------------------------------ | -------------------- | --------- |
| Simplify getOnlineStatusForContact() | `stores/contacts.ts` | 20 min    |
| Add migrateContactsToIdentity()      | `stores/contacts.ts` | 40 min    |
| Call migration on initialize()       | `stores/contacts.ts` | 10 min    |
| Test migration with legacy data      | -                    | 30 min    |
| Test online status display           | -                    | 30 min    |

**Checkpoint**: Legacy contacts migrated, online status works through identity store

---

## Day 3: Facade Composables (Phase 3)

### Morning: Create Composables

**Duration**: 4 hours

| Task                          | File                                    | Est. Time |
| ----------------------------- | --------------------------------------- | --------- |
| Create useContactContext      | `composables/useContactContext.ts`      | 60 min    |
| Create useSharedWalletContext | `composables/useSharedWalletContext.ts` | 60 min    |
| Create useSignerContext       | `composables/useSignerContext.ts`       | 45 min    |
| Test composables              | -                                       | 45 min    |

**Checkpoint**: All facade composables work correctly

### Afternoon: Create Shared Components

**Duration**: 2 hours

| Task                     | File                                      | Est. Time |
| ------------------------ | ----------------------------------------- | --------- |
| Create OnlineStatusBadge | `components/common/OnlineStatusBadge.vue` | 30 min    |
| Test OnlineStatusBadge   | -                                         | 15 min    |
| Document composables     | `04_API_REFERENCE.md`                     | 30 min    |

**Checkpoint**: Shared components ready for use

---

## Day 4: Component Migration (Phase 4a)

### Morning: Critical Path Components

**Duration**: 4 hours

| Task                           | File                                             | Est. Time |
| ------------------------------ | ------------------------------------------------ | --------- |
| Migrate ContactCard            | `components/contacts/ContactCard.vue`            | 45 min    |
| Migrate ContactDetailSlideover | `components/contacts/ContactDetailSlideover.vue` | 45 min    |
| Migrate SignerCard             | `components/common/SignerCard.vue`               | 30 min    |
| Migrate SignerList             | `components/p2p/SignerList.vue`                  | 30 min    |
| Test contact components        | -                                                | 30 min    |

**Checkpoint**: Contact and signer cards display correctly

### Afternoon: Shared Wallet Components

**Duration**: 4 hours

| Task                            | File                                             | Est. Time |
| ------------------------------- | ------------------------------------------------ | --------- |
| Migrate CreateSharedWalletModal | `components/musig2/CreateSharedWalletModal.vue`  | 45 min    |
| Migrate ProposeSpendModal       | `components/musig2/ProposeSpendModal.vue`        | 45 min    |
| Migrate ParticipantList         | `components/shared-wallets/ParticipantList.vue`  | 30 min    |
| Migrate AvailableSigners        | `components/shared-wallets/AvailableSigners.vue` | 30 min    |
| Test shared wallet flow         | -                                                | 30 min    |

**Checkpoint**: Shared wallet creation and spending work

---

## Day 5: Component Migration (Phase 4b)

### Morning: P2P & Remaining Components

**Duration**: 4 hours

| Task                         | File                                             | Est. Time |
| ---------------------------- | ------------------------------------------------ | --------- |
| Migrate NetworkStatus (p2p)  | `components/p2p/NetworkStatus.vue`               | 20 min    |
| Migrate PresenceToggle       | `components/p2p/PresenceToggle.vue`              | 20 min    |
| Migrate NetworkStatusBar     | `components/shared-wallets/NetworkStatusBar.vue` | 20 min    |
| Migrate PendingRequests      | `components/shared-wallets/PendingRequests.vue`  | 20 min    |
| Migrate SignerModePanel      | `components/shared-wallets/SignerModePanel.vue`  | 20 min    |
| Migrate remaining components | Various                                          | 60 min    |
| Test P2P features            | -                                                | 30 min    |

**Checkpoint**: All P2P components work correctly

### Afternoon: Pages

**Duration**: 3 hours

| Task                                 | File                                    | Est. Time |
| ------------------------------------ | --------------------------------------- | --------- |
| Migrate /people/p2p                  | `pages/people/p2p.vue`                  | 30 min    |
| Migrate /people/shared-wallets/index | `pages/people/shared-wallets/index.vue` | 20 min    |
| Migrate /people/shared-wallets/[id]  | `pages/people/shared-wallets/[id].vue`  | 45 min    |
| Migrate /settings/advertise          | `pages/settings/advertise.vue`          | 30 min    |
| Test all pages                       | -                                       | 45 min    |

**Checkpoint**: All pages work correctly

---

## Day 6: Cleanup & Testing (Phase 5)

### Morning: Cleanup

**Duration**: 3 hours

| Task                               | File                       | Est. Time |
| ---------------------------------- | -------------------------- | --------- |
| Add deprecation comments           | `types/contact.ts`         | 15 min    |
| Remove legacy stubs from useMuSig2 | `composables/useMuSig2.ts` | 20 min    |
| Consolidate address utilities      | Various                    | 45 min    |
| Verify no private access           | -                          | 15 min    |
| Remove unused imports              | Various                    | 30 min    |

**Checkpoint**: No deprecation warnings, no private access

### Afternoon: Testing

**Duration**: 4 hours

| Task                          | Est. Time |
| ----------------------------- | --------- |
| Run through testing checklist | 120 min   |
| Fix any issues found          | 60 min    |
| Browser compatibility testing | 30 min    |
| Final review                  | 30 min    |

**Checkpoint**: All tests pass, ready for review

---

## Day 7: UI Component Consolidation - Part 1 (Phase 5a)

### Morning: High-Priority Consolidations

**Duration**: 4 hours

| Task                                                    | File                                      | Est. Time |
| ------------------------------------------------------- | ----------------------------------------- | --------- |
| Enhance AddressDisplay with explorer features           | `components/common/AddressDisplay.vue`    | 45 min    |
| Update explorer components to use common AddressDisplay | Various                                   | 30 min    |
| Delete explorer/AddressDisplay.vue                      | -                                         | 5 min     |
| Enhance SignerDetailModal with action slot              | `components/common/SignerDetailModal.vue` | 45 min    |
| Update P2P and shared-wallets to use common modal       | Various                                   | 30 min    |
| Delete duplicate SignerDetailModals                     | -                                         | 5 min     |
| Test consolidated components                            | -                                         | 60 min    |

**Checkpoint**: AddressDisplay and SignerDetailModal consolidated

### Afternoon: TxItem Consolidation

**Duration**: 4 hours

| Task                                       | File                                      | Est. Time |
| ------------------------------------------ | ----------------------------------------- | --------- |
| Create useTransactionNormalizer composable | `composables/useTransactionNormalizer.ts` | 45 min    |
| Create unified TxItem component            | `components/common/TxItem.vue`            | 90 min    |
| Update wallet dashboard                    | `pages/index.vue`                         | 20 min    |
| Update history page                        | `pages/transact/history.vue`              | 20 min    |
| Update explorer                            | Various                                   | 20 min    |
| Delete old TxItem components               | -                                         | 5 min     |
| Test all transaction displays              | -                                         | 30 min    |

**Checkpoint**: TxItem consolidated with all variants working

---

## Day 8: UI Component Consolidation - Part 2 (Phase 5b)

### Morning: NetworkStatus & ActivityFeed

**Duration**: 4 hours

| Task                                     | File                                  | Est. Time |
| ---------------------------------------- | ------------------------------------- | --------- |
| Create unified NetworkStatus             | `components/common/NetworkStatus.vue` | 60 min    |
| Update wallet, P2P, shared-wallets pages | Various                               | 45 min    |
| Delete old NetworkStatus components      | -                                     | 5 min     |
| Enhance ActivityFeed with events prop    | `components/common/ActivityFeed.vue`  | 30 min    |
| Update P2P to use common ActivityFeed    | Various                               | 20 min    |
| Delete p2p/ActivityFeed.vue              | -                                     | 5 min     |
| Test consolidated components             | -                                     | 45 min    |

**Checkpoint**: NetworkStatus and ActivityFeed consolidated

### Afternoon: New Utility Components

**Duration**: 3 hours

| Task                                   | File                                  | Est. Time |
| -------------------------------------- | ------------------------------------- | --------- |
| Create EntityCard component            | `components/common/EntityCard.vue`    | 60 min    |
| Create CopyableField component         | `components/common/CopyableField.vue` | 30 min    |
| Create useEntityName composable        | `composables/useEntityName.ts`        | 30 min    |
| Update components to use new utilities | Various                               | 45 min    |
| Test new components                    | -                                     | 30 min    |

**Checkpoint**: New utility components created and integrated

---

## Day 9: UX Pattern Standardization (Phase 6)

### Morning: Visual Consistency

**Duration**: 4 hours

| Task                                                 | File    | Est. Time |
| ---------------------------------------------------- | ------- | --------- |
| Audit OnlineStatusBadge usage                        | Various | 30 min    |
| Update remaining components to use OnlineStatusBadge | Various | 60 min    |
| Standardize empty states to use UiAppEmptyState      | Various | 45 min    |
| Standardize loading states                           | Various | 45 min    |
| Standardize modal headers                            | Various | 30 min    |

**Checkpoint**: Visual patterns consistent throughout app

### Afternoon: Color & Action Audit

**Duration**: 3 hours

| Task                                       | File    | Est. Time |
| ------------------------------------------ | ------- | --------- |
| Audit color usage for semantic consistency | Various | 45 min    |
| Fix non-semantic color usage               | Various | 45 min    |
| Standardize action button placement        | Various | 45 min    |
| Final visual review                        | -       | 30 min    |

**Checkpoint**: All UX patterns standardized

---

## Day 10: Final Cleanup & Testing (Phase 7)

### Morning: Cleanup

**Duration**: 3 hours

| Task                               | File                       | Est. Time |
| ---------------------------------- | -------------------------- | --------- |
| Add deprecation comments           | `types/contact.ts`         | 15 min    |
| Remove legacy stubs from useMuSig2 | `composables/useMuSig2.ts` | 20 min    |
| Consolidate address utilities      | Various                    | 45 min    |
| Verify no private access           | -                          | 15 min    |
| Remove unused imports              | Various                    | 30 min    |
| Verify no duplicate components     | -                          | 15 min    |

**Checkpoint**: Codebase clean, no duplicates or deprecated code in use

### Afternoon: Final Testing

**Duration**: 4 hours

| Task                               | Est. Time |
| ---------------------------------- | --------- |
| Run through full testing checklist | 120 min   |
| Fix any issues found               | 60 min    |
| Browser compatibility testing      | 30 min    |
| Final review                       | 30 min    |

**Checkpoint**: All tests pass, ready for review

---

## Buffer Days

Reserve 1-2 days for:

- Addressing review feedback
- Fixing unexpected issues
- Updating documentation
- Creating PR

---

## Commit Strategy

### Commit 1: Phase 1 - Wallet API

```
refactor(wallet): add public API for transaction building

- Add getTransactionBuildContext() method
- Add isReadyForSigning() method
- Add signTransactionHex() method
- Update draft.ts to use public API
- Remove private property access from draft.ts
```

### Commit 2: Phase 2 - Identity Consolidation

```
refactor(identity): consolidate entity data

- Add getOnlineStatus() with multi-signal detection
- Add updateFromPeerConnection() for P2P events
- Add updateFromSignerDiscovery() for MuSig2 events
- Update p2p.ts to update identity on peer events
- Update musig2.ts to update identity on signer discovery
- Simplify contacts.ts online status logic
- Add migration for legacy contacts
```

### Commit 3: Phase 3 - Facade Composables

```
feat(composables): add facade composables for clean component interfaces

- Add useContactContext() composable
- Add useSharedWalletContext() composable
- Add useSignerContext() composable
- Add OnlineStatusBadge component
```

### Commit 4: Phase 4 - Component Migration

```
refactor(components): migrate to facade composables

- Update contact components to use useContactContext
- Update shared wallet components to use useSharedWalletContext
- Update signer components to use useSignerContext
- Standardize online status display with OnlineStatusBadge
```

### Commit 5: Phase 5 - UI Component Consolidation

```
refactor(ui): consolidate duplicate components

- Merge AddressDisplay implementations
- Merge SignerDetailModal implementations
- Create unified TxItem with variants
- Create unified NetworkStatus with modes
- Merge ActivityFeed implementations
- Create EntityCard and CopyableField utilities
- Delete 10 duplicate component files
```

### Commit 6: Phase 6 - UX Pattern Standardization

```
refactor(ux): standardize visual patterns

- Use OnlineStatusBadge consistently throughout app
- Standardize empty states with UiAppEmptyState
- Standardize loading states
- Standardize modal headers
- Fix non-semantic color usage
- Standardize action button placement
```

### Commit 7: Phase 7 - Final Cleanup

```
chore: cleanup deprecated code and consolidate utilities

- Add deprecation comments to legacy Contact fields
- Remove legacy stubs from useMuSig2
- Consolidate address utilities
- Remove unused imports
- Final code cleanup
```

---

## Rollback Points

If issues are discovered:

| After Phase | Rollback Command       |
| ----------- | ---------------------- |
| Phase 1     | `git revert <commit1>` |
| Phase 2     | `git revert <commit2>` |
| Phase 3     | `git revert <commit3>` |
| Phase 4     | `git revert <commit4>` |
| Phase 5     | `git revert <commit5>` |
| Phase 6     | `git revert <commit6>` |
| Phase 7     | `git revert <commit7>` |

Each phase is independent and can be reverted without affecting others.

---

## Success Metrics

| Metric                      | Target             | How to Verify         |
| --------------------------- | ------------------ | --------------------- |
| Private access              | 0 occurrences      | `grep "Store\(\)\._"` |
| Store imports per component | ≤2 or 1 facade     | Manual review         |
| Online status sources       | 1 (identity store) | Code review           |
| Duplicate components        | 0                  | File search           |
| Inconsistent UX patterns    | 0                  | Visual audit          |
| Console warnings            | 0                  | Browser console       |
| Test failures               | 0                  | Test suite            |
| Regression issues           | 0                  | Manual testing        |
