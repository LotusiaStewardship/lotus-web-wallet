/**
 * MuSig2 Coordinator Composable
 *
 * Provides reactive access to the MuSig2 coordinator for multi-signature operations.
 * This composable wraps the plugin-provided functions with reactive state.
 *
 * Usage:
 * ```typescript
 * const musig2 = useMuSig2Coordinator()
 *
 * // Check initialization status (reactive)
 * if (musig2.isInitialized.value) { ... }
 *
 * // Initialize MuSig2
 * await musig2.initialize(callbacks)
 *
 * // Discover signers
 * const signers = await musig2.discoverSigners()
 * ```
 */
import type { DiscoveredSigner } from '~/types/musig2'
import type {
  MuSig2EventCallbacks,
  SignerAdvertisingOptions,
  SignerSearchCriteria,
  SessionMetadata,
  WalletSigningSession,
  WalletSessionParticipant,
  ParticipantConnectionResult,
  PreflightResult,
  PublicKeyType,
  PrivateKeyType,
  SessionAnnouncementType,
} from '~/plugins/05.musig2.client'

// Re-export types for convenience
export type {
  MuSig2EventCallbacks,
  SignerAdvertisingOptions,
  SignerSearchCriteria,
  SessionMetadata,
  WalletSigningSession,
  WalletSessionParticipant,
  ParticipantConnectionResult,
  PreflightResult,
  PublicKeyType,
  PrivateKeyType,
  SessionAnnouncementType,
} from '~/plugins/05.musig2.client'

// Re-export functions for backward compatibility (direct imports)
// NOTE: Some functions now require additional context parameters - see plugin for details
export {
  initializeMuSig2,
  cleanupMuSig2,
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
  isMuSig2Initialized,
  hasDiscovery,
  getMuSig2Coordinator,
  subscribeToMuSig2Events,
  unsubscribeFromMuSig2Events,
  ensureParticipantsConnected,
  preflightSigningSession,
  initiateSigningSession,
  handleSessionConnectionFailure,
  monitorSessionConnections,
} from '~/plugins/05.musig2.client'

// Import new types needed for the updated API
import type {
  SignerSigningContext,
  PeerContext,
  SessionInitContext,
  SessionConnectionCallbacks,
  SessionMonitorContext,
} from '~/plugins/05.musig2.client'

// Re-export new types
export type {
  SignerSigningContext,
  PeerContext,
  SessionInitContext,
  SessionConnectionCallbacks,
  SessionMonitorContext,
}

/**
 * MuSig2 Coordinator Composable
 *
 * Provides reactive access to the MuSig2 coordinator.
 */
export function useMuSig2Coordinator() {
  const { $musig2 } = useNuxtApp()

  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Whether MuSig2 is initialized */
  const isInitialized = computed(() => $musig2.isInitialized())

  /** Whether discovery layer is available */
  const hasDiscoveryLayer = computed(() => $musig2.hasDiscovery())

  /** Whether currently advertising as a signer */
  const isAdvertising = computed(() => $musig2.isCurrentlyAdvertising())

  /** All active sessions */
  const activeSessions = computed(() => $musig2.getAllSessions())

  // ============================================================================
  // Methods (delegated to plugin)
  // ============================================================================

  /**
   * Initialize the MuSig2 service
   */
  async function initialize(
    callbacks: MuSig2EventCallbacks = {},
    discoveryConfig?: Record<string, unknown>,
  ): Promise<void> {
    return $musig2.initialize(callbacks, discoveryConfig)
  }

  /**
   * Cleanup the MuSig2 service
   */
  async function cleanup(): Promise<void> {
    return $musig2.cleanup()
  }

  /**
   * Start advertising as an available signer
   * @param signingContext - Signing keys (privateKeyHex, publicKeyHex)
   * @param options - Advertising options
   */
  async function startSignerAdvertising(
    signingContext: SignerSigningContext,
    options?: SignerAdvertisingOptions,
  ): Promise<string> {
    return $musig2.startSignerAdvertising(signingContext, options)
  }

  /**
   * Stop advertising as a signer
   */
  async function stopSignerAdvertising(): Promise<void> {
    return $musig2.stopSignerAdvertising()
  }

  /**
   * Discover available signers on the network
   */
  async function discoverSigners(
    criteria?: SignerSearchCriteria,
  ): Promise<DiscoveredSigner[]> {
    return $musig2.discoverSigners(criteria)
  }

  /**
   * Subscribe to real-time signer discovery
   */
  async function subscribeToSigners(
    criteria: SignerSearchCriteria,
    onSignerDiscovered: (signer: DiscoveredSigner) => void,
  ): Promise<string> {
    return $musig2.subscribeToSigners(criteria, onSignerDiscovered)
  }

  /**
   * Unsubscribe from signer discovery
   */
  async function unsubscribeFromSigners(subscriptionId: string): Promise<void> {
    return $musig2.unsubscribeFromSigners(subscriptionId)
  }

  /**
   * Create a new MuSig2 signing session
   */
  async function createSigningSession(
    signerPublicKeys: PublicKeyType[],
    myPrivateKey: PrivateKeyType,
    message: Buffer,
    metadata?: SessionMetadata,
  ): Promise<string> {
    return $musig2.createSigningSession(
      signerPublicKeys,
      myPrivateKey,
      message,
      metadata,
    )
  }

  /**
   * Announce a session on GossipSub
   */
  async function announceSession(sessionId: string): Promise<void> {
    return $musig2.announceSession(sessionId)
  }

  /**
   * Join an existing session
   */
  async function joinSession(
    announcement: SessionAnnouncementType,
    myPrivateKey: PrivateKeyType,
  ): Promise<string> {
    return $musig2.joinSession(announcement, myPrivateKey)
  }

  /**
   * Get a session by ID
   */
  function getSession(sessionId: string): WalletSigningSession | null {
    return $musig2.getSession(sessionId)
  }

  /**
   * Get all active sessions
   */
  function getAllSessions(): WalletSigningSession[] {
    return $musig2.getAllSessions()
  }

  /**
   * Share nonces with other participants (MuSig2 Round 1)
   */
  async function shareNonces(
    sessionId: string,
    privateKey: PrivateKeyType,
  ): Promise<void> {
    return $musig2.shareNonces(sessionId, privateKey)
  }

  /**
   * Share partial signature with other participants (MuSig2 Round 2)
   */
  async function sharePartialSignature(
    sessionId: string,
    privateKey: PrivateKeyType,
  ): Promise<void> {
    return $musig2.sharePartialSignature(sessionId, privateKey)
  }

  /**
   * Check if session is ready to finalize
   */
  function canFinalizeSession(sessionId: string): boolean {
    return $musig2.canFinalizeSession(sessionId)
  }

  /**
   * Finalize session and get the aggregated signature
   */
  async function finalizeSession(sessionId: string): Promise<Buffer> {
    return $musig2.finalizeSession(sessionId)
  }

  /**
   * Abort a session
   */
  async function abortSession(
    sessionId: string,
    reason: string,
  ): Promise<void> {
    return $musig2.abortSession(sessionId, reason)
  }

  /**
   * Create a PrivateKey object from hex string
   */
  function createPrivateKey(privateKeyHex: string): PrivateKeyType {
    return $musig2.createPrivateKey(privateKeyHex)
  }

  /**
   * Create a PublicKey object from hex string
   */
  function createPublicKey(publicKeyHex: string): PublicKeyType {
    return $musig2.createPublicKey(publicKeyHex)
  }

  /**
   * Get the underlying MuSig2P2PCoordinator
   */
  function getCoordinator() {
    return $musig2.getCoordinator()
  }

  /**
   * Subscribe to MuSig2 events
   */
  function subscribeToEvents(callbacks: MuSig2EventCallbacks): void {
    return $musig2.subscribeToEvents(callbacks)
  }

  /**
   * Unsubscribe from MuSig2 events
   */
  function unsubscribeFromEvents(): void {
    return $musig2.unsubscribeFromEvents()
  }

  /**
   * Ensure all session participants are connected
   * @param participantPeerIds - Array of participant peer IDs
   * @param peerContext - Current peer context (from store)
   */
  async function ensureParticipantsConnected(
    participantPeerIds: string[],
    peerContext: PeerContext,
  ) {
    return $musig2.ensureParticipantsConnected(participantPeerIds, peerContext)
  }

  /**
   * Pre-flight check before starting a signing session
   * @param sharedWallet - Shared wallet with participants
   * @param peerContext - Current peer context (from store)
   */
  async function preflightSigningSession(
    sharedWallet: {
      participants: Array<{ peerId?: string; nickname?: string }>
    },
    peerContext: PeerContext,
  ): Promise<PreflightResult> {
    return $musig2.preflightSigningSession(sharedWallet, peerContext)
  }

  /**
   * Initiate a MuSig2 signing session with connectivity check
   * @param sharedWallet - Shared wallet for the session
   * @param message - Message/transaction to sign
   * @param initContext - Session initialization context (signing keys and peer info)
   * @param options - Session options
   */
  async function initiateSigningSession(
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
    options?: {
      skipConnectivityCheck?: boolean
      metadata?: SessionMetadata
    },
  ) {
    return $musig2.initiateSigningSession(
      sharedWallet,
      message,
      initContext,
      options,
    )
  }

  /**
   * Handle connection failure during active session
   * @param sessionId - Session ID
   * @param failedPeerId - Peer ID that failed
   * @param peerContext - Current peer context
   * @param callbacks - Callbacks to notify store of status changes
   */
  async function handleSessionConnectionFailure(
    sessionId: string,
    failedPeerId: string,
    peerContext: PeerContext,
    callbacks: SessionConnectionCallbacks,
  ): Promise<void> {
    return $musig2.handleSessionConnectionFailure(
      sessionId,
      failedPeerId,
      peerContext,
      callbacks,
    )
  }

  /**
   * Monitor session participant connections
   * @param sessionId - Session ID to monitor
   * @param monitorContext - Context providing session and peer state
   */
  function monitorSessionConnections(
    sessionId: string,
    monitorContext: SessionMonitorContext,
  ): () => void {
    return $musig2.monitorSessionConnections(sessionId, monitorContext)
  }

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Reactive state
    isInitialized,
    hasDiscoveryLayer,
    isAdvertising,
    activeSessions,

    // Lifecycle
    initialize,
    cleanup,

    // Signer advertising
    startSignerAdvertising,
    stopSignerAdvertising,

    // Signer discovery
    discoverSigners,
    subscribeToSigners,
    unsubscribeFromSigners,

    // Session management
    createSigningSession,
    announceSession,
    joinSession,
    getSession,
    getAllSessions,

    // Protocol steps
    shareNonces,
    sharePartialSignature,
    canFinalizeSession,
    finalizeSession,
    abortSession,

    // Utility
    createPrivateKey,
    createPublicKey,
    getCoordinator,

    // Event subscription
    subscribeToEvents,
    unsubscribeFromEvents,

    // Session connectivity
    ensureParticipantsConnected,
    preflightSigningSession,
    initiateSigningSession,
    handleSessionConnectionFailure,
    monitorSessionConnections,
  }
}
