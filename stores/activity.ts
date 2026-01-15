/**
 * Activity Store
 *
 * Unified activity aggregation with persistence and read/unread tracking.
 * Provides a single view of all user activity across features.
 */
import { defineStore } from 'pinia'
import { useWalletStore } from './wallet'
import { useP2PStore } from './p2p'
import { useMuSig2Store } from './musig2'

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'lotus:activity'
const MAX_ITEMS = 500

// ============================================================================
// Store Definition (Composition API)
// ============================================================================

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
        items.value = new Map(data.items || [])
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

  // === LEGACY GETTERS (for backward compatibility) ===
  // These aggregate from other stores for items not yet in our persistent store

  /**
   * Get activity items from other stores (wallet transactions, P2P events, MuSig2 sessions).
   * These items are generated on-the-fly and use lastReadTimestamp to determine read state.
   */
  function getLegacyItems(): ActivityItem[] {
    const legacyItems: ActivityItem[] = []

    try {
      const walletStore = useWalletStore()
      const p2pStore = useP2PStore()
      const musig2Store = useMuSig2Store()

      // Wallet transactions
      for (const tx of walletStore.transactionHistory || []) {
        const id = `tx_${tx.txid}`
        if (!items.value.has(id)) {
          const timestamp = parseInt(tx.timestamp) * 1000 || Date.now()
          legacyItems.push({
            id,
            type: 'transaction',
            status: tx.confirmations > 0 ? 'complete' : 'pending',
            timestamp,
            // Mark as read if timestamp is before lastReadTimestamp
            readAt:
              timestamp <= lastReadTimestamp.value
                ? lastReadTimestamp.value
                : undefined,
            data: {
              type: 'transaction',
              txid: tx.txid,
              direction: tx.isSend ? 'outgoing' : 'incoming',
              amountSats: BigInt(tx.amount || 0),
              address: tx.address,
              confirmations: tx.confirmations,
            },
          })
        }
      }

      // P2P events
      for (const event of p2pStore.activityEvents || []) {
        if (!items.value.has(event.id)) {
          const timestamp = event.timestamp
          legacyItems.push({
            id: event.id,
            type:
              event.type === 'peer_joined'
                ? 'peer_connected'
                : 'peer_disconnected',
            status: 'complete',
            timestamp,
            // Mark as read if timestamp is before lastReadTimestamp
            readAt:
              timestamp <= lastReadTimestamp.value
                ? lastReadTimestamp.value
                : undefined,
            data: {
              type:
                event.type === 'peer_joined'
                  ? 'peer_connected'
                  : 'peer_disconnected',
              peerId: event.peerId,
              peerName: event.nickname,
            },
          })
        }
      }

      // MuSig2 sessions
      for (const session of musig2Store.activeSessions || []) {
        const id = `session_${session.id}`
        if (!items.value.has(id)) {
          const timestamp = session.createdAt
          const type: ActivityType =
            session.state === 'completed'
              ? 'signing_complete'
              : 'signing_request'
          const status: ActivityStatus =
            session.state === 'completed' ? 'complete' : 'new'
          const data: SigningRequestActivityData | SigningCompleteActivityData =
            session.state === 'completed'
              ? {
                  type: 'signing_complete',
                  sessionId: session.id,
                  walletId:
                    (session.metadata?.walletId as string) || session.id,
                  walletName:
                    (session.metadata?.walletName as string) || 'Shared Wallet',
                  txid: session.metadata?.txid as string,
                  amountSats: session.metadata?.amountSats as bigint,
                }
              : {
                  type: 'signing_request',
                  sessionId: session.id,
                  walletId:
                    (session.metadata?.walletId as string) || session.id,
                  walletName:
                    (session.metadata?.walletName as string) || 'Shared Wallet',
                  amountSats: session.metadata?.amountSats as bigint,
                  initiatorId: session.metadata?.initiatorId as string,
                  expiresAt: session.metadata?.expiresAt as number,
                }
          legacyItems.push({
            id,
            type,
            status,
            timestamp,
            // Mark as read if timestamp is before lastReadTimestamp
            readAt:
              timestamp <= lastReadTimestamp.value
                ? lastReadTimestamp.value
                : undefined,
            data,
          })
        }
      }
    } catch (e) {
      // Stores may not be available yet
    }

    return legacyItems
  }

  // === GETTERS ===

  const allItems = computed(() => {
    const persistedItems = Array.from(items.value.values())
    const legacyItems = getLegacyItems()
    const combined = [...persistedItems, ...legacyItems]
    return combined.sort((a, b) => b.timestamp - a.timestamp)
  })

  const filteredItems = computed(() => {
    let result = allItems.value

    if (filter.value !== 'all') {
      result = result.filter(item => item.type === filter.value)
    }

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(item => matchesSearch(item, query))
    }

    return result
  })

  const unreadCount = computed(
    () => allItems.value.filter(item => !item.readAt).length,
  )

  const needsAttention = computed(() =>
    allItems.value.filter(
      item => item.status === 'new' && item.actions && item.actions.length > 0,
    ),
  )

  const pendingItems = computed(() =>
    allItems.value.filter(item => item.status === 'pending'),
  )

  const recentItems = computed(() => allItems.value.slice(0, 5))

  const recentActivity = computed(() => allItems.value.slice(0, 20))

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

  const activityCounts = computed(() => {
    const counts: Record<string, number> = {
      all: 0,
      transaction: 0,
      signing_request: 0,
      signing_complete: 0,
      peer_connected: 0,
      peer_disconnected: 0,
      system: 0,
    }

    for (const item of allItems.value) {
      counts.all++
      if (counts[item.type] !== undefined) {
        counts[item.type]++
      }
    }

    return counts
  })

  // === ACTIONS ===

  function addActivity(data: Omit<ActivityItem, 'id'>): ActivityItem {
    const id = generateActivityId()
    const item: ActivityItem = { ...data, id }

    items.value.set(id, item)

    if (items.value.size > MAX_ITEMS) {
      pruneOldItems()
    }

    persist()
    return item
  }

  function markAsRead(id: string) {
    // Check if item is in persisted store
    const item = items.value.get(id)
    if (item) {
      if (!item.readAt) {
        item.readAt = Date.now()
        persist()
      }
      return
    }

    // Check if it's a legacy item - if so, persist it with readAt set
    const legacyItem = getLegacyItems().find(i => i.id === id)
    if (legacyItem && !legacyItem.readAt) {
      legacyItem.readAt = Date.now()
      items.value.set(id, legacyItem)
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
    const existing = findByTxid(tx.txid)
    if (existing) {
      const data = existing.data as TransactionActivityData
      if (data.confirmations !== tx.confirmations) {
        data.confirmations = tx.confirmations
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
        },
        { id: 'reject', label: 'Reject', icon: 'i-lucide-x' },
      ],
    })
  }

  function onSigningComplete(session: {
    sessionId: string
    walletId: string
    walletName: string
    txid: string
    amountSats: bigint
  }) {
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
   * Record a signer discovery activity.
   * Called when a new MuSig2 signer is discovered on the P2P network.
   * Deduplicates by publicKeyHex to avoid duplicate activity entries.
   *
   * @param signer - The discovered signer information
   * @param signer.publicKeyHex - The signer's public key in hex format
   * @param signer.nickname - Optional display name for the signer
   * @returns The existing or newly created activity item
   */
  function onSignerDiscovered(signer: {
    publicKeyHex: string
    nickname?: string
  }) {
    const existing = allItems.value.find(item => {
      if (item.data.type === 'signer_discovered') {
        return item.data.publicKeyHex === signer.publicKeyHex
      }
    })
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
        },
      ],
    })
  }

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
    return allItems.value.find(item => {
      if (item.data.type === 'transaction') {
        return item.data.txid === txid
      }
    })
  }

  function findBySessionId(sessionId: string): ActivityItem | undefined {
    return allItems.value.find(item => {
      if (item.data.type === 'signing_request') {
        return item.data.sessionId === sessionId
      }
    })
  }

  function matchesSearch(item: ActivityItem, query: string): boolean {
    if (item.type.includes(query)) return true

    switch (item.data.type) {
      case 'transaction':
        return (
          String(item.data.txid || '').includes(query) ||
          String(item.data.address || '').includes(query)
        )
      case 'signing_request':
      case 'signing_complete':
        return String(item.data.walletName || '')
          .toLowerCase()
          .includes(query)
      case 'signer_discovered':
        return String(item.data.nickname || '')
          .toLowerCase()
          .includes(query)
      case 'system':
        return (
          String(item.data.title || '')
            .toLowerCase()
            .includes(query) ||
          String(item.data.message || '')
            .toLowerCase()
            .includes(query)
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
    recentActivity,
    groupedByDate,
    activityCounts,

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
