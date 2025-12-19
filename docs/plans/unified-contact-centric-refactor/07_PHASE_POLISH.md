# Phase 7: Polish & Release

**Version**: 1.0.0  
**Date**: December 18, 2025  
**Status**: Pending  
**Estimated Effort**: 1-2 weeks  
**Dependencies**: All previous phases

---

## Overview

This final phase focuses on production readiness: comprehensive testing, documentation updates, performance optimization, and final QA.

---

## Goals

1. Comprehensive testing (unit, integration, E2E)
2. Update documentation
3. Performance optimization
4. Final QA and release preparation

---

## Tasks

### 7.1 Comprehensive Testing

#### Unit Tests

**File**: `test/stores/identity.test.ts` (NEW)

```typescript
describe('Identity Store', () => {
  it('creates identity from public key', () => {
    const store = useIdentityStore()
    const pubKey = '02abc...'

    const identity = store.findOrCreate(pubKey, 'livenet')

    expect(identity.publicKeyHex).toBe(pubKey)
    expect(identity.address).toMatch(/^lotus/)
    expect(identity.isOnline).toBe(false)
  })

  it('returns existing identity', () => {
    const store = useIdentityStore()
    const pubKey = '02abc...'

    const identity1 = store.findOrCreate(pubKey)
    const identity2 = store.findOrCreate(pubKey)

    expect(identity1).toBe(identity2)
  })

  it('updates presence correctly', () => {
    const store = useIdentityStore()
    const identity = store.findOrCreate('02abc...')

    store.updatePresence(identity.publicKeyHex, { isOnline: true })

    expect(store.get(identity.publicKeyHex)?.isOnline).toBe(true)
  })
})
```

**File**: `test/utils/identity.test.ts` (NEW)

```typescript
describe('Identity Utilities', () => {
  describe('isValidPublicKey', () => {
    it('validates compressed public keys', () => {
      expect(isValidPublicKey('02' + 'a'.repeat(64))).toBe(true)
      expect(isValidPublicKey('03' + 'b'.repeat(64))).toBe(true)
    })

    it('rejects invalid keys', () => {
      expect(isValidPublicKey('04' + 'a'.repeat(64))).toBe(false)
      expect(isValidPublicKey('02' + 'a'.repeat(63))).toBe(false)
      expect(isValidPublicKey('')).toBe(false)
    })
  })

  describe('deriveAddressFromPublicKey', () => {
    it('derives correct address', () => {
      const pubKey = '02...' // Valid test key
      const address = deriveAddressFromPublicKey(pubKey, 'livenet')

      expect(address).toMatch(/^lotus/)
    })
  })
})
```

| Task                         | Priority | Status         |
| ---------------------------- | -------- | -------------- |
| Write identity store tests   | P0       | ⬜ Not Started |
| Write identity utility tests | P0       | ⬜ Not Started |
| Write contact store tests    | P0       | ⬜ Not Started |
| Write MuSig2 n-of-n tests    | P0       | ⬜ Not Started |

#### Integration Tests

| Test               | Description                       | Status         |
| ------------------ | --------------------------------- | -------------- |
| Address derivation | Derived address is correct        | ⬜ Not Started |
| Multi-account      | Both PRIMARY and MUSIG2 keys work | ⬜ Not Started |
| P2P auto-connect   | Connects on startup when enabled  | ⬜ Not Started |
| Cache persistence  | Signers persist through reload    | ⬜ Not Started |
| N-of-N aggregation | Key aggregation works for 2-10+   | ⬜ Not Started |

#### E2E Tests

| Test                    | Description                      | Status         |
| ----------------------- | -------------------------------- | -------------- |
| Create 2-of-2 wallet    | Full flow with 2 participants    | ⬜ Not Started |
| Create 3-of-3 wallet    | Full flow with 3 participants    | ⬜ Not Started |
| Create 5-of-5 wallet    | Full flow with 5 participants    | ⬜ Not Started |
| Add contact from signer | Signer → Contact with address    | ⬜ Not Started |
| Send to contact         | Select contact, send transaction | ⬜ Not Started |
| View offline wallet     | View shared wallet without P2P   | ⬜ Not Started |
| N-of-N signing          | All participants sign to spend   | ⬜ Not Started |

---

### 7.2 Documentation Updates

**Files to Update**:

| File                                        | Updates Needed                                 |
| ------------------------------------------- | ---------------------------------------------- |
| `README.md`                                 | Add multi-account and contact-centric features |
| `docs/architecture/00_OVERVIEW.md`          | Update with new architecture                   |
| `docs/architecture/01_CORE_ARCHITECTURE.md` | Add identity store                             |
| `docs/architecture/02_STATE_MANAGEMENT.md`  | Update store relationships                     |

**New Documentation**:

| File                            | Description                           |
| ------------------------------- | ------------------------------------- |
| `docs/guides/MULTI_ACCOUNT.md`  | User guide for multi-account features |
| `docs/guides/CONTACTS.md`       | User guide for contact management     |
| `docs/guides/SHARED_WALLETS.md` | User guide for shared wallets         |

| Task                     | Priority | Status         |
| ------------------------ | -------- | -------------- |
| Update README.md         | P1       | ⬜ Not Started |
| Update architecture docs | P1       | ⬜ Not Started |
| Create user guides       | P2       | ⬜ Not Started |

---

### 7.3 Performance Optimization

**Areas to Optimize**:

1. **Lazy Key Derivation**

   - Only derive keys when needed
   - Cache derived keys in memory

2. **Identity Lookup Caching**

   - Index identities by address and peerId
   - Use computed properties with caching

3. **Chronik Subscription Batching**

   - Batch multiple address subscriptions
   - Debounce balance updates

4. **Discovery Cache Efficiency**
   - Debounce localStorage writes
   - Limit cache size with LRU eviction

```typescript
// Example: Indexed identity lookup
const identitiesByAddress = computed(() => {
  const map = new Map<string, Identity>()
  for (const identity of identityList.value) {
    map.set(identity.address, identity)
  }
  return map
})

function findByAddress(address: string): Identity | undefined {
  return identitiesByAddress.value.get(address)
}
```

| Task                           | Priority | Status         |
| ------------------------------ | -------- | -------------- |
| Implement lazy key derivation  | P1       | ⬜ Not Started |
| Add identity lookup indexes    | P1       | ⬜ Not Started |
| Optimize Chronik subscriptions | P2       | ⬜ Not Started |
| Profile and optimize hot paths | P2       | ⬜ Not Started |

---

### 7.4 Final QA Checklist

#### Critical Path Testing

- [ ] Fresh wallet creation works
- [ ] MuSig2 key is different from primary
- [ ] N-of-N shared wallet creation computes address (2, 3, 5+ participants)
- [ ] Contacts from signers have addresses
- [ ] P2P auto-connect works
- [ ] Signers persist through reload
- [ ] All n participants required for spending

#### Regression Testing

- [ ] Send transaction works
- [ ] Receive address is correct
- [ ] Transaction history displays
- [ ] Balance updates correctly
- [ ] Settings persist
- [ ] Backup/restore works

#### Edge Cases

- [ ] Empty wallet (no transactions)
- [ ] Large contact list (100+)
- [ ] Multiple shared wallets
- [ ] Network switch (livenet ↔ testnet)
- [ ] Offline usage
- [ ] Browser storage limits

---

## Release Preparation

### Pre-Release Checklist

- [ ] All tests passing
- [ ] No console errors in production build
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped

### Release Notes Template

```markdown
## v2.0.0 - Contact-Centric Refactor

### New Features

- **Unified Identity Model**: Contacts, P2P peers, and MuSig2 signers now share a unified identity
- **BIP44 Multi-Account**: Dedicated signing key for MuSig2 (improved security)
- **N-of-N MuSig2 Shared Wallets**: Support for 2-of-2, 3-of-3, 5-of-5, and any n-of-n configuration
- **Automatic Address Derivation**: Contacts from signers automatically get addresses
- **Persistent Discovery Cache**: Signers persist through page reloads
- **Offline Wallet Viewing**: View shared wallet details without P2P connection

### Improvements

- Contact-centric navigation and UI
- Multi-signal online status detection for all n participants
- Loading skeletons and better empty states
- P2P auto-connect on startup
- Clear indication when waiting for n-of-n participants

### Bug Fixes

- Fixed: Shared wallet shows "Address pending..."
- Fixed: Contacts from signers have empty addresses
- Fixed: Duplicate signers in Available Signers list
- Fixed: Auto-connect setting not respected
```

---

## Success Criteria

- [ ] All tests passing
- [ ] N-of-N shared wallets work for 2, 3, 5, 10+ participants
- [ ] Documentation complete
- [ ] Performance acceptable (< 500ms wallet load)
- [ ] No console errors in production

---

## Dependencies

- All previous phases completed

## Dependents

- None (final phase)

---

_Created: December 18, 2025_  
_Status: Pending_
