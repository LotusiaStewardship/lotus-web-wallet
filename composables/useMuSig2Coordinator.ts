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
  getMuSig2SigningKey,
  getMuSig2PrivateKey,
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
   */
  async function startSignerAdvertising(
    publicKey: PublicKeyType | string,
    options?: SignerAdvertisingOptions,
  ): Promise<string> {
    return $musig2.startSignerAdvertising(publicKey, options)
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
   * Get the MuSig2 signing key for the current wallet
   */
  async function getMuSig2SigningKey() {
    return $musig2.getMuSig2SigningKey()
  }

  /**
   * Get the MuSig2 private key as a PrivateKey object
   */
  async function getMuSig2PrivateKey() {
    return $musig2.getMuSig2PrivateKey()
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
   */
  async function ensureParticipantsConnected(participantPeerIds: string[]) {
    return $musig2.ensureParticipantsConnected(participantPeerIds)
  }

  /**
   * Pre-flight check before starting a signing session
   */
  async function preflightSigningSession(sharedWallet: {
    participants: Array<{ peerId?: string; nickname?: string }>
  }): Promise<PreflightResult> {
    return $musig2.preflightSigningSession(sharedWallet)
  }

  /**
   * Initiate a MuSig2 signing session with connectivity check
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
    options?: {
      skipConnectivityCheck?: boolean
      metadata?: SessionMetadata
    },
  ) {
    return $musig2.initiateSigningSession(sharedWallet, message, options)
  }

  /**
   * Handle connection failure during active session
   */
  async function handleSessionConnectionFailure(
    sessionId: string,
    failedPeerId: string,
  ): Promise<void> {
    return $musig2.handleSessionConnectionFailure(sessionId, failedPeerId)
  }

  /**
   * Monitor session participant connections
   */
  function monitorSessionConnections(sessionId: string): () => void {
    return $musig2.monitorSessionConnections(sessionId)
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
    getMuSig2SigningKey,
    getMuSig2PrivateKey,
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
