/**
 * MuSig2 Store
 *
 * Manages MuSig2 multi-signature state, separated from p2p.ts.
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
import { defineStore } from 'pinia'
import { useP2PStore } from './p2p'
import { useWalletStore } from './wallet'
import { useNetworkStore } from './network'
import { useNotificationStore } from './notifications'
import { useContactsStore } from './contacts'
import { useIdentityStore } from './identity'
import { useServiceWorker } from '~/composables/useServiceWorker'
import { generateId } from '~/utils/helpers'
import { getItem, setItem, removeItem, STORAGE_KEYS } from '~/utils/storage'
import { getBitcore } from '~/plugins/bitcore.client'
import { AccountPurpose } from '~/types/accounts'
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
} from '~/plugins/05.musig2.client'
import type { DiscoveredSigner } from '~/types/musig2'
import { getDiscoveryCache } from '~/plugins/03.discovery-cache.client'

// ============================================================================
// Types (Store-specific, extending types/musig2.ts)
// ============================================================================

/**
 * Transaction types for UI display
 */
export type TransactionType =
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

/**
 * Shared wallet participant
 */
export interface SharedWalletParticipant {
  /** Peer ID */
  peerId: string
  /** Public key hex */
  publicKeyHex: string
  /** Nickname */
  nickname?: string
  /** Whether this is me */
  isMe: boolean
}

/**
 * Shared wallet (MuSig2 aggregate key)
 */
export interface SharedWallet {
  /** Wallet ID */
  id: string
  /** Display name */
  name: string
  /** Description */
  description?: string
  /** Participants */
  participants: SharedWalletParticipant[]
  /** Aggregated public key hex */
  aggregatedPublicKeyHex: string
  /** Shared address */
  sharedAddress: string
  /** Current balance in satoshis */
  balanceSats: string
  /** Created timestamp */
  createdAt: number
}

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
  /** Shared wallets */
  sharedWallets: SharedWallet[]
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

export const useMuSig2Store = defineStore('musig2', {
  state: (): MuSig2State => ({
    initialized: false,
    error: null,
    discoveredSigners: [],
    signerEnabled: false,
    signerConfig: null,
    activeSessions: [],
    sharedWallets: [],
    loading: false,
    signerSubscriptionId: null,
    lastError: null,
    retryableOperation: null,
  }),

  getters: {
    /**
     * Get online signers
     */
    onlineSigners(): StoreSigner[] {
      return this.discoveredSigners.filter((s: StoreSigner) => s.isOnline)
    },

    /**
     * Get subscribed signers
     */
    subscribedSigners(): StoreSigner[] {
      return this.discoveredSigners.filter((s: StoreSigner) => s.subscribed)
    },

    /**
     * Get pending sessions (waiting for participants)
     */
    pendingSessions(): WalletSigningSession[] {
      return this.activeSessions.filter(
        (s: WalletSigningSession) => s.state === 'created',
      )
    },

    /**
     * Get active signing sessions (in progress)
     */
    inProgressSessions(): WalletSigningSession[] {
      return this.activeSessions.filter(
        (s: WalletSigningSession) =>
          s.state === 'nonce_exchange' || s.state === 'signing',
      )
    },

    /**
     * Get completed sessions
     */
    completedSessions(): WalletSigningSession[] {
      return this.activeSessions.filter(
        (s: WalletSigningSession) => s.state === 'completed',
      )
    },

    /**
     * Get total shared wallet balance
     */
    totalSharedBalance(): bigint {
      return this.sharedWallets.reduce(
        (sum, w) => sum + BigInt(w.balanceSats),
        0n,
      )
    },

    /**
     * Check if ready for signing
     */
    isReady(): boolean {
      const p2pStore = useP2PStore()
      return this.initialized && p2pStore.isFullyOperational
    },

    /**
     * Check if discovery is available
     */
    hasDiscoveryLayer(): boolean {
      return hasDiscovery()
    },

    /**
     * Phase 10 R10.6.1: Sessions filtered by wallet
     * Returns a function that filters sessions by wallet ID
     */
    sessionsForWallet(): (walletId: string) => WalletSigningSession[] {
      return (walletId: string) => {
        return this.activeSessions.filter(
          (s: WalletSigningSession) => s.metadata?.walletId === walletId,
        )
      }
    },

    /**
     * Phase 10 R10.6.2: Available signers (excluding self)
     * Returns signers that are not the current user
     */
    availableSigners(): StoreSigner[] {
      const p2pStore = useP2PStore()
      return this.discoveredSigners.filter(
        (s: StoreSigner) => s.peerId !== p2pStore.peerId,
      )
    },

    /**
     * Phase 10 R10.6.2: Pending request count for badge
     * Returns count of incoming signing requests (where we're not the initiator)
     */
    pendingRequestCount(): number {
      return this.pendingSessions.filter(
        (s: WalletSigningSession) => !s.isInitiator,
      ).length
    },
  },

  actions: {
    // ========================================================================
    // Initialization
    // ========================================================================

    /**
     * Initialize MuSig2 system
     * Initializes the MuSig2 service and sets up event handlers
     */
    async initialize() {
      if (this.initialized) return

      const p2pStore = useP2PStore()
      if (!p2pStore.initialized) {
        throw new Error('P2P must be initialized before MuSig2')
      }

      this.loading = true
      this.error = null
      this.lastError = null
      this.retryableOperation = null

      try {
        // Load saved state from storage
        this._loadSavedState()

        // Initialize the MuSig2 service with event callbacks
        // Discovery config is optional - service uses sensible defaults
        await initializeMuSig2(
          {
            onSignerDiscovered: (signer: DiscoveredSigner) => {
              this._handleSignerDiscovered(signer)
            },
            onSessionCreated: (sessionId: string) => {
              this._syncSessionsFromService()
            },
            onSessionComplete: (sessionId: string, _signature: Buffer) => {
              this._syncSessionsFromService()
            },
            onSessionAborted: (sessionId: string, _reason: string) => {
              this._syncSessionsFromService()
            },
            onNonceReceived: () => {
              this._syncSessionsFromService()
            },
            onPartialSigReceived: () => {
              this._syncSessionsFromService()
            },
          },
          // Use default discovery config from service
          // Can override specific values here if needed:
          // { signerTTL: 60 * 60 * 1000 } // 1 hour TTL
        )

        this.initialized = true
        console.log('[MuSig2 Store] Initialized')

        // Restore cached signers from discovery cache (Phase 3)
        this._restoreCachedSigners()

        // Start periodic cleanup of expired signers (Phase 3)
        this._startExpiryCleanupInterval()

        // START SIGNER SUBSCRIPTION AUTOMATICALLY (Phase 6.2.1)
        try {
          await this.startSignerSubscription()
          console.log('[MuSig2 Store] Signer subscription started')
        } catch (subError) {
          console.warn(
            '[MuSig2 Store] Failed to start signer subscription:',
            subError,
          )
        }

        // Restore signer advertisement if previously enabled (Phase 6.2.2)
        if (this.signerConfig) {
          try {
            await this.advertiseSigner(this.signerConfig)
            console.log('[MuSig2 Store] Restored signer advertisement')
          } catch (adError) {
            console.warn(
              '[MuSig2 Store] Failed to restore signer advertisement:',
              adError,
            )
          }
        }
      } catch (error) {
        this.error =
          error instanceof Error ? error.message : 'Failed to initialize MuSig2'
        this.lastError = this.error
        this.retryableOperation = () => this.initialize()
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Cleanup MuSig2 system
     */
    async cleanup() {
      // Stop the expiry cleanup interval (Phase 3)
      this._stopExpiryCleanupInterval()

      // Abort all active sessions via service
      for (const session of this.activeSessions) {
        if (session.state !== 'completed' && session.state !== 'failed') {
          try {
            await serviceAbortSession(session.id, 'Cleanup')
          } catch (e) {
            console.warn(`Failed to abort session ${session.id}:`, e)
          }
        }
      }

      // Withdraw signer advertisement
      if (this.signerEnabled) {
        await this.withdrawSigner()
      }

      // Cleanup the service
      await cleanupMuSig2()

      this.initialized = false
      this.activeSessions = []
      this.discoveredSigners = []
    },

    // ========================================================================
    // Signer Advertisement
    // ========================================================================

    /**
     * Advertise as a signer using the dedicated MuSig2 account key
     */
    async advertiseSigner(config: SignerConfig) {
      if (!this.initialized) {
        throw new Error('MuSig2 not initialized')
      }

      const walletStore = useWalletStore()

      // Phase 5: Use MuSig2 account key (not primary wallet key)
      const publicKeyHex = walletStore.getPublicKeyHex(AccountPurpose.MUSIG2)
      if (!publicKeyHex) {
        throw new Error(
          'MuSig2 public key not available - wallet not initialized',
        )
      }

      this.loading = true
      this.error = null
      this.lastError = null
      this.retryableOperation = null

      try {
        // Service uses MuSig2 key internally (publicKeyHex is for logging only)
        await startSignerAdvertising(publicKeyHex, {
          transactionTypes: config.transactionTypes,
          amountRange: config.amountRange,
          metadata: {
            nickname: config.nickname,
            fee: config.fee,
          },
        })

        this.signerConfig = config
        this.signerEnabled = true
        this._saveSignerConfig()
      } catch (error) {
        // Phase 6.3.1: Store error and retryable operation
        this.error =
          error instanceof Error ? error.message : 'Failed to advertise'
        this.lastError = this.error
        this.retryableOperation = () => this.advertiseSigner(config)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Withdraw signer advertisement
     */
    async withdrawSigner() {
      if (!this.signerEnabled) return

      try {
        await stopSignerAdvertising()
        this.signerEnabled = false
        this.signerConfig = null
        removeItem(STORAGE_KEYS.MUSIG2_SIGNER_CONFIG)
      } catch (error) {
        console.error('Failed to withdraw signer:', error)
      }
    },

    // ========================================================================
    // Discovery
    // ========================================================================

    /**
     * Subscribe to a signer for updates
     */
    async subscribeToSigner(signerId: string) {
      const signer = this.discoveredSigners.find(
        (s: StoreSigner) => s.id === signerId,
      )
      if (!signer) return

      signer.subscribed = true
    },

    /**
     * Unsubscribe from a signer
     */
    async unsubscribeFromSigner(signerId: string) {
      const signer = this.discoveredSigners.find(
        (s: StoreSigner) => s.id === signerId,
      )
      if (!signer) return

      signer.subscribed = false
    },

    /**
     * Refresh discovered signers from the network
     */
    async refreshSigners() {
      if (!this.initialized) return

      this.loading = true
      this.error = null
      this.lastError = null
      this.retryableOperation = null

      try {
        const signers = await serviceDiscoverSigners()

        // Merge with existing signers, preserving subscription state
        const existingMap = new Map(
          this.discoveredSigners.map((s: StoreSigner) => [s.id, s]),
        )

        this.discoveredSigners = signers.map(signer => ({
          ...signer,
          subscribed: existingMap.get(signer.id)?.subscribed ?? false,
          reputation: existingMap.get(signer.id)?.reputation,
          responseTime: existingMap.get(signer.id)?.responseTime,
        }))
      } catch (error) {
        // Phase 6.3.1: Store error and retryable operation
        this.error =
          error instanceof Error ? error.message : 'Failed to refresh signers'
        this.lastError = this.error
        this.retryableOperation = () => this.refreshSigners()
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Start real-time signer subscription
     */
    async startSignerSubscription(criteria: SignerSearchCriteria = {}) {
      if (this.signerSubscriptionId) {
        await this.stopSignerSubscription()
      }

      this.signerSubscriptionId = await subscribeToSigners(
        criteria,
        (signer: DiscoveredSigner) => {
          this._handleSignerDiscovered(signer)
        },
      )
    },

    /**
     * Stop real-time signer subscription
     */
    async stopSignerSubscription() {
      if (this.signerSubscriptionId) {
        await unsubscribeFromSigners(this.signerSubscriptionId)
        this.signerSubscriptionId = null
      }
    },

    // ========================================================================
    // Sessions
    // ========================================================================

    /**
     * Sync sessions from service to store
     */
    _syncSessionsFromService() {
      this.activeSessions = getAllSessions()
    },

    /**
     * Register a signing session with the service worker for background monitoring
     */
    registerSessionWithSW(sessionId: string, expiresAt: Date) {
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
    },

    /**
     * Unregister a session from SW monitoring
     */
    unregisterSessionFromSW(sessionId: string) {
      if (import.meta.client) {
        const { unregisterSession } = useServiceWorker()
        unregisterSession(sessionId)
      }
    },

    /**
     * Handle session expiring warning from SW
     */
    handleSessionExpiring(payload: {
      sessionId: string
      sessionType: string
      expiresIn: number
    }) {
      console.log(
        `[MuSig2 Store] Session ${payload.sessionId} expiring in ${Math.round(
          payload.expiresIn / 1000,
        )}s`,
      )
      // Could trigger a notification or UI update here
    },

    /**
     * Handle session expired notification from SW
     */
    handleSessionExpired(payload: { sessionId: string; sessionType: string }) {
      console.log(`[MuSig2 Store] Session ${payload.sessionId} expired`)
      // Sync sessions to reflect the expiry
      this._syncSessionsFromService()
    },

    /**
     * Abort a session
     */
    async abortSession(sessionId: string, reason: string) {
      // Unregister from SW first
      this.unregisterSessionFromSW(sessionId)
      await serviceAbortSession(sessionId, reason)
      this._syncSessionsFromService()
    },

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
     *
     * @param config.name - Display name for the wallet
     * @param config.description - Optional description
     * @param config.participantPublicKeys - Public keys of other participants (not including self)
     */
    async createSharedWallet(config: {
      name: string
      description?: string
      participantPublicKeys: string[]
    }): Promise<SharedWallet> {
      if (!this.initialized) {
        throw new Error('MuSig2 not initialized')
      }

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
      const contactsStore = useContactsStore()

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
      } catch (error) {
        console.error('[MuSig2 Store] Key aggregation failed:', error)
        throw new Error(
          'Failed to aggregate public keys: ' + (error as Error).message,
        )
      }

      // Build participant list with contact resolution
      const participants: SharedWalletParticipant[] = allPublicKeyHexes.map(
        pubKeyHex => {
          const isMe = pubKeyHex === myPublicKeyHex

          // Try to resolve contact info
          const contact = contactsStore.findByPublicKey(pubKeyHex)

          return {
            peerId: contact?.peerId || '',
            publicKeyHex: pubKeyHex,
            nickname: isMe ? undefined : contact?.name,
            isMe,
          }
        },
      )

      // Create wallet with computed address
      const walletId = generateId('wallet')
      const wallet: SharedWallet = {
        id: walletId,
        name: config.name,
        description: config.description,
        participants,
        aggregatedPublicKeyHex: aggregatedKeyHex,
        sharedAddress,
        balanceSats: '0',
        createdAt: Date.now(),
      }

      this.sharedWallets.push(wallet)
      this._saveSharedWallets()

      console.log('[MuSig2 Store] Created shared wallet:', {
        id: walletId,
        name: config.name,
        participants: participants.length,
        sharedAddress: sharedAddress.slice(0, 30) + '...',
      })

      return wallet
    },

    /**
     * Remove a shared wallet
     */
    removeSharedWallet(walletId: string) {
      const index = this.sharedWallets.findIndex(w => w.id === walletId)
      if (index !== -1) {
        this.sharedWallets.splice(index, 1)
        this._saveSharedWallets()
      }
    },

    /**
     * Delete a shared wallet (alias for removeSharedWallet)
     */
    deleteSharedWallet(walletId: string) {
      this.removeSharedWallet(walletId)
    },

    /**
     * Refresh shared wallet balances from Chronik
     */
    async refreshSharedWalletBalances() {
      // TODO: Implement actual balance fetching via Chronik service
      this.loading = true
      try {
        await new Promise(resolve => setTimeout(resolve, 500))
      } finally {
        this.loading = false
      }
    },

    // ========================================================================
    // Internal Methods
    // ========================================================================

    /**
     * Handle discovered signer from service
     *
     * Deduplicates by publicKey (not by id) to handle re-advertisements.
     * This ensures the same signer doesn't appear multiple times if they
     * re-advertise with a new advertisement ID.
     */
    _handleSignerDiscovered(signer: DiscoveredSigner) {
      // Deduplicate by publicKey (not by id)
      const existingIndex = this.discoveredSigners.findIndex(
        (s: StoreSigner) => s.publicKey === signer.publicKey,
      )

      if (existingIndex >= 0) {
        const existing = this.discoveredSigners[existingIndex]

        // Only update if newer advertisement (use discoveredAt as timestamp)
        if (signer.discoveredAt > (existing.discoveredAt || 0)) {
          console.log(
            '[MuSig2 Store] Updating existing signer:',
            signer.publicKey.slice(0, 16) + '...',
          )

          this.discoveredSigners[existingIndex] = {
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

        this.discoveredSigners.push({
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
      this._cleanupExpiredSigners()

      // Update the discovery cache
      this._updateDiscoveryCache(signer)
    },

    /**
     * Remove expired signers from the list
     *
     * Uses isOnline flag and lastSeen timestamp to determine expiry.
     * A signer is considered expired if:
     * - isOnline is false AND lastSeen is older than 30 minutes
     */
    _cleanupExpiredSigners() {
      const now = Date.now()
      const EXPIRY_THRESHOLD = 30 * 60 * 1000 // 30 minutes
      const before = this.discoveredSigners.length

      this.discoveredSigners = this.discoveredSigners.filter(
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

      const removed = before - this.discoveredSigners.length
      if (removed > 0) {
        console.log(`[MuSig2 Store] Cleaned up ${removed} expired signers`)
      }
    },

    /**
     * Update the discovery cache with a signer
     */
    _updateDiscoveryCache(signer: DiscoveredSigner) {
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
      } catch (error) {
        // Cache update is non-critical, just log
        console.warn('[MuSig2 Store] Failed to update discovery cache:', error)
      }
    },

    /**
     * Restore cached signers from the discovery cache
     * Called on initialization to populate signers from previous sessions
     */
    _restoreCachedSigners() {
      try {
        const cache = getDiscoveryCache()

        const cachedSigners = cache.getValidSigners()
        console.log(
          `[MuSig2 Store] Restoring ${cachedSigners.length} cached signers`,
        )

        for (const cached of cachedSigners) {
          // Check if already in discovered signers
          const exists = this.discoveredSigners.some(
            (s: StoreSigner) => s.publicKey === cached.publicKey,
          )

          if (!exists) {
            // Convert cached signer to DiscoveredSigner format
            this.discoveredSigners.push({
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
      } catch (error) {
        console.warn('[MuSig2 Store] Failed to restore cached signers:', error)
      }
    },

    /**
     * Start periodic cleanup of expired signers
     */
    _startExpiryCleanupInterval() {
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
          this._cleanupExpiredSigners()
        }, CLEANUP_INTERVAL)

        ;(
          window as unknown as Record<string, unknown>
        ).__musig2CleanupInterval = intervalId

        console.log('[MuSig2 Store] Started expiry cleanup interval')
      }
    },

    /**
     * Stop the expiry cleanup interval
     */
    _stopExpiryCleanupInterval() {
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
    },

    /**
     * Load saved state from storage service
     */
    _loadSavedState() {
      // Load signer config
      const savedConfig = getItem<SignerConfig | null>(
        STORAGE_KEYS.MUSIG2_SIGNER_CONFIG,
        null,
      )
      if (savedConfig) {
        this.signerConfig = savedConfig
        // Note: signerEnabled will be set when we actually advertise
      }

      // Load shared wallets
      const savedWallets = getItem<SharedWallet[]>(
        STORAGE_KEYS.MUSIG2_SHARED_WALLETS,
        [],
      )
      this.sharedWallets = savedWallets
    },

    /**
     * Save signer config to storage service
     */
    _saveSignerConfig() {
      if (this.signerConfig) {
        setItem(STORAGE_KEYS.MUSIG2_SIGNER_CONFIG, this.signerConfig)
      }
    },

    /**
     * Save shared wallets to storage service
     */
    _saveSharedWallets() {
      setItem(STORAGE_KEYS.MUSIG2_SHARED_WALLETS, this.sharedWallets)
    },

    /**
     * Retry the last failed operation (Phase 6.3.1)
     */
    async retryLastOperation() {
      if (this.retryableOperation) {
        this.error = null
        this.lastError = null
        try {
          await this.retryableOperation()
          this.retryableOperation = null
        } catch (error) {
          // Error handling is done in the retried operation itself
          console.error('[MuSig2 Store] Retry failed:', error)
        }
      }
    },

    /**
     * Clear the last error and retryable operation
     */
    clearError() {
      this.error = null
      this.lastError = null
      this.retryableOperation = null
    },

    /**
     * Check if there's a retryable operation available
     */
    hasRetryableOperation(): boolean {
      return this.retryableOperation !== null
    },

    // ========================================================================
    // Signing Request Actions (Phase 6)
    // ========================================================================

    /**
     * Propose a spend from a shared wallet
     * Creates a signing session and notifies participants
     */
    async proposeSpend(params: {
      walletId: string
      recipient: string
      amount: bigint
      fee: bigint
      purpose?: string
    }): Promise<{ sessionId: string }> {
      const wallet = this.sharedWallets.find(w => w.id === params.walletId)
      if (!wallet) {
        throw new Error('Shared wallet not found')
      }

      const sessionId = generateId('session')

      // TODO: Create actual signing session via service
      // For now, register with SW for monitoring
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 min timeout
      this.registerSessionWithSW(sessionId, expiresAt)

      // Notify other participants
      this._notifySpendProposed(wallet, params.purpose)

      return { sessionId }
    },

    /**
     * Accept an incoming signing request
     */
    async acceptRequest(requestId: string) {
      // TODO: Implement actual request acceptance via service
      console.log('[MuSig2 Store] Accepting request:', requestId)

      // Notify requester of acceptance
      this._notifyRequestAccepted(requestId)

      this._syncSessionsFromService()
    },

    /**
     * Reject an incoming signing request
     */
    async rejectRequest(requestId: string) {
      // TODO: Implement actual request rejection via service
      console.log('[MuSig2 Store] Rejecting request:', requestId)

      // Notify requester of rejection
      this._notifyRequestRejected(requestId)

      this._syncSessionsFromService()
    },

    /**
     * Cancel an outgoing signing request
     */
    async cancelRequest(requestId: string) {
      await this.abortSession(requestId, 'Cancelled by sender')
    },

    // ========================================================================
    // Notification Helpers (Phase 6.3)
    // ========================================================================

    /**
     * Get display name for a peer
     */
    _getPeerDisplayName(peerId: string): string {
      const contactsStore = useContactsStore()
      const contact = contactsStore.contacts.find(c => c.peerId === peerId)
      if (contact) return contact.name
      return `${peerId.slice(0, 8)}...`
    },

    /**
     * Notify when a signing request is received
     */
    notifyIncomingRequest(request: {
      id: string
      fromPeerId: string
      walletId?: string
    }) {
      const notificationStore = useNotificationStore()
      const fromName = this._getPeerDisplayName(request.fromPeerId)

      notificationStore.addNotification({
        type: 'signing_request',
        title: 'Signing Request',
        message: `${fromName} is requesting your signature`,
        actionUrl: '/people/p2p?tab=requests',
        actionLabel: 'View Request',
        data: { requestId: request.id, fromPeerId: request.fromPeerId },
      })
    },

    /**
     * Notify when a signing session is completed
     */
    notifySessionComplete(session: { id: string; txid?: string }) {
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
      this.unregisterSessionFromSW(session.id)
    },

    /**
     * Notify when a shared wallet is created
     */
    notifyWalletCreated(wallet: SharedWallet) {
      const notificationStore = useNotificationStore()

      notificationStore.addNotification({
        type: 'system',
        title: 'Shared Wallet Created',
        message: `"${wallet.name}" is ready to use`,
        actionUrl: `/people/shared-wallets/${wallet.id}`,
        actionLabel: 'View Wallet',
        data: { walletId: wallet.id },
      })
    },

    /**
     * Notify when a shared wallet receives funds
     */
    notifyWalletFunded(wallet: SharedWallet, amount: bigint) {
      const notificationStore = useNotificationStore()

      notificationStore.addNotification({
        type: 'transaction',
        title: 'Shared Wallet Funded',
        message: `Received funds in "${wallet.name}"`,
        actionUrl: `/people/shared-wallets/${wallet.id}`,
        actionLabel: 'View Wallet',
        data: { walletId: wallet.id, amount: amount.toString() },
      })
    },

    /**
     * Internal: Notify when spend is proposed
     */
    _notifySpendProposed(wallet: SharedWallet, purpose?: string) {
      const notificationStore = useNotificationStore()

      notificationStore.addNotification({
        type: 'signing_request',
        title: 'Spend Proposed',
        message: purpose
          ? `Spend proposed from "${wallet.name}": ${purpose}`
          : `Spend proposed from "${wallet.name}"`,
        actionUrl: `/people/shared-wallets/${wallet.id}`,
        actionLabel: 'Review',
        data: { walletId: wallet.id },
      })
    },

    /**
     * Internal: Notify when request is accepted
     */
    _notifyRequestAccepted(requestId: string) {
      const notificationStore = useNotificationStore()

      notificationStore.addNotification({
        type: 'signing_request',
        title: 'Request Accepted',
        message: 'A participant has accepted your signing request',
        actionUrl: '/people/p2p?tab=sessions',
        actionLabel: 'View Session',
        data: { requestId },
      })
    },

    /**
     * Internal: Notify when request is rejected
     */
    _notifyRequestRejected(requestId: string) {
      const notificationStore = useNotificationStore()

      notificationStore.addNotification({
        type: 'signing_request',
        title: 'Request Rejected',
        message: 'A participant has rejected your signing request',
        actionUrl: '/people/p2p?tab=requests',
        actionLabel: 'View Details',
        data: { requestId },
      })
    },

    // ========================================================================
    // Phase 4: Session Connectivity Management
    // ========================================================================

    /**
     * Update participant connection status in a session
     *
     * @param sessionId - The session ID
     * @param peerId - The participant's peer ID
     * @param status - The new connection status
     */
    updateSessionParticipantStatus(
      sessionId: string,
      peerId: string,
      status: 'connected' | 'disconnected' | 'connecting',
    ): void {
      const sessionIndex = this.activeSessions.findIndex(
        s => s.id === sessionId,
      )
      if (sessionIndex < 0) return

      const session = this.activeSessions[sessionIndex]
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
      this.activeSessions = [
        ...this.activeSessions.slice(0, sessionIndex),
        updatedSession,
        ...this.activeSessions.slice(sessionIndex + 1),
      ]
    },

    /**
     * Get session with participant connection info
     *
     * @param sessionId - The session ID
     * @returns Session with connectivity info or null
     */
    getSessionWithConnectivity(sessionId: string): WalletSigningSession | null {
      const session = this.activeSessions.find(s => s.id === sessionId)
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
    },

    /**
     * Check if all participants in a session are connected
     *
     * @param sessionId - The session ID
     * @returns True if all participants are connected
     */
    areAllParticipantsConnected(sessionId: string): boolean {
      const session = this.getSessionWithConnectivity(sessionId)
      if (!session) return false

      const p2pStore = useP2PStore()

      return session.participants.every(
        p =>
          p.peerId === p2pStore.peerId ||
          (p as { connectionStatus?: string }).connectionStatus === 'connected',
      )
    },

    /**
     * Get disconnected participants for a session
     *
     * @param sessionId - The session ID
     * @returns Array of disconnected participant peer IDs
     */
    getDisconnectedParticipants(sessionId: string): string[] {
      const session = this.getSessionWithConnectivity(sessionId)
      if (!session) return []

      const p2pStore = useP2PStore()

      return session.participants
        .filter(
          p =>
            p.peerId !== p2pStore.peerId &&
            (p as { connectionStatus?: string }).connectionStatus !==
              'connected',
        )
        .map(p => p.peerId)
    },
  },
})
