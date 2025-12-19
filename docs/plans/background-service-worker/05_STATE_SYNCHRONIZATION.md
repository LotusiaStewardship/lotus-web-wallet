# Phase 5: State Synchronization

## Overview

This phase implements IndexedDB-based state caching and synchronization between the service worker and client application. This ensures reliable state persistence and recovery, especially important for offline scenarios and tab reactivation.

**Priority**: P2 (Medium)
**Estimated Effort**: 1 day
**Dependencies**: Phase 1 (Service Worker Foundation), Phase 2 (Network Monitor)

---

## Objectives

1. Implement IndexedDB storage in service worker
2. Cache critical wallet state for offline access
3. Synchronize state between SW and client on reconnection
4. Handle state conflicts gracefully

---

## Why IndexedDB?

Service workers cannot use `localStorage` (synchronous API). IndexedDB is the only persistent storage option available in service workers.

### Benefits

- Persistent across browser restarts
- Available in both SW and client contexts
- Supports structured data (objects, arrays)
- Transaction-based for data integrity

---

## 1. IndexedDB Schema

### File: `public/sw.js` (additions)

Define the database schema.

```js
// ============================================================================
// IndexedDB State Storage
// ============================================================================

const DB_NAME = 'lotus-wallet-sw'
const DB_VERSION = 1

// Store names
const STORES = {
  CONFIG: 'config',
  UTXOS: 'utxos',
  TRANSACTIONS: 'transactions',
  SESSIONS: 'sessions',
  PRESENCE: 'presence',
  NOTIFICATIONS: 'notifications',
}

let db = null

/**
 * Initialize IndexedDB
 */
async function initializeDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[SW] IndexedDB error:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result
      console.log('[SW] IndexedDB initialized')
      resolve(db)
    }

    request.onupgradeneeded = event => {
      const database = event.target.result

      // Config store (single record)
      if (!database.objectStoreNames.contains(STORES.CONFIG)) {
        database.createObjectStore(STORES.CONFIG, { keyPath: 'id' })
      }

      // UTXOs store
      if (!database.objectStoreNames.contains(STORES.UTXOS)) {
        const utxoStore = database.createObjectStore(STORES.UTXOS, {
          keyPath: 'outpoint',
        })
        utxoStore.createIndex('txid', 'txid', { unique: false })
        utxoStore.createIndex('height', 'height', { unique: false })
      }

      // Transactions store
      if (!database.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const txStore = database.createObjectStore(STORES.TRANSACTIONS, {
          keyPath: 'txid',
        })
        txStore.createIndex('timestamp', 'timestamp', { unique: false })
        txStore.createIndex('height', 'height', { unique: false })
      }

      // Sessions store
      if (!database.objectStoreNames.contains(STORES.SESSIONS)) {
        const sessionStore = database.createObjectStore(STORES.SESSIONS, {
          keyPath: 'sessionId',
        })
        sessionStore.createIndex('expiresAt', 'expiresAt', { unique: false })
      }

      // Presence store
      if (!database.objectStoreNames.contains(STORES.PRESENCE)) {
        database.createObjectStore(STORES.PRESENCE, { keyPath: 'peerId' })
      }

      // Notifications store
      if (!database.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        const notifStore = database.createObjectStore(STORES.NOTIFICATIONS, {
          keyPath: 'id',
        })
        notifStore.createIndex('timestamp', 'timestamp', { unique: false })
        notifStore.createIndex('read', 'read', { unique: false })
      }

      console.log('[SW] IndexedDB schema created/upgraded')
    }
  })
}

// Initialize DB on SW activation
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([self.clients.claim(), initializeDB()]))
})
```

---

## 2. State Storage Operations

### File: `public/sw.js` (additions)

Add CRUD operations for each store.

```js
// ============================================================================
// Generic DB Operations
// ============================================================================

/**
 * Get a record from a store
 */
async function dbGet(storeName, key) {
  if (!db) await initializeDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all records from a store
 */
async function dbGetAll(storeName) {
  if (!db) await initializeDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Put a record into a store
 */
async function dbPut(storeName, record) {
  if (!db) await initializeDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(record)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Delete a record from a store
 */
async function dbDelete(storeName, key) {
  if (!db) await initializeDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Clear all records from a store
 */
async function dbClear(storeName) {
  if (!db) await initializeDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Put multiple records in a single transaction
 */
async function dbPutBatch(storeName, records) {
  if (!db) await initializeDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)

    for (const record of records) {
      store.put(record)
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
```

---

## 3. State Caching

### File: `public/sw.js` (additions)

Implement state caching for each data type.

```js
// ============================================================================
// State Caching
// ============================================================================

/**
 * Cache wallet configuration
 */
async function cacheConfig(config) {
  await dbPut(STORES.CONFIG, {
    id: 'wallet-config',
    ...config,
    cachedAt: Date.now(),
  })
}

/**
 * Get cached configuration
 */
async function getCachedConfig() {
  return dbGet(STORES.CONFIG, 'wallet-config')
}

/**
 * Cache UTXOs
 */
async function cacheUtxos(utxos) {
  // Clear existing and add new
  await dbClear(STORES.UTXOS)

  const records = utxos.map(utxo => ({
    outpoint: `${utxo.outpoint.txid}:${utxo.outpoint.outIdx}`,
    txid: utxo.outpoint.txid,
    outIdx: utxo.outpoint.outIdx,
    value: utxo.value,
    height: utxo.blockHeight,
    isCoinbase: utxo.isCoinbase,
    cachedAt: Date.now(),
  }))

  await dbPutBatch(STORES.UTXOS, records)
}

/**
 * Get cached UTXOs
 */
async function getCachedUtxos() {
  return dbGetAll(STORES.UTXOS)
}

/**
 * Cache a transaction
 */
async function cacheTransaction(tx) {
  await dbPut(STORES.TRANSACTIONS, {
    ...tx,
    cachedAt: Date.now(),
  })
}

/**
 * Get cached transactions
 */
async function getCachedTransactions(limit = 50) {
  const all = await dbGetAll(STORES.TRANSACTIONS)
  // Sort by timestamp descending and limit
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
}

/**
 * Cache session state
 */
async function cacheSession(session) {
  await dbPut(STORES.SESSIONS, {
    ...session,
    cachedAt: Date.now(),
  })
}

/**
 * Remove expired sessions from cache
 */
async function cleanupExpiredSessions() {
  const sessions = await dbGetAll(STORES.SESSIONS)
  const now = Date.now()

  for (const session of sessions) {
    if (session.expiresAt < now) {
      await dbDelete(STORES.SESSIONS, session.sessionId)
    }
  }
}

/**
 * Cache notification
 */
async function cacheNotification(notification) {
  await dbPut(STORES.NOTIFICATIONS, {
    ...notification,
    cachedAt: Date.now(),
  })
}

/**
 * Get cached notifications
 */
async function getCachedNotifications(limit = 100) {
  const all = await dbGetAll(STORES.NOTIFICATIONS)
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
}
```

---

## 4. State Synchronization

### File: `public/sw.js` (additions)

Implement sync between SW and client.

```js
// ============================================================================
// State Synchronization
// ============================================================================

/**
 * Handle state sync request from client
 */
async function handleSyncState(payload) {
  const { requestId, stores } = payload

  const result = {}

  for (const storeName of stores) {
    switch (storeName) {
      case 'config':
        result.config = await getCachedConfig()
        break
      case 'utxos':
        result.utxos = await getCachedUtxos()
        break
      case 'transactions':
        result.transactions = await getCachedTransactions()
        break
      case 'sessions':
        result.sessions = await dbGetAll(STORES.SESSIONS)
        break
      case 'notifications':
        result.notifications = await getCachedNotifications()
        break
    }
  }

  broadcastToClients({
    type: 'STATE_SYNC_RESPONSE',
    payload: {
      requestId,
      data: result,
      syncedAt: Date.now(),
    },
  })
}

/**
 * Handle state update from client
 */
async function handleUpdateState(payload) {
  const { store, data, operation } = payload

  switch (operation) {
    case 'put':
      if (store === 'utxos' && Array.isArray(data)) {
        await cacheUtxos(data)
      } else if (store === 'transactions' && Array.isArray(data)) {
        for (const tx of data) {
          await cacheTransaction(tx)
        }
      } else if (store === 'config') {
        await cacheConfig(data)
      } else if (store === 'notifications' && Array.isArray(data)) {
        for (const notif of data) {
          await cacheNotification(notif)
        }
      }
      break

    case 'delete':
      await dbDelete(STORES[store.toUpperCase()], data.key)
      break

    case 'clear':
      await dbClear(STORES[store.toUpperCase()])
      break
  }
}

// Add to message handler:
case 'SYNC_STATE':
  handleSyncState(message.payload)
  break

case 'UPDATE_STATE':
  handleUpdateState(message.payload)
  break
```

---

## 5. Message Types

### Update: `types/service-worker.ts`

Add state sync message types.

```ts
// ============================================================================
// State Synchronization Messages
// ============================================================================

export interface SWSyncStateMessage {
  type: 'SYNC_STATE'
  payload: {
    requestId: string
    stores: Array<'config' | 'utxos' | 'transactions' | 'sessions' | 'notifications'>
  }
}

export interface SWUpdateStateMessage {
  type: 'UPDATE_STATE'
  payload: {
    store: 'config' | 'utxos' | 'transactions' | 'sessions' | 'notifications'
    data: unknown
    operation: 'put' | 'delete' | 'clear'
  }
}

export interface SWStateSyncResponseMessage {
  type: 'STATE_SYNC_RESPONSE'
  payload: {
    requestId: string
    data: {
      config?: unknown
      utxos?: unknown[]
      transactions?: unknown[]
      sessions?: unknown[]
      notifications?: unknown[]
    }
    syncedAt: number
  }
}

// Add to unions
export type ClientToSWMessage =
  | /* existing */
  | SWSyncStateMessage
  | SWUpdateStateMessage

export type SWToClientMessage =
  | /* existing */
  | SWStateSyncResponseMessage
```

---

## 6. Client-Side Integration

### Update: `composables/useServiceWorker.ts`

Add state sync methods.

```ts
/**
 * Request state sync from service worker
 */
async function syncState(
  stores: Array<
    'config' | 'utxos' | 'transactions' | 'sessions' | 'notifications'
  >,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const requestId = `sync-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`

    const timeout = setTimeout(() => {
      window.removeEventListener(
        'sw-state-sync-response',
        handler as EventListener,
      )
      reject(new Error('State sync timeout'))
    }, 5000)

    const handler = (event: CustomEvent) => {
      if (event.detail.requestId === requestId) {
        clearTimeout(timeout)
        window.removeEventListener(
          'sw-state-sync-response',
          handler as EventListener,
        )
        resolve(event.detail.data)
      }
    }

    window.addEventListener('sw-state-sync-response', handler as EventListener)

    postMessage({
      type: 'SYNC_STATE',
      payload: { requestId, stores },
    })
  })
}

/**
 * Update state in service worker cache
 */
function updateState(
  store: 'config' | 'utxos' | 'transactions' | 'sessions' | 'notifications',
  data: unknown,
  operation: 'put' | 'delete' | 'clear' = 'put',
) {
  postMessage({
    type: 'UPDATE_STATE',
    payload: { store, data, operation },
  })
}

// Add to return object
return {
  // ... existing
  syncState,
  updateState,
}
```

---

## 7. Wallet Store Integration

### Update: `stores/wallet.ts`

Integrate state caching.

```ts
// In saveWalletState():

async saveWalletState() {
  const state = {
    seedPhrase: this.seedPhrase,
    address: this.address,
    addressType: this.addressType,
    scriptPayload: this.scriptPayload,
    balance: this.balance,
    utxos: Object.fromEntries(this.utxos),
    tipHeight: this.tipHeight,
    tipHash: this.tipHash,
  }
  setRawItem(STORAGE_KEYS.WALLET_STATE, JSON.stringify(state))

  // Also cache in SW for offline access
  if (typeof window !== 'undefined') {
    const { updateState } = useServiceWorker()

    // Cache config
    updateState('config', {
      address: this.address,
      addressType: this.addressType,
      scriptPayload: this.scriptPayload,
      balance: this.balance,
      tipHeight: this.tipHeight,
    })

    // Cache UTXOs
    const utxoArray = Array.from(this.utxos.entries()).map(([outpoint, data]) => ({
      outpoint,
      ...data,
    }))
    updateState('utxos', utxoArray)
  }
}

// On initialization, try to restore from SW cache if localStorage is empty:

async initialize() {
  // ... existing code ...

  // If no saved state in localStorage, try SW cache
  if (!savedState && typeof window !== 'undefined') {
    try {
      const { syncState, isSupported } = useServiceWorker()
      if (isSupported.value) {
        const cached = await syncState(['config', 'utxos'])
        if (cached.config) {
          // Restore from cache
          console.log('[Wallet] Restoring from SW cache')
          // Note: Can't restore seedPhrase from SW cache (security)
          // User would need to re-enter it
        }
      }
    } catch (e) {
      console.warn('[Wallet] Failed to sync from SW cache:', e)
    }
  }
}
```

---

## 8. Offline Indicator

### Component: `components/layout/OfflineIndicator.vue`

Show when wallet is operating from cache.

```vue
<script setup lang="ts">
const walletStore = useWalletStore()

const isOffline = ref(false)
const lastSyncTime = ref<number | null>(null)

onMounted(() => {
  // Listen for online/offline events
  window.addEventListener('online', () => {
    isOffline.value = false
  })

  window.addEventListener('offline', () => {
    isOffline.value = true
  })

  isOffline.value = !navigator.onLine
})

const timeSinceSync = computed(() => {
  if (!lastSyncTime.value) return null
  const seconds = Math.floor((Date.now() - lastSyncTime.value) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  return `${Math.floor(seconds / 3600)} hr ago`
})
</script>

<template>
  <div v-if="isOffline" class="fixed bottom-4 left-4 z-50">
    <UAlert color="warning" variant="soft" icon="i-lucide-wifi-off">
      <template #title>Offline Mode</template>
      <template #description>
        <span v-if="timeSinceSync"> Last synced {{ timeSinceSync }} </span>
        <span v-else> Using cached data </span>
      </template>
    </UAlert>
  </div>
</template>
```

---

## 9. Implementation Checklist

### Service Worker Updates

- [ ] Initialize IndexedDB on activation
- [ ] Create database schema with all stores
- [ ] Implement generic CRUD operations
- [ ] Implement state caching functions
- [ ] Implement state sync handlers
- [ ] Handle `SYNC_STATE` message
- [ ] Handle `UPDATE_STATE` message
- [ ] Implement expired session cleanup

### Message Types

- [ ] Add `SYNC_STATE` message type
- [ ] Add `UPDATE_STATE` message type
- [ ] Add `STATE_SYNC_RESPONSE` message type

### Composable Updates

- [ ] Add `syncState()` method
- [ ] Add `updateState()` method

### Store Integration

- [ ] Update `saveWalletState()` to cache in SW
- [ ] Add SW cache restore on initialization
- [ ] Cache transactions on fetch
- [ ] Cache notifications on add

### UI Components

- [ ] Create `OfflineIndicator.vue` component
- [ ] Add to layout

### Testing

- [ ] Test IndexedDB initialization
- [ ] Test state caching and retrieval
- [ ] Test state sync between SW and client
- [ ] Test offline mode with cached data
- [ ] Test cache survives browser restart
- [ ] Test expired session cleanup

---

## Notes

- IndexedDB operations are asynchronous - use proper error handling
- Don't cache sensitive data like seed phrases in SW
- Consider cache size limits for transactions/notifications
- Implement cache invalidation strategy for stale data

---

## Security Considerations

### What NOT to Cache

- Seed phrases / mnemonics
- Private keys
- Unencrypted sensitive data

### What IS Safe to Cache

- Public addresses
- UTXOs (public blockchain data)
- Transaction history (public)
- Session metadata (not keys)
- Notification content

---

## Next Steps

After completing all phases, update the STATUS.md file to track progress and mark the plan as complete.
