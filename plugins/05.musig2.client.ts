/**
 * MuSig2 Coordinator Plugin
 *
 * Provides the MuSig2 coordinator for multi-signature operations.
 * This plugin manages MuSig2 session lifecycle, signer discovery, and signing protocol.
 *
 * Access Patterns:
 * - Components: useMuSig2() composable
 * - Stores: Import getter functions directly from this plugin
 * - Workers: Not available (use static imports in worker)
 *
 * Dependencies:
 * - p2p: For P2P coordinator and connection management
 * - discovery-cache: For persistent signer cache
 *
 * The `.client.ts` suffix ensures this only runs in the browser (SPA mode).
 */
import * as XpiP2P from 'xpi-p2p-ts'
import { Bitcore } from 'xpi-ts'

// ============================================================================
// SDK Types (statically imported, exported for composable use)
// ============================================================================

export type MuSig2P2PCoordinatorType = XpiP2P.MuSig2P2PCoordinator
export type MuSig2DiscoveryType = XpiP2P.MuSig2Discovery
// Note: Using any for Bitcore types due to xpi-p2p-ts bundling xpi-ts internally
// The runtime objects are compatible even though TypeScript sees different types
export type PublicKeyType = any
export type PrivateKeyType = any
export type SessionAnnouncementType = XpiP2P.SessionAnnouncement
export type MuSig2SignerAdvertisementType = XpiP2P.MuSig2SignerAdvertisement
export type TransactionTypeEnum = XpiP2P.TransactionType
export type MuSig2P2PConfigType = XpiP2P.MuSig2P2PConfig
export type MuSig2DiscoveryConfigType = XpiP2P.MuSig2DiscoveryConfig
export type MuSig2SignerCriteriaType = XpiP2P.MuSig2SignerCriteria
export type MuSig2P2PSessionType = XpiP2P.MuSig2P2PSession

// ============================================================================
// Wallet-Meaningful Types
// ============================================================================

/**
 * Signer advertising options
 */
export interface SignerAdvertisingOptions {
  /** Transaction types willing to sign */
  transactionTypes?: string[]
  /** Amount range in satoshis */
  amountRange?: { min?: number; max?: number }
  /** Signer metadata */
  metadata?: {
    nickname?: string
    description?: string
    fee?: number
  }
  /** Advertisement TTL in milliseconds */
  ttl?: number
}

/**
 * Signer search criteria
 */
export interface SignerSearchCriteria {
  /** Filter by transaction types */
  transactionTypes?: string[]
  /** Minimum amount */
  minAmount?: number
  /** Maximum amount */
  maxAmount?: number
  /** Maximum results */
  maxResults?: number
}

/**
 * Session metadata for wallet context
 */
export interface SessionMetadata {
  /** Purpose description */
  purpose?: string
  /** Transaction type */
  transactionType?: string
  /** Amount in satoshis */
  amount?: number
}

/**
 * Wallet signing session (simplified view)
 */
export interface WalletSigningSession {
  id: string
  state: MuSig2SessionState
  isInitiator: boolean
  coordinatorPeerId: string
  participants: WalletSessionParticipant[]
  messageHex?: string
  createdAt: number
  updatedAt: number
  expiresAt: number
  /** Session metadata (walletId, purpose, etc.) */
  metadata?: Record<string, unknown>
}

/**
 * Session participant info
 */
export interface WalletSessionParticipant {
  peerId: string
  publicKeyHex: string
  signerIndex: number
  hasNonce: boolean
  hasPartialSig: boolean
}

/**
 * MuSig2 event callbacks for store integration
 */
export interface MuSig2EventCallbacks {
  onSignerDiscovered?: (signer: DiscoveredSigner) => void
  onSignerWithdrawn?: () => void
  onSessionCreated?: (sessionId: string) => void
  onSessionDiscovered?: (announcement: SessionAnnouncementType) => void
  onParticipantJoined?: (sessionId: string, peerId: string) => void
  onSessionReady?: (sessionId: string) => void
  onNonceReceived?: (sessionId: string, signerIndex: number) => void
  onNoncesComplete?: (sessionId: string) => void
  onPartialSigReceived?: (sessionId: string, signerIndex: number) => void
  onPartialSigsComplete?: (sessionId: string) => void
  onSessionComplete?: (sessionId: string, signature: Buffer) => void
  onSessionAborted?: (sessionId: string, reason: string) => void
  onSessionTimeout?: (sessionId: string) => void
  onError?: (error: Error) => void
}

/**
 * Result of participant connection check
 */
export interface ParticipantConnectionResult {
  connected: boolean
  connectionType?: 'webrtc' | 'relay' | 'direct'
  error?: string
}

/**
 * Result of pre-flight signing session check
 */
export interface PreflightResult {
  ready: boolean
  connectedCount: number
  totalParticipants: number
  disconnectedParticipants: string[]
  error?: string
}

// ============================================================================
// Module-level State (Singleton)
// ============================================================================

let musig2Coordinator: MuSig2P2PCoordinatorType | null = null
let eventCallbacks: MuSig2EventCallbacks = {}
let eventUnsubscribers: Array<() => void> = []
let activeSignerAdId: string | null = null
let signerSubscriptionId: string | null = null

// P2P plugin access - set during plugin setup
let p2pPlugin: ReturnType<typeof useNuxtApp>['$p2p'] | null = null
let discoveryCachePlugin:
  | ReturnType<typeof useNuxtApp>['$discoveryCache']
  | null = null

// Pending advertisement state for re-advertisement when DHT becomes ready
let pendingAdvertisement: {
  signingContext: SignerSigningContext
  options: SignerAdvertisingOptions
} | null = null
let dhtReadyCallbackRegistered = false

// ============================================================================
// Default Discovery Configuration
// ============================================================================

/**
 * Default discovery configuration for the wallet
 * These values are optimized for browser-based wallet usage
 */
const DEFAULT_WALLET_DISCOVERY_CONFIG: MuSig2DiscoveryConfigType = {
  signerKeyPrefix: 'musig2:signer:',
  requestKeyPrefix: 'musig2:request:',
  signerTTL: 30 * 60 * 1000, // 30 minutes
  requestTTL: 10 * 60 * 1000, // 10 minutes
  enableBurnValidation: false,
  minBurnAmount: 50_000_000, // 50 XPI
  chronikUrl: 'https://chronik.lotusia.org',
  enableAutoRefresh: true,
  signerRefreshInterval: 20 * 60 * 1000, // 20 minutes
  maxConcurrentRequests: 5,
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Map SDK signer advertisement to wallet DiscoveredSigner type
 */
function _mapSignerAdvertisementToDiscoveredSigner(
  ad: MuSig2SignerAdvertisementType,
): DiscoveredSigner {
  return {
    id: ad.id,
    peerId: ad.peerInfo.peerId,
    publicKey: ad.publicKey.toString(),
    walletAddress: '', // Derived from public key if needed
    nickname: ad.signerMetadata?.nickname,
    avatar: undefined,
    capabilities: {
      standardTx: ad.transactionTypes.some(
        (t: TransactionTypeEnum) => t === 'spend' || t === 'custody',
      ),
      rankVoting: false,
      tokenTx: false,
      opReturn: false,
    },
    discoveredAt: ad.createdAt,
    lastSeen: ad.createdAt,
    isOnline: Date.now() < ad.expiresAt,
  }
}

/**
 * Map P2P session to wallet session type
 */
function _mapP2PSessionToWalletSession(
  p2pSession: MuSig2P2PSessionType,
): WalletSigningSession {
  const session = p2pSession.session

  // Map participants from the Map to array
  const participants: WalletSessionParticipant[] = []
  p2pSession.participants.forEach(
    (
      participant: {
        publicKey: { toString(): string }
        signerIndex: number
        hasNonce: boolean
        hasPartialSig: boolean
      },
      peerId: string,
    ) => {
      participants.push({
        peerId,
        publicKeyHex: participant.publicKey.toString(),
        signerIndex: participant.signerIndex,
        hasNonce: participant.hasNonce,
        hasPartialSig: participant.hasPartialSig,
      })
    },
  )

  // Map session phase to wallet state
  const stateMap: Record<string, MuSig2SessionState> = {
    INIT: 'created' as MuSig2SessionState,
    NONCE_EXCHANGE: 'nonce_exchange' as MuSig2SessionState,
    PARTIAL_SIG_EXCHANGE: 'signing' as MuSig2SessionState,
    COMPLETE: 'completed' as MuSig2SessionState,
    ABORTED: 'failed' as MuSig2SessionState,
  }

  return {
    id: session.sessionId,
    state: stateMap[session.phase] || ('created' as MuSig2SessionState),
    isInitiator: p2pSession.isCoordinator,
    coordinatorPeerId: p2pSession.coordinatorPeerId,
    participants,
    messageHex: session.message?.toString('hex'),
    createdAt: p2pSession.createdAt,
    updatedAt: p2pSession.lastActivity,
    expiresAt: p2pSession.createdAt + MUSIG2_SESSION_TIMEOUT,
    metadata: p2pSession.announcement?.metadata,
  }
}

/**
 * Map string transaction types to SDK enum values
 */
function _mapTransactionTypes(types: string[]): TransactionTypeEnum[] {
  const typeMap: Record<string, TransactionTypeEnum> = {
    spend: XpiP2P.TransactionType.SPEND,
    swap: XpiP2P.TransactionType.SWAP,
    coinjoin: XpiP2P.TransactionType.COINJOIN,
    custody: XpiP2P.TransactionType.CUSTODY,
    escrow: XpiP2P.TransactionType.ESCROW,
    channel: XpiP2P.TransactionType.CHANNEL,
  }

  return types
    .map(t => typeMap[t.toLowerCase()])
    .filter((t): t is TransactionTypeEnum => t !== undefined)
}

/**
 * Setup event handlers for coordinator events
 */
function _setupEventHandlers(): void {
  if (!musig2Coordinator) return

  const { MuSig2Event } = XpiP2P

  // Session lifecycle events
  const onSessionCreated = (sessionId: string) => {
    eventCallbacks.onSessionCreated?.(sessionId)
  }
  musig2Coordinator.on(MuSig2Event.SESSION_CREATED, onSessionCreated)
  eventUnsubscribers.push(() =>
    musig2Coordinator?.off(MuSig2Event.SESSION_CREATED, onSessionCreated),
  )

  const onSessionDiscovered = (
    _sessionId: string,
    announcement: SessionAnnouncementType,
  ) => {
    eventCallbacks.onSessionDiscovered?.(announcement)
  }
  musig2Coordinator.on(MuSig2Event.SESSION_DISCOVERED, onSessionDiscovered)
  eventUnsubscribers.push(() =>
    musig2Coordinator?.off(MuSig2Event.SESSION_DISCOVERED, onSessionDiscovered),
  )

  const onParticipantJoined = (sessionId: string, peerId: string) => {
    eventCallbacks.onParticipantJoined?.(sessionId, peerId)
  }
  musig2Coordinator.on(MuSig2Event.PARTICIPANT_JOINED, onParticipantJoined)
  eventUnsubscribers.push(() =>
    musig2Coordinator?.off(MuSig2Event.PARTICIPANT_JOINED, onParticipantJoined),
  )

  const onSessionReady = (sessionId: string) => {
    eventCallbacks.onSessionReady?.(sessionId)
  }
  musig2Coordinator.on(MuSig2Event.SESSION_READY, onSessionReady)
  eventUnsubscribers.push(() =>
    musig2Coordinator?.off(MuSig2Event.SESSION_READY, onSessionReady),
  )

  // Nonce exchange events
  const onNonceReceived = (sessionId: string, signerIndex: number) => {
    eventCallbacks.onNonceReceived?.(sessionId, signerIndex)
  }
  musig2Coordinator.on(MuSig2Event.NONCE_RECEIVED, onNonceReceived)
  eventUnsubscribers.push(() =>
    musig2Coordinator?.off(MuSig2Event.NONCE_RECEIVED, onNonceReceived),
  )

  const onNoncesComplete = (sessionId: string) => {
    eventCallbacks.onNoncesComplete?.(sessionId)
  }
  musig2Coordinator.on(MuSig2Event.NONCES_COMPLETE, onNoncesComplete)
  eventUnsubscribers.push(() =>
    musig2Coordinator?.off(MuSig2Event.NONCES_COMPLETE, onNoncesComplete),
  )

  // Partial signature events
  const onPartialSigReceived = (sessionId: string, signerIndex: number) => {
    eventCallbacks.onPartialSigReceived?.(sessionId, signerIndex)
  }
  musig2Coordinator.on(MuSig2Event.PARTIAL_SIG_RECEIVED, onPartialSigReceived)
  eventUnsubscribers.push(() =>
    musig2Coordinator?.off(
      MuSig2Event.PARTIAL_SIG_RECEIVED,
      onPartialSigReceived,
    ),
  )

  const onPartialSigsComplete = (sessionId: string) => {
    eventCallbacks.onPartialSigsComplete?.(sessionId)
  }
  musig2Coordinator.on(MuSig2Event.PARTIAL_SIGS_COMPLETE, onPartialSigsComplete)
  eventUnsubscribers.push(() =>
    musig2Coordinator?.off(
      MuSig2Event.PARTIAL_SIGS_COMPLETE,
      onPartialSigsComplete,
    ),
  )

  // Session completion events
  const onSessionComplete = (sessionId: string, signature: Buffer) => {
    eventCallbacks.onSessionComplete?.(sessionId, signature)
  }
  musig2Coordinator.on(MuSig2Event.SESSION_COMPLETE, onSessionComplete)
  eventUnsubscribers.push(() =>
    musig2Coordinator?.off(MuSig2Event.SESSION_COMPLETE, onSessionComplete),
  )

  const onSessionAborted = (sessionId: string, reason: string) => {
    eventCallbacks.onSessionAborted?.(sessionId, reason)
  }
  musig2Coordinator.on(MuSig2Event.SESSION_ABORTED, onSessionAborted)
  eventUnsubscribers.push(() =>
    musig2Coordinator?.off(MuSig2Event.SESSION_ABORTED, onSessionAborted),
  )

  const onSessionTimeout = (sessionId: string) => {
    eventCallbacks.onSessionTimeout?.(sessionId)
  }
  musig2Coordinator.on(MuSig2Event.SESSION_TIMEOUT, onSessionTimeout)
  eventUnsubscribers.push(() =>
    musig2Coordinator?.off(MuSig2Event.SESSION_TIMEOUT, onSessionTimeout),
  )

  // Discovery events
  const onSignerDiscovered = (ad: MuSig2SignerAdvertisementType) => {
    const signer = _mapSignerAdvertisementToDiscoveredSigner(ad)
    eventCallbacks.onSignerDiscovered?.(signer)
  }
  musig2Coordinator.on(MuSig2Event.SIGNER_DISCOVERED, onSignerDiscovered)
  eventUnsubscribers.push(() =>
    musig2Coordinator?.off(MuSig2Event.SIGNER_DISCOVERED, onSignerDiscovered),
  )

  const onSignerWithdrawn = () => {
    eventCallbacks.onSignerWithdrawn?.()
  }
  musig2Coordinator.on(MuSig2Event.SIGNER_WITHDRAWN, onSignerWithdrawn)
  eventUnsubscribers.push(() =>
    musig2Coordinator?.off(MuSig2Event.SIGNER_WITHDRAWN, onSignerWithdrawn),
  )
}

/**
 * Signing context required for signer advertisement
 * Passed from store to avoid plugin importing stores
 */
export interface SignerSigningContext {
  privateKeyHex: string
  publicKeyHex: string
}

/**
 * Internal function to actually publish the signer advertisement
 * @param signingContext - Signing keys from wallet (passed by caller)
 * @param options - Advertising options
 */
async function _publishSignerAdvertisement(
  signingContext: SignerSigningContext,
  options: SignerAdvertisingOptions,
): Promise<string> {
  if (!musig2Coordinator) {
    throw new Error('MuSig2 not initialized')
  }

  const discovery = musig2Coordinator.getDiscovery()
  if (!discovery) {
    throw new Error('MuSig2 discovery layer not available')
  }

  const { privateKeyHex, publicKeyHex } = signingContext

  // Set the signing key on the discovery layer
  const signingKey = Bitcore.PrivateKey.fromString(privateKeyHex) as any
  discovery.setSigningKey(signingKey)

  console.log('[MuSig2 Plugin] MuSig2 signing key set for advertisement')

  // Map string transaction types to SDK enum
  const transactionTypes = _mapTransactionTypes(
    options.transactionTypes || ['spend'],
  )

  // Use the MuSig2 public key for advertisement
  const pubKeyObj = new Bitcore.PublicKey(publicKeyHex) as any

  console.log(
    '[MuSig2 Plugin] Publishing signer advertisement with MuSig2 key:',
    {
      publicKey: pubKeyObj.toString().substring(0, 20) + '...',
      transactionTypes: options.transactionTypes || ['spend'],
      amountRange: options.amountRange,
      nickname: options.metadata?.nickname,
      ttl: options.ttl || 'default',
    },
  )

  const adId = await discovery.advertiseSigner(pubKeyObj, transactionTypes, {
    amountRange: options.amountRange,
    metadata: options.metadata,
    ttl: options.ttl,
  })

  activeSignerAdId = adId
  pendingAdvertisement = null // Clear pending since we've published

  console.log('[MuSig2 Plugin] Signer advertisement published successfully:', {
    advertisementId: adId,
    peerId: musig2Coordinator.peerId,
  })

  return adId
}

/**
 * Register a one-time callback for when DHT becomes ready
 */
function _registerDHTReadyCallback(): void {
  if (dhtReadyCallbackRegistered) {
    console.log('[MuSig2 Plugin] DHT ready callback already registered')
    return
  }

  dhtReadyCallbackRegistered = true
  console.log(
    '[MuSig2 Plugin] Registering DHT ready callback for pending advertisement',
  )

  if (!p2pPlugin) {
    console.warn('[MuSig2 Plugin] P2P plugin not available for DHT callback')
    return
  }

  p2pPlugin.setupConnectionStateHandlers({
    onDHTReady: async () => {
      console.log('[MuSig2 Plugin] DHT ready callback triggered')
      if (pendingAdvertisement) {
        console.log(
          '[MuSig2 Plugin] Publishing queued advertisement now that DHT is ready',
        )
        try {
          await _publishSignerAdvertisement(
            pendingAdvertisement.signingContext,
            pendingAdvertisement.options,
          )
          console.log(
            '[MuSig2 Plugin] Queued advertisement published successfully',
          )
        } catch (err) {
          console.error(
            '[MuSig2 Plugin] Failed to publish queued advertisement:',
            err,
          )
        }
      }
      dhtReadyCallbackRegistered = false
    },
    onDisconnected: () => {
      console.log(
        '[MuSig2 Plugin] P2P disconnected, will need to re-advertise on reconnect',
      )
    },
    onReconnected: async () => {
      console.log('[MuSig2 Plugin] P2P reconnected')
      // Re-advertise if we were advertising before
      if (activeSignerAdId && pendingAdvertisement) {
        console.log('[MuSig2 Plugin] Re-advertising after reconnect')
        try {
          await _publishSignerAdvertisement(
            pendingAdvertisement.signingContext,
            pendingAdvertisement.options,
          )
        } catch (err) {
          console.error(
            '[MuSig2 Plugin] Failed to re-advertise after reconnect:',
            err,
          )
        }
      }
    },
  })
}

// ============================================================================
// Exported Functions
// ============================================================================

/**
 * Initialize the MuSig2 service
 *
 * Requires P2P to be initialized first. Creates a MuSig2P2PCoordinator
 * that wraps the P2PCoordinator for session management and discovery.
 *
 * @param callbacks - Event callbacks for store integration
 * @param discoveryConfig - Optional discovery layer configuration (merged with defaults)
 */
export async function initializeMuSig2(
  callbacks: MuSig2EventCallbacks = {},
  discoveryConfig?: Partial<MuSig2DiscoveryConfigType>,
): Promise<void> {
  if (musig2Coordinator) {
    console.log('[MuSig2 Plugin] Already initialized')
    return
  }

  // Verify P2P plugin is available
  if (!p2pPlugin) {
    throw new Error(
      'P2P plugin not available - ensure MuSig2 plugin runs after P2P',
    )
  }

  if (!p2pPlugin.isInitialized()) {
    throw new Error('P2P must be initialized before MuSig2')
  }

  const p2pCoordinator = p2pPlugin.getCoordinator()
  if (!p2pCoordinator) {
    throw new Error('P2P coordinator not available')
  }

  eventCallbacks = callbacks

  // Use statically imported SDK
  const { MuSig2P2PCoordinator } = XpiP2P

  // Get the SDK-compatible discovery cache adapter for persistence
  if (!discoveryCachePlugin) {
    throw new Error('Discovery cache plugin not available')
  }
  const discoveryCache = discoveryCachePlugin.getSDKAdapter()

  // Merge discovery config with defaults
  const finalDiscoveryConfig: MuSig2DiscoveryConfigType = {
    ...DEFAULT_WALLET_DISCOVERY_CONFIG,
    ...discoveryConfig,
  }

  console.log('[MuSig2 Plugin] Initializing with discovery config:', {
    signerTTL: finalDiscoveryConfig.signerTTL,
    enableAutoRefresh: finalDiscoveryConfig.enableAutoRefresh,
    signerRefreshInterval: finalDiscoveryConfig.signerRefreshInterval,
    hasExternalCache: true,
  })

  // Create MuSig2 coordinator with discovery enabled and external cache
  musig2Coordinator = new MuSig2P2PCoordinator(
    p2pCoordinator,
    undefined, // Use default MuSig2 config
    undefined, // Use default security config
    finalDiscoveryConfig,
    discoveryCache, // Pass the localStorage-backed cache adapter
  )

  // Initialize the coordinator (subscribes to topics, starts discovery)
  await musig2Coordinator.initialize()

  // Verify discovery layer is available
  const discovery = musig2Coordinator.getDiscovery()
  if (discovery) {
    console.log('[MuSig2 Plugin] Discovery layer initialized successfully')
  } else {
    console.warn(
      '[MuSig2 Plugin] Discovery layer NOT available - signer advertisement will not work',
    )
  }

  // Setup event handlers
  _setupEventHandlers()

  console.log('[MuSig2 Plugin] Initialized')
}

/**
 * Cleanup the MuSig2 service
 */
export async function cleanupMuSig2(): Promise<void> {
  if (!musig2Coordinator) return

  // Unsubscribe from events
  eventUnsubscribers.forEach(unsub => unsub())
  eventUnsubscribers = []

  // Stop signer advertising if active
  if (activeSignerAdId) {
    await stopSignerAdvertising()
  }

  // Unsubscribe from signer discovery
  if (signerSubscriptionId) {
    await unsubscribeFromSigners(signerSubscriptionId)
  }

  // Cleanup coordinator
  await musig2Coordinator.cleanup()
  musig2Coordinator = null

  console.log('[MuSig2 Plugin] Cleaned up')
}

// ============================================================================
// Signer Advertisement
// ============================================================================

/**
 * Start advertising as an available signer
 *
 * Uses the MuSig2Discovery layer to advertise on the DHT.
 * If DHT is not ready, queues the advertisement and registers a callback
 * to publish when DHT becomes ready.
 *
 * @param signingContext - Signing keys from wallet (privateKeyHex, publicKeyHex)
 * @param options - Advertising options
 * @returns Advertisement ID or 'pending' if queued for later
 */
export async function startSignerAdvertising(
  signingContext: SignerSigningContext,
  options: SignerAdvertisingOptions = {},
): Promise<string> {
  console.log('[MuSig2 Plugin] startSignerAdvertising() called')

  if (!musig2Coordinator) {
    console.error(
      '[MuSig2 Plugin] startSignerAdvertising() failed: MuSig2 not initialized',
    )
    throw new Error('MuSig2 not initialized')
  }

  const discovery = musig2Coordinator.getDiscovery()
  if (!discovery) {
    console.error(
      '[MuSig2 Plugin] startSignerAdvertising() failed: Discovery layer not available',
    )
    throw new Error('MuSig2 discovery layer not available')
  }

  // Check DHT readiness via P2P plugin
  if (!p2pPlugin) {
    throw new Error('P2P plugin not available')
  }
  const dhtStats = p2pPlugin.getDHTStats()
  console.log('[MuSig2 Plugin] DHT stats:', {
    isReady: dhtStats.isReady,
    routingTableSize: dhtStats.routingTableSize,
    mode: dhtStats.mode,
  })

  if (!dhtStats.isReady) {
    // Store for later and register callback
    pendingAdvertisement = { signingContext, options }
    console.log(
      '[MuSig2 Plugin] DHT not ready, queuing advertisement for later',
    )

    // Register one-time callback for DHT ready (only once)
    _registerDHTReadyCallback()

    return 'pending'
  }

  // DHT is ready, proceed with advertisement
  return await _publishSignerAdvertisement(signingContext, options)
}

/**
 * Stop advertising as a signer
 */
export async function stopSignerAdvertising(): Promise<void> {
  if (!musig2Coordinator) return

  const discovery = musig2Coordinator.getDiscovery()
  if (!discovery) return

  await discovery.withdrawSigner()
  activeSignerAdId = null

  console.log('[MuSig2 Plugin] Stopped signer advertising')
}

/**
 * Check if currently advertising as a signer
 */
export function isCurrentlyAdvertising(): boolean {
  return activeSignerAdId !== null
}

// ============================================================================
// Signer Discovery
// ============================================================================

/**
 * Discover available signers on the network
 *
 * @param criteria - Search criteria
 * @returns Array of discovered signers
 */
export async function discoverSigners(
  criteria: SignerSearchCriteria = {},
): Promise<DiscoveredSigner[]> {
  console.log(
    '[MuSig2 Plugin] discoverSigners() called with criteria:',
    criteria,
  )

  if (!musig2Coordinator) {
    console.error(
      '[MuSig2 Plugin] discoverSigners() failed: MuSig2 not initialized',
    )
    throw new Error('MuSig2 not initialized')
  }

  const discovery = musig2Coordinator.getDiscovery()
  if (!discovery) {
    console.error(
      '[MuSig2 Plugin] discoverSigners() failed: Discovery layer not available',
    )
    throw new Error('MuSig2 discovery layer not available')
  }

  // Log DHT and cache state for diagnostics
  if (!p2pPlugin) {
    throw new Error('P2P plugin not available')
  }
  const dhtStats = p2pPlugin.getDHTStats()
  console.log('[MuSig2 Plugin] DHT stats before discovery:', {
    isReady: dhtStats.isReady,
    routingTableSize: dhtStats.routingTableSize,
    mode: dhtStats.mode,
  })

  // Log cache state for diagnostics
  const cacheStats = discovery.getCacheStats()
  console.log('[MuSig2 Plugin] Discovery cache stats:', cacheStats)

  const sdkCriteria: Record<string, unknown> = {}
  if (criteria.transactionTypes) {
    sdkCriteria.transactionTypes = _mapTransactionTypes(
      criteria.transactionTypes,
    )
  }
  if (criteria.minAmount !== undefined) {
    sdkCriteria.minAmount = criteria.minAmount
  }
  if (criteria.maxAmount !== undefined) {
    sdkCriteria.maxAmount = criteria.maxAmount
  }

  const signerAds = await discovery.discoverSigners(
    sdkCriteria as Partial<MuSig2SignerCriteriaType>,
  )

  console.log(
    `[MuSig2 Plugin] discoverSigners() returned ${signerAds.length} signers:`,
    signerAds.map(ad => ({
      id: ad.id,
      peerId: ad.peerInfo.peerId,
      nickname: ad.signerMetadata?.nickname,
      expiresAt: new Date(ad.expiresAt).toISOString(),
    })),
  )

  return signerAds.map(ad => _mapSignerAdvertisementToDiscoveredSigner(ad))
}

/**
 * Subscribe to real-time signer discovery
 *
 * @param criteria - Search criteria
 * @param onSignerDiscovered - Callback for each discovered signer
 * @returns Subscription ID for unsubscribing
 */
export async function subscribeToSigners(
  criteria: SignerSearchCriteria,
  onSignerDiscovered: (signer: DiscoveredSigner) => void,
): Promise<string> {
  if (!musig2Coordinator) {
    throw new Error('MuSig2 not initialized')
  }

  const discovery = musig2Coordinator.getDiscovery()
  if (!discovery) {
    throw new Error('MuSig2 discovery layer not available')
  }

  console.log('[MuSig2 Plugin] Subscribing to signers with criteria:', criteria)

  const sdkCriteria: Record<string, unknown> = {}
  if (criteria.transactionTypes) {
    sdkCriteria.transactionTypes = _mapTransactionTypes(
      criteria.transactionTypes,
    )
  }

  const subscriptionId = await discovery.subscribeToSigners(
    sdkCriteria as Partial<MuSig2SignerCriteriaType>,
    (ad: MuSig2SignerAdvertisementType) => {
      console.log('[MuSig2 Plugin] Signer discovered via subscription:', {
        id: ad.id,
        peerId: ad.peerInfo.peerId,
        nickname: ad.signerMetadata?.nickname,
      })
      const signer = _mapSignerAdvertisementToDiscoveredSigner(ad)
      onSignerDiscovered(signer)
    },
  )

  signerSubscriptionId = subscriptionId
  console.log(
    '[MuSig2 Plugin] Subscribed to signers, subscription ID:',
    subscriptionId,
  )
  return subscriptionId
}

/**
 * Unsubscribe from signer discovery
 */
export async function unsubscribeFromSigners(
  subscriptionId: string,
): Promise<void> {
  if (!musig2Coordinator) return

  const discovery = musig2Coordinator.getDiscovery()
  if (!discovery) return

  await discovery.unsubscribe(subscriptionId)

  if (signerSubscriptionId === subscriptionId) {
    signerSubscriptionId = null
  }
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Create a new MuSig2 signing session
 *
 * @param signerPublicKeys - All participating signers' public keys (sorted)
 * @param myPrivateKey - This signer's private key
 * @param message - Message/transaction to sign
 * @param metadata - Optional session metadata
 * @returns Session ID
 */
export async function createSigningSession(
  signerPublicKeys: PublicKeyType[],
  myPrivateKey: PrivateKeyType,
  message: Buffer,
  metadata?: SessionMetadata,
): Promise<string> {
  if (!musig2Coordinator) {
    throw new Error('MuSig2 not initialized')
  }

  const sessionId = await musig2Coordinator.createSession(
    signerPublicKeys,
    myPrivateKey,
    message,
    metadata as Record<string, unknown>,
  )

  console.log(`[MuSig2 Plugin] Created session: ${sessionId}`)
  return sessionId
}

/**
 * Announce a session on GossipSub for peer discovery
 *
 * @param sessionId - Session ID to announce
 */
export async function announceSession(sessionId: string): Promise<void> {
  if (!musig2Coordinator) {
    throw new Error('MuSig2 not initialized')
  }

  await musig2Coordinator.announceSession(sessionId)
  console.log(`[MuSig2 Plugin] Announced session: ${sessionId}`)
}

/**
 * Join an existing session discovered via announcement
 *
 * @param announcement - Session announcement from GossipSub
 * @param myPrivateKey - This signer's private key
 * @returns Session ID
 */
export async function joinSession(
  announcement: SessionAnnouncementType,
  myPrivateKey: PrivateKeyType,
): Promise<string> {
  if (!musig2Coordinator) {
    throw new Error('MuSig2 not initialized')
  }

  const sessionId = await musig2Coordinator.joinSession(
    announcement,
    myPrivateKey,
  )

  console.log(`[MuSig2 Plugin] Joined session: ${sessionId}`)
  return sessionId
}

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): WalletSigningSession | null {
  if (!musig2Coordinator) return null

  const p2pSession = musig2Coordinator.getSession(sessionId)
  if (!p2pSession) return null

  return _mapP2PSessionToWalletSession(p2pSession)
}

/**
 * Get all active sessions
 */
export function getAllSessions(): WalletSigningSession[] {
  if (!musig2Coordinator) return []

  const sessions = musig2Coordinator.getAllSessions()
  return sessions.map(s => _mapP2PSessionToWalletSession(s))
}

// ============================================================================
// MuSig2 Protocol Steps
// ============================================================================

/**
 * Share nonces with other participants (MuSig2 Round 1)
 *
 * @param sessionId - Session ID
 * @param privateKey - This signer's private key
 */
export async function shareNonces(
  sessionId: string,
  privateKey: PrivateKeyType,
): Promise<void> {
  if (!musig2Coordinator) {
    throw new Error('MuSig2 not initialized')
  }

  await musig2Coordinator.shareNonces(sessionId, privateKey)
  console.log(`[MuSig2 Plugin] Shared nonces for session: ${sessionId}`)
}

/**
 * Share partial signature with other participants (MuSig2 Round 2)
 *
 * @param sessionId - Session ID
 * @param privateKey - This signer's private key
 */
export async function sharePartialSignature(
  sessionId: string,
  privateKey: PrivateKeyType,
): Promise<void> {
  if (!musig2Coordinator) {
    throw new Error('MuSig2 not initialized')
  }

  await musig2Coordinator.sharePartialSignature(sessionId, privateKey)
  console.log(
    `[MuSig2 Plugin] Shared partial signature for session: ${sessionId}`,
  )
}

/**
 * Check if session is ready to finalize
 */
export function canFinalizeSession(sessionId: string): boolean {
  if (!musig2Coordinator) return false
  return musig2Coordinator.canFinalizeSession(sessionId)
}

/**
 * Finalize session and get the aggregated signature
 *
 * @param sessionId - Session ID
 * @returns Final aggregated signature
 */
export async function finalizeSession(sessionId: string): Promise<Buffer> {
  if (!musig2Coordinator) {
    throw new Error('MuSig2 not initialized')
  }

  const signature = await musig2Coordinator.finalizeSession(sessionId)
  console.log(`[MuSig2 Plugin] Finalized session: ${sessionId}`)

  return signature
}

/**
 * Abort a session
 *
 * @param sessionId - Session ID
 * @param reason - Abort reason
 */
export async function abortSession(
  sessionId: string,
  reason: string,
): Promise<void> {
  if (!musig2Coordinator) {
    throw new Error('MuSig2 not initialized')
  }

  await musig2Coordinator.abortSession(sessionId, reason)
  console.log(`[MuSig2 Plugin] Aborted session ${sessionId}: ${reason}`)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a PrivateKey object from hex string
 * Utility function for callers that have the key hex
 *
 * @param privateKeyHex - Private key as hex string
 * @returns PrivateKey object
 */
export function createPrivateKey(privateKeyHex: string): PrivateKeyType {
  return new Bitcore.PrivateKey(privateKeyHex) as any
}

/**
 * Create a PublicKey object from hex string
 * Utility function for callers that have the key hex
 *
 * @param publicKeyHex - Public key as hex string
 * @returns PublicKey object
 */
export function createPublicKey(publicKeyHex: string): PublicKeyType {
  return new Bitcore.PublicKey(publicKeyHex) as any
}

/**
 * Check if MuSig2 is initialized
 */
export function isMuSig2Initialized(): boolean {
  return musig2Coordinator !== null
}

/**
 * Check if discovery layer is available
 */
export function hasDiscovery(): boolean {
  return musig2Coordinator?.hasDiscovery() ?? false
}

/**
 * Get the underlying MuSig2P2PCoordinator (for advanced usage)
 */
export function getMuSig2Coordinator(): MuSig2P2PCoordinatorType | null {
  return musig2Coordinator
}

/**
 * Subscribe to MuSig2 events (for store integration)
 */
export function subscribeToMuSig2Events(callbacks: MuSig2EventCallbacks): void {
  eventCallbacks = { ...eventCallbacks, ...callbacks }
}

/**
 * Unsubscribe from MuSig2 events
 */
export function unsubscribeFromMuSig2Events(): void {
  eventCallbacks = {}
}

// ============================================================================
// Session Connectivity
// ============================================================================

/**
 * Peer context for connectivity checks
 * Passed from store to avoid plugin importing stores
 */
export interface PeerContext {
  myPeerId: string
  onlinePeers: Array<{
    peerId: string
    connectionStatus?: string
    connectionType?: 'webrtc' | 'relay' | 'direct'
    relayAddrs?: string[]
  }>
}

/**
 * Ensure all session participants are connected before proceeding
 *
 * @param participantPeerIds - Array of participant peer IDs
 * @param peerContext - Current peer context (from store)
 * @returns Connection results for each participant
 */
export async function ensureParticipantsConnected(
  participantPeerIds: string[],
  peerContext: PeerContext,
): Promise<{
  allConnected: boolean
  results: Map<string, ParticipantConnectionResult>
}> {
  if (!p2pPlugin) {
    throw new Error('P2P plugin not available')
  }

  const results = new Map<string, ParticipantConnectionResult>()

  let allConnected = true

  for (const peerId of participantPeerIds) {
    // Skip self
    if (peerId === peerContext.myPeerId) {
      results.set(peerId, { connected: true, connectionType: 'direct' })
      continue
    }

    // Find peer in online peers
    const presence = peerContext.onlinePeers.find(p => p.peerId === peerId)

    if (!presence) {
      results.set(peerId, { connected: false, error: 'Peer not discovered' })
      allConnected = false
      continue
    }

    // Check if already connected
    if (presence.connectionStatus === 'connected') {
      results.set(peerId, {
        connected: true,
        connectionType: presence.connectionType,
      })
      continue
    }

    // Attempt connection via P2P plugin
    console.log(`[MuSig2] Connecting to participant ${peerId}...`)
    const result = await p2pPlugin.connectWithRetry(presence as any, {
      maxRetries: 3,
      initialDelayMs: 1000,
    })

    if (result.success) {
      results.set(peerId, {
        connected: true,
        connectionType: result.connectionType,
      })
    } else {
      results.set(peerId, {
        connected: false,
        error: result.error,
      })
      allConnected = false
    }
  }

  return { allConnected, results }
}

/**
 * Pre-flight check before starting a signing session
 *
 * @param sharedWallet - The shared wallet to check participants for
 * @param peerContext - Current peer context (from store)
 * @returns Pre-flight result with connectivity status
 */
export async function preflightSigningSession(
  sharedWallet: {
    participants: Array<{ peerId?: string; nickname?: string }>
  },
  peerContext: PeerContext,
): Promise<PreflightResult> {
  const participantPeerIds = sharedWallet.participants
    .map(p => p.peerId)
    .filter((id): id is string => !!id)

  if (participantPeerIds.length === 0) {
    return {
      ready: false,
      connectedCount: 0,
      totalParticipants: sharedWallet.participants.length,
      disconnectedParticipants: [],
      error: 'No participants have peer IDs',
    }
  }

  const { allConnected, results } = await ensureParticipantsConnected(
    participantPeerIds,
    peerContext,
  )

  const disconnectedParticipants: string[] = []
  let connectedCount = 0

  for (const [peerId, result] of results) {
    if (result.connected) {
      connectedCount++
    } else {
      // Find participant name for better error message
      const participant = sharedWallet.participants.find(
        p => p.peerId === peerId,
      )
      disconnectedParticipants.push(participant?.nickname || peerId.slice(0, 8))
    }
  }

  return {
    ready: allConnected,
    connectedCount,
    totalParticipants: participantPeerIds.length,
    disconnectedParticipants,
    error: allConnected
      ? undefined
      : `Cannot reach: ${disconnectedParticipants.join(', ')}`,
  }
}

/**
 * Session initiation context
 * Passed from store to avoid plugin importing stores
 */
export interface SessionInitContext {
  signingContext: SignerSigningContext
  peerContext: PeerContext
}

/**
 * Initiate a MuSig2 signing session with connectivity check
 *
 * @param sharedWallet - The shared wallet for the session
 * @param message - Message/transaction to sign
 * @param initContext - Session initialization context (signing keys and peer info)
 * @param options - Session options
 * @returns Session initiation result
 */
export async function initiateSigningSession(
  sharedWallet: {
    id: string
    participants: Array<{
      peerId?: string
      publicKeyHex: string
      nickname?: string
    }>
  },
  message: Buffer,
  initContext: SessionInitContext,
  options: {
    skipConnectivityCheck?: boolean
    metadata?: SessionMetadata
  } = {},
): Promise<{
  success: boolean
  sessionId?: string
  error?: string
}> {
  // Step 1: Verify connectivity (unless skipped)
  if (!options.skipConnectivityCheck) {
    console.log('[MuSig2] Running pre-flight connectivity check...')

    const preflight = await preflightSigningSession(
      sharedWallet,
      initContext.peerContext,
    )

    if (!preflight.ready) {
      console.warn('[MuSig2] Pre-flight failed:', preflight.error)
      return {
        success: false,
        error: preflight.error,
      }
    }

    console.log(
      `[MuSig2] All ${preflight.connectedCount} participants connected`,
    )
  }

  // Step 2: Create and announce session
  try {
    if (!musig2Coordinator) {
      return { success: false, error: 'MuSig2 coordinator not initialized' }
    }

    // Convert participant public keys to PublicKey objects
    const publicKeys = sharedWallet.participants.map(
      p => new Bitcore.PublicKey(p.publicKeyHex) as any,
    )

    // Create private key from context
    const privateKey = createPrivateKey(
      initContext.signingContext.privateKeyHex,
    )

    // Create session with metadata including wallet ID
    const sessionId = await createSigningSession(
      publicKeys,
      privateKey,
      message,
      {
        ...options.metadata,
        walletId: sharedWallet.id,
      } as SessionMetadata,
    )

    // Announce session to participants
    await announceSession(sessionId)

    console.log(`[MuSig2] Session created and announced: ${sessionId}`)

    return { success: true, sessionId }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[MuSig2] Failed to create session:', error)
    return { success: false, error: errorMsg }
  }
}

/**
 * Callbacks for session connection failure handling
 * Used to notify store of connection status changes
 */
export interface SessionConnectionCallbacks {
  onParticipantDisconnected: (sessionId: string, peerId: string) => void
  onParticipantReconnected: (sessionId: string, peerId: string) => void
}

/**
 * Handle connection failure during active session
 *
 * @param sessionId - The session ID
 * @param failedPeerId - The peer ID that failed
 * @param peerContext - Current peer context
 * @param callbacks - Callbacks to notify store of status changes
 */
export async function handleSessionConnectionFailure(
  sessionId: string,
  failedPeerId: string,
  peerContext: PeerContext,
  callbacks: SessionConnectionCallbacks,
): Promise<void> {
  // Notify store of disconnection
  callbacks.onParticipantDisconnected(sessionId, failedPeerId)

  // Find peer in online peers
  const presence = peerContext.onlinePeers.find(p => p.peerId === failedPeerId)

  if (presence && p2pPlugin) {
    console.log(`[MuSig2] Attempting to reconnect to ${failedPeerId}...`)

    const result = await p2pPlugin.connectWithRetry(presence as any, {
      maxRetries: 2,
    })

    if (result.success) {
      callbacks.onParticipantReconnected(sessionId, failedPeerId)
      console.log(`[MuSig2] Reconnected to ${failedPeerId}`)
    } else {
      console.warn(`[MuSig2] Failed to reconnect to ${failedPeerId}`)
    }
  }
}

/**
 * Session monitoring context
 * Provides session and peer state for monitoring
 */
export interface SessionMonitorContext {
  getSession: (sessionId: string) => WalletSigningSession | null
  getPeerContext: () => PeerContext
  callbacks: SessionConnectionCallbacks
}

/**
 * Monitor session participant connections
 *
 * @param sessionId - The session ID to monitor
 * @param monitorContext - Context providing session and peer state
 * @returns Cleanup function to stop monitoring
 */
export function monitorSessionConnections(
  sessionId: string,
  monitorContext: SessionMonitorContext,
): () => void {
  let isMonitoring = true
  let intervalId: ReturnType<typeof setInterval> | null = null

  const checkConnections = async () => {
    if (!isMonitoring) return

    const session = monitorContext.getSession(sessionId)
    if (!session) {
      // Session no longer exists, stop monitoring
      if (intervalId) clearInterval(intervalId)
      return
    }

    const peerContext = monitorContext.getPeerContext()

    for (const participant of session.participants) {
      // Skip self
      if (participant.peerId === peerContext.myPeerId) continue

      const peer = peerContext.onlinePeers.find(
        p => p.peerId === participant.peerId,
      )

      if (!peer || peer.connectionStatus === 'failed') {
        await handleSessionConnectionFailure(
          sessionId,
          participant.peerId,
          peerContext,
          monitorContext.callbacks,
        )
      }
    }
  }

  // Check connections every 5 seconds
  intervalId = setInterval(checkConnections, 5000)

  // Initial check
  checkConnections()

  // Return cleanup function
  return () => {
    isMonitoring = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
}

// ============================================================================
// Nuxt Plugin Definition
// ============================================================================

export default defineNuxtPlugin({
  name: 'musig2',
  dependsOn: ['p2p', 'discovery-cache'],
  setup(nuxtApp) {
    // Store references to dependent plugins for use in exported functions
    // Type assertions needed because NuxtApp types may not be fully resolved at this point
    p2pPlugin = (nuxtApp as any).$p2p
    discoveryCachePlugin = (nuxtApp as any).$discoveryCache

    console.log('[MuSig2 Plugin] Ready (lazy initialization)')

    return {
      provide: {
        musig2: {
          initialize: initializeMuSig2,
          cleanup: cleanupMuSig2,
          startSignerAdvertising,
          stopSignerAdvertising,
          isCurrentlyAdvertising,
          discoverSigners,
          subscribeToSigners,
          unsubscribeFromSigners,
          createSigningSession,
          announceSession,
          joinSession,
          getSession,
          getAllSessions,
          shareNonces,
          sharePartialSignature,
          canFinalizeSession,
          finalizeSession,
          abortSession,
          createPrivateKey,
          createPublicKey,
          isInitialized: isMuSig2Initialized,
          hasDiscovery,
          getCoordinator: getMuSig2Coordinator,
          subscribeToEvents: subscribeToMuSig2Events,
          unsubscribeFromEvents: unsubscribeFromMuSig2Events,
          ensureParticipantsConnected,
          preflightSigningSession,
          initiateSigningSession,
          handleSessionConnectionFailure,
          monitorSessionConnections,
        },
      },
    }
  },
})

// ============================================================================
// Type Augmentation
// ============================================================================

declare module '#app' {
  interface NuxtApp {
    $musig2: {
      initialize: typeof initializeMuSig2
      cleanup: typeof cleanupMuSig2
      startSignerAdvertising: typeof startSignerAdvertising
      stopSignerAdvertising: typeof stopSignerAdvertising
      isCurrentlyAdvertising: typeof isCurrentlyAdvertising
      discoverSigners: typeof discoverSigners
      subscribeToSigners: typeof subscribeToSigners
      unsubscribeFromSigners: typeof unsubscribeFromSigners
      createSigningSession: typeof createSigningSession
      announceSession: typeof announceSession
      joinSession: typeof joinSession
      getSession: typeof getSession
      getAllSessions: typeof getAllSessions
      shareNonces: typeof shareNonces
      sharePartialSignature: typeof sharePartialSignature
      canFinalizeSession: typeof canFinalizeSession
      finalizeSession: typeof finalizeSession
      abortSession: typeof abortSession
      createPrivateKey: typeof createPrivateKey
      createPublicKey: typeof createPublicKey
      isInitialized: typeof isMuSig2Initialized
      hasDiscovery: typeof hasDiscovery
      getCoordinator: typeof getMuSig2Coordinator
      subscribeToEvents: typeof subscribeToMuSig2Events
      unsubscribeFromEvents: typeof unsubscribeFromMuSig2Events
      ensureParticipantsConnected: typeof ensureParticipantsConnected
      preflightSigningSession: typeof preflightSigningSession
      initiateSigningSession: typeof initiateSigningSession
      handleSessionConnectionFailure: typeof handleSessionConnectionFailure
      monitorSessionConnections: typeof monitorSessionConnections
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $musig2: {
      initialize: typeof initializeMuSig2
      cleanup: typeof cleanupMuSig2
      startSignerAdvertising: typeof startSignerAdvertising
      stopSignerAdvertising: typeof stopSignerAdvertising
      isCurrentlyAdvertising: typeof isCurrentlyAdvertising
      discoverSigners: typeof discoverSigners
      subscribeToSigners: typeof subscribeToSigners
      unsubscribeFromSigners: typeof unsubscribeFromSigners
      createSigningSession: typeof createSigningSession
      announceSession: typeof announceSession
      joinSession: typeof joinSession
      getSession: typeof getSession
      getAllSessions: typeof getAllSessions
      shareNonces: typeof shareNonces
      sharePartialSignature: typeof sharePartialSignature
      canFinalizeSession: typeof canFinalizeSession
      finalizeSession: typeof finalizeSession
      abortSession: typeof abortSession
      createPrivateKey: typeof createPrivateKey
      createPublicKey: typeof createPublicKey
      isInitialized: typeof isMuSig2Initialized
      hasDiscovery: typeof hasDiscovery
      getCoordinator: typeof getMuSig2Coordinator
      subscribeToEvents: typeof subscribeToMuSig2Events
      unsubscribeFromEvents: typeof unsubscribeFromMuSig2Events
      ensureParticipantsConnected: typeof ensureParticipantsConnected
      preflightSigningSession: typeof preflightSigningSession
      initiateSigningSession: typeof initiateSigningSession
      handleSessionConnectionFailure: typeof handleSessionConnectionFailure
      monitorSessionConnections: typeof monitorSessionConnections
    }
  }
}
