/**
 * MuSig2 Store
 *
 * Manages MuSig2 multi-signature state, separated from p2p.ts.
 *
 * Access Pattern:
 * - Uses plugin getter functions for service access (NOT composables)
 * - Does NOT import SDK directly
 * - Passes SignerSigningContext to plugin functions that need wallet keys
 * - Manages application state, delegates to MuSig2 plugin for operations
 *
 * Responsibilities:
 * - MuSig2 service lifecycle management
 * - Signer discovery state
 * - Signer advertisement state
 * - Signing session state
 * - Shared wallet management
 *
 * Architecture:
 * - Store manages reactive state
 * - Service handles SDK interactions
 * - Events flow: SDK → Service → Store → UI
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useP2PStore } from './p2p'
import { useWalletStore } from './wallet'
import { useNetworkStore } from './network'
import { useNotificationStore } from './notifications'
import { useContactsStore } from './contacts'
import { useIdentityStore } from './identity'
import { usePeopleStore } from './people'
import { useServiceWorker } from '~/composables/useServiceWorker'
import { generateId } from '~/utils/helpers'
import { getItem, setItem, removeItem, STORAGE_KEYS } from '~/utils/storage'
import { getBitcore } from '~/plugins/bitcore.client'
import {
  initializeMuSig2,
  cleanupMuSig2,
  isMuSig2Initialized,
  hasDiscovery,
  startSignerAdvertising,
  stopSignerAdvertising,
  isCurrentlyAdvertising,
  discoverSigners as serviceDiscoverSigners,
  subscribeToSigners,
  unsubscribeFromSigners,
  createSigningSession,
  announceSession,
  joinSession as serviceJoinSession,
  getSession,
  getAllSessions,
  shareNonces,
  sharePartialSignature,
  canFinalizeSession,
  finalizeSession,
  abortSession as serviceAbortSession,
  subscribeToMuSig2Events,
  type SignerAdvertisingOptions,
  type SignerSearchCriteria,
  type SessionMetadata,
  type WalletSigningSession,
  type SignerSigningContext,
} from '~/plugins/05.musig2.client'
import { getDiscoveryCache } from '~/plugins/03.discovery-cache.client'

// ============================================================================
// Types (Store-specific, extending types/musig2.ts)
// ============================================================================

/**
 * Transaction types for UI display
 */
type TransactionType =
  | 'spend'
  | 'swap'
  | 'coinjoin'
  | 'custody'
  | 'escrow'
  | 'channel'

/**
 * Extended signer info with subscription state (store-specific)
 */
export interface StoreSigner extends DiscoveredSigner {
  /** Whether currently subscribed for updates */
  subscribed: boolean
  /** Reputation score (0-100) */
  reputation?: number
  /** Average response time in ms */
  responseTime?: number
}

/**
 * Signer configuration for advertising
 */
export interface SignerConfig {
  /** Display nickname */
  nickname: string
  /** Transaction types willing to sign */
  transactionTypes: TransactionType[]
  /** Amount range */
  amountRange?: { min?: number; max?: number }
  /** Fee for signing */
  fee?: number
}

// SharedWallet and SharedWalletParticipant types are now defined in types/people.ts
// and imported as PeopleSharedWallet and PeopleSharedWalletParticipant

/**
 * MuSig2 store state
 */
export interface MuSig2State {
  /** Whether initialized */
  initialized: boolean
  /** Error message */
  error: string | null
  /** Discovered signers (with subscription state) */
  discoveredSigners: StoreSigner[]
  /** Whether advertising as signer */
  signerEnabled: boolean
  /** My signer config */
  signerConfig: SignerConfig | null
  /** Active signing sessions (from service) */
  activeSessions: WalletSigningSession[]
  /** Loading state */
  loading: boolean
  /** Signer subscription ID */
  signerSubscriptionId: string | null
  /** Last error for retry support (Phase 6.3.1) */
  lastError: string | null
  /** Retryable operation for failed actions (Phase 6.3.1) */
  retryableOperation: (() => Promise<void>) | null
}

// ============================================================================
// Store Definition
// ============================================================================

export const useMuSig2Store = defineStore('musig2', () => {
  // === STATE ===
  const initialized = ref(false)
  const error = ref<string | null>(null)
  const discoveredSigners = ref<StoreSigner[]>([])
  const signerEnabled = ref(false)
  const signerConfig = ref<SignerConfig | null>(null)
  const activeSessions = ref<WalletSigningSession[]>([])
  const loading = ref(false)
  const signerSubscriptionId = ref<string | null>(null)
  const lastError = ref<string | null>(null)
  const retryableOperation = ref<(() => Promise<void>) | null>(null)

  // === GETTERS ===
  /**
   * Get online signers
   */
  const onlineSigners = computed((): StoreSigner[] => {
    return discoveredSigners.value.filter((s: StoreSigner) => s.isOnline)
  })

  /**
   * Get subscribed signers
   */
  const subscribedSigners = computed((): StoreSigner[] => {
    return discoveredSigners.value.filter((s: StoreSigner) => s.subscribed)
  })

  /**
   * Get pending sessions (waiting for participants)
   */
  const pendingSessions = computed((): WalletSigningSession[] => {
    return activeSessions.value.filter(
      (s: WalletSigningSession) => s.state === 'created',
    )
  })

  /**
   * Get active signing sessions (in progress)
   */
  const inProgressSessions = computed((): WalletSigningSession[] => {
    return activeSessions.value.filter(
      (s: WalletSigningSession) =>
        s.state === 'nonce_exchange' || s.state === 'signing',
    )
  })

  /**
   * Get completed sessions
   */
  const completedSessions = computed((): WalletSigningSession[] => {
    return activeSessions.value.filter(
      (s: WalletSigningSession) => s.state === 'completed',
    )
  })

  /**
   * Get shared wallets (delegated to peopleStore)
   */
  const sharedWallets = computed((): SharedWallet[] => {
    const peopleStore = usePeopleStore()
    return peopleStore.allWallets
  })

  /**
   * Get total shared wallet balance
   */
  const totalSharedBalance = computed((): bigint => {
    const peopleStore = usePeopleStore()
    return peopleStore.allWallets.reduce(
      (sum: bigint, w: SharedWallet) => sum + w.balanceSats,
      0n,
    )
  })

  /**
   * Check if ready for signing
   */
  const isReady = computed((): boolean => {
    const p2pStore = useP2PStore()
    return initialized.value && p2pStore.isFullyOperational
  })

  /**
   * Check if discovery is available
   */
  const hasDiscoveryLayer = computed((): boolean => {
    return hasDiscovery()
  })

  /**
   * Phase 10 R10.6.2: Available signers (excluding self)
   * Returns signers that are not the current user
   */
  const availableSigners = computed((): StoreSigner[] => {
    const p2pStore = useP2PStore()
    return discoveredSigners.value.filter(
      (s: StoreSigner) => s.peerId !== p2pStore.peerId,
    )
  })

  /**
   * Phase 10 R10.6.2: Pending request count for badge
   * Returns count of incoming signing requests (where we're not the initiator)
   */
  const pendingRequestCount = computed((): number => {
    return pendingSessions.value.filter(
      (s: WalletSigningSession) => !s.isInitiator,
    ).length
  })

  // === PARAMETERIZED GETTERS (as functions) ===
  /**
   * Phase 10 R10.6.1: Sessions filtered by wallet
   * Returns sessions for a specific wallet ID
   */
  function sessionsForWallet(walletId: string): WalletSigningSession[] {
    return activeSessions.value.filter(
      (s: WalletSigningSession) => s.metadata?.walletId === walletId,
    )
  }

  // === ACTIONS ===
  // ========================================================================
  // Initialization
  // ========================================================================

  /**
   * Initialize MuSig2 system
   * Initializes the MuSig2 service and sets up event handlers
   */
  async function initialize() {
    if (initialized.value) return

    const p2pStore = useP2PStore()
    if (!p2pStore.initialized) {
      throw new Error('P2P must be initialized before MuSig2')
    }

    loading.value = true
    error.value = null
    lastError.value = null
    retryableOperation.value = null

    try {
      // Load saved state from storage
      _loadSavedState()

      // Initialize the MuSig2 service with event callbacks
      await initializeMuSig2({
        onSignerDiscovered: (signer: DiscoveredSigner) => {
          _handleSignerDiscovered(signer)
        },
        onSessionCreated: (_sessionId: string) => {
          _syncSessionsFromService()
        },
        onSessionComplete: (_sessionId: string, _signature: Buffer) => {
          _syncSessionsFromService()
        },
        onSessionAborted: (_sessionId: string, _reason: string) => {
          _syncSessionsFromService()
        },
        onNonceReceived: () => {
          _syncSessionsFromService()
        },
        onPartialSigReceived: () => {
          _syncSessionsFromService()
        },
      })

      initialized.value = true
      console.log('[MuSig2 Store] Initialized')

      // Restore cached signers from discovery cache (Phase 3)
      _restoreCachedSigners()

      // Start periodic cleanup of expired signers (Phase 3)
      _startExpiryCleanupInterval()

      // START SIGNER SUBSCRIPTION AUTOMATICALLY (Phase 6.2.1)
      try {
        await startSignerSubscription()
        console.log('[MuSig2 Store] Signer subscription started')
      } catch (subError) {
        console.warn(
          '[MuSig2 Store] Failed to start signer subscription:',
          subError,
        )
      }

      // Restore signer advertisement if previously enabled (Phase 6.2.2)
      if (signerConfig.value) {
        try {
          await advertiseSigner(signerConfig.value)
          console.log('[MuSig2 Store] Restored signer advertisement')
        } catch (adError) {
          console.warn(
            '[MuSig2 Store] Failed to restore signer advertisement:',
            adError,
          )
        }
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to initialize MuSig2'
      lastError.value = error.value
      retryableOperation.value = () => initialize()
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Cleanup MuSig2 system
   */
  async function cleanup() {
    // Stop the expiry cleanup interval (Phase 3)
    _stopExpiryCleanupInterval()

    // Abort all active sessions via service
    for (const session of activeSessions.value) {
      if (session.state !== 'completed' && session.state !== 'failed') {
        try {
          await serviceAbortSession(session.id, 'Cleanup')
        } catch (e) {
          console.warn(`Failed to abort session ${session.id}:`, e)
        }
      }
    }

    // Withdraw signer advertisement
    if (signerEnabled.value) {
      await withdrawSigner()
    }

    // Cleanup the service
    await cleanupMuSig2()

    initialized.value = false
    activeSessions.value = []
    discoveredSigners.value = []
  }

  // ========================================================================
  // Signer Advertisement
  // ========================================================================

  /**
   * Advertise as a signer using the dedicated MuSig2 account key
   */
  async function advertiseSigner(config: SignerConfig) {
    if (!initialized.value) {
      throw new Error('MuSig2 not initialized')
    }

    const walletStore = useWalletStore()

    // Get MuSig2 signing context (private and public keys)
    const privateKeyHex = walletStore.getPrivateKeyHex(AccountPurpose.MUSIG2)
    const publicKeyHex = walletStore.getPublicKeyHex(AccountPurpose.MUSIG2)
    if (!privateKeyHex || !publicKeyHex) {
      throw new Error(
        'MuSig2 signing keys not available - wallet not initialized',
      )
    }

    const signingContext: SignerSigningContext = {
      privateKeyHex,
      publicKeyHex,
    }

    loading.value = true
    error.value = null
    lastError.value = null
    retryableOperation.value = null

    try {
      // Pass signing context to plugin for advertisement
      await startSignerAdvertising(signingContext, {
        transactionTypes: config.transactionTypes,
        amountRange: config.amountRange,
        metadata: {
          nickname: config.nickname,
          fee: config.fee,
        },
      })

      signerConfig.value = config
      signerEnabled.value = true
      _saveSignerConfig()
    } catch (err) {
      // Phase 6.3.1: Store error and retryable operation
      error.value = err instanceof Error ? err.message : 'Failed to advertise'
      lastError.value = error.value
      retryableOperation.value = () => advertiseSigner(config)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Withdraw signer advertisement
   */
  async function withdrawSigner() {
    if (!signerEnabled.value) return

    try {
      await stopSignerAdvertising()
      signerEnabled.value = false
      signerConfig.value = null
      removeItem(STORAGE_KEYS.MUSIG2_SIGNER_CONFIG)
    } catch (err) {
      console.error('Failed to withdraw signer:', err)
    }
  }

  // ========================================================================
  // Discovery
  // ========================================================================

  /**
   * Subscribe to a signer for updates
   */
  async function subscribeToSigner(signerId: string) {
    const signer = discoveredSigners.value.find(
      (s: StoreSigner) => s.id === signerId,
    )
    if (!signer) return

    signer.subscribed = true
  }

  /**
   * Unsubscribe from a signer
   */
  async function unsubscribeFromSigner(signerId: string) {
    const signer = discoveredSigners.value.find(
      (s: StoreSigner) => s.id === signerId,
    )
    if (!signer) return

    signer.subscribed = false
  }

  /**
   * Refresh discovered signers from the network
   */
  async function refreshSigners() {
    if (!initialized.value) return

    loading.value = true
    error.value = null
    lastError.value = null
    retryableOperation.value = null

    try {
      const signers = await serviceDiscoverSigners()

      // Merge with existing signers, preserving subscription state
      const existingMap = new Map(
        discoveredSigners.value.map((s: StoreSigner) => [s.id, s]),
      )

      discoveredSigners.value = signers.map(signer => ({
        ...signer,
        subscribed: existingMap.get(signer.id)?.subscribed ?? false,
        reputation: existingMap.get(signer.id)?.reputation,
        responseTime: existingMap.get(signer.id)?.responseTime,
      }))
    } catch (err) {
      // Phase 6.3.1: Store error and retryable operation
      error.value =
        err instanceof Error ? err.message : 'Failed to refresh signers'
      lastError.value = error.value
      retryableOperation.value = () => refreshSigners()
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Start real-time signer subscription
   */
  async function startSignerSubscription(criteria: SignerSearchCriteria = {}) {
    if (signerSubscriptionId.value) {
      await stopSignerSubscription()
    }

    signerSubscriptionId.value = await subscribeToSigners(
      criteria,
      (signer: DiscoveredSigner) => {
        _handleSignerDiscovered(signer)
      },
    )
  }

  /**
   * Stop real-time signer subscription
   */
  async function stopSignerSubscription() {
    if (signerSubscriptionId.value) {
      await unsubscribeFromSigners(signerSubscriptionId.value)
      signerSubscriptionId.value = null
    }
  }

  // ========================================================================
  // Sessions
  // ========================================================================

  /**
   * Sync sessions from service to store
   */
  function _syncSessionsFromService() {
    activeSessions.value = getAllSessions()
  }

  /**
   * Register a signing session with the service worker for background monitoring
   */
  function registerSessionWithSW(sessionId: string, expiresAt: Date) {
    if (import.meta.client) {
      const { registerSession } = useServiceWorker()
      registerSession({
        id: sessionId,
        type: 'musig2',
        expiresAt: expiresAt.getTime(),
        warningAt: expiresAt.getTime() - 60_000, // 1 min warning
        data: { sessionId },
      })
    }
  }

  /**
   * Unregister a session from SW monitoring
   */
  function unregisterSessionFromSW(sessionId: string) {
    if (import.meta.client) {
      const { unregisterSession } = useServiceWorker()
      unregisterSession(sessionId)
    }
  }

  /**
   * Handle session expiring warning from SW
   */
  function handleSessionExpiring(payload: {
    sessionId: string
    sessionType: string
    expiresIn: number
  }) {
    console.log(
      `[MuSig2 Store] Session ${payload.sessionId} expiring in ${Math.round(
        payload.expiresIn / 1000,
      )}s`,
    )
  }

  /**
   * Handle session expired notification from SW
   */
  function handleSessionExpired(payload: {
    sessionId: string
    sessionType: string
  }) {
    console.log(`[MuSig2 Store] Session ${payload.sessionId} expired`)
    // Sync sessions to reflect the expiry
    _syncSessionsFromService()
  }

  /**
   * Abort a session
   */
  async function abortSession(sessionId: string, reason: string) {
    // Unregister from SW first
    unregisterSessionFromSW(sessionId)
    await serviceAbortSession(sessionId, reason)
    _syncSessionsFromService()
  }

  // ========================================================================
  // Shared Wallets
  // ========================================================================

  /**
   * Create a shared wallet with MuSig2 key aggregation
   *
   * Uses Taproot-based MuSig2 for:
   * - Privacy: Multi-sig looks identical to single-sig on-chain
   * - Efficiency: ~78% smaller transaction size vs P2SH multisig
   * - Security: Proper MuSig2 key path spending with tweak handling
   *
   * MuSig2 is always n-of-n: all participants must sign.
   */
  async function createSharedWallet(config: {
    name: string
    description?: string
    participantPublicKeys: string[]
  }): Promise<SharedWallet> {
    // Wallet creation only requires Bitcore SDK, not full P2P initialization
    if (config.participantPublicKeys.length < 1) {
      throw new Error('Shared wallet requires at least 2 participants')
    }

    const Bitcore = getBitcore()
    if (!Bitcore) {
      throw new Error('Bitcore SDK not loaded')
    }

    const { createMuSigTaprootAddress, PublicKey } = Bitcore
    const networkStore = useNetworkStore()
    const walletStore = useWalletStore()
    const peopleStore = usePeopleStore()

    // Ensure peopleStore is initialized
    await peopleStore.initialize()

    // Get my MuSig2 public key (from dedicated MUSIG2 account)
    const myPublicKeyHex = walletStore.getPublicKeyHex(AccountPurpose.MUSIG2)
    if (!myPublicKeyHex) {
      throw new Error('MuSig2 key not available - wallet not initialized')
    }

    // Collect all participant public keys (including self)
    const allPublicKeyHexes = [...config.participantPublicKeys]
    if (!allPublicKeyHexes.includes(myPublicKeyHex)) {
      allPublicKeyHexes.push(myPublicKeyHex)
    }

    // MuSig2 is n-of-n: all participants must sign
    const participantCount = allPublicKeyHexes.length
    console.log(
      `[MuSig2 Store] Creating ${participantCount}-of-${participantCount} wallet`,
    )

    // Convert hex strings to PublicKey objects
    const publicKeys = allPublicKeyHexes.map(hex => new PublicKey(hex))

    let aggregatedKeyHex: string
    let sharedAddress: string

    try {
      // Create Taproot MuSig2 address using SDK
      const taprootResult = createMuSigTaprootAddress(
        publicKeys,
        networkStore.currentNetwork,
      )

      aggregatedKeyHex = taprootResult.commitment.toString()
      sharedAddress = taprootResult.address.toString()

      console.log('[MuSig2 Store] Created Taproot MuSig2 address:', {
        participants: publicKeys.length,
        address: sharedAddress.slice(0, 30) + '...',
      })
    } catch (err) {
      console.error('[MuSig2 Store] Key aggregation failed:', err)
      throw new Error(
        'Failed to aggregate public keys: ' + (err as Error).message,
      )
    }

    // Build participant list with Person ID resolution
    const participants: SharedWalletParticipant[] = allPublicKeyHexes.map(
      pubKeyHex => {
        const isMe = pubKeyHex === myPublicKeyHex

        // Try to resolve Person ID from peopleStore
        const person = peopleStore.getByPublicKey(pubKeyHex)

        return {
          personId: isMe ? 'self' : person?.id || '',
          publicKeyHex: pubKeyHex,
          isMe,
        }
      },
    )

    // Delegate wallet creation to peopleStore (single source of truth)
    const wallet = peopleStore.addSharedWallet({
      name: config.name,
      description: config.description,
      address: sharedAddress,
      aggregatedPublicKeyHex: aggregatedKeyHex,
      participants,
      threshold: participantCount, // MuSig2 is always n-of-n
      balanceSats: 0n,
      transactionCount: 0,
      status: 'active',
    })

    console.log('[MuSig2 Store] Created shared wallet via peopleStore:', {
      id: wallet.id,
      name: config.name,
      participants: participants.length,
      address: sharedAddress.slice(0, 30) + '...',
    })

    return wallet
  }

  /**
   * Remove a shared wallet (delegated to peopleStore)
   */
  function removeSharedWallet(walletId: string) {
    const peopleStore = usePeopleStore()
    peopleStore.removeSharedWallet(walletId)
  }

  /**
   * Delete a shared wallet (alias for removeSharedWallet)
   */
  function deleteSharedWallet(walletId: string) {
    removeSharedWallet(walletId)
  }

  /**
   * Refresh shared wallet balances from Chronik
   */
  async function refreshSharedWalletBalances() {
    // TODO: Implement actual balance fetching via Chronik service
    loading.value = true
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
    } finally {
      loading.value = false
    }
  }

  // ========================================================================
  // Internal Methods
  // ========================================================================

  /**
   * Handle discovered signer from service
   *
   * Deduplicates by publicKey (not by id) to handle re-advertisements.
   */
  function _handleSignerDiscovered(signer: DiscoveredSigner) {
    // Deduplicate by publicKey (not by id)
    const existingIndex = discoveredSigners.value.findIndex(
      (s: StoreSigner) => s.publicKey === signer.publicKey,
    )

    if (existingIndex >= 0) {
      const existing = discoveredSigners.value[existingIndex]

      // Only update if newer advertisement (use discoveredAt as timestamp)
      if (signer.discoveredAt > (existing.discoveredAt || 0)) {
        console.log(
          '[MuSig2 Store] Updating existing signer:',
          signer.publicKey.slice(0, 16) + '...',
        )

        discoveredSigners.value[existingIndex] = {
          ...signer,
          subscribed: existing.subscribed,
          reputation: existing.reputation,
          responseTime: existing.responseTime,
        }
      }
    } else {
      console.log(
        '[MuSig2 Store] Discovered new signer:',
        signer.publicKey.slice(0, 16) + '...',
      )

      discoveredSigners.value.push({
        ...signer,
        subscribed: false,
      })
    }

    // Phase 2: Update identity store with signer discovery
    const identityStore = useIdentityStore()
    identityStore.updateFromSignerDiscovery({
      publicKeyHex: signer.publicKey,
      peerId: signer.peerId,
      nickname: signer.nickname,
      capabilities: signer.capabilities,
    })

    // Cleanup expired signers after each discovery
    _cleanupExpiredSigners()

    // Update the discovery cache
    _updateDiscoveryCache(signer)
  }

  /**
   * Remove expired signers from the list
   */
  function _cleanupExpiredSigners() {
    const now = Date.now()
    const EXPIRY_THRESHOLD = 30 * 60 * 1000 // 30 minutes
    const before = discoveredSigners.value.length

    discoveredSigners.value = discoveredSigners.value.filter(
      (s: StoreSigner) => {
        // Keep online signers
        if (s.isOnline) return true

        // Remove signers not seen in the last 30 minutes
        if (s.lastSeen && now - s.lastSeen > EXPIRY_THRESHOLD) {
          console.log(
            '[MuSig2 Store] Removing expired signer:',
            s.publicKey.slice(0, 16) + '...',
          )
          return false
        }
        return true
      },
    )

    const removed = before - discoveredSigners.value.length
    if (removed > 0) {
      console.log(`[MuSig2 Store] Cleaned up ${removed} expired signers`)
    }
  }

  /**
   * Update the discovery cache with a signer
   */
  function _updateDiscoveryCache(signer: DiscoveredSigner) {
    try {
      const cache = getDiscoveryCache()

      cache.upsert({
        id: signer.id,
        peerId: signer.peerId,
        publicKey: signer.publicKey,
        walletAddress: signer.walletAddress,
        nickname: signer.nickname,
        createdAt: signer.discoveredAt,
        expiresAt: signer.lastSeen + 30 * 60 * 1000, // 30 min from last seen
        addedAt: Date.now(),
        lastAccess: Date.now(),
        accessCount: 1,
        source: 'gossipsub',
      })
    } catch (err) {
      // Cache update is non-critical, just log
      console.warn('[MuSig2 Store] Failed to update discovery cache:', err)
    }
  }

  /**
   * Restore cached signers from the discovery cache
   */
  function _restoreCachedSigners() {
    try {
      const cache = getDiscoveryCache()

      const cachedSigners = cache.getValidSigners()
      console.log(
        `[MuSig2 Store] Restoring ${cachedSigners.length} cached signers`,
      )

      for (const cached of cachedSigners) {
        // Check if already in discovered signers
        const exists = discoveredSigners.value.some(
          (s: StoreSigner) => s.publicKey === cached.publicKey,
        )

        if (!exists) {
          // Convert cached signer to DiscoveredSigner format
          discoveredSigners.value.push({
            id: cached.id,
            peerId: cached.peerId,
            publicKey: cached.publicKey,
            walletAddress: cached.walletAddress || '',
            nickname: cached.nickname,
            avatar: undefined,
            capabilities: {
              standardTx: true,
              rankVoting: false,
              tokenTx: false,
              opReturn: false,
            },
            discoveredAt: cached.createdAt,
            lastSeen: cached.lastAccess,
            isOnline: false, // Cached signers start as offline until we hear from them
            subscribed: false,
          })
        }
      }
    } catch (err) {
      console.warn('[MuSig2 Store] Failed to restore cached signers:', err)
    }
  }

  /**
   * Start periodic cleanup of expired signers
   */
  function _startExpiryCleanupInterval() {
    // Run cleanup every 5 minutes
    const CLEANUP_INTERVAL = 5 * 60 * 1000

    // Store interval ID on the store for cleanup
    if (typeof window !== 'undefined') {
      // Clear any existing interval
      const existingInterval = (window as unknown as Record<string, unknown>)
        .__musig2CleanupInterval as ReturnType<typeof setInterval> | undefined
      if (existingInterval) {
        clearInterval(existingInterval)
      }

      // Start new interval
      const intervalId = setInterval(() => {
        _cleanupExpiredSigners()
      }, CLEANUP_INTERVAL)

      ;(window as unknown as Record<string, unknown>).__musig2CleanupInterval =
        intervalId

      console.log('[MuSig2 Store] Started expiry cleanup interval')
    }
  }

  /**
   * Stop the expiry cleanup interval
   */
  function _stopExpiryCleanupInterval() {
    if (typeof window !== 'undefined') {
      const intervalId = (window as unknown as Record<string, unknown>)
        .__musig2CleanupInterval as ReturnType<typeof setInterval> | undefined
      if (intervalId) {
        clearInterval(intervalId)
        ;(
          window as unknown as Record<string, unknown>
        ).__musig2CleanupInterval = undefined
        console.log('[MuSig2 Store] Stopped expiry cleanup interval')
      }
    }
  }

  /**
   * Load saved state from storage service
   */
  function _loadSavedState() {
    // Load signer config
    const savedConfig = getItem<SignerConfig | null>(
      STORAGE_KEYS.MUSIG2_SIGNER_CONFIG,
      null,
    )
    if (savedConfig) {
      signerConfig.value = savedConfig
      // Note: signerEnabled will be set when we actually advertise
    }
  }

  /**
   * Save signer config to storage service
   */
  function _saveSignerConfig() {
    if (signerConfig.value) {
      setItem(STORAGE_KEYS.MUSIG2_SIGNER_CONFIG, signerConfig.value)
    }
  }

  /**
   * Retry the last failed operation (Phase 6.3.1)
   */
  async function retryLastOperation() {
    if (retryableOperation.value) {
      error.value = null
      lastError.value = null
      try {
        await retryableOperation.value()
        retryableOperation.value = null
      } catch (err) {
        // Error handling is done in the retried operation itself
        console.error('[MuSig2 Store] Retry failed:', err)
      }
    }
  }

  /**
   * Clear the last error and retryable operation
   */
  function clearError() {
    error.value = null
    lastError.value = null
    retryableOperation.value = null
  }

  /**
   * Check if there's a retryable operation available
   */
  function hasRetryableOperation(): boolean {
    return retryableOperation.value !== null
  }

  // ========================================================================
  // Signing Request Actions (Phase 6)
  // ========================================================================

  /**
   * Propose a spend from a shared wallet
   */
  async function proposeSpend(params: {
    walletId: string
    recipient: string
    amount: bigint
    fee: bigint
    purpose?: string
  }): Promise<{ sessionId: string }> {
    const wallet = sharedWallets.value.find(w => w.id === params.walletId)
    if (!wallet) {
      throw new Error('Shared wallet not found')
    }

    const sessionId = generateId('session')

    // TODO: Create actual signing session via service
    // For now, register with SW for monitoring
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 min timeout
    registerSessionWithSW(sessionId, expiresAt)

    // Notify other participants
    _notifySpendProposed(wallet, params.purpose)

    return { sessionId }
  }

  /**
   * Accept an incoming signing request
   */
  async function acceptRequest(requestId: string) {
    // TODO: Implement actual request acceptance via service
    console.log('[MuSig2 Store] Accepting request:', requestId)

    // Notify requester of acceptance
    _notifyRequestAccepted(requestId)

    _syncSessionsFromService()
  }

  /**
   * Reject an incoming signing request
   */
  async function rejectRequest(requestId: string) {
    // TODO: Implement actual request rejection via service
    console.log('[MuSig2 Store] Rejecting request:', requestId)

    // Notify requester of rejection
    _notifyRequestRejected(requestId)

    _syncSessionsFromService()
  }

  /**
   * Cancel an outgoing signing request
   */
  async function cancelRequest(requestId: string) {
    await abortSession(requestId, 'Cancelled by sender')
  }

  // ========================================================================
  // Notification Helpers (Phase 6.3)
  // ========================================================================

  /**
   * Get display name for a peer
   */
  function _getPeerDisplayName(peerId: string): string {
    const contactsStore = useContactsStore()
    const contact = contactsStore.contacts.find(c => c.peerId === peerId)
    if (contact) return contact.name
    return `${peerId.slice(0, 8)}...`
  }

  /**
   * Notify when a signing request is received
   */
  function notifyIncomingRequest(request: {
    id: string
    fromPeerId: string
    walletId?: string
  }) {
    const notificationStore = useNotificationStore()
    const fromName = _getPeerDisplayName(request.fromPeerId)

    notificationStore.addNotification({
      type: 'signing_request',
      title: 'Signing Request',
      message: `${fromName} is requesting your signature`,
      actionUrl: '/people/p2p?tab=requests',
      actionLabel: 'View Request',
      data: { requestId: request.id, fromPeerId: request.fromPeerId },
    })
  }

  /**
   * Notify when a signing session is completed
   */
  function notifySessionComplete(session: { id: string; txid?: string }) {
    const notificationStore = useNotificationStore()

    notificationStore.addNotification({
      type: 'signing_request',
      title: 'Signing Complete',
      message: 'Transaction signed and broadcast successfully',
      actionUrl: session.txid
        ? `/explore/explorer/tx/${session.txid}`
        : '/people/p2p?tab=sessions',
      actionLabel: session.txid ? 'View Transaction' : 'View Sessions',
      data: { sessionId: session.id, txid: session.txid },
    })

    // Unregister from SW monitoring
    unregisterSessionFromSW(session.id)
  }

  /**
   * Notify when a shared wallet is created
   */
  function notifyWalletCreated(wallet: SharedWallet) {
    const notificationStore = useNotificationStore()

    notificationStore.addNotification({
      type: 'system',
      title: 'Shared Wallet Created',
      message: `"${wallet.name}" is ready to use`,
      actionUrl: `/people/wallets/${wallet.id}`,
      actionLabel: 'View Wallet',
      data: { walletId: wallet.id },
    })
  }

  /**
   * Notify when a shared wallet receives funds
   */
  function notifyWalletFunded(wallet: SharedWallet, amount: bigint) {
    const notificationStore = useNotificationStore()

    notificationStore.addNotification({
      type: 'transaction',
      title: 'Shared Wallet Funded',
      message: `Received funds in "${wallet.name}"`,
      actionUrl: `/people/wallets/${wallet.id}`,
      actionLabel: 'View Wallet',
      data: { walletId: wallet.id, amount: amount.toString() },
    })
  }

  /**
   * Internal: Notify when spend is proposed
   */
  function _notifySpendProposed(wallet: SharedWallet, purpose?: string) {
    const notificationStore = useNotificationStore()

    notificationStore.addNotification({
      type: 'signing_request',
      title: 'Spend Proposed',
      message: purpose
        ? `Spend proposed from "${wallet.name}": ${purpose}`
        : `Spend proposed from "${wallet.name}"`,
      actionUrl: `/people/wallets/${wallet.id}`,
      actionLabel: 'Review',
      data: { walletId: wallet.id },
    })
  }

  /**
   * Internal: Notify when request is accepted
   */
  function _notifyRequestAccepted(requestId: string) {
    const notificationStore = useNotificationStore()

    notificationStore.addNotification({
      type: 'signing_request',
      title: 'Request Accepted',
      message: 'A participant has accepted your signing request',
      actionUrl: '/people/p2p?tab=sessions',
      actionLabel: 'View Session',
      data: { requestId },
    })
  }

  /**
   * Internal: Notify when request is rejected
   */
  function _notifyRequestRejected(requestId: string) {
    const notificationStore = useNotificationStore()

    notificationStore.addNotification({
      type: 'signing_request',
      title: 'Request Rejected',
      message: 'A participant has rejected your signing request',
      actionUrl: '/people/p2p?tab=requests',
      actionLabel: 'View Details',
      data: { requestId },
    })
  }

  // ========================================================================
  // Phase 4: Session Connectivity Management
  // ========================================================================

  /**
   * Update participant connection status in a session
   */
  function updateSessionParticipantStatus(
    sessionId: string,
    peerId: string,
    status: 'connected' | 'disconnected' | 'connecting',
  ): void {
    const sessionIndex = activeSessions.value.findIndex(s => s.id === sessionId)
    if (sessionIndex < 0) return

    const session = activeSessions.value[sessionIndex]
    const participantIndex = session.participants.findIndex(
      p => p.peerId === peerId,
    )
    if (participantIndex < 0) return

    // Create updated participant with connection status
    const updatedParticipant = {
      ...session.participants[participantIndex],
      connectionStatus: status,
    }

    // Create updated session with new participant
    const updatedSession = {
      ...session,
      participants: [
        ...session.participants.slice(0, participantIndex),
        updatedParticipant,
        ...session.participants.slice(participantIndex + 1),
      ],
    }

    // Update the session in the array
    activeSessions.value = [
      ...activeSessions.value.slice(0, sessionIndex),
      updatedSession,
      ...activeSessions.value.slice(sessionIndex + 1),
    ]
  }

  /**
   * Get session with participant connection info
   */
  function getSessionWithConnectivity(
    sessionId: string,
  ): WalletSigningSession | null {
    const session = activeSessions.value.find(s => s.id === sessionId)
    if (!session) return null

    const p2pStore = useP2PStore()

    const participantsWithConnectivity = session.participants.map(p => {
      const peer = p2pStore.onlinePeers.find(op => op.peerId === p.peerId)
      return {
        ...p,
        connectionStatus: peer?.connectionStatus || 'disconnected',
        connectionType: peer?.connectionType,
      }
    })

    return {
      ...session,
      participants: participantsWithConnectivity,
    }
  }

  /**
   * Check if all participants in a session are connected
   */
  function areAllParticipantsConnected(sessionId: string): boolean {
    const session = getSessionWithConnectivity(sessionId)
    if (!session) return false

    const p2pStore = useP2PStore()

    return session.participants.every(
      p =>
        p.peerId === p2pStore.peerId ||
        (p as { connectionStatus?: string }).connectionStatus === 'connected',
    )
  }

  /**
   * Get disconnected participants for a session
   */
  function getDisconnectedParticipants(sessionId: string): string[] {
    const session = getSessionWithConnectivity(sessionId)
    if (!session) return []

    const p2pStore = useP2PStore()

    return session.participants
      .filter(
        p =>
          p.peerId !== p2pStore.peerId &&
          (p as { connectionStatus?: string }).connectionStatus !== 'connected',
      )
      .map(p => p.peerId)
  }

  // ========================================================================
  // Return all state, getters, and actions
  // ========================================================================
  return {
    // State
    initialized,
    error,
    discoveredSigners,
    signerEnabled,
    signerConfig,
    activeSessions,
    loading,
    signerSubscriptionId,
    lastError,
    retryableOperation,

    // Getters
    onlineSigners,
    subscribedSigners,
    pendingSessions,
    inProgressSessions,
    completedSessions,
    sharedWallets,
    totalSharedBalance,
    isReady,
    hasDiscoveryLayer,
    availableSigners,
    pendingRequestCount,

    // Parameterized getters (functions)
    sessionsForWallet,

    // Actions
    initialize,
    cleanup,
    advertiseSigner,
    withdrawSigner,
    subscribeToSigner,
    unsubscribeFromSigner,
    refreshSigners,
    startSignerSubscription,
    stopSignerSubscription,
    registerSessionWithSW,
    unregisterSessionFromSW,
    handleSessionExpiring,
    handleSessionExpired,
    abortSession,
    createSharedWallet,
    removeSharedWallet,
    deleteSharedWallet,
    refreshSharedWalletBalances,
    retryLastOperation,
    clearError,
    hasRetryableOperation,
    proposeSpend,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    notifyIncomingRequest,
    notifySessionComplete,
    notifyWalletCreated,
    notifyWalletFunded,
    updateSessionParticipantStatus,
    getSessionWithConnectivity,
    areAllParticipantsConnected,
    getDisconnectedParticipants,
  }
})
