# Phase 1: Critical Fixes (Simplified)

## Overview

This document details the **minimal** fixes needed to ensure the discovery cache properly persists between page reloads. Following the architecture guidelines in `docs/architecture/`, we avoid over-engineering and focus on the root causes.

**Architecture Compliance**:

- Services remain **stateless wrappers** (per `03_SERVICES.md`)
- No new plugins (plugins are for SDK initialization only)
- Follow existing patterns in `services/storage.ts`

---

## 1.1 Replace `require()` with Top-Level Import (ROOT CAUSE FIX)

**Problem**: The store uses CommonJS `require()` which can create separate module instances from `import()`, causing the singleton pattern to fail.

**File**: `stores/musig2.ts`

### Current Code (Problematic)

```typescript
_updateDiscoveryCache(signer: DiscoveredSigner) {
  try {
    const { getDiscoveryCache } = require('~/services/discovery-cache')  // ❌ require()
    const cache = getDiscoveryCache()
    // ...
  }
}
```

### Fixed Code

```typescript
// At top of stores/musig2.ts, add to existing imports:
import { getDiscoveryCache } from '~/services/discovery-cache'

// In actions - just remove the require(), use the imported function:
_updateDiscoveryCache(signer: DiscoveredSigner) {
  try {
    const cache = getDiscoveryCache()  // ✅ Uses top-level import
    cache.upsert({
      id: signer.id,
      peerId: signer.peerId,
      publicKey: signer.publicKey,
      walletAddress: signer.walletAddress,
      nickname: signer.nickname,
      createdAt: signer.discoveredAt,
      expiresAt: signer.lastSeen + 30 * 60 * 1000,
      addedAt: Date.now(),
      lastAccess: Date.now(),
      accessCount: 1,
      source: 'gossipsub',
    })
  } catch (error) {
    console.warn('[MuSig2 Store] Failed to update discovery cache:', error)
  }
}

_restoreCachedSigners() {
  try {
    const cache = getDiscoveryCache()  // ✅ Uses top-level import
    const cachedSigners = cache.getValidSigners()
    // ... rest unchanged
  } catch (error) {
    console.warn('[MuSig2 Store] Failed to restore cached signers:', error)
  }
}
```

**Why this is the root cause**: Top-level ES imports ensure the same module instance is used throughout the app. The `getDiscoveryCache()` singleton then works correctly.

---

## 1.2 Add `beforeunload` Handler

**Problem**: The 500ms debounced save may not complete before page unload.

**File**: `services/discovery-cache.ts`

### Implementation (Minimal Change)

Add to `LocalStorageDiscoveryCache` class:

```typescript
private isDirty: boolean = false

constructor() {
  this.memoryCache = this.loadFromStorage()
  this.cleanupExpired()

  // Add beforeunload handler
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (this.isDirty && this.saveDebounceTimer) {
        clearTimeout(this.saveDebounceTimer)
        this._saveSync()
      }
    })
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
```

---

## 1.3 Add Diagnostic Logging

**Problem**: Hard to debug cache issues without visibility.

**File**: `services/discovery-cache.ts`

### Implementation (Minimal Change)

Add logging to `loadFromStorage()`:

```typescript
private loadFromStorage(): Map<string, CachedSigner> {
  if (typeof localStorage === 'undefined') {
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
      console.log(`[DiscoveryCache] Loaded ${map.size} entries from localStorage`)
      return map
    }
    return new Map()
  } catch (error) {
    console.warn('[DiscoveryCache] Failed to load from storage:', error)
    return new Map()
  }
}
```

---

## Testing Checklist

After implementing these fixes:

1. **Test basic persistence**:

   - Discover a signer
   - Reload page
   - Verify signer appears in UI
   - Check console for `[DiscoveryCache] Loaded X entries`

2. **Test rapid reload**:

   - Discover a signer
   - Immediately reload (within 500ms)
   - Verify signer persists

3. **Test browser close**:
   - Discover a signer
   - Close browser tab
   - Reopen tab
   - Verify signer persists

---

## Summary of Changes

| File                          | Change                                              | Lines Changed |
| ----------------------------- | --------------------------------------------------- | ------------- |
| `stores/musig2.ts`            | Add top-level import, remove 2 `require()` calls    | ~5 lines      |
| `services/discovery-cache.ts` | Add `isDirty` flag, `beforeunload` handler, logging | ~20 lines     |

**Total Estimated Effort**: 45 minutes

---

_Phase 1 focuses on minimal, targeted fixes that address the root causes without over-engineering._
