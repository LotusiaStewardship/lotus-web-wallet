/**
 * P2P Store
 *
 * Core P2P connectivity layer for the wallet.
 * This store manages reactive state for P2P connection status, peers, and presence.
 *
 * Access Pattern:
 * - Uses plugin getter functions for service access (NOT composables)
 * - Does NOT import SDK directly
 * - Manages application state, delegates to P2P plugin for operations
 *
 * Architecture:
 * - This store provides REACTIVE STATE for P2P
 * - All P2P operations are delegated to the P2P plugin (plugins/04.p2p.client.ts)
 * - Protocol-specific functionality (MuSig2, FROST, SwapSig) uses getCoordinator() from service
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useMuSig2Store } from './musig2'
import { useContactsStore } from './contacts'
import { useIdentityStore } from './identity'
import { getItem, setItem, removeItem, STORAGE_KEYS } from '~/utils/storage'
import {
  initializeP2P,
  stopP2P,
  getConnectionState as getServiceConnectionState,
  getPeerId as getServicePeerId,
  getMultiaddrs as getServiceMultiaddrs,
  getConnectedPeers as getServiceConnectedPeers,
  getDHTStats,
  startPresenceAdvertising,
  stopPresenceAdvertising,
  discoverPeers,
  getCoordinator,
  isP2PInitialized,
  connectToPeer as serviceConnectToPeer,
  connectWithRetry as serviceConnectWithRetry,
  disconnectFromPeer as serviceDisconnectFromPeer,
  type P2PEventCallbacks,
} from '~/plugins/04.p2p.client'

// ============================================================================
// Types
// ============================================================================

/**
 * UI-friendly peer information
 */
export interface UIPeerInfo {
  peerId: string
  multiaddrs: string[]
  nickname?: string
  lastSeen?: number
}

/**
 * UI-friendly wallet presence representation
 * Note: This re-exports from types/p2p.ts for backwards compatibility
 */
export type {
  UIPresenceAdvertisement,
  PeerConnectionStatus,
  PeerConnectionType,
} from '~/types/p2p'
import type {
  UIPresenceAdvertisement,
  PeerConnectionStatus,
  PeerConnectionType,
} from '~/types/p2p'

/**
 * P2P activity event for the activity feed
 */
export interface P2PActivityEvent {
  id: string
  type: 'peer_joined' | 'peer_left' | 'info' | 'error'
  peerId: string
  nickname?: string
  protocol?: string
  timestamp: number
  message: string
}

/**
 * P2P Connection State
 * Re-exported from SDK for convenience, with additional UI-specific states
 */
export enum P2PConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DHT_INITIALIZING = 'dht_initializing',
  DHT_READY = 'dht_ready',
  FULLY_OPERATIONAL = 'fully_operational',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * Presence advertisement configuration
 */
export interface PresenceConfig {
  walletAddress: string
  nickname?: string
  avatar?: string
}

/**
 * P2P Settings configuration (persisted)
 */
export interface P2PSettings {
  /** Auto-connect to P2P network on app startup */
  autoConnect: boolean
  /** Maximum number of peer connections */
  maxConnections: number
  /** Enable DHT for peer discovery */
  enableDHT: boolean
  /** Enable GossipSub for pub/sub messaging */
  enableGossipSub: boolean
  /** Custom bootstrap peers (multiaddrs) */
  bootstrapPeers: string[]
}

/**
 * Default P2P settings
 */
export const DEFAULT_P2P_SETTINGS: P2PSettings = {
  autoConnect: true,
  maxConnections: 50,
  enableDHT: true,
  enableGossipSub: true,
  bootstrapPeers: [],
}

/**
 * Default bootstrap peers used when no custom peers are configured
 */
export const DEFAULT_BOOTSTRAP_PEERS = [
  '/dns4/bootstrap.lotusia.org/tcp/6970/wss/p2p/12D3KooWCsJoL2VW9Fp3Z2s4qUJQRuFkSTFtg144FdACZnu2FoX1',
]

// ============================================================================
// Store State
// ============================================================================

export interface P2PState {
  initialized: boolean
  connected: boolean
  connectionState: P2PConnectionState
  peerId: string
  multiaddrs: string[]
  connectedPeers: UIPeerInfo[]
  onlinePeers: UIPresenceAdvertisement[]
  myPresenceConfig: PresenceConfig | null
  activityEvents: P2PActivityEvent[]
  dhtReady: boolean
  routingTableSize: number
  error: string | null
  /** P2P settings configuration */
  settings: P2PSettings
  /** Whether settings have been loaded from storage */
  settingsLoaded: boolean
}

// ============================================================================
// Constants
// ============================================================================

const MAX_ACTIVITY_EVENTS = 50
const PRESENCE_TTL = 60 * 60 * 1000 // 1 hour

let initializationPromise: Promise<void> | null = null
let connectionStateMonitorId: ReturnType<typeof setInterval> | null = null

// ============================================================================
// Store Definition
// ============================================================================

export const useP2PStore = defineStore('p2p', () => {
  // === STATE ===
  const initialized = ref(false)
  const connected = ref(false)
  const connectionState = ref<P2PConnectionState>(
    P2PConnectionState.DISCONNECTED,
  )
  const peerId = ref('')
  const multiaddrs = ref<string[]>([])
  const connectedPeers = ref<UIPeerInfo[]>([])
  const onlinePeers = ref<UIPresenceAdvertisement[]>([])
  const myPresenceConfig = ref<PresenceConfig | null>(null)
  const activityEvents = ref<P2PActivityEvent[]>([])
  const dhtReady = ref(false)
  const routingTableSize = ref(0)
  const error = ref<string | null>(null)
  const settings = ref<P2PSettings>({ ...DEFAULT_P2P_SETTINGS })
  const settingsLoaded = ref(false)

  // === GETTERS ===
  const peerCount = computed(() => connectedPeers.value.length)
  const onlinePeerCount = computed(() => onlinePeers.value.length)
  const isOnline = computed(() => connected.value && initialized.value)

  const connectionStatusMessage = computed(() => {
    switch (connectionState.value) {
      case P2PConnectionState.DISCONNECTED:
        return 'Not connected'
      case P2PConnectionState.CONNECTING:
        return 'Connecting to network...'
      case P2PConnectionState.CONNECTED:
        return 'Connected, waiting for peers...'
      case P2PConnectionState.DHT_INITIALIZING:
        return 'Initializing DHT...'
      case P2PConnectionState.DHT_READY:
        return `DHT ready (${routingTableSize.value} peers in routing table)`
      case P2PConnectionState.FULLY_OPERATIONAL:
        return `Online with ${connectedPeers.value.length} peers`
      case P2PConnectionState.RECONNECTING:
        return 'Reconnecting...'
      case P2PConnectionState.ERROR:
        return error.value || 'Connection error'
      default:
        return 'Unknown state'
    }
  })

  const isFullyOperational = computed(
    () =>
      connectionState.value === P2PConnectionState.DHT_READY ||
      connectionState.value === P2PConnectionState.FULLY_OPERATIONAL,
  )

  const isDHTReady = computed(
    () =>
      connectionState.value === P2PConnectionState.DHT_READY ||
      connectionState.value === P2PConnectionState.FULLY_OPERATIONAL,
  )

  const isAdvertisingPresence = computed(() => myPresenceConfig.value !== null)

  const recentActivity = computed(() => activityEvents.value.slice(0, 20))

  /**
   * Alias for isAdvertisingPresence (for component compatibility)
   * Used by p2p/SettingsPanel.vue
   */
  const presenceEnabled = computed(() => myPresenceConfig.value !== null)

  /**
   * Get set of online peer IDs for efficient lookup
   */
  const onlinePeerIds = computed(() => {
    return new Set(connectedPeers.value.map(p => p.peerId))
  })

  // === PARAMETERIZED GETTERS (as functions) ===
  /**
   * Check if a specific peer is online
   * Used by contact components to show online status
   */
  function isPeerOnline(peerIdToCheck: string): boolean {
    return connectedPeers.value.some(p => p.peerId === peerIdToCheck)
  }

  // === ACTIONS ===
  // ========================================================================
  // Initialization
  // ========================================================================

  async function initialize(config?: Record<string, unknown>) {
    if (initialized.value) return
    if (initializationPromise) {
      await initializationPromise
      return
    }

    initializationPromise = _doInitialize(config)
    try {
      await initializationPromise
    } finally {
      initializationPromise = null
    }
  }

  async function _doInitialize(config?: Record<string, unknown>) {
    try {
      connectionState.value = P2PConnectionState.CONNECTING

      // Load saved config
      const savedConfig = getItem<Record<string, unknown>>(
        STORAGE_KEYS.P2P_CONFIG,
        {},
      )

      // Merge configs
      const mergedConfig = {
        bootstrapNodes: DEFAULT_BOOTSTRAP_PEERS,
        ...savedConfig,
        ...config,
      }

      // Create event callbacks for service
      const callbacks: P2PEventCallbacks = {
        onConnectionStateChange: (state, _previousState, err) => {
          _handleConnectionStateChange(state, err)
        },
        onPeerConnected: peer => {
          _handlePeerConnected(peer)
        },
        onPeerDisconnected: pId => {
          _handlePeerDisconnected(pId)
        },
        onPresenceDiscovered: presence => {
          _handlePresenceDiscovered(presence)
        },
        onError: err => {
          _handleError(err)
        },
      }

      // Initialize via service
      const result = await initializeP2P(
        {
          bootstrapNodes: mergedConfig.bootstrapNodes as string[],
          enableDHT: true,
        },
        callbacks,
      )

      peerId.value = result.peerId
      multiaddrs.value = result.multiaddrs
      initialized.value = true
      connected.value = true
      connectionState.value = P2PConnectionState.CONNECTED
      error.value = null

      _startConnectionStateMonitor()
      _updateConnectionState()

      await _restoreSavedPresence()

      _addActivityEvent({
        type: 'info',
        peerId: peerId.value,
        message: 'Connected to P2P network',
      })
    } catch (err) {
      console.error('Failed to initialize P2P:', err)
      error.value =
        err instanceof Error ? err.message : 'Failed to initialize P2P'
      connected.value = false
      connectionState.value = P2PConnectionState.ERROR
      throw err
    }
  }

  /**
   * Get the P2PCoordinator instance
   * Used by protocol composables (MuSig2, FROST, etc.)
   * Delegates to service
   */
  function getCoordinatorInstance() {
    return getCoordinator()
  }

  // ========================================================================
  // Event Handlers (called by service callbacks)
  // ========================================================================

  function _handleConnectionStateChange(
    state: P2PConnectionState,
    err?: string,
  ) {
    console.log(`[P2P Store] Connection state changed to: ${state}`)

    const wasDHTReady = dhtReady.value

    connectionState.value = state

    if (err) {
      error.value = err
    }

    // Update DHT ready flag based on state
    // DHT is ready when routing table has at least 1 peer
    dhtReady.value =
      state === P2PConnectionState.DHT_READY ||
      state === P2PConnectionState.FULLY_OPERATIONAL

    // Update connected flag
    connected.value =
      state !== P2PConnectionState.DISCONNECTED &&
      state !== P2PConnectionState.ERROR

    // Trigger actions when DHT becomes ready (Phase 6.1.1)
    if (!wasDHTReady && dhtReady.value) {
      console.log('[P2P Store] DHT became ready, triggering dependent actions')
      _onDHTReady()
    }
  }

  /**
   * Called when DHT becomes ready
   * Triggers MuSig2 initialization and emits activity event (Phase 6.1.1, 6.1.2)
   */
  async function _onDHTReady() {
    // Initialize MuSig2 if not already done
    try {
      const musig2Store = useMuSig2Store()
      if (!musig2Store.initialized) {
        console.log('[P2P Store] Auto-initializing MuSig2 on DHT ready')
        await musig2Store.initialize()
      }
    } catch (err) {
      console.error('[P2P Store] Failed to auto-initialize MuSig2:', err)
    }

    // Emit event for activity feed
    _addActivityEvent({
      type: 'info',
      peerId: peerId.value,
      message: 'DHT ready - discovery enabled',
    })
  }

  function _handlePeerConnected(peer: UIPeerInfo) {
    if (!connectedPeers.value.find(p => p.peerId === peer.peerId)) {
      connectedPeers.value.push(peer)
      _addActivityEvent({
        type: 'peer_joined',
        peerId: peer.peerId,
        message: `Peer connected: ${peer.peerId.slice(0, 12)}...`,
      })

      // Phase 2: Update identity store on peer connection
      const identityStore = useIdentityStore()
      identityStore.updateFromPeerConnection(peer.peerId, peer.multiaddrs)

      // Update contact's last seen timestamp (legacy support)
      const contactsStore = useContactsStore()
      contactsStore.updateLastSeen(peer.peerId)
    }
  }

  function _handlePeerDisconnected(pId: string) {
    connectedPeers.value = connectedPeers.value.filter(p => p.peerId !== pId)
    _addActivityEvent({
      type: 'peer_left',
      peerId: pId,
      message: `Peer disconnected: ${pId.slice(0, 12)}...`,
    })

    // Phase 2: Mark identity offline by peer ID
    const identityStore = useIdentityStore()
    identityStore.markOfflineByPeerId(pId)

    // Update contact's last seen timestamp on disconnect too (legacy support)
    const contactsStore = useContactsStore()
    contactsStore.updateLastSeen(pId)
  }

  function _handleError(err: Error) {
    console.error('[P2P Store] Error:', err)
    _addActivityEvent({
      type: 'error',
      peerId: peerId.value,
      message: `Error: ${err.message}`,
    })
  }

  // ========================================================================
  // Connection State Management
  // ========================================================================

  function _startConnectionStateMonitor() {
    if (connectionStateMonitorId) {
      clearInterval(connectionStateMonitorId)
    }
    // Monitor stats updates (state is handled by service events)
    connectionStateMonitorId = setInterval(() => {
      _updateConnectionState()
    }, 10000) // Less frequent since state is event-driven
  }

  function _stopConnectionStateMonitor() {
    if (connectionStateMonitorId) {
      clearInterval(connectionStateMonitorId)
      connectionStateMonitorId = null
    }
  }

  function _updateConnectionState() {
    if (!isP2PInitialized() || !initialized.value) {
      connectionState.value = P2PConnectionState.DISCONNECTED
      return
    }

    // Update stats from service
    const dhtStats = getDHTStats()
    routingTableSize.value = dhtStats.routingTableSize

    // Connection state is managed by service events
    // This method is kept for manual stat updates only
  }

  // ========================================================================
  // Presence
  // ========================================================================

  /**
   * Advertise presence on the P2P network
   * Delegates to P2P service
   */
  async function advertisePresence(config: PresenceConfig) {
    if (!isP2PInitialized() || !initialized.value) {
      throw new Error('P2P not initialized')
    }

    // Delegate to service
    await startPresenceAdvertising(config)

    myPresenceConfig.value = config
    _savePresenceConfig(config)
  }

  /**
   * Withdraw presence from the P2P network
   * Delegates to P2P service
   */
  async function withdrawPresence() {
    if (isP2PInitialized() && myPresenceConfig.value) {
      await stopPresenceAdvertising()
    }
    myPresenceConfig.value = null
    _savePresenceConfig(null)
  }

  /**
   * Handle presence discovered event from service
   */
  function _handlePresenceDiscovered(presence: UIPresenceAdvertisement) {
    // Skip our own presence
    if (presence.peerId === peerId.value) {
      return
    }

    const now = Date.now()

    // Skip expired presence
    if (presence.expiresAt <= now) {
      return
    }

    // Initialize connection status if not set
    const presenceWithStatus: UIPresenceAdvertisement = {
      ...presence,
      connectionStatus: presence.connectionStatus || 'disconnected',
      connectionType: presence.connectionType,
    }

    const existingIndex = onlinePeers.value.findIndex(
      p => p.peerId === presence.peerId,
    )

    if (existingIndex >= 0) {
      // Preserve existing connection status if connected
      const existing = onlinePeers.value[existingIndex]
      if (existing.connectionStatus === 'connected') {
        presenceWithStatus.connectionStatus = existing.connectionStatus
        presenceWithStatus.connectionType = existing.connectionType
      }
      // Merge relay addresses from both sources
      if (existing.relayAddrs && presenceWithStatus.relayAddrs) {
        const mergedAddrs = new Set([
          ...existing.relayAddrs,
          ...presenceWithStatus.relayAddrs,
        ])
        presenceWithStatus.relayAddrs = Array.from(mergedAddrs)
      }
      onlinePeers.value[existingIndex] = presenceWithStatus
    } else {
      onlinePeers.value.push(presenceWithStatus)
    }

    _cleanupExpiredPresence()
  }

  /**
   * Update connection status for a peer
   */
  function _updatePeerConnectionStatus(
    pId: string,
    status: PeerConnectionStatus,
    connType?: PeerConnectionType,
  ): void {
    const peerIndex = onlinePeers.value.findIndex(p => p.peerId === pId)
    if (peerIndex >= 0) {
      onlinePeers.value[peerIndex] = {
        ...onlinePeers.value[peerIndex],
        connectionStatus: status,
        connectionType: connType,
      }
    }
  }

  function _cleanupExpiredPresence() {
    const now = Date.now()
    onlinePeers.value = onlinePeers.value.filter(p => p.expiresAt > now)
  }

  function _savePresenceConfig(config: PresenceConfig | null) {
    if (config) {
      setItem(STORAGE_KEYS.P2P_PRESENCE_CONFIG, config)
    } else {
      removeItem(STORAGE_KEYS.P2P_PRESENCE_CONFIG)
    }
  }

  async function _restoreSavedPresence() {
    const saved = getItem<PresenceConfig | null>(
      STORAGE_KEYS.P2P_PRESENCE_CONFIG,
      null,
    )
    if (saved) {
      try {
        await advertisePresence(saved)
      } catch (err) {
        console.warn('[P2P] Failed to restore presence config:', err)
      }
    }
  }

  // ========================================================================
  // Activity Feed
  // ========================================================================

  function _addActivityEvent(
    event: Omit<P2PActivityEvent, 'id' | 'timestamp'>,
  ) {
    const fullEvent: P2PActivityEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    }

    activityEvents.value.unshift(fullEvent)

    if (activityEvents.value.length > MAX_ACTIVITY_EVENTS) {
      activityEvents.value = activityEvents.value.slice(0, MAX_ACTIVITY_EVENTS)
    }
  }

  // ========================================================================
  // Peer Management
  // ========================================================================

  /**
   * Connect to a peer by multiaddr
   * Delegates to P2P service
   */
  async function connectToPeer(multiaddr: string) {
    if (!isP2PInitialized()) {
      throw new Error('P2P not initialized')
    }
    await serviceConnectToPeer(multiaddr)
  }

  /**
   * Disconnect from a peer
   * Delegates to P2P service
   */
  async function disconnectFromPeer(pId: string) {
    if (!isP2PInitialized()) {
      throw new Error('P2P not initialized')
    }
    await serviceDisconnectFromPeer(pId)
    connectedPeers.value = connectedPeers.value.filter(p => p.peerId !== pId)
  }

  /**
   * Connect to an online peer by their peerId
   * Uses relay addresses from presence advertisement
   */
  async function connectToOnlinePeer(pId: string): Promise<boolean> {
    const presence = onlinePeers.value.find(p => p.peerId === pId)
    if (!presence) {
      console.warn(`[P2P Store] Peer ${pId} not found in online peers`)
      return false
    }

    // Update connection status to connecting
    _updatePeerConnectionStatus(pId, 'connecting')

    try {
      const result = await serviceConnectWithRetry(presence)

      if (result.success) {
        _updatePeerConnectionStatus(pId, 'connected', result.connectionType)
        _addActivityEvent({
          type: 'info',
          peerId: pId,
          message: `Connected to peer via ${result.connectionType}`,
        })
        return true
      } else {
        _updatePeerConnectionStatus(pId, 'failed')
        _addActivityEvent({
          type: 'error',
          peerId: pId,
          message: `Failed to connect: ${result.error}`,
        })
        return false
      }
    } catch (err) {
      console.error(`[P2P Store] Failed to connect to ${pId}:`, err)
      _updatePeerConnectionStatus(pId, 'failed')
      return false
    }
  }

  /**
   * Get connection status for a peer
   */
  function getPeerConnectionStatus(
    pId: string,
  ): PeerConnectionStatus | undefined {
    const peer = onlinePeers.value.find(p => p.peerId === pId)
    return peer?.connectionStatus
  }

  // ========================================================================
  // Lifecycle
  // ========================================================================

  /**
   * Stop the P2P connection
   * Delegates to P2P service
   */
  async function stop() {
    _stopConnectionStateMonitor()

    // Stop via service
    await stopP2P()

    initialized.value = false
    connected.value = false
    connectionState.value = P2PConnectionState.DISCONNECTED
    connectedPeers.value = []
    onlinePeers.value = []
    activityEvents.value = []
    error.value = null
  }

  // ========================================================================
  // Phase 13 Integration: Convenience Methods
  // ========================================================================

  /**
   * Connect to P2P network (alias for initialize)
   * Used by p2p/HeroCard.vue
   */
  async function connect(config?: Record<string, unknown>) {
    if (initialized.value && connected.value) return
    await initialize(config)
  }

  /**
   * Disconnect from P2P network (alias for stop)
   * Used by p2p/HeroCard.vue
   */
  async function disconnect() {
    await stop()
  }

  /**
   * Enable presence advertising
   * Used by p2p/SettingsPanel.vue
   */
  async function enablePresence(config: PresenceConfig) {
    await advertisePresence(config)
  }

  /**
   * Disable presence advertising
   * Used by p2p/SettingsPanel.vue
   */
  async function disablePresence() {
    await withdrawPresence()
  }

  // ========================================================================
  // Settings Management
  // ========================================================================

  /**
   * Load settings from storage
   */
  function loadSettings() {
    if (settingsLoaded.value) return

    const saved = getItem<P2PSettings>(STORAGE_KEYS.P2P_SETTINGS, {
      ...DEFAULT_P2P_SETTINGS,
    })

    settings.value = {
      ...DEFAULT_P2P_SETTINGS,
      ...saved,
    }
    settingsLoaded.value = true
  }

  /**
   * Save settings to storage
   */
  function saveSettings() {
    setItem(STORAGE_KEYS.P2P_SETTINGS, settings.value)
  }

  /**
   * Update settings with partial values
   */
  function updateSettings(updates: Partial<P2PSettings>) {
    settings.value = {
      ...settings.value,
      ...updates,
    }
    saveSettings()
  }

  /**
   * Reset settings to defaults
   */
  function resetSettings() {
    settings.value = { ...DEFAULT_P2P_SETTINGS }
    saveSettings()
  }

  /**
   * Add a custom bootstrap peer
   */
  function addBootstrapPeer(multiaddr: string): boolean {
    if (!multiaddr.startsWith('/')) {
      return false
    }
    if (settings.value.bootstrapPeers.includes(multiaddr)) {
      return false
    }
    settings.value.bootstrapPeers = [
      ...settings.value.bootstrapPeers,
      multiaddr,
    ]
    saveSettings()
    return true
  }

  /**
   * Remove a custom bootstrap peer
   */
  function removeBootstrapPeer(multiaddr: string) {
    settings.value.bootstrapPeers = settings.value.bootstrapPeers.filter(
      p => p !== multiaddr,
    )
    saveSettings()
  }

  /**
   * Get effective bootstrap peers (custom if set, otherwise defaults)
   */
  function getEffectiveBootstrapPeers(): string[] {
    return settings.value.bootstrapPeers.length > 0
      ? settings.value.bootstrapPeers
      : DEFAULT_BOOTSTRAP_PEERS
  }

  // === RETURN ===
  return {
    // State
    initialized,
    connected,
    connectionState,
    peerId,
    multiaddrs,
    connectedPeers,
    onlinePeers,
    myPresenceConfig,
    activityEvents,
    dhtReady,
    routingTableSize,
    error,
    settings,
    settingsLoaded,
    // Getters
    peerCount,
    onlinePeerCount,
    isOnline,
    connectionStatusMessage,
    isFullyOperational,
    isDHTReady,
    isAdvertisingPresence,
    recentActivity,
    presenceEnabled,
    onlinePeerIds,
    // Parameterized getters (functions)
    isPeerOnline,
    // Actions
    initialize,
    getCoordinator: getCoordinatorInstance,
    advertisePresence,
    withdrawPresence,
    connectToPeer,
    disconnectFromPeer,
    connectToOnlinePeer,
    getPeerConnectionStatus,
    stop,
    connect,
    disconnect,
    enablePresence,
    disablePresence,
    loadSettings,
    saveSettings,
    updateSettings,
    resetSettings,
    addBootstrapPeer,
    removeBootstrapPeer,
    getEffectiveBootstrapPeers,
  }
})
