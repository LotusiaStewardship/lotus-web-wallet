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
// Store State
// ============================================================================

export interface P2PState {
  // Connection state
  initialized: boolean
  connected: boolean
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

// ============================================================================
// SDK Instance References (non-reactive, outside store)
// ============================================================================
// These hold references to SDK instances. They are NOT part of reactive state
// because SDK classes are not serializable and should not be proxied by Vue.

interface SDKInstances {
  coordinator: any | null
  musig2Discovery: any | null
  // Cache the SDK module for type conversions
  sdkModule: typeof import('lotus-sdk') | null
}

const sdk: SDKInstances = {
  coordinator: null,
  musig2Discovery: null,
  sdkModule: null,
}

// ============================================================================
// Type Conversion Utilities
// ============================================================================

/**
 * Convert SDK MuSig2SignerAdvertisement to UI-friendly format
 */
function sdkSignerToUI(sdkAd: any): UISignerAdvertisement {
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
function sdkPeerToUI(sdkPeer: any): UIPeerInfo {
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
     */
    async _doInitialize(config?: Record<string, unknown>) {
      try {
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

        const defaultConfig = {
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

        sdk.coordinator = new sdkModule.P2P.P2PCoordinator(defaultConfig)

        // Setup event handlers
        this._setupEventHandlers()

        // Start the coordinator
        await sdk.coordinator.start()

        this.peerId = sdk.coordinator.peerId
        this.multiaddrs = sdk.coordinator.getStats().multiaddrs
        this.initialized = true
        this.connected = true
        this.error = null

        // Initialize MuSig2 discovery if available
        await this._initializeMuSig2Discovery()
      } catch (error) {
        console.error('Failed to initialize P2P:', error)
        this.error =
          error instanceof Error ? error.message : 'Failed to initialize P2P'
        this.connected = false
        throw error
      }
    },

    /**
     * Initialize MuSig2 discovery system (delegates to SDK)
     */
    async _initializeMuSig2Discovery() {
      if (!sdk.coordinator || !sdk.sdkModule) return

      try {
        // Check if MuSig2Discovery is available in SDK
        if (sdk.sdkModule.P2P.MuSig2Discovery) {
          sdk.musig2Discovery = new sdk.sdkModule.P2P.MuSig2Discovery(
            sdk.coordinator,
          )
          await sdk.musig2Discovery.start()

          // Subscribe to signer discovery with default criteria
          await this.subscribeToSigners()
        }
      } catch (error) {
        console.warn('MuSig2 discovery not available:', error)
      }
    },

    /**
     * Setup P2P event handlers (internal)
     */
    _setupEventHandlers() {
      if (!sdk.coordinator) return

      sdk.coordinator.on('peer:connect', (peer: { peerId: string }) => {
        console.log('Peer connected:', peer.peerId)
        this._updatePeerList()
        this._addActivityEvent({
          type: 'peer_joined',
          peerId: peer.peerId,
          message: `Peer ${peer.peerId.slice(0, 12)}... connected`,
        })
      })

      sdk.coordinator.on('peer:disconnect', (peer: { peerId: string }) => {
        console.log('Peer disconnected:', peer.peerId)
        this._updatePeerList()
        this._addActivityEvent({
          type: 'peer_left',
          peerId: peer.peerId,
          message: `Peer ${peer.peerId.slice(0, 12)}... disconnected`,
        })
      })

      sdk.coordinator.on('error', (error: Error) => {
        console.error('P2P error:', error)
        this.error = error.message
      })
    },

    // ========================================================================
    // Peer Management
    // ========================================================================

    /**
     * Update connected peer list from SDK (internal)
     */
    _updatePeerList() {
      if (!sdk.coordinator) return

      const sdkPeers = sdk.coordinator.getConnectedPeers()
      this.connectedPeers = sdkPeers.map(sdkPeerToUI)

      const stats = sdk.coordinator.getStats()
      this.dhtReady = stats.dht?.routingTableSize > 0
      this.routingTableSize = stats.dht?.routingTableSize ?? 0
    },

    /**
     * Connect to a specific peer
     */
    async connectToPeer(multiaddr: string) {
      if (!sdk.coordinator) {
        throw new Error('P2P not initialized')
      }

      await sdk.coordinator.connectToPeer(multiaddr)
      this._updatePeerList()
    },

    /**
     * Disconnect from a peer
     */
    async disconnectFromPeer(peerId: string) {
      if (!sdk.coordinator) return

      await sdk.coordinator.disconnectFromPeer(peerId)
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
      transactionTypes?: string[]
      minAmount?: number
      maxAmount?: number
    }) {
      if (!sdk.musig2Discovery) return

      const subscriptionId = await sdk.musig2Discovery.subscribeToSigners(
        criteria ?? {},
        (sdkSigner: any) => {
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
    _handleSignerDiscovered(sdkSigner: any) {
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
      if (!sdk.coordinator || !this.initialized) {
        throw new Error('P2P not initialized')
      }

      if (!sdk.musig2Discovery || !sdk.sdkModule) {
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
      await sdk.musig2Discovery.advertiseSigner(publicKey, transactionTypes, {
        amountRange: config.amountRange,
        metadata: {
          nickname: config.nickname,
          description: config.description,
          fee: config.fee,
        },
      })

      // Track in UI state
      this.mySignerConfig = config
    },

    /**
     * Withdraw signer advertisement
     * Delegates to SDK's MuSig2Discovery.withdrawSigner()
     */
    async withdrawSignerAdvertisement() {
      if (!this.mySignerConfig) return

      if (sdk.musig2Discovery) {
        // SDK's withdrawSigner() takes no arguments
        await sdk.musig2Discovery.withdrawSigner()
      }

      this.mySignerConfig = null
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
      if (!sdk.coordinator || !this.initialized) {
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
      await sdk.coordinator.announceResource(
        'wallet-presence',
        `${this.peerId}-presence`,
        presenceData,
        { ttl: 60 * 60 * 1000 }, // 1 hour TTL
      )

      this.myPresenceConfig = config
    },

    /**
     * Withdraw presence advertisement (go offline)
     */
    async withdrawPresence() {
      // Note: SDK doesn't have explicit withdraw for generic resources
      // The advertisement will expire naturally
      this.myPresenceConfig = null
    },

    /**
     * Subscribe to wallet presence updates via GossipSub
     */
    async subscribeToPresence() {
      if (!sdk.coordinator) return

      await sdk.coordinator.subscribeToTopic(
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
     */
    _handlePresenceDiscovered(presence: any) {
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
    // Subscription Management
    // ========================================================================

    /**
     * Unsubscribe from a discovery subscription
     */
    async unsubscribe(subscriptionId: string) {
      const subscription = this.activeSubscriptions.get(subscriptionId)
      if (!subscription) return

      if (subscription.protocol === 'musig2' && sdk.musig2Discovery) {
        await sdk.musig2Discovery.unsubscribe(subscriptionId)
      } else if (
        subscription.protocol === 'wallet-presence' &&
        sdk.coordinator
      ) {
        await sdk.coordinator.unsubscribeFromTopic('wallet-presence')
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
      if (!sdk.coordinator) return []

      return await sdk.coordinator.getReachableAddresses()
    },

    /**
     * Stop P2P network and cleanup
     */
    async stop() {
      // Withdraw advertisements
      await this.withdrawSignerAdvertisement()
      await this.withdrawPresence()

      // Unsubscribe from all subscriptions
      for (const [id] of this.activeSubscriptions) {
        await this.unsubscribe(id)
      }

      // Stop MuSig2 discovery
      if (sdk.musig2Discovery) {
        await sdk.musig2Discovery.stop()
        sdk.musig2Discovery = null
      }

      // Stop coordinator
      if (sdk.coordinator) {
        await sdk.coordinator.stop()
        sdk.coordinator = null
      }

      // Clear SDK module reference
      sdk.sdkModule = null

      // Reset UI state
      this.initialized = false
      this.connected = false
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
