/**
 * P2P Coordinator Composable
 *
 * Provides reactive access to the P2P coordinator for peer-to-peer networking.
 * This composable wraps the plugin-provided functions with reactive state.
 *
 * Usage:
 * ```typescript
 * const p2p = useP2PCoordinator()
 *
 * // Check connection status (reactive)
 * if (p2p.isConnected.value) { ... }
 *
 * // Initialize P2P
 * await p2p.initialize(options, callbacks)
 *
 * // Get connected peers
 * const peers = p2p.connectedPeers.value
 * ```
 */
import type {
  UIPeerInfo,
  UIPresenceAdvertisement,
  PresenceConfig,
  P2PInitOptions,
} from '~/types/p2p'
import { P2PConnectionState } from '~/types/p2p'
import type {
  P2PEventCallbacks,
  PeerConnectionResult,
  ConnectionStateHandlerCallbacks,
  BootstrapHealth,
} from '~/plugins/04.p2p.client'

// Re-export types for convenience
export type {
  P2PEventCallbacks,
  PeerConnectionResult,
  ConnectionStateHandlerCallbacks,
  BootstrapHealth,
} from '~/plugins/04.p2p.client'

// Re-export functions for backward compatibility (direct imports)
export {
  initializeP2P,
  stopP2P,
  getConnectionState,
  getPeerId,
  getMultiaddrs,
  getConnectedPeers,
  connectToPeer,
  disconnectFromPeer,
  connectToDiscoveredPeer,
  connectWithRetry,
  subscribeToBootstrapPeerList,
  getWebRTCAddress,
  connectViaBrowserP2P,
  getConnectionType,
  isDHTReady,
  getRoutingTableSize,
  getDHTStats,
  startPresenceAdvertising,
  stopPresenceAdvertising,
  discoverPeers,
  getPresenceConfig,
  isPresenceAdvertising,
  getCoordinator,
  getSDKModule,
  isP2PInitialized,
  getStats,
  subscribeToEvents,
  unsubscribeFromEvents,
  setEventCallbacks,
  setupConnectionStateHandlers,
  clearConnectionStateHandlers,
  checkBootstrapHealth,
  getBootstrapTopics,
  getBootstrapPeers,
} from '~/plugins/04.p2p.client'

/**
 * P2P Coordinator Composable
 *
 * Provides reactive access to the P2P coordinator.
 */
export function useP2PCoordinator() {
  const { $p2p } = useNuxtApp()

  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Whether P2P is initialized */
  const isInitialized = computed(() => $p2p.isInitialized())

  /** Current connection state */
  const connectionState = computed(() => $p2p.getConnectionState())

  /** Whether connected (any state beyond disconnected) */
  const isConnected = computed(() => {
    const state = $p2p.getConnectionState()
    return (
      state !== P2PConnectionState.DISCONNECTED &&
      state !== P2PConnectionState.ERROR
    )
  })

  /** Whether DHT is ready */
  const isDHTReady = computed(() => $p2p.isDHTReady())

  /** Our peer ID */
  const peerId = computed(() => $p2p.getPeerId())

  /** Our multiaddresses */
  const multiaddrs = computed(() => $p2p.getMultiaddrs())

  /** Connected peers */
  const connectedPeers = computed(() => $p2p.getConnectedPeers())

  /** DHT routing table size */
  const routingTableSize = computed(() => $p2p.getRoutingTableSize())

  /** Whether presence advertising is active */
  const isAdvertising = computed(() => $p2p.isPresenceAdvertising())

  /** Current presence config */
  const presenceConfig = computed(() => $p2p.getPresenceConfig())

  /** Our WebRTC address */
  const webRTCAddress = computed(() => $p2p.getWebRTCAddress())

  // ============================================================================
  // Methods (delegated to plugin)
  // ============================================================================

  /**
   * Initialize the P2P service
   */
  async function initialize(
    options: P2PInitOptions = {},
    callbacks: P2PEventCallbacks = {},
  ): Promise<{ peerId: string; multiaddrs: string[] }> {
    return $p2p.initialize(options, callbacks)
  }

  /**
   * Stop the P2P service
   */
  async function stop(): Promise<void> {
    return $p2p.stop()
  }

  /**
   * Connect to a peer by multiaddr
   */
  async function connectToPeer(multiaddr: string): Promise<void> {
    return $p2p.connectToPeer(multiaddr)
  }

  /**
   * Disconnect from a peer
   */
  async function disconnectFromPeer(peerId: string): Promise<void> {
    return $p2p.disconnectFromPeer(peerId)
  }

  /**
   * Connect to a discovered peer using their relay address
   */
  async function connectToDiscoveredPeer(
    presence: UIPresenceAdvertisement,
  ): Promise<PeerConnectionResult> {
    return $p2p.connectToDiscoveredPeer(presence)
  }

  /**
   * Connect to peer with exponential backoff retry
   */
  async function connectWithRetry(
    presence: UIPresenceAdvertisement,
    options?: {
      maxRetries?: number
      initialDelayMs?: number
      maxDelayMs?: number
    },
  ): Promise<PeerConnectionResult & { attempts: number }> {
    return $p2p.connectWithRetry(presence, options)
  }

  /**
   * Subscribe to peer list broadcasts from bootstrap server
   */
  async function subscribeToBootstrapPeerList(): Promise<void> {
    return $p2p.subscribeToBootstrapPeerList()
  }

  /**
   * Connect to a peer via WebRTC using their relay address
   */
  async function connectViaBrowserP2P(
    peerWebRTCAddr: string,
  ): Promise<{ connectionType: 'webrtc' | 'relay' | 'unknown' }> {
    return $p2p.connectViaBrowserP2P(peerWebRTCAddr)
  }

  /**
   * Check if a peer connection is direct WebRTC or via relay
   */
  function getConnectionType(
    peerId: string,
  ): 'webrtc' | 'relay' | 'direct' | 'none' {
    return $p2p.getConnectionType(peerId)
  }

  /**
   * Get full DHT stats
   */
  function getDHTStats() {
    return $p2p.getDHTStats()
  }

  /**
   * Start advertising presence
   */
  async function startPresenceAdvertising(
    config: PresenceConfig,
  ): Promise<void> {
    return $p2p.startPresenceAdvertising(config)
  }

  /**
   * Stop advertising presence
   */
  async function stopPresenceAdvertising(): Promise<void> {
    return $p2p.stopPresenceAdvertising()
  }

  /**
   * Discover online peers from local cache
   */
  function discoverPeers(): UIPresenceAdvertisement[] {
    return $p2p.discoverPeers()
  }

  /**
   * Get the P2P coordinator instance (for advanced usage)
   */
  function getCoordinator() {
    return $p2p.getCoordinator()
  }

  /**
   * Get the SDK module (for advanced usage)
   */
  function getSDKModule() {
    return $p2p.getSDKModule()
  }

  /**
   * Get P2P statistics
   */
  function getStats() {
    return $p2p.getStats()
  }

  /**
   * Subscribe to P2P events
   */
  function subscribeToEvents(callbacks: P2PEventCallbacks): void {
    return $p2p.subscribeToEvents(callbacks)
  }

  /**
   * Unsubscribe from P2P events
   */
  function unsubscribeFromEvents(): void {
    return $p2p.unsubscribeFromEvents()
  }

  /**
   * Update event callbacks
   */
  function setEventCallbacks(callbacks: P2PEventCallbacks): void {
    return $p2p.setEventCallbacks(callbacks)
  }

  /**
   * Setup connection state change handlers
   */
  function setupConnectionStateHandlers(
    callbacks: ConnectionStateHandlerCallbacks,
  ): void {
    return $p2p.setupConnectionStateHandlers(callbacks)
  }

  /**
   * Clear all connection state handlers
   */
  function clearConnectionStateHandlers(): void {
    return $p2p.clearConnectionStateHandlers()
  }

  /**
   * Check the health of the bootstrap node
   */
  async function checkBootstrapHealth(
    healthUrl?: string,
  ): Promise<BootstrapHealth> {
    return $p2p.checkBootstrapHealth(healthUrl)
  }

  /**
   * Get detailed topic information from the bootstrap node
   */
  async function getBootstrapTopics(healthUrl?: string) {
    return $p2p.getBootstrapTopics(healthUrl)
  }

  /**
   * Get connected peers from the bootstrap node
   */
  async function getBootstrapPeers(healthUrl?: string) {
    return $p2p.getBootstrapPeers(healthUrl)
  }

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Reactive state
    isInitialized,
    connectionState,
    isConnected,
    isDHTReady,
    peerId,
    multiaddrs,
    connectedPeers,
    routingTableSize,
    isAdvertising,
    presenceConfig,
    webRTCAddress,

    // Lifecycle
    initialize,
    stop,

    // Connection management
    connectToPeer,
    disconnectFromPeer,
    connectToDiscoveredPeer,
    connectWithRetry,
    subscribeToBootstrapPeerList,
    connectViaBrowserP2P,
    getConnectionType,

    // DHT
    getDHTStats,

    // Presence
    startPresenceAdvertising,
    stopPresenceAdvertising,
    discoverPeers,

    // Advanced access
    getCoordinator,
    getSDKModule,
    getStats,

    // Event subscription
    subscribeToEvents,
    unsubscribeFromEvents,
    setEventCallbacks,
    setupConnectionStateHandlers,
    clearConnectionStateHandlers,

    // Bootstrap health
    checkBootstrapHealth,
    getBootstrapTopics,
    getBootstrapPeers,
  }
}
