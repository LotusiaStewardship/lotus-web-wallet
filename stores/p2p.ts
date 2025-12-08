/**
 * P2P Store
 *
 * Core P2P connectivity layer for the wallet.
 * This store manages the P2PCoordinator lifecycle and provides reactive state
 * for connection status, peers, and presence.
 *
 * Architecture:
 * - This store handles CORE P2P only (connection, peers, DHT, presence)
 * - Protocol-specific functionality (MuSig2, FROST, SwapSig) lives in composables
 * - Composables use getCoordinator() to access the shared P2PCoordinator
 */
import { defineStore } from 'pinia'

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
 */
export interface UIPresenceAdvertisement {
  id: string
  peerId: string
  multiaddrs: string[]
  walletAddress: string
  nickname?: string
  avatar?: string
  createdAt: number
  expiresAt: number
}

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
}

// ============================================================================
// Constants
// ============================================================================

const MAX_ACTIVITY_EVENTS = 50
const STORAGE_KEY_PRESENCE_CONFIG = 'p2p-presence-config'
const STORAGE_KEY_P2P_PRIVATE_KEY = 'p2p-private-key'

// Discovery topic format matching SDK's discovery system
// Format: lotus/discovery/{protocol}
const PRESENCE_TOPIC = 'lotus/discovery/wallet-presence'
const PRESENCE_RESOURCE_TYPE = 'discovery:advertisement'
const PRESENCE_PROTOCOL = 'wallet-presence'
const PRESENCE_TTL = 60 * 60 * 1000 // 1 hour

let initializationPromise: Promise<void> | null = null
let connectionStateMonitorId: ReturnType<typeof setInterval> | null = null

// ============================================================================
// P2P Identity Management
// ============================================================================

/**
 * Get or create a persistent P2P private key
 * This ensures the wallet maintains the same peerId across browser sessions
 * Uses SDK utilities to avoid direct @libp2p imports
 */
async function getOrCreateP2PPrivateKey(
  sdkModule: typeof import('lotus-sdk'),
): Promise<ReturnType<typeof import('lotus-sdk').P2P.generateP2PPrivateKey>> {
  const { generateP2PPrivateKey, restoreP2PPrivateKey, getP2PPrivateKeyBytes } =
    sdkModule.P2P

  // Try to restore existing key from localStorage
  if (typeof localStorage !== 'undefined') {
    const savedKey = localStorage.getItem(STORAGE_KEY_P2P_PRIVATE_KEY)
    if (savedKey) {
      try {
        const keyBytes = Uint8Array.from(atob(savedKey), c => c.charCodeAt(0))
        const privateKey = restoreP2PPrivateKey(keyBytes)
        console.log('[P2P] Restored persistent identity from localStorage')
        return privateKey
      } catch (err) {
        console.warn(
          '[P2P] Failed to restore private key, generating new one:',
          err,
        )
        localStorage.removeItem(STORAGE_KEY_P2P_PRIVATE_KEY)
      }
    }
  }

  // Generate new Ed25519 keypair
  const privateKey = await generateP2PPrivateKey()
  console.log('[P2P] Generated new P2P identity')

  // Save to localStorage for persistence
  if (typeof localStorage !== 'undefined') {
    try {
      const keyBytes = getP2PPrivateKeyBytes(privateKey)
      const base64Key = btoa(String.fromCharCode(...keyBytes))
      localStorage.setItem(STORAGE_KEY_P2P_PRIVATE_KEY, base64Key)
      console.log('[P2P] Saved P2P identity to localStorage')
    } catch (err) {
      console.warn('[P2P] Failed to save private key:', err)
    }
  }

  return privateKey
}

// ============================================================================
// SDK Instance (non-reactive)
// ============================================================================

interface SDKInstances {
  coordinator: InstanceType<
    typeof import('lotus-sdk').P2P.P2PCoordinator
  > | null
  sdkModule: typeof import('lotus-sdk') | null
}

const sdk: SDKInstances = {
  coordinator: null,
  sdkModule: null,
}

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
      state.connectionState === P2PConnectionState.FULLY_OPERATIONAL,

    isDHTReady: (state): boolean =>
      state.connectionState === P2PConnectionState.DHT_INITIALIZING ||
      state.connectionState === P2PConnectionState.DHT_READY ||
      state.connectionState === P2PConnectionState.FULLY_OPERATIONAL,

    isAdvertisingPresence: (state): boolean => state.myPresenceConfig !== null,

    recentActivity: (state): P2PActivityEvent[] =>
      state.activityEvents.slice(0, 20),
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

        const sdkModule = await import('lotus-sdk')
        sdk.sdkModule = sdkModule

        // Get or create persistent P2P identity using SDK utilities
        const privateKey = await getOrCreateP2PPrivateKey(sdkModule)

        let savedConfig: Record<string, unknown> = {}
        if (typeof localStorage !== 'undefined') {
          const saved = localStorage.getItem('p2p-config')
          if (saved) {
            try {
              savedConfig = JSON.parse(saved)
            } catch {
              // Ignore
            }
          }
        }

        const p2pConfig = {
          privateKey, // Use persistent identity
          enableDHT: true,
          enableGossipSub: true,
          enableRelay: true,
          enableAutoNAT: true,
          enableDCUTR: true,
          bootstrapPeers: [
            '/dns4/bootstrap.lotusia.org/tcp/6970/wss/p2p/12D3KooWCsJoL2VW9Fp3Z2s4qUJQRuFkSTFtg144FdACZnu2FoX1',
          ],
          ...savedConfig,
          ...config,
        }

        sdk.coordinator = new sdkModule.P2P.P2PCoordinator(p2pConfig)

        this._setupEventHandlers()

        await sdk.coordinator.start()

        this.peerId = sdk.coordinator.peerId
        this.multiaddrs = sdk.coordinator.getStats().multiaddrs
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
     */
    getCoordinator() {
      return sdk.coordinator
    },

    /**
     * Get the SDK module
     */
    getSDKModule() {
      return sdk.sdkModule
    },

    // ========================================================================
    // Event Handlers
    // ========================================================================

    _setupEventHandlers() {
      const coordinator = sdk.coordinator
      if (!coordinator) return

      // Listen for SDK's connection state changes (new in SDK v2.1)
      coordinator.on('connection:state-changed', data => {
        console.log(
          `[P2P] Connection state changed: ${data.previousState} → ${data.currentState}`,
        )

        // Map SDK state to our state enum
        const stateMap: Record<string, P2PConnectionState> = {
          disconnected: P2PConnectionState.DISCONNECTED,
          connecting: P2PConnectionState.CONNECTING,
          connected: P2PConnectionState.CONNECTED,
          dht_initializing: P2PConnectionState.DHT_INITIALIZING,
          dht_ready: P2PConnectionState.DHT_READY,
          fully_operational: P2PConnectionState.FULLY_OPERATIONAL,
          reconnecting: P2PConnectionState.RECONNECTING,
          error: P2PConnectionState.ERROR,
        }

        const newState =
          stateMap[data.currentState] || P2PConnectionState.DISCONNECTED
        this.connectionState = newState

        if (data.error) {
          this.error = data.error
        }

        // Update DHT ready flag based on state
        this.dhtReady =
          newState === P2PConnectionState.DHT_INITIALIZING ||
          newState === P2PConnectionState.DHT_READY ||
          newState === P2PConnectionState.FULLY_OPERATIONAL

        // Update connected flag
        this.connected =
          newState !== P2PConnectionState.DISCONNECTED &&
          newState !== P2PConnectionState.ERROR
      })

      coordinator.on('peer:connect', (peer: { peerId: string }) => {
        const peerInfo: UIPeerInfo = {
          peerId: peer.peerId,
          multiaddrs: [],
          lastSeen: Date.now(),
        }

        if (!this.connectedPeers.find(p => p.peerId === peer.peerId)) {
          this.connectedPeers.push(peerInfo)
          this._addActivityEvent({
            type: 'peer_joined',
            peerId: peer.peerId,
            message: `Peer connected: ${peer.peerId.slice(0, 12)}...`,
          })
        }
      })

      coordinator.on('peer:disconnect', (peer: { peerId: string }) => {
        this.connectedPeers = this.connectedPeers.filter(
          p => p.peerId !== peer.peerId,
        )
        this._addActivityEvent({
          type: 'peer_left',
          peerId: peer.peerId,
          message: `Peer disconnected: ${peer.peerId.slice(0, 12)}...`,
        })
      })

      coordinator.on('error', error => {
        console.error('[P2P] Error:', error)
        this._addActivityEvent({
          type: 'error',
          peerId: this.peerId,
          message: `Error: ${error.message}`,
        })
      })
    },

    // ========================================================================
    // Connection State Management
    // ========================================================================

    _startConnectionStateMonitor() {
      if (connectionStateMonitorId) {
        clearInterval(connectionStateMonitorId)
      }
      // Monitor stats updates (state is handled by SDK events)
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
      const coordinator = sdk.coordinator
      if (!coordinator || !this.initialized) {
        this.connectionState = P2PConnectionState.DISCONNECTED
        return
      }

      // Update stats from coordinator
      const dhtStats = coordinator.getDHTStats()
      this.routingTableSize = dhtStats.routingTableSize

      // Connection state is now managed by SDK's connection:state-changed events
      // This method is kept for manual stat updates only
    },

    // ========================================================================
    // Presence
    // ========================================================================

    async advertisePresence(config: PresenceConfig) {
      const coordinator = sdk.coordinator
      if (!coordinator || !this.initialized) {
        throw new Error('P2P not initialized')
      }

      const now = Date.now()
      const advertisementId = `presence-${this.peerId}`

      // Create a discovery-compatible advertisement
      // This matches the SDK's DiscoveryAdvertisement format
      const advertisement = {
        id: advertisementId,
        protocol: PRESENCE_PROTOCOL,
        peerInfo: {
          peerId: this.peerId,
          multiaddrs: this.multiaddrs,
        },
        capabilities: ['wallet-presence'],
        createdAt: now,
        expiresAt: now + PRESENCE_TTL,
        reputation: 50,
        // Wallet-specific data
        walletAddress: config.walletAddress,
        nickname: config.nickname,
        avatar: config.avatar,
      }

      // Store in DHT using discovery resource format
      await coordinator.announceResource(
        PRESENCE_RESOURCE_TYPE,
        advertisementId,
        advertisement,
        {
          ttl: PRESENCE_TTL,
          expiresAt: advertisement.expiresAt,
        },
      )

      // Publish to GossipSub topic for real-time discovery
      await coordinator.publishToTopic(PRESENCE_TOPIC, advertisement)

      // Subscribe to presence topic for discovering other wallets
      await coordinator.subscribeToTopic(PRESENCE_TOPIC, (data: Uint8Array) => {
        this._handlePresenceMessage(data)
      })

      this.myPresenceConfig = config
      this._savePresenceConfig(config)
    },

    async withdrawPresence() {
      const coordinator = sdk.coordinator
      if (coordinator && this.myPresenceConfig) {
        await coordinator.unsubscribeFromTopic(PRESENCE_TOPIC)
      }
      this.myPresenceConfig = null
      this._savePresenceConfig(null)
    },

    _handlePresenceMessage(data: Uint8Array) {
      try {
        const text = new TextDecoder().decode(data)
        const presence = JSON.parse(text)
        this._handlePresenceDiscovered(presence)
      } catch {
        // Ignore malformed messages
      }
    },

    _handlePresenceDiscovered(presence: {
      // Discovery advertisement format
      id?: string
      protocol?: string
      peerInfo?: {
        peerId?: string
        multiaddrs?: string[]
      }
      createdAt?: number
      expiresAt?: number
      // Wallet-specific fields
      walletAddress?: string
      nickname?: string
      avatar?: string
      // Legacy format support
      peerId?: string
      multiaddrs?: string[]
      timestamp?: number
    }) {
      // Skip if not a wallet-presence advertisement
      if (presence.protocol && presence.protocol !== PRESENCE_PROTOCOL) {
        return
      }

      // Extract peer info from either format
      const peerId = presence.peerInfo?.peerId ?? presence.peerId ?? ''
      const multiaddrs =
        presence.peerInfo?.multiaddrs ?? presence.multiaddrs ?? []

      // Skip our own presence
      if (peerId === this.peerId) {
        return
      }

      const now = Date.now()
      const uiPresence: UIPresenceAdvertisement = {
        id: presence.id ?? `${peerId}-presence`,
        peerId,
        multiaddrs,
        walletAddress: presence.walletAddress ?? '',
        nickname: presence.nickname,
        avatar: presence.avatar,
        createdAt: presence.createdAt ?? presence.timestamp ?? now,
        expiresAt:
          presence.expiresAt ?? (presence.timestamp ?? now) + PRESENCE_TTL,
      }

      // Skip expired presence
      if (uiPresence.expiresAt <= now) {
        return
      }

      const existingIndex = this.onlinePeers.findIndex(
        p => p.peerId === uiPresence.peerId,
      )

      if (existingIndex >= 0) {
        this.onlinePeers[existingIndex] = uiPresence
      } else {
        this.onlinePeers.push(uiPresence)
      }

      this._cleanupExpiredPresence()
    },

    _cleanupExpiredPresence() {
      const now = Date.now()
      this.onlinePeers = this.onlinePeers.filter(p => p.expiresAt > now)
    },

    _savePresenceConfig(config: PresenceConfig | null) {
      if (typeof localStorage === 'undefined') return
      if (config) {
        localStorage.setItem(
          STORAGE_KEY_PRESENCE_CONFIG,
          JSON.stringify(config),
        )
      } else {
        localStorage.removeItem(STORAGE_KEY_PRESENCE_CONFIG)
      }
    },

    async _restoreSavedPresence() {
      if (typeof localStorage === 'undefined') return
      const saved = localStorage.getItem(STORAGE_KEY_PRESENCE_CONFIG)
      if (saved) {
        try {
          const config = JSON.parse(saved) as PresenceConfig
          await this.advertisePresence(config)
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

    async connectToPeer(multiaddr: string) {
      const coordinator = sdk.coordinator
      if (!coordinator) {
        throw new Error('P2P not initialized')
      }
      await coordinator.connectToPeer(multiaddr)
    },

    async disconnectFromPeer(peerId: string) {
      const coordinator = sdk.coordinator
      if (!coordinator) {
        throw new Error('P2P not initialized')
      }
      await coordinator.disconnectFromPeer(peerId)
      this.connectedPeers = this.connectedPeers.filter(p => p.peerId !== peerId)
    },

    // ========================================================================
    // Lifecycle
    // ========================================================================

    async stop() {
      this._stopConnectionStateMonitor()

      if (sdk.coordinator) {
        await sdk.coordinator.stop()
        sdk.coordinator = null
      }

      this.initialized = false
      this.connected = false
      this.connectionState = P2PConnectionState.DISCONNECTED
      this.connectedPeers = []
      this.onlinePeers = []
      this.activityEvents = []
      this.error = null
    },
  },
})
