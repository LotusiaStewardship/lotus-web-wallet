/**
 * State Synchronization Module for Service Worker
 *
 * Provides IndexedDB-based state caching for offline support
 * and cross-tab state synchronization.
 */

/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope

/**
 * Manages state synchronization between the service worker and clients
 * using IndexedDB for persistent storage.
 *
 * Provides methods for caching wallet state, UTXOs, and session data
 * to enable offline support and cross-tab state sharing.
 */
export class StateSync {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this.openDatabase()
    await this.initPromise
  }

  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result

        // State store for general key-value state
        if (!db.objectStoreNames.contains('state')) {
          db.createObjectStore('state', { keyPath: 'key' })
        }

        // UTXOs store for caching UTXOs
        if (!db.objectStoreNames.contains('utxos')) {
          const utxoStore = db.createObjectStore('utxos', {
            keyPath: 'outpoint',
          })
          utxoStore.createIndex('scriptPayload', 'scriptPayload', {
            unique: false,
          })
        }

        // Sessions store for MuSig2 sessions
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('[StateSync] Database initialized')
        resolve()
      }

      request.onerror = () => {
        console.error('[StateSync] Failed to open database:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Cache state values
   */
  async cacheState(state: Partial<CachedState>): Promise<void> {
    await this.init()
    if (!this.db) return

    const tx = this.db.transaction('state', 'readwrite')
    const store = tx.objectStore('state')
    const timestamp = Date.now()

    for (const [key, value] of Object.entries(state)) {
      store.put({ key, value, timestamp } as StateEntry)
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Get a cached state value
   */
  async getState<T = unknown>(key: string): Promise<T | undefined> {
    await this.init()
    if (!this.db) return undefined

    const tx = this.db.transaction('state', 'readonly')
    const store = tx.objectStore('state')
    const request = store.get(key)

    return new Promise(resolve => {
      request.onsuccess = () => {
        const entry = request.result as StateEntry | undefined
        resolve(entry?.value as T | undefined)
      }
      request.onerror = () => resolve(undefined)
    })
  }

  /**
   * Get all cached state
   */
  async getAllState(): Promise<Partial<CachedState>> {
    await this.init()
    if (!this.db) return {}

    const tx = this.db.transaction('state', 'readonly')
    const store = tx.objectStore('state')
    const request = store.getAll()

    return new Promise(resolve => {
      request.onsuccess = () => {
        const entries = request.result as StateEntry[]
        const state: Record<string, unknown> = {}
        for (const entry of entries) {
          state[entry.key] = entry.value
        }
        resolve(state as Partial<CachedState>)
      }
      request.onerror = () => resolve({})
    })
  }

  /**
   * Clear all cached state
   */
  async clearState(): Promise<void> {
    await this.init()
    if (!this.db) return

    const tx = this.db.transaction('state', 'readwrite')
    const store = tx.objectStore('state')
    store.clear()

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Cache UTXOs
   */
  async cacheUtxos(
    scriptPayload: string,
    utxos: Array<{ outpoint: string; value: string }>,
  ): Promise<void> {
    await this.init()
    if (!this.db) return

    const tx = this.db.transaction('utxos', 'readwrite')
    const store = tx.objectStore('utxos')

    // Clear existing UTXOs for this script
    const index = store.index('scriptPayload')
    const existingRequest = index.getAllKeys(scriptPayload)

    existingRequest.onsuccess = () => {
      for (const key of existingRequest.result) {
        store.delete(key)
      }

      // Add new UTXOs
      for (const utxo of utxos) {
        store.put({
          ...utxo,
          scriptPayload,
          timestamp: Date.now(),
        })
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Get cached UTXOs for a script
   */
  async getUtxos(
    scriptPayload: string,
  ): Promise<Array<{ outpoint: string; value: string }>> {
    await this.init()
    if (!this.db) return []

    const tx = this.db.transaction('utxos', 'readonly')
    const store = tx.objectStore('utxos')
    const index = store.index('scriptPayload')
    const request = index.getAll(scriptPayload)

    return new Promise(resolve => {
      request.onsuccess = () => {
        resolve(request.result || [])
      }
      request.onerror = () => resolve([])
    })
  }

  /**
   * Broadcast state to all clients
   */
  async broadcastState(): Promise<void> {
    const state = await this.getAllState()
    const clients = await self.clients.matchAll({ type: 'window' })

    for (const client of clients) {
      client.postMessage({
        type: 'CACHED_STATE',
        payload: state,
      })
    }
  }
}

// Export singleton instance
export const stateSync = new StateSync()
