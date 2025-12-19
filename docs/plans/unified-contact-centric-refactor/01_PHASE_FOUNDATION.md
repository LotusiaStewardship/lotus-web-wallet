# Phase 1: Foundation

**Version**: 1.0.0  
**Date**: December 18, 2025  
**Status**: Pending  
**Estimated Effort**: 1-2 weeks  
**Dependencies**: None

---

## Overview

This phase establishes the foundational types, utilities, and stores required by all subsequent phases. It creates the unified identity model that connects contacts, P2P peers, and MuSig2 signers.

---

## Goals

1. Create unified Identity type as the canonical identifier
2. Create BIP44 account types for multi-address support
3. Implement Identity store for identity management
4. Create address derivation and validation utilities
5. Establish storage patterns for new data structures

---

## Tasks

### 1.1 Create Identity Types

**File**: `types/identity.ts` (NEW)

```typescript
/**
 * Unified Identity Types
 *
 * The Identity represents a cryptographic entity on the Lotus network.
 * The publicKeyHex is the canonical identifier from which other
 * properties are derived.
 */

/**
 * Signer capabilities advertised via P2P.
 */
export interface SignerCapabilities {
  /** Transaction types this signer supports */
  transactionTypes: TransactionType[]
  /** Amount range the signer accepts */
  amountRange?: { min?: number; max?: number }
  /** Fee the signer charges (in sats) */
  fee?: number
  /** Whether currently accepting signing requests */
  available: boolean
  /** Advertisement expiry timestamp */
  expiresAt?: number
}

export type TransactionType = 'standard' | 'token' | 'nft' | 'any'

/**
 * Unified identity representing a person/entity on the Lotus network.
 */
export interface Identity {
  // === CANONICAL IDENTIFIER ===
  /**
   * Compressed public key in hex format (66 hex chars = 33 bytes).
   * This is the SOURCE OF TRUTH for the identity.
   */
  publicKeyHex: string

  // === DERIVED PROPERTIES ===
  /** Lotus address derived from publicKeyHex */
  address: string

  // === P2P CONNECTIVITY ===
  /** libp2p peer ID (optional - only if P2P connected) */
  peerId?: string
  /** Multiaddresses for direct connection */
  multiaddrs?: string[]

  // === PRESENCE ===
  /** Whether this identity is currently reachable via P2P */
  isOnline: boolean
  /** Last time this identity was seen online */
  lastSeenAt?: number

  // === CAPABILITIES ===
  /** MuSig2 signer capabilities (if advertised) */
  signerCapabilities?: SignerCapabilities

  // === METADATA ===
  createdAt: number
  updatedAt: number
}

/**
 * Identity relationship levels based on available information.
 */
export enum IdentityLevel {
  /** Only address known (legacy contact) */
  ADDRESS_ONLY = 0,
  /** Public key known (can derive address, eligible for MuSig2) */
  PUBLIC_KEY = 1,
  /** P2P connected (has peerId, can check presence) */
  P2P_CONNECTED = 2,
  /** Active signer (advertising capabilities) */
  ACTIVE_SIGNER = 3,
}
```

| Task                                               | Priority | Status         |
| -------------------------------------------------- | -------- | -------------- |
| Create `types/identity.ts` with Identity interface | P0       | ⬜ Not Started |
| Add SignerCapabilities interface                   | P0       | ⬜ Not Started |
| Add TransactionType type                           | P0       | ⬜ Not Started |
| Add IdentityLevel enum                             | P0       | ⬜ Not Started |

---

### 1.2 Create Account Types

**File**: `types/accounts.ts` (NEW)

```typescript
/**
 * BIP44 Account Types
 *
 * Type definitions for multi-account architecture.
 */

/**
 * Predefined account purposes following BIP44 account index convention
 */
export enum AccountPurpose {
  /** Primary wallet - receiving, sending, identity */
  PRIMARY = 0,
  /** MuSig2 signing - dedicated key for multi-sig */
  MUSIG2 = 1,
  /** Atomic swaps - future use */
  SWAP = 2,
  /** Privacy features - future use */
  PRIVACY = 3,
}

/**
 * User-friendly labels for UI display (no technical jargon)
 */
export const ACCOUNT_FRIENDLY_LABELS: Record<AccountPurpose, string> = {
  [AccountPurpose.PRIMARY]: 'Main Wallet',
  [AccountPurpose.MUSIG2]: 'Signing Key',
  [AccountPurpose.SWAP]: 'Swap Account',
  [AccountPurpose.PRIVACY]: 'Private Account',
}

/**
 * User-friendly descriptions for UI display
 */
export const ACCOUNT_DESCRIPTIONS: Record<AccountPurpose, string> = {
  [AccountPurpose.PRIMARY]: 'Your main address for sending and receiving',
  [AccountPurpose.MUSIG2]: 'Used for shared wallet participation',
  [AccountPurpose.SWAP]: 'For atomic swap transactions',
  [AccountPurpose.PRIVACY]: 'Enhanced privacy features',
}

/**
 * Configuration for a single account
 */
export interface AccountConfig {
  purpose: AccountPurpose
  label: string
  enabled: boolean
  gapLimit: number
}

/**
 * Default account configurations
 */
export const DEFAULT_ACCOUNTS: AccountConfig[] = [
  {
    purpose: AccountPurpose.PRIMARY,
    label: 'Primary Wallet',
    enabled: true,
    gapLimit: 0,
  },
  {
    purpose: AccountPurpose.MUSIG2,
    label: 'MuSig2 Signing',
    enabled: true,
    gapLimit: 0,
  },
]

/**
 * A single derived address/key pair
 */
export interface DerivedAddress {
  index: number
  isChange: boolean
  path: string
  address: string
  scriptPayload: string
  publicKeyHex: string
}

/**
 * BIP44 constants for Lotus
 */
export const BIP44 = {
  PURPOSE: 44,
  COIN_TYPE: 10605,
} as const

/**
 * Build a BIP44 derivation path
 */
export function buildDerivationPath(
  accountIndex: number,
  isChange: boolean = false,
  addressIndex: number = 0,
): string {
  const change = isChange ? 1 : 0
  return `m/${BIP44.PURPOSE}'/${BIP44.COIN_TYPE}'/${accountIndex}'/${change}/${addressIndex}`
}
```

| Task                                                | Priority | Status         |
| --------------------------------------------------- | -------- | -------------- |
| Create `types/accounts.ts` with AccountPurpose enum | P0       | ⬜ Not Started |
| Add friendly labels and descriptions                | P0       | ⬜ Not Started |
| Add AccountConfig interface                         | P0       | ⬜ Not Started |
| Add DerivedAddress interface                        | P0       | ⬜ Not Started |
| Add BIP44 constants and path builder                | P0       | ⬜ Not Started |

---

### 1.3 Create Identity Utilities

**File**: `utils/identity.ts` (NEW)

```typescript
/**
 * Identity Utilities
 *
 * Functions for identity validation, derivation, and level detection.
 */
import { getBitcore, isBitcoreLoaded } from '~/plugins/bitcore.client'
import type { Identity, IdentityLevel } from '~/types/identity'

/**
 * Validate a compressed public key format.
 *
 * A valid compressed public key is:
 * - 66 hex characters (representing 33 bytes)
 * - Starts with 02 (Y is even) or 03 (Y is odd)
 * - Followed by 64 hex characters (32-byte X coordinate)
 */
export function isValidPublicKey(publicKeyHex: string): boolean {
  return /^0[23][0-9a-fA-F]{64}$/.test(publicKeyHex)
}

/**
 * Derive a Lotus address from a compressed public key.
 */
export function deriveAddressFromPublicKey(
  publicKeyHex: string,
  network: 'livenet' | 'testnet' = 'livenet',
): string | null {
  if (!isBitcoreLoaded()) {
    console.warn('[Identity] Bitcore not loaded, cannot derive address')
    return null
  }

  if (!isValidPublicKey(publicKeyHex)) {
    console.warn(
      '[Identity] Invalid public key format:',
      publicKeyHex?.slice(0, 20),
    )
    return null
  }

  try {
    const { PublicKey, Address } = getBitcore()
    const pubKey = new PublicKey(publicKeyHex)
    const address = Address.fromPublicKey(pubKey, network)
    return address.toString()
  } catch (error) {
    console.error('[Identity] Failed to derive address:', error)
    return null
  }
}

/**
 * Create an Identity from a public key.
 */
export function createIdentity(
  publicKeyHex: string,
  network: 'livenet' | 'testnet' = 'livenet',
): Identity {
  if (!isValidPublicKey(publicKeyHex)) {
    throw new Error('Invalid public key format')
  }

  const address = deriveAddressFromPublicKey(publicKeyHex, network)
  if (!address) {
    throw new Error('Failed to derive address from public key')
  }

  const now = Date.now()
  return {
    publicKeyHex,
    address,
    isOnline: false,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Get the relationship level of an identity.
 */
export function getIdentityLevel(identity: Identity): IdentityLevel {
  if (identity.signerCapabilities?.available) {
    return IdentityLevel.ACTIVE_SIGNER
  }
  if (identity.peerId) {
    return IdentityLevel.P2P_CONNECTED
  }
  if (identity.publicKeyHex) {
    return IdentityLevel.PUBLIC_KEY
  }
  return IdentityLevel.ADDRESS_ONLY
}

/**
 * Check if an identity can participate in MuSig2.
 */
export function canParticipateInMuSig2(identity: Identity): boolean {
  return getIdentityLevel(identity) >= IdentityLevel.PUBLIC_KEY
}

/**
 * Check if an identity's presence can be tracked.
 */
export function canCheckPresence(identity: Identity): boolean {
  return getIdentityLevel(identity) >= IdentityLevel.P2P_CONNECTED
}

/**
 * Check if a string is a valid Lotus address.
 */
export function isValidLotusAddress(address: string): boolean {
  if (!address) return false
  if (!address.startsWith('lotus')) return false

  if (!isBitcoreLoaded()) {
    return address.length >= 40 && address.length <= 60
  }

  try {
    const { Address } = getBitcore()
    Address.fromString(address)
    return true
  } catch {
    return false
  }
}
```

| Task                                     | Priority | Status         |
| ---------------------------------------- | -------- | -------------- |
| Create `utils/identity.ts`               | P0       | ⬜ Not Started |
| Implement `isValidPublicKey()`           | P0       | ⬜ Not Started |
| Implement `deriveAddressFromPublicKey()` | P0       | ⬜ Not Started |
| Implement `createIdentity()`             | P0       | ⬜ Not Started |
| Implement `getIdentityLevel()`           | P0       | ⬜ Not Started |
| Implement helper functions               | P1       | ⬜ Not Started |

---

### 1.4 Create Identity Store

**File**: `stores/identity.ts` (NEW)

```typescript
/**
 * Identity Store
 *
 * Manages unified identities across the application.
 * Identities are the source of truth for cryptographic entities.
 */
import { defineStore } from 'pinia'
import type { Identity, SignerCapabilities } from '~/types/identity'
import { createIdentity, isValidPublicKey } from '~/utils/identity'

const STORAGE_KEY = 'lotus:identities'

export const useIdentityStore = defineStore('identity', () => {
  const identities = ref<Map<string, Identity>>(new Map())
  const loaded = ref(false)

  // === GETTERS ===
  const identityList = computed(() => Array.from(identities.value.values()))
  const identityCount = computed(() => identities.value.size)

  // === LOOKUP ACTIONS ===
  function get(publicKeyHex: string): Identity | undefined {
    return identities.value.get(publicKeyHex)
  }

  function findByAddress(address: string): Identity | undefined {
    return identityList.value.find(i => i.address === address)
  }

  function findByPeerId(peerId: string): Identity | undefined {
    return identityList.value.find(i => i.peerId === peerId)
  }

  // === MUTATION ACTIONS ===
  function findOrCreate(
    publicKeyHex: string,
    network: 'livenet' | 'testnet' = 'livenet',
  ): Identity {
    let identity = identities.value.get(publicKeyHex)
    if (!identity) {
      identity = createIdentity(publicKeyHex, network)
      identities.value.set(publicKeyHex, identity)
      save()
    }
    return identity
  }

  function update(
    publicKeyHex: string,
    updates: Partial<Identity>,
  ): Identity | null {
    const identity = identities.value.get(publicKeyHex)
    if (!identity) return null

    const updated = {
      ...identity,
      ...updates,
      publicKeyHex, // Cannot change canonical ID
      updatedAt: Date.now(),
    }
    identities.value.set(publicKeyHex, updated)
    save()
    return updated
  }

  function updatePresence(
    publicKeyHex: string,
    presence: { isOnline: boolean; lastSeenAt?: number },
  ): void {
    const identity = identities.value.get(publicKeyHex)
    if (identity) {
      identity.isOnline = presence.isOnline
      if (presence.lastSeenAt) {
        identity.lastSeenAt = presence.lastSeenAt
      }
      identity.updatedAt = Date.now()
      // Don't save on every presence update (too frequent)
    }
  }

  function updateFromSigner(signer: {
    publicKeyHex: string
    peerId?: string
    multiaddrs?: string[]
    signerCapabilities?: SignerCapabilities
  }): Identity {
    const networkStore = useNetworkStore()
    const identity = findOrCreate(signer.publicKeyHex, networkStore.network)

    if (signer.peerId) identity.peerId = signer.peerId
    if (signer.multiaddrs) identity.multiaddrs = signer.multiaddrs
    if (signer.signerCapabilities) {
      identity.signerCapabilities = signer.signerCapabilities
    }
    identity.isOnline = true
    identity.lastSeenAt = Date.now()
    identity.updatedAt = Date.now()

    save()
    return identity
  }

  function remove(publicKeyHex: string): boolean {
    const deleted = identities.value.delete(publicKeyHex)
    if (deleted) save()
    return deleted
  }

  // === PERSISTENCE ===
  function save(): void {
    if (typeof localStorage === 'undefined') return
    try {
      const data = Array.from(identities.value.entries())
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('[Identity Store] Failed to save:', error)
    }
  }

  function load(): void {
    if (typeof localStorage === 'undefined') return
    if (loaded.value) return

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const entries = JSON.parse(saved) as [string, Identity][]
        identities.value = new Map(entries)
      }
      loaded.value = true
    } catch (error) {
      console.error('[Identity Store] Failed to load:', error)
      loaded.value = true
    }
  }

  // Initialize on creation
  load()

  return {
    // State
    identities,
    loaded,
    // Getters
    identityList,
    identityCount,
    // Lookup
    get,
    findByAddress,
    findByPeerId,
    // Mutations
    findOrCreate,
    update,
    updatePresence,
    updateFromSigner,
    remove,
    // Persistence
    save,
    load,
  }
})
```

| Task                                                          | Priority | Status         |
| ------------------------------------------------------------- | -------- | -------------- |
| Create `stores/identity.ts`                                   | P0       | ⬜ Not Started |
| Implement lookup functions (get, findByAddress, findByPeerId) | P0       | ⬜ Not Started |
| Implement mutation functions (findOrCreate, update)           | P0       | ⬜ Not Started |
| Implement updatePresence and updateFromSigner                 | P0       | ⬜ Not Started |
| Implement persistence (save, load)                            | P0       | ⬜ Not Started |

---

### 1.5 Add Storage Keys

**File**: `services/storage.ts` (MODIFY)

Add new storage keys for identity and account data:

```typescript
export const STORAGE_KEYS = {
  // ... existing keys ...

  // NEW: Identity and account storage
  IDENTITIES: 'lotus:identities',
  DISCOVERY_CACHE: 'lotus:discovery:cache',

  // NEW: Migration tracking
  MIGRATION_VERSION: 'lotus:migration:version',
}
```

| Task                              | Priority | Status         |
| --------------------------------- | -------- | -------------- |
| Add IDENTITIES storage key        | P0       | ⬜ Not Started |
| Add DISCOVERY_CACHE storage key   | P0       | ⬜ Not Started |
| Add MIGRATION_VERSION storage key | P1       | ⬜ Not Started |

---

## Testing Checklist

### Identity Types

- [ ] Identity interface compiles correctly
- [ ] IdentityLevel enum values are correct
- [ ] SignerCapabilities interface is complete

### Account Types

- [ ] AccountPurpose enum has correct values
- [ ] buildDerivationPath generates correct paths
- [ ] DEFAULT_ACCOUNTS has PRIMARY and MUSIG2

### Identity Utilities

- [ ] `isValidPublicKey()` validates correctly
- [ ] `deriveAddressFromPublicKey()` derives correct addresses
- [ ] `createIdentity()` creates valid identities
- [ ] `getIdentityLevel()` returns correct levels

### Identity Store

- [ ] `findOrCreate()` creates new identities
- [ ] `findOrCreate()` returns existing identities
- [ ] `update()` updates identity properties
- [ ] `updateFromSigner()` populates all fields
- [ ] Persistence saves and loads correctly

---

## Files Summary

| File                  | Change Type | Description                   |
| --------------------- | ----------- | ----------------------------- |
| `types/identity.ts`   | NEW         | Identity and capability types |
| `types/accounts.ts`   | NEW         | BIP44 account types           |
| `utils/identity.ts`   | NEW         | Identity utilities            |
| `stores/identity.ts`  | NEW         | Identity store                |
| `services/storage.ts` | MODIFY      | Add storage keys              |

---

## Success Criteria

- [ ] All new types compile without errors
- [ ] Identity store creates and manages identities
- [ ] Address derivation works for all networks
- [ ] Identity persistence works correctly
- [ ] No regressions in existing functionality

---

## Dependencies

- **Bitcore SDK**: Must be loaded for address derivation
- **Network Store**: For determining livenet/testnet

## Dependents

- **Phase 2**: Uses account types
- **Phase 4**: Uses identity store and utilities
- **Phase 5**: Uses identity utilities for MuSig2

---

_Created: December 18, 2025_  
_Status: Pending_
