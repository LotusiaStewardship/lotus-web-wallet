# Unified Identity Model

**Version**: 1.0.1  
**Date**: December 2024  
**Status**: Active

---

## Overview

The identity model is the foundation of the contact-centric architecture. It unifies three previously disconnected concepts—contacts, P2P peers, and MuSig2 signers—into a single coherent identity system.

---

## The Problem: Fragmented Identity

The previous architecture had three separate identity concepts:

| Concept       | Store         | Identifier     | Purpose                  |
| ------------- | ------------- | -------------- | ------------------------ |
| Contact       | `contacts.ts` | `address`      | User-facing name/address |
| P2P Peer      | `p2p.ts`      | `peerId`       | Transport connectivity   |
| MuSig2 Signer | `musig2.ts`   | `publicKeyHex` | Cryptographic signing    |

**Problems**:

1. A signer saved as contact had no address (couldn't derive it)
2. A contact had no public key (couldn't participate in MuSig2)
3. Online status checked `connectedPeers` (direct connections only)
4. No way to link "Alice the contact" with "Alice the signer"

---

## Technical Reference: Public Key Format

> **Source**: `lotus-sdk/lib/bitcore/publickey.ts`

Lotus uses standard secp256k1 elliptic curve cryptography. Public keys can be represented in two formats:

| Format           | Bytes    | Hex Characters | Structure                                    |
| ---------------- | -------- | -------------- | -------------------------------------------- |
| **Compressed**   | 33 bytes | 66 hex chars   | `[prefix: 1 byte][X: 32 bytes]`              |
| **Uncompressed** | 65 bytes | 130 hex chars  | `[prefix: 1 byte][X: 32 bytes][Y: 32 bytes]` |

### Compressed Public Key Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                  COMPRESSED PUBLIC KEY (33 bytes)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Byte 0: Prefix (1 byte)                                         │
│  ─────────────────────                                           │
│  0x02 = Y coordinate is even                                     │
│  0x03 = Y coordinate is odd                                      │
│                                                                  │
│  Bytes 1-32: X coordinate (32 bytes)                             │
│  ───────────────────────────────────                             │
│  Big-endian encoding of the X coordinate                         │
│                                                                  │
│  Example (hex string, 66 characters):                            │
│  02abc123...def456                                               │
│  ││└─────────────┘                                               │
│  ││      └── X coordinate (64 hex chars = 32 bytes)              │
│  │└── Prefix 02 means Y is even                                  │
│  └── Total: 66 hex characters = 33 bytes                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Validation Regex

```typescript
// From lotus-sdk/lib/bitcore/publickey.ts
// Compressed public key: starts with 02 or 03, followed by 64 hex chars
const COMPRESSED_PUBKEY_REGEX = /^0[23][0-9a-fA-F]{64}$/

// This validates:
// - Prefix: 02 or 03 (2 hex chars = 1 byte)
// - X coordinate: 64 hex chars (32 bytes)
// - Total: 66 hex chars (33 bytes)
```

### Key Derivation Chain

```
Private Key (32 bytes)
       │
       ▼ (scalar multiplication with generator point G)
Public Key Point (X, Y coordinates on secp256k1 curve)
       │
       ▼ (compression: keep X, encode Y parity in prefix)
Compressed Public Key (33 bytes / 66 hex chars)
       │
       ▼ (SHA256 + RIPEMD160)
Public Key Hash (20 bytes)
       │
       ▼ (Base58Check or CashAddr encoding)
Lotus Address (e.g., lotus_16PSJ...)
```

---

## The Solution: Unified Identity

### Core Identity Type

```typescript
// types/identity.ts

/**
 * Unified identity representing a person/entity on the Lotus network.
 * The publicKeyHex is the canonical identifier from which other
 * properties are derived.
 */
export interface Identity {
  // === CANONICAL IDENTIFIER ===
  /**
   * Compressed public key in hex format.
   *
   * Format: 66 hex characters (33 bytes)
   * - Prefix: 02 or 03 (indicates Y coordinate parity)
   * - X coordinate: 64 hex chars (32 bytes, big-endian)
   *
   * This is the SOURCE OF TRUTH for the identity.
   * All other identifiers are derived from or linked to this.
   *
   * @see lotus-sdk/lib/bitcore/publickey.ts for implementation
   */
  publicKeyHex: string

  // === DERIVED PROPERTIES ===
  /**
   * Lotus address derived from publicKeyHex.
   * Computed once and cached, not stored separately.
   */
  address: string

  // === P2P CONNECTIVITY ===
  /**
   * libp2p peer ID (optional - only if P2P connected).
   * Links this identity to P2P presence.
   */
  peerId?: string

  /**
   * Multiaddresses for direct connection.
   * Populated from P2P discovery.
   */
  multiaddrs?: string[]

  // === PRESENCE ===
  /**
   * Whether this identity is currently reachable via P2P.
   * Updated by presence system.
   */
  isOnline: boolean

  /**
   * Last time this identity was seen online.
   * Used for "recently online" status.
   */
  lastSeenAt?: number

  // === CAPABILITIES ===
  /**
   * MuSig2 signer capabilities (if advertised).
   * Populated from signer discovery.
   */
  signerCapabilities?: SignerCapabilities

  // === METADATA ===
  /**
   * When this identity was first discovered/created.
   */
  createdAt: number

  /**
   * When this identity was last updated.
   */
  updatedAt: number
}

/**
 * Signer capabilities advertised via P2P.
 */
export interface SignerCapabilities {
  /** Transaction types this signer supports */
  transactionTypes: TransactionType[]

  /** Amount range the signer accepts */
  amountRange?: {
    min?: number
    max?: number
  }

  /** Fee the signer charges (in sats) */
  fee?: number

  /** Whether currently accepting signing requests */
  available: boolean

  /** Advertisement expiry timestamp */
  expiresAt?: number
}

export type TransactionType = 'standard' | 'token' | 'nft' | 'any'
```

### Contact Type (Updated)

```typescript
// types/contact.ts

/**
 * A contact is a NAMED identity with relationship metadata.
 * Contacts wrap identities with user-facing information.
 */
export interface Contact {
  // === IDENTIFICATION ===
  id: string // Internal UUID
  name: string // User-assigned name

  // === IDENTITY LINK ===
  /**
   * Link to the underlying identity.
   * If set, all identity properties come from the Identity.
   * If not set, this is a "legacy" contact with only an address.
   */
  identityId?: string

  // === LEGACY FIELDS (for backward compatibility) ===
  /**
   * @deprecated Use identity.address instead
   * Kept for contacts created before identity unification.
   */
  address: string

  /**
   * @deprecated Use identity.publicKeyHex instead
   */
  publicKey?: string

  /**
   * @deprecated Use identity.peerId instead
   */
  peerId?: string

  // === RELATIONSHIP METADATA ===
  /** User notes about this contact */
  notes?: string

  /** User-assigned tags */
  tags: string[]

  /** Whether this is a favorite contact */
  isFavorite: boolean

  /** Contact group ID */
  groupId?: string

  /** Custom avatar URL */
  avatarUrl?: string

  // === ACTIVITY TRACKING ===
  /** Last transaction timestamp with this contact */
  lastTransactionAt?: number

  /** Total sent to this contact (sats) */
  totalSent?: bigint

  /** Total received from this contact (sats) */
  totalReceived?: bigint

  /** Number of transactions with this contact */
  transactionCount?: number

  // === TIMESTAMPS ===
  createdAt: number
  updatedAt: number
}
```

---

## Identity Resolution

### Public Key → Address Derivation

```typescript
// utils/identity.ts
import { getBitcore } from '~/plugins/bitcore.client'

/**
 * Derive a Lotus address from a compressed public key.
 * This is a pure function - same input always produces same output.
 */
export function deriveAddressFromPublicKey(
  publicKeyHex: string,
  network: 'livenet' | 'testnet' = 'livenet',
): string {
  const Bitcore = getBitcore()
  if (!Bitcore) throw new Error('Bitcore SDK not loaded')

  const { PublicKey, Address } = Bitcore
  const pubKey = new PublicKey(publicKeyHex)
  const address = Address.fromPublicKey(pubKey, network)
  return address.toString()
}

/**
 * Validate a compressed public key format.
 *
 * A valid compressed public key is:
 * - 66 hex characters (representing 33 bytes)
 * - Starts with 02 (Y is even) or 03 (Y is odd)
 * - Followed by 64 hex characters (32-byte X coordinate)
 *
 * @see lotus-sdk/lib/bitcore/publickey.ts lines 178-192
 */
export function isValidPublicKey(publicKeyHex: string): boolean {
  return /^0[23][0-9a-fA-F]{64}$/.test(publicKeyHex)
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

  const now = Date.now()
  return {
    publicKeyHex,
    address: deriveAddressFromPublicKey(publicKeyHex, network),
    isOnline: false,
    createdAt: now,
    updatedAt: now,
  }
}
```

### Identity Lookup

```typescript
// In stores/identity.ts or stores/contacts.ts

/**
 * Find an identity by any identifier.
 * Supports lookup by publicKey, address, or peerId.
 */
function findIdentity(identifier: string): Identity | undefined {
  // Try public key first (canonical)
  let identity = identities.value.get(identifier)
  if (identity) return identity

  // Try address lookup
  identity = Array.from(identities.value.values()).find(
    i => i.address === identifier,
  )
  if (identity) return identity

  // Try peerId lookup
  identity = Array.from(identities.value.values()).find(
    i => i.peerId === identifier,
  )
  return identity
}

/**
 * Find a contact by any identifier.
 */
function findContact(identifier: string): Contact | undefined {
  // Direct ID lookup
  let contact = contacts.value.get(identifier)
  if (contact) return contact

  // Address lookup
  contact = Array.from(contacts.value.values()).find(
    c => c.address === identifier,
  )
  if (contact) return contact

  // Public key lookup
  contact = Array.from(contacts.value.values()).find(
    c => c.publicKey === identifier,
  )
  if (contact) return contact

  // Identity lookup (via identityId)
  const identity = findIdentity(identifier)
  if (identity) {
    contact = Array.from(contacts.value.values()).find(
      c => c.identityId === identity.publicKeyHex,
    )
  }
  return contact
}
```

---

## Identity Sources

Identities can be created from multiple sources:

### 1. P2P Signer Discovery

```typescript
// When a signer is discovered via GossipSub
function handleSignerDiscovered(signer: DiscoveredSigner) {
  const identity = findOrCreateIdentity(signer.publicKeyHex)

  // Update with P2P info
  identity.peerId = signer.peerId
  identity.multiaddrs = signer.multiaddrs
  identity.isOnline = true
  identity.lastSeenAt = Date.now()
  identity.signerCapabilities = {
    transactionTypes: signer.transactionTypes,
    amountRange: signer.amountRange,
    fee: signer.fee,
    available: true,
    expiresAt: signer.expiresAt,
  }
  identity.updatedAt = Date.now()
}
```

### 2. Manual Contact Creation

```typescript
// When user adds a contact with a public key
function addContactWithPublicKey(name: string, publicKeyHex: string) {
  // Create or find identity
  const identity = findOrCreateIdentity(publicKeyHex)

  // Create contact linked to identity
  const contact: Contact = {
    id: generateId('contact'),
    name,
    identityId: identity.publicKeyHex,
    address: identity.address, // Derived, for backward compat
    publicKey: publicKeyHex, // Legacy field
    tags: [],
    isFavorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  contacts.value.set(contact.id, contact)
}
```

### 3. Shared Wallet Participants

```typescript
// When creating a shared wallet, participants become identities
function createSharedWallet(participantPublicKeys: string[]) {
  for (const pubKeyHex of participantPublicKeys) {
    // Ensure identity exists for each participant
    findOrCreateIdentity(pubKeyHex)
  }

  // ... create wallet with participant references
}
```

### 4. Transaction History

```typescript
// When viewing a transaction, resolve addresses to identities
function resolveTransactionParties(tx: Transaction) {
  const sender = findIdentityByAddress(tx.fromAddress)
  const recipient = findIdentityByAddress(tx.toAddress)

  return {
    ...tx,
    senderIdentity: sender,
    recipientIdentity: recipient,
    senderContact: sender ? findContactByIdentity(sender) : undefined,
    recipientContact: recipient ? findContactByIdentity(recipient) : undefined,
  }
}
```

---

## Identity Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     IDENTITY LIFECYCLE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DISCOVERY                                                       │
│  ─────────                                                       │
│  P2P Signer Advertisement ──┐                                    │
│  Manual Public Key Entry ───┼──▶ CREATE IDENTITY                 │
│  Shared Wallet Creation ────┘         │                          │
│                                       ▼                          │
│  ENRICHMENT                    ┌─────────────┐                   │
│  ──────────                    │  Identity   │                   │
│  P2P Presence Updates ─────────│  (pubKey)   │                   │
│  Signer Capability Updates ────│  (address)  │                   │
│  Connection State Changes ─────│  (peerId)   │                   │
│                                └──────┬──────┘                   │
│                                       │                          │
│  ASSOCIATION                          ▼                          │
│  ───────────               ┌─────────────────┐                   │
│  User Names Contact ───────│    Contact      │                   │
│  User Adds to Group ───────│  (name, notes)  │                   │
│  User Marks Favorite ──────│  (tags, group)  │                   │
│                            └─────────────────┘                   │
│                                       │                          │
│  USAGE                                ▼                          │
│  ─────                     ┌─────────────────┐                   │
│  Send Transaction ─────────│   Activities    │                   │
│  Create Shared Wallet ─────│  (tx history)   │                   │
│  Request Signature ────────│  (shared wallets)│                  │
│                            └─────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Relationship Levels

Identities have different "completeness" levels based on available information:

```typescript
// utils/identity.ts

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

export function getIdentityLevel(identity: Identity | Contact): IdentityLevel {
  // Check if it's a legacy contact without identity
  if ('identityId' in identity && !identity.identityId) {
    return IdentityLevel.ADDRESS_ONLY
  }

  const id = 'publicKeyHex' in identity ? identity : null
  if (!id) return IdentityLevel.ADDRESS_ONLY

  if (id.signerCapabilities?.available) {
    return IdentityLevel.ACTIVE_SIGNER
  }

  if (id.peerId) {
    return IdentityLevel.P2P_CONNECTED
  }

  if (id.publicKeyHex) {
    return IdentityLevel.PUBLIC_KEY
  }

  return IdentityLevel.ADDRESS_ONLY
}

export function canParticipateInMuSig2(identity: Identity | Contact): boolean {
  return getIdentityLevel(identity) >= IdentityLevel.PUBLIC_KEY
}

export function canCheckPresence(identity: Identity | Contact): boolean {
  return getIdentityLevel(identity) >= IdentityLevel.P2P_CONNECTED
}
```

---

## Storage Strategy

### Identity Persistence

```typescript
// Identities are stored separately from contacts
const STORAGE_KEYS = {
  IDENTITIES: 'lotus:identities',
  CONTACTS: 'lotus:contacts',
}

function saveIdentities() {
  const data = Array.from(identities.value.entries())
  localStorage.setItem(STORAGE_KEYS.IDENTITIES, JSON.stringify(data))
}

function loadIdentities() {
  const saved = localStorage.getItem(STORAGE_KEYS.IDENTITIES)
  if (saved) {
    const entries = JSON.parse(saved) as [string, Identity][]
    identities.value = new Map(entries)
  }
}
```

### Migration from Legacy Contacts

```typescript
// Migrate contacts that have publicKey but no identityId
function migrateContacts() {
  for (const contact of contacts.value.values()) {
    if (contact.publicKey && !contact.identityId) {
      // Create identity from public key
      const identity = findOrCreateIdentity(contact.publicKey)

      // Link contact to identity
      contact.identityId = identity.publicKeyHex
      contact.updatedAt = Date.now()
    }
  }
  saveContacts()
}
```

---

## Summary

The unified identity model provides:

1. **Single Source of Truth**: Public key is the canonical identifier
2. **Automatic Derivation**: Address computed from public key
3. **Cross-Feature Linking**: Same identity across contacts, P2P, MuSig2
4. **Progressive Enhancement**: Identities gain capabilities over time
5. **Backward Compatibility**: Legacy contacts continue to work

---

_Next: [02_CONTACT_SYSTEM.md](./02_CONTACT_SYSTEM.md)_
