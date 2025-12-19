# Migration Guide: Wallet-Centric to Contact-Centric

**Version**: 1.0.0  
**Date**: December 2024  
**Status**: Active

---

## Overview

This guide outlines the migration path from the current wallet-centric architecture to the new contact-centric design. It provides a phased approach to minimize disruption while progressively implementing the new patterns.

---

## Migration Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION PHASES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PHASE 1: FOUNDATION                                             │
│  ═══════════════════                                             │
│  • Create Identity store                                         │
│  • Add identity types                                            │
│  • Implement address derivation                                  │
│  Duration: 1 week                                                │
│                                                                  │
│  PHASE 2: CONTACT ENHANCEMENT                                    │
│  ════════════════════════════                                    │
│  • Link contacts to identities                                   │
│  • Migrate existing contacts                                     │
│  • Update contact store                                          │
│  Duration: 1-2 weeks                                             │
│                                                                  │
│  PHASE 3: P2P INTEGRATION                                        │
│  ════════════════════════                                        │
│  • Connect P2P discovery to identities                           │
│  • Update presence tracking                                      │
│  • Signer → Contact flow                                         │
│  Duration: 1 week                                                │
│                                                                  │
│  PHASE 4: MUSIG2 INTEGRATION                                     │
│  ═══════════════════════════                                     │
│  • Shared wallet participants use identities                     │
│  • Contact-based participant selection                           │
│  • Signing session contact resolution                            │
│  Duration: 1-2 weeks                                             │
│                                                                  │
│  PHASE 5: UI UPDATES                                             │
│  ═══════════════════                                             │
│  • Contact-aware address display                                 │
│  • Updated navigation                                            │
│  • New contact components                                        │
│  Duration: 2-3 weeks                                             │
│                                                                  │
│  PHASE 6: CLEANUP                                                │
│  ═══════════════                                                 │
│  • Remove deprecated patterns                                    │
│  • Update documentation                                          │
│  • Final testing                                                 │
│  Duration: 1 week                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation

### 1.1 Create Identity Types

```typescript
// types/identity.ts (NEW FILE)

export interface Identity {
  publicKeyHex: string
  address: string
  peerId?: string
  multiaddrs?: string[]
  isOnline: boolean
  lastSeenAt?: number
  signerCapabilities?: SignerCapabilities
  createdAt: number
  updatedAt: number
}

export interface SignerCapabilities {
  transactionTypes: TransactionType[]
  amountRange?: { min?: number; max?: number }
  fee?: number
  available: boolean
  expiresAt?: number
}

export type TransactionType = 'standard' | 'token' | 'nft' | 'any'

export enum IdentityLevel {
  ADDRESS_ONLY = 0,
  PUBLIC_KEY = 1,
  P2P_CONNECTED = 2,
  ACTIVE_SIGNER = 3,
}
```

### 1.2 Create Identity Utilities

```typescript
// utils/identity.ts (NEW FILE)

import { getBitcore } from '~/plugins/bitcore.client'
import type { Identity } from '~/types/identity'

/**
 * Validate a compressed public key format.
 *
 * A valid compressed public key is:
 * - 66 hex characters (representing 33 bytes)
 * - Starts with 02 (Y is even) or 03 (Y is odd)
 * - Followed by 64 hex characters (32-byte X coordinate)
 *
 * @see lotus-sdk/lib/bitcore/publickey.ts
 */
export function isValidPublicKey(publicKeyHex: string): boolean {
  return /^0[23][0-9a-fA-F]{64}$/.test(publicKeyHex)
}

export function deriveAddressFromPublicKey(
  publicKeyHex: string,
  network: 'livenet' | 'testnet' = 'livenet',
): string {
  const Bitcore = getBitcore()
  if (!Bitcore) throw new Error('Bitcore SDK not loaded')

  const { PublicKey, Address } = Bitcore
  const pubKey = new PublicKey(publicKeyHex)
  return Address.fromPublicKey(pubKey, network).toString()
}

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
```

### 1.3 Create Identity Store

```typescript
// stores/identity.ts (NEW FILE)

import { defineStore } from 'pinia'
import type { Identity } from '~/types/identity'
import { createIdentity, isValidPublicKey } from '~/utils/identity'

const STORAGE_KEY = 'lotus:identities'

export const useIdentityStore = defineStore('identity', () => {
  const identities = ref<Map<string, Identity>>(new Map())
  const networkStore = useNetworkStore()

  // === GETTERS ===
  const identityList = computed(() => Array.from(identities.value.values()))

  // === ACTIONS ===
  function get(publicKeyHex: string): Identity | undefined {
    return identities.value.get(publicKeyHex)
  }

  function findByAddress(address: string): Identity | undefined {
    return identityList.value.find(i => i.address === address)
  }

  function findByPeerId(peerId: string): Identity | undefined {
    return identityList.value.find(i => i.peerId === peerId)
  }

  function findOrCreate(publicKeyHex: string): Identity {
    let identity = identities.value.get(publicKeyHex)
    if (!identity) {
      identity = createIdentity(publicKeyHex, networkStore.network)
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
    const identity = findOrCreate(signer.publicKeyHex)

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

  // === PERSISTENCE ===
  function save(): void {
    const data = Array.from(identities.value.entries())
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function load(): void {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const entries = JSON.parse(saved) as [string, Identity][]
        identities.value = new Map(entries)
      } catch (e) {
        console.error('Failed to load identities:', e)
      }
    }
  }

  // Initialize
  load()

  return {
    identities,
    identityList,
    get,
    findByAddress,
    findByPeerId,
    findOrCreate,
    update,
    updatePresence,
    updateFromSigner,
    save,
    load,
  }
})
```

---

## Phase 2: Contact Enhancement

### 2.1 Update Contact Type

```typescript
// types/contact.ts (MODIFY)

export interface Contact {
  id: string
  name: string

  // NEW: Identity link
  identityId?: string

  // Existing (kept for backward compatibility)
  address: string
  addresses?: ContactAddresses

  // DEPRECATED: Use identityId instead
  publicKey?: string
  peerId?: string
  signerCapabilities?: SignerCapabilities

  // Relationship metadata (unchanged)
  notes?: string
  tags: string[]
  isFavorite: boolean
  groupId?: string
  avatarUrl?: string

  // Activity tracking (unchanged)
  lastTransactionAt?: number
  totalSent?: bigint
  totalReceived?: bigint
  transactionCount?: number

  createdAt: number
  updatedAt: number
}
```

### 2.2 Update Contact Store

```typescript
// stores/contacts.ts (MODIFY)

// Add identity integration to existing store

export const useContactsStore = defineStore('contacts', () => {
  // ... existing state ...

  // NEW: Computed with identity resolution
  const contactsWithIdentity = computed(() => {
    const identityStore = useIdentityStore()
    return contactList.value.map(contact => {
      const identity = contact.identityId
        ? identityStore.get(contact.identityId)
        : null
      return {
        ...contact,
        identity,
        isOnline: identity?.isOnline ?? false,
        canMuSig2: !!identity?.publicKeyHex || !!contact.publicKey,
      }
    })
  })

  // NEW: Signers computed using identity
  const signers = computed(() => {
    const identityStore = useIdentityStore()
    return contactList.value.filter(c => {
      if (c.identityId) {
        const identity = identityStore.get(c.identityId)
        return identity && isValidPublicKey(identity.publicKeyHex)
      }
      return c.publicKey && isValidPublicKey(c.publicKey)
    })
  })

  // MODIFY: addContact to create identity
  async function addContact(
    data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Contact> {
    const identityStore = useIdentityStore()
    const networkStore = useNetworkStore()

    let identityId: string | undefined
    let derivedAddress = data.address

    // Create identity if public key provided
    if (data.publicKey && isValidPublicKey(data.publicKey)) {
      const identity = identityStore.findOrCreate(data.publicKey)
      identityId = identity.publicKeyHex
      derivedAddress = identity.address
    }

    const contact: Contact = {
      ...data,
      id: generateId('contact'),
      identityId,
      address: derivedAddress || data.address,
      tags: data.tags || [],
      isFavorite: data.isFavorite || false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    contacts.value.set(contact.id, contact)
    saveContacts()
    return contact
  }

  // ... rest of store ...
})
```

### 2.3 Migration Script

```typescript
// utils/migrations/contact-identity-migration.ts (NEW FILE)

import { useContactsStore } from '~/stores/contacts'
import { useIdentityStore } from '~/stores/identity'
import { isValidPublicKey } from '~/utils/identity'

export async function migrateContactsToIdentities(): Promise<{
  migrated: number
  skipped: number
  errors: string[]
}> {
  const contactStore = useContactsStore()
  const identityStore = useIdentityStore()

  let migrated = 0
  let skipped = 0
  const errors: string[] = []

  for (const contact of contactStore.contactList) {
    // Skip if already has identityId
    if (contact.identityId) {
      skipped++
      continue
    }

    // Try to create identity from publicKey
    if (contact.publicKey && isValidPublicKey(contact.publicKey)) {
      try {
        const identity = identityStore.findOrCreate(contact.publicKey)

        // Update contact with identity link
        contactStore.updateContact(contact.id, {
          identityId: identity.publicKeyHex,
          address: identity.address, // Use derived address
        })

        // Copy P2P info to identity if present
        if (contact.peerId) {
          identityStore.update(identity.publicKeyHex, {
            peerId: contact.peerId,
          })
        }

        if (contact.signerCapabilities) {
          identityStore.update(identity.publicKeyHex, {
            signerCapabilities: contact.signerCapabilities,
          })
        }

        migrated++
      } catch (e) {
        errors.push(`Failed to migrate ${contact.name}: ${e}`)
      }
    } else {
      // No public key - legacy contact, skip
      skipped++
    }
  }

  return { migrated, skipped, errors }
}
```

---

## Phase 3: P2P Integration

### 3.1 Update P2P Store

```typescript
// stores/p2p.ts (MODIFY)

// Add identity integration

function _handleSignerDiscovered(signer: DiscoveredSigner) {
  const identityStore = useIdentityStore()

  // Update identity store (primary)
  identityStore.updateFromSigner({
    publicKeyHex: signer.publicKeyHex,
    peerId: signer.peerId,
    multiaddrs: signer.multiaddrs,
    signerCapabilities: {
      transactionTypes: signer.transactionTypes,
      amountRange: signer.amountRange,
      fee: signer.fee,
      available: true,
      expiresAt: signer.expiresAt,
    },
  })

  // Still maintain local signer list for UI
  // ... existing signer list logic ...
}

function _handlePresenceChanged(peerId: string, isOnline: boolean) {
  const identityStore = useIdentityStore()

  const identity = identityStore.findByPeerId(peerId)
  if (identity) {
    identityStore.updatePresence(identity.publicKeyHex, {
      isOnline,
      lastSeenAt: isOnline ? Date.now() : undefined,
    })
  }
}
```

### 3.2 Update Signer → Contact Flow

```typescript
// In P2P page or signer components

async function saveSignerAsContact(signer: DiscoveredSigner) {
  const contactStore = useContactsStore()

  // Check if contact already exists
  const existing = contactStore.findByPublicKey(signer.publicKeyHex)
  if (existing) {
    showToast('Contact already exists', { type: 'info' })
    return existing
  }

  // Create contact (identity is created automatically)
  const contact = await contactStore.addContact({
    name: signer.nickname || `Signer ${signer.publicKeyHex.slice(0, 8)}`,
    address: '', // Will be derived from publicKey
    publicKey: signer.publicKeyHex,
    tags: ['signer'],
    isFavorite: false,
  })

  showToast(`${contact.name} added to contacts`, { type: 'success' })
  return contact
}
```

---

## Phase 4: MuSig2 Integration

### 4.1 Update Shared Wallet Creation

```typescript
// stores/musig2.ts (MODIFY)

async function createSharedWallet(config: {
  name: string
  description?: string
  participantContacts: Contact[] // Changed from publicKeys
}): Promise<SharedWallet> {
  const identityStore = useIdentityStore()
  const walletStore = useWalletStore()

  // Resolve public keys from contacts
  const participantKeys: string[] = []

  for (const contact of config.participantContacts) {
    let publicKey: string | undefined

    if (contact.identityId) {
      const identity = identityStore.get(contact.identityId)
      publicKey = identity?.publicKeyHex
    } else {
      publicKey = contact.publicKey
    }

    if (!publicKey || !isValidPublicKey(publicKey)) {
      throw new Error(`Contact ${contact.name} has no valid public key`)
    }

    participantKeys.push(publicKey)
  }

  // Add user's own key
  participantKeys.push(walletStore.publicKeyHex)

  // ... rest of wallet creation logic ...
}
```

### 4.2 Update Participant Display

```typescript
// In shared wallet components

const participantsWithContacts = computed(() => {
  const contactStore = useContactsStore()
  const identityStore = useIdentityStore()

  return wallet.participants.map(participant => {
    // Find contact by public key
    const contact = contactStore.findByPublicKey(participant.publicKeyHex)

    // Get identity for presence
    const identity = identityStore.get(participant.publicKeyHex)

    return {
      ...participant,
      contact,
      identity,
      displayName:
        contact?.name || `Signer ${participant.publicKeyHex.slice(0, 8)}`,
      isOnline: identity?.isOnline ?? false,
    }
  })
})
```

---

## Phase 5: UI Updates

### 5.1 Create Contact-Aware Address Display

```vue
<!-- components/common/AddressDisplay.vue (NEW/MODIFY) -->
<template>
  <div class="inline-flex items-center gap-2">
    <template v-if="contact">
      <ContactAvatar :contact="contact" size="xs" show-presence />
      <span class="font-medium">{{ contact.name }}</span>
      <span v-if="showAddress" class="text-muted text-sm">
        ({{ fingerprint }})
      </span>
    </template>
    <template v-else>
      <code class="text-sm font-mono">{{ fingerprint }}</code>
      <UButton
        v-if="showAddToContacts"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-user-plus"
        @click="addToContacts"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  address: string
  showAddress?: boolean
  showAddToContacts?: boolean
}>()

const contactStore = useContactsStore()

const contact = computed(() => contactStore.findByAddress(props.address))

const fingerprint = computed(
  () => `${props.address.slice(0, 12)}...${props.address.slice(-6)}`,
)

function addToContacts() {
  navigateTo(`/people/contacts?add=true&address=${props.address}`)
}
</script>
```

### 5.2 Update Transaction List

```vue
<!-- components/history/TransactionItem.vue (MODIFY) -->
<template>
  <div class="flex items-center gap-3 p-3">
    <!-- Use AddressDisplay for counterparty -->
    <AddressDisplay :address="counterpartyAddress" show-add-to-contacts />

    <!-- Amount and time -->
    <div class="ml-auto text-right">
      <p :class="amountClass">{{ formattedAmount }}</p>
      <p class="text-xs text-muted">{{ timeAgo }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const counterpartyAddress = computed(() =>
  props.transaction.type === 'send'
    ? props.transaction.toAddress
    : props.transaction.fromAddress,
)
</script>
```

### 5.3 Update Navigation

```typescript
// layouts/default.vue or navigation config

const navigation = [
  {
    label: 'Home',
    icon: 'i-lucide-home',
    to: '/',
  },
  {
    label: 'People', // Elevated in hierarchy
    icon: 'i-lucide-users',
    to: '/people',
    children: [
      { label: 'Contacts', to: '/people/contacts' },
      { label: 'Shared Wallets', to: '/people/shared-wallets' },
      { label: 'Network', to: '/people/network' },
    ],
  },
  {
    label: 'Transact',
    icon: 'i-lucide-wallet',
    to: '/transact',
    children: [
      { label: 'Send', to: '/transact/send' },
      { label: 'Receive', to: '/transact/receive' },
      { label: 'History', to: '/transact/history' },
    ],
  },
  // ... rest of navigation
]
```

---

## Phase 6: Cleanup

### 6.1 Deprecation Warnings

```typescript
// Add deprecation warnings to old patterns

// In contact store
function findByPeerId(peerId: string): Contact | undefined {
  console.warn(
    'findByPeerId is deprecated. Use identityStore.findByPeerId() instead.',
  )
  // ... existing implementation for backward compat
}
```

### 6.2 Remove Deprecated Code

After migration is stable:

1. Remove `publicKey`, `peerId`, `signerCapabilities` from Contact type
2. Remove direct P2P lookups in contact store
3. Update all components to use identity-backed patterns

### 6.3 Documentation Updates

- Update `docs/architecture/00_OVERVIEW.md` with new philosophy
- Update component documentation
- Add migration notes to changelog

---

## Backward Compatibility

### Legacy Contact Support

Contacts without `identityId` continue to work:

```typescript
// In contact resolution
function getContactAddress(contact: Contact): string {
  if (contact.identityId) {
    const identity = identityStore.get(contact.identityId)
    return identity?.address ?? contact.address
  }
  return contact.address
}

function canParticipateInMuSig2(contact: Contact): boolean {
  if (contact.identityId) {
    const identity = identityStore.get(contact.identityId)
    return !!identity?.publicKeyHex
  }
  return !!contact.publicKey && isValidPublicKey(contact.publicKey)
}
```

### Data Migration

Run migration on app startup:

```typescript
// In app initialization
async function initializeApp() {
  // Load stores
  await identityStore.load()
  await contactStore.load()

  // Run migration if needed
  const migrationKey = 'lotus:migration:contact-identity'
  if (!localStorage.getItem(migrationKey)) {
    const result = await migrateContactsToIdentities()
    console.log('Contact migration:', result)
    localStorage.setItem(migrationKey, Date.now().toString())
  }

  // Continue initialization
  // ...
}
```

---

## Testing Checklist

### Phase 1: Foundation

- [ ] Identity store creates identities correctly
- [ ] Address derivation works for all networks
- [ ] Identity persistence works

### Phase 2: Contact Enhancement

- [ ] New contacts get identity links
- [ ] Existing contacts migrate correctly
- [ ] Legacy contacts still work

### Phase 3: P2P Integration

- [ ] Discovered signers create identities
- [ ] Presence updates reflect in identities
- [ ] Save as contact works

### Phase 4: MuSig2 Integration

- [ ] Shared wallet creation uses contacts
- [ ] Participant display shows contact names
- [ ] Signing sessions resolve contacts

### Phase 5: UI Updates

- [ ] Address display shows contacts
- [ ] Transaction history shows contacts
- [ ] Navigation reflects new structure

### Phase 6: Cleanup

- [ ] No console errors
- [ ] All tests pass
- [ ] Documentation updated

---

## Summary

The migration to contact-centric architecture:

1. **Preserves existing data** through backward compatibility
2. **Progressively enhances** contacts with identity links
3. **Unifies identity** across P2P, MuSig2, and contacts
4. **Improves UX** with contact context everywhere
5. **Enables future features** built on relationships

---

_This completes the Contact-Centric Design Philosophy documentation._
