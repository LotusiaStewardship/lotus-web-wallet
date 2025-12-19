/**
 * Discovery Cache Plugin
 *
 * Provides localStorage-backed caching for discovery advertisements (signers).
 * Allows signers to persist through page reloads.
 *
 * This plugin provides two cache implementations:
 * 1. LocalStorageDiscoveryCache - Wallet-side cache for UI display
 * 2. SDKDiscoveryCacheAdapter - SDK-compatible cache implementing IDiscoveryCache
 *
 * The `.client.ts` suffix ensures this only runs in the browser (SPA mode).
 */
import type { P2P } from 'lotus-sdk'
import { STORAGE_KEYS } from '~/utils/storage'

// ============================================================================
// Types
// ============================================================================

type IDiscoveryCache = P2P.IDiscoveryCache
type DiscoveryCacheEntry = P2P.DiscoveryCacheEntry

/**
 * Cached signer entry
 */
export interface CachedSigner {
  /** Signer ID */
  id: string
  /** Peer ID */
  peerId: string
  /** Public key hex */
  publicKey: string
  /** Wallet address (if available) */
  walletAddress?: string
  /** Nickname */
  nickname?: string
  /** Transaction types */
  transactionTypes?: string[]
  /** When the advertisement was created */
  createdAt: number
  /** When the advertisement expires */
  expiresAt: number
  /** When we first discovered this signer */
  addedAt: number
  /** Last time we saw this signer */
  lastAccess: number
  /** How many times we've seen this signer */
  accessCount: number
  /** Source of discovery */
  source: 'gossipsub' | 'dht' | 'direct'
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number
  oldestEntry: number | null
  newestEntry: number | null
  expiredCount: number
}

// ============================================================================
// Constants
// ============================================================================

const MAX_ENTRIES = 100
const SAVE_DEBOUNCE_MS = 500
const SDK_CACHE_STORAGE_KEY = 'lotus_sdk_discovery_cache'
const SDK_CACHE_MAX_ENTRIES = 100
const SDK_CACHE_SAVE_DEBOUNCE_MS = 500

// ============================================================================
// LocalStorage Discovery Cache Class
// ============================================================================

/**
 * LocalStorage-backed discovery cache
 */
class LocalStorageDiscoveryCache {
  private memoryCache: Map<string, CachedSigner>
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null
  private isDirty: boolean = false

  constructor() {
    this.memoryCache = this.loadFromStorage()
    this.cleanupExpired()

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.isDirty && this.saveDebounceTimer) {
          clearTimeout(this.saveDebounceTimer)
          this._saveSync()
        }
      })
    }
  }

  private loadFromStorage(): Map<string, CachedSigner> {
    if (typeof localStorage === 'undefined') {
      console.log('[DiscoveryCache] localStorage not available (SSR)')
      return new Map()
    }

    try {
      const data = localStorage.getItem(STORAGE_KEYS.DISCOVERY_CACHE)
      if (!data) {
        console.log('[DiscoveryCache] No cached data found')
        return new Map()
      }

      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) {
        const map = new Map(parsed as [string, CachedSigner][])
        console.log(
          `[DiscoveryCache] Loaded ${map.size} entries from localStorage`,
        )
        return map
      }
      return new Map()
    } catch (error) {
      console.warn('[DiscoveryCache] Failed to load from storage:', error)
      return new Map()
    }
  }

  private _saveSync(): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(
        STORAGE_KEYS.DISCOVERY_CACHE,
        JSON.stringify(Array.from(this.memoryCache.entries())),
      )
      this.isDirty = false
      console.log(
        `[DiscoveryCache] Flushed ${this.memoryCache.size} entries to localStorage`,
      )
    } catch (error) {
      console.warn('[DiscoveryCache] Failed to save:', error)
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return
    this.isDirty = true

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }

    this.saveDebounceTimer = setTimeout(() => {
      this._saveSync()
      this.saveDebounceTimer = null
    }, SAVE_DEBOUNCE_MS)
  }

  cleanupExpired(): number {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`[DiscoveryCache] Cleaned up ${removed} expired entries`)
      this.saveToStorage()
    }

    return removed
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestAccess = Infinity

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey)
    }
  }

  get(key: string): CachedSigner | undefined {
    const entry = this.memoryCache.get(key)
    if (entry) {
      entry.lastAccess = Date.now()
      entry.accessCount++
    }
    return entry
  }

  getByPublicKey(publicKey: string): CachedSigner | undefined {
    for (const entry of this.memoryCache.values()) {
      if (entry.publicKey === publicKey) {
        entry.lastAccess = Date.now()
        entry.accessCount++
        return entry
      }
    }
    return undefined
  }

  set(key: string, entry: CachedSigner): void {
    if (this.memoryCache.size >= MAX_ENTRIES && !this.memoryCache.has(key)) {
      this.evictOldest()
    }

    this.memoryCache.set(key, entry)
    this.saveToStorage()
  }

  upsert(signer: CachedSigner): void {
    const existing = this.getByPublicKey(signer.publicKey)

    if (existing) {
      const updated: CachedSigner = {
        ...existing,
        ...signer,
        addedAt: existing.addedAt,
        accessCount: existing.accessCount + 1,
        lastAccess: Date.now(),
      }
      this.memoryCache.set(existing.id, updated)
    } else {
      const newEntry: CachedSigner = {
        ...signer,
        addedAt: Date.now(),
        lastAccess: Date.now(),
        accessCount: 1,
      }
      this.set(signer.id, newEntry)
    }

    this.saveToStorage()
  }

  delete(key: string): boolean {
    const result = this.memoryCache.delete(key)
    if (result) this.saveToStorage()
    return result
  }

  deleteByPublicKey(publicKey: string): boolean {
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.publicKey === publicKey) {
        this.memoryCache.delete(key)
        this.saveToStorage()
        return true
      }
    }
    return false
  }

  entries(): IterableIterator<[string, CachedSigner]> {
    return this.memoryCache.entries()
  }

  getAll(): CachedSigner[] {
    return Array.from(this.memoryCache.values())
  }

  getValidSigners(): CachedSigner[] {
    const now = Date.now()
    return this.getAll().filter(s => s.expiresAt > now)
  }

  clear(): void {
    this.memoryCache.clear()
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.DISCOVERY_CACHE)
    }
  }

  get size(): number {
    return this.memoryCache.size
  }

  getStats(): CacheStats {
    let oldest: number | null = null
    let newest: number | null = null
    let expiredCount = 0
    const now = Date.now()

    for (const entry of this.memoryCache.values()) {
      if (oldest === null || entry.addedAt < oldest) {
        oldest = entry.addedAt
      }
      if (newest === null || entry.addedAt > newest) {
        newest = entry.addedAt
      }
      if (entry.expiresAt <= now) {
        expiredCount++
      }
    }

    return {
      size: this.memoryCache.size,
      oldestEntry: oldest,
      newestEntry: newest,
      expiredCount,
    }
  }
}

// ============================================================================
// SDK-Compatible Direct Cache Class
// ============================================================================

/**
 * Direct localStorage-backed cache that implements the SDK's IDiscoveryCache interface.
 */
class SDKDiscoveryCacheAdapter implements IDiscoveryCache {
  private memoryCache: Map<string, DiscoveryCacheEntry>
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null
  private isDirty: boolean = false

  constructor() {
    this.memoryCache = this.loadFromStorage()
    this.cleanupExpired()

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.isDirty && this.saveDebounceTimer) {
          clearTimeout(this.saveDebounceTimer)
          this._saveSync()
        }
      })
    }
  }

  private loadFromStorage(): Map<string, DiscoveryCacheEntry> {
    if (typeof localStorage === 'undefined') {
      console.log('[SDKDiscoveryCache] localStorage not available (SSR)')
      return new Map()
    }

    try {
      const data = localStorage.getItem(SDK_CACHE_STORAGE_KEY)
      if (!data) {
        console.log('[SDKDiscoveryCache] No cached data found')
        return new Map()
      }

      const parsed = JSON.parse(data) as [string, string][]
      if (!Array.isArray(parsed)) {
        return new Map()
      }

      const map = new Map<string, DiscoveryCacheEntry>()
      for (const [key, serializedStr] of parsed) {
        const entry = this.deserializeEntry(serializedStr)
        map.set(key, entry)
      }

      console.log(
        `[SDKDiscoveryCache] Loaded ${map.size} entries from localStorage`,
      )
      return map
    } catch (error) {
      console.warn('[SDKDiscoveryCache] Failed to load from storage:', error)
      return new Map()
    }
  }

  private _saveSync(): void {
    if (typeof localStorage === 'undefined') return
    try {
      const entries: [string, string][] = []
      for (const [key, entry] of this.memoryCache.entries()) {
        entries.push([key, this.serializeEntry(entry)])
      }
      localStorage.setItem(SDK_CACHE_STORAGE_KEY, JSON.stringify(entries))
      this.isDirty = false
      console.log(
        `[SDKDiscoveryCache] Flushed ${this.memoryCache.size} entries to localStorage`,
      )
    } catch (error) {
      console.warn('[SDKDiscoveryCache] Failed to save:', error)
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return
    this.isDirty = true

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }

    this.saveDebounceTimer = setTimeout(() => {
      this._saveSync()
      this.saveDebounceTimer = null
    }, SDK_CACHE_SAVE_DEBOUNCE_MS)
  }

  private serializeEntry(entry: DiscoveryCacheEntry): string {
    return JSON.stringify(entry, (_key, value) => {
      if (Buffer.isBuffer(value)) {
        return { __type: 'Buffer', data: value.toString('hex') }
      }
      if (
        value &&
        typeof value === 'object' &&
        typeof value.toString === 'function' &&
        typeof value.toBuffer === 'function'
      ) {
        return { __type: 'PublicKey', hex: value.toString() }
      }
      return value
    })
  }

  private deserializeEntry(serialized: string): DiscoveryCacheEntry {
    return JSON.parse(serialized, (_key, value) => {
      if (value && typeof value === 'object' && value.__type === 'Buffer') {
        return Buffer.from(value.data, 'hex')
      }
      if (value && typeof value === 'object' && value.__type === 'PublicKey') {
        return value.hex
      }
      return value
    })
  }

  cleanupExpired(): number {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.advertisement.expiresAt <= now) {
        this.memoryCache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`[SDKDiscoveryCache] Cleaned up ${removed} expired entries`)
      this.saveToStorage()
    }

    return removed
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestAccess = Infinity

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey)
    }
  }

  // IDiscoveryCache Interface Implementation

  get(key: string): DiscoveryCacheEntry | undefined {
    const entry = this.memoryCache.get(key)
    if (entry) {
      entry.lastAccess = Date.now()
      entry.accessCount++
    }
    return entry
  }

  set(key: string, entry: DiscoveryCacheEntry): void {
    if (
      this.memoryCache.size >= SDK_CACHE_MAX_ENTRIES &&
      !this.memoryCache.has(key)
    ) {
      this.evictOldest()
    }

    this.memoryCache.set(key, entry)
    this.saveToStorage()
  }

  delete(key: string): boolean {
    const result = this.memoryCache.delete(key)
    if (result) this.saveToStorage()
    return result
  }

  has(key: string): boolean {
    return this.memoryCache.has(key)
  }

  *entries(): IterableIterator<[string, DiscoveryCacheEntry]> {
    yield* this.memoryCache.entries()
  }

  clear(protocol?: string): void {
    if (protocol) {
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.advertisement.protocol === protocol) {
          this.memoryCache.delete(key)
        }
      }
      this.saveToStorage()
    } else {
      this.memoryCache.clear()
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(SDK_CACHE_STORAGE_KEY)
      }
    }
  }

  get size(): number {
    return this.memoryCache.size
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

let discoveryCache: LocalStorageDiscoveryCache | null = null
let sdkCacheAdapter: SDKDiscoveryCacheAdapter | null = null

/**
 * Get the singleton discovery cache instance
 */
export function getDiscoveryCache(): LocalStorageDiscoveryCache {
  if (!discoveryCache) {
    discoveryCache = new LocalStorageDiscoveryCache()
  }
  return discoveryCache
}

/**
 * Get the SDK-compatible cache adapter
 */
export function getSDKCacheAdapter(): SDKDiscoveryCacheAdapter {
  if (!sdkCacheAdapter) {
    sdkCacheAdapter = new SDKDiscoveryCacheAdapter()
  }
  return sdkCacheAdapter
}

/**
 * Clear the discovery cache
 */
export function clearDiscoveryCache(): void {
  if (discoveryCache) {
    discoveryCache.clear()
  }
}

/**
 * Reset the discovery cache singleton (for testing)
 */
export function resetDiscoveryCache(): void {
  if (discoveryCache) {
    discoveryCache.clear()
  }
  discoveryCache = null
}

/**
 * Check if discovery cache is initialized
 */
export function isDiscoveryCacheInitialized(): boolean {
  return discoveryCache !== null
}

/**
 * Check if SDK cache adapter is initialized
 */
export function isSDKCacheInitialized(): boolean {
  return sdkCacheAdapter !== null
}

// ============================================================================
// Nuxt Plugin Definition
// ============================================================================

export default defineNuxtPlugin({
  name: 'discovery-cache',
  setup() {
    console.log('[Discovery Cache Plugin] Ready')

    return {
      provide: {
        discoveryCache: {
          getCache: getDiscoveryCache,
          getSDKAdapter: getSDKCacheAdapter,
          clear: clearDiscoveryCache,
          reset: resetDiscoveryCache,
          isInitialized: isDiscoveryCacheInitialized,
          isSDKInitialized: isSDKCacheInitialized,
        },
      },
    }
  },
})

// ============================================================================
// Type Augmentation
// ============================================================================

declare module '#app' {
  interface NuxtApp {
    $discoveryCache: {
      getCache: typeof getDiscoveryCache
      getSDKAdapter: typeof getSDKCacheAdapter
      clear: typeof clearDiscoveryCache
      reset: typeof resetDiscoveryCache
      isInitialized: typeof isDiscoveryCacheInitialized
      isSDKInitialized: typeof isSDKCacheInitialized
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $discoveryCache: {
      getCache: typeof getDiscoveryCache
      getSDKAdapter: typeof getSDKCacheAdapter
      clear: typeof clearDiscoveryCache
      reset: typeof resetDiscoveryCache
      isInitialized: typeof isDiscoveryCacheInitialized
      isSDKInitialized: typeof isSDKCacheInitialized
    }
  }
}
