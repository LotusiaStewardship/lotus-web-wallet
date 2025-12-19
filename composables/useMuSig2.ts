/**
 * MuSig2 Composable
 *
 * Phase 9.9.1: Complete refactor to delegate to useMuSig2Store()
 *
 * This composable is a thin wrapper around the MuSig2 store that:
 * 1. Provides reactive computed properties derived from store state
 * 2. Delegates all actions to the store
 * 3. Exports UI types for component use
 *
 * The store (stores/musig2.ts) is the single source of truth for:
 * - discoveredSigners, activeSessions, pendingSessions
 * - Signer advertisement state
 * - Shared wallet management
 *
 * Architecture:
 * - Composable: Thin reactive wrapper for component use
 * - Store: State management and service coordination
 * - Service (services/musig2.ts): SDK interaction layer
 *
 * Usage:
 * ```typescript
 * const {
 *   isInitialized,
 *   discoveredSigners,
 *   activeSessions,
 *   initialize,
 *   advertiseSigner,
 * } = useMuSig2()
 * ```
 */
import { computed, type ComputedRef } from 'vue'
import {
  useMuSig2Store,
  type StoreSigner,
  type SignerConfig,
} from '~/stores/musig2'
import { useP2PStore } from '~/stores/p2p'
import type { WalletSigningSession } from '~/plugins/05.musig2.client'

// ============================================================================
// UI Types (Exported for component use)
// ============================================================================

/**
 * UI-friendly MuSig2 signer representation
 * Maps from StoreSigner in the store
 */
export interface UISignerAdvertisement {
  /** Unique advertisement ID */
  id: string
  /** libp2p peer ID */
  peerId: string
  /** Multiaddresses for connection */
  multiaddrs: string[]
  /** Public key as hex string */
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
 * Signing session phase - maps from WalletSigningSession.state
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
 * Derived from WalletSigningSession in the store
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
 * Derived from pending sessions where we're not the initiator
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
 * Maps to SignerConfig in the store
 */
export interface MuSig2SignerConfig {
  publicKeyHex?: string
  transactionTypes: string[]
  amountRange?: { min?: number; max?: number }
  nickname: string
  description?: string
  fee?: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map store session state to UI phase
 */
function mapSessionStateToPhase(state: string): SigningSessionPhase {
  switch (state) {
    case 'created':
    case 'key_aggregation':
    case 'keys_aggregated':
      return SigningSessionPhase.WAITING_FOR_PARTICIPANTS
    case 'nonce_exchange':
    case 'nonces_exchanged':
      return SigningSessionPhase.NONCE_EXCHANGE
    case 'signing':
      return SigningSessionPhase.SIGNATURE_EXCHANGE
    case 'completed':
      return SigningSessionPhase.COMPLETE
    case 'failed':
    case 'cancelled':
      return SigningSessionPhase.ABORTED
    default:
      return SigningSessionPhase.WAITING_FOR_PARTICIPANTS
  }
}

/**
 * Map StoreSigner to UISignerAdvertisement
 */
function mapSignerToUI(signer: StoreSigner): UISignerAdvertisement {
  return {
    id: signer.id,
    peerId: signer.peerId,
    multiaddrs: [],
    publicKeyHex: signer.publicKey,
    transactionTypes: Object.entries(signer.capabilities)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => type),
    amountRange: undefined,
    nickname: signer.nickname,
    description: undefined,
    fee: undefined,
    averageResponseTime: signer.responseTime,
    reputation: signer.reputation ?? 0,
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000,
    identity: undefined,
  }
}

/**
 * Map WalletSigningSession to UISigningSession
 */
function mapSessionToUI(session: WalletSigningSession): UISigningSession {
  const joinedCount =
    session.participants.filter(p => p.hasNonce || p.hasPartialSig).length ||
    session.participants.length
  const noncesCollected = session.participants.filter(p => p.hasNonce).length
  const partialSigsCollected = session.participants.filter(
    p => p.hasPartialSig,
  ).length

  return {
    id: session.id,
    phase: mapSessionStateToPhase(session.state),
    isCoordinator: session.isInitiator,
    coordinatorPeerId: session.coordinatorPeerId,
    totalSigners: session.participants.length,
    joinedCount,
    noncesCollected,
    partialSigsCollected,
    messageHash: session.messageHex || '',
    finalSignature: undefined,
    error: undefined,
    createdAt: session.createdAt,
    lastActivity: session.updatedAt,
    metadata: session.metadata,
  }
}

/**
 * Map WalletSigningSession to UIIncomingSigningRequest
 */
function mapSessionToRequest(
  session: WalletSigningSession,
): UIIncomingSigningRequest {
  return {
    id: `req-${session.id}`,
    sessionId: session.id,
    requesterPeerId: session.coordinatorPeerId,
    requesterNickname: undefined,
    messageHash: session.messageHex || '',
    requiredSigners: session.participants.length,
    transactionType: session.metadata?.transactionType as string | undefined,
    amount: session.metadata?.amount as number | undefined,
    purpose: session.metadata?.purpose as string | undefined,
    timestamp: session.createdAt,
    expiresAt: session.expiresAt,
  }
}

// ============================================================================
// Composable
// ============================================================================

export function useMuSig2() {
  const musig2Store = useMuSig2Store()
  const p2pStore = useP2PStore()

  // ========================================================================
  // Computed State (Derived from store)
  // ========================================================================

  const isInitialized: ComputedRef<boolean> = computed(
    () => musig2Store.initialized,
  )

  const isInitializing: ComputedRef<boolean> = computed(
    () => musig2Store.loading,
  )

  const error: ComputedRef<string | null> = computed(() => musig2Store.error)

  /**
   * Discovered signers mapped to UI format
   */
  const discoveredSigners: ComputedRef<UISignerAdvertisement[]> = computed(() =>
    musig2Store.discoveredSigners.map(mapSignerToUI),
  )

  /**
   * My signer config if advertising
   */
  const mySignerConfig: ComputedRef<MuSig2SignerConfig | null> = computed(
    () => musig2Store.signerConfig,
  )

  /**
   * Active sessions as a Map for backward compatibility
   */
  const activeSessions: ComputedRef<Map<string, UISigningSession>> = computed(
    () => {
      const map = new Map<string, UISigningSession>()
      for (const session of musig2Store.activeSessions) {
        map.set(session.id, mapSessionToUI(session))
      }
      return map
    },
  )

  /**
   * Incoming requests (pending sessions where we're not the initiator)
   */
  const incomingRequests: ComputedRef<UIIncomingSigningRequest[]> = computed(
    () =>
      musig2Store.pendingSessions
        .filter(s => !s.isInitiator)
        .map(mapSessionToRequest),
  )

  // ========================================================================
  // Computed Helpers
  // ========================================================================

  const signerCount: ComputedRef<number> = computed(
    () => musig2Store.discoveredSigners.length,
  )

  const activeSessionCount: ComputedRef<number> = computed(
    () => musig2Store.activeSessions.length,
  )

  const pendingRequestCount: ComputedRef<number> = computed(
    () => incomingRequests.value.length,
  )

  const isAdvertisingSigner: ComputedRef<boolean> = computed(
    () => musig2Store.signerEnabled,
  )

  const activeSessionsList: ComputedRef<UISigningSession[]> = computed(() =>
    Array.from(activeSessions.value.values()),
  )

  // ========================================================================
  // Actions (Delegate to store)
  // ========================================================================

  /**
   * Initialize MuSig2 - delegates to store
   */
  async function initialize(): Promise<void> {
    await musig2Store.initialize()
  }

  /**
   * Cleanup MuSig2 - delegates to store
   */
  async function cleanup(): Promise<void> {
    await musig2Store.cleanup()
  }

  /**
   * Subscribe to signer discovery - delegates to store
   */
  async function subscribeToSigners(criteria?: {
    transactionTypes?: string[]
    minAmount?: number
    maxAmount?: number
  }): Promise<string | null> {
    await musig2Store.startSignerSubscription(criteria)
    return musig2Store.signerSubscriptionId
  }

  /**
   * Discover signers (one-time query) - delegates to store
   */
  async function discoverSigners(_criteria?: {
    transactionTypes?: string[]
    minAmount?: number
    maxAmount?: number
  }): Promise<UISignerAdvertisement[]> {
    await musig2Store.refreshSigners()
    return discoveredSigners.value
  }

  /**
   * Advertise as a signer - delegates to store
   */
  async function advertiseSigner(config: MuSig2SignerConfig): Promise<void> {
    await musig2Store.advertiseSigner({
      nickname: config.nickname,
      transactionTypes: config.transactionTypes as any[],
      amountRange: config.amountRange,
      fee: config.fee,
    })
  }

  /**
   * Withdraw signer advertisement - delegates to store
   */
  async function withdrawSigner(): Promise<void> {
    await musig2Store.withdrawSigner()
  }

  /**
   * Abort a signing session - delegates to store
   */
  async function abortSession(
    sessionId: string,
    reason: string,
  ): Promise<void> {
    await musig2Store.abortSession(sessionId, reason)
  }

  /**
   * Accept an incoming signing request - delegates to store
   */
  async function acceptRequest(requestId: string): Promise<string | null> {
    // Extract session ID from request ID (format: req-{sessionId})
    const sessionId = requestId.replace('req-', '')
    await musig2Store.acceptRequest(sessionId)
    return sessionId
  }

  /**
   * Decline an incoming signing request - delegates to store
   */
  function declineRequest(requestId: string): void {
    const sessionId = requestId.replace('req-', '')
    musig2Store.rejectRequest(sessionId)
  }

  /**
   * Send a signing request to a specific signer
   * Note: This creates a spend proposal via the store
   */
  async function sendSigningRequest(
    targetSignerPublicKeyHex: string,
    options: {
      transactionType: string
      amount: number
      purpose?: string
    },
  ): Promise<string> {
    // Find the signer's peer ID from discovered signers
    const signer = musig2Store.discoveredSigners.find(
      s => s.publicKey === targetSignerPublicKeyHex,
    )

    if (!signer) {
      throw new Error('Signer not found in discovered signers')
    }

    // For now, we don't have a direct signing request mechanism in the store
    // This would need to be implemented as part of the session creation flow
    console.warn(
      '[useMuSig2] sendSigningRequest: Direct signing requests not yet implemented in store',
    )
    throw new Error(
      'Direct signing requests not yet implemented - use proposeSpend for shared wallets',
    )
  }

  /**
   * Create a new signing session
   * Note: For shared wallets, use musig2Store.proposeSpend() instead
   */
  async function createSession(
    _signerPublicKeys: string[],
    _message: string | Buffer,
    _metadata?: Record<string, unknown>,
  ): Promise<string | null> {
    console.warn(
      '[useMuSig2] createSession: Use musig2Store.proposeSpend() for shared wallet transactions',
    )
    throw new Error(
      'Direct session creation not supported - use proposeSpend for shared wallets',
    )
  }

  /**
   * Join an existing signing session
   * Note: Use acceptRequest() for incoming requests
   */
  async function joinSession(_announcement: {
    sessionId: string
    coordinatorPeerId: string
    signers: string[]
    messageHash: string
    requiredSigners: number
    createdAt: number
    expiresAt: number
    metadata?: Record<string, unknown>
  }): Promise<string | null> {
    console.warn(
      '[useMuSig2] joinSession: Use acceptRequest() for incoming signing requests',
    )
    throw new Error('Direct session joining not supported - use acceptRequest')
  }

  // ========================================================================
  // Return
  // ========================================================================

  return {
    // State (computed from store)
    isInitialized,
    isInitializing,
    error,
    discoveredSigners,
    mySignerConfig,
    activeSessions,
    incomingRequests,

    // Computed helpers
    signerCount,
    activeSessionCount,
    pendingRequestCount,
    isAdvertisingSigner,
    activeSessionsList,

    // Actions (delegate to store)
    initialize,
    cleanup,
    subscribeToSigners,
    discoverSigners,
    advertiseSigner,
    withdrawSigner,
    abortSession,
    acceptRequest,
    declineRequest,

    // Legacy actions (throw with guidance)
    sendSigningRequest,
    createSession,
    joinSession,
  }
}
