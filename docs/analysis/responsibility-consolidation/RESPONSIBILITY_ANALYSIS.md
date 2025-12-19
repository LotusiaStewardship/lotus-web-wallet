# Responsibility Consolidation Analysis

**Date**: December 2024  
**Scope**: Full codebase structural review  
**Goal**: Identify responsibility violations and consolidation opportunities

---

## Executive Summary

The lotus-web-wallet codebase has grown organically and exhibits several structural issues that create maintenance burden and potential bugs:

1. **Private State Leakage**: Internal store state (`_script`, `_signingKey`, etc.) is accessed directly by other stores
2. **Responsibility Overlap**: Multiple modules handle the same concerns (identity, online status, address derivation)
3. **Missing API Boundaries**: Stores access each other's internal implementation details rather than public APIs
4. **Duplicated Logic**: Address formatting, online status detection, and contact resolution appear in multiple places

This document catalogs specific violations and proposes consolidation strategies.

---

## Critical Issues

### 1. Private State Leakage in `draft.ts`

**Location**: `@/stores/draft.ts:274-445`

The draft store directly accesses wallet store's private runtime objects:

```typescript
// draft.ts accesses private wallet state
if (!Bitcore || !walletStore._script) return null
script: walletStore._script,
internalPubKey: walletStore._internalPubKey,
tx.signSchnorr(walletStore._signingKey)
tx.sign(walletStore._signingKey)
```

**Problem**: These `_` prefixed properties are meant to be private implementation details. Accessing them:

- Creates tight coupling between stores
- Breaks encapsulation
- Makes refactoring dangerous

**Recommendation**: Wallet store should expose a public API for transaction building:

```typescript
// wallet.ts should expose:
getSigningContext(): TransactionSigningContext | null
signTransaction(tx: Transaction): SignedTransaction
```

---

### 2. Identity/Contact Data Fragmentation

**Locations**:

- `@/stores/contacts.ts` - Stores contact data with legacy P2P fields
- `@/stores/identity.ts` - Stores identity data (publicKey → address mapping)
- `@/stores/p2p.ts` - Stores online peer data
- `@/stores/musig2.ts` - Stores discovered signers

**Problem**: The same entity (a person/wallet) has data scattered across 4 stores:

| Data          | contacts.ts      | identity.ts              | p2p.ts              | musig2.ts              |
| ------------- | ---------------- | ------------------------ | ------------------- | ---------------------- |
| Public Key    | `publicKey`      | `publicKeyHex`           | -                   | `signer.publicKey`     |
| Peer ID       | `peerId`         | `peerId`                 | `connectedPeers`    | `signer.peerId`        |
| Address       | `address`        | `address`                | -                   | `signer.walletAddress` |
| Online Status | `lastSeenOnline` | `isOnline`, `lastSeenAt` | `connectedPeers`    | `signer.isOnline`      |
| Nickname      | `name`           | -                        | `presence.nickname` | `signer.nickname`      |

**Evidence from code**:

```typescript
// contacts.ts:128-161 - getOnlineStatusForContact() checks 4 sources:
function getOnlineStatusForContact(contact, identity, p2pStore) {
  const peerId = identity?.peerId || contact.peerId  // Signal 1
  if (peerId && p2pStore.connectedPeers.some(...))   // Signal 2
  if (identity?.isOnline)                             // Signal 3
  const lastSeen = identity?.lastSeenAt || contact.lastSeenOnline  // Signal 4
}
```

**Recommendation**: Consolidate into Identity store as single source of truth:

```
Identity Store (canonical)
    ↓
Contact Store (references identityId, adds relationship metadata)
    ↓
P2P Store (updates Identity.isOnline via events)
    ↓
MuSig2 Store (references Identity for signer data)
```

---

### 3. Wallet Store Monolith (1411 lines)

**Location**: `@/stores/wallet.ts`

The wallet store has accumulated too many responsibilities:

| Responsibility        | Lines | Should Be                              |
| --------------------- | ----- | -------------------------------------- |
| Wallet initialization | ~100  | wallet.ts                              |
| Key derivation        | ~150  | wallet.ts or crypto service            |
| UTXO management       | ~100  | wallet.ts                              |
| Transaction history   | ~100  | Separate history store                 |
| Chronik connection    | ~100  | Already in service, but callbacks here |
| Service worker comms  | ~80   | Separate SW composable                 |
| Network switching     | ~50   | network.ts                             |
| Message signing       | ~20   | wallet.ts                              |
| Multi-account state   | ~150  | wallet.ts                              |

**Specific Issues**:

1. **Transaction history parsing** (`fetchTransactionHistory`, `fetchParsedTransactions`) - This is presentation logic that should be in a composable or separate store

2. **Service worker communication** (`initializeBackgroundMonitoring`, `syncWithServiceWorker`, `notifyTabBackgrounded`) - Should be in `useServiceWorker` composable

3. **Dynamic import in store** (line 1149):

```typescript
const { fetchTransaction, parseTransaction } = await import(
  '~/composables/useExplorerApi'
).then(m => m.useExplorerApi())
```

Stores should not dynamically import composables.

---

### 4. Composable/Store Boundary Confusion

**useMuSig2.ts vs musig2.ts**:

The composable is documented as a "thin wrapper" but contains:

- Type definitions that should be in `types/`
- Mapping functions that duplicate store logic
- Legacy action stubs that throw errors

```typescript
// useMuSig2.ts:459-469 - Actions that just throw
async function createSession(...): Promise<string | null> {
  console.warn('[useMuSig2] createSession: Use musig2Store.proposeSpend()...')
  throw new Error('Direct session creation not supported...')
}
```

**Recommendation**:

- Move UI types to `types/musig2-ui.ts`
- Remove legacy stubs
- Keep composable truly thin (just computed refs + action delegation)

---

### 5. Address Handling Duplication

Address parsing/formatting appears in multiple places:

| Location                    | Functions                                          |
| --------------------------- | -------------------------------------------------- |
| `composables/useAddress.ts` | `parseAddress`, `truncateAddress`, `toFingerprint` |
| `stores/contacts.ts`        | `getNetworkFromAddress`, `getContactAddress`       |
| `stores/wallet.ts`          | `toXPI`, `toLotusUnits`, `toSatoshiUnits`          |
| `utils/formatting.ts`       | (likely duplicates)                                |
| `utils/identity.ts`         | `deriveAddressFromPublicKey`                       |

**Recommendation**: Consolidate all address utilities into `useAddress.ts` composable and have other modules import from there.

---

### 6. Component Store Access Patterns

Components access multiple stores directly, creating implicit dependencies:

**Example**: `CreateSharedWalletModal.vue` imports 4 stores:

```typescript
import { useContactsStore } from '~/stores/contacts'
import { useWalletStore } from '~/stores/wallet'
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
```

**Example**: `ContactDetailSlideover.vue` accesses 3 stores + 4 composables:

```typescript
const walletStore = useWalletStore()
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const { formatXPI } = useAmount()
const { copy } = useClipboard()
const { timeAgo } = useTime()
const { truncateAddress } = useAddress()
```

**Problem**: Components become tightly coupled to store implementation details.

**Recommendation**: Create facade composables for complex features:

- `useSharedWallets()` - Combines musig2 + contacts + p2p for shared wallet UI
- `useContactDetail()` - Combines contacts + wallet + p2p for contact views

---

## Consolidation Recommendations

### Phase 1: Fix Critical Encapsulation Violations

1. **Add public API to wallet.ts for transaction signing**:

   ```typescript
   // New public methods
   getTransactionContext(): TransactionBuildContext
   signTransaction(tx: Transaction, addressType: AddressType): string
   ```

2. **Remove direct `_` property access from draft.ts**

### Phase 2: Consolidate Identity Data

1. **Make Identity store the canonical source** for:

   - Public key → address mapping
   - Online status
   - P2P peer ID association
   - Signer capabilities

2. **Simplify Contact store** to only store:

   - Relationship metadata (name, notes, tags, favorites)
   - Reference to Identity (`identityId`)

3. **Update P2P and MuSig2 stores** to update Identity store on discovery events

### Phase 3: Extract Wallet Store Responsibilities

1. **Create `stores/history.ts`** for transaction history
2. **Move SW communication** to `useServiceWorker` composable
3. **Remove dynamic imports** from stores

### Phase 4: Clean Up Composables

1. **Move UI types** from composables to `types/`
2. **Remove legacy stubs** from useMuSig2
3. **Consolidate address utilities** into useAddress

### Phase 5: Create Facade Composables

1. **`useSharedWalletContext()`** - For shared wallet pages
2. **`useContactContext()`** - For contact detail views
3. **`useSendContext()`** - For send transaction flow

---

## Dependency Graph (Current)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CURRENT STATE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Components                                                         │
│      │                                                              │
│      ├──→ wallet.ts ←──────────────────────────────────────────┐   │
│      │       │                                                  │   │
│      │       ├──→ network.ts                                    │   │
│      │       ├──→ notifications.ts                              │   │
│      │       └──→ chronik service                               │   │
│      │                                                          │   │
│      ├──→ contacts.ts ←─────────────────────────────────────┐  │   │
│      │       │                                               │  │   │
│      │       ├──→ identity.ts ←──────────────────────────┐  │  │   │
│      │       ├──→ p2p.ts ←───────────────────────────┐   │  │  │   │
│      │       └──→ network.ts                          │   │  │  │   │
│      │                                                │   │  │  │   │
│      ├──→ p2p.ts                                      │   │  │  │   │
│      │       │                                        │   │  │  │   │
│      │       └──→ contacts.ts ────────────────────────┼───┘  │  │   │
│      │                                                │      │  │   │
│      ├──→ musig2.ts                                   │      │  │   │
│      │       │                                        │      │  │   │
│      │       ├──→ p2p.ts ─────────────────────────────┘      │  │   │
│      │       ├──→ wallet.ts ─────────────────────────────────┼──┘   │
│      │       ├──→ contacts.ts ───────────────────────────────┘      │
│      │       ├──→ identity.ts                                       │
│      │       └──→ notifications.ts                                  │
│      │                                                              │
│      └──→ draft.ts                                                  │
│              │                                                      │
│              └──→ wallet.ts._script (VIOLATION)                     │
│              └──→ wallet.ts._signingKey (VIOLATION)                 │
│              └──→ wallet.ts._internalPubKey (VIOLATION)             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Dependency Graph (Target)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TARGET STATE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Components                                                         │
│      │                                                              │
│      └──→ Facade Composables (useSharedWalletContext, etc.)        │
│              │                                                      │
│              └──→ Stores (via public APIs only)                    │
│                      │                                              │
│                      ├──→ wallet.ts                                 │
│                      │       └──→ getTransactionContext()          │
│                      │       └──→ signTransaction()                │
│                      │                                              │
│                      ├──→ identity.ts (canonical for entities)     │
│                      │       └──→ All public key / online data     │
│                      │                                              │
│                      ├──→ contacts.ts (relationship metadata)      │
│                      │       └──→ References identity.ts           │
│                      │                                              │
│                      ├──→ p2p.ts (connection state)                │
│                      │       └──→ Updates identity.ts              │
│                      │                                              │
│                      ├──→ musig2.ts (signing sessions)             │
│                      │       └──→ References identity.ts           │
│                      │                                              │
│                      └──→ draft.ts (transaction building)          │
│                              └──→ Uses wallet.ts public API        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Priority Matrix

| Issue                            | Severity | Effort | Priority |
| -------------------------------- | -------- | ------ | -------- |
| Private state leakage (draft.ts) | High     | Medium | **P1**   |
| Identity data fragmentation      | High     | High   | **P1**   |
| Wallet store monolith            | Medium   | High   | P2       |
| Composable/store boundary        | Low      | Low    | P3       |
| Address handling duplication     | Low      | Low    | P3       |
| Component store coupling         | Medium   | Medium | P2       |

---

## Next Steps

1. Create detailed implementation plan for P1 issues
2. Design public API for wallet transaction context
3. Design unified Identity data model
4. Create migration strategy for existing data

---

## Related Documentation

- `docs/architecture/02_STATE_MANAGEMENT.md` - Current store architecture
- `docs/architecture/03_SERVICES.md` - Service layer design
- `docs/architecture/08_DATA_FLOW.md` - Data flow patterns
