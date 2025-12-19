/**
 * Storage Service
 *
 * Unified storage abstraction for localStorage and IndexedDB.
 * Provides type-safe storage operations with automatic serialization.
 *
 * Usage:
 * - Use localStorage for small, frequently accessed data
 * - Use IndexedDB for large data (transaction history, etc.)
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Storage keys used by the application
 */
export const STORAGE_KEYS = {
  // Wallet
  WALLET_STATE: 'lotus-wallet-state',
  WALLET_SEED: 'lotus-wallet-seed',
  WALLET_ADDRESS_TYPE: 'lotus-wallet-address-type',

  // Network
  NETWORK: 'lotus-wallet-network',

  // Contacts
  CONTACTS: 'lotus-wallet-contacts',

  // P2P
  P2P_PRIVATE_KEY: 'p2p-private-key',
  P2P_PRESENCE_CONFIG: 'p2p-presence-config',
  P2P_CONFIG: 'p2p-config',
  P2P_SETTINGS: 'p2p-settings',

  // MuSig2
  MUSIG2_SIGNER_CONFIG: 'musig2-signer-config',
  MUSIG2_SHARED_WALLETS: 'musig2-shared-wallets',

  // UI
  THEME: 'lotus-wallet-theme',
  SIDEBAR: 'lotus-wallet-sidebar',

  // Onboarding
  ONBOARDING_COMPLETED: 'lotus-wallet-onboarding-completed',
  ONBOARDING_DISMISSED_HINTS: 'lotus-wallet-dismissed-hints',
  ONBOARDING_STATE: 'lotus-wallet-onboarding',

  // Notifications
  NOTIFICATIONS: 'lotus-wallet-notifications',
  NOTIFICATION_PREFERENCES: 'lotus-wallet-notification-preferences',

  // Identity and account storage
  IDENTITIES: 'lotus:identities',
  DISCOVERY_CACHE: 'lotus:discovery:cache',

  // Migration tracking
  MIGRATION_VERSION: 'lotus:migration:version',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

// ============================================================================
// LocalStorage Operations
// ============================================================================

/**
 * Get a value from localStorage
 */
export function getItem<T>(key: StorageKey, defaultValue: T): T {
  if (typeof localStorage === 'undefined') {
    return defaultValue
  }

  try {
    const item = localStorage.getItem(key)
    if (item === null) {
      return defaultValue
    }
    return JSON.parse(item) as T
  } catch (error) {
    console.error(`[Storage] Failed to get item "${key}":`, error)
    return defaultValue
  }
}

/**
 * Set a value in localStorage
 */
export function setItem<T>(key: StorageKey, value: T): boolean {
  if (typeof localStorage === 'undefined') {
    return false
  }

  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`[Storage] Failed to set item "${key}":`, error)
    return false
  }
}

/**
 * Remove a value from localStorage
 */
export function removeItem(key: StorageKey): boolean {
  if (typeof localStorage === 'undefined') {
    return false
  }

  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`[Storage] Failed to remove item "${key}":`, error)
    return false
  }
}

/**
 * Get a raw string value from localStorage (no JSON parsing)
 */
export function getRawItem(key: StorageKey): string | null {
  if (typeof localStorage === 'undefined') {
    return null
  }

  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.error(`[Storage] Failed to get raw item "${key}":`, error)
    return null
  }
}

/**
 * Set a raw string value in localStorage (no JSON serialization)
 */
export function setRawItem(key: StorageKey, value: string): boolean {
  if (typeof localStorage === 'undefined') {
    return false
  }

  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.error(`[Storage] Failed to set raw item "${key}":`, error)
    return false
  }
}

// ============================================================================
// IndexedDB Operations
// ============================================================================

const DB_NAME = 'lotus-wallet-db'
const DB_VERSION = 1

/**
 * Store names in IndexedDB
 */
export const STORES = {
  TRANSACTIONS: 'transactions',
  UTXOS: 'utxos',
  CACHE: 'cache',
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

let dbInstance: IDBDatabase | null = null

/**
 * Open the IndexedDB database
 */
async function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message}`))
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object stores
      if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const txStore = db.createObjectStore(STORES.TRANSACTIONS, {
          keyPath: 'txid',
        })
        txStore.createIndex('timestamp', 'timestamp', { unique: false })
        txStore.createIndex('blockHeight', 'blockHeight', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.UTXOS)) {
        db.createObjectStore(STORES.UTXOS, { keyPath: 'outpoint' })
      }

      if (!db.objectStoreNames.contains(STORES.CACHE)) {
        db.createObjectStore(STORES.CACHE, { keyPath: 'key' })
      }
    }
  })
}

/**
 * Get a value from IndexedDB
 */
export async function getFromDB<T>(
  storeName: StoreName,
  key: string,
): Promise<T | null> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result ?? null)
    })
  } catch (error) {
    console.error(`[Storage] Failed to get from DB "${storeName}":`, error)
    return null
  }
}

/**
 * Put a value in IndexedDB
 */
export async function putInDB<T extends { [key: string]: unknown }>(
  storeName: StoreName,
  value: T,
): Promise<boolean> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(value)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(true)
    })
  } catch (error) {
    console.error(`[Storage] Failed to put in DB "${storeName}":`, error)
    return false
  }
}

/**
 * Delete a value from IndexedDB
 */
export async function deleteFromDB(
  storeName: StoreName,
  key: string,
): Promise<boolean> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(true)
    })
  } catch (error) {
    console.error(`[Storage] Failed to delete from DB "${storeName}":`, error)
    return false
  }
}

/**
 * Get all values from an IndexedDB store
 */
export async function getAllFromDB<T>(storeName: StoreName): Promise<T[]> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result ?? [])
    })
  } catch (error) {
    console.error(`[Storage] Failed to get all from DB "${storeName}":`, error)
    return []
  }
}

/**
 * Clear all values from an IndexedDB store
 */
export async function clearStore(storeName: StoreName): Promise<boolean> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(true)
    })
  } catch (error) {
    console.error(`[Storage] Failed to clear store "${storeName}":`, error)
    return false
  }
}

// ============================================================================
// Cache Operations
// ============================================================================

interface CacheEntry<T> {
  key: string
  value: T
  expiresAt: number
  [key: string]: unknown // Index signature for IndexedDB compatibility
}

/**
 * Get a cached value
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const entry = await getFromDB<CacheEntry<T>>(STORES.CACHE, key)

  if (!entry) {
    return null
  }

  // Check expiration
  if (entry.expiresAt < Date.now()) {
    await deleteFromDB(STORES.CACHE, key)
    return null
  }

  return entry.value
}

/**
 * Set a cached value with TTL
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttlMs: number,
): Promise<boolean> {
  const entry: CacheEntry<T> = {
    key,
    value,
    expiresAt: Date.now() + ttlMs,
  }

  return putInDB(STORES.CACHE, entry)
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  const entries = await getAllFromDB<CacheEntry<unknown>>(STORES.CACHE)
  const now = Date.now()

  for (const entry of entries) {
    if (entry.expiresAt < now) {
      await deleteFromDB(STORES.CACHE, entry.key)
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if storage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

/**
 * Get storage usage estimate
 */
export async function getStorageEstimate(): Promise<{
  usage: number
  quota: number
} | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    }
  }
  return null
}
