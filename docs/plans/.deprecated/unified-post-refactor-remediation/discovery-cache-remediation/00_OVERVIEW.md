# MuSig2 Discovery Cache Remediation Plan

## Executive Summary

This document analyzes issues with the MuSig2 signer discovery cache not persisting between page reloads and provides a comprehensive remediation plan. The cache is designed to store discovered signers in localStorage so they survive page reloads, but several implementation issues prevent this from working correctly.

**Created**: December 18, 2024  
**Scope**: Fix localStorage-backed discovery cache persistence  
**Priority**: P1 (High - Core P2P Feature Degraded)  
**Estimated Effort**: 1-2 days

---

## Problem Statement

The MuSig2 signer discovery cache (`services/discovery-cache.ts`) is intended to persist discovered signers through page reloads using localStorage. However, users report that:

1. **Signers disappear on reload** - Previously discovered signers are not restored
2. **Cache appears empty after restart** - Even though localStorage should contain data
3. **Inconsistent behavior** - Sometimes cache works, sometimes it doesn't

---

## Architecture Overview

### Current Implementation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Discovery Cache System                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              services/discovery-cache.ts                         │    │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────┐   │    │
│  │  │LocalStorageDiscovery│  │   SDKDiscoveryCacheAdapter      │   │    │
│  │  │       Cache         │  │   (implements IDiscoveryCache)  │   │    │
│  │  │                     │  │                                 │   │    │
│  │  │ - memoryCache: Map  │◄─┤ - Converts wallet ↔ SDK format  │   │    │
│  │  │ - loadFromStorage() │  │ - Passed to MuSig2P2PCoordinator│   │    │
│  │  │ - saveToStorage()   │  └─────────────────────────────────┘   │    │
│  │  └─────────────────────┘                                        │    │
│  │            ▲                                                    │    │
│  │            │ Singleton pattern                                  │    │
│  │  ┌─────────┴─────────┐                                          │    │
│  │  │ getDiscoveryCache()│                                         │    │
│  │  │ getSDKCacheAdapter()│                                        │    │
│  │  └───────────────────┘                                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    stores/musig2.ts                              │    │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────┐   │    │
│  │  │_updateDiscoveryCache│  │   _restoreCachedSigners()       │   │    │
│  │  │  (on signer found)  │  │   (on initialization)           │   │    │
│  │  │                     │  │                                 │   │    │
│  │  │ Uses require() to   │  │ Uses require() to import cache  │   │    │
│  │  │ import cache        │  │ Called after MuSig2 init        │   │    │
│  │  └─────────────────────┘  └─────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                   services/musig2.ts                             │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │ initializeMuSig2()                                          ││    │
│  │  │   - Uses dynamic import() for discovery-cache               ││    │
│  │  │   - Passes SDKCacheAdapter to MuSig2P2PCoordinator          ││    │
│  │  └─────────────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **On Signer Discovery**:

   - SDK discovery layer receives signer advertisement
   - `onSignerDiscovered` callback fires in `stores/musig2.ts`
   - `_handleSignerDiscovered()` adds to `discoveredSigners` array
   - `_updateDiscoveryCache()` persists to localStorage via `getDiscoveryCache().upsert()`

2. **On Page Reload**:

   - `LocalStorageDiscoveryCache` constructor calls `loadFromStorage()`
   - `stores/musig2.ts.initialize()` calls `_restoreCachedSigners()`
   - Cached signers should be restored to `discoveredSigners` array

3. **SDK Integration**:
   - `SDKDiscoveryCacheAdapter` wraps `LocalStorageDiscoveryCache`
   - Passed to `MuSig2P2PCoordinator` for SDK-level caching
   - SDK can read/write cache entries directly

---

## Root Cause Analysis

### Issue #1: Multiple Singleton Instances (CRITICAL)

**Location**: `services/discovery-cache.ts` lines 494-517

**Problem**: The singleton pattern uses module-level variables, but these can be reset or duplicated due to:

1. **Hot Module Replacement (HMR)** - During development, module reloads create new singletons
2. **Dynamic imports** - `require()` vs `import()` may create separate module instances
3. **SSR/Hydration** - Nuxt's SSR can cause module state inconsistencies

```typescript
// services/discovery-cache.ts
let discoveryCache: LocalStorageDiscoveryCache | null = null
let sdkCacheAdapter: SDKDiscoveryCacheAdapter | null = null

export function getDiscoveryCache(): LocalStorageDiscoveryCache {
  if (!discoveryCache) {
    discoveryCache = new LocalStorageDiscoveryCache() // Creates new instance
  }
  return discoveryCache
}
```

**Evidence**: The store uses `require()` while the service uses `import()`:

```typescript
// stores/musig2.ts - uses require()
const { getDiscoveryCache } = require('~/services/discovery-cache')

// services/musig2.ts - uses dynamic import()
const { getSDKCacheAdapter } = await import('~/services/discovery-cache')
```

**Impact**: HIGH - Different parts of the app may get different cache instances, causing data to be written to one instance but read from another.

---

### Issue #2: Debounced Save May Not Complete (HIGH)

**Location**: `services/discovery-cache.ts` lines 106-125

**Problem**: The `saveToStorage()` method uses a 500ms debounce. If the page unloads before the debounce timer fires, data is lost.

```typescript
private saveToStorage(): void {
  if (typeof localStorage === 'undefined') return

  if (this.saveDebounceTimer) {
    clearTimeout(this.saveDebounceTimer)
  }

  this.saveDebounceTimer = setTimeout(() => {
    try {
      const entries = Array.from(this.memoryCache.entries())
      localStorage.setItem(
        STORAGE_KEYS.DISCOVERY_CACHE,
        JSON.stringify(entries),
      )
    } catch (error) {
      console.warn('[DiscoveryCache] Failed to save to storage:', error)
    }
    this.saveDebounceTimer = null
  }, SAVE_DEBOUNCE_MS)  // 500ms delay
}
```

**Impact**: HIGH - Rapid page navigation or closing the tab can lose recently discovered signers.

---

### Issue #3: No `beforeunload` Handler (HIGH)

**Location**: `services/discovery-cache.ts`

**Problem**: There's no `beforeunload` event handler to flush pending saves before the page unloads.

**Impact**: HIGH - Combined with Issue #2, this guarantees data loss on page close/reload.

---

### Issue #4: Cache Restoration Timing (MEDIUM)

**Location**: `stores/musig2.ts` lines 342-343

**Problem**: `_restoreCachedSigners()` is called after `initializeMuSig2()`, but the SDK adapter is initialized during `initializeMuSig2()`. This creates a timing issue:

```typescript
// stores/musig2.ts
await initializeMuSig2(...)  // Creates SDK adapter with cache
this.initialized = true
this._restoreCachedSigners()  // Restores to store, but SDK already has its own copy
```

The SDK's `MuSig2P2PCoordinator` receives the cache adapter during initialization and may read from it before the store restores signers. This can cause:

1. SDK and store having different views of cached signers
2. Duplicate restoration if SDK also restores from cache

**Impact**: MEDIUM - May cause inconsistent state between SDK and store.

---

### Issue #5: `require()` Usage in Store (MEDIUM)

**Location**: `stores/musig2.ts` lines 898, 926

**Problem**: The store uses CommonJS `require()` instead of ES module `import`:

```typescript
_updateDiscoveryCache(signer: DiscoveredSigner) {
  try {
    const { getDiscoveryCache } = require('~/services/discovery-cache')
    // ...
  }
}

_restoreCachedSigners() {
  try {
    const { getDiscoveryCache } = require('~/services/discovery-cache')
    // ...
  }
}
```

This is problematic because:

1. `require()` is synchronous and may not work correctly with Nuxt's module system
2. Creates potential for different module instances than `import()`
3. Not tree-shakeable

**Impact**: MEDIUM - May contribute to singleton issues.

---

### Issue #6: No Cache Validation on Load (LOW)

**Location**: `services/discovery-cache.ts` lines 86-104

**Problem**: When loading from localStorage, there's no validation of the data structure:

```typescript
private loadFromStorage(): Map<string, CachedSigner> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DISCOVERY_CACHE)
    if (!data) return new Map()

    const parsed = JSON.parse(data)
    if (Array.isArray(parsed)) {
      return new Map(parsed as [string, CachedSigner][])  // No validation!
    }
    return new Map()
  } catch (error) {
    console.warn('[DiscoveryCache] Failed to load from storage:', error)
    return new Map()
  }
}
```

If the localStorage data is corrupted or from an old version, it could cause runtime errors.

**Impact**: LOW - Unlikely but could cause silent failures.

---

### Issue #7: SDK Cache Adapter Not Synced with Store (MEDIUM)

**Location**: `services/discovery-cache.ts` and `stores/musig2.ts`

**Problem**: The SDK can write to the cache via `SDKDiscoveryCacheAdapter`, but the store's `discoveredSigners` array is not automatically updated. The store only updates when:

1. `onSignerDiscovered` callback fires (from SDK events)
2. `_restoreCachedSigners()` is called (only on init)

If the SDK writes directly to the cache (e.g., from GossipSub messages), the store won't know about it until the next page reload.

**Impact**: MEDIUM - UI may not reflect all cached signers.

---

## Remediation Plan

### Simplified Approach

After reviewing the architecture guidelines in `docs/architecture/`, the original plan was over-engineered. The fixes should be minimal and follow existing patterns.

**Key Architecture Principles** (from `docs/architecture/03_SERVICES.md`):

- Services are **stateless wrappers** around external APIs
- Use **callback-based events** for store notification
- **Lazy loading** for SDK modules

**Key Insight**: The discovery cache is a simple localStorage wrapper, not an SDK. It should follow the existing `services/storage.ts` patterns.

### Phase 1: Critical Fixes (P0) - Minimal Changes

| Task | Description                                       | File                          | Effort |
| ---- | ------------------------------------------------- | ----------------------------- | ------ |
| 1.1  | Replace `require()` with top-level `import`       | `stores/musig2.ts`            | 15m    |
| 1.2  | Add `beforeunload` handler to flush pending saves | `services/discovery-cache.ts` | 15m    |
| 1.3  | Add diagnostic logging on load/save               | `services/discovery-cache.ts` | 15m    |

### Phase 2: Optional Improvements (P2)

| Task | Description                                          | File                          | Effort |
| ---- | ---------------------------------------------------- | ----------------------------- | ------ |
| 2.1  | Add `saveImmediate()` method for critical operations | `services/discovery-cache.ts` | 15m    |
| 2.2  | Add cache statistics getter for debugging            | `services/discovery-cache.ts` | 15m    |

### Removed from Plan (Over-Engineering)

| Original Task                             | Reason for Removal                                           |
| ----------------------------------------- | ------------------------------------------------------------ |
| Create cache initialization plugin        | Cache is not an SDK; plugins are for SDK init only           |
| Cache sync interval between SDK and store | Event-driven architecture already handles this via callbacks |
| Cache integrity verification              | Unnecessary complexity; JSON.parse handles validation        |
| Data migration for schema changes         | Premature optimization; handle if/when needed                |

---

## Detailed Implementation

See the following documents for detailed implementation:

| Document                                       | Focus                    |
| ---------------------------------------------- | ------------------------ |
| [01_CRITICAL_FIXES.md](./01_CRITICAL_FIXES.md) | Phase 1 minimal fixes    |
| [03_TESTING.md](./03_TESTING.md)               | Testing and verification |

**Note**: `02_ARCHITECTURE_IMPROVEMENTS.md` has been deprecated as the proposed changes were over-engineered.

---

## Success Criteria

- [ ] Discovered signers persist through page reload
- [ ] Discovered signers persist through browser close/reopen
- [ ] No duplicate signers after reload
- [ ] Cache statistics show correct entry count
- [ ] Console shows successful cache load on startup
- [ ] No data loss during rapid page navigation

---

## Risk Assessment

| Risk                               | Impact | Mitigation                                        |
| ---------------------------------- | ------ | ------------------------------------------------- |
| Breaking existing cache data       | Low    | JSON.parse handles invalid data gracefully        |
| Performance impact from sync saves | Low    | Keep debounce for normal ops, sync only on unload |

---

_Created: December 18, 2024_  
_Status: Planning_
