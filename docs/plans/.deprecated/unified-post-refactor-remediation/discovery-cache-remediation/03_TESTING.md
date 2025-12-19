# Phase 3: Testing and Verification

## Overview

This document provides comprehensive testing procedures to verify the discovery cache fixes are working correctly.

---

## Manual Testing Procedures

### Test 1: Basic Cache Persistence

**Purpose**: Verify signers persist through page reload.

**Steps**:

1. Open browser developer tools (Console tab)
2. Navigate to P2P page
3. Connect to P2P network
4. Wait for signers to be discovered (or have another wallet advertise)
5. Check console for `[DiscoveryCache] Set entry:` messages
6. Check console for `[MuSig2 Store] Discovered new signer:` messages
7. Note the number of discovered signers in the UI
8. **Reload the page (F5 or Cmd+R)**
9. Check console for `[DiscoveryCache] Loaded X entries from localStorage`
10. Check console for `[MuSig2 Store] Restoring X cached signers`
11. Verify signers appear in the UI

**Expected Results**:

- Signers should appear in UI after reload
- Console should show cache load messages
- No "Multiple instances" warnings

---

### Test 2: Rapid Reload (beforeunload Handler)

**Purpose**: Verify the beforeunload handler flushes pending saves.

**Steps**:

1. Open browser developer tools
2. Navigate to P2P page and connect
3. Discover a signer (or have another wallet advertise)
4. **Immediately reload the page** (within 500ms of discovery)
5. Check console for `[DiscoveryCache] Flushed pending save to storage`
6. After reload, verify the signer persists

**Expected Results**:

- Signer should persist even with rapid reload
- Console should show flush message before reload

---

### Test 3: Browser Close/Reopen

**Purpose**: Verify signers persist through browser close.

**Steps**:

1. Navigate to P2P page and connect
2. Discover signers
3. **Close the browser tab completely**
4. Reopen the browser and navigate to the wallet
5. Go to P2P page
6. Verify signers appear

**Expected Results**:

- Signers should persist through browser close
- Cache should load on startup

---

### Test 4: Singleton Integrity

**Purpose**: Verify only one cache instance exists.

**Steps**:

1. Open browser developer tools (Console tab)
2. Navigate to P2P page
3. Run in console:

   ```javascript
   // Get cache instance
   const cache = $nuxt.$discoveryCache
   console.log('Instance ID:', cache.getInstanceId())

   // Verify singleton
   import('~/services/discovery-cache').then(m => {
     const cache2 = m.getDiscoveryCache()
     console.log('Instance ID via getter:', cache2.getInstanceId())
     console.log('Same instance:', cache === cache2)
   })
   ```

4. Check for any "Multiple instances" warnings in console

**Expected Results**:

- Both instance IDs should be 1
- `Same instance` should be `true`
- No "Multiple instances" warnings

---

### Test 5: Cache Sync

**Purpose**: Verify periodic cache sync works.

**Steps**:

1. Navigate to P2P page and connect
2. Wait for initial signers to load
3. Note the number of signers
4. Wait 30+ seconds
5. Check console for `[MuSig2 Store] Cache sync:` messages

**Expected Results**:

- Sync messages should appear every 30 seconds
- If SDK added signers directly, they should appear in UI

---

### Test 6: Expired Signer Cleanup

**Purpose**: Verify expired signers are removed.

**Steps**:

1. Navigate to P2P page
2. Discover signers
3. Wait for signers to expire (30 minutes, or modify TTL for testing)
4. Check console for `[DiscoveryCache] Cleaned up X expired entries`
5. Verify expired signers are removed from UI

**Expected Results**:

- Expired signers should be cleaned up
- Console should show cleanup messages

---

### Test 7: localStorage Inspection

**Purpose**: Directly verify localStorage contents.

**Steps**:

1. Open browser developer tools
2. Go to Application tab → Local Storage
3. Find key `lotus:discovery:cache`
4. Inspect the JSON data
5. Verify it contains expected signer entries

**Expected Results**:

- Key should exist
- Value should be valid JSON array of [key, CachedSigner] tuples
- Entries should have expected fields (id, peerId, publicKey, etc.)

---

### Test 8: Cache Diagnostics

**Purpose**: Verify diagnostics provide useful information.

**Steps**:

1. Open browser developer tools (Console tab)
2. Run:
   ```javascript
   const cache = $nuxt.$discoveryCache
   console.log(cache.getDiagnostics())
   console.log(cache.getStats())
   ```

**Expected Results**:

- Diagnostics should show:
  - `instanceId`: 1
  - `size`: number of cached signers
  - `entries`: array with signer details
- Stats should show:
  - `size`: same as diagnostics
  - `expiredCount`: 0 (if no expired entries)

---

## Automated Test Cases

### Unit Tests for `LocalStorageDiscoveryCache`

**File**: `tests/services/discovery-cache.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  LocalStorageDiscoveryCache,
  getDiscoveryCache,
  resetDiscoveryCache,
  STORAGE_KEYS,
} from '~/services/discovery-cache'

describe('LocalStorageDiscoveryCache', () => {
  let mockLocalStorage: Record<string, string>

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockLocalStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockLocalStorage[key] = value
      },
      removeItem: (key: string) => {
        delete mockLocalStorage[key]
      },
    })

    // Reset singleton
    resetDiscoveryCache()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const cache1 = getDiscoveryCache()
      const cache2 = getDiscoveryCache()
      expect(cache1).toBe(cache2)
      expect(cache1.getInstanceId()).toBe(cache2.getInstanceId())
    })

    it('should have instance ID of 1', () => {
      const cache = getDiscoveryCache()
      expect(cache.getInstanceId()).toBe(1)
    })
  })

  describe('persistence', () => {
    it('should save to localStorage', () => {
      const cache = getDiscoveryCache()
      cache.set('test-key', {
        id: 'test-key',
        peerId: 'peer-123',
        publicKey: 'pubkey-abc',
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        addedAt: Date.now(),
        lastAccess: Date.now(),
        accessCount: 1,
        source: 'gossipsub',
      })

      // Trigger immediate save
      cache.saveImmediate()

      expect(mockLocalStorage[STORAGE_KEYS.DISCOVERY_CACHE]).toBeDefined()
      const saved = JSON.parse(mockLocalStorage[STORAGE_KEYS.DISCOVERY_CACHE])
      expect(saved).toHaveLength(1)
      expect(saved[0][0]).toBe('test-key')
    })

    it('should load from localStorage', () => {
      // Pre-populate localStorage
      const entries = [
        [
          'key1',
          {
            id: 'key1',
            peerId: 'peer-1',
            publicKey: 'pubkey-1',
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000,
            addedAt: Date.now(),
            lastAccess: Date.now(),
            accessCount: 1,
            source: 'gossipsub',
          },
        ],
      ]
      mockLocalStorage[STORAGE_KEYS.DISCOVERY_CACHE] = JSON.stringify(entries)

      // Create new cache (should load from storage)
      resetDiscoveryCache()
      const cache = getDiscoveryCache()

      expect(cache.size).toBe(1)
      expect(cache.get('key1')).toBeDefined()
    })
  })

  describe('expiry', () => {
    it('should clean up expired entries', () => {
      const cache = getDiscoveryCache()

      // Add expired entry
      cache.set('expired', {
        id: 'expired',
        peerId: 'peer-1',
        publicKey: 'pubkey-1',
        createdAt: Date.now() - 7200000,
        expiresAt: Date.now() - 3600000, // Expired 1 hour ago
        addedAt: Date.now() - 7200000,
        lastAccess: Date.now() - 7200000,
        accessCount: 1,
        source: 'gossipsub',
      })

      // Add valid entry
      cache.set('valid', {
        id: 'valid',
        peerId: 'peer-2',
        publicKey: 'pubkey-2',
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        addedAt: Date.now(),
        lastAccess: Date.now(),
        accessCount: 1,
        source: 'gossipsub',
      })

      const removed = cache.cleanupExpired()
      expect(removed).toBe(1)
      expect(cache.size).toBe(1)
      expect(cache.get('valid')).toBeDefined()
      expect(cache.get('expired')).toBeUndefined()
    })

    it('should return only valid signers', () => {
      const cache = getDiscoveryCache()

      // Add expired entry
      cache.set('expired', {
        id: 'expired',
        peerId: 'peer-1',
        publicKey: 'pubkey-1',
        createdAt: Date.now() - 7200000,
        expiresAt: Date.now() - 3600000,
        addedAt: Date.now() - 7200000,
        lastAccess: Date.now() - 7200000,
        accessCount: 1,
        source: 'gossipsub',
      })

      // Add valid entry
      cache.set('valid', {
        id: 'valid',
        peerId: 'peer-2',
        publicKey: 'pubkey-2',
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        addedAt: Date.now(),
        lastAccess: Date.now(),
        accessCount: 1,
        source: 'gossipsub',
      })

      const validSigners = cache.getValidSigners()
      expect(validSigners).toHaveLength(1)
      expect(validSigners[0].id).toBe('valid')
    })
  })

  describe('upsert', () => {
    it('should add new entry', () => {
      const cache = getDiscoveryCache()
      cache.upsert({
        id: 'new',
        peerId: 'peer-1',
        publicKey: 'pubkey-1',
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        addedAt: Date.now(),
        lastAccess: Date.now(),
        accessCount: 1,
        source: 'gossipsub',
      })

      expect(cache.size).toBe(1)
    })

    it('should update existing entry by publicKey', () => {
      const cache = getDiscoveryCache()

      // Add initial entry
      cache.upsert({
        id: 'id1',
        peerId: 'peer-1',
        publicKey: 'pubkey-same',
        nickname: 'Original',
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        addedAt: Date.now(),
        lastAccess: Date.now(),
        accessCount: 1,
        source: 'gossipsub',
      })

      // Update with same publicKey but different id
      cache.upsert({
        id: 'id2',
        peerId: 'peer-1',
        publicKey: 'pubkey-same',
        nickname: 'Updated',
        createdAt: Date.now(),
        expiresAt: Date.now() + 7200000,
        addedAt: Date.now(),
        lastAccess: Date.now(),
        accessCount: 1,
        source: 'gossipsub',
      })

      expect(cache.size).toBe(1)
      const entry = cache.getByPublicKey('pubkey-same')
      expect(entry?.nickname).toBe('Updated')
      expect(entry?.accessCount).toBe(2) // Incremented
    })
  })
})
```

---

## Debugging Checklist

If cache persistence is not working, check:

1. **Console for errors**:

   - Look for `[DiscoveryCache]` prefixed messages
   - Check for any JavaScript errors

2. **localStorage availability**:

   - Run `typeof localStorage` in console (should be `"object"`)
   - Check if localStorage is full (quota exceeded)

3. **Singleton integrity**:

   - Run `verifySingletonIntegrity()` from console
   - Check for "Multiple instances" warnings

4. **Cache contents**:

   - Check Application → Local Storage → `lotus:discovery:cache`
   - Verify JSON is valid

5. **Timing issues**:

   - Check if `_restoreCachedSigners()` is called
   - Check if cache is loaded before restore

6. **Expiry issues**:
   - Check if signers have valid `expiresAt` timestamps
   - Run `cache.getValidSigners()` vs `cache.getAll()`

---

## Performance Considerations

1. **Cache size**: Limited to 100 entries (MAX_ENTRIES)
2. **Save debounce**: 500ms to reduce I/O
3. **Sync interval**: 30 seconds for periodic sync
4. **Cleanup interval**: 5 minutes for expired entry cleanup

---

_Phase 3 Estimated Effort: 2-3 hours_
