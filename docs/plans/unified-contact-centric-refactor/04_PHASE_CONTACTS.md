# Phase 4: Contact System Refactor

**Version**: 1.0.0  
**Date**: December 18, 2025  
**Status**: Pending  
**Estimated Effort**: 1-2 weeks  
**Dependencies**: Phase 1 (Foundation)

---

## Overview

This phase refactors the contact system to link contacts with unified identities. It implements automatic address derivation from public keys and multi-signal online status detection.

---

## Goals

1. Link contacts to unified identities via `identityId`
2. Implement automatic address derivation when adding contacts
3. Fix contacts saved from signers having empty addresses
4. Implement multi-signal online status detection

---

## Issues Addressed

| Issue                    | Description                           | Priority |
| ------------------------ | ------------------------------------- | -------- |
| Empty addresses          | Contacts from signers have no address | HIGH     |
| Fragmented identity      | No link between contact and identity  | HIGH     |
| Incorrect offline status | Only checks direct P2P connections    | MEDIUM   |
| No address derivation    | Must manually enter address           | MEDIUM   |

---

## Tasks

### 4.1 Update Contact Type

**File**: `types/contact.ts` (MODIFY)

```typescript
export interface Contact {
  // === IDENTIFICATION ===
  id: string
  name: string

  // === IDENTITY LINK (NEW) ===
  /**
   * Reference to unified identity (publicKeyHex).
   * When set, identity properties come from the Identity store.
   */
  identityId?: string

  // === ADDRESS ===
  /**
   * Lotus address for this contact.
   * - If identityId is set: derived from identity's publicKey
   * - If identityId is not set: stored directly (legacy contact)
   */
  address: string

  // === RELATIONSHIP METADATA ===
  notes?: string
  tags: string[]
  isFavorite: boolean
  groupId?: string
  avatarUrl?: string

  // === ACTIVITY TRACKING (unchanged) ===
  lastTransactionAt?: number
  totalSent?: bigint
  totalReceived?: bigint
  transactionCount?: number

  // === TIMESTAMPS ===
  createdAt: number
  updatedAt: number
}

/**
 * Contact with resolved identity information
 */
export interface ContactWithIdentity extends Contact {
  identity?: Identity
  isOnline: boolean
  canMuSig2: boolean
  level: IdentityLevel
}
```

| Task                                      | Priority | Status         |
| ----------------------------------------- | -------- | -------------- |
| Add `identityId` field to Contact         | P0       | ⬜ Not Started |
| Add deprecation comments to legacy fields | P1       | ⬜ Not Started |
| Create ContactWithIdentity interface      | P0       | ⬜ Not Started |

---

### 4.2 Update Contact Store - Add Contact

**File**: `stores/contacts.ts` (MODIFY)

```typescript
import { useIdentityStore } from './identity'
import { useNetworkStore } from './network'
import { isValidPublicKey, deriveAddressFromPublicKey } from '~/utils/identity'

/**
 * Add a new contact.
 * If publicKey is provided, creates/links to an Identity and derives address.
 */
async function addContact(
  data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Contact> {
  const identityStore = useIdentityStore()
  const networkStore = useNetworkStore()

  let identityId: string | undefined
  let derivedAddress = data.address

  // If public key provided, create/link identity and derive address
  if (data.publicKey && isValidPublicKey(data.publicKey)) {
    const identity = identityStore.findOrCreate(
      data.publicKey,
      networkStore.network,
    )
    identityId = identity.publicKeyHex
    derivedAddress = identity.address

    // Copy P2P info to identity if present
    if (data.peerId) {
      identityStore.update(identity.publicKeyHex, {
        peerId: data.peerId,
      })
    }

    if (data.signerCapabilities) {
      identityStore.update(identity.publicKeyHex, {
        signerCapabilities: data.signerCapabilities,
      })
    }
  }

  // Check for duplicate address
  if (derivedAddress) {
    const existing = findByAddress(derivedAddress)
    if (existing) {
      throw new Error(`Contact already exists: ${existing.name}`)
    }
  }

  const now = Date.now()
  const contact: Contact = {
    ...data,
    id: generateId('contact'),
    identityId,
    address: derivedAddress || '',
    tags: data.tags || [],
    isFavorite: data.isFavorite || false,
    createdAt: now,
    updatedAt: now,
  }

  contacts.value.set(contact.id, contact)
  saveContacts()

  console.log('[Contacts] Added contact:', {
    name: contact.name,
    hasIdentity: !!identityId,
    address: contact.address?.slice(0, 20) + '...',
  })

  return contact
}
```

| Task                                     | Priority | Status         |
| ---------------------------------------- | -------- | -------------- |
| Update `addContact()` to create identity | P0       | ⬜ Not Started |
| Derive address from public key           | P0       | ⬜ Not Started |
| Copy P2P info to identity                | P0       | ⬜ Not Started |
| Check for duplicate addresses            | P1       | ⬜ Not Started |

---

### 4.3 Update Contact Store - From Signer

**File**: `stores/contacts.ts` (MODIFY)

```typescript
/**
 * Create a contact from a discovered signer.
 * Automatically derives address from signer's public key.
 */
async function addFromSigner(signer: DiscoveredSigner): Promise<Contact> {
  // Check if contact already exists
  const existing = findByPublicKey(signer.publicKeyHex)
  if (existing) {
    console.log('[Contacts] Contact already exists for signer:', existing.name)
    return existing
  }

  return addContact({
    name: signer.nickname || `Signer ${signer.publicKeyHex.slice(0, 8)}`,
    address: '', // Will be derived from publicKey
    publicKey: signer.publicKeyHex,
    peerId: signer.peerId,
    signerCapabilities: {
      transactionTypes: signer.transactionTypes,
      amountRange: signer.amountRange,
      fee: signer.fee,
      available: true,
      expiresAt: signer.expiresAt,
    },
    tags: ['signer'],
    isFavorite: false,
  })
}
```

| Task                        | Priority | Status         |
| --------------------------- | -------- | -------------- |
| Implement `addFromSigner()` | P0       | ⬜ Not Started |
| Check for existing contact  | P0       | ⬜ Not Started |
| Auto-tag as 'signer'        | P1       | ⬜ Not Started |

---

### 4.4 Implement Multi-Signal Online Status

**File**: `stores/contacts.ts` (MODIFY)

```typescript
const RECENTLY_ONLINE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

type OnlineStatus = 'online' | 'recently_online' | 'offline' | 'unknown'

/**
 * Get online status for a contact using multiple signals:
 * 1. Direct P2P connection
 * 2. Identity presence state
 * 3. Recent lastSeenOnline timestamp
 */
function getOnlineStatus(contact: Contact): OnlineStatus {
  const identityStore = useIdentityStore()
  const p2pStore = useP2PStore()

  // Get identity if linked
  const identity = contact.identityId
    ? identityStore.get(contact.identityId)
    : null

  // Signal 1: Direct P2P connection
  const peerId = identity?.peerId || contact.peerId
  if (peerId && p2pStore.connectedPeers.some(p => p.peerId === peerId)) {
    return 'online'
  }

  // Signal 2: Identity presence state
  if (identity?.isOnline) {
    return 'online'
  }

  // Signal 3: Recent lastSeenOnline
  const lastSeen = identity?.lastSeenAt
  if (lastSeen) {
    const timeSinceLastSeen = Date.now() - lastSeen
    if (timeSinceLastSeen < RECENTLY_ONLINE_THRESHOLD) {
      return 'recently_online'
    }
  }

  // Signal 4: Has P2P info but not online
  if (peerId || identity?.peerId) {
    return 'offline'
  }

  return 'unknown'
}

/**
 * Check if a contact is currently online
 */
function isOnline(contact: Contact): boolean {
  return getOnlineStatus(contact) === 'online'
}

/**
 * Get contacts with resolved identity information
 */
const contactsWithIdentity = computed((): ContactWithIdentity[] => {
  const identityStore = useIdentityStore()

  return contactList.value.map(contact => {
    const identity = contact.identityId
      ? identityStore.get(contact.identityId)
      : undefined

    return {
      ...contact,
      identity,
      isOnline: getOnlineStatus(contact) === 'online',
      canMuSig2: !!identity?.publicKeyHex || !!contact.publicKey,
      level: identity ? getIdentityLevel(identity) : IdentityLevel.ADDRESS_ONLY,
    }
  })
})

/**
 * Get online contacts
 */
const onlineContacts = computed(() => {
  return contactsWithIdentity.value.filter(c => c.isOnline)
})

/**
 * Get contacts eligible for MuSig2
 */
const signerContacts = computed(() => {
  return contactsWithIdentity.value.filter(c => c.canMuSig2)
})
```

| Task                                            | Priority | Status         |
| ----------------------------------------------- | -------- | -------------- |
| Implement `getOnlineStatus()` with multi-signal | P0       | ⬜ Not Started |
| Add `contactsWithIdentity` computed             | P0       | ⬜ Not Started |
| Add `onlineContacts` computed                   | P1       | ⬜ Not Started |
| Add `signerContacts` computed                   | P1       | ⬜ Not Started |

---

### 4.5 Implement Lookup Functions

**File**: `stores/contacts.ts` (MODIFY)

```typescript
/**
 * Find contact by address
 */
function findByAddress(address: string): Contact | undefined {
  return contactList.value.find(c => c.address === address)
}

/**
 * Find contact by public key (checks both identityId and legacy publicKey)
 */
function findByPublicKey(publicKey: string): Contact | undefined {
  return contactList.value.find(
    c => c.identityId === publicKey || c.publicKey === publicKey,
  )
}

/**
 * Find contact by peer ID (checks identity and legacy peerId)
 */
function findByPeerId(peerId: string): Contact | undefined {
  const identityStore = useIdentityStore()

  // Check legacy field first
  const legacy = contactList.value.find(c => c.peerId === peerId)
  if (legacy) return legacy

  // Check via identity
  const identity = identityStore.findByPeerId(peerId)
  if (identity) {
    return contactList.value.find(c => c.identityId === identity.publicKeyHex)
  }

  return undefined
}

/**
 * Get contact with resolved identity
 */
function getContactWithIdentity(id: string): ContactWithIdentity | undefined {
  const contact = contacts.value.get(id)
  if (!contact) return undefined

  const identityStore = useIdentityStore()
  const identity = contact.identityId
    ? identityStore.get(contact.identityId)
    : undefined

  return {
    ...contact,
    identity,
    isOnline: getOnlineStatus(contact) === 'online',
    canMuSig2: !!identity?.publicKeyHex || !!contact.publicKey,
    level: identity ? getIdentityLevel(identity) : IdentityLevel.ADDRESS_ONLY,
  }
}
```

| Task                                 | Priority | Status         |
| ------------------------------------ | -------- | -------------- |
| Implement `findByAddress()`          | P0       | ⬜ Not Started |
| Implement `findByPublicKey()`        | P0       | ⬜ Not Started |
| Implement `findByPeerId()`           | P0       | ⬜ Not Started |
| Implement `getContactWithIdentity()` | P0       | ⬜ Not Started |

---

## Testing Checklist

### Address Derivation

- [ ] Adding contact with public key derives correct address
- [ ] Address matches what would be derived manually
- [ ] Works for both livenet and testnet

### Identity Linking

- [ ] New contacts get identityId when public key provided
- [ ] Identity store contains identity after contact creation
- [ ] P2P info copied to identity

### Online Status

- [ ] Direct P2P connection shows as "online"
- [ ] Identity.isOnline shows as "online"
- [ ] Recent lastSeenAt shows as "recently_online"
- [ ] No P2P info shows as "unknown"

---

## Files Summary

| File                 | Change Type | Description                         |
| -------------------- | ----------- | ----------------------------------- |
| `types/contact.ts`   | MODIFY      | Add identityId, ContactWithIdentity |
| `stores/contacts.ts` | MODIFY      | Identity integration, online status |

---

## Success Criteria

- [ ] Contacts from signers have valid addresses
- [ ] Contacts linked to identities via identityId
- [ ] Multi-signal online status works correctly
- [ ] All tests pass

---

## Dependencies

- **Phase 1**: Identity store and utilities

## Dependents

- **Phase 5**: Uses contact-identity linking for MuSig2
- **Phase 6**: Uses ContactWithIdentity for UI

---

_Created: December 18, 2025_  
_Status: Pending_
