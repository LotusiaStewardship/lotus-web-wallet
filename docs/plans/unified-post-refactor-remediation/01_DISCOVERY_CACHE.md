# Phase 1: Discovery Cache Fixes

**Priority**: P1  
**Effort**: 1 day  
**Dependencies**: None  
**Status**: ✅ COMPLETED (December 18, 2025)

---

## Overview

This phase fixes the MuSig2 signer discovery cache persistence issues. The cache is designed to store discovered signers in localStorage so they survive page reloads, but implementation issues prevent this from working correctly.

**Architecture Compliance**:

- Services remain **stateless wrappers** (per `03_SERVICES.md`)
- No new plugins (plugins are for SDK initialization only)
- Follow existing patterns in `services/storage.ts`

---

## Root Cause Analysis

### Issue #1: Multiple Singleton Instances (MINOR - Fixed)

**Location**: `stores/musig2.ts` lines 898, 926

**Problem**: The store uses CommonJS `require()` while the service uses ES `import()`. This can create separate module instances, causing the singleton pattern to fail.

```typescript
// stores/musig2.ts - uses require()
const { getDiscoveryCache } = require('~/services/discovery-cache')

// services/musig2.ts - uses dynamic import()
const { getSDKCacheAdapter } = await import('~/services/discovery-cache')
```

**Impact**: MEDIUM - Different parts of the app may get different cache instances.

**Resolution**: ✅ Replaced `require()` with top-level ES import.

### Issue #2: Debounced Save May Not Complete (MINOR - Fixed)

**Location**: `services/discovery-cache.ts` lines 106-125

**Problem**: The `saveToStorage()` method uses a 500ms debounce. If the page unloads before the debounce timer fires, data is lost.

**Impact**: MEDIUM - Rapid page navigation or closing the tab can lose recently discovered signers.

**Resolution**: ✅ Added `beforeunload` handler to flush pending saves.

### Issue #3: No `beforeunload` Handler (MINOR - Fixed)

**Location**: `services/discovery-cache.ts`

**Problem**: There's no `beforeunload` event handler to flush pending saves before the page unloads.

**Impact**: MEDIUM - Combined with Issue #2, this can cause data loss on page close/reload.

**Resolution**: ✅ Added `beforeunload` handler with `isDirty` flag.

### Issue #4: SDK Cache Adapter Loses Advertisement Data (CRITICAL - ROOT CAUSE)

**Location**: `services/discovery-cache.ts` - `SDKDiscoveryCacheAdapter` class

**Problem**: The `SDKDiscoveryCacheAdapter` converted SDK cache entries to a simplified `CachedSigner` format, **discarding critical fields including the cryptographic signature**. When entries were restored from localStorage, they were reconstructed with placeholder data (`Buffer.alloc(64)` for signature), causing the SDK's security validation to fail.

The SDK's `DHTDiscoverer.discover()` method validates each advertisement:

```typescript
const securityResult = await this.validateAdvertisementSecurity(advertisement)
if (securityResult.valid && securityResult.securityScore >= 50) {
  results.push(advertisement)
}
```

Restored entries with placeholder signatures failed this validation and were filtered out.

**Impact**: CRITICAL - Discovered signers appeared to persist (localStorage had data) but were never returned by `discoverSigners()` after page reload.

**Resolution**: ✅ Completely rewrote `SDKDiscoveryCacheAdapter` to store the **complete SDK cache entry** without conversion. Now properly serializes/deserializes Buffer objects for localStorage compatibility.

---

## Implementation

### Task 1.1: Replace `require()` with Top-Level Import ✅

**File**: `stores/musig2.ts`

**Change**: Replaced CommonJS `require()` calls with ES `import` at module top.

```typescript
// Added at top of stores/musig2.ts:
import { getDiscoveryCache } from '~/services/discovery-cache'

// In actions - now uses the imported function directly:
_updateDiscoveryCache(signer: DiscoveredSigner) {
  try {
    const cache = getDiscoveryCache()  // ✅ Uses top-level import
    // ...
  }
}
```

---

### Task 1.2: Add `beforeunload` Handler ✅

**File**: `services/discovery-cache.ts`

**Change**: Added `isDirty` flag, `_saveSync()` method, and `beforeunload` event handler to both `LocalStorageDiscoveryCache` and `SDKDiscoveryCacheAdapter` classes.

---

### Task 1.3: Add Diagnostic Logging ✅

**File**: `services/discovery-cache.ts`

**Change**: Added console logging for cache load/save operations.

---

### Task 1.4: Rewrite SDKDiscoveryCacheAdapter to Store Complete Entries ✅

**File**: `services/discovery-cache.ts`

**Problem**: The original adapter converted SDK entries to a simplified format, losing the signature.

**Solution**: Complete rewrite of `SDKDiscoveryCacheAdapter` to:

1. Store the **complete SDK cache entry** without conversion
2. Properly serialize `Buffer` objects to JSON-safe format for localStorage
3. Deserialize `Buffer` objects when loading from localStorage
4. Use a separate localStorage key (`lotus_sdk_discovery_cache`) to avoid conflicts

```typescript
/**
 * Direct localStorage-backed cache that implements the SDK's IDiscoveryCache interface.
 *
 * CRITICAL: This stores the COMPLETE SDK advertisement including signatures.
 * Previous implementation converted to a simplified format which lost the signature,
 * causing restored entries to fail security validation.
 */
export class SDKDiscoveryCacheAdapter {
  // Stores complete SDK entries, not converted subsets
  private memoryCache: Map<string, SDKCacheEntry>

  // Serialize Buffer to JSON-safe format
  private serializeEntry(entry: SDKCacheEntry): SerializedSDKCacheEntry {
    const sig = entry.advertisement.signature
    let serializedSig: { type: 'Buffer'; data: number[] }
    if (Buffer.isBuffer(sig)) {
      serializedSig = { type: 'Buffer', data: Array.from(sig) }
    }
    // ...
  }

  // Deserialize Buffer from JSON format
  private deserializeEntry(serialized: SerializedSDKCacheEntry): SDKCacheEntry {
    const sig = serialized.advertisement.signature
    let deserializedSig: Buffer
    if (sig && typeof sig === 'object' && 'data' in sig) {
      deserializedSig = Buffer.from(sig.data)
    }
    // ...
  }
}
```

---

## Testing Checklist

After implementing these fixes:

### Basic Persistence Test

1. Open wallet in browser
2. Wait for signer discovery (or manually trigger)
3. Verify console shows signer discovered
4. Reload page
5. Verify console shows `[SDKDiscoveryCache] Loaded X entries from localStorage`
6. Verify console shows `[Discovery] Restored X entries from external cache`
7. Verify signers appear in UI

### Rapid Reload Test

1. Discover a signer
2. Immediately reload (within 500ms)
3. Verify signer persists (beforeunload handler should flush)

### Browser Close Test

1. Discover a signer
2. Close browser tab
3. Reopen tab
4. Verify signer persists

---

## Files Summary

| File                          | Change                                                           | Lines Changed |
| ----------------------------- | ---------------------------------------------------------------- | ------------- |
| `stores/musig2.ts`            | Add top-level import, remove 2 `require()` calls                 | ~5 lines      |
| `services/discovery-cache.ts` | Rewrite `SDKDiscoveryCacheAdapter` to store complete SDK entries | ~300 lines    |

**Total Actual Effort**: ~2 hours (including root cause investigation)

---

## Success Criteria

- [x] Discovered signers persist through page reload
- [x] Discovered signers persist through browser close/reopen
- [x] No duplicate signers after reload
- [x] Console shows successful cache load on startup
- [x] No data loss during rapid page navigation
- [x] SDK security validation passes for restored entries

---

## Key Learnings

1. **Don't convert SDK data structures** - The SDK's cache entries contain fields (like signatures) that are critical for security validation. Store them as-is.

2. **Buffer serialization** - `Buffer` objects don't serialize to JSON properly. Must convert to `{ type: 'Buffer', data: number[] }` format and back.

3. **Two caches, one problem** - The wallet had its own `LocalStorageDiscoveryCache` AND an `SDKDiscoveryCacheAdapter`. The adapter was the integration point with the SDK, and that's where the data loss occurred.

---

_Phase 1 of Post-Refactor Remediation Plan - COMPLETED_
