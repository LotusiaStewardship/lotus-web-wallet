/**
 * P2P Store
 *
 * Thin UI adapter layer for lotus-sdk P2P functionality.
 * This store manages reactive UI state and delegates all P2P operations to the SDK.
 *
 * Architecture:
 * - UI State: Reactive Pinia state for Vue components
 * - SDK Delegation: All P2P logic lives in lotus-sdk (P2PCoordinator, MuSig2Discovery)
 * - Type Adaptation: Converts SDK types to UI-friendly representations
 *
 * The store does NOT reimplement P2P logic - it wraps the SDK.
 */
import { defineStore } from 'pinia'
import { useWalletStore } from './wallet'

// SDK Type Imports (type-only, no runtime cost)
import type * as P2PTypes from 'lotus-sdk/lib/p2p'
import type { MuSig2SignerAdvertisement } from 'lotus-sdk/lib/p2p/musig2/discovery-types'
import type {
  TransactionType,
  SessionAnnouncement,
} from 'lotus-sdk/lib/p2p/musig2/types'
import type { MuSig2P2PCoordinator } from 'lotus-sdk/lib/p2p/musig2/coordinator'

// ============================================================================
// UI-Layer Type Definitions
// ============================================================================
// These are UI-friendly representations of SDK types.
// They use serializable primitives (strings) instead of SDK classes (PublicKey).

/**
 * UI-friendly peer information
 * Simplified from SDK's PeerInfo for display purposes
 */
export interface UIPeerInfo {
  peerId: string
  multiaddrs: string[]
  nickname?: string
  lastSeen?: number
}

/**
 * UI-friendly MuSig2 signer representation
 * Adapted from SDK's MuSig2SignerAdvertisement for display
 */
export interface UISignerAdvertisement {
  id: string
  peerId: string
  multiaddrs: string[]
  /** Hex-encoded public key (SDK uses PublicKey class) */
  publicKeyHex: string
  transactionTypes: string[]
  amountRange?: { min?: number; max?: number }
  nickname?: string
  description?: string
  fee?: number
  averageResponseTime?: number
  reputation: number
  createdAt: number
  expiresAt: number
  /** Burn-based identity info */
  identity?: {
    identityId: string
    totalBurned: number
    maturationBlocks: number
    registeredAt: number
  }
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
  type: 'peer_joined' | 'peer_left' | 'signer_available' | 'signer_unavailable'
  peerId: string
  nickname?: string
  protocol?: string
  timestamp: number
  message: string
}

/**
 * Active subscription tracking (UI state only)
 */
export interface UISubscription {
  id: string
  protocol: string
  active: boolean
  createdAt: number
}

/**
 * P2P Connection State
 * Provides granular status for better UX feedback
 */
export enum P2PConnectionState {
  /** Not connected to P2P network */
  DISCONNECTED = 'disconnected',
  /** P2P coordinator is starting */
  CONNECTING = 'connecting',
  /** Connected to bootstrap node but DHT not ready */
  CONNECTED = 'connected',
  /** DHT has peers in routing table */
  DHT_READY = 'dht_ready',
  /** Fully operational: DHT ready + subscriptions active */
  FULLY_OPERATIONAL = 'fully_operational',
  /** Error state */
  ERROR = 'error',
}

/**
 * Signer advertisement configuration (UI input)
 */
export interface SignerConfig {
  /** Hex-encoded public key */
  publicKeyHex: string
  transactionTypes: string[]
  amountRange?: { min?: number; max?: number }
  nickname?: string
  description?: string
  fee?: number
}

/**
 * Presence advertisement configuration (UI input)
 */
export interface PresenceConfig {
  walletAddress: string
  nickname?: string
  avatar?: string
}

// ============================================================================
// Signing Session Types
// ============================================================================

/**
 * Signing session phase for UI display
 */
export enum SigningSessionPhase {
  /** Session created, waiting for participants */
  WAITING_FOR_PARTICIPANTS = 'waiting_for_participants',
  /** Exchanging nonces (MuSig2 Round 1) */
  NONCE_EXCHANGE = 'nonce_exchange',
  /** Exchanging partial signatures (MuSig2 Round 2) */
  SIGNATURE_EXCHANGE = 'signature_exchange',
  /** Session complete, signature ready */
  COMPLETE = 'complete',
  /** Session aborted */
  ABORTED = 'aborted',
  /** Session error */
  ERROR = 'error',
}

/**
 * UI-friendly signing session representation
 */
export interface UISigningSession {
  /** Session ID */
  id: string
  /** Current phase */
  phase: SigningSessionPhase
  /** Whether we are the coordinator */
  isCoordinator: boolean
  /** Coordinator peer ID */
  coordinatorPeerId: string
  /** Total number of signers required */
  totalSigners: number
  /** Number of participants who have joined */
  joinedCount: number
  /** Number of nonces collected */
  noncesCollected: number
  /** Number of partial signatures collected */
  partialSigsCollected: number
  /** Message being signed (hex) */
  messageHash: string
  /** Final signature (hex) if complete */
  finalSignature?: string
  /** Error message if failed */
  error?: string
  /** Creation timestamp */
  createdAt: number
  /** Last activity timestamp */
  lastActivity: number
  /** Session metadata */
  metadata?: Record<string, unknown>
}

/**
 * Incoming signing request from another peer
 */
export interface UIIncomingSigningRequest {
  /** Request ID */
  id: string
  /** Session announcement */
  sessionId: string
  /** Requester peer ID */
  requesterPeerId: string
  /** Requester nickname */
  requesterNickname?: string
  /** Message hash to sign */
  messageHash: string
  /** Number of signers required */
  requiredSigners: number
  /** Transaction type */
  transactionType?: string
  /** Amount (if applicable) */
  amount?: number
  /** Purpose/description */
  purpose?: string
  /** Timestamp */
  timestamp: number
  /** Expiration */
  expiresAt: number
}

// ============================================================================
// Store State
// ============================================================================

export interface P2PState {
  // Connection state
  initialized: boolean
  connected: boolean
  connectionState: P2PConnectionState
  peerId: string
  multiaddrs: string[]

  // Peer management (UI-friendly)
  connectedPeers: UIPeerInfo[]

  // Discovery state (UI-friendly representations)
  discoveredSigners: UISignerAdvertisement[]
  onlinePeers: UIPresenceAdvertisement[]
  activeSubscriptions: Map<string, UISubscription>

  // My advertisements (UI state tracking)
  mySignerConfig: SignerConfig | null
  myPresenceConfig: PresenceConfig | null

  // Signing sessions
  activeSessions: Map<string, UISigningSession>
  incomingRequests: UIIncomingSigningRequest[]

  // Activity feed
  activityEvents: P2PActivityEvent[]

  // Network stats
  dhtReady: boolean
  routingTableSize: number

  // Error state
  error: string | null
}

// ============================================================================
// Constants
// ============================================================================

const MAX_ACTIVITY_EVENTS = 50

// Initialization lock to prevent race conditions
let initializationPromise: Promise<void> | null = null

// Auto-connect rate limiting (timestamps of recent attempts)
const autoConnectAttempts: number[] = []

// Connection state monitor interval ID
let connectionStateMonitorId: ReturnType<typeof setInterval> | null = null

// DHT bootstrap query retry state
let dhtBootstrapAttempts = 0
let dhtBootstrapTimeoutId: ReturnType<typeof setTimeout> | null = null

// LocalStorage keys for persistence
const STORAGE_KEY_SIGNER_CONFIG = 'p2p-signer-config'
const STORAGE_KEY_PRESENCE_CONFIG = 'p2p-presence-config'

// Reconnection state
let reconnectAttempts = 0
let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null
const MAX_RECONNECT_ATTEMPTS = 10
const RECONNECT_BASE_DELAY = 2000 // 2 seconds

// ============================================================================
// SDK Instance References (non-reactive, outside store)
// ============================================================================
// These hold references to SDK instances. They are NOT part of reactive state
// because SDK classes are not serializable and should not be proxied by Vue.

interface SDKInstances {
  /**
   * MuSig2P2PCoordinator is the high-level coordinator that bundles:
   * - P2PCoordinator (core networking)
   * - MuSig2Discovery (signer discovery)
   * - Session management (nonce/signature exchange)
   */
  musig2Coordinator: MuSig2P2PCoordinator | null
  // Cache the SDK module for type conversions
  sdkModule: typeof import('lotus-sdk') | null
}

const sdk: SDKInstances = {
  musig2Coordinator: null,
  sdkModule: null,
}

/**
 * Get the underlying P2PCoordinator from MuSig2P2PCoordinator
 * Note: MuSig2P2PCoordinator doesn't expose its internal coordinator directly,
 * but we can access stats and peer info through its public API
 */
function getCoordinatorStats() {
  // MuSig2P2PCoordinator exposes peerId and discovery, but not the full coordinator
  // We'll need to track stats separately or access via discovery
  return sdk.musig2Coordinator
}

// ============================================================================
// Type Conversion Utilities
// ============================================================================

/**
 * Convert SDK MuSig2SignerAdvertisement to UI-friendly format
 */
function sdkSignerToUI(
  sdkAd: MuSig2SignerAdvertisement,
): UISignerAdvertisement {
  return {
    id: sdkAd.id,
    peerId: sdkAd.peerInfo?.peerId ?? '',
    multiaddrs: sdkAd.peerInfo?.multiaddrs ?? [],
    publicKeyHex:
      typeof sdkAd.publicKey === 'string'
        ? sdkAd.publicKey
        : sdkAd.publicKey?.toString?.() ?? '',
    transactionTypes: sdkAd.transactionTypes ?? [],
    amountRange: sdkAd.amountRange,
    nickname: sdkAd.signerMetadata?.nickname,
    description: sdkAd.signerMetadata?.description,
    fee: sdkAd.signerMetadata?.fee,
    averageResponseTime: sdkAd.signerMetadata?.averageResponseTime,
    reputation: sdkAd.reputation ?? 0,
    createdAt: sdkAd.createdAt ?? Date.now(),
    expiresAt: sdkAd.expiresAt ?? Date.now() + 30 * 60 * 1000,
    identity: sdkAd.signerMetadata?.identity,
  }
}

/**
 * Convert SDK PeerInfo to UI-friendly format
 */
function sdkPeerToUI(sdkPeer: P2PTypes.PeerInfo): UIPeerInfo {
  return {
    peerId: sdkPeer.peerId ?? '',
    multiaddrs: sdkPeer.multiaddrs ?? [],
    lastSeen: sdkPeer.lastSeen,
  }
}

// ============================================================================
// Store Definition
// ============================================================================

export const useP2PStore = defineStore('p2p', {
  state: (): P2PState => ({
    // Connection state
    initialized: false,
    connected: false,
    connectionState: P2PConnectionState.DISCONNECTED,
    peerId: '',
    multiaddrs: [],

    // Peer management
    connectedPeers: [],

    // Discovery state
    discoveredSigners: [],
    onlinePeers: [],
    activeSubscriptions: new Map(),

    // My advertisements
    mySignerConfig: null,
    myPresenceConfig: null,

    // Signing sessions
    activeSessions: new Map(),
    incomingRequests: [],

    // Activity feed
    activityEvents: [],

    // Network stats
    dhtReady: false,
    routingTableSize: 0,

    // Error state
    error: null,
  }),

  getters: {
    /** Number of connected peers */
    peerCount: (state): number => state.connectedPeers.length,

    /** Number of discovered signers */
    signerCount: (state): number => state.discoveredSigners.length,

    /** Number of online peers (wallet presence) */
    onlinePeerCount: (state): number => state.onlinePeers.length,

    /** Whether P2P is online and ready */
    isOnline: (state): boolean => state.connected && state.initialized,

    /** Get human-readable connection status message */
    connectionStatusMessage: (state): string => {
      switch (state.connectionState) {
        case P2PConnectionState.DISCONNECTED:
          return 'Not connected'
        case P2PConnectionState.CONNECTING:
          return 'Connecting to network...'
        case P2PConnectionState.CONNECTED:
          return 'Connected, initializing DHT...'
        case P2PConnectionState.DHT_READY:
          return `DHT ready (${state.routingTableSize} peers in routing table)`
        case P2PConnectionState.FULLY_OPERATIONAL:
          return `Online with ${state.connectedPeers.length} peers`
        case P2PConnectionState.ERROR:
          return state.error || 'Connection error'
        default:
          return 'Unknown state'
      }
    },

    /** Whether the network is fully operational */
    isFullyOperational: (state): boolean =>
      state.connectionState === P2PConnectionState.FULLY_OPERATIONAL,

    /** Whether DHT is ready for operations */
    isDHTReady: (state): boolean =>
      state.connectionState === P2PConnectionState.DHT_READY ||
      state.connectionState === P2PConnectionState.FULLY_OPERATIONAL,

    /** Whether currently advertising as a signer */
    isAdvertisingSigner: (state): boolean => state.mySignerConfig !== null,

    /** Whether currently advertising presence */
    isAdvertisingPresence: (state): boolean => state.myPresenceConfig !== null,

    /** Filter signers by transaction type */
    signersByTransactionType:
      state =>
      (txType: string): UISignerAdvertisement[] => {
        return state.discoveredSigners.filter(s =>
          s.transactionTypes.includes(txType),
        )
      },

    /** Filter signers by amount range */
    signersByAmountRange:
      state =>
      (amount: number): UISignerAdvertisement[] => {
        return state.discoveredSigners.filter(s => {
          const min = s.amountRange?.min ?? 0
          const max = s.amountRange?.max ?? Infinity
          return amount >= min && amount <= max
        })
      },

    /** Get recent activity events */
    recentActivity: (state): P2PActivityEvent[] => {
      return state.activityEvents.slice(0, 20)
    },

    /** Number of active signing sessions */
    activeSessionCount: (state): number => state.activeSessions.size,

    /** Number of pending incoming requests */
    pendingRequestCount: (state): number => state.incomingRequests.length,

    /** Get all active sessions as array */
    activeSessionsList: (state): UISigningSession[] =>
      Array.from(state.activeSessions.values()),

    /** Get sessions by phase */
    sessionsByPhase:
      state =>
      (phase: SigningSessionPhase): UISigningSession[] =>
        Array.from(state.activeSessions.values()).filter(
          s => s.phase === phase,
        ),

    /** Check if there are any sessions in progress */
    hasActiveSigningSessions: (state): boolean => {
      for (const session of state.activeSessions.values()) {
        if (
          session.phase !== SigningSessionPhase.COMPLETE &&
          session.phase !== SigningSessionPhase.ABORTED &&
          session.phase !== SigningSessionPhase.ERROR
        ) {
          return true
        }
      }
      return false
    },
  },

  actions: {
    // ========================================================================
    // Initialization
    // ========================================================================

    /**
     * Initialize P2P network
     * Uses a lock to prevent race conditions when called from multiple components
     */
    async initialize(config?: Record<string, unknown>) {
      // Already initialized
      if (this.initialized) return

      // If initialization is in progress, wait for it
      if (initializationPromise) {
        await initializationPromise
        return
      }

      // Create initialization promise to prevent concurrent calls
      initializationPromise = this._doInitialize(config)

      try {
        await initializationPromise
      } finally {
        initializationPromise = null
      }
    },

    /**
     * Internal initialization implementation
     *
     * Uses MuSig2P2PCoordinator which bundles:
     * - P2PCoordinator (core networking)
     * - MuSig2Discovery (signer discovery)
     * - Session management (nonce/signature exchange)
     */
    async _doInitialize(config?: Record<string, unknown>) {
      try {
        // Set connecting state
        this.connectionState = P2PConnectionState.CONNECTING

        // Dynamic import for browser compatibility
        const sdkModule = await import('lotus-sdk')
        sdk.sdkModule = sdkModule

        // Load saved configuration from localStorage
        let savedConfig: Record<string, unknown> = {}
        if (typeof localStorage !== 'undefined') {
          const saved = localStorage.getItem('p2p-config')
          if (saved) {
            try {
              savedConfig = JSON.parse(saved)
            } catch {
              // Ignore parse errors
            }
          }
        }

        // P2P configuration for the underlying P2PCoordinator
        const p2pConfig = {
          enableDHT: true,
          enableGossipSub: true,
          enableRelay: true,
          enableAutoNAT: true,
          enableDCUTR: true,
          bootstrapPeers: [
            // Lotusia bootstrap nodes (WebSocket for browser compatibility)
            '/dns4/bootstrap.lotusia.org/tcp/6970/wss/p2p/12D3KooWCsJoL2VW9Fp3Z2s4qUJQRuFkSTFtg144FdACZnu2FoX1',
          ],
          // Apply saved config, then override with passed config
          ...savedConfig,
          ...config,
        }

        // MuSig2 discovery configuration
        const discoveryConfig = {
          enableAutoRefresh: true,
          signerRefreshInterval: 5 * 60 * 1000, // 5 minutes
        }

        // Create MuSig2P2PCoordinator which bundles everything
        sdk.musig2Coordinator = new sdkModule.P2P.MuSig2P2PCoordinator(
          p2pConfig,
          undefined, // musig2Config - use defaults
          undefined, // securityConfig - use defaults
          discoveryConfig,
        )

        // Setup event handlers on the underlying P2PCoordinator
        this._setupEventHandlers()

        // Setup MuSig2 event handlers for signing sessions
        this._setupMuSig2EventHandlers()

        // Start the coordinator (this starts P2P + discovery)
        await sdk.musig2Coordinator.start()

        // Get the underlying P2PCoordinator for stats
        const p2pCoordinator = sdk.musig2Coordinator.getP2PCoordinator()

        this.peerId = sdk.musig2Coordinator.peerId
        this.multiaddrs = p2pCoordinator.getStats().multiaddrs
        this.initialized = true
        this.connected = true
        this.connectionState = P2PConnectionState.CONNECTED
        this.error = null

        // Subscribe to signer discovery
        await this.subscribeToSigners()

        // Subscribe to peer exchange for mesh formation
        await this._subscribeToPeerExchange()

        // Start connection state monitoring
        this._startConnectionStateMonitor()

        // Update connection state based on current DHT status
        this._updateConnectionState()

        // Schedule DHT bootstrap query (with delay for DHT to become ready)
        this._scheduleDHTBootstrapQuery()

        // Restore saved signer/presence advertisements
        await this._restoreSavedAdvertisements()
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
     * Get the underlying P2PCoordinator from MuSig2P2PCoordinator
     * Helper method for accessing low-level P2P functionality
     */
    _getP2PCoordinator() {
      return sdk.musig2Coordinator?.getP2PCoordinator() ?? null
    },

    /**
     * Get the MuSig2Discovery instance
     * Helper method for accessing discovery functionality
     */
    _getDiscovery() {
      return sdk.musig2Coordinator?.getDiscovery() ?? null
    },

    /**
     * Setup P2P event handlers (internal)
     */
    _setupEventHandlers() {
      const coordinator = this._getP2PCoordinator()
      if (!coordinator) return

      coordinator.on('peer:connect', (peer: { peerId: string }) => {
        console.log('Peer connected:', peer.peerId)
        this._updatePeerList()
        this._updateConnectionState()
        this._addActivityEvent({
          type: 'peer_joined',
          peerId: peer.peerId,
          message: `Peer ${peer.peerId.slice(0, 12)}... connected`,
        })
      })

      coordinator.on('peer:disconnect', (peer: { peerId: string }) => {
        console.log('Peer disconnected:', peer.peerId)
        this._updatePeerList()
        this._updateConnectionState()
        this._addActivityEvent({
          type: 'peer_left',
          peerId: peer.peerId,
          message: `Peer ${peer.peerId.slice(0, 12)}... disconnected`,
        })
      })

      // Handle peer discovery - auto-connect to discovered peers for mesh formation
      coordinator.on(
        'peer:discovery',
        (peerInfo: { peerId: string; multiaddrs?: string[] }) => {
          console.log('Peer discovered:', peerInfo.peerId)
          this._handlePeerDiscovered(peerInfo)
        },
      )

      coordinator.on('error', (error: Error) => {
        console.error('P2P error:', error)
        this.error = error.message
        this.connectionState = P2PConnectionState.ERROR
      })

      // Monitor for bootstrap disconnection and attempt reconnection
      coordinator.on('peer:disconnect', () => {
        // Check if we've lost all connections
        if (this.connectedPeers.length === 0) {
          console.log('[P2P] All connections lost, scheduling reconnection...')
          this._scheduleReconnection()
        }
      })
    },

    // ========================================================================
    // Automatic Reconnection
    // ========================================================================

    /**
     * Schedule reconnection attempt with exponential backoff
     */
    _scheduleReconnection() {
      // Clear any existing reconnection timeout
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId)
      }

      // Check if we've exceeded max attempts
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('[P2P] Max reconnection attempts reached, giving up')
        this.connectionState = P2PConnectionState.ERROR
        this.error = 'Connection lost. Please reconnect manually.'
        reconnectAttempts = 0
        return
      }

      // Calculate delay with exponential backoff (2s, 4s, 8s, 16s, max 60s)
      const delay = Math.min(
        RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts),
        60000,
      )

      console.log(
        `[P2P] Reconnection attempt ${
          reconnectAttempts + 1
        }/${MAX_RECONNECT_ATTEMPTS} in ${delay / 1000}s`,
      )

      this.connectionState = P2PConnectionState.CONNECTING

      reconnectTimeoutId = setTimeout(async () => {
        await this._attemptReconnection()
      }, delay)
    },

    /**
     * Save current P2P configuration to localStorage
     */
    _saveConfig(config: Record<string, unknown>) {
      if (typeof localStorage === 'undefined') return

      try {
        localStorage.setItem('p2p-config', JSON.stringify(config))
      } catch (error) {
        console.warn('[P2P] Failed to save config:', error)
      }
    },

    /**
     * Attempt to reconnect to bootstrap nodes
     */
    async _attemptReconnection() {
      const coordinator = this._getP2PCoordinator()
      if (!coordinator) {
        // Coordinator was stopped, don't reconnect
        return
      }

      reconnectAttempts++

      try {
        // Get bootstrap peers from saved config or use default
        let bootstrapPeers: string[] = [
          '/dns4/bootstrap.lotusia.org/tcp/6970/wss/p2p/12D3KooWCsJoL2VW9Fp3Z2s4qUJQRuFkSTFtg144FdACZnu2FoX1',
        ]

        const savedConfig = localStorage.getItem('p2p-config')
        if (savedConfig) {
          try {
            const config = JSON.parse(savedConfig)
            if (
              Array.isArray(config.bootstrapPeers) &&
              config.bootstrapPeers.length > 0
            ) {
              bootstrapPeers = config.bootstrapPeers
            }
          } catch {
            // Use default
          }
        }

        // Try to connect to each bootstrap peer
        for (const peer of bootstrapPeers) {
          try {
            await coordinator.connectToPeer(peer)
            console.log('[P2P] Reconnected to bootstrap:', peer)
            reconnectAttempts = 0 // Reset on success
            this._updateConnectionState()
            return
          } catch (error) {
            console.debug('[P2P] Failed to reconnect to:', peer, error)
          }
        }

        // All bootstrap peers failed, schedule another attempt
        this._scheduleReconnection()
      } catch (error) {
        console.error('[P2P] Reconnection attempt failed:', error)
        this._scheduleReconnection()
      }
    },

    /**
     * Cancel any pending reconnection attempts
     */
    _cancelReconnection() {
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId)
        reconnectTimeoutId = null
      }
      reconnectAttempts = 0
    },

    /**
     * Handle discovered peer - auto-connect for mesh formation
     */
    async _handlePeerDiscovered(peerInfo: {
      peerId: string
      multiaddrs?: string[]
    }) {
      const coordinator = this._getP2PCoordinator()
      if (!coordinator) return

      // Don't connect to ourselves
      if (peerInfo.peerId === this.peerId) return

      // Check if already connected
      if (coordinator.isConnected(peerInfo.peerId)) return

      // Rate limit: max 5 auto-connect attempts per minute
      const now = Date.now()
      const recentAttempts = autoConnectAttempts.filter(
        t => now - t < 60000,
      ).length
      if (recentAttempts >= 5) {
        console.log(
          '[P2P] Auto-connect rate limited, skipping:',
          peerInfo.peerId,
        )
        return
      }

      // Check max connections (don't exceed 20 for browser wallets)
      const currentPeers = coordinator.getConnectedPeers()
      if (currentPeers.length >= 20) {
        console.log(
          '[P2P] Max connections reached, skipping auto-connect:',
          peerInfo.peerId,
        )
        return
      }

      // Try to connect if we have multiaddrs
      if (peerInfo.multiaddrs && peerInfo.multiaddrs.length > 0) {
        autoConnectAttempts.push(now)
        // Keep only recent attempts
        while (
          autoConnectAttempts.length > 0 &&
          now - autoConnectAttempts[0] > 60000
        ) {
          autoConnectAttempts.shift()
        }

        try {
          console.log(
            '[P2P] Auto-connecting to discovered peer:',
            peerInfo.peerId,
          )
          await coordinator.connectToPeer(peerInfo.multiaddrs[0])
          console.log('[P2P] Auto-connect successful:', peerInfo.peerId)
        } catch (error) {
          console.debug('[P2P] Auto-connect failed:', peerInfo.peerId, error)
          // Failure is expected for unreachable peers, don't log as error
        }
      }
    },

    /**
     * Update connection state based on current network status
     */
    _updateConnectionState() {
      const coordinator = this._getP2PCoordinator()
      if (!coordinator || !this.initialized) {
        this.connectionState = P2PConnectionState.DISCONNECTED
        return
      }

      const stats = coordinator.getStats()
      const dhtStats = coordinator.getDHTStats()
      const hasSubscriptions = this.activeSubscriptions.size > 0

      // Update DHT stats
      this.dhtReady = dhtStats.isReady
      this.routingTableSize = dhtStats.routingTableSize

      // Determine connection state
      if (dhtStats.isReady && hasSubscriptions && stats.peers.connected > 0) {
        this.connectionState = P2PConnectionState.FULLY_OPERATIONAL
      } else if (dhtStats.isReady) {
        this.connectionState = P2PConnectionState.DHT_READY
      } else if (stats.peers.connected > 0) {
        this.connectionState = P2PConnectionState.CONNECTED
      } else if (this.connected) {
        this.connectionState = P2PConnectionState.CONNECTING
      } else {
        this.connectionState = P2PConnectionState.DISCONNECTED
      }
    },

    /**
     * Start periodic connection state monitoring
     */
    _startConnectionStateMonitor() {
      // Clear any existing monitor
      if (connectionStateMonitorId) {
        clearInterval(connectionStateMonitorId)
      }

      // Check connection state every 5 seconds
      connectionStateMonitorId = setInterval(() => {
        this._updateConnectionState()
      }, 5000)
    },

    /**
     * Stop connection state monitoring
     */
    _stopConnectionStateMonitor() {
      if (connectionStateMonitorId) {
        clearInterval(connectionStateMonitorId)
        connectionStateMonitorId = null
      }
      if (dhtBootstrapTimeoutId) {
        clearTimeout(dhtBootstrapTimeoutId)
        dhtBootstrapTimeoutId = null
      }
      // Also cancel reconnection attempts
      this._cancelReconnection()
    },

    // ========================================================================
    // Peer Exchange (Mesh Formation)
    // ========================================================================

    /**
     * Subscribe to peer exchange topic for mesh formation
     * Bootstrap node broadcasts connected peer list so wallets can discover each other
     */
    async _subscribeToPeerExchange() {
      const coordinator = this._getP2PCoordinator()
      if (!coordinator) return

      await coordinator.subscribeToTopic('lotus/peers', (data: Uint8Array) => {
        try {
          const message = JSON.parse(new TextDecoder().decode(data))
          if (
            message.type === 'peer-exchange' &&
            Array.isArray(message.peers)
          ) {
            this._handlePeerExchange(message)
          }
        } catch (error) {
          console.debug('[P2P] Failed to parse peer exchange:', error)
        }
      })

      console.log('[P2P] Subscribed to peer exchange topic')
    },

    /**
     * Handle peer exchange message from bootstrap node
     */
    async _handlePeerExchange(message: {
      bootstrapPeerId: string
      peers: Array<{
        peerId: string
        multiaddrs: string[]
        relayAddr?: string
        lastSeen: number
      }>
      timestamp: number
    }) {
      const coordinator = this._getP2PCoordinator()
      if (!coordinator) return

      // Filter out ourselves and already connected peers
      const newPeers = message.peers.filter(peer => {
        if (peer.peerId === this.peerId) return false
        if (this._getP2PCoordinator()!.isConnected(peer.peerId)) return false
        return true
      })

      if (newPeers.length === 0) return

      console.log(`[P2P] Peer exchange: ${newPeers.length} new peers available`)

      // Try to connect to new peers (use relay address for browser compatibility)
      for (const peer of newPeers.slice(0, 3)) {
        // Limit to 3 at a time
        const addr = peer.relayAddr || peer.multiaddrs[0]
        if (!addr) continue

        // Use the existing auto-connect handler which has rate limiting
        this._handlePeerDiscovered({
          peerId: peer.peerId,
          multiaddrs: peer.relayAddr ? [peer.relayAddr] : peer.multiaddrs,
        })
      }
    },

    // ========================================================================
    // DHT Bootstrap Query
    // ========================================================================

    /**
     * Schedule DHT bootstrap query with exponential backoff
     * Queries DHT for existing signers after DHT becomes ready
     */
    _scheduleDHTBootstrapQuery() {
      // Clear any existing timeout
      if (dhtBootstrapTimeoutId) {
        clearTimeout(dhtBootstrapTimeoutId)
      }

      // Calculate delay with exponential backoff (2s, 4s, 8s, 16s, max 30s)
      const baseDelay = 2000
      const delay = Math.min(
        baseDelay * Math.pow(2, dhtBootstrapAttempts),
        30000,
      )

      dhtBootstrapTimeoutId = setTimeout(async () => {
        await this._executeDHTBootstrapQuery()
      }, delay)
    },

    /**
     * Execute DHT bootstrap query for existing signers
     */
    async _executeDHTBootstrapQuery() {
      const coordinator = this._getP2PCoordinator()
      const discovery = this._getDiscovery()
      if (!coordinator || !discovery) return

      const dhtStats = coordinator.getDHTStats()

      if (!dhtStats.isReady) {
        // DHT not ready yet, retry with backoff
        dhtBootstrapAttempts++
        if (dhtBootstrapAttempts < 5) {
          console.log(
            `[P2P] DHT not ready for bootstrap query, retry ${dhtBootstrapAttempts}/5`,
          )
          this._scheduleDHTBootstrapQuery()
        } else {
          console.log('[P2P] DHT bootstrap query abandoned after 5 attempts')
        }
        return
      }

      console.log('[P2P] Executing DHT bootstrap query for existing signers...')
      dhtBootstrapAttempts = 0 // Reset on success

      try {
        // Query for existing signers via SDK
        const signers = await discovery.discoverSigners({})

        console.log(
          `[P2P] DHT bootstrap found ${signers.length} existing signers`,
        )

        // Add to UI state
        for (const signer of signers) {
          this._handleSignerDiscovered(signer)
        }
      } catch (error) {
        console.warn('[P2P] DHT bootstrap query failed:', error)
      }
    },

    // ========================================================================
    // State Persistence
    // ========================================================================

    /**
     * Restore saved signer/presence advertisements from localStorage
     */
    async _restoreSavedAdvertisements() {
      if (typeof localStorage === 'undefined') return

      // Restore signer config
      try {
        const savedSigner = localStorage.getItem(STORAGE_KEY_SIGNER_CONFIG)
        if (savedSigner) {
          const config = JSON.parse(savedSigner) as SignerConfig
          console.log('[P2P] Restoring saved signer advertisement...')
          await this.advertiseSigner(config)
          console.log('[P2P] Signer advertisement restored')
        }
      } catch (error) {
        console.warn('[P2P] Failed to restore signer config:', error)
        localStorage.removeItem(STORAGE_KEY_SIGNER_CONFIG)
      }

      // Restore presence config
      try {
        const savedPresence = localStorage.getItem(STORAGE_KEY_PRESENCE_CONFIG)
        if (savedPresence) {
          const config = JSON.parse(savedPresence) as PresenceConfig
          console.log('[P2P] Restoring saved presence advertisement...')
          await this.advertisePresence(config)
          console.log('[P2P] Presence advertisement restored')
        }
      } catch (error) {
        console.warn('[P2P] Failed to restore presence config:', error)
        localStorage.removeItem(STORAGE_KEY_PRESENCE_CONFIG)
      }
    },

    /**
     * Save signer config to localStorage
     */
    _saveSignerConfig(config: SignerConfig | null) {
      if (typeof localStorage === 'undefined') return

      if (config) {
        localStorage.setItem(STORAGE_KEY_SIGNER_CONFIG, JSON.stringify(config))
      } else {
        localStorage.removeItem(STORAGE_KEY_SIGNER_CONFIG)
      }
    },

    /**
     * Save presence config to localStorage
     */
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

    // ========================================================================
    // Peer Management
    // ========================================================================

    /**
     * Update connected peer list from SDK (internal)
     */
    _updatePeerList() {
      const coordinator = this._getP2PCoordinator()
      if (!coordinator) return

      const sdkPeers = coordinator.getConnectedPeers()
      this.connectedPeers = sdkPeers.map(sdkPeerToUI)

      const stats = coordinator.getStats()
      this.dhtReady = stats.dht?.routingTableSize > 0
      this.routingTableSize = stats.dht?.routingTableSize ?? 0
    },

    /**
     * Connect to a specific peer
     */
    async connectToPeer(multiaddr: string) {
      const coordinator = this._getP2PCoordinator()
      if (!coordinator) {
        throw new Error('P2P not initialized')
      }

      await coordinator.connectToPeer(multiaddr)
      this._updatePeerList()
    },

    /**
     * Disconnect from a peer
     */
    async disconnectFromPeer(peerId: string) {
      const coordinator = this._getP2PCoordinator()
      if (!coordinator) return

      await coordinator.disconnectFromPeer(peerId)
      this._updatePeerList()
    },

    // ========================================================================
    // MuSig2 Signer Discovery & Advertisement
    // ========================================================================

    /**
     * Subscribe to MuSig2 signer discovery
     * Delegates to SDK's MuSig2Discovery.subscribeToSigners()
     */
    async subscribeToSigners(criteria?: {
      transactionTypes?: TransactionType[]
      minAmount?: number
      maxAmount?: number
    }) {
      const discovery = this._getDiscovery()
      if (!discovery) return

      const subscriptionId = await discovery.subscribeToSigners(
        criteria ?? {},
        (sdkSigner: MuSig2SignerAdvertisement) => {
          this._handleSignerDiscovered(sdkSigner)
        },
      )

      this.activeSubscriptions.set(subscriptionId, {
        id: subscriptionId,
        protocol: 'musig2',
        active: true,
        createdAt: Date.now(),
      })

      return subscriptionId
    },

    /**
     * Handle discovered signer from SDK (internal)
     */
    _handleSignerDiscovered(sdkSigner: MuSig2SignerAdvertisement) {
      const uiSigner = sdkSignerToUI(sdkSigner)

      const existingIndex = this.discoveredSigners.findIndex(
        s => s.id === uiSigner.id,
      )

      if (existingIndex >= 0) {
        this.discoveredSigners[existingIndex] = uiSigner
      } else {
        this.discoveredSigners.push(uiSigner)
        this._addActivityEvent({
          type: 'signer_available',
          peerId: uiSigner.peerId,
          nickname: uiSigner.nickname,
          protocol: 'musig2',
          message: `${
            uiSigner.nickname || 'Anonymous'
          } is available as MuSig2 signer`,
        })
      }

      this._cleanupExpiredSigners()
    },

    /**
     * Advertise as MuSig2 signer
     * Delegates to SDK's MuSig2Discovery.advertiseSigner()
     *
     * @param config - Signer configuration from UI
     */
    async advertiseSigner(config: SignerConfig) {
      const discovery = this._getDiscovery()
      if (!this._getP2PCoordinator() || !this.initialized) {
        throw new Error('P2P not initialized')
      }

      if (!discovery || !sdk.sdkModule) {
        throw new Error('MuSig2 discovery not available')
      }

      // Convert hex public key to SDK PublicKey class
      const PublicKey = sdk.sdkModule.Bitcore.PublicKey
      const publicKey = new PublicKey(config.publicKeyHex)

      // Map string transaction types to SDK enum values
      const TransactionType = sdk.sdkModule.P2P.TransactionType
      const transactionTypes = config.transactionTypes.map(
        t => TransactionType[t.toUpperCase() as keyof typeof TransactionType],
      )

      // Call SDK's advertiseSigner with correct signature
      await discovery.advertiseSigner(publicKey, transactionTypes, {
        amountRange: config.amountRange,
        metadata: {
          nickname: config.nickname,
          description: config.description,
          fee: config.fee,
        },
      })

      // Track in UI state and persist
      this.mySignerConfig = config
      this._saveSignerConfig(config)
    },

    /**
     * Withdraw signer advertisement
     * Delegates to SDK's MuSig2Discovery.withdrawSigner()
     */
    async withdrawSignerAdvertisement() {
      if (!this.mySignerConfig) return

      const discovery = this._getDiscovery()
      if (discovery) {
        // SDK's withdrawSigner() takes no arguments
        await discovery.withdrawSigner()
      }

      this.mySignerConfig = null
      this._saveSignerConfig(null)
    },

    /**
     * Remove expired signers from UI cache (internal)
     */
    _cleanupExpiredSigners() {
      const now = Date.now()
      this.discoveredSigners = this.discoveredSigners.filter(
        s => s.expiresAt > now,
      )
    },

    // ========================================================================
    // Wallet Presence (Generic Discovery)
    // ========================================================================

    /**
     * Advertise wallet presence (go online)
     * Uses P2PCoordinator's generic resource announcement
     */
    async advertisePresence(config: PresenceConfig) {
      const coordinator = this._getP2PCoordinator()
      if (!coordinator || !this.initialized) {
        throw new Error('P2P not initialized')
      }

      const presenceData = {
        walletAddress: config.walletAddress,
        nickname: config.nickname,
        avatar: config.avatar,
        peerId: this.peerId,
        multiaddrs: this.multiaddrs,
        timestamp: Date.now(),
      }

      // Use generic resource announcement for wallet presence
      await coordinator.announceResource(
        'wallet-presence',
        `${this.peerId}-presence`,
        presenceData,
        { ttl: 60 * 60 * 1000 }, // 1 hour TTL
      )

      this.myPresenceConfig = config
      this._savePresenceConfig(config)
    },

    /**
     * Withdraw presence advertisement (go offline)
     */
    async withdrawPresence() {
      // Note: SDK doesn't have explicit withdraw for generic resources
      // The advertisement will expire naturally
      this.myPresenceConfig = null
      this._savePresenceConfig(null)
    },

    /**
     * Subscribe to wallet presence updates via GossipSub
     */
    async subscribeToPresence() {
      const coordinator = this._getP2PCoordinator()
      if (!coordinator) return

      await coordinator.subscribeToTopic(
        'wallet-presence',
        (data: Uint8Array) => {
          try {
            const presence = JSON.parse(new TextDecoder().decode(data))
            this._handlePresenceDiscovered(presence)
          } catch (error) {
            console.warn('Failed to parse presence data:', error)
          }
        },
      )

      this.activeSubscriptions.set('wallet-presence', {
        id: 'wallet-presence',
        protocol: 'wallet-presence',
        active: true,
        createdAt: Date.now(),
      })
    },

    /**
     * Handle discovered wallet presence (internal)
     * Note: Presence uses generic resource format, not a specific SDK type
     */
    _handlePresenceDiscovered(presence: {
      id?: string
      peerId?: string
      multiaddrs?: string[]
      walletAddress?: string
      nickname?: string
      avatar?: string
      timestamp?: number
    }) {
      const uiPresence: UIPresenceAdvertisement = {
        id: presence.id ?? `${presence.peerId}-presence`,
        peerId: presence.peerId ?? '',
        multiaddrs: presence.multiaddrs ?? [],
        walletAddress: presence.walletAddress ?? '',
        nickname: presence.nickname,
        avatar: presence.avatar,
        createdAt: presence.timestamp ?? Date.now(),
        expiresAt: (presence.timestamp ?? Date.now()) + 60 * 60 * 1000,
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

    /**
     * Remove expired presence from UI cache (internal)
     */
    _cleanupExpiredPresence() {
      const now = Date.now()
      this.onlinePeers = this.onlinePeers.filter(p => p.expiresAt > now)
    },

    // ========================================================================
    // Activity Feed
    // ========================================================================

    /**
     * Add an activity event to the feed (internal)
     */
    _addActivityEvent(event: Omit<P2PActivityEvent, 'id' | 'timestamp'>) {
      const fullEvent: P2PActivityEvent = {
        ...event,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
      }

      this.activityEvents.unshift(fullEvent)

      // Keep only the most recent events
      if (this.activityEvents.length > MAX_ACTIVITY_EVENTS) {
        this.activityEvents = this.activityEvents.slice(0, MAX_ACTIVITY_EVENTS)
      }
    },

    // ========================================================================
    // MuSig2 Signing Sessions
    // ========================================================================

    /**
     * Get the MuSig2P2PCoordinator instance
     * Used for signing session management
     */
    _getMuSig2Coordinator() {
      return sdk.musig2Coordinator
    },

    /**
     * Create a new signing session
     *
     * @param signerPublicKeys - Hex-encoded public keys of all signers (sorted)
     * @param message - Message to sign (hex or Buffer)
     * @param metadata - Optional session metadata
     * @returns Session ID
     */
    async createSigningSession(
      signerPublicKeys: string[],
      message: string | Buffer,
      metadata?: Record<string, unknown>,
    ): Promise<string | null> {
      const musig2 = this._getMuSig2Coordinator()
      if (!musig2 || !sdk.sdkModule) {
        throw new Error('MuSig2 coordinator not initialized')
      }

      // Convert hex public keys to SDK PublicKey instances
      const PublicKey = sdk.sdkModule.Bitcore.PublicKey
      const PrivateKey = sdk.sdkModule.Bitcore.PrivateKey
      const signers = signerPublicKeys.map(hex => new PublicKey(hex))

      // Get our private key from wallet store
      // Note: This requires integration with wallet store
      const walletStore = useWalletStore()
      const privateKeyHex = walletStore.getPrivateKeyHex()
      if (!privateKeyHex) {
        throw new Error('Wallet private key not available')
      }
      const myPrivateKey = new PrivateKey(privateKeyHex)

      // Convert message to Buffer
      const messageBuffer =
        typeof message === 'string' ? Buffer.from(message, 'hex') : message

      // Create session via SDK
      const sessionId = await musig2.createSession(
        signers,
        myPrivateKey,
        messageBuffer,
        metadata,
      )

      // Announce the session
      await musig2.announceSession(sessionId)

      // Get session and add to UI state
      const p2pSession = musig2.getSession(sessionId)
      if (p2pSession) {
        this._updateUISession(sessionId, p2pSession)
      }

      this._addActivityEvent({
        type: 'signer_available',
        peerId: this.peerId,
        message: `Created signing session ${sessionId.slice(0, 8)}...`,
      })

      return sessionId
    },

    /**
     * Join an existing signing session
     *
     * @param announcement - Session announcement from discovery
     * @returns Session ID
     */
    async joinSigningSession(announcement: {
      sessionId: string
      coordinatorPeerId: string
      signers: string[]
      messageHash: string
      requiredSigners: number
      createdAt: number
      expiresAt: number
      metadata?: Record<string, unknown>
    }): Promise<string | null> {
      const musig2 = this._getMuSig2Coordinator()
      if (!musig2 || !sdk.sdkModule) {
        throw new Error('MuSig2 coordinator not initialized')
      }

      // Get our private key from wallet store
      const walletStore = useWalletStore()
      const privateKeyHex = walletStore.getPrivateKeyHex()
      if (!privateKeyHex) {
        throw new Error('Wallet private key not available')
      }
      const PrivateKey = sdk.sdkModule.Bitcore.PrivateKey
      const myPrivateKey = new PrivateKey(privateKeyHex)

      // Join session via SDK
      const sessionId = await musig2.joinSession(
        announcement as Parameters<typeof musig2.joinSession>[0],
        myPrivateKey,
      )

      // Get session and add to UI state
      const p2pSession = musig2.getSession(sessionId)
      if (p2pSession) {
        this._updateUISession(sessionId, p2pSession)
      }

      // Remove from incoming requests
      this.incomingRequests = this.incomingRequests.filter(
        r => r.sessionId !== sessionId,
      )

      this._addActivityEvent({
        type: 'signer_available',
        peerId: this.peerId,
        message: `Joined signing session ${sessionId.slice(0, 8)}...`,
      })

      return sessionId
    },

    /**
     * Share nonces for a session (MuSig2 Round 1)
     */
    async shareNonces(sessionId: string): Promise<void> {
      const musig2 = this._getMuSig2Coordinator()
      if (!musig2 || !sdk.sdkModule) {
        throw new Error('MuSig2 coordinator not initialized')
      }

      // Get our private key
      const walletStore = useWalletStore()
      const privateKeyHex = walletStore.getPrivateKeyHex()
      if (!privateKeyHex) {
        throw new Error('Wallet private key not available')
      }
      const PrivateKey = sdk.sdkModule.Bitcore.PrivateKey
      const myPrivateKey = new PrivateKey(privateKeyHex)

      await musig2.shareNonces(sessionId, myPrivateKey)

      // Update UI state
      const p2pSession = musig2.getSession(sessionId)
      if (p2pSession) {
        this._updateUISession(sessionId, p2pSession)
      }
    },

    /**
     * Share partial signature for a session (MuSig2 Round 2)
     */
    async sharePartialSignature(sessionId: string): Promise<void> {
      const musig2 = this._getMuSig2Coordinator()
      if (!musig2 || !sdk.sdkModule) {
        throw new Error('MuSig2 coordinator not initialized')
      }

      // Get our private key
      const walletStore = useWalletStore()
      const privateKeyHex = walletStore.getPrivateKeyHex()
      if (!privateKeyHex) {
        throw new Error('Wallet private key not available')
      }
      const PrivateKey = sdk.sdkModule.Bitcore.PrivateKey
      const myPrivateKey = new PrivateKey(privateKeyHex)

      await musig2.sharePartialSignature(sessionId, myPrivateKey)

      // Update UI state
      const p2pSession = musig2.getSession(sessionId)
      if (p2pSession) {
        this._updateUISession(sessionId, p2pSession)
      }
    },

    /**
     * Finalize a session and get the final signature
     */
    async finalizeSession(sessionId: string): Promise<string | null> {
      const musig2 = this._getMuSig2Coordinator()
      if (!musig2) {
        throw new Error('MuSig2 coordinator not initialized')
      }

      const signatureBuffer = await musig2.finalizeSession(sessionId)

      // Update UI state
      const uiSession = this.activeSessions.get(sessionId)
      if (uiSession) {
        uiSession.phase = SigningSessionPhase.COMPLETE
        uiSession.finalSignature = signatureBuffer.toString('hex')
        uiSession.lastActivity = Date.now()
        this.activeSessions.set(sessionId, uiSession)
      }

      this._addActivityEvent({
        type: 'signer_available',
        peerId: this.peerId,
        message: `Signing session ${sessionId.slice(0, 8)}... completed`,
      })

      return signatureBuffer.toString('hex')
    },

    /**
     * Abort a signing session
     */
    async abortSession(sessionId: string, reason: string): Promise<void> {
      const musig2 = this._getMuSig2Coordinator()
      if (!musig2) return

      await musig2.abortSession(sessionId, reason)

      // Update UI state
      const uiSession = this.activeSessions.get(sessionId)
      if (uiSession) {
        uiSession.phase = SigningSessionPhase.ABORTED
        uiSession.error = reason
        uiSession.lastActivity = Date.now()
        this.activeSessions.set(sessionId, uiSession)
      }
    },

    /**
     * Accept an incoming signing request
     */
    async acceptSigningRequest(requestId: string): Promise<string | null> {
      const request = this.incomingRequests.find(r => r.id === requestId)
      if (!request) {
        throw new Error('Signing request not found')
      }

      // Join the session
      return this.joinSigningSession({
        sessionId: request.sessionId,
        coordinatorPeerId: request.requesterPeerId,
        signers: [], // Will be populated from announcement
        messageHash: request.messageHash,
        requiredSigners: request.requiredSigners,
        createdAt: request.timestamp,
        expiresAt: request.expiresAt,
      })
    },

    /**
     * Decline an incoming signing request
     */
    declineSigningRequest(requestId: string): void {
      this.incomingRequests = this.incomingRequests.filter(
        r => r.id !== requestId,
      )
    },

    /**
     * Update UI session state from SDK session (internal)
     * Uses 'unknown' type to avoid tight coupling with SDK types
     */
    _updateUISession(sessionId: string, p2pSession: unknown) {
      // Cast to access properties
      const session = p2pSession as {
        session: {
          sessionId: string
          signers: unknown[]
          myIndex: number
          message: Buffer
          phase?: unknown
          publicNonces?: unknown[]
          partialSignatures?: unknown[]
        }
        coordinatorPeerId: string
        participants: Map<string, unknown>
        isCoordinator: boolean
        announcement?: {
          messageHash: string
          metadata?: Record<string, unknown>
        }
        createdAt: number
        lastActivity: number
      }

      const innerSession = session.session

      // Determine phase from session state
      let phase = SigningSessionPhase.WAITING_FOR_PARTICIPANTS
      const joinedCount = session.participants.size
      const totalSigners = innerSession.signers.length
      const noncesCollected = innerSession.publicNonces?.length ?? 0
      const partialSigsCollected = innerSession.partialSignatures?.length ?? 0

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
        isCoordinator: session.isCoordinator,
        coordinatorPeerId: session.coordinatorPeerId,
        totalSigners,
        joinedCount,
        noncesCollected,
        partialSigsCollected,
        messageHash: session.announcement?.messageHash ?? '',
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        metadata: session.announcement?.metadata,
      }

      this.activeSessions.set(sessionId, uiSession)
    },

    /**
     * Setup MuSig2 event handlers (internal)
     */
    _setupMuSig2EventHandlers() {
      const musig2 = this._getMuSig2Coordinator()
      if (!musig2) return

      // Session discovered
      musig2.on('musig2:session-discovered', (announcement: unknown) => {
        const ann = announcement as {
          sessionId: string
          coordinatorPeerId: string
          messageHash: string
          requiredSigners: number
          createdAt: number
          expiresAt: number
          metadata?: Record<string, unknown>
        }

        // Add to incoming requests if we're a participant
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

        // Check if already exists
        if (!this.incomingRequests.find(r => r.sessionId === ann.sessionId)) {
          this.incomingRequests.push(request)
        }
      })

      // Participant joined
      musig2.on(
        'musig2:participant-joined',
        (data: { sessionId: string; peerId: string }) => {
          const p2pSession = musig2.getSession(data.sessionId)
          if (p2pSession) {
            this._updateUISession(data.sessionId, p2pSession)
          }
        },
      )

      // Nonce received
      musig2.on(
        'musig2:nonce-received',
        (data: { sessionId: string; signerIndex: number }) => {
          const p2pSession = musig2.getSession(data.sessionId)
          if (p2pSession) {
            this._updateUISession(data.sessionId, p2pSession)
          }
        },
      )

      // All nonces complete
      musig2.on('musig2:nonces-complete', (data: { sessionId: string }) => {
        const p2pSession = musig2.getSession(data.sessionId)
        if (p2pSession) {
          this._updateUISession(data.sessionId, p2pSession)
        }
      })

      // Partial signature received
      musig2.on(
        'musig2:partial-sig-received',
        (data: { sessionId: string; signerIndex: number }) => {
          const p2pSession = musig2.getSession(data.sessionId)
          if (p2pSession) {
            this._updateUISession(data.sessionId, p2pSession)
          }
        },
      )

      // Session complete
      musig2.on(
        'musig2:session-complete',
        (data: { sessionId: string; signature: Buffer }) => {
          const uiSession = this.activeSessions.get(data.sessionId)
          if (uiSession) {
            uiSession.phase = SigningSessionPhase.COMPLETE
            uiSession.finalSignature = data.signature.toString('hex')
            uiSession.lastActivity = Date.now()
            this.activeSessions.set(data.sessionId, uiSession)
          }
        },
      )

      // Session aborted
      musig2.on(
        'musig2:session-aborted',
        (data: { sessionId: string; reason: string }) => {
          const uiSession = this.activeSessions.get(data.sessionId)
          if (uiSession) {
            uiSession.phase = SigningSessionPhase.ABORTED
            uiSession.error = data.reason
            uiSession.lastActivity = Date.now()
            this.activeSessions.set(data.sessionId, uiSession)
          }
        },
      )

      // Session error
      musig2.on(
        'musig2:session-error',
        (data: { sessionId: string; error: string }) => {
          const uiSession = this.activeSessions.get(data.sessionId)
          if (uiSession) {
            uiSession.phase = SigningSessionPhase.ERROR
            uiSession.error = data.error
            uiSession.lastActivity = Date.now()
            this.activeSessions.set(data.sessionId, uiSession)
          }
        },
      )
    },

    // ========================================================================
    // Subscription Management
    // ========================================================================

    /**
     * Unsubscribe from a discovery subscription
     */
    async unsubscribe(subscriptionId: string) {
      const subscription = this.activeSubscriptions.get(subscriptionId)
      if (!subscription) return

      const discovery = this._getDiscovery()
      const coordinator = this._getP2PCoordinator()

      if (subscription.protocol === 'musig2' && discovery) {
        await discovery.unsubscribe(subscriptionId)
      } else if (subscription.protocol === 'wallet-presence' && coordinator) {
        await coordinator.unsubscribeFromTopic('wallet-presence')
      }

      this.activeSubscriptions.delete(subscriptionId)
    },

    // ========================================================================
    // Utility
    // ========================================================================

    /**
     * Get reachable addresses for sharing
     */
    async getReachableAddresses(): Promise<string[]> {
      const coordinator = this._getP2PCoordinator()
      if (!coordinator) return []

      return await coordinator.getReachableAddresses()
    },

    /**
     * Stop P2P network and cleanup
     */
    async stop() {
      // Stop connection state monitoring
      this._stopConnectionStateMonitor()

      // Withdraw advertisements
      await this.withdrawSignerAdvertisement()
      await this.withdrawPresence()

      // Unsubscribe from all subscriptions
      for (const [id] of this.activeSubscriptions) {
        await this.unsubscribe(id)
      }

      // Stop MuSig2P2PCoordinator (this stops discovery + P2P coordinator)
      if (sdk.musig2Coordinator) {
        await sdk.musig2Coordinator.stop()
        sdk.musig2Coordinator = null
      }

      // Clear SDK module reference
      sdk.sdkModule = null

      // Reset UI state
      this.initialized = false
      this.connected = false
      this.connectionState = P2PConnectionState.DISCONNECTED
      this.peerId = ''
      this.multiaddrs = []
      this.connectedPeers = []
      this.discoveredSigners = []
      this.onlinePeers = []
      this.activeSubscriptions.clear()
      this.activityEvents = []
    },
  },
})
