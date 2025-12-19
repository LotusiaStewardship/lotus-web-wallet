/**
 * Identity Store
 *
 * Manages unified identities across the application.
 * Identities are the source of truth for cryptographic entities.
 *
 * The publicKeyHex is the canonical identifier - all other properties
 * (address, peerId, etc.) are derived or associated.
 */
import { defineStore } from 'pinia'
import type {
  Identity,
  IdentityUpdate,
  IdentitySignerCapabilities,
} from '~/types/identity'
import type { OnlineStatus } from '~/types/contact'
import {
  createIdentity,
  isValidPublicKey,
  normalizePublicKey,
} from '~/utils/identity'
import { STORAGE_KEYS } from '~/utils/storage'

// ============================================================================
// Constants
// ============================================================================

const RECENTLY_ONLINE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

export const useIdentityStore = defineStore('identity', () => {
  // === STATE ===
  const identities = ref<Map<string, Identity>>(new Map())
  const loaded = ref(false)

  // === GETTERS ===
  const identityList = computed(() => Array.from(identities.value.values()))
  const identityCount = computed(() => identities.value.size)

  /**
   * Get online identities
   */
  const onlineIdentities = computed(() =>
    identityList.value.filter(i => i.isOnline),
  )

  /**
   * Get identities with signer capabilities
   */
  const signerIdentities = computed(() =>
    identityList.value.filter(i => i.signerCapabilities?.available),
  )

  // === LOOKUP ACTIONS ===

  /**
   * Get an identity by public key
   */
  function get(publicKeyHex: string): Identity | undefined {
    const normalized = normalizePublicKey(publicKeyHex)
    return identities.value.get(normalized)
  }

  /**
   * Find an identity by address
   */
  function findByAddress(address: string): Identity | undefined {
    return identityList.value.find(i => i.address === address)
  }

  /**
   * Find an identity by peer ID
   */
  function findByPeerId(peerId: string): Identity | undefined {
    return identityList.value.find(i => i.peerId === peerId)
  }

  /**
   * Check if an identity exists
   */
  function has(publicKeyHex: string): boolean {
    const normalized = normalizePublicKey(publicKeyHex)
    return identities.value.has(normalized)
  }

  // === MUTATION ACTIONS ===

  /**
   * Find an existing identity or create a new one
   */
  function findOrCreate(
    publicKeyHex: string,
    network: 'livenet' | 'testnet' = 'livenet',
  ): Identity {
    if (!isValidPublicKey(publicKeyHex)) {
      throw new Error('Invalid public key format')
    }

    const normalized = normalizePublicKey(publicKeyHex)
    let identity = identities.value.get(normalized)

    if (!identity) {
      identity = createIdentity(normalized, network)
      identities.value.set(normalized, identity)
      save()
    }

    return identity
  }

  /**
   * Update an existing identity
   */
  function update(
    publicKeyHex: string,
    updates: IdentityUpdate,
  ): Identity | null {
    const normalized = normalizePublicKey(publicKeyHex)
    const identity = identities.value.get(normalized)

    if (!identity) {
      return null
    }

    const updated: Identity = {
      ...identity,
      ...updates,
      publicKeyHex: normalized, // Cannot change canonical ID
      address: identity.address, // Cannot change derived address
      createdAt: identity.createdAt, // Cannot change creation time
      updatedAt: Date.now(),
    }

    identities.value.set(normalized, updated)
    save()
    return updated
  }

  /**
   * Update presence status for an identity
   * Does not persist immediately (too frequent)
   */
  function updatePresence(
    publicKeyHex: string,
    presence: { isOnline: boolean; lastSeenAt?: number },
  ): void {
    const normalized = normalizePublicKey(publicKeyHex)
    const identity = identities.value.get(normalized)

    if (identity) {
      identity.isOnline = presence.isOnline
      if (presence.lastSeenAt) {
        identity.lastSeenAt = presence.lastSeenAt
      }
      identity.updatedAt = Date.now()
    }
  }

  /**
   * Update an identity from signer discovery data
   */
  function updateFromSigner(signer: {
    publicKeyHex: string
    peerId?: string
    multiaddrs?: string[]
    signerCapabilities?: IdentitySignerCapabilities
  }): Identity {
    const networkStore = useNetworkStore()
    const network = networkStore.currentNetwork as 'livenet' | 'testnet'
    const identity = findOrCreate(signer.publicKeyHex, network)

    if (signer.peerId) {
      identity.peerId = signer.peerId
    }
    if (signer.multiaddrs) {
      identity.multiaddrs = signer.multiaddrs
    }
    if (signer.signerCapabilities) {
      identity.signerCapabilities = signer.signerCapabilities
    }

    identity.isOnline = true
    identity.lastSeenAt = Date.now()
    identity.updatedAt = Date.now()

    save()
    return identity
  }

  /**
   * Mark an identity as offline
   */
  function markOffline(publicKeyHex: string): void {
    const normalized = normalizePublicKey(publicKeyHex)
    const identity = identities.value.get(normalized)

    if (identity) {
      identity.isOnline = false
      identity.updatedAt = Date.now()
      // Clear signer availability but keep capabilities
      if (identity.signerCapabilities) {
        identity.signerCapabilities.available = false
      }
    }
  }

  /**
   * Mark all identities as offline
   */
  function markAllOffline(): void {
    for (const identity of identities.value.values()) {
      identity.isOnline = false
      if (identity.signerCapabilities) {
        identity.signerCapabilities.available = false
      }
      identity.updatedAt = Date.now()
    }
  }

  // =========================================================================
  // Phase 2: Identity Consolidation - New Methods
  // =========================================================================

  /**
   * Get online status with multi-signal detection.
   * This is the canonical source for online status.
   */
  function getOnlineStatus(publicKeyHex: string): OnlineStatus {
    const normalized = normalizePublicKey(publicKeyHex)
    const identity = identities.value.get(normalized)

    if (!identity) return 'unknown'
    if (identity.isOnline) return 'online'

    if (identity.lastSeenAt) {
      if (Date.now() - identity.lastSeenAt < RECENTLY_ONLINE_THRESHOLD) {
        return 'recently_online'
      }
    }

    // Has P2P info but not online
    if (identity.peerId) {
      return 'offline'
    }

    return 'unknown'
  }

  /**
   * Update identity from P2P peer connection event.
   * Called by p2p.ts when a peer connects.
   */
  function updateFromPeerConnection(
    peerId: string,
    multiaddrs: string[],
  ): Identity | null {
    const identity = findByPeerId(peerId)
    if (!identity) return null

    identity.isOnline = true
    identity.lastSeenAt = Date.now()
    identity.multiaddrs = multiaddrs
    identity.updatedAt = Date.now()

    return identity
  }

  /**
   * Mark identity offline by peer ID.
   * Called by p2p.ts when a peer disconnects.
   */
  function markOfflineByPeerId(peerId: string): void {
    const identity = findByPeerId(peerId)
    if (identity) {
      identity.isOnline = false
      identity.updatedAt = Date.now()
      if (identity.signerCapabilities) {
        identity.signerCapabilities.available = false
      }
    }
  }

  /**
   * Update identity from MuSig2 signer discovery.
   * Called by musig2.ts when a signer is discovered.
   */
  function updateFromSignerDiscovery(signer: {
    publicKeyHex: string
    peerId?: string
    multiaddrs?: string[]
    nickname?: string
    capabilities?: {
      standardTx?: boolean
      rankVoting?: boolean
      tokenTx?: boolean
      opReturn?: boolean
    }
    responseTime?: number
    reputation?: number
  }): Identity {
    const networkStore = useNetworkStore()
    const network = networkStore.currentNetwork as 'livenet' | 'testnet'
    const identity = findOrCreate(signer.publicKeyHex, network)

    if (signer.peerId) identity.peerId = signer.peerId
    if (signer.multiaddrs) identity.multiaddrs = signer.multiaddrs

    if (signer.capabilities) {
      const transactionTypes: Array<'standard' | 'token' | 'nft' | 'any'> = []
      if (signer.capabilities.standardTx) transactionTypes.push('standard')
      if (signer.capabilities.tokenTx) transactionTypes.push('token')
      if (transactionTypes.length === 0) transactionTypes.push('any')

      identity.signerCapabilities = {
        transactionTypes,
        available: true,
      }
    }

    identity.isOnline = true
    identity.lastSeenAt = Date.now()
    identity.updatedAt = Date.now()

    save()
    return identity
  }

  /**
   * Batch update presence for multiple identities.
   * Called when presence data is received from DHT.
   */
  function batchUpdatePresence(
    updates: Array<{
      publicKeyHex: string
      isOnline: boolean
      lastSeenAt?: number
    }>,
  ): void {
    for (const update of updates) {
      updatePresence(update.publicKeyHex, update)
    }
  }

  /**
   * Remove an identity
   */
  function remove(publicKeyHex: string): boolean {
    const normalized = normalizePublicKey(publicKeyHex)
    const deleted = identities.value.delete(normalized)
    if (deleted) {
      save()
    }
    return deleted
  }

  /**
   * Clear all identities
   */
  function clear(): void {
    identities.value.clear()
    save()
  }

  // === PERSISTENCE ===

  /**
   * Save identities to localStorage
   */
  function save(): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      const data = Array.from(identities.value.entries())
      localStorage.setItem(STORAGE_KEYS.IDENTITIES, JSON.stringify(data))
    } catch (error) {
      console.error('[Identity Store] Failed to save:', error)
    }
  }

  /**
   * Load identities from localStorage
   */
  function load(): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    if (loaded.value) {
      return
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEYS.IDENTITIES)
      if (saved) {
        const entries = JSON.parse(saved) as [string, Identity][]
        identities.value = new Map(entries)
      }
      loaded.value = true
    } catch (error) {
      console.error('[Identity Store] Failed to load:', error)
      loaded.value = true
    }
  }

  // Initialize on creation
  load()

  return {
    // State
    identities,
    loaded,

    // Getters
    identityList,
    identityCount,
    onlineIdentities,
    signerIdentities,

    // Lookup
    get,
    findByAddress,
    findByPeerId,
    has,

    // Mutations
    findOrCreate,
    update,
    updatePresence,
    updateFromSigner,
    markOffline,
    markAllOffline,
    remove,
    clear,

    // Phase 2: Identity Consolidation
    getOnlineStatus,
    updateFromPeerConnection,
    markOfflineByPeerId,
    updateFromSignerDiscovery,
    batchUpdatePresence,

    // Persistence
    save,
    load,
  }
})
