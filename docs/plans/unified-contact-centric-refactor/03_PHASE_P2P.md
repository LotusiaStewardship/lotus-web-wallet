# Phase 3: P2P Infrastructure

**Version**: 1.0.0  
**Date**: December 18, 2025  
**Status**: Pending  
**Estimated Effort**: 1-2 weeks  
**Dependencies**: Phase 1 (Foundation)

---

## Overview

This phase fixes P2P connectivity issues and improves reliability. It addresses auto-connect on startup, discovery cache persistence, and advertisement deduplication.

---

## Goals

1. Fix auto-connect on startup setting
2. Persist discovery cache through page reloads
3. Eliminate duplicate signer entries
4. Improve P2P initialization reliability

---

## Issues Addressed

| Issue                    | Description                            | Priority |
| ------------------------ | -------------------------------------- | -------- |
| Auto-connect not working | P2P settings not loaded at app startup | HIGH     |
| Signers lost on refresh  | In-memory cache cleared on page reload | HIGH     |
| Duplicate signers        | Re-advertising creates new entries     | MEDIUM   |
| Slow discovery           | No cached signers on reconnect         | MEDIUM   |

---

## Tasks

### 3.1 Create P2P Initialization Plugin

**File**: `plugins/p2p.client.ts` (NEW)

```typescript
/**
 * P2P Initialization Plugin
 *
 * Loads P2P settings and auto-connects if enabled.
 * Runs after Bitcore plugin but before app mount.
 */
export default defineNuxtPlugin({
  name: 'p2p-init',
  dependsOn: ['bitcore'],
  async setup() {
    const p2pStore = useP2PStore()
    const settingsStore = useSettingsStore()

    // Load P2P settings from storage
    await settingsStore.loadP2PSettings()

    // Auto-connect if enabled
    if (settingsStore.p2p.autoConnect) {
      console.log('[P2P Plugin] Auto-connect enabled, initializing P2P...')

      try {
        await p2pStore.initialize({
          bootstrapPeers: settingsStore.p2p.bootstrapPeers,
          enableDHT: settingsStore.p2p.enableDHT,
          enableGossip: settingsStore.p2p.enableGossip,
        })
        console.log('[P2P Plugin] P2P initialized successfully')
      } catch (error) {
        console.error('[P2P Plugin] Failed to auto-connect:', error)
      }
    } else {
      console.log('[P2P Plugin] Auto-connect disabled, skipping P2P init')
    }
  },
})
```

| Task                             | Priority | Status         |
| -------------------------------- | -------- | -------------- |
| Create `plugins/p2p.client.ts`   | P0       | ⬜ Not Started |
| Add dependency on bitcore plugin | P0       | ⬜ Not Started |
| Implement auto-connect logic     | P0       | ⬜ Not Started |

---

### 3.2 Add P2P Settings to Settings Store

**File**: `stores/settings.ts` (MODIFY)

```typescript
interface P2PSettings {
  autoConnect: boolean
  bootstrapPeers: string[]
  enableDHT: boolean
  enableGossip: boolean
  advertiseAsSigner: boolean
}

const DEFAULT_P2P_SETTINGS: P2PSettings = {
  autoConnect: false,
  bootstrapPeers: [],
  enableDHT: true,
  enableGossip: true,
  advertiseAsSigner: false,
}

export const useSettingsStore = defineStore('settings', () => {
  // ... existing state ...

  const p2p = ref<P2PSettings>({ ...DEFAULT_P2P_SETTINGS })

  async function loadP2PSettings(): Promise<void> {
    const saved = localStorage.getItem(STORAGE_KEYS.P2P_SETTINGS)
    if (saved) {
      try {
        p2p.value = { ...DEFAULT_P2P_SETTINGS, ...JSON.parse(saved) }
      } catch (error) {
        console.warn('[Settings] Failed to load P2P settings:', error)
      }
    }
  }

  function saveP2PSettings(): void {
    localStorage.setItem(STORAGE_KEYS.P2P_SETTINGS, JSON.stringify(p2p.value))
  }

  function updateP2PSettings(updates: Partial<P2PSettings>): void {
    p2p.value = { ...p2p.value, ...updates }
    saveP2PSettings()
  }

  return {
    // ... existing exports ...
    p2p,
    loadP2PSettings,
    saveP2PSettings,
    updateP2PSettings,
  }
})
```

| Task                            | Priority | Status         |
| ------------------------------- | -------- | -------------- |
| Add P2PSettings interface       | P0       | ⬜ Not Started |
| Add p2p state to settings store | P0       | ⬜ Not Started |
| Implement load/save functions   | P0       | ⬜ Not Started |

---

### 3.3 Create Discovery Cache Service

**File**: `services/discovery-cache.ts` (NEW)

```typescript
/**
 * Discovery Cache Service
 *
 * Provides a localStorage-backed cache for discovery advertisements.
 * Allows signers to persist through page reloads.
 */
import type { DiscoveryCache, CacheEntry } from 'lotus-sdk'

const STORAGE_KEY = 'lotus:discovery:cache'
const MAX_ENTRIES = 100
const SAVE_DEBOUNCE_MS = 500

export class LocalStorageDiscoveryCache implements DiscoveryCache {
  private memoryCache: Map<string, CacheEntry>
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.memoryCache = this.loadFromStorage()
    this.cleanupExpired()
  }

  private loadFromStorage(): Map<string, CacheEntry> {
    if (typeof localStorage === 'undefined') {
      return new Map()
    }

    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return new Map()

      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) {
        return new Map(parsed as [string, CacheEntry][])
      }
      return new Map()
    } catch (error) {
      console.warn('[DiscoveryCache] Failed to load from storage:', error)
      return new Map()
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }

    this.saveDebounceTimer = setTimeout(() => {
      try {
        const entries = Array.from(this.memoryCache.entries())
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
      } catch (error) {
        console.warn('[DiscoveryCache] Failed to save to storage:', error)
      }
      this.saveDebounceTimer = null
    }, SAVE_DEBOUNCE_MS)
  }

  private cleanupExpired(): void {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.advertisement.expiresAt <= now) {
        this.memoryCache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`[DiscoveryCache] Cleaned up ${removed} expired entries`)
      this.saveToStorage()
    }
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

  get(key: string): CacheEntry | undefined {
    const entry = this.memoryCache.get(key)
    if (entry) {
      entry.lastAccess = Date.now()
      entry.accessCount++
    }
    return entry
  }

  set(key: string, entry: CacheEntry): void {
    if (this.memoryCache.size >= MAX_ENTRIES && !this.memoryCache.has(key)) {
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

  entries(): IterableIterator<[string, CacheEntry]> {
    return this.memoryCache.entries()
  }

  clear(): void {
    this.memoryCache.clear()
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  get size(): number {
    return this.memoryCache.size
  }

  getStats(): {
    size: number
    oldestEntry: number | null
    newestEntry: number | null
  } {
    let oldest: number | null = null
    let newest: number | null = null

    for (const [_, entry] of this.memoryCache.entries()) {
      if (oldest === null || entry.addedAt < oldest) {
        oldest = entry.addedAt
      }
      if (newest === null || entry.addedAt > newest) {
        newest = entry.addedAt
      }
    }

    return {
      size: this.memoryCache.size,
      oldestEntry: oldest,
      newestEntry: newest,
    }
  }
}

// Singleton instance
let discoveryCache: LocalStorageDiscoveryCache | null = null

export function getDiscoveryCache(): LocalStorageDiscoveryCache {
  if (!discoveryCache) {
    discoveryCache = new LocalStorageDiscoveryCache()
  }
  return discoveryCache
}

export function clearDiscoveryCache(): void {
  if (discoveryCache) {
    discoveryCache.clear()
  }
}
```

| Task                                       | Priority | Status         |
| ------------------------------------------ | -------- | -------------- |
| Create `services/discovery-cache.ts`       | P0       | ⬜ Not Started |
| Implement LocalStorageDiscoveryCache class | P0       | ⬜ Not Started |
| Add debounced saving                       | P1       | ⬜ Not Started |
| Add expiry cleanup                         | P0       | ⬜ Not Started |
| Add LRU eviction                           | P1       | ⬜ Not Started |

---

### 3.4 Inject Cache into MuSig2 Service

**File**: `services/musig2.ts` (MODIFY)

```typescript
import { getDiscoveryCache } from './discovery-cache'

export async function initializeMuSig2(
  callbacks: MuSig2EventCallbacks = {},
  discoveryConfig?: Partial<MuSig2DiscoveryConfigType>,
): Promise<void> {
  // ... existing initialization ...

  // Get the persistent cache
  const cache = getDiscoveryCache()
  console.log(
    '[MuSig2 Service] Using persistent discovery cache with',
    cache.size,
    'entries',
  )

  // Create MuSig2 coordinator with discovery and cache
  musig2Coordinator = new MuSig2P2PCoordinator(
    p2pCoordinator,
    undefined, // Use default MuSig2 config
    undefined, // Use default security config
    finalDiscoveryConfig,
    cache, // Pass the persistent cache
  )

  // ... rest of initialization ...
}
```

| Task                               | Priority | Status         |
| ---------------------------------- | -------- | -------------- |
| Import getDiscoveryCache           | P0       | ⬜ Not Started |
| Pass cache to MuSig2P2PCoordinator | P0       | ⬜ Not Started |
| Log cache size on init             | P1       | ⬜ Not Started |

---

### 3.5 SDK Changes: DiscoveryCache Interface

**File**: `lotus-sdk/lib/p2p/discovery/types.ts` (MODIFY)

```typescript
/**
 * Cache interface for discovery advertisements
 */
export interface DiscoveryCache {
  get(key: string): CacheEntry | undefined
  set(key: string, entry: CacheEntry): void
  delete(key: string): boolean
  entries(): IterableIterator<[string, CacheEntry]>
  clear(): void
  readonly size: number
}

export interface CacheEntry {
  advertisement: DiscoveryAdvertisement
  addedAt: number
  lastAccess: number
  accessCount: number
  source: 'gossipsub' | 'dht' | 'direct'
}

/**
 * Default in-memory cache implementation
 */
export class InMemoryDiscoveryCache implements DiscoveryCache {
  private cache: Map<string, CacheEntry> = new Map()

  get(key: string): CacheEntry | undefined {
    return this.cache.get(key)
  }

  set(key: string, entry: CacheEntry): void {
    this.cache.set(key, entry)
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  entries(): IterableIterator<[string, CacheEntry]> {
    return this.cache.entries()
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}
```

| Task                                | Priority | Status         |
| ----------------------------------- | -------- | -------------- |
| Add DiscoveryCache interface to SDK | P0       | ⬜ Not Started |
| Add CacheEntry interface to SDK     | P0       | ⬜ Not Started |
| Add InMemoryDiscoveryCache class    | P0       | ⬜ Not Started |

---

### 3.6 SDK Changes: Deterministic Advertisement IDs

**File**: `lotus-sdk/lib/p2p/musig2/discovery-extension.ts` (MODIFY)

```typescript
/**
 * Generate deterministic signer advertisement ID
 *
 * IMPORTANT: This ID is deterministic based on the public key only.
 * This allows updating existing advertisements instead of creating duplicates.
 */
private generateSignerAdId(publicKeyHex: string): string {
  // DETERMINISTIC: Same public key always gets same ID
  const data = `musig2:signer:${publicKeyHex}`
  const hash = bytesToHex(sha256(new TextEncoder().encode(data)))
  return `${this.config.signerKeyPrefix}${hash.substring(0, 32)}`
}
```

| Task                                                    | Priority | Status         |
| ------------------------------------------------------- | -------- | -------------- |
| Make advertisement ID deterministic (remove Date.now()) | P0       | ⬜ Not Started |
| Update advertiseSigner to check for existing ad         | P1       | ⬜ Not Started |

---

### 3.7 Fix Signer Deduplication in Store

**File**: `stores/musig2.ts` (MODIFY)

```typescript
/**
 * Handle discovered signer from service
 *
 * Deduplicates by publicKey (not by id) to handle re-advertisements.
 */
_handleSignerDiscovered(signer: DiscoveredSigner) {
  // Deduplicate by publicKey (not by id)
  const existingIndex = this.discoveredSigners.findIndex(
    (s: StoreSigner) => s.publicKey === signer.publicKey
  )

  if (existingIndex >= 0) {
    const existing = this.discoveredSigners[existingIndex]

    // Only update if newer advertisement
    if (signer.createdAt > existing.createdAt) {
      console.log('[MuSig2 Store] Updating existing signer:', signer.publicKey.slice(0, 16) + '...')

      this.discoveredSigners[existingIndex] = {
        ...signer,
        subscribed: existing.subscribed,
        reputation: existing.reputation,
        responseTime: existing.responseTime,
      }
    }
  } else {
    console.log('[MuSig2 Store] Discovered new signer:', signer.publicKey.slice(0, 16) + '...')

    this.discoveredSigners.push({
      ...signer,
      subscribed: false,
    })
  }

  this._cleanupExpiredSigners()
}

/**
 * Remove expired signers from the list
 */
_cleanupExpiredSigners() {
  const now = Date.now()
  const before = this.discoveredSigners.length

  this.discoveredSigners = this.discoveredSigners.filter(s => {
    if (s.expiresAt <= now) {
      console.log('[MuSig2 Store] Removing expired signer:', s.publicKey.slice(0, 16) + '...')
      return false
    }
    return true
  })

  const removed = before - this.discoveredSigners.length
  if (removed > 0) {
    console.log(`[MuSig2 Store] Cleaned up ${removed} expired signers`)
  }
}
```

| Task                                   | Priority | Status         |
| -------------------------------------- | -------- | -------------- |
| Deduplicate by publicKey instead of id | P0       | ⬜ Not Started |
| Preserve subscription state on update  | P0       | ⬜ Not Started |
| Add `_cleanupExpiredSigners()`         | P0       | ⬜ Not Started |
| Add periodic cleanup interval          | P1       | ⬜ Not Started |

---

## Testing Checklist

### Auto-Connect

- [ ] P2P connects automatically when autoConnect is enabled
- [ ] P2P does not connect when autoConnect is disabled
- [ ] Settings persist through page reload
- [ ] Auto-connect works after browser restart

### Cache Persistence

- [ ] Discovered signers persist through page reload
- [ ] Expired entries cleaned up on load
- [ ] Cache size bounded (max 100 entries)
- [ ] New discoveries update cached entries

### Deduplication

- [ ] Re-advertising updates existing entry (no duplicate)
- [ ] Same signer shown only once in Available Signers
- [ ] Subscription state preserved on update
- [ ] Expired signers removed from list

---

## Files Summary

### Wallet Changes

| File                          | Change Type | Description             |
| ----------------------------- | ----------- | ----------------------- |
| `plugins/p2p.client.ts`       | NEW         | P2P auto-connect plugin |
| `stores/settings.ts`          | MODIFY      | Add P2P settings        |
| `services/discovery-cache.ts` | NEW         | LocalStorage cache      |
| `services/musig2.ts`          | MODIFY      | Inject cache            |
| `stores/musig2.ts`            | MODIFY      | Deduplication fixes     |

### SDK Changes

| File                                    | Change Type | Description                  |
| --------------------------------------- | ----------- | ---------------------------- |
| `lib/p2p/discovery/types.ts`            | MODIFY      | Add DiscoveryCache interface |
| `lib/p2p/discovery/dht-discoverer.ts`   | MODIFY      | Use cache interface          |
| `lib/p2p/musig2/discovery-extension.ts` | MODIFY      | Deterministic IDs            |
| `lib/p2p/musig2/coordinator.ts`         | MODIFY      | Accept cache in constructor  |

---

## Success Criteria

- [ ] P2P auto-connects on startup when enabled
- [ ] Signers persist through page reloads
- [ ] No duplicate signers in Available Signers list
- [ ] Expired signers cleaned up automatically
- [ ] Cache size bounded appropriately

---

## Dependencies

- **Phase 1**: Storage keys

## Dependents

- **Phase 5**: Uses cache persistence for MuSig2 discovery

---

_Created: December 18, 2025_  
_Status: Pending_
