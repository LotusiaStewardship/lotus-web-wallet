/**
 * Discovery Cache Composable
 *
 * Provides reactive access to the discovery cache for signer advertisements.
 * This composable wraps the plugin-provided cache instances with reactive state.
 *
 * Usage:
 * ```typescript
 * const discoveryCache = useDiscoveryCache()
 *
 * // Check cache size (reactive)
 * console.log(discoveryCache.cacheSize.value)
 *
 * // Get valid signers (reactive)
 * const signers = discoveryCache.validSigners.value
 *
 * // Cache operations
 * discoveryCache.upsert(signer)
 * discoveryCache.clear()
 * ```
 */
import type {
  CachedSigner,
  CacheStats,
  getDiscoveryCache as GetDiscoveryCacheFn,
  getSDKCacheAdapter as GetSDKCacheAdapterFn,
} from '~/plugins/03.discovery-cache.client'

// Re-export types for convenience
export type {
  CachedSigner,
  CacheStats,
} from '~/plugins/03.discovery-cache.client'

// Re-export functions for backward compatibility (direct imports)
export {
  getDiscoveryCache,
  getSDKCacheAdapter,
  clearDiscoveryCache,
  resetDiscoveryCache,
} from '~/plugins/03.discovery-cache.client'

/**
 * Discovery Cache Composable
 *
 * Provides reactive access to the discovery cache singletons.
 */
export function useDiscoveryCache() {
  const { $discoveryCache } = useNuxtApp()

  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Whether the discovery cache is initialized */
  const isInitialized = computed(() => $discoveryCache.isInitialized())

  /** Whether the SDK cache adapter is initialized */
  const isSDKInitialized = computed(() => $discoveryCache.isSDKInitialized())

  /** Current cache size */
  const cacheSize = computed(() => $discoveryCache.getCache().size)

  /** SDK cache size */
  const sdkCacheSize = computed(() => $discoveryCache.getSDKAdapter().size)

  /** Get valid (non-expired) signers */
  const validSigners = computed(() =>
    $discoveryCache.getCache().getValidSigners(),
  )

  /** Get cache statistics */
  const stats = computed(() => $discoveryCache.getCache().getStats())

  // ============================================================================
  // Methods (delegated to plugin)
  // ============================================================================

  /**
   * Get the raw discovery cache instance (for advanced usage)
   */
  function getCache() {
    return $discoveryCache.getCache()
  }

  /**
   * Get the SDK-compatible cache adapter
   */
  function getSDKAdapter() {
    return $discoveryCache.getSDKAdapter()
  }

  /**
   * Get a signer by key
   */
  function get(key: string): CachedSigner | undefined {
    return $discoveryCache.getCache().get(key)
  }

  /**
   * Get a signer by public key
   */
  function getByPublicKey(publicKey: string): CachedSigner | undefined {
    return $discoveryCache.getCache().getByPublicKey(publicKey)
  }

  /**
   * Set a signer in the cache
   */
  function set(key: string, entry: CachedSigner): void {
    return $discoveryCache.getCache().set(key, entry)
  }

  /**
   * Update an existing signer or add if not exists
   */
  function upsert(signer: CachedSigner): void {
    return $discoveryCache.getCache().upsert(signer)
  }

  /**
   * Delete a signer by key
   */
  function remove(key: string): boolean {
    return $discoveryCache.getCache().delete(key)
  }

  /**
   * Delete a signer by public key
   */
  function removeByPublicKey(publicKey: string): boolean {
    return $discoveryCache.getCache().deleteByPublicKey(publicKey)
  }

  /**
   * Get all signers
   */
  function getAll(): CachedSigner[] {
    return $discoveryCache.getCache().getAll()
  }

  /**
   * Get all valid (non-expired) signers
   */
  function getValidSigners(): CachedSigner[] {
    return $discoveryCache.getCache().getValidSigners()
  }

  /**
   * Clean up expired entries
   */
  function cleanupExpired(): number {
    return $discoveryCache.getCache().cleanupExpired()
  }

  /**
   * Clear all entries
   */
  function clear(): void {
    return $discoveryCache.clear()
  }

  /**
   * Reset the cache singleton (for testing)
   */
  function reset(): void {
    return $discoveryCache.reset()
  }

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Reactive state
    isInitialized,
    isSDKInitialized,
    cacheSize,
    sdkCacheSize,
    validSigners,
    stats,

    // Cache access
    getCache,
    getSDKAdapter,

    // CRUD operations
    get,
    getByPublicKey,
    set,
    upsert,
    remove,
    removeByPublicKey,
    getAll,
    getValidSigners,

    // Maintenance
    cleanupExpired,
    clear,
    reset,
  }
}
