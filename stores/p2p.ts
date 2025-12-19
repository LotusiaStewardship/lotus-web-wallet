/**
 * P2P Store
 *
 * Core P2P connectivity layer for the wallet.
 * This store manages reactive state for P2P connection status, peers, and presence.
 *
 * Architecture:
 * - This store provides REACTIVE STATE for P2P
 * - All P2P operations are delegated to the P2P plugin (plugins/04.p2p.client.ts)
 * - Protocol-specific functionality (MuSig2, FROST, SwapSig) uses getCoordinator() from service
 */
import { defineStore } from 'pinia'
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
  getSDKModule,
  isP2PInitialized,
  connectToPeer as serviceConnectToPeer,
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

export const useP2PStore = defineStore('p2p', {
  state: (): P2PState => ({
    initialized: false,
    connected: false,
    connectionState: P2PConnectionState.DISCONNECTED,
    peerId: '',
    multiaddrs: [],
    connectedPeers: [],
    onlinePeers: [],
    myPresenceConfig: null,
    activityEvents: [],
    dhtReady: false,
    routingTableSize: 0,
    error: null,
    settings: { ...DEFAULT_P2P_SETTINGS },
    settingsLoaded: false,
  }),

  getters: {
    peerCount: (state): number => state.connectedPeers.length,
    onlinePeerCount: (state): number => state.onlinePeers.length,
    isOnline: (state): boolean => state.connected && state.initialized,

    connectionStatusMessage: (state): string => {
      switch (state.connectionState) {
        case P2PConnectionState.DISCONNECTED:
          return 'Not connected'
        case P2PConnectionState.CONNECTING:
          return 'Connecting to network...'
        case P2PConnectionState.CONNECTED:
          return 'Connected, waiting for peers...'
        case P2PConnectionState.DHT_INITIALIZING:
          return 'Initializing DHT...'
        case P2PConnectionState.DHT_READY:
          return `DHT ready (${state.routingTableSize} peers in routing table)`
        case P2PConnectionState.FULLY_OPERATIONAL:
          return `Online with ${state.connectedPeers.length} peers`
        case P2PConnectionState.RECONNECTING:
          return 'Reconnecting...'
        case P2PConnectionState.ERROR:
          return state.error || 'Connection error'
        default:
          return 'Unknown state'
      }
    },

    isFullyOperational: (state): boolean =>
      state.connectionState === P2PConnectionState.DHT_READY ||
      state.connectionState === P2PConnectionState.FULLY_OPERATIONAL,

    isDHTReady: (state): boolean =>
      state.connectionState === P2PConnectionState.DHT_READY ||
      state.connectionState === P2PConnectionState.FULLY_OPERATIONAL,

    isAdvertisingPresence: (state): boolean => state.myPresenceConfig !== null,

    recentActivity: (state): P2PActivityEvent[] =>
      state.activityEvents.slice(0, 20),

    /**
     * Alias for isAdvertisingPresence (for component compatibility)
     * Used by p2p/SettingsPanel.vue
     */
    presenceEnabled: (state): boolean => state.myPresenceConfig !== null,

    /**
     * Check if a specific peer is online
     * Used by contact components to show online status
     */
    isPeerOnline:
      state =>
      (peerId: string): boolean => {
        return state.connectedPeers.some(p => p.peerId === peerId)
      },

    /**
     * Get set of online peer IDs for efficient lookup
     */
    onlinePeerIds: (state): Set<string> => {
      return new Set(state.connectedPeers.map(p => p.peerId))
    },
  },

  actions: {
    // ========================================================================
    // Initialization
    // ========================================================================

    async initialize(config?: Record<string, unknown>) {
      if (this.initialized) return
      if (initializationPromise) {
        await initializationPromise
        return
      }

      initializationPromise = this._doInitialize(config)
      try {
        await initializationPromise
      } finally {
        initializationPromise = null
      }
    },

    async _doInitialize(config?: Record<string, unknown>) {
      try {
        this.connectionState = P2PConnectionState.CONNECTING

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
          onConnectionStateChange: (state, _previousState, error) => {
            this._handleConnectionStateChange(state, error)
          },
          onPeerConnected: peer => {
            this._handlePeerConnected(peer)
          },
          onPeerDisconnected: peerId => {
            this._handlePeerDisconnected(peerId)
          },
          onPresenceDiscovered: presence => {
            this._handlePresenceDiscovered(presence)
          },
          onError: error => {
            this._handleError(error)
          },
        }

        // Initialize via service
        const { peerId, multiaddrs } = await initializeP2P(
          {
            bootstrapNodes: mergedConfig.bootstrapNodes as string[],
            enableDHT: true,
          },
          callbacks,
        )

        this.peerId = peerId
        this.multiaddrs = multiaddrs
        this.initialized = true
        this.connected = true
        this.connectionState = P2PConnectionState.CONNECTED
        this.error = null

        this._startConnectionStateMonitor()
        this._updateConnectionState()

        await this._restoreSavedPresence()

        this._addActivityEvent({
          type: 'info',
          peerId: this.peerId,
          message: 'Connected to P2P network',
        })
      } catch (error) {
        console.error('Failed to initialize P2P:', error)
        this.error =
          error instanceof Error ? error.message : 'Failed to initialize P2P'
        this.connected = false
        this.connectionState = P2PConnectionState.ERROR
        throw error
      }
    },

    /**
     * Get the P2PCoordinator instance
     * Used by protocol composables (MuSig2, FROST, etc.)
     * Delegates to service
     */
    getCoordinator() {
      return getCoordinator()
    },

    /**
     * Get the SDK module
     * Delegates to service
     */
    getSDKModule() {
      return getSDKModule()
    },

    // ========================================================================
    // Event Handlers (called by service callbacks)
    // ========================================================================

    _handleConnectionStateChange(state: P2PConnectionState, error?: string) {
      console.log(`[P2P Store] Connection state changed to: ${state}`)

      const wasDHTReady = this.dhtReady

      this.connectionState = state

      if (error) {
        this.error = error
      }

      // Update DHT ready flag based on state
      // DHT is ready when routing table has at least 1 peer
      this.dhtReady =
        state === P2PConnectionState.DHT_READY ||
        state === P2PConnectionState.FULLY_OPERATIONAL

      // Update connected flag
      this.connected =
        state !== P2PConnectionState.DISCONNECTED &&
        state !== P2PConnectionState.ERROR

      // Trigger actions when DHT becomes ready (Phase 6.1.1)
      if (!wasDHTReady && this.dhtReady) {
        console.log(
          '[P2P Store] DHT became ready, triggering dependent actions',
        )
        this._onDHTReady()
      }
    },

    /**
     * Called when DHT becomes ready
     * Triggers MuSig2 initialization and emits activity event (Phase 6.1.1, 6.1.2)
     */
    async _onDHTReady() {
      // Initialize MuSig2 if not already done
      try {
        const { useMuSig2Store } = await import('./musig2')
        const musig2Store = useMuSig2Store()
        if (!musig2Store.initialized) {
          console.log('[P2P Store] Auto-initializing MuSig2 on DHT ready')
          await musig2Store.initialize()
        }
      } catch (error) {
        console.error('[P2P Store] Failed to auto-initialize MuSig2:', error)
      }

      // Emit event for activity feed
      this._addActivityEvent({
        type: 'info',
        peerId: this.peerId,
        message: 'DHT ready - discovery enabled',
      })
    },

    _handlePeerConnected(peer: UIPeerInfo) {
      if (!this.connectedPeers.find(p => p.peerId === peer.peerId)) {
        this.connectedPeers.push(peer)
        this._addActivityEvent({
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
    },

    _handlePeerDisconnected(peerId: string) {
      this.connectedPeers = this.connectedPeers.filter(p => p.peerId !== peerId)
      this._addActivityEvent({
        type: 'peer_left',
        peerId: peerId,
        message: `Peer disconnected: ${peerId.slice(0, 12)}...`,
      })

      // Phase 2: Mark identity offline by peer ID
      const identityStore = useIdentityStore()
      identityStore.markOfflineByPeerId(peerId)

      // Update contact's last seen timestamp on disconnect too (legacy support)
      const contactsStore = useContactsStore()
      contactsStore.updateLastSeen(peerId)
    },

    _handleError(error: Error) {
      console.error('[P2P Store] Error:', error)
      this._addActivityEvent({
        type: 'error',
        peerId: this.peerId,
        message: `Error: ${error.message}`,
      })
    },

    // ========================================================================
    // Connection State Management
    // ========================================================================

    _startConnectionStateMonitor() {
      if (connectionStateMonitorId) {
        clearInterval(connectionStateMonitorId)
      }
      // Monitor stats updates (state is handled by service events)
      connectionStateMonitorId = setInterval(() => {
        this._updateConnectionState()
      }, 10000) // Less frequent since state is event-driven
    },

    _stopConnectionStateMonitor() {
      if (connectionStateMonitorId) {
        clearInterval(connectionStateMonitorId)
        connectionStateMonitorId = null
      }
    },

    _updateConnectionState() {
      if (!isP2PInitialized() || !this.initialized) {
        this.connectionState = P2PConnectionState.DISCONNECTED
        return
      }

      // Update stats from service
      const dhtStats = getDHTStats()
      this.routingTableSize = dhtStats.routingTableSize

      // Connection state is managed by service events
      // This method is kept for manual stat updates only
    },

    // ========================================================================
    // Presence
    // ========================================================================

    /**
     * Advertise presence on the P2P network
     * Delegates to P2P service
     */
    async advertisePresence(config: PresenceConfig) {
      if (!isP2PInitialized() || !this.initialized) {
        throw new Error('P2P not initialized')
      }

      // Delegate to service
      await startPresenceAdvertising(config)

      this.myPresenceConfig = config
      this._savePresenceConfig(config)
    },

    /**
     * Withdraw presence from the P2P network
     * Delegates to P2P service
     */
    async withdrawPresence() {
      if (isP2PInitialized() && this.myPresenceConfig) {
        await stopPresenceAdvertising()
      }
      this.myPresenceConfig = null
      this._savePresenceConfig(null)
    },

    /**
     * Handle presence discovered event from service
     */
    _handlePresenceDiscovered(presence: UIPresenceAdvertisement) {
      // Skip our own presence
      if (presence.peerId === this.peerId) {
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

      const existingIndex = this.onlinePeers.findIndex(
        p => p.peerId === presence.peerId,
      )

      if (existingIndex >= 0) {
        // Preserve existing connection status if connected
        const existing = this.onlinePeers[existingIndex]
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
        this.onlinePeers[existingIndex] = presenceWithStatus
      } else {
        this.onlinePeers.push(presenceWithStatus)
      }

      this._cleanupExpiredPresence()
    },

    /**
     * Update connection status for a peer
     */
    _updatePeerConnectionStatus(
      peerId: string,
      status: PeerConnectionStatus,
      connectionType?: PeerConnectionType,
    ): void {
      const peerIndex = this.onlinePeers.findIndex(p => p.peerId === peerId)
      if (peerIndex >= 0) {
        this.onlinePeers[peerIndex] = {
          ...this.onlinePeers[peerIndex],
          connectionStatus: status,
          connectionType: connectionType,
        }
      }
    },

    _cleanupExpiredPresence() {
      const now = Date.now()
      this.onlinePeers = this.onlinePeers.filter(p => p.expiresAt > now)
    },

    _savePresenceConfig(config: PresenceConfig | null) {
      if (config) {
        setItem(STORAGE_KEYS.P2P_PRESENCE_CONFIG, config)
      } else {
        removeItem(STORAGE_KEYS.P2P_PRESENCE_CONFIG)
      }
    },

    async _restoreSavedPresence() {
      const saved = getItem<PresenceConfig | null>(
        STORAGE_KEYS.P2P_PRESENCE_CONFIG,
        null,
      )
      if (saved) {
        try {
          await this.advertisePresence(saved)
        } catch (err) {
          console.warn('[P2P] Failed to restore presence config:', err)
        }
      }
    },

    // ========================================================================
    // Activity Feed
    // ========================================================================

    _addActivityEvent(event: Omit<P2PActivityEvent, 'id' | 'timestamp'>) {
      const fullEvent: P2PActivityEvent = {
        ...event,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
      }

      this.activityEvents.unshift(fullEvent)

      if (this.activityEvents.length > MAX_ACTIVITY_EVENTS) {
        this.activityEvents = this.activityEvents.slice(0, MAX_ACTIVITY_EVENTS)
      }
    },

    // ========================================================================
    // Peer Management
    // ========================================================================

    /**
     * Connect to a peer by multiaddr
     * Delegates to P2P service
     */
    async connectToPeer(multiaddr: string) {
      if (!isP2PInitialized()) {
        throw new Error('P2P not initialized')
      }
      await serviceConnectToPeer(multiaddr)
    },

    /**
     * Disconnect from a peer
     * Delegates to P2P service
     */
    async disconnectFromPeer(peerId: string) {
      if (!isP2PInitialized()) {
        throw new Error('P2P not initialized')
      }
      await serviceDisconnectFromPeer(peerId)
      this.connectedPeers = this.connectedPeers.filter(p => p.peerId !== peerId)
    },

    /**
     * Connect to an online peer by their peerId
     * Uses relay addresses from presence advertisement
     */
    async connectToOnlinePeer(peerId: string): Promise<boolean> {
      const presence = this.onlinePeers.find(p => p.peerId === peerId)
      if (!presence) {
        console.warn(`[P2P Store] Peer ${peerId} not found in online peers`)
        return false
      }

      // Update connection status to connecting
      this._updatePeerConnectionStatus(peerId, 'connecting')

      try {
        const { connectWithRetry } = await import('~/plugins/04.p2p.client')
        const result = await connectWithRetry(presence)

        if (result.success) {
          this._updatePeerConnectionStatus(
            peerId,
            'connected',
            result.connectionType,
          )
          this._addActivityEvent({
            type: 'info',
            peerId,
            message: `Connected to peer via ${result.connectionType}`,
          })
          return true
        } else {
          this._updatePeerConnectionStatus(peerId, 'failed')
          this._addActivityEvent({
            type: 'error',
            peerId,
            message: `Failed to connect: ${result.error}`,
          })
          return false
        }
      } catch (error) {
        console.error(`[P2P Store] Failed to connect to ${peerId}:`, error)
        this._updatePeerConnectionStatus(peerId, 'failed')
        return false
      }
    },

    /**
     * Get connection status for a peer
     */
    getPeerConnectionStatus(peerId: string): PeerConnectionStatus | undefined {
      const peer = this.onlinePeers.find(p => p.peerId === peerId)
      return peer?.connectionStatus
    },

    // ========================================================================
    // Lifecycle
    // ========================================================================

    /**
     * Stop the P2P connection
     * Delegates to P2P service
     */
    async stop() {
      this._stopConnectionStateMonitor()

      // Stop via service
      await stopP2P()

      this.initialized = false
      this.connected = false
      this.connectionState = P2PConnectionState.DISCONNECTED
      this.connectedPeers = []
      this.onlinePeers = []
      this.activityEvents = []
      this.error = null
    },

    // ========================================================================
    // Phase 13 Integration: Convenience Methods
    // ========================================================================

    /**
     * Connect to P2P network (alias for initialize)
     * Used by p2p/HeroCard.vue
     */
    async connect(config?: Record<string, unknown>) {
      if (this.initialized && this.connected) return
      await this.initialize(config)
    },

    /**
     * Disconnect from P2P network (alias for stop)
     * Used by p2p/HeroCard.vue
     */
    async disconnect() {
      await this.stop()
    },

    /**
     * Enable presence advertising
     * Used by p2p/SettingsPanel.vue
     */
    async enablePresence(config: PresenceConfig) {
      await this.advertisePresence(config)
    },

    /**
     * Disable presence advertising
     * Used by p2p/SettingsPanel.vue
     */
    async disablePresence() {
      await this.withdrawPresence()
    },

    // ========================================================================
    // Settings Management
    // ========================================================================

    /**
     * Load settings from storage
     */
    loadSettings() {
      if (this.settingsLoaded) return

      const saved = getItem<P2PSettings>(STORAGE_KEYS.P2P_SETTINGS, {
        ...DEFAULT_P2P_SETTINGS,
      })

      this.settings = {
        ...DEFAULT_P2P_SETTINGS,
        ...saved,
      }
      this.settingsLoaded = true
    },

    /**
     * Save settings to storage
     */
    saveSettings() {
      setItem(STORAGE_KEYS.P2P_SETTINGS, this.settings)
    },

    /**
     * Update settings with partial values
     */
    updateSettings(updates: Partial<P2PSettings>) {
      this.settings = {
        ...this.settings,
        ...updates,
      }
      this.saveSettings()
    },

    /**
     * Reset settings to defaults
     */
    resetSettings() {
      this.settings = { ...DEFAULT_P2P_SETTINGS }
      this.saveSettings()
    },

    /**
     * Add a custom bootstrap peer
     */
    addBootstrapPeer(multiaddr: string): boolean {
      if (!multiaddr.startsWith('/')) {
        return false
      }
      if (this.settings.bootstrapPeers.includes(multiaddr)) {
        return false
      }
      this.settings.bootstrapPeers = [
        ...this.settings.bootstrapPeers,
        multiaddr,
      ]
      this.saveSettings()
      return true
    },

    /**
     * Remove a custom bootstrap peer
     */
    removeBootstrapPeer(multiaddr: string) {
      this.settings.bootstrapPeers = this.settings.bootstrapPeers.filter(
        p => p !== multiaddr,
      )
      this.saveSettings()
    },

    /**
     * Get effective bootstrap peers (custom if set, otherwise defaults)
     */
    getEffectiveBootstrapPeers(): string[] {
      return this.settings.bootstrapPeers.length > 0
        ? this.settings.bootstrapPeers
        : DEFAULT_BOOTSTRAP_PEERS
    },
  },
})
