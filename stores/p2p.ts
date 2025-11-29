/**
 * P2P Store
 * Manages P2P network state, peer discovery, and service advertisements
 */
import { defineStore } from 'pinia'

// Types from lotus-sdk P2P module
interface P2PConfig {
  privateKey?: any
  listen?: string[]
  announce?: string[]
  bootstrapPeers?: string[]
  enableDHT?: boolean
  enableGossipSub?: boolean
  enableRelay?: boolean
  enableAutoNAT?: boolean
  enableDCUTR?: boolean
}

interface PeerInfo {
  peerId: string
  publicKey?: any
  multiaddrs?: string[]
  metadata?: Record<string, unknown>
  lastSeen?: number
}

interface ResourceAnnouncement {
  resourceType: string
  resourceId: string
  data: unknown
  ttl?: number
}

// Service advertisement types
export interface ServiceAdvertisement {
  id: string
  type: 'wallet' | 'signer' | 'relay' | 'exchange' | 'custom'
  peerId: string
  name: string
  description?: string
  capabilities: string[]
  metadata: Record<string, unknown>
  createdAt: number
  expiresAt?: number
  multiaddrs?: string[]
}

export interface P2PState {
  initialized: boolean
  connected: boolean
  peerId: string
  multiaddrs: string[]
  connectedPeers: PeerInfo[]
  discoveredServices: ServiceAdvertisement[]
  myAdvertisements: ServiceAdvertisement[]
  dhtReady: boolean
  routingTableSize: number
  error: string | null
}

export const useP2PStore = defineStore('p2p', {
  state: (): P2PState => ({
    initialized: false,
    connected: false,
    peerId: '',
    multiaddrs: [],
    connectedPeers: [],
    discoveredServices: [],
    myAdvertisements: [],
    dhtReady: false,
    routingTableSize: 0,
    error: null,
  }),

  getters: {
    peerCount: state => state.connectedPeers.length,
    serviceCount: state => state.discoveredServices.length,
    isOnline: state => state.connected && state.initialized,

    // Filter services by type
    walletServices: state =>
      state.discoveredServices.filter(s => s.type === 'wallet'),
    signerServices: state =>
      state.discoveredServices.filter(s => s.type === 'signer'),
    exchangeServices: state =>
      state.discoveredServices.filter(s => s.type === 'exchange'),

    // Get recent services (last 24 hours)
    recentServices: state => {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000
      return state.discoveredServices
        .filter(s => s.createdAt > dayAgo)
        .sort((a, b) => b.createdAt - a.createdAt)
    },
  },

  actions: {
    // P2P coordinator instance (not serializable)
    _coordinator: null as any,

    /**
     * Initialize P2P network
     */
    async initialize(config?: Partial<P2PConfig>) {
      if (this.initialized) return

      try {
        // Dynamic import for browser compatibility
        const { P2P } = await import('lotus-sdk')

        const defaultConfig: P2PConfig = {
          enableDHT: true,
          enableGossipSub: true,
          enableRelay: true,
          enableAutoNAT: true,
          enableDCUTR: true,
          bootstrapPeers: [
            // Lotusia bootstrap nodes (WebSocket for browser compatibility)
            '/dns4/bootstrap.lotusia.org/tcp/6970/ws/p2p/12D3KooWCsJoL2VW9Fp3Z2s4qUJQRuFkSTFtg144FdACZnu2FoX1',
          ],
          ...config,
        }

        this._coordinator = new P2P.P2PCoordinator(defaultConfig)

        // Setup event handlers
        this.setupEventHandlers()

        // Start the coordinator
        await this._coordinator.start()

        this.peerId = this._coordinator.peerId
        this.multiaddrs = this._coordinator.getStats().multiaddrs
        this.initialized = true
        this.connected = true
        this.error = null
      } catch (error) {
        console.error('Failed to initialize P2P:', error)
        this.error =
          error instanceof Error ? error.message : 'Failed to initialize P2P'
        this.connected = false
        // Re-throw so callers can handle the error
        throw error
      }
    },

    /**
     * Setup P2P event handlers
     */
    setupEventHandlers() {
      if (!this._coordinator) return

      this._coordinator.on('peer:connect', (peerId: string) => {
        console.log('Peer connected:', peerId)
        this.updatePeerList()
      })

      this._coordinator.on('peer:disconnect', (peerId: string) => {
        console.log('Peer disconnected:', peerId)
        this.updatePeerList()
      })

      this._coordinator.on(
        'resource:announced',
        (announcement: ResourceAnnouncement) => {
          this.handleResourceAnnouncement(announcement)
        },
      )

      this._coordinator.on('error', (error: Error) => {
        console.error('P2P error:', error)
        this.error = error.message
      })
    },

    /**
     * Update connected peer list
     */
    updatePeerList() {
      if (!this._coordinator) return

      this.connectedPeers = this._coordinator.getConnectedPeers()

      const stats = this._coordinator.getStats()
      this.dhtReady = stats.dht.routingTableSize > 0
      this.routingTableSize = stats.dht.routingTableSize
    },

    /**
     * Handle incoming resource announcement
     */
    handleResourceAnnouncement(announcement: ResourceAnnouncement) {
      if (announcement.resourceType === 'service') {
        const service = announcement.data as ServiceAdvertisement

        // Check if service already exists
        const existingIndex = this.discoveredServices.findIndex(
          s => s.id === service.id,
        )

        if (existingIndex >= 0) {
          // Update existing service
          this.discoveredServices[existingIndex] = service
        } else {
          // Add new service
          this.discoveredServices.push(service)
        }

        // Remove expired services
        this.cleanupExpiredServices()
      }
    },

    /**
     * Announce a service to the network
     */
    async announceService(
      service: Omit<ServiceAdvertisement, 'id' | 'peerId' | 'createdAt'>,
    ) {
      if (!this._coordinator || !this.initialized) {
        throw new Error('P2P not initialized')
      }

      const fullService: ServiceAdvertisement = {
        ...service,
        id: `${this.peerId}-${Date.now()}`,
        peerId: this.peerId,
        createdAt: Date.now(),
        multiaddrs: this.multiaddrs,
      }

      await this._coordinator.announceResource(
        'service',
        fullService.id,
        fullService,
        { ttl: 3600000 }, // 1 hour TTL
      )

      this.myAdvertisements.push(fullService)

      return fullService
    },

    /**
     * Discover services of a specific type
     */
    async discoverServices(
      type?: ServiceAdvertisement['type'],
    ): Promise<ServiceAdvertisement[]> {
      if (!this._coordinator || !this.initialized) {
        return []
      }

      const resources = this._coordinator.getLocalResources('service')

      const services = resources
        .map((r: any) => r.data as ServiceAdvertisement)
        .filter((s: ServiceAdvertisement) => !type || s.type === type)

      // Update local cache
      for (const service of services) {
        const existingIndex = this.discoveredServices.findIndex(
          s => s.id === service.id,
        )
        if (existingIndex < 0) {
          this.discoveredServices.push(service)
        }
      }

      return services
    },

    /**
     * Remove expired services from cache
     */
    cleanupExpiredServices() {
      const now = Date.now()
      this.discoveredServices = this.discoveredServices.filter(
        s => !s.expiresAt || s.expiresAt > now,
      )
    },

    /**
     * Connect to a specific peer
     */
    async connectToPeer(multiaddr: string) {
      if (!this._coordinator) {
        throw new Error('P2P not initialized')
      }

      await this._coordinator.connectToPeer(multiaddr)
      this.updatePeerList()
    },

    /**
     * Disconnect from a peer
     */
    async disconnectFromPeer(peerId: string) {
      if (!this._coordinator) return

      await this._coordinator.disconnectFromPeer(peerId)
      this.updatePeerList()
    },

    /**
     * Get reachable addresses for sharing
     */
    async getReachableAddresses(): Promise<string[]> {
      if (!this._coordinator) return []

      return await this._coordinator.getReachableAddresses()
    },

    /**
     * Stop P2P network
     */
    async stop() {
      if (this._coordinator) {
        await this._coordinator.stop()
        this._coordinator = null
      }

      this.initialized = false
      this.connected = false
      this.peerId = ''
      this.multiaddrs = []
      this.connectedPeers = []
    },
  },
})
