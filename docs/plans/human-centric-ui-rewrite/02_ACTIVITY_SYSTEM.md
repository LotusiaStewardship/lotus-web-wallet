# Phase 2: Activity System

## Overview

The Activity system is the **engagement engine** of the wallet. It answers the user's primary question: **"What happened while I was away?"**

This phase builds the unified activity feed that aggregates events from all sources into a single, chronological, actionable stream.

**Prerequisites**: Phase 1 (Foundation)  
**Estimated Effort**: 4-5 days  
**Priority**: P0

---

## Goals

1. Build the unified activity store
2. Create the activity feed page
3. Implement activity item components
4. Wire up all activity sources
5. Add filtering and search
6. Implement unread tracking and badges

---

## Activity Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACTIVITY ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SOURCES                          ACTIVITY STORE                 │
│  ───────                          ──────────────                 │
│                                                                  │
│  ┌──────────────┐                 ┌──────────────────────────┐  │
│  │ Wallet Store │──onTransaction──▶│                          │  │
│  └──────────────┘                 │                          │  │
│                                   │    Unified Activity      │  │
│  ┌──────────────┐                 │         Store            │  │
│  │ MuSig2 Store │──onSigning─────▶│                          │  │
│  └──────────────┘                 │  • items: Map<id, Item>  │  │
│                                   │  • unreadCount           │  │
│  ┌──────────────┐                 │  • filteredItems         │  │
│  │  P2P Store   │──onPeer────────▶│  • needsAttention        │  │
│  └──────────────┘                 │                          │  │
│                                   └──────────────────────────┘  │
│  ┌──────────────┐                            │                   │
│  │ Social Store │──onVote────────▶           │                   │
│  └──────────────┘                            │                   │
│                                              ▼                   │
│  ┌──────────────┐                 ┌──────────────────────────┐  │
│  │Service Worker│──onBackground──▶│     Activity Feed UI     │  │
│  └──────────────┘                 └──────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Activity Store Implementation

```typescript
// stores/activity.ts

import { defineStore } from 'pinia'
import type {
  ActivityItem,
  ActivityType,
  ActivityStatus,
  ActivityData,
} from '~/types/activity'

const STORAGE_KEY = 'lotus:activity'
const MAX_ITEMS = 500 // Limit stored items

export const useActivityStore = defineStore('activity', () => {
  // === STATE ===
  const items = ref<Map<string, ActivityItem>>(new Map())
  const filter = ref<ActivityType | 'all'>('all')
  const searchQuery = ref('')
  const lastReadTimestamp = ref<number>(0)
  const initialized = ref(false)

  // === INITIALIZATION ===
  async function initialize() {
    if (initialized.value) return

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const data = JSON.parse(stored)
        items.value = new Map(data.items)
        lastReadTimestamp.value = data.lastReadTimestamp || 0
      } catch (e) {
        console.error('Failed to load activity:', e)
      }
    }

    initialized.value = true
  }

  function persist() {
    const data = {
      items: Array.from(items.value.entries()),
      lastReadTimestamp: lastReadTimestamp.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  // === GETTERS ===

  /** All items sorted by timestamp (newest first) */
  const allItems = computed(() =>
    Array.from(items.value.values()).sort((a, b) => b.timestamp - a.timestamp),
  )

  /** Items filtered by type */
  const filteredItems = computed(() => {
    let result = allItems.value

    // Apply type filter
    if (filter.value !== 'all') {
      result = result.filter(item => item.type === filter.value)
    }

    // Apply search
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(item => matchesSearch(item, query))
    }

    return result
  })

  /** Count of unread items */
  const unreadCount = computed(
    () => allItems.value.filter(item => !item.readAt).length,
  )

  /** Items that need user attention (new with actions) */
  const needsAttention = computed(() =>
    allItems.value.filter(
      item => item.status === 'new' && item.actions && item.actions.length > 0,
    ),
  )

  /** Pending items (awaiting confirmation) */
  const pendingItems = computed(() =>
    allItems.value.filter(item => item.status === 'pending'),
  )

  /** Recent items for home page preview */
  const recentItems = computed(() => allItems.value.slice(0, 5))

  /** Group items by date for display */
  const groupedByDate = computed(() => {
    const groups: Map<string, ActivityItem[]> = new Map()

    for (const item of filteredItems.value) {
      const date = formatDateGroup(item.timestamp)
      if (!groups.has(date)) {
        groups.set(date, [])
      }
      groups.get(date)!.push(item)
    }

    return groups
  })

  // === ACTIONS ===

  function addActivity(data: Omit<ActivityItem, 'id'>): ActivityItem {
    const id = generateActivityId()
    const item: ActivityItem = { ...data, id }

    items.value.set(id, item)

    // Prune old items if over limit
    if (items.value.size > MAX_ITEMS) {
      pruneOldItems()
    }

    persist()
    return item
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
      if (!item.readAt) {
        item.readAt = now
      }
    })
    lastReadTimestamp.value = now
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

  function clearAll() {
    items.value.clear()
    persist()
  }

  // === ACTIVITY SOURCE HANDLERS ===

  /**
   * Called when a transaction is detected
   */
  function onTransaction(
    tx: {
      txid: string
      direction: 'incoming' | 'outgoing'
      amountSats: bigint
      address: string
      confirmations: number
      timestamp: number
    },
    contactId?: string,
  ) {
    // Check for duplicate
    const existing = findByTxid(tx.txid)
    if (existing) {
      // Update confirmations
      if (existing.data.type === 'transaction') {
        existing.data.confirmations = tx.confirmations
        if (tx.confirmations > 0 && existing.status === 'pending') {
          existing.status = 'complete'
        }
        persist()
      }
      return existing
    }

    return addActivity({
      type: 'transaction',
      status: tx.confirmations > 0 ? 'complete' : 'pending',
      timestamp: tx.timestamp,
      contactId,
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

  /**
   * Called when a signing request is received
   */
  function onSigningRequest(request: {
    sessionId: string
    walletId: string
    walletName: string
    amountSats: bigint
    initiatorId: string
    expiresAt: number
  }) {
    return addActivity({
      type: 'signing_request',
      status: 'new',
      timestamp: Date.now(),
      contactId: request.initiatorId,
      data: {
        type: 'signing_request',
        ...request,
      },
      actions: [
        {
          id: 'approve',
          label: 'Approve',
          icon: 'i-lucide-check',
          primary: true,
          handler: async () => {
            // Will be wired to MuSig2 store
          },
        },
        {
          id: 'reject',
          label: 'Reject',
          icon: 'i-lucide-x',
          handler: async () => {
            // Will be wired to MuSig2 store
          },
        },
      ],
    })
  }

  /**
   * Called when a signing session completes
   */
  function onSigningComplete(session: {
    sessionId: string
    walletId: string
    walletName: string
    txid: string
    amountSats: bigint
  }) {
    // Update the original request if exists
    const request = findBySessionId(session.sessionId)
    if (request) {
      request.status = 'complete'
      request.actions = undefined
    }

    return addActivity({
      type: 'signing_complete',
      status: 'complete',
      timestamp: Date.now(),
      data: {
        type: 'signing_complete',
        ...session,
      },
    })
  }

  /**
   * Called when a peer connects/disconnects
   */
  function onPeerEvent(event: {
    type: 'connected' | 'disconnected'
    peerId: string
    peerName?: string
  }) {
    return addActivity({
      type: event.type === 'connected' ? 'peer_connected' : 'peer_disconnected',
      status: 'complete',
      timestamp: Date.now(),
      data: {
        type:
          event.type === 'connected' ? 'peer_connected' : 'peer_disconnected',
        peerId: event.peerId,
        peerName: event.peerName,
      },
    })
  }

  /**
   * Called when a new signer is discovered
   */
  function onSignerDiscovered(signer: {
    publicKeyHex: string
    nickname?: string
    capabilities: SignerCapabilities
  }) {
    // Check for duplicate
    const existing = allItems.value.find(
      item =>
        item.data.type === 'signer_discovered' &&
        item.data.publicKeyHex === signer.publicKeyHex,
    )
    if (existing) return existing

    return addActivity({
      type: 'signer_discovered',
      status: 'new',
      timestamp: Date.now(),
      data: {
        type: 'signer_discovered',
        ...signer,
      },
      actions: [
        {
          id: 'add_contact',
          label: 'Add to Contacts',
          icon: 'i-lucide-user-plus',
          primary: true,
          handler: async () => {
            // Will be wired to People store
          },
        },
      ],
    })
  }

  /**
   * Called when a shared wallet is created
   */
  function onWalletCreated(wallet: {
    walletId: string
    walletName: string
    participantIds: string[]
  }) {
    return addActivity({
      type: 'wallet_created',
      status: 'complete',
      timestamp: Date.now(),
      contactIds: wallet.participantIds,
      data: {
        type: 'wallet_created',
        ...wallet,
      },
    })
  }

  /**
   * Called when a shared wallet receives funds
   */
  function onWalletFunded(wallet: {
    walletId: string
    walletName: string
    amountSats: bigint
    participantIds: string[]
  }) {
    return addActivity({
      type: 'wallet_funded',
      status: 'complete',
      timestamp: Date.now(),
      contactIds: wallet.participantIds,
      data: {
        type: 'wallet_funded',
        ...wallet,
      },
    })
  }

  /**
   * Called when a RANK vote is received
   */
  function onVoteReceived(vote: {
    platform: string
    profileId: string
    voteType: 'upvote' | 'downvote'
    voterAddress?: string
  }) {
    return addActivity({
      type: 'vote_received',
      status: 'complete',
      timestamp: Date.now(),
      data: {
        type: 'vote_received',
        ...vote,
      },
    })
  }

  /**
   * Add a system notification
   */
  function addSystemNotification(notification: {
    title: string
    message: string
    severity: 'info' | 'warning' | 'error'
  }) {
    return addActivity({
      type: 'system',
      status: notification.severity === 'error' ? 'failed' : 'complete',
      timestamp: Date.now(),
      data: {
        type: 'system',
        ...notification,
      },
    })
  }

  // === HELPERS ===

  function findByTxid(txid: string): ActivityItem | undefined {
    return allItems.value.find(
      item => item.data.type === 'transaction' && item.data.txid === txid,
    )
  }

  function findBySessionId(sessionId: string): ActivityItem | undefined {
    return allItems.value.find(
      item =>
        (item.data.type === 'signing_request' ||
          item.data.type === 'signing_complete') &&
        item.data.sessionId === sessionId,
    )
  }

  function matchesSearch(item: ActivityItem, query: string): boolean {
    // Search in type
    if (item.type.includes(query)) return true

    // Search in data based on type
    switch (item.data.type) {
      case 'transaction':
        return (
          item.data.txid.includes(query) || item.data.address.includes(query)
        )
      case 'signing_request':
      case 'signing_complete':
        return item.data.walletName.toLowerCase().includes(query)
      case 'signer_discovered':
        return item.data.nickname?.toLowerCase().includes(query) || false
      case 'system':
        return (
          item.data.title.toLowerCase().includes(query) ||
          item.data.message.toLowerCase().includes(query)
        )
      default:
        return false
    }
  }

  function pruneOldItems() {
    const sorted = allItems.value
    const toRemove = sorted.slice(MAX_ITEMS)
    toRemove.forEach(item => items.value.delete(item.id))
  }

  function generateActivityId(): string {
    return `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  function formatDateGroup(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return 'This Week'
    if (days < 30) return 'This Month'
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return {
    // State
    items,
    filter,
    searchQuery,
    initialized,

    // Getters
    allItems,
    filteredItems,
    unreadCount,
    needsAttention,
    pendingItems,
    recentItems,
    groupedByDate,

    // Actions
    initialize,
    addActivity,
    markAsRead,
    markAllAsRead,
    updateStatus,
    removeActivity,
    clearAll,

    // Source handlers
    onTransaction,
    onSigningRequest,
    onSigningComplete,
    onPeerEvent,
    onSignerDiscovered,
    onWalletCreated,
    onWalletFunded,
    onVoteReceived,
    addSystemNotification,

    // Lookups
    findByTxid,
    findBySessionId,
  }
})
```

---

## Activity Feed Page

```vue
<!-- pages/activity/index.vue -->
<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Activity</h1>
      <UButton
        v-if="activityStore.unreadCount > 0"
        variant="ghost"
        size="sm"
        @click="activityStore.markAllAsRead"
      >
        Mark all read
      </UButton>
    </div>

    <!-- Search -->
    <UInput
      v-model="activityStore.searchQuery"
      icon="i-lucide-search"
      placeholder="Search activity..."
    />

    <!-- Filters -->
    <div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
      <UButton
        v-for="filterOption in filterOptions"
        :key="filterOption.value"
        :color="
          activityStore.filter === filterOption.value ? 'primary' : 'neutral'
        "
        :variant="
          activityStore.filter === filterOption.value ? 'solid' : 'ghost'
        "
        size="sm"
        @click="activityStore.filter = filterOption.value"
      >
        {{ filterOption.label }}
        <UBadge
          v-if="filterOption.count > 0"
          :color="
            activityStore.filter === filterOption.value ? 'white' : 'primary'
          "
          size="xs"
          class="ml-1"
        >
          {{ filterOption.count }}
        </UBadge>
      </UButton>
    </div>

    <!-- Activity List -->
    <div v-if="activityStore.filteredItems.length > 0" class="space-y-6">
      <div
        v-for="[date, items] in activityStore.groupedByDate"
        :key="date"
        class="space-y-2"
      >
        <h3
          class="text-sm font-medium text-muted sticky top-0 bg-gray-50 dark:bg-gray-950 py-1"
        >
          {{ date }}
        </h3>

        <div class="space-y-2">
          <ActivityItem
            v-for="item in items"
            :key="item.id"
            :item="item"
            @click="handleItemClick(item)"
            @action="handleAction"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <UIcon name="i-lucide-inbox" class="w-12 h-12 mx-auto text-muted mb-4" />
      <h3 class="text-lg font-medium mb-1">No activity yet</h3>
      <p class="text-muted text-sm">
        Your transactions, signing requests, and other events will appear here.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Activity',
})

const activityStore = useActivityStore()

// Initialize on mount
onMounted(() => {
  activityStore.initialize()
})

const filterOptions = computed(() => [
  { value: 'all', label: 'All', count: activityStore.allItems.length },
  {
    value: 'transaction',
    label: 'Transactions',
    count: countByType('transaction'),
  },
  {
    value: 'signing_request',
    label: 'Requests',
    count: countByType('signing_request'),
  },
  {
    value: 'wallet_created',
    label: 'Wallets',
    count: countByType('wallet_created', 'wallet_funded'),
  },
  { value: 'system', label: 'System', count: countByType('system') },
])

function countByType(...types: string[]): number {
  return activityStore.allItems.filter(item => types.includes(item.type)).length
}

function handleItemClick(item: ActivityItem) {
  // Mark as read
  activityStore.markAsRead(item.id)

  // Navigate based on type
  switch (item.data.type) {
    case 'transaction':
      navigateTo(`/explore/tx/${item.data.txid}`)
      break
    case 'signing_request':
    case 'signing_complete':
      navigateTo(`/people/wallets/${item.data.walletId}`)
      break
    case 'signer_discovered':
      // Open add contact modal
      break
    case 'wallet_created':
    case 'wallet_funded':
      navigateTo(`/people/wallets/${item.data.walletId}`)
      break
  }
}

function handleAction(item: ActivityItem, actionId: string) {
  const action = item.actions?.find(a => a.id === actionId)
  if (action?.handler) {
    action.handler()
  }
}
</script>
```

---

## Activity Item Component

```vue
<!-- components/activity/ActivityItem.vue -->
<template>
  <div
    :class="[
      'p-4 rounded-xl border transition-all cursor-pointer',
      'hover:shadow-md hover:border-primary/30',
      !item.readAt && 'bg-primary/5 border-primary/20',
      item.readAt &&
        'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
    ]"
    @click="emit('click')"
  >
    <div class="flex items-start gap-3">
      <!-- Icon -->
      <div
        :class="[
          'w-10 h-10 rounded-full flex items-center justify-center',
          iconBgClass,
        ]"
      >
        <UIcon :name="icon" :class="['w-5 h-5', iconClass]" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-medium">{{ title }}</p>
            <p class="text-sm text-muted">{{ subtitle }}</p>
          </div>

          <!-- Unread indicator -->
          <div
            v-if="!item.readAt"
            class="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2"
          />
        </div>

        <!-- Amount (if applicable) -->
        <p v-if="amount" :class="['font-mono text-sm mt-1', amountClass]">
          {{ amount }}
        </p>

        <!-- Timestamp -->
        <p class="text-xs text-muted mt-1">{{ formattedTime }}</p>

        <!-- Actions -->
        <div v-if="item.actions?.length" class="flex gap-2 mt-3">
          <UButton
            v-for="action in item.actions"
            :key="action.id"
            :color="action.primary ? 'primary' : 'neutral'"
            :variant="action.primary ? 'solid' : 'outline'"
            size="sm"
            :icon="action.icon"
            @click.stop="emit('action', action.id)"
          >
            {{ action.label }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ActivityItem } from '~/types/activity'

const props = defineProps<{
  item: ActivityItem
}>()

const emit = defineEmits<{
  click: []
  action: [actionId: string]
}>()

const peopleStore = usePeopleStore()

// Computed display properties
const icon = computed(() => {
  switch (props.item.data.type) {
    case 'transaction':
      return props.item.data.direction === 'incoming'
        ? 'i-lucide-arrow-down-left'
        : 'i-lucide-arrow-up-right'
    case 'signing_request':
      return 'i-lucide-pen-tool'
    case 'signing_complete':
      return 'i-lucide-check-circle'
    case 'peer_connected':
      return 'i-lucide-wifi'
    case 'peer_disconnected':
      return 'i-lucide-wifi-off'
    case 'signer_discovered':
      return 'i-lucide-user-plus'
    case 'wallet_created':
      return 'i-lucide-shield-plus'
    case 'wallet_funded':
      return 'i-lucide-wallet'
    case 'vote_received':
      return props.item.data.voteType === 'upvote'
        ? 'i-lucide-thumbs-up'
        : 'i-lucide-thumbs-down'
    case 'system':
      return props.item.data.severity === 'error'
        ? 'i-lucide-alert-circle'
        : props.item.data.severity === 'warning'
        ? 'i-lucide-alert-triangle'
        : 'i-lucide-info'
    default:
      return 'i-lucide-activity'
  }
})

const iconBgClass = computed(() => {
  switch (props.item.data.type) {
    case 'transaction':
      return props.item.data.direction === 'incoming'
        ? 'bg-success/10'
        : 'bg-error/10'
    case 'signing_request':
      return 'bg-warning/10'
    case 'signing_complete':
      return 'bg-success/10'
    case 'signer_discovered':
    case 'wallet_created':
      return 'bg-primary/10'
    case 'system':
      return props.item.data.severity === 'error'
        ? 'bg-error/10'
        : props.item.data.severity === 'warning'
        ? 'bg-warning/10'
        : 'bg-info/10'
    default:
      return 'bg-gray-100 dark:bg-gray-800'
  }
})

const iconClass = computed(() => {
  switch (props.item.data.type) {
    case 'transaction':
      return props.item.data.direction === 'incoming'
        ? 'text-success'
        : 'text-error'
    case 'signing_request':
      return 'text-warning'
    case 'signing_complete':
      return 'text-success'
    case 'signer_discovered':
    case 'wallet_created':
      return 'text-primary'
    case 'system':
      return props.item.data.severity === 'error'
        ? 'text-error'
        : props.item.data.severity === 'warning'
        ? 'text-warning'
        : 'text-info'
    default:
      return 'text-gray-500'
  }
})

const title = computed(() => {
  switch (props.item.data.type) {
    case 'transaction':
      const contact = props.item.contactId
        ? peopleStore.getById(props.item.contactId)
        : null
      const direction = props.item.data.direction === 'incoming' ? 'from' : 'to'
      const who = contact?.name || truncateAddress(props.item.data.address)
      return `${
        props.item.data.direction === 'incoming' ? 'Received' : 'Sent'
      } ${direction} ${who}`
    case 'signing_request':
      return 'Signature requested'
    case 'signing_complete':
      return 'Transaction signed'
    case 'peer_connected':
      return `${props.item.data.peerName || 'Peer'} connected`
    case 'peer_disconnected':
      return `${props.item.data.peerName || 'Peer'} disconnected`
    case 'signer_discovered':
      return 'New signer discovered'
    case 'wallet_created':
      return 'Shared wallet created'
    case 'wallet_funded':
      return 'Wallet received funds'
    case 'vote_received':
      return `${
        props.item.data.voteType === 'upvote' ? 'Upvote' : 'Downvote'
      } received`
    case 'system':
      return props.item.data.title
    default:
      return 'Activity'
  }
})

const subtitle = computed(() => {
  switch (props.item.data.type) {
    case 'transaction':
      return props.item.data.confirmations > 0
        ? `${props.item.data.confirmations} confirmations`
        : 'Pending confirmation'
    case 'signing_request':
      return props.item.data.walletName
    case 'signing_complete':
      return props.item.data.walletName
    case 'signer_discovered':
      return (
        props.item.data.nickname ||
        truncateAddress(props.item.data.publicKeyHex)
      )
    case 'wallet_created':
    case 'wallet_funded':
      return props.item.data.walletName
    case 'vote_received':
      return `${props.item.data.platform} profile`
    case 'system':
      return props.item.data.message
    default:
      return ''
  }
})

const amount = computed(() => {
  switch (props.item.data.type) {
    case 'transaction':
      return formatAmount(props.item.data.amountSats)
    case 'signing_request':
    case 'signing_complete':
      return formatAmount(props.item.data.amountSats)
    case 'wallet_funded':
      return props.item.data.amountSats
        ? formatAmount(props.item.data.amountSats)
        : null
    default:
      return null
  }
})

const amountClass = computed(() => {
  if (props.item.data.type === 'transaction') {
    return props.item.data.direction === 'incoming'
      ? 'text-success'
      : 'text-error'
  }
  return ''
})

const formattedTime = computed(() => {
  return formatRelativeTime(props.item.timestamp)
})

function truncateAddress(address: string): string {
  if (address.length <= 16) return address
  return `${address.slice(0, 8)}...${address.slice(-6)}`
}

function formatAmount(sats: bigint): string {
  const xpi = Number(sats) / 1_000_000
  return `${xpi.toLocaleString(undefined, { maximumFractionDigits: 6 })} XPI`
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return new Date(timestamp).toLocaleDateString()
}
</script>
```

---

## Wiring Activity Sources

### Wallet Store Integration

```typescript
// In stores/wallet.ts - add activity integration

import { useActivityStore } from './activity'
import { usePeopleStore } from './people'

// After detecting a new transaction:
function onNewTransaction(tx: Transaction) {
  const activityStore = useActivityStore()
  const peopleStore = usePeopleStore()

  // Find contact by address
  const contact = peopleStore.getByAddress(tx.address)

  // Add to activity
  activityStore.onTransaction(
    {
      txid: tx.txid,
      direction: tx.direction,
      amountSats: tx.amountSats,
      address: tx.address,
      confirmations: tx.confirmations,
      timestamp: tx.timestamp,
    },
    contact?.id,
  )

  // Update contact activity
  if (contact) {
    peopleStore.recordActivity(
      contact.id,
      tx.amountSats,
      tx.direction === 'outgoing',
    )
  }
}
```

### MuSig2 Store Integration

```typescript
// In stores/musig2.ts - add activity integration

import { useActivityStore } from './activity'

// When receiving a signing request:
function onSigningRequestReceived(request: SigningRequest) {
  const activityStore = useActivityStore()

  activityStore.onSigningRequest({
    sessionId: request.sessionId,
    walletId: request.walletId,
    walletName: request.walletName,
    amountSats: request.amountSats,
    initiatorId: request.initiatorId,
    expiresAt: request.expiresAt,
  })
}

// When a session completes:
function onSessionComplete(session: MuSig2Session) {
  const activityStore = useActivityStore()

  activityStore.onSigningComplete({
    sessionId: session.id,
    walletId: session.walletId,
    walletName: session.walletName,
    txid: session.txid!,
    amountSats: session.amountSats,
  })
}
```

### P2P Store Integration

```typescript
// In stores/p2p.ts - add activity integration

import { useActivityStore } from './activity'
import { usePeopleStore } from './people'

// When a peer connects:
function onPeerConnected(peerId: string) {
  const activityStore = useActivityStore()
  const peopleStore = usePeopleStore()

  const person = peopleStore.getByPeerId(peerId)

  activityStore.onPeerEvent({
    type: 'connected',
    peerId,
    peerName: person?.name,
  })

  // Update presence
  peopleStore.updatePresence(peerId, true)
}

// When a signer is discovered:
function onSignerDiscovered(signer: DiscoveredSigner) {
  const activityStore = useActivityStore()

  activityStore.onSignerDiscovered({
    publicKeyHex: signer.publicKeyHex,
    nickname: signer.nickname,
    capabilities: signer.capabilities,
  })
}
```

---

## Tasks Checklist

### Store Implementation

- [ ] Create `stores/activity.ts` with full implementation
- [ ] Add persistence layer
- [ ] Implement all activity source handlers
- [ ] Add deduplication logic

### Components

- [ ] Create `components/activity/ActivityItem.vue`
- [ ] Create `components/activity/ActivityList.vue`
- [ ] Create `components/activity/ActivityFilters.vue`
- [ ] Create `components/activity/ActivityEmpty.vue`

### Page

- [ ] Create `pages/activity/index.vue`
- [ ] Implement search and filtering
- [ ] Implement date grouping
- [ ] Add pull-to-refresh (mobile)

### Integration

- [ ] Wire wallet store to activity
- [ ] Wire MuSig2 store to activity
- [ ] Wire P2P store to activity
- [ ] Wire social/RANK to activity
- [ ] Wire service worker background events

### Navigation

- [ ] Add unread badge to bottom nav
- [ ] Update badge when new activity arrives

---

## Verification

- [ ] Activity items appear for all event types
- [ ] Unread count updates correctly
- [ ] Mark as read works (individual and all)
- [ ] Filters work correctly
- [ ] Search finds relevant items
- [ ] Date grouping displays correctly
- [ ] Inline actions work
- [ ] Navigation from items works
- [ ] Persistence survives page reload

---

_Next: [03_PEOPLE_SYSTEM.md](./03_PEOPLE_SYSTEM.md)_
