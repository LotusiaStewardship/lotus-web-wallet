# Phase 1: Foundation

## Overview

This phase establishes the core infrastructure for the human-centric UI rewrite. All existing pages are considered deleted—we build from scratch with a unified architecture.

**Prerequisites**: None  
**Estimated Effort**: 3-4 days  
**Priority**: P0

---

## Goals

1. Define the new page structure
2. Create unified type definitions
3. Establish core stores (activity, people)
4. Set up shared components
5. Configure navigation

---

## New Page Structure

```
pages/
├── index.vue                    # Home (command center)
├── people/
│   ├── index.vue               # People hub
│   ├── [id].vue                # Contact detail
│   └── wallets/
│       ├── index.vue           # Shared wallets list
│       └── [id].vue            # Shared wallet detail
├── activity/
│   └── index.vue               # Unified activity feed
├── settings/
│   └── index.vue               # Comprehensive settings
└── explore/
    └── [...slug].vue           # Explorer (catch-all)
```

**Key Changes**:

- No `/transact` section — actions are modals/sheets from anywhere
- No `/people/contacts.vue` — contacts are the default People view
- No `/people/p2p.vue` — P2P is integrated into People
- Activity is a top-level route, not buried under Transact

---

## Type Definitions

### Activity Types

```typescript
// types/activity.ts

export type ActivityType =
  | 'transaction' // Blockchain transaction
  | 'signing_request' // MuSig2 signing request
  | 'signing_complete' // MuSig2 session completed
  | 'peer_connected' // P2P peer connected
  | 'peer_disconnected' // P2P peer disconnected
  | 'signer_discovered' // New signer found
  | 'wallet_created' // Shared wallet created
  | 'wallet_funded' // Shared wallet received funds
  | 'vote_received' // RANK vote received
  | 'system' // System notifications

export type ActivityStatus =
  | 'new' // Unread, requires attention
  | 'pending' // Awaiting action or confirmation
  | 'complete' // Resolved
  | 'failed' // Needs retry or acknowledgment

export interface ActivityItem {
  id: string
  type: ActivityType
  status: ActivityStatus

  // Timing
  timestamp: number
  readAt?: number

  // People context
  contactId?: string // Related contact
  contactIds?: string[] // Multiple contacts (shared wallet)

  // Type-specific data
  data: ActivityData

  // Actions available
  actions?: ActivityAction[]
}

export type ActivityData =
  | TransactionActivityData
  | SigningRequestActivityData
  | SigningCompleteActivityData
  | PeerActivityData
  | SignerDiscoveredActivityData
  | WalletActivityData
  | VoteActivityData
  | SystemActivityData

export interface TransactionActivityData {
  type: 'transaction'
  txid: string
  direction: 'incoming' | 'outgoing'
  amountSats: bigint
  address: string
  confirmations: number
}

export interface SigningRequestActivityData {
  type: 'signing_request'
  sessionId: string
  walletId: string
  walletName: string
  amountSats: bigint
  initiatorId: string
  expiresAt: number
}

export interface SigningCompleteActivityData {
  type: 'signing_complete'
  sessionId: string
  walletId: string
  walletName: string
  txid: string
  amountSats: bigint
}

export interface PeerActivityData {
  type: 'peer_connected' | 'peer_disconnected'
  peerId: string
  peerName?: string
}

export interface SignerDiscoveredActivityData {
  type: 'signer_discovered'
  publicKeyHex: string
  nickname?: string
  capabilities: SignerCapabilities
}

export interface WalletActivityData {
  type: 'wallet_created' | 'wallet_funded'
  walletId: string
  walletName: string
  amountSats?: bigint
  participantIds: string[]
}

export interface VoteActivityData {
  type: 'vote_received'
  platform: string
  profileId: string
  voteType: 'upvote' | 'downvote'
  voterAddress?: string
}

export interface SystemActivityData {
  type: 'system'
  title: string
  message: string
  severity: 'info' | 'warning' | 'error'
}

export interface ActivityAction {
  id: string
  label: string
  icon: string
  primary?: boolean
  handler: () => void | Promise<void>
}
```

### People Types

```typescript
// types/people.ts

export type RelationshipLevel = 0 | 1 | 2 | 3

export interface Person {
  // Core identity
  id: string
  name: string
  address: string

  // Cryptographic identity
  publicKeyHex?: string

  // P2P presence
  peerId?: string
  isOnline: boolean
  lastSeenAt?: number

  // Capabilities
  canSign: boolean
  signerCapabilities?: SignerCapabilities

  // Relationship
  level: RelationshipLevel
  isFavorite: boolean
  tags: string[]
  notes?: string

  // Activity summary
  lastActivityAt?: number
  transactionCount: number
  totalSent: bigint
  totalReceived: bigint

  // Shared wallets
  sharedWalletIds: string[]

  // UI
  avatarUrl?: string

  // Timestamps
  createdAt: number
  updatedAt: number
}

export interface SharedWallet {
  id: string
  name: string
  address: string

  // Participants (Person IDs)
  participantIds: string[]
  threshold: number

  // Balance
  balanceSats: bigint

  // Activity
  lastActivityAt?: number
  transactionCount: number

  // Status
  status: 'active' | 'pending' | 'archived'

  // Timestamps
  createdAt: number
  updatedAt: number
}
```

---

## Core Stores

### Activity Store

```typescript
// stores/activity.ts

export const useActivityStore = defineStore('activity', () => {
  // === STATE ===
  const items = ref<Map<string, ActivityItem>>(new Map())
  const filter = ref<ActivityType | 'all'>('all')
  const lastReadAt = ref<number>(0)

  // === GETTERS ===
  const allItems = computed(() =>
    Array.from(items.value.values()).sort((a, b) => b.timestamp - a.timestamp),
  )

  const filteredItems = computed(() => {
    if (filter.value === 'all') return allItems.value
    return allItems.value.filter(item => item.type === filter.value)
  })

  const unreadCount = computed(
    () => allItems.value.filter(item => !item.readAt).length,
  )

  const pendingActions = computed(() =>
    allItems.value.filter(
      item => item.status === 'new' || item.status === 'pending',
    ),
  )

  const needsAttention = computed(() =>
    allItems.value.filter(
      item => item.status === 'new' && item.actions?.length,
    ),
  )

  // === ACTIONS ===
  function addActivity(item: Omit<ActivityItem, 'id'>) {
    const id = generateId('activity')
    items.value.set(id, { ...item, id })
    persist()
  }

  function markAsRead(id: string) {
    const item = items.value.get(id)
    if (item && !item.readAt) {
      item.readAt = Date.now()
      persist()
    }
  }

  function markAllAsRead() {
    const now = Date.now()
    items.value.forEach(item => {
      if (!item.readAt) item.readAt = now
    })
    lastReadAt.value = now
    persist()
  }

  function updateStatus(id: string, status: ActivityStatus) {
    const item = items.value.get(id)
    if (item) {
      item.status = status
      persist()
    }
  }

  function removeActivity(id: string) {
    items.value.delete(id)
    persist()
  }

  // === ACTIVITY SOURCES ===
  // These methods are called by other stores/services

  function onTransaction(tx: Transaction, contact?: Person) {
    addActivity({
      type: 'transaction',
      status: tx.confirmations > 0 ? 'complete' : 'pending',
      timestamp: tx.timestamp,
      contactId: contact?.id,
      data: {
        type: 'transaction',
        txid: tx.txid,
        direction: tx.direction,
        amountSats: tx.amountSats,
        address: tx.address,
        confirmations: tx.confirmations,
      },
    })
  }

  function onSigningRequest(request: SigningRequest) {
    addActivity({
      type: 'signing_request',
      status: 'new',
      timestamp: Date.now(),
      contactId: request.initiatorId,
      data: {
        type: 'signing_request',
        sessionId: request.sessionId,
        walletId: request.walletId,
        walletName: request.walletName,
        amountSats: request.amountSats,
        initiatorId: request.initiatorId,
        expiresAt: request.expiresAt,
      },
      actions: [
        {
          id: 'approve',
          label: 'Approve',
          icon: 'i-lucide-check',
          primary: true,
          handler: () => {},
        },
        {
          id: 'reject',
          label: 'Reject',
          icon: 'i-lucide-x',
          handler: () => {},
        },
      ],
    })
  }

  // ... more activity source methods

  return {
    items,
    filter,
    allItems,
    filteredItems,
    unreadCount,
    pendingActions,
    needsAttention,
    addActivity,
    markAsRead,
    markAllAsRead,
    updateStatus,
    removeActivity,
    onTransaction,
    onSigningRequest,
  }
})
```

### People Store

```typescript
// stores/people.ts

export const usePeopleStore = defineStore('people', () => {
  // === STATE ===
  const people = ref<Map<string, Person>>(new Map())
  const sharedWallets = ref<Map<string, SharedWallet>>(new Map())
  const searchQuery = ref('')
  const sortBy = ref<'recent' | 'name' | 'favorite'>('recent')

  // === GETTERS ===
  const allPeople = computed(() => Array.from(people.value.values()))

  const sortedPeople = computed(() => {
    const list = [...allPeople.value]

    switch (sortBy.value) {
      case 'recent':
        return list.sort(
          (a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0),
        )
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name))
      case 'favorite':
        return list.sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
          return (b.lastActivityAt || 0) - (a.lastActivityAt || 0)
        })
    }
  })

  const filteredPeople = computed(() => {
    if (!searchQuery.value.trim()) return sortedPeople.value

    const query = searchQuery.value.toLowerCase()
    return sortedPeople.value.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query) ||
        p.notes?.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query)),
    )
  })

  const onlinePeople = computed(() => allPeople.value.filter(p => p.isOnline))

  const signers = computed(() => allPeople.value.filter(p => p.canSign))

  const favorites = computed(() => allPeople.value.filter(p => p.isFavorite))

  const allWallets = computed(() => Array.from(sharedWallets.value.values()))

  // === LOOKUPS ===
  function getById(id: string): Person | undefined {
    return people.value.get(id)
  }

  function getByAddress(address: string): Person | undefined {
    return allPeople.value.find(p => p.address === address)
  }

  function getByPublicKey(publicKeyHex: string): Person | undefined {
    return allPeople.value.find(p => p.publicKeyHex === publicKeyHex)
  }

  function getByPeerId(peerId: string): Person | undefined {
    return allPeople.value.find(p => p.peerId === peerId)
  }

  function getWallet(id: string): SharedWallet | undefined {
    return sharedWallets.value.get(id)
  }

  // === ACTIONS ===
  function addPerson(
    data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>,
  ): Person {
    const now = Date.now()
    const person: Person = {
      ...data,
      id: generateId('person'),
      createdAt: now,
      updatedAt: now,
    }
    people.value.set(person.id, person)
    persist()
    return person
  }

  function updatePerson(id: string, updates: Partial<Person>): Person | null {
    const person = people.value.get(id)
    if (!person) return null

    const updated = { ...person, ...updates, updatedAt: Date.now() }
    people.value.set(id, updated)
    persist()
    return updated
  }

  function removePerson(id: string): boolean {
    const deleted = people.value.delete(id)
    if (deleted) persist()
    return deleted
  }

  function updatePresence(peerId: string, isOnline: boolean) {
    const person = getByPeerId(peerId)
    if (person) {
      person.isOnline = isOnline
      person.lastSeenAt = Date.now()
      person.updatedAt = Date.now()
      persist()
    }
  }

  function recordActivity(
    personId: string,
    amountSats: bigint,
    isSend: boolean,
  ) {
    const person = people.value.get(personId)
    if (!person) return

    person.lastActivityAt = Date.now()
    person.transactionCount++
    if (isSend) {
      person.totalSent += amountSats
    } else {
      person.totalReceived += amountSats
    }
    person.updatedAt = Date.now()
    persist()
  }

  // Shared wallet actions
  function addWallet(
    data: Omit<SharedWallet, 'id' | 'createdAt' | 'updatedAt'>,
  ): SharedWallet {
    const now = Date.now()
    const wallet: SharedWallet = {
      ...data,
      id: generateId('wallet'),
      createdAt: now,
      updatedAt: now,
    }
    sharedWallets.value.set(wallet.id, wallet)

    // Update participants' sharedWalletIds
    wallet.participantIds.forEach(pid => {
      const person = people.value.get(pid)
      if (person && !person.sharedWalletIds.includes(wallet.id)) {
        person.sharedWalletIds.push(wallet.id)
      }
    })

    persist()
    return wallet
  }

  return {
    people,
    sharedWallets,
    searchQuery,
    sortBy,
    allPeople,
    sortedPeople,
    filteredPeople,
    onlinePeople,
    signers,
    favorites,
    allWallets,
    getById,
    getByAddress,
    getByPublicKey,
    getByPeerId,
    getWallet,
    addPerson,
    updatePerson,
    removePerson,
    updatePresence,
    recordActivity,
    addWallet,
  }
})
```

---

## Navigation Configuration

### Bottom Navigation Component

```vue
<!-- components/navigation/BottomNav.vue -->
<template>
  <nav
    class="fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-pb"
  >
    <div class="flex items-center justify-around h-16">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center w-16 h-full relative"
        :class="isActive(item.to) ? 'text-primary' : 'text-gray-500'"
      >
        <!-- Action button (center) -->
        <template v-if="item.isAction">
          <button
            class="w-12 h-12 -mt-4 rounded-full bg-primary text-white shadow-lg flex items-center justify-center"
            @click="openActionSheet"
          >
            <UIcon :name="item.icon" class="w-6 h-6" />
          </button>
        </template>

        <!-- Regular nav item -->
        <template v-else>
          <div class="relative">
            <UIcon :name="item.icon" class="w-6 h-6" />
            <span
              v-if="item.badge && item.badge > 0"
              class="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-xs rounded-full flex items-center justify-center"
            >
              {{ item.badge > 9 ? '9+' : item.badge }}
            </span>
          </div>
          <span class="text-xs mt-1">{{ item.label }}</span>
        </template>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const activityStore = useActivityStore()

const navItems = computed(() => [
  { to: '/', icon: 'i-lucide-home', label: 'Home' },
  { to: '/people', icon: 'i-lucide-users', label: 'People' },
  { to: '#action', icon: 'i-lucide-plus', label: '', isAction: true },
  {
    to: '/activity',
    icon: 'i-lucide-bell',
    label: 'Activity',
    badge: activityStore.unreadCount,
  },
  { to: '/settings', icon: 'i-lucide-settings', label: 'Settings' },
])

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

const actionSheetOpen = ref(false)
function openActionSheet() {
  actionSheetOpen.value = true
}
</script>
```

### Action Sheet Component

```vue
<!-- components/navigation/ActionSheet.vue -->
<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-sm' }">
    <div class="p-4">
      <h2 class="text-lg font-semibold mb-4 text-center">Quick Actions</h2>

      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="action in actions"
          :key="action.id"
          class="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          @click="handleAction(action)"
        >
          <div
            class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <UIcon :name="action.icon" class="w-6 h-6 text-primary" />
          </div>
          <span class="text-sm font-medium">{{ action.label }}</span>
        </button>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open')

const actions = [
  { id: 'send', icon: 'i-lucide-send', label: 'Send' },
  { id: 'receive', icon: 'i-lucide-qr-code', label: 'Receive' },
  { id: 'scan', icon: 'i-lucide-scan', label: 'Scan QR' },
  { id: 'wallet', icon: 'i-lucide-shield', label: 'New Wallet' },
]

function handleAction(action: (typeof actions)[0]) {
  open.value = false

  switch (action.id) {
    case 'send':
      // Open send modal
      break
    case 'receive':
      // Open receive modal
      break
    case 'scan':
      // Open scanner
      break
    case 'wallet':
      // Navigate to create wallet
      navigateTo('/people/wallets?create=true')
      break
  }
}
</script>
```

---

## Layout Update

```vue
<!-- layouts/default.vue -->
<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Header -->
    <header
      class="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 safe-area-pt"
    >
      <div class="flex items-center justify-between h-14 px-4">
        <div class="flex items-center gap-2">
          <img src="/favicon.ico" alt="Lotus" class="w-8 h-8" />
          <span class="font-semibold text-lg">Lotus</span>
        </div>

        <div class="flex items-center gap-2">
          <NetworkStatusIndicator />
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="pb-20 px-4 py-4">
      <slot />
    </main>

    <!-- Bottom navigation -->
    <BottomNav />

    <!-- Global modals -->
    <ActionSheet v-model:open="actionSheetOpen" />
    <SendModal v-model:open="sendModalOpen" />
    <ReceiveModal v-model:open="receiveModalOpen" />
  </div>
</template>
```

---

## Tasks Checklist

### Type Definitions

- [ ] Create `types/activity.ts` with all activity types
- [ ] Create `types/people.ts` with Person and SharedWallet types
- [ ] Update existing types to align with new model

### Stores

- [ ] Create `stores/activity.ts` with unified activity management
- [ ] Create `stores/people.ts` with people and wallet management
- [ ] Add persistence layer for both stores
- [ ] Wire up activity sources from existing stores

### Navigation

- [ ] Create `components/navigation/BottomNav.vue`
- [ ] Create `components/navigation/ActionSheet.vue`
- [ ] Update `layouts/default.vue` with new layout
- [ ] Remove old navigation components

### Page Structure

- [ ] Create new page directory structure
- [ ] Create placeholder pages for each route
- [ ] Set up route guards and redirects

### Cleanup

- [ ] Document which old files will be deleted
- [ ] Create migration notes for any data transformations

---

## Verification

- [ ] Navigation renders correctly on all screen sizes
- [ ] Activity badge updates when new items arrive
- [ ] Action sheet opens and closes properly
- [ ] All placeholder pages are accessible
- [ ] TypeScript compiles without errors

---

_Next: [02_ACTIVITY_SYSTEM.md](./02_ACTIVITY_SYSTEM.md)_
