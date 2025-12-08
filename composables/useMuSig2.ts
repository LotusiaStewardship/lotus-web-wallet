/**
 * MuSig2 Composable
 *
 * Provides MuSig2 multi-signature functionality as a Vue composable.
 * This is a protocol-specific layer that uses the core P2P store for connectivity.
 *
 * Architecture:
 * - Uses useP2PStore() for P2PCoordinator access
 * - Manages MuSig2P2PCoordinator lifecycle
 * - Provides reactive state for MuSig2-specific UI
 * - Uses SDK event types for strongly-typed event handling
 *
 * Usage:
 * ```typescript
 * const {
 *   isInitialized,
 *   discoveredSigners,
 *   activeSessions,
 *   initialize,
 *   advertiseSigner,
 *   createSession,
 * } = useMuSig2()
 * ```
 */
import { ref, computed, onUnmounted, type ComputedRef } from 'vue'
import { useP2PStore } from '~/stores/p2p'
import { useWalletStore } from '~/stores/wallet'

// ============================================================================
// SDK Type Imports (via dynamic import, types only here)
// ============================================================================

// These types are imported from the SDK for strongly-typed event handling
// The actual SDK module is loaded dynamically to avoid SSR issues
type SignerDiscoveredEventData =
  import('lotus-sdk').P2P.SignerDiscoveredEventData
type SigningRequestReceivedEventData =
  import('lotus-sdk').P2P.SigningRequestReceivedEventData
type SessionCreatedEventData = import('lotus-sdk').P2P.SessionCreatedEventData
type SessionCompleteEventData = import('lotus-sdk').P2P.SessionCompleteEventData
type SessionAbortedEventData = import('lotus-sdk').P2P.SessionAbortedEventData
type ParticipantJoinedEventData =
  import('lotus-sdk').P2P.ParticipantJoinedEventData
type MuSig2P2PSession = import('lotus-sdk').P2P.MuSig2P2PSession
type P2PSessionAnnouncement = import('lotus-sdk').P2P.SessionAnnouncement

// ============================================================================
// UI Types (Serialized/UI-friendly versions of SDK types)
// ============================================================================

/**
 * UI-friendly MuSig2 signer representation
 * Converts SDK types to serializable UI-friendly format
 */
export interface UISignerAdvertisement {
  /** Unique advertisement ID */
  id: string
  /** libp2p peer ID */
  peerId: string
  /** Multiaddresses for connection */
  multiaddrs: string[]
  /** Public key as hex string (serialized from SDK PublicKey) */
  publicKeyHex: string
  /** Transaction types as string array */
  transactionTypes: string[]
  /** Amount range in satoshis */
  amountRange?: { min?: number; max?: number }
  /** User-friendly nickname */
  nickname?: string
  /** Description of services */
  description?: string
  /** Fee for signing (satoshis) */
  fee?: number
  /** Average response time (milliseconds) */
  averageResponseTime?: number
  /** Reputation score (0-100) */
  reputation: number
  /** When the advertisement was created */
  createdAt: number
  /** When the advertisement expires */
  expiresAt: number
  /** Burn-based identity information */
  identity?: {
    identityId: string
    totalBurned: number
    maturationBlocks: number
    registeredAt: number
  }
}

/**
 * Signing session phase
 */
export enum SigningSessionPhase {
  WAITING_FOR_PARTICIPANTS = 'waiting_for_participants',
  NONCE_EXCHANGE = 'nonce_exchange',
  SIGNATURE_EXCHANGE = 'signature_exchange',
  COMPLETE = 'complete',
  ABORTED = 'aborted',
  ERROR = 'error',
}

/**
 * UI-friendly signing session
 */
export interface UISigningSession {
  id: string
  phase: SigningSessionPhase
  isCoordinator: boolean
  coordinatorPeerId: string
  totalSigners: number
  joinedCount: number
  noncesCollected: number
  partialSigsCollected: number
  messageHash: string
  finalSignature?: string
  error?: string
  createdAt: number
  lastActivity: number
  metadata?: Record<string, unknown>
}

/**
 * Incoming signing request
 */
export interface UIIncomingSigningRequest {
  id: string
  sessionId: string
  requesterPeerId: string
  requesterNickname?: string
  messageHash: string
  requiredSigners: number
  transactionType?: string
  amount?: number
  purpose?: string
  timestamp: number
  expiresAt: number
}

/**
 * Signer configuration for advertisement
 */
export interface SignerConfig {
  publicKeyHex: string
  transactionTypes: string[]
  amountRange?: { min?: number; max?: number }
  nickname?: string
  description?: string
  fee?: number
}

// ============================================================================
// Module State (Shared across all composable instances)
// ============================================================================

// SDK module reference (loaded dynamically)
let sdkModule: typeof import('lotus-sdk') | null = null

// MuSig2 coordinator instance
let musig2Coordinator: InstanceType<
  typeof import('lotus-sdk').P2P.MuSig2P2PCoordinator
> | null = null

// Storage keys
const STORAGE_KEY_SIGNER_CONFIG = 'musig2-signer-config'

// ============================================================================
// Shared Reactive State (Module-level for cross-component synchronization)
// ============================================================================

// These refs are created ONCE at module load and shared by all useMuSig2() calls
const sharedState = {
  isInitialized: ref(false),
  isInitializing: ref(false),
  error: ref<string | null>(null),
  discoveredSigners: ref<UISignerAdvertisement[]>([]),
  mySignerConfig: ref<SignerConfig | null>(null),
  activeSessions: ref<Map<string, UISigningSession>>(new Map()),
  incomingRequests: ref<UIIncomingSigningRequest[]>([]),
  activeSubscriptionId: ref<string | null>(null),
}

// ============================================================================
// Composable
// ============================================================================

export function useMuSig2() {
  const p2pStore = useP2PStore()
  const walletStore = useWalletStore()

  // ========================================================================
  // Reactive State (Use shared module-level state)
  // ========================================================================

  // All state is shared across composable instances via sharedState
  const isInitialized = sharedState.isInitialized
  const isInitializing = sharedState.isInitializing
  const error = sharedState.error

  // Signer discovery
  const discoveredSigners = sharedState.discoveredSigners
  const mySignerConfig = sharedState.mySignerConfig

  // Signing sessions
  const activeSessions = sharedState.activeSessions
  const incomingRequests = sharedState.incomingRequests

  // Subscriptions
  const activeSubscriptionId = sharedState.activeSubscriptionId

  // ========================================================================
  // Computed
  // ========================================================================

  const signerCount: ComputedRef<number> = computed(
    () => discoveredSigners.value.length,
  )

  const activeSessionCount: ComputedRef<number> = computed(
    () => activeSessions.value.size,
  )

  const pendingRequestCount: ComputedRef<number> = computed(
    () => incomingRequests.value.length,
  )

  const isAdvertisingSigner: ComputedRef<boolean> = computed(
    () => mySignerConfig.value !== null,
  )

  const activeSessionsList: ComputedRef<UISigningSession[]> = computed(() =>
    Array.from(activeSessions.value.values()),
  )

  // ========================================================================
  // Initialization
  // ========================================================================

  /**
   * Initialize MuSig2 protocol
   * Requires P2P store to be initialized first
   */
  async function initialize(): Promise<void> {
    if (isInitialized.value || isInitializing.value) return

    if (!p2pStore.initialized) {
      throw new Error('P2P store must be initialized before MuSig2')
    }

    isInitializing.value = true
    error.value = null

    try {
      // Load SDK if not already loaded
      if (!sdkModule) {
        sdkModule = await import('lotus-sdk')
      }

      // Get the P2PCoordinator from the store
      const coordinator = p2pStore.getCoordinator()
      if (!coordinator) {
        throw new Error('P2PCoordinator not available')
      }

      // Create MuSig2 coordinator with the shared P2PCoordinator
      const discoveryConfig = {
        enableAutoRefresh: true,
        signerRefreshInterval: 5 * 60 * 1000,
      }

      musig2Coordinator = new sdkModule.P2P.MuSig2P2PCoordinator(
        coordinator,
        undefined, // musig2Config - use defaults
        undefined, // securityConfig - use defaults
        discoveryConfig,
      )

      // Initialize MuSig2 protocol (P2PCoordinator is already started)
      await musig2Coordinator.initialize()

      // Setup event handlers
      _setupEventHandlers()

      // Subscribe to signer discovery
      await subscribeToSigners()

      // Restore saved signer config
      await _restoreSavedConfig()

      isInitialized.value = true
      console.log('[MuSig2] Protocol initialized')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize'
      console.error('[MuSig2] Initialization failed:', err)
      throw err
    } finally {
      isInitializing.value = false
    }
  }

  /**
   * Cleanup MuSig2 protocol
   */
  async function cleanup(): Promise<void> {
    if (!isInitialized.value) return

    try {
      if (musig2Coordinator) {
        await musig2Coordinator.cleanup()
        musig2Coordinator = null
      }

      // Clear state
      discoveredSigners.value = []
      activeSessions.value = new Map()
      incomingRequests.value = []
      activeSubscriptionId.value = null
      mySignerConfig.value = null

      isInitialized.value = false
      console.log('[MuSig2] Protocol cleaned up')
    } catch (err) {
      console.error('[MuSig2] Cleanup failed:', err)
    }
  }

  // ========================================================================
  // Signer Discovery
  // ========================================================================

  /**
   * Subscribe to signer discovery
   */
  async function subscribeToSigners(criteria?: {
    transactionTypes?: string[]
    minAmount?: number
    maxAmount?: number
  }): Promise<string | null> {
    const discovery = musig2Coordinator?.getDiscovery()
    if (!discovery || !sdkModule) return null

    // Convert string transaction types to SDK TransactionType enum
    const TransactionType = sdkModule.P2P.TransactionType
    const sdkCriteria: Record<string, unknown> = {}

    if (criteria?.transactionTypes?.length) {
      sdkCriteria.transactionTypes = criteria.transactionTypes.map(
        t => TransactionType[t.toUpperCase() as keyof typeof TransactionType],
      )
    }
    if (criteria?.minAmount !== undefined) {
      sdkCriteria.minAmount = criteria.minAmount
    }
    if (criteria?.maxAmount !== undefined) {
      sdkCriteria.maxAmount = criteria.maxAmount
    }

    const subscriptionId = await discovery.subscribeToSigners(
      sdkCriteria,
      // Cast to SDK event type - the SDK emits MuSig2SignerAdvertisement
      // which is compatible with SignerDiscoveredEventData
      (sdkSigner: SignerDiscoveredEventData) => {
        console.log(
          '[MuSig2] Signer discovered via subscription callback:',
          sdkSigner,
        )
        _handleSignerDiscovered(sdkSigner)
      },
    )

    activeSubscriptionId.value = subscriptionId
    console.log(
      '[MuSig2] Subscribed to signers, subscription ID:',
      subscriptionId,
    )
    return subscriptionId
  }

  /**
   * Query DHT for existing signers (one-time discovery)
   * This is useful for populating the signer list on startup or manual refresh
   */
  async function discoverSigners(criteria?: {
    transactionTypes?: string[]
    minAmount?: number
    maxAmount?: number
  }): Promise<UISignerAdvertisement[]> {
    const discovery = musig2Coordinator?.getDiscovery()
    if (!discovery || !sdkModule) {
      console.warn('[MuSig2] Cannot discover signers - not initialized')
      return []
    }

    console.log('[MuSig2] Querying DHT for existing signers...')

    // Convert string transaction types to SDK TransactionType enum
    const TransactionType = sdkModule.P2P.TransactionType
    const sdkCriteria: Record<string, unknown> = {}

    if (criteria?.transactionTypes?.length) {
      sdkCriteria.transactionTypes = criteria.transactionTypes.map(
        t => TransactionType[t.toUpperCase() as keyof typeof TransactionType],
      )
    }
    if (criteria?.minAmount !== undefined) {
      sdkCriteria.minAmount = criteria.minAmount
    }
    if (criteria?.maxAmount !== undefined) {
      sdkCriteria.maxAmount = criteria.maxAmount
    }

    try {
      const signers = await discovery.discoverSigners(sdkCriteria)
      console.log('[MuSig2] DHT query returned', signers.length, 'signers')

      // Process each discovered signer - cast to SDK event type
      for (const signer of signers) {
        _handleSignerDiscovered(signer as unknown as SignerDiscoveredEventData)
      }

      return discoveredSigners.value
    } catch (err) {
      console.error('[MuSig2] DHT discovery failed:', err)
      return discoveredSigners.value
    }
  }

  /**
   * Advertise as a signer
   */
  async function advertiseSigner(config: SignerConfig): Promise<void> {
    const discovery = musig2Coordinator?.getDiscovery()
    if (!discovery || !sdkModule) {
      throw new Error('MuSig2 not initialized')
    }

    const PublicKey = sdkModule.Bitcore.PublicKey
    const publicKey = new PublicKey(config.publicKeyHex)

    const TransactionType = sdkModule.P2P.TransactionType
    const transactionTypes = config.transactionTypes.map(
      t => TransactionType[t.toUpperCase() as keyof typeof TransactionType],
    )

    await discovery.advertiseSigner(publicKey, transactionTypes, {
      amountRange: config.amountRange,
      metadata: {
        nickname: config.nickname,
        description: config.description,
        fee: config.fee,
      },
    })

    mySignerConfig.value = config
    _saveSignerConfig(config)
  }

  /**
   * Withdraw signer advertisement
   */
  async function withdrawSigner(): Promise<void> {
    const discovery = musig2Coordinator?.getDiscovery()
    if (discovery) {
      await discovery.withdrawSigner()
    }

    mySignerConfig.value = null
    _saveSignerConfig(null)
  }

  // ========================================================================
  // Signing Sessions
  // ========================================================================

  /**
   * Create a new signing session
   */
  async function createSession(
    signerPublicKeys: string[],
    message: string | Buffer,
    metadata?: Record<string, unknown>,
  ): Promise<string | null> {
    if (!musig2Coordinator || !sdkModule) {
      throw new Error('MuSig2 not initialized')
    }

    const PublicKey = sdkModule.Bitcore.PublicKey
    const PrivateKey = sdkModule.Bitcore.PrivateKey
    const signers = signerPublicKeys.map(hex => new PublicKey(hex))

    const privateKeyHex = walletStore.getPrivateKeyHex()
    if (!privateKeyHex) {
      throw new Error('Wallet private key not available')
    }
    const myPrivateKey = new PrivateKey(privateKeyHex)

    const messageBuffer =
      typeof message === 'string' ? Buffer.from(message, 'hex') : message

    const sessionId = await musig2Coordinator.createSession(
      signers,
      myPrivateKey,
      messageBuffer,
      metadata,
    )

    await musig2Coordinator.announceSession(sessionId)

    const p2pSession = musig2Coordinator.getSession(sessionId)
    if (p2pSession) {
      _updateUISession(sessionId, p2pSession)
    }

    return sessionId
  }

  /**
   * Join an existing signing session
   */
  async function joinSession(announcement: {
    sessionId: string
    coordinatorPeerId: string
    signers: string[]
    messageHash: string
    requiredSigners: number
    createdAt: number
    expiresAt: number
    metadata?: Record<string, unknown>
  }): Promise<string | null> {
    if (!musig2Coordinator || !sdkModule) {
      throw new Error('MuSig2 not initialized')
    }

    const privateKeyHex = walletStore.getPrivateKeyHex()
    if (!privateKeyHex) {
      throw new Error('Wallet private key not available')
    }
    const PrivateKey = sdkModule.Bitcore.PrivateKey
    const myPrivateKey = new PrivateKey(privateKeyHex)

    const sessionId = await musig2Coordinator.joinSession(
      announcement as Parameters<typeof musig2Coordinator.joinSession>[0],
      myPrivateKey,
    )

    const p2pSession = musig2Coordinator.getSession(sessionId)
    if (p2pSession) {
      _updateUISession(sessionId, p2pSession)
    }

    // Remove from incoming requests
    incomingRequests.value = incomingRequests.value.filter(
      r => r.sessionId !== sessionId,
    )

    return sessionId
  }

  /**
   * Abort a signing session
   */
  async function abortSession(
    sessionId: string,
    reason: string,
  ): Promise<void> {
    if (!musig2Coordinator) return

    await musig2Coordinator.abortSession(sessionId, reason)

    const uiSession = activeSessions.value.get(sessionId)
    if (uiSession) {
      uiSession.phase = SigningSessionPhase.ABORTED
      uiSession.error = reason
      uiSession.lastActivity = Date.now()
      activeSessions.value.set(sessionId, uiSession)
    }
  }

  /**
   * Send a signing request to a specific signer
   * This creates a signing request advertisement that the target signer can discover
   */
  async function sendSigningRequest(
    targetSignerPublicKeyHex: string,
    options: {
      transactionType: string
      amount: number
      purpose?: string
    },
  ): Promise<string> {
    const discovery = musig2Coordinator?.getDiscovery()
    if (!discovery || !sdkModule) {
      throw new Error('MuSig2 not initialized')
    }

    // Get our public key
    const myPublicKeyHex = walletStore.getPublicKeyHex()
    if (!myPublicKeyHex) {
      throw new Error('Wallet public key not available')
    }

    const PublicKey = sdkModule.Bitcore.PublicKey
    const myPublicKey = new PublicKey(myPublicKeyHex)
    const targetPublicKey = new PublicKey(targetSignerPublicKeyHex)

    // Create a placeholder message hash (in real use, this would be the actual transaction hash)
    const messageHash = Buffer.from(
      `signing-request:${Date.now()}:${options.amount}`,
    )
      .toString('hex')
      .slice(0, 64)
      .padEnd(64, '0')

    console.log(
      '[MuSig2] Creating signing request for:',
      targetSignerPublicKeyHex.slice(0, 16) + '...',
    )

    // Convert string transaction type to SDK TransactionType enum
    const TransactionType = sdkModule.P2P.TransactionType
    const txType =
      TransactionType[
        options.transactionType.toUpperCase() as keyof typeof TransactionType
      ]

    const requestId = await discovery.createSigningRequest(
      [myPublicKey, targetPublicKey],
      messageHash,
      {
        metadata: {
          transactionType: txType,
          amount: options.amount,
          purpose: options.purpose,
        },
      },
    )

    console.log('[MuSig2] Signing request created:', requestId)
    return requestId
  }

  /**
   * Accept an incoming signing request
   */
  async function acceptRequest(requestId: string): Promise<string | null> {
    const request = incomingRequests.value.find(r => r.id === requestId)
    if (!request) {
      throw new Error('Signing request not found')
    }

    return joinSession({
      sessionId: request.sessionId,
      coordinatorPeerId: request.requesterPeerId,
      signers: [],
      messageHash: request.messageHash,
      requiredSigners: request.requiredSigners,
      createdAt: request.timestamp,
      expiresAt: request.expiresAt,
    })
  }

  /**
   * Decline an incoming signing request
   */
  function declineRequest(requestId: string): void {
    incomingRequests.value = incomingRequests.value.filter(
      r => r.id !== requestId,
    )
  }

  // ========================================================================
  // Internal Helpers
  // ========================================================================

  function _setupEventHandlers(): void {
    if (!musig2Coordinator) return

    const discovery = musig2Coordinator.getDiscovery()

    // Discovery events - use SDK event types for strongly-typed handling
    if (discovery) {
      // MuSig2Event.SIGNER_DISCOVERED = 'musig2:signer-discovered'
      discovery.on('musig2:signer-discovered', (signer: unknown) => {
        console.log('[MuSig2] Signer discovered via event:', signer)
        // Cast to SDK event type - the SDK emits MuSig2SignerAdvertisement
        _handleSignerDiscovered(signer as SignerDiscoveredEventData)
      })

      // MuSig2Event.SIGNER_WITHDRAWN = 'musig2:signer-withdrawn'
      // SignerWithdrawnEventData has advertisementId and timestamp
      discovery.on('musig2:signer-withdrawn', (data: unknown) => {
        const eventData = data as { advertisementId?: string } | string
        const signerId =
          typeof eventData === 'string'
            ? eventData
            : eventData.advertisementId ?? ''
        console.log('[MuSig2] Signer withdrawn:', signerId)
        discoveredSigners.value = discoveredSigners.value.filter(
          s => s.id !== signerId,
        )
      })
    }

    // Session events - use SDK event types
    // SessionDiscoveredEventData contains announcement and timestamp
    musig2Coordinator.on('musig2:session-discovered', (data: unknown) => {
      // The SDK emits SessionAnnouncement directly for this event
      const ann = data as P2PSessionAnnouncement

      const request: UIIncomingSigningRequest = {
        id: `req-${ann.sessionId}`,
        sessionId: ann.sessionId,
        requesterPeerId: ann.coordinatorPeerId,
        messageHash: ann.messageHash,
        requiredSigners: ann.requiredSigners,
        timestamp: ann.createdAt,
        expiresAt: ann.expiresAt,
        purpose: ann.metadata?.purpose as string | undefined,
      }

      if (!incomingRequests.value.find(r => r.sessionId === ann.sessionId)) {
        incomingRequests.value.push(request)
      }
    })

    // ParticipantJoinedEventData
    musig2Coordinator.on('musig2:participant-joined', (data: unknown) => {
      const eventData = data as ParticipantJoinedEventData
      const p2pSession = musig2Coordinator?.getSession(eventData.sessionId)
      if (p2pSession) {
        _updateUISession(eventData.sessionId, p2pSession as MuSig2P2PSession)
      }
    })

    // SessionCompleteEventData
    musig2Coordinator.on('musig2:session-complete', (data: unknown) => {
      const eventData = data as SessionCompleteEventData
      const uiSession = activeSessions.value.get(eventData.sessionId)
      if (uiSession) {
        uiSession.phase = SigningSessionPhase.COMPLETE
        // SerializedSignature has r and s as hex strings
        uiSession.finalSignature = `${eventData.signature.r}${eventData.signature.s}`
        uiSession.lastActivity = Date.now()
        activeSessions.value.set(eventData.sessionId, uiSession)
      }
    })

    // SessionAbortedEventData
    musig2Coordinator.on('musig2:session-aborted', (data: unknown) => {
      const eventData = data as SessionAbortedEventData
      const uiSession = activeSessions.value.get(eventData.sessionId)
      if (uiSession) {
        uiSession.phase = SigningSessionPhase.ABORTED
        uiSession.error = eventData.reason
        uiSession.lastActivity = Date.now()
        activeSessions.value.set(eventData.sessionId, uiSession)
      }
    })
  }

  /**
   * Convert SDK SignerDiscoveredEventData to UI-friendly format
   * This is the canonical conversion function for signer data
   */
  function _handleSignerDiscovered(signer: SignerDiscoveredEventData): void {
    // Convert SDK type to UI type (serialize PublicKey to hex string)
    const uiSigner: UISignerAdvertisement = {
      id: signer.id,
      peerId: signer.peerInfo.peerId,
      multiaddrs: signer.peerInfo.multiaddrs ?? [],
      // PublicKey.toString() returns hex representation
      publicKeyHex: new sdkModule!.Bitcore.PublicKey(
        signer.publicKey as any,
      ).toString(),
      // TransactionType enum values are already strings
      transactionTypes: signer.transactionTypes as string[],
      amountRange: signer.amountRange,
      nickname: signer.signerMetadata?.nickname,
      description: signer.signerMetadata?.description,
      fee: signer.signerMetadata?.fee,
      averageResponseTime: signer.signerMetadata?.averageResponseTime,
      reputation: signer.reputation,
      createdAt: signer.createdAt,
      expiresAt: signer.expiresAt,
      identity: signer.signerMetadata?.identity,
    }

    console.log(
      '[MuSig2] Processing signer:',
      uiSigner.id,
      uiSigner.nickname || 'Anonymous',
    )

    const existingIndex = discoveredSigners.value.findIndex(
      s => s.id === uiSigner.id,
    )

    if (existingIndex >= 0) {
      discoveredSigners.value[existingIndex] = uiSigner
      console.log('[MuSig2] Updated existing signer at index', existingIndex)
    } else {
      discoveredSigners.value.push(uiSigner)
      console.log(
        '[MuSig2] Added new signer, total count:',
        discoveredSigners.value.length,
      )
    }
  }

  /**
   * Convert SDK MuSig2P2PSession to UI-friendly format
   */
  function _updateUISession(
    sessionId: string,
    p2pSession: MuSig2P2PSession,
  ): void {
    const innerSession = p2pSession.session
    const joinedCount = p2pSession.participants.size
    const totalSigners = innerSession.signers.length
    // SDK uses Maps for received nonces and signatures
    const noncesCollected = innerSession.receivedPublicNonces.size
    const partialSigsCollected = innerSession.receivedPartialSigs.size

    let phase = SigningSessionPhase.WAITING_FOR_PARTICIPANTS
    if (joinedCount < totalSigners) {
      phase = SigningSessionPhase.WAITING_FOR_PARTICIPANTS
    } else if (noncesCollected < totalSigners) {
      phase = SigningSessionPhase.NONCE_EXCHANGE
    } else if (partialSigsCollected < totalSigners) {
      phase = SigningSessionPhase.SIGNATURE_EXCHANGE
    } else {
      phase = SigningSessionPhase.COMPLETE
    }

    const uiSession: UISigningSession = {
      id: sessionId,
      phase,
      isCoordinator: p2pSession.isCoordinator,
      coordinatorPeerId: p2pSession.coordinatorPeerId,
      totalSigners,
      joinedCount,
      noncesCollected,
      partialSigsCollected,
      messageHash: p2pSession.announcement?.messageHash ?? '',
      createdAt: p2pSession.createdAt,
      lastActivity: p2pSession.lastActivity,
      metadata: p2pSession.announcement?.metadata,
    }

    activeSessions.value.set(sessionId, uiSession)
  }

  function _saveSignerConfig(config: SignerConfig | null): void {
    if (typeof localStorage === 'undefined') return
    if (config) {
      localStorage.setItem(STORAGE_KEY_SIGNER_CONFIG, JSON.stringify(config))
    } else {
      localStorage.removeItem(STORAGE_KEY_SIGNER_CONFIG)
    }
  }

  async function _restoreSavedConfig(): Promise<void> {
    if (typeof localStorage === 'undefined') return
    const saved = localStorage.getItem(STORAGE_KEY_SIGNER_CONFIG)
    if (saved) {
      try {
        const config = JSON.parse(saved) as SignerConfig
        await advertiseSigner(config)
      } catch (err) {
        console.warn('[MuSig2] Failed to restore signer config:', err)
      }
    }
  }

  // ========================================================================
  // Lifecycle
  // ========================================================================

  onUnmounted(() => {
    // Don't cleanup on unmount - let the store manage lifecycle
    // cleanup()
  })

  // ========================================================================
  // Return
  // ========================================================================

  return {
    // State
    isInitialized,
    isInitializing,
    error,
    discoveredSigners,
    mySignerConfig,
    activeSessions,
    incomingRequests,

    // Computed
    signerCount,
    activeSessionCount,
    pendingRequestCount,
    isAdvertisingSigner,
    activeSessionsList,

    // Actions
    initialize,
    cleanup,
    subscribeToSigners,
    discoverSigners,
    advertiseSigner,
    withdrawSigner,
    sendSigningRequest,
    createSession,
    joinSession,
    abortSession,
    acceptRequest,
    declineRequest,
  }
}
