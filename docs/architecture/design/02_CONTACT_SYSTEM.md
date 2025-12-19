# Contact System Design

**Version**: 1.0.0  
**Date**: December 2024  
**Status**: Active

---

## Overview

The contact system is the **user-facing layer** of the identity model. While identities represent cryptographic entities, contacts represent **human relationships** with names, notes, groups, and interaction history.

---

## Design Principles

### 1. Contacts Are Relationships, Not Records

A contact is more than stored data—it represents an ongoing relationship:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTACT = RELATIONSHIP                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      ALICE                                │   │
│  │  ────────────────────────────────────────────────────────│   │
│  │                                                           │   │
│  │  WHO: "Alice (my sister)"                                 │   │
│  │       👤 Name, avatar, notes                              │   │
│  │                                                           │   │
│  │  HOW: lotus_16PSJ...abc123                                │   │
│  │       🔑 Public key, address, P2P presence                │   │
│  │                                                           │   │
│  │  WHAT: 🔐 MuSig2 signer, shared wallet participant        │   │
│  │        💰 Can send/receive, request signatures            │   │
│  │                                                           │   │
│  │  HISTORY: 12 transactions, 500 XPI sent, 200 XPI received │   │
│  │           Last: 2 days ago                                │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Identity-Backed When Possible

Contacts should link to identities when a public key is known:

```typescript
// Preferred: Identity-backed contact
const aliceContact = {
  id: 'contact-123',
  name: 'Alice',
  identityId: '02abc...def', // Links to Identity
  address: 'lotus_16PSJ...', // Derived from identity
  // ... relationship metadata
}

// Legacy: Address-only contact
const legacyContact = {
  id: 'contact-456',
  name: 'Old Friend',
  identityId: undefined, // No identity link
  address: 'lotus_16PSJ...', // Stored directly
  // ... relationship metadata
}
```

### 3. Rich Relationship Metadata

Contacts store information that identities don't:

- **User-assigned name** (not the signer's advertised nickname)
- **Personal notes** ("Met at conference", "Business partner")
- **Organization** (groups, tags, favorites)
- **Interaction history** (transaction stats)

---

## Contact Data Model

### Complete Contact Interface

```typescript
// types/contact.ts

export interface Contact {
  // === IDENTIFICATION ===
  /** Unique contact ID (UUID) */
  id: string

  /** User-assigned display name */
  name: string

  // === IDENTITY LINK ===
  /**
   * Reference to unified identity (publicKeyHex).
   * When set, identity properties (address, presence, capabilities)
   * come from the Identity store.
   */
  identityId?: string

  // === ADDRESS (required) ===
  /**
   * Lotus address for this contact.
   * - If identityId is set: derived from identity's publicKey
   * - If identityId is not set: stored directly (legacy contact)
   */
  address: string

  /**
   * Network-specific addresses (optional).
   */
  addresses?: {
    livenet?: string
    testnet?: string
  }

  // === LEGACY IDENTITY FIELDS ===
  // Kept for backward compatibility with pre-unification contacts

  /** @deprecated Use identityId → Identity.publicKeyHex */
  publicKey?: string

  /** @deprecated Use identityId → Identity.peerId */
  peerId?: string

  /** @deprecated Use identityId → Identity.signerCapabilities */
  signerCapabilities?: SignerCapabilities

  // === RELATIONSHIP METADATA ===
  /** Personal notes about this contact */
  notes?: string

  /** User-assigned tags for filtering */
  tags: string[]

  /** Whether this is a favorite contact */
  isFavorite: boolean

  /** Contact group membership */
  groupId?: string

  /** Custom avatar URL (overrides generated avatar) */
  avatarUrl?: string

  // === ACTIVITY TRACKING ===
  /** Timestamp of last transaction with this contact */
  lastTransactionAt?: number

  /** Total satoshis sent to this contact */
  totalSent?: bigint

  /** Total satoshis received from this contact */
  totalReceived?: bigint

  /** Number of transactions with this contact */
  transactionCount?: number

  // === TIMESTAMPS ===
  /** When this contact was created */
  createdAt: number

  /** When this contact was last updated */
  updatedAt: number
}
```

### Contact Group Interface

```typescript
export interface ContactGroup {
  /** Unique group ID */
  id: string

  /** Group display name */
  name: string

  /** Icon identifier (Lucide icon name) */
  icon: string

  /** Color for UI display */
  color: string

  /** Contact IDs in this group */
  contactIds: string[]

  /**
   * Optional: Shared wallet associated with this group.
   * When a group has a shared wallet, all members are participants.
   */
  sharedWalletId?: string

  createdAt: number
  updatedAt: number
}
```

---

## Contact Store Design

### State Structure

```typescript
// stores/contacts.ts

interface ContactsState {
  // Core data
  contacts: Map<string, Contact>
  groups: Map<string, ContactGroup>

  // UI state
  searchQuery: string
  activeFilter: ContactFilter
  selectedContactId: string | null
}

type ContactFilter =
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'signers' }
  | { type: 'group'; groupId: string }
  | { type: 'online' }
```

### Computed Properties

```typescript
export const useContactsStore = defineStore('contacts', () => {
  // === STATE ===
  const contacts = ref<Map<string, Contact>>(new Map())
  const groups = ref<Map<string, ContactGroup>>(new Map())
  const searchQuery = ref('')
  const activeFilter = ref<ContactFilter>({ type: 'all' })

  // === BASIC GETTERS ===
  const contactList = computed(() => Array.from(contacts.value.values()))

  const groupList = computed(() => Array.from(groups.value.values()))

  // === FILTERED GETTERS ===
  const favorites = computed(() => contactList.value.filter(c => c.isFavorite))

  /**
   * Contacts eligible for MuSig2 (have public key).
   * Uses identity system to check eligibility.
   */
  const signers = computed(() => {
    const identityStore = useIdentityStore()
    return contactList.value.filter(c => {
      if (c.identityId) {
        const identity = identityStore.get(c.identityId)
        return identity && canParticipateInMuSig2(identity)
      }
      // Legacy: check publicKey field
      return !!c.publicKey && isValidPublicKey(c.publicKey)
    })
  })

  /**
   * Contacts currently online via P2P.
   */
  const online = computed(() => {
    const identityStore = useIdentityStore()
    return contactList.value.filter(c => {
      if (c.identityId) {
        const identity = identityStore.get(c.identityId)
        return identity?.isOnline
      }
      return false
    })
  })

  /**
   * Recently active contacts (transaction in last 30 days).
   */
  const recentlyActive = computed(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    return contactList.value
      .filter(c => c.lastTransactionAt && c.lastTransactionAt > thirtyDaysAgo)
      .sort((a, b) => (b.lastTransactionAt || 0) - (a.lastTransactionAt || 0))
  })

  /**
   * Filtered and searched contacts based on current UI state.
   */
  const filteredContacts = computed(() => {
    let result = contactList.value

    // Apply filter
    switch (activeFilter.value.type) {
      case 'favorites':
        result = result.filter(c => c.isFavorite)
        break
      case 'signers':
        result = signers.value
        break
      case 'group':
        result = result.filter(c => c.groupId === activeFilter.value.groupId)
        break
      case 'online':
        result = online.value
        break
    }

    // Apply search
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.address.toLowerCase().includes(query) ||
          c.notes?.toLowerCase().includes(query) ||
          c.tags.some(t => t.toLowerCase().includes(query)),
      )
    }

    // Sort: favorites first, then by name
    return result.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  })

  // ... actions defined below
})
```

### Actions

```typescript
// Contact CRUD operations

/**
 * Add a new contact.
 * If publicKey is provided, creates/links to an Identity.
 */
async function addContact(
  data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Contact> {
  const identityStore = useIdentityStore()
  const networkStore = useNetworkStore()

  // If public key provided, create/link identity
  let identityId: string | undefined
  let derivedAddress = data.address

  if (data.publicKey && isValidPublicKey(data.publicKey)) {
    const identity = identityStore.findOrCreate(
      data.publicKey,
      networkStore.network,
    )
    identityId = identity.publicKeyHex
    derivedAddress = identity.address
  }

  // Check for duplicate address
  const existing = findByAddress(derivedAddress)
  if (existing) {
    throw new Error(`Contact already exists: ${existing.name}`)
  }

  const now = Date.now()
  const contact: Contact = {
    ...data,
    id: generateId('contact'),
    identityId,
    address: derivedAddress,
    tags: data.tags || [],
    isFavorite: data.isFavorite || false,
    createdAt: now,
    updatedAt: now,
  }

  contacts.value.set(contact.id, contact)
  saveContacts()

  return contact
}

/**
 * Update an existing contact.
 */
function updateContact(id: string, updates: Partial<Contact>): Contact | null {
  const contact = contacts.value.get(id)
  if (!contact) return null

  // If updating publicKey, update identity link
  if (updates.publicKey && isValidPublicKey(updates.publicKey)) {
    const identityStore = useIdentityStore()
    const networkStore = useNetworkStore()
    const identity = identityStore.findOrCreate(
      updates.publicKey,
      networkStore.network,
    )
    updates.identityId = identity.publicKeyHex
    updates.address = identity.address
  }

  const updated: Contact = {
    ...contact,
    ...updates,
    updatedAt: Date.now(),
  }

  contacts.value.set(id, updated)
  saveContacts()

  return updated
}

/**
 * Delete a contact.
 * Does NOT delete the underlying identity (may be used elsewhere).
 */
function deleteContact(id: string): boolean {
  const deleted = contacts.value.delete(id)
  if (deleted) saveContacts()
  return deleted
}

/**
 * Create a contact from a discovered signer.
 */
async function addFromSigner(signer: DiscoveredSigner): Promise<Contact> {
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
    },
    tags: ['signer'],
    isFavorite: false,
  })
}

/**
 * Record a transaction with a contact.
 * Updates activity tracking fields.
 */
function recordTransaction(
  address: string,
  amount: bigint,
  isSend: boolean,
  timestamp: number,
): void {
  const contact = findByAddress(address)
  if (!contact) return

  contact.lastTransactionAt = timestamp
  contact.transactionCount = (contact.transactionCount || 0) + 1

  if (isSend) {
    contact.totalSent = (contact.totalSent || 0n) + amount
  } else {
    contact.totalReceived = (contact.totalReceived || 0n) + amount
  }

  contact.updatedAt = Date.now()
  saveContacts()
}
```

### Lookup Functions

```typescript
/**
 * Find contact by address.
 */
function findByAddress(address: string): Contact | undefined {
  return contactList.value.find(
    c =>
      c.address === address ||
      c.addresses?.livenet === address ||
      c.addresses?.testnet === address,
  )
}

/**
 * Find contact by public key.
 */
function findByPublicKey(publicKey: string): Contact | undefined {
  return contactList.value.find(
    c => c.publicKey === publicKey || c.identityId === publicKey,
  )
}

/**
 * Find contact by peer ID.
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
 * Get contact with resolved identity information.
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
    isOnline: identity?.isOnline || false,
    canMuSig2: identity
      ? canParticipateInMuSig2(identity)
      : !!contact.publicKey,
    level: identity ? getIdentityLevel(identity) : IdentityLevel.ADDRESS_ONLY,
  }
}
```

---

## Contact UI Components

### Contact Card

The contact card is the primary display component:

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  👤 Alice                                    ⭐ 🟢 🔐      │ │
│  │  lotus_16PSJ...abc123                                      │ │
│  │  Last: Sent 100 XPI • 2 days ago                           │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │  [Send]  [Request Signature]  [View]                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Legend:                                                         │
│  ⭐ = Favorite                                                   │
│  🟢 = Online (P2P connected)                                     │
│  🔐 = MuSig2 eligible (has public key)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Contact Detail View

```
┌─────────────────────────────────────────────────────────────────┐
│                         ALICE                                    │
│                    lotus_16PSJ...abc123                          │
│                         🟢 Online                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  QUICK ACTIONS                                                   │
│  ─────────────                                                   │
│  [💸 Send]  [🔐 Request Signature]  [📋 Copy Address]           │
│                                                                  │
│  STATS                                                           │
│  ─────                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │    12    │  │  500 XPI │  │  200 XPI │                       │
│  │   Txns   │  │   Sent   │  │ Received │                       │
│  └──────────┘  └──────────┘  └──────────┘                       │
│                                                                  │
│  SHARED WALLETS                                                  │
│  ──────────────                                                  │
│  • Family Fund (with Alice, Bob)                                 │
│  • Business Account (with Alice, Carol)                          │
│  [+ Create Shared Wallet]                                        │
│                                                                  │
│  CAPABILITIES                                                    │
│  ────────────                                                    │
│  🔐 MuSig2 Signer                                               │
│  • Transaction types: standard, token                            │
│  • Fee: 100 sats                                                 │
│                                                                  │
│  RECENT ACTIVITY                                                 │
│  ───────────────                                                 │
│  • Sent 100 XPI - 2 days ago                                     │
│  • Received 50 XPI - 1 week ago                                  │
│  • Signed tx together - 2 weeks ago                              │
│                                                                  │
│  NOTES                                                           │
│  ─────                                                           │
│  "My sister, met at family reunion"                              │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  [✏️ Edit]  [🗑️ Delete]                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Contact Integration Points

### 1. Send Flow

```typescript
// When sending, resolve recipient to contact
const recipientContact = computed(() => {
  if (!recipientAddress.value) return null
  return contactStore.findByAddress(recipientAddress.value)
})

// Show contact info in send confirmation
// "Send 100 XPI to Alice (lotus_16PSJ...)"
```

### 2. Transaction History

```typescript
// Annotate transactions with contact info
const annotatedTransactions = computed(() => {
  return transactions.value.map(tx => ({
    ...tx,
    contact: contactStore.findByAddress(
      tx.type === 'send' ? tx.toAddress : tx.fromAddress,
    ),
  }))
})
```

### 3. Shared Wallet Creation

```typescript
// Filter to MuSig2-eligible contacts
const eligibleContacts = computed(() => contactStore.signers)

// Pre-select contact if navigating from contact detail
const preselectedContact = computed(() => {
  const contactId = route.query.createWith as string
  return contactId ? contactStore.contacts.get(contactId) : null
})
```

### 4. P2P Signer Discovery

```typescript
// When discovering a signer, check if already a contact
function handleSignerDiscovered(signer: DiscoveredSigner) {
  const existingContact = contactStore.findByPublicKey(signer.publicKeyHex)

  if (existingContact) {
    // Update existing contact's identity
    // (handled by identity store)
  } else {
    // Show "Add to Contacts" option in UI
  }
}
```

### 5. Explorer Address Display

```typescript
// When viewing an address in explorer, show contact info
const addressContact = computed(() => contactStore.findByAddress(props.address))

// Display: "lotus_16PSJ... (Alice)" or just "lotus_16PSJ..."
```

---

## Summary

The contact system provides:

1. **Human-Readable Layer**: Names and notes on top of cryptographic identities
2. **Relationship Tracking**: Transaction history and interaction stats
3. **Organization**: Groups, tags, and favorites
4. **Cross-Feature Integration**: Contacts appear throughout the app
5. **Progressive Enhancement**: Works with or without full identity

---

_Next: [03_RELATIONSHIP_LAYERS.md](./03_RELATIONSHIP_LAYERS.md)_
