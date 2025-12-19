# Phase 4: Contact & Signer Integration

## Overview

This phase bridges P2P signers with the contacts system, allowing users to save signers as contacts, view signer details, and initiate signing requests from the contacts page.

**Priority**: P1 (High)
**Estimated Effort**: 1-2 days
**Dependencies**: Phase 2 Signing Request Flow

---

## Current State

### What Exists

- Contacts system (`stores/contacts.ts`, `pages/people/contacts.vue`)
- Contact model with basic fields (name, address, tags)
- `SignerCard.vue` with "Save as Contact" button
- `SignerList.vue` component

### What's Broken

From `P2P_UX_COMPREHENSIVE_ANALYSIS.md`:

```typescript
// Current implementation
const saveAsContact = (signer: UISignerAdvertisement) => {
  toast.add({
    title: 'Coming Soon',
    description: 'Contact saving will be available in a future update',
    ...
  })
}
```

**Problems**:

- "Save as Contact" shows placeholder message
- No P2P fields in contact model
- No signer detail view
- Can't see contacts' online status
- Can't request signature from contact detail

---

## Target Design

### Signer Detail Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  Alice                                                         [X]  │
│  ⭐ 95 reputation • Online                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📋 Capabilities                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Spend • CoinJoin • Escrow                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  💰 Fee Structure                                                   │
│  Base Fee: 0.1 XPI                                                 │
│  Amount Range: 100 - 10,000 XPI                                    │
│  Avg Response: 2 seconds                                           │
│                                                                     │
│  📊 Statistics                                                      │
│  Sessions: 47 completed • 2 aborted                                │
│  Success Rate: 95.9%                                               │
│  Member Since: Nov 2024                                            │
│                                                                     │
│                    [Save as Contact] [Message] [Request Signature]  │
└─────────────────────────────────────────────────────────────────────┘
```

### Contact with P2P Info

```
┌─────────────────────────────────────────────────────────────────────┐
│  👤 Alice                                              🟢 Online    │
│  lotus_16PSJ...abc123                                              │
├─────────────────────────────────────────────────────────────────────┤
│  Tags: [signer] [friend]                                           │
│                                                                     │
│  P2P Capabilities                                                   │
│  ✅ Available as Signer                                            │
│  Spend • CoinJoin • Escrow                                         │
│  Fee: 0.1 XPI                                                      │
│                                                                     │
│                              [Send] [Message] [Request Signature]   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Task 4.1: Extend Contact Model

Update the contact type to include P2P fields:

**File**: `types/contact.ts`

```typescript
export interface Contact {
  id: string
  name: string
  address: string
  avatar?: string
  tags: string[]
  isFavorite: boolean
  notes?: string
  createdAt: number
  updatedAt: number

  // P2P fields (new)
  peerId?: string
  publicKey?: string
  signerCapabilities?: SignerCapabilities
  lastSeenOnline?: number
}

export interface SignerCapabilities {
  transactionTypes: TransactionType[]
  amountRange?: {
    min: number
    max: number
  }
  fee?: number
  responseTime?: number
  reputation?: number
}

export enum TransactionType {
  SPEND = 'spend',
  COINJOIN = 'coinjoin',
  ESCROW = 'escrow',
  SWAP = 'swap',
  CUSTODY = 'custody',
  CHANNEL = 'channel',
}
```

### Task 4.2: Create Signer Detail Modal

**File**: `components/p2p/SignerDetailModal.vue`

```vue
<script setup lang="ts">
import type { DiscoveredSigner } from '~/types/musig2'

const props = defineProps<{
  signer: DiscoveredSigner | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  requestSign: [signer: DiscoveredSigner]
  saveContact: [signer: DiscoveredSigner]
  message: [signer: DiscoveredSigner]
}>()

const { formatXPI } = useAmount()
const contactStore = useContactStore()

// Check if already a contact
const isContact = computed(() => {
  if (!props.signer) return false
  return contactStore.findByPeerId(props.signer.peerId) !== undefined
})

// Transaction type labels
const txTypeLabels: Record<string, string> = {
  spend: 'Spend',
  coinjoin: 'CoinJoin',
  escrow: 'Escrow',
  swap: 'Swap',
  custody: 'Custody',
  channel: 'Channel',
}

// Format amount range
const amountRange = computed(() => {
  if (!props.signer?.amountRange) return null
  const { min, max } = props.signer.amountRange
  return `${formatXPI(min)} - ${formatXPI(max)}`
})

// Time since last seen
const lastSeen = computed(() => {
  if (!props.signer?.lastSeen) return 'Unknown'
  const diff = Date.now() - props.signer.lastSeen
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
})

function handleRequestSign() {
  if (props.signer) {
    emit('requestSign', props.signer)
    open.value = false
  }
}

function handleSaveContact() {
  if (props.signer) {
    emit('saveContact', props.signer)
  }
}

function handleMessage() {
  if (props.signer) {
    emit('message', props.signer)
  }
}
</script>

<template>
  <UModal v-model:open="open" size="lg">
    <template #header>
      <div class="flex items-center gap-4">
        <ContactAvatar
          :name="signer?.nickname"
          size="lg"
          class="ring-2 ring-success"
        />
        <div>
          <h3 class="text-lg font-semibold">
            {{ signer?.nickname || 'Anonymous Signer' }}
          </h3>
          <div class="flex items-center gap-2 mt-1">
            <UBadge
              v-if="signer?.reputation"
              color="warning"
              variant="subtle"
              size="sm"
            >
              ⭐ {{ signer.reputation }} reputation
            </UBadge>
            <UBadge color="success" variant="subtle" size="sm">
              🟢 Online
            </UBadge>
          </div>
        </div>
      </div>
    </template>

    <div v-if="signer" class="space-y-6 p-4">
      <!-- Capabilities -->
      <div>
        <h4 class="text-sm font-medium text-muted mb-2">Capabilities</h4>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="type in signer.transactionTypes"
            :key="type"
            color="primary"
            variant="subtle"
          >
            {{ txTypeLabels[type] || type }}
          </UBadge>
        </div>
      </div>

      <!-- Fee Structure -->
      <div>
        <h4 class="text-sm font-medium text-muted mb-2">Fee Structure</h4>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span class="text-muted">Base Fee</span>
            <p class="font-semibold">
              {{ signer.fee ? formatXPI(signer.fee) : 'Free' }}
            </p>
          </div>
          <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span class="text-muted">Response Time</span>
            <p class="font-semibold">
              {{ signer.responseTime ? `${signer.responseTime}s` : 'Unknown' }}
            </p>
          </div>
          <div
            v-if="amountRange"
            class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg col-span-2"
          >
            <span class="text-muted">Amount Range</span>
            <p class="font-semibold">{{ amountRange }}</p>
          </div>
        </div>
      </div>

      <!-- Statistics -->
      <div v-if="signer.stats">
        <h4 class="text-sm font-medium text-muted mb-2">Statistics</h4>
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div class="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p class="text-2xl font-bold text-primary">
              {{ signer.stats.completedSessions || 0 }}
            </p>
            <span class="text-muted">Completed</span>
          </div>
          <div class="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p class="text-2xl font-bold">
              {{ signer.stats.successRate || 0 }}%
            </p>
            <span class="text-muted">Success Rate</span>
          </div>
          <div class="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p class="text-2xl font-bold text-muted">{{ lastSeen }}</p>
            <span class="text-muted">Last Seen</span>
          </div>
        </div>
      </div>

      <!-- Peer ID -->
      <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <span class="text-xs text-muted">Peer ID</span>
        <p class="font-mono text-sm truncate">{{ signer.peerId }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <UButton
          v-if="!isContact"
          color="neutral"
          variant="soft"
          @click="handleSaveContact"
        >
          <UIcon name="i-lucide-user-plus" class="w-4 h-4 mr-2" />
          Save as Contact
        </UButton>
        <UBadge v-else color="success" variant="subtle"> ✓ In Contacts </UBadge>

        <div class="flex gap-2">
          <UButton color="neutral" variant="soft" @click="handleMessage">
            <UIcon name="i-lucide-message-circle" class="w-4 h-4 mr-2" />
            Message
          </UButton>
          <UButton color="primary" @click="handleRequestSign">
            <UIcon name="i-lucide-pen-tool" class="w-4 h-4 mr-2" />
            Request Signature
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
```

### Task 4.3: Implement Save as Contact

**File**: Update `pages/people/p2p.vue`

```typescript
// Add to script setup
const contactStore = useContactStore()
const { publicKeyToAddress } = useAddress()
const { success, error } = useNotifications()

// Save signer as contact
async function handleSaveContact(signer: DiscoveredSigner) {
  try {
    // Derive address from public key if available
    let address = ''
    if (signer.publicKeyHex) {
      address = publicKeyToAddress(signer.publicKeyHex) || ''
    }

    // Create contact with P2P fields
    await contactStore.addContact({
      name: signer.nickname || 'Anonymous Signer',
      address,
      tags: ['signer'],
      isFavorite: false,
      peerId: signer.peerId,
      publicKey: signer.publicKeyHex,
      signerCapabilities: {
        transactionTypes: signer.transactionTypes,
        amountRange: signer.amountRange,
        fee: signer.fee,
        responseTime: signer.responseTime,
        reputation: signer.reputation,
      },
      lastSeenOnline: Date.now(),
    })

    success('Contact Saved', `${signer.nickname || 'Signer'} added to contacts`)
  } catch (err) {
    error(
      'Save Failed',
      err instanceof Error ? err.message : 'Failed to save contact',
    )
  }
}
```

### Task 4.4: Update Contact Store

**File**: `stores/contacts.ts`

```typescript
// Add P2P-related methods

getters: {
  // Find contact by peer ID
  findByPeerId: (state) => (peerId: string) => {
    return state.contacts.find(c => c.peerId === peerId)
  },

  // Get contacts that are signers
  signerContacts: (state) => {
    return state.contacts.filter(c => c.signerCapabilities)
  },

  // Get online contacts (requires P2P store)
  onlineContacts: (state) => {
    const p2pStore = useP2PStore()
    const onlinePeerIds = new Set(p2pStore.onlinePeers.map(p => p.peerId))
    return state.contacts.filter(c => c.peerId && onlinePeerIds.has(c.peerId))
  },
},

actions: {
  // Update contact's last seen time
  updateLastSeen(peerId: string) {
    const contact = this.contacts.find(c => c.peerId === peerId)
    if (contact) {
      contact.lastSeenOnline = Date.now()
      this._saveContacts()
    }
  },

  // Update contact's signer capabilities
  updateSignerCapabilities(peerId: string, capabilities: SignerCapabilities) {
    const contact = this.contacts.find(c => c.peerId === peerId)
    if (contact) {
      contact.signerCapabilities = capabilities
      contact.updatedAt = Date.now()
      this._saveContacts()
    }
  },
}
```

### Task 4.5: Add P2P Actions to Contact Detail

Update the contact detail component to show P2P actions:

**File**: `components/contacts/ContactDetailSlideover.vue` (update)

```vue
<!-- Add to template, in the actions section -->

<!-- P2P Actions (when contact has P2P info) -->
<template v-if="contact.peerId">
  <div class="border-t pt-4 mt-4">
    <h4 class="text-sm font-medium text-muted mb-3">P2P Actions</h4>

    <!-- Online Status -->
    <div class="flex items-center gap-2 mb-3">
      <span
        class="w-2 h-2 rounded-full"
        :class="isOnline ? 'bg-success' : 'bg-gray-400'"
      ></span>
      <span class="text-sm">{{ isOnline ? 'Online' : 'Offline' }}</span>
      <span v-if="contact.lastSeenOnline" class="text-xs text-muted">
        Last seen {{ timeAgo(contact.lastSeenOnline) }}
      </span>
    </div>

    <!-- Signer Capabilities -->
    <div v-if="contact.signerCapabilities" class="mb-4">
      <div class="flex flex-wrap gap-1 mb-2">
        <UBadge
          v-for="type in contact.signerCapabilities.transactionTypes"
          :key="type"
          color="primary"
          variant="subtle"
          size="xs"
        >
          {{ type }}
        </UBadge>
      </div>
      <p v-if="contact.signerCapabilities.fee" class="text-sm text-muted">
        Fee: {{ formatXPI(contact.signerCapabilities.fee) }}
      </p>
    </div>

    <!-- Actions -->
    <div class="flex gap-2">
      <UButton
        v-if="contact.signerCapabilities && isOnline"
        color="primary"
        size="sm"
        @click="handleRequestSignature"
      >
        <UIcon name="i-lucide-pen-tool" class="w-4 h-4 mr-2" />
        Request Signature
      </UButton>
      <UButton
        v-if="isOnline"
        color="neutral"
        variant="soft"
        size="sm"
        @click="handleMessage"
      >
        <UIcon name="i-lucide-message-circle" class="w-4 h-4 mr-2" />
        Message
      </UButton>
    </div>
  </div>
</template>
```

```typescript
// Add to script setup
const p2pStore = useP2PStore()

// Check if contact is online
const isOnline = computed(() => {
  if (!props.contact?.peerId) return false
  return p2pStore.onlinePeers.some(p => p.peerId === props.contact.peerId)
})

// Request signature from contact
function handleRequestSignature() {
  // Navigate to P2P page with signer pre-selected
  navigateTo({
    path: '/people/p2p',
    query: {
      tab: 'signers',
      requestFrom: props.contact.peerId,
    },
  })
}

// Message contact
function handleMessage() {
  // Future: Open messaging
  console.log('Message:', props.contact.peerId)
}
```

---

## Checklist

### Types

- [ ] Add P2P fields to Contact interface
- [ ] Add SignerCapabilities interface
- [ ] Add TransactionType enum

### Components

- [ ] Create `SignerDetailModal.vue`
- [ ] Update `ContactDetailSlideover.vue` with P2P section
- [ ] Update `SignerCard.vue` if needed

### Store Updates

- [ ] Add `findByPeerId` getter to contacts store
- [ ] Add `signerContacts` getter
- [ ] Add `onlineContacts` getter
- [ ] Add `updateLastSeen` action
- [ ] Add `updateSignerCapabilities` action

### Page Integration

- [ ] Add signer detail modal to P2P page
- [ ] Implement `handleSaveContact` function
- [ ] Wire up signer detail modal events

### Testing

- [ ] Can view signer details
- [ ] Can save signer as contact
- [ ] Contact appears with P2P fields
- [ ] Contact shows online status
- [ ] Can request signature from contact detail
- [ ] Duplicate contacts prevented

---

_Previous: [03_SESSION_MANAGEMENT.md](./03_SESSION_MANAGEMENT.md)_
_Next: [05_PRESENCE_DISCOVERY.md](./05_PRESENCE_DISCOVERY.md)_
