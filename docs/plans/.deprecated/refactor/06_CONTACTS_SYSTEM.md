# 06: Contacts System

## Overview

This document details the refactoring of the contacts system. The current implementation lacks groups, activity history, and proper integration with other features.

---

## Current Problems

1. **No contact groups** - Can't organize contacts (Family, Business, etc.)
2. **No per-contact activity** - Can't see transaction history with a contact
3. **No contact verification** - No way to verify address ownership
4. **Tags are underutilized** - Tags exist but aren't useful
5. **No P2P integration** - "Save as Contact" from P2P doesn't work
6. **Missing public key storage** - Needed for MuSig2

---

## Target Design

```
┌─────────────────────────────────────────────────────────────────────┐
│  👥 Contacts                                        [+ Add Contact]  │
│  ─────────────────────────────────────────────────────────────────  │
│  [🔍 Search contacts...]                                             │
│                                                                      │
│  [All] [⭐ Favorites] [👨‍👩‍👧 Family] [💼 Business] [🔐 Signers]         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  ⭐ Favorites                                                        │
│  ─────────────────────────────────────────────────────────────────  │
│  [👤 Alice]  [👤 Bob]  [👤 Carol]                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  All Contacts (12)                                                   │
│  ─────────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 👤 Alice                                           ⭐        │   │
│  │ lotus_16PSJ...abc123                                        │   │
│  │ Last: Sent 100 XPI • 2 days ago                             │   │
│  │ [Send]  [View Activity]                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 👤 Bob                                             🔐        │   │
│  │ lotus_16PSJ...def456                                        │   │
│  │ MuSig2 Signer • Online                                      │   │
│  │ [Send]  [Request Signature]  [View Activity]                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Updated Contact Interface

```typescript
// types/contact.ts

export interface Contact {
  id: string
  name: string

  // Addresses
  address: string // Primary address
  addresses?: {
    livenet?: string
    testnet?: string
  }

  // Identity (for MuSig2)
  publicKey?: string // Public key hex
  publicKeys?: {
    livenet?: string
    testnet?: string
  }

  // P2P
  peerId?: string // libp2p peer ID
  signerCapabilities?: {
    transactionTypes: TransactionType[]
    amountRange?: { min?: number; max?: number }
    fee?: number
  }

  // Organization
  groupId?: string // Contact group
  tags: string[]
  isFavorite: boolean

  // Metadata
  notes?: string
  avatarUrl?: string

  // Activity
  lastTransactionAt?: number
  totalSent?: bigint
  totalReceived?: bigint
  transactionCount?: number

  // Timestamps
  createdAt: number
  updatedAt: number
}

export interface ContactGroup {
  id: string
  name: string
  icon: string
  color: string
  contactIds: string[]

  // MuSig2 Shared Wallet (optional)
  sharedWallet?: {
    aggregatedPublicKey: string
    sharedAddress: string
  }

  createdAt: number
  updatedAt: number
}
```

---

## Store: contacts.ts (Updated)

```typescript
// stores/contacts.ts

interface ContactsState {
  contacts: Map<string, Contact>
  groups: Map<string, ContactGroup>

  // UI State
  searchQuery: string
  activeFilter: string | null
  selectedContactId: string | null
}

export const useContactStore = defineStore('contacts', () => {
  // State
  const contacts = ref<Map<string, Contact>>(new Map())
  const groups = ref<Map<string, ContactGroup>>(new Map())
  const searchQuery = ref('')
  const activeFilter = ref<string | null>(null)

  // Getters
  const contactList = computed(() => Array.from(contacts.value.values()))

  const favorites = computed(() => contactList.value.filter(c => c.isFavorite))

  const signers = computed(() =>
    contactList.value.filter(c => c.signerCapabilities),
  )

  const filteredContacts = computed(() => {
    let result = contactList.value

    // Apply search
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.address.toLowerCase().includes(query) ||
          c.notes?.toLowerCase().includes(query),
      )
    }

    // Apply filter
    if (activeFilter.value === 'favorites') {
      result = result.filter(c => c.isFavorite)
    } else if (activeFilter.value === 'signers') {
      result = result.filter(c => c.signerCapabilities)
    } else if (activeFilter.value) {
      result = result.filter(c => c.groupId === activeFilter.value)
    }

    // Sort by name
    return result.sort((a, b) => a.name.localeCompare(b.name))
  })

  const groupList = computed(() => Array.from(groups.value.values()))

  // Actions
  function addContact(
    contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>,
  ): Contact {
    const id = crypto.randomUUID()
    const now = Date.now()
    const newContact: Contact = {
      ...contact,
      id,
      tags: contact.tags || [],
      isFavorite: contact.isFavorite || false,
      createdAt: now,
      updatedAt: now,
    }
    contacts.value.set(id, newContact)
    saveContacts()
    return newContact
  }

  function updateContact(
    id: string,
    updates: Partial<Contact>,
  ): Contact | null {
    const contact = contacts.value.get(id)
    if (!contact) return null

    const updated = {
      ...contact,
      ...updates,
      updatedAt: Date.now(),
    }
    contacts.value.set(id, updated)
    saveContacts()
    return updated
  }

  function deleteContact(id: string): boolean {
    const deleted = contacts.value.delete(id)
    if (deleted) saveContacts()
    return deleted
  }

  function toggleFavorite(id: string): void {
    const contact = contacts.value.get(id)
    if (contact) {
      contact.isFavorite = !contact.isFavorite
      contact.updatedAt = Date.now()
      saveContacts()
    }
  }

  // Groups
  function createGroup(
    name: string,
    icon: string,
    color: string,
  ): ContactGroup {
    const id = crypto.randomUUID()
    const group: ContactGroup = {
      id,
      name,
      icon,
      color,
      contactIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    groups.value.set(id, group)
    saveContacts()
    return group
  }

  function addToGroup(contactId: string, groupId: string): void {
    const contact = contacts.value.get(contactId)
    const group = groups.value.get(groupId)
    if (contact && group) {
      contact.groupId = groupId
      if (!group.contactIds.includes(contactId)) {
        group.contactIds.push(contactId)
      }
      saveContacts()
    }
  }

  function removeFromGroup(contactId: string): void {
    const contact = contacts.value.get(contactId)
    if (contact?.groupId) {
      const group = groups.value.get(contact.groupId)
      if (group) {
        group.contactIds = group.contactIds.filter(id => id !== contactId)
      }
      contact.groupId = undefined
      saveContacts()
    }
  }

  // Lookups
  function findByAddress(address: string): Contact | undefined {
    return contactList.value.find(
      c =>
        c.address === address ||
        c.addresses?.livenet === address ||
        c.addresses?.testnet === address,
    )
  }

  function findByPeerId(peerId: string): Contact | undefined {
    return contactList.value.find(c => c.peerId === peerId)
  }

  function findByPublicKey(publicKey: string): Contact | undefined {
    return contactList.value.find(
      c =>
        c.publicKey === publicKey ||
        c.publicKeys?.livenet === publicKey ||
        c.publicKeys?.testnet === publicKey,
    )
  }

  // Activity tracking
  function recordTransaction(
    address: string,
    amount: bigint,
    isSend: boolean,
    timestamp: number,
  ): void {
    const contact = findByAddress(address)
    if (contact) {
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
  }

  // Persistence
  function saveContacts(): void {
    const data = {
      contacts: Object.fromEntries(
        Array.from(contacts.value.entries()).map(([k, v]) => [
          k,
          {
            ...v,
            totalSent: v.totalSent?.toString(),
            totalReceived: v.totalReceived?.toString(),
          },
        ]),
      ),
      groups: Object.fromEntries(groups.value),
    }
    localStorage.setItem('lotus_contacts', JSON.stringify(data))
  }

  function loadContacts(): void {
    const saved = localStorage.getItem('lotus_contacts')
    if (saved) {
      const data = JSON.parse(saved)
      contacts.value = new Map(
        Object.entries(data.contacts || {}).map(([k, v]: [string, any]) => [
          k,
          {
            ...v,
            totalSent: v.totalSent ? BigInt(v.totalSent) : undefined,
            totalReceived: v.totalReceived
              ? BigInt(v.totalReceived)
              : undefined,
          },
        ]),
      )
      groups.value = new Map(Object.entries(data.groups || {}))
    }
  }

  // Initialize
  loadContacts()

  return {
    // State
    contacts,
    groups,
    searchQuery,
    activeFilter,

    // Getters
    contactList,
    favorites,
    signers,
    filteredContacts,
    groupList,

    // Actions
    addContact,
    updateContact,
    deleteContact,
    toggleFavorite,
    createGroup,
    addToGroup,
    removeFromGroup,
    findByAddress,
    findByPeerId,
    findByPublicKey,
    recordTransaction,
    saveContacts,
    loadContacts,
  }
})
```

---

## Page: contacts.vue

```vue
<!-- pages/contacts.vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Header -->
    <AppCard>
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-users" class="w-5 h-5" />
          <h1 class="text-xl font-semibold">Contacts</h1>
          <UBadge color="neutral" variant="subtle" size="sm">
            {{ contactStore.contactList.length }}
          </UBadge>
        </div>
        <UButton color="primary" icon="i-lucide-plus" @click="openAddContact">
          Add Contact
        </UButton>
      </div>

      <!-- Search -->
      <UInput
        v-model="contactStore.searchQuery"
        icon="i-lucide-search"
        placeholder="Search contacts..."
        class="mb-4"
      />

      <!-- Filters -->
      <div class="flex flex-wrap gap-2">
        <UButton
          size="sm"
          :color="!contactStore.activeFilter ? 'primary' : 'neutral'"
          :variant="!contactStore.activeFilter ? 'solid' : 'outline'"
          @click="contactStore.activeFilter = null"
        >
          All
        </UButton>
        <UButton
          size="sm"
          :color="
            contactStore.activeFilter === 'favorites' ? 'primary' : 'neutral'
          "
          :variant="
            contactStore.activeFilter === 'favorites' ? 'solid' : 'outline'
          "
          icon="i-lucide-star"
          @click="contactStore.activeFilter = 'favorites'"
        >
          Favorites
        </UButton>
        <UButton
          size="sm"
          :color="
            contactStore.activeFilter === 'signers' ? 'primary' : 'neutral'
          "
          :variant="
            contactStore.activeFilter === 'signers' ? 'solid' : 'outline'
          "
          icon="i-lucide-pen-tool"
          @click="contactStore.activeFilter = 'signers'"
        >
          Signers
        </UButton>
        <UButton
          v-for="group in contactStore.groupList"
          :key="group.id"
          size="sm"
          :color="
            contactStore.activeFilter === group.id ? 'primary' : 'neutral'
          "
          :variant="
            contactStore.activeFilter === group.id ? 'solid' : 'outline'
          "
          :icon="group.icon"
          @click="contactStore.activeFilter = group.id"
        >
          {{ group.name }}
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-lucide-plus"
          @click="openCreateGroup"
        >
          New Group
        </UButton>
      </div>
    </AppCard>

    <!-- Favorites Quick Access -->
    <AppCard
      v-if="contactStore.favorites.length && !contactStore.activeFilter"
      title="Favorites"
      icon="i-lucide-star"
    >
      <div class="flex flex-wrap gap-3">
        <ContactQuickCard
          v-for="contact in contactStore.favorites.slice(0, 6)"
          :key="contact.id"
          :contact="contact"
          @click="openContactDetail(contact)"
          @send="openSendTo(contact)"
        />
      </div>
    </AppCard>

    <!-- Contact List -->
    <AppCard v-if="contactStore.filteredContacts.length" :no-padding="true">
      <div class="divide-y divide-default">
        <ContactListItem
          v-for="contact in contactStore.filteredContacts"
          :key="contact.id"
          :contact="contact"
          @click="openContactDetail(contact)"
          @send="openSendTo(contact)"
          @toggle-favorite="contactStore.toggleFavorite(contact.id)"
        />
      </div>
    </AppCard>

    <!-- Empty State -->
    <AppEmptyState
      v-else-if="!contactStore.searchQuery"
      icon="i-lucide-users"
      title="No contacts yet"
      description="Add contacts to quickly send to friends and family"
      :action="{ label: 'Add Contact', onClick: openAddContact }"
    />

    <!-- No Results -->
    <AppEmptyState
      v-else
      icon="i-lucide-search"
      title="No contacts found"
      :description="`No contacts match '${contactStore.searchQuery}'`"
    />

    <!-- Add/Edit Contact Slideover -->
    <ContactFormSlideover
      v-model:open="formOpen"
      :contact="editingContact"
      @save="handleSaveContact"
    />

    <!-- Contact Detail Slideover -->
    <ContactDetailSlideover
      v-model:open="detailOpen"
      :contact="selectedContact"
      @edit="openEditContact"
      @delete="handleDeleteContact"
      @send="openSendTo"
    />

    <!-- Create Group Modal -->
    <ContactGroupModal
      v-model:open="groupModalOpen"
      @create="handleCreateGroup"
    />
  </div>
</template>

<script setup lang="ts">
const contactStore = useContactStore()
const router = useRouter()

// UI State
const formOpen = ref(false)
const detailOpen = ref(false)
const groupModalOpen = ref(false)
const editingContact = ref<Contact | null>(null)
const selectedContact = ref<Contact | null>(null)

// Actions
function openAddContact() {
  editingContact.value = null
  formOpen.value = true
}

function openEditContact(contact: Contact) {
  editingContact.value = contact
  detailOpen.value = false
  formOpen.value = true
}

function openContactDetail(contact: Contact) {
  selectedContact.value = contact
  detailOpen.value = true
}

function openSendTo(contact: Contact) {
  router.push({
    path: '/send',
    query: { to: contact.address },
  })
}

function openCreateGroup() {
  groupModalOpen.value = true
}

function handleSaveContact(data: Partial<Contact>) {
  if (editingContact.value) {
    contactStore.updateContact(editingContact.value.id, data)
  } else {
    contactStore.addContact(
      data as Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>,
    )
  }
  formOpen.value = false
}

function handleDeleteContact(contact: Contact) {
  contactStore.deleteContact(contact.id)
  detailOpen.value = false
}

function handleCreateGroup(name: string, icon: string, color: string) {
  contactStore.createGroup(name, icon, color)
  groupModalOpen.value = false
}
</script>
```

---

## Components

### ContactListItem.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  contact: Contact
}>()

const emit = defineEmits<{
  click: []
  send: []
  toggleFavorite: []
}>()

const { toFingerprint } = useAddress()
const { formatXPI } = useAmount()
const { timeAgo } = useTime()

const lastActivity = computed(() => {
  if (!props.contact.lastTransactionAt) return null
  return timeAgo(props.contact.lastTransactionAt)
})

const isSigner = computed(() => !!props.contact.signerCapabilities)
</script>

<template>
  <div
    class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
    @click="emit('click')"
  >
    <!-- Avatar -->
    <ContactAvatar :contact="contact" size="md" />

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <p class="font-medium truncate">{{ contact.name }}</p>
        <UIcon
          v-if="contact.isFavorite"
          name="i-lucide-star"
          class="w-4 h-4 text-warning flex-shrink-0"
        />
        <UBadge v-if="isSigner" color="primary" variant="subtle" size="xs">
          Signer
        </UBadge>
      </div>
      <p class="text-sm text-muted truncate">
        {{ toFingerprint(contact.address) }}
        <span v-if="lastActivity"> • {{ lastActivity }}</span>
      </p>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 flex-shrink-0">
      <UButton
        color="primary"
        variant="ghost"
        size="xs"
        icon="i-lucide-send"
        @click.stop="emit('send')"
      />
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        :icon="contact.isFavorite ? 'i-lucide-star' : 'i-lucide-star'"
        :class="contact.isFavorite && 'text-warning'"
        @click.stop="emit('toggleFavorite')"
      />
    </div>
  </div>
</template>
```

### ContactDetailSlideover.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  contact: Contact | null
}>()

const open = defineModel<boolean>('open')

const emit = defineEmits<{
  edit: [contact: Contact]
  delete: [contact: Contact]
  send: [contact: Contact]
}>()

const walletStore = useWalletStore()
const { formatXPI } = useAmount()
const { copy } = useClipboard()

// Get transaction history with this contact
const contactTransactions = computed(() => {
  if (!props.contact) return []
  return walletStore.transactionHistory.filter(
    tx => tx.address === props.contact!.address,
  )
})

const stats = computed(() => {
  if (!props.contact) return null
  return {
    sent: props.contact.totalSent || 0n,
    received: props.contact.totalReceived || 0n,
    transactions: props.contact.transactionCount || 0,
  }
})
</script>

<template>
  <USlideover v-model:open="open">
    <template #content>
      <div v-if="contact" class="p-6 space-y-6">
        <!-- Header -->
        <div class="text-center">
          <ContactAvatar :contact="contact" size="xl" class="mx-auto mb-4" />
          <h2 class="text-xl font-semibold">{{ contact.name }}</h2>
          <p class="text-sm text-muted">
            {{ contact.address }}
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-copy"
              @click="copy(contact.address, 'Address')"
            />
          </p>
        </div>

        <!-- Quick Actions -->
        <div class="flex gap-2">
          <UButton
            class="flex-1"
            color="primary"
            icon="i-lucide-send"
            @click="emit('send', contact)"
          >
            Send
          </UButton>
          <UButton
            v-if="contact.signerCapabilities"
            class="flex-1"
            color="primary"
            variant="outline"
            icon="i-lucide-pen-tool"
          >
            Request Signature
          </UButton>
        </div>

        <!-- Stats -->
        <div v-if="stats" class="grid grid-cols-3 gap-4">
          <div class="text-center">
            <p class="text-lg font-semibold">{{ formatXPI(stats.sent) }}</p>
            <p class="text-xs text-muted">Sent</p>
          </div>
          <div class="text-center">
            <p class="text-lg font-semibold">{{ formatXPI(stats.received) }}</p>
            <p class="text-xs text-muted">Received</p>
          </div>
          <div class="text-center">
            <p class="text-lg font-semibold">{{ stats.transactions }}</p>
            <p class="text-xs text-muted">Transactions</p>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="contact.notes">
          <h3 class="text-sm font-medium mb-2">Notes</h3>
          <p class="text-sm text-muted">{{ contact.notes }}</p>
        </div>

        <!-- Signer Info -->
        <div v-if="contact.signerCapabilities">
          <h3 class="text-sm font-medium mb-2">Signer Capabilities</h3>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="type in contact.signerCapabilities.transactionTypes"
              :key="type"
              color="primary"
              variant="subtle"
              size="sm"
            >
              {{ type }}
            </UBadge>
          </div>
        </div>

        <!-- Recent Activity -->
        <div v-if="contactTransactions.length">
          <h3 class="text-sm font-medium mb-2">Recent Activity</h3>
          <div class="divide-y divide-default rounded-lg border border-default">
            <TxItem
              v-for="tx in contactTransactions.slice(0, 5)"
              :key="tx.txid"
              :transaction="tx"
              compact
            />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-4 border-t border-default">
          <UButton
            class="flex-1"
            color="neutral"
            variant="outline"
            icon="i-lucide-edit"
            @click="emit('edit', contact)"
          >
            Edit
          </UButton>
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            @click="emit('delete', contact)"
          >
            Delete
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
```

---

## Integration Points

### 1. Send Page Integration

When sending, check if recipient is a contact:

```typescript
// In send page
const recipientContact = computed(() =>
  contactStore.findByAddress(draftStore.recipients[0]?.address),
)
```

### 2. Transaction History Integration

After each transaction, update contact stats:

```typescript
// In wallet store after receiving transaction
contactStore.recordTransaction(
  tx.address,
  BigInt(tx.amount),
  tx.type === 'send',
  tx.timestamp,
)
```

### 3. P2P Integration

When saving a signer as contact:

```typescript
// In P2P page
function saveSignerAsContact(signer: SignerAdvertisement) {
  contactStore.addContact({
    name: signer.nickname || 'Anonymous Signer',
    address: publicKeyToAddress(signer.publicKeyHex),
    publicKey: signer.publicKeyHex,
    peerId: signer.peerId,
    signerCapabilities: {
      transactionTypes: signer.transactionTypes,
      amountRange: signer.amountRange,
      fee: signer.fee,
    },
    tags: ['signer'],
    isFavorite: false,
  })
}
```

### 4. Explorer Integration

Show contact info when viewing addresses:

```typescript
// In ExplorerAddressDisplay
const contact = computed(() => contactStore.findByAddress(props.address))
```

---

_Next: [07_EXPLORER_PAGES.md](./07_EXPLORER_PAGES.md)_
