# P1 Implementation Plan: Critical Encapsulation Fixes

**Priority**: P1 (Critical)  
**Estimated Effort**: 2-3 days  
**Dependencies**: None

---

## Overview

This plan addresses the two highest-priority issues identified in the responsibility analysis:

1. **Private State Leakage** - `draft.ts` directly accesses `wallet.ts` private properties
2. **Identity Data Fragmentation** - Entity data scattered across 4 stores

---

## Part 1: Fix Private State Leakage

### Problem

`draft.ts` accesses wallet store's private runtime objects:

- `walletStore._script`
- `walletStore._signingKey`
- `walletStore._internalPubKey`
- `walletStore._merkleRoot`

### Solution

Add a public API to `wallet.ts` that exposes transaction building context without exposing internal objects.

### Step 1.1: Add Public API to wallet.ts

Add these methods to `wallet.ts`:

```typescript
/**
 * Get transaction building context for the primary account
 * Returns null if wallet not initialized
 */
getTransactionBuildContext(): {
  script: Script
  addressType: AddressType
  changeAddress: string
  internalPubKey?: PublicKey
  merkleRoot?: Buffer
} | null {
  if (!this._script || !this.address) return null

  return {
    script: this._script,
    addressType: this.addressType,
    changeAddress: this.address,
    internalPubKey: this._internalPubKey,
    merkleRoot: this._merkleRoot,
  }
}

/**
 * Check if wallet is ready for transaction signing
 */
isReadyForSigning(): boolean {
  return !!(this._signingKey && this._script && this.initialized)
}

/**
 * Sign a transaction with the wallet's private key
 * @param tx - Unsigned transaction
 * @returns Signed transaction hex
 */
signTransactionHex(tx: Transaction): string {
  if (!this._signingKey) {
    throw new Error('Wallet not initialized for signing')
  }

  if (this.addressType === 'p2tr') {
    tx.signSchnorr(this._signingKey)
  } else {
    tx.sign(this._signingKey)
  }

  return tx.toBuffer().toString('hex')
}

/**
 * Get script hex for UTXO signing data
 */
getScriptHex(): string | null {
  return this._script?.toHex() ?? null
}
```

### Step 1.2: Update draft.ts to Use Public API

Replace direct property access with public API calls:

**Before**:

```typescript
if (!Bitcore || !walletStore._script) return null
script: walletStore._script,
internalPubKey: walletStore._internalPubKey,
```

**After**:

```typescript
const txContext = walletStore.getTransactionBuildContext()
if (!Bitcore || !txContext) return null
script: txContext.script,
internalPubKey: txContext.internalPubKey,
```

**Before**:

```typescript
if (!isChronikInitialized() || !walletStore._signingKey || !Bitcore) {
  throw new Error('Wallet not initialized')
}
```

**After**:

```typescript
if (!isChronikInitialized() || !walletStore.isReadyForSigning() || !Bitcore) {
  throw new Error('Wallet not initialized')
}
```

**Before**:

```typescript
scriptHex: walletStore._script!.toHex(), tx.signSchnorr(walletStore._signingKey)
tx.sign(walletStore._signingKey)
```

**After**:

```typescript
scriptHex: walletStore.getScriptHex()!,
  (signedTxHex = walletStore.signTransactionHex(tx))
```

### Step 1.3: Verify No Other Violations

Search for any other direct access to private wallet properties:

```bash
grep -r "walletStore\._" --include="*.ts" --include="*.vue" .
```

Fix any additional violations found.

---

## Part 2: Consolidate Identity Data

### Problem

Entity data (public key, address, online status, peer ID) is scattered across:

- `contacts.ts` - Legacy fields (`publicKey`, `peerId`, `lastSeenOnline`)
- `identity.ts` - Canonical fields (`publicKeyHex`, `peerId`, `isOnline`, `lastSeenAt`)
- `p2p.ts` - Connection state (`connectedPeers`, `onlinePeers`)
- `musig2.ts` - Signer data (`discoveredSigners`)

### Solution

Make `identity.ts` the single source of truth for entity data. Other stores reference identities by `publicKeyHex`.

### Step 2.1: Enhance Identity Store

Add missing capabilities to `identity.ts`:

```typescript
/**
 * Update identity from P2P peer connection
 */
updateFromPeerConnection(peerId: string, multiaddrs: string[]): Identity | null {
  const identity = this.findByPeerId(peerId)
  if (!identity) return null

  identity.isOnline = true
  identity.lastSeenAt = Date.now()
  identity.multiaddrs = multiaddrs
  identity.updatedAt = Date.now()

  return identity
}

/**
 * Mark identity offline by peer ID
 */
markOfflineByPeerId(peerId: string): void {
  const identity = this.findByPeerId(peerId)
  if (identity) {
    identity.isOnline = false
    identity.updatedAt = Date.now()
  }
}

/**
 * Get online status with multi-signal detection
 */
getOnlineStatus(publicKeyHex: string): 'online' | 'recently_online' | 'offline' | 'unknown' {
  const identity = this.get(publicKeyHex)
  if (!identity) return 'unknown'

  if (identity.isOnline) return 'online'

  if (identity.lastSeenAt) {
    const RECENTLY_THRESHOLD = 5 * 60 * 1000 // 5 minutes
    if (Date.now() - identity.lastSeenAt < RECENTLY_THRESHOLD) {
      return 'recently_online'
    }
  }

  return 'offline'
}
```

### Step 2.2: Update P2P Store to Update Identities

Modify `p2p.ts` event handlers to update Identity store:

```typescript
_handlePeerConnected(peer: UIPeerInfo) {
  // Existing logic...

  // Update identity store
  const identityStore = useIdentityStore()
  identityStore.updateFromPeerConnection(peer.peerId, peer.multiaddrs)
}

_handlePeerDisconnected(peerId: string) {
  // Existing logic...

  // Update identity store
  const identityStore = useIdentityStore()
  identityStore.markOfflineByPeerId(peerId)
}
```

### Step 2.3: Update MuSig2 Store to Create/Update Identities

Modify `musig2.ts` signer discovery to update Identity store:

```typescript
_handleSignerDiscovered(signer: DiscoveredSigner) {
  // Existing logic...

  // Create/update identity
  const identityStore = useIdentityStore()
  identityStore.updateFromSigner({
    publicKeyHex: signer.publicKey,
    peerId: signer.peerId,
    signerCapabilities: {
      transactionTypes: Object.entries(signer.capabilities)
        .filter(([_, v]) => v)
        .map(([k]) => k),
      available: signer.isOnline,
    },
  })
}
```

### Step 2.4: Simplify Contacts Store

Remove redundant online status logic from `contacts.ts`:

**Before** (128-161):

```typescript
function getOnlineStatusForContact(contact, identity, p2pStore) {
  // Complex multi-signal logic
}
```

**After**:

```typescript
function getOnlineStatusForContact(contact: Contact): OnlineStatus {
  if (!contact.identityId) return 'unknown'

  const identityStore = useIdentityStore()
  return identityStore.getOnlineStatus(contact.identityId)
}
```

### Step 2.5: Deprecate Legacy Contact Fields

Add deprecation comments and migration logic:

```typescript
interface Contact {
  // ... existing fields ...

  /** @deprecated Use identityId to reference Identity store */
  peerId?: string
  /** @deprecated Use identityId to reference Identity store */
  publicKey?: string
  /** @deprecated Use identityId to reference Identity store */
  lastSeenOnline?: number
  /** @deprecated Use identityId to reference Identity store */
  signerCapabilities?: SignerCapabilities
}
```

Add migration on load:

```typescript
initialize() {
  // Load contacts...

  // Migrate legacy contacts to use identityId
  for (const contact of this.contacts) {
    if (contact.publicKey && !contact.identityId) {
      const identityStore = useIdentityStore()
      const identity = identityStore.findOrCreate(contact.publicKey, 'livenet')
      contact.identityId = identity.publicKeyHex

      // Copy legacy data to identity
      if (contact.peerId) identity.peerId = contact.peerId
      if (contact.lastSeenOnline) identity.lastSeenAt = contact.lastSeenOnline
    }
  }

  this.saveContacts()
}
```

---

## Testing Checklist

### Part 1: Transaction Signing

- [ ] Create new wallet, send transaction
- [ ] Restore wallet, send transaction
- [ ] Switch address type (P2PKH ↔ P2TR), send transaction
- [ ] Coin control selection works
- [ ] OP_RETURN data works
- [ ] Send max works
- [ ] Multi-recipient works

### Part 2: Identity Consolidation

- [ ] New contact with public key creates identity
- [ ] Signer discovery creates/updates identity
- [ ] P2P connection updates identity online status
- [ ] P2P disconnection updates identity offline status
- [ ] Contact detail shows correct online status
- [ ] Shared wallet creation uses identity data
- [ ] Legacy contacts are migrated on load

---

## Rollback Plan

If issues are discovered:

1. **Part 1**: Revert `wallet.ts` and `draft.ts` changes
2. **Part 2**: Keep identity store but revert contact/p2p/musig2 integration

Both parts are independent and can be rolled back separately.

---

## Success Criteria

1. No direct access to `_` prefixed properties outside their defining store
2. All entity online status queries go through Identity store
3. All existing tests pass
4. No regressions in transaction sending
5. No regressions in contact/signer display
