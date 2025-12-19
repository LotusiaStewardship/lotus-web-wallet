# Quick Reference: Responsibility Violations

A concise list of specific violations and their fixes.

---

## Private State Access Violations

### draft.ts → wallet.ts

| Line    | Violation                                 | Fix                                                |
| ------- | ----------------------------------------- | -------------------------------------------------- |
| 274     | `walletStore._script`                     | `walletStore.getTransactionBuildContext()?.script` |
| 287     | `walletStore._script`                     | `txContext.script`                                 |
| 289     | `walletStore._internalPubKey`             | `txContext.internalPubKey`                         |
| 290     | `walletStore._merkleRoot`                 | `txContext.merkleRoot`                             |
| 365     | `walletStore._signingKey`                 | `walletStore.isReadyForSigning()`                  |
| 428     | `walletStore._script!.toHex()`            | `walletStore.getScriptHex()!`                      |
| 436     | `walletStore._internalPubKey?.toString()` | `txContext.internalPubKey?.toString()`             |
| 442-444 | `tx.signSchnorr(walletStore._signingKey)` | `walletStore.signTransactionHex(tx)`               |

---

## Responsibility Overlap

### Online Status Detection

**Current**: 4 sources checked in `contacts.ts:128-161`

| Source                 | Location                  | Data                 |
| ---------------------- | ------------------------- | -------------------- |
| P2P connected peers    | `p2pStore.connectedPeers` | Real-time connection |
| Identity online flag   | `identity.isOnline`       | Presence state       |
| Identity lastSeenAt    | `identity.lastSeenAt`     | Timestamp            |
| Contact lastSeenOnline | `contact.lastSeenOnline`  | Legacy timestamp     |

**Target**: Single source in `identity.ts`

```typescript
// identity.ts
getOnlineStatus(publicKeyHex: string): OnlineStatus
```

---

### Address Derivation

**Current**: Multiple implementations

| Location                    | Function                              |
| --------------------------- | ------------------------------------- |
| `utils/identity.ts`         | `deriveAddressFromPublicKey()`        |
| `composables/useAddress.ts` | `publicKeyToAddress()`                |
| `stores/identity.ts`        | `createIdentity()` (calls utils)      |
| `stores/contacts.ts`        | `addContact()` (calls identity store) |

**Target**: Single implementation in `utils/identity.ts`, used by all

---

### Contact/Identity Resolution

**Current**: Multiple lookup patterns

```typescript
// In contacts.ts
const contact = contactsStore.findByPublicKey(pubKey)
const contact = contactsStore.findByPeerId(peerId)
const contact = contactsStore.getContactByAddress(address)

// In identity.ts
const identity = identityStore.get(publicKeyHex)
const identity = identityStore.findByPeerId(peerId)
const identity = identityStore.findByAddress(address)
```

**Target**: Unified lookup via Identity store

```typescript
// Primary lookup
const identity = identityStore.get(publicKeyHex)

// Contact is just relationship metadata
const contact = contactsStore.findByIdentityId(identity.publicKeyHex)
```

---

## Store Coupling Matrix

Current inter-store dependencies:

| Store         | Depends On                                     |
| ------------- | ---------------------------------------------- |
| wallet        | network, notifications                         |
| contacts      | identity, p2p, network                         |
| p2p           | contacts                                       |
| musig2        | p2p, wallet, contacts, identity, notifications |
| draft         | wallet (PRIVATE ACCESS)                        |
| identity      | (none - leaf store)                            |
| network       | (none - leaf store)                            |
| notifications | (none - leaf store)                            |

Target (reduced coupling):

| Store         | Depends On          |
| ------------- | ------------------- |
| wallet        | network             |
| contacts      | identity            |
| p2p           | identity            |
| musig2        | p2p, identity       |
| draft         | wallet (PUBLIC API) |
| identity      | (none)              |
| network       | (none)              |
| notifications | (none)              |

---

## Files to Modify

### Phase 1 (Private State Fix)

1. `stores/wallet.ts` - Add public API methods
2. `stores/draft.ts` - Use public API instead of private properties

### Phase 2 (Identity Consolidation)

1. `stores/identity.ts` - Add online status methods
2. `stores/p2p.ts` - Update identity on peer events
3. `stores/musig2.ts` - Update identity on signer discovery
4. `stores/contacts.ts` - Simplify online status, add migration

---

## Grep Commands for Verification

```bash
# Find all private property access
grep -rn "Store\(\)\._" --include="*.ts" --include="*.vue" .

# Find all online status checks
grep -rn "isOnline\|lastSeen" --include="*.ts" --include="*.vue" .

# Find all address derivation
grep -rn "deriveAddress\|publicKeyToAddress\|toAddress" --include="*.ts" .

# Find all identity lookups
grep -rn "findByPeerId\|findByPublicKey\|findByAddress" --include="*.ts" .
```
