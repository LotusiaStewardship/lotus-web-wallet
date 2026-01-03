/**
 * P2P Coordinator Plugin
 *
 * Provides the P2P coordinator for peer-to-peer networking.
 * This plugin manages the P2P connection lifecycle and peer management.
 *
 * Access Patterns:
 * - Components: useP2PCoordinator() composable
 * - Stores: Import getter functions directly from this plugin
 * - Workers: Not available (use static imports in worker)
 *
 * Dependencies:
 * - None (base networking layer)
 *
 * The `.client.ts` suffix ensures this only runs in the browser (SPA mode).
 */
import type {
  UIPeerInfo,
  UIPresenceAdvertisement,
  PresenceConfig,
  P2PInitOptions,
} from '~/types/p2p'
import {
  P2PConnectionState,
  PRESENCE_TOPIC,
  PRESENCE_RESOURCE_TYPE,
  PRESENCE_PROTOCOL,
  PRESENCE_TTL,
} from '~/types/p2p'
import {
  getRawItem,
  setRawItem,
  removeItem,
  STORAGE_KEYS,
} from '~/utils/storage'
import * as XpiP2P from 'xpi-p2p-ts'

// ============================================================================
// Types
// ============================================================================

/**
 * P2P event callbacks for store integration
 */
export interface P2PEventCallbacks {
  onConnectionStateChange?: (
    state: P2PConnectionState,
    previousState?: P2PConnectionState,
    error?: string,
  ) => void
  onPeerConnected?: (peer: UIPeerInfo) => void
  onPeerDisconnected?: (peerId: string) => void
  onPresenceDiscovered?: (presence: UIPresenceAdvertisement) => void
  onPresenceExpired?: (presenceId: string) => void
  onError?: (error: Error) => void
}

/**
 * Result of a peer connection attempt
 */
export interface PeerConnectionResult {
  success: boolean
  connectionType: 'webrtc' | 'relay' | 'direct'
  error?: string
}

/**
 * Connection state handler callbacks for service layer integration
 */
export interface ConnectionStateHandlerCallbacks {
  onConnected?: () => void
  onDisconnected?: () => void
  onDHTReady?: () => void
  onReconnected?: () => void
  onError?: (error: Error) => void
}

/**
 * Bootstrap node health status
 */
export interface BootstrapHealth {
  healthy: boolean
  peerId?: string
  uptime?: number
  uptimeHuman?: string
  connectedPeers?: number
  subscribedTopics?: string[]
  dht?: {
    mode: string
    ready: boolean
    routingTableSize: number
  }
  forwarding?: {
    totalReceived: number
    totalForwarded: number
    sinceReset: number
  }
  error?: string
  timestamp?: number
}

// ============================================================================
// Module-level State (Singleton)
// ============================================================================

type P2PCoordinatorType = XpiP2P.P2PCoordinator

let coordinator: P2PCoordinatorType | null = null
let eventCallbacks: P2PEventCallbacks = {}
let presenceConfig: PresenceConfig | null = null
let connectionStateHandlers: ConnectionStateHandlerCallbacks[] = []

// ============================================================================
// Constants
// ============================================================================

const BOOTSTRAP_PEERS_TOPIC = 'lotus/peers'
const DEFAULT_BOOTSTRAP_HEALTH_URL = 'https://dht.lotusia.org:6971'

// ============================================================================
// Identity Management
// ============================================================================

async function getOrCreatePrivateKey(): Promise<
  ReturnType<typeof XpiP2P.generateP2PPrivateKey>
> {
  const { generateP2PPrivateKey, restoreP2PPrivateKey, getP2PPrivateKeyBytes } =
    XpiP2P

  const savedKey = getRawItem(STORAGE_KEYS.P2P_PRIVATE_KEY)
  if (savedKey) {
    try {
      const keyBytes = Uint8Array.from(atob(savedKey), c => c.charCodeAt(0))
      const privateKey = restoreP2PPrivateKey(keyBytes)
      console.log('[P2P Plugin] Restored persistent identity')
      return privateKey
    } catch (err) {
      console.warn('[P2P Plugin] Failed to restore key, generating new:', err)
      removeItem(STORAGE_KEYS.P2P_PRIVATE_KEY)
    }
  }

  const privateKey = await generateP2PPrivateKey()
  console.log('[P2P Plugin] Generated new P2P identity')

  try {
    const keyBytes = getP2PPrivateKeyBytes(privateKey)
    const base64Key = btoa(String.fromCharCode(...keyBytes))
    setRawItem(STORAGE_KEYS.P2P_PRIVATE_KEY, base64Key)
  } catch (err) {
    console.warn('[P2P Plugin] Failed to save key:', err)
  }

  return privateKey
}

// ============================================================================
// Internal Helpers
// ============================================================================

function _sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function _determineConnectionType(addr: string): 'webrtc' | 'relay' | 'direct' {
  if (addr.includes('/webrtc')) return 'webrtc'
  if (addr.includes('/p2p-circuit')) return 'relay'
  return 'direct'
}

function _dispatchConnectionStateChange(
  state: P2PConnectionState,
  previousState?: P2PConnectionState,
): void {
  console.log(
    `[P2P Plugin] Dispatching connection state change: ${previousState} -> ${state}`,
  )

  for (const handler of connectionStateHandlers) {
    switch (state) {
      case P2PConnectionState.CONNECTED:
        if (
          previousState === P2PConnectionState.DISCONNECTED ||
          previousState === P2PConnectionState.RECONNECTING ||
          previousState === P2PConnectionState.ERROR
        ) {
          handler.onReconnected?.()
        } else {
          handler.onConnected?.()
        }
        break
      case P2PConnectionState.DISCONNECTED:
        handler.onDisconnected?.()
        break
      case P2PConnectionState.DHT_READY:
      case P2PConnectionState.FULLY_OPERATIONAL:
        handler.onDHTReady?.()
        break
      case P2PConnectionState.ERROR:
        handler.onError?.(new Error('P2P connection error'))
        break
    }
  }
}

function _setupEventHandlers(): void {
  if (!coordinator) return

  coordinator.on('connection:state-changed', data => {
    const currentState = data.currentState as P2PConnectionState
    const previousState = data.previousState as P2PConnectionState

    console.log('[P2P Plugin] Connection state changed:', {
      from: previousState,
      to: currentState,
      error: data.error,
    })

    if (eventCallbacks.onConnectionStateChange) {
      eventCallbacks.onConnectionStateChange(
        currentState,
        previousState,
        data.error,
      )
    }

    _dispatchConnectionStateChange(currentState, previousState)
  })

  coordinator.on('peer:connect', data => {
    if (eventCallbacks.onPeerConnected) {
      const peerInfo: UIPeerInfo = {
        peerId: data.peerId,
        multiaddrs: data.multiaddrs || [],
        lastSeen: data.timestamp,
      }
      eventCallbacks.onPeerConnected(peerInfo)
    }
  })

  coordinator.on('peer:disconnect', data => {
    if (eventCallbacks.onPeerDisconnected) {
      eventCallbacks.onPeerDisconnected(data.peerId)
    }
  })

  coordinator.on('error', data => {
    if (eventCallbacks.onError) {
      const error = data.error || new Error(data.message)
      eventCallbacks.onError(error)
    }
  })
}

function _handlePresenceMessage(data: Uint8Array): void {
  try {
    const text = new TextDecoder().decode(data)
    const presence = JSON.parse(text)

    if (presence.protocol && presence.protocol !== PRESENCE_PROTOCOL) {
      return
    }

    const peerId = presence.peerInfo?.peerId ?? presence.peerId ?? ''
    const multiaddrs =
      presence.peerInfo?.multiaddrs ?? presence.multiaddrs ?? []
    const relayAddrs =
      presence.peerInfo?.relayAddrs ?? presence.relayAddrs ?? []

    if (coordinator && peerId === coordinator.peerId) {
      return
    }

    const now = Date.now()
    const uiPresence: UIPresenceAdvertisement = {
      id: presence.id ?? `${peerId}-presence`,
      peerId,
      multiaddrs,
      relayAddrs,
      walletAddress: presence.walletAddress ?? '',
      nickname: presence.nickname,
      avatar: presence.avatar,
      createdAt: presence.createdAt ?? now,
      expiresAt: presence.expiresAt ?? now + PRESENCE_TTL,
      connectionStatus: 'disconnected',
    }

    if (uiPresence.expiresAt <= now) {
      return
    }

    if (eventCallbacks.onPresenceDiscovered) {
      eventCallbacks.onPresenceDiscovered(uiPresence)
    }
  } catch {
    // Ignore malformed messages
  }
}

function _handleBootstrapPeerList(data: Uint8Array): void {
  try {
    const text = new TextDecoder().decode(data)
    const peerList = JSON.parse(text)

    if (!Array.isArray(peerList)) {
      return
    }

    console.log(
      `[P2P Plugin] Received peer list from bootstrap: ${peerList.length} peers`,
    )

    for (const peer of peerList) {
      if (peer.peerId && peer.relayAddr) {
        if (eventCallbacks.onPresenceDiscovered) {
          const now = Date.now()
          eventCallbacks.onPresenceDiscovered({
            id: `bootstrap-${peer.peerId}`,
            peerId: peer.peerId,
            multiaddrs: peer.multiaddrs || [],
            relayAddrs: [peer.relayAddr],
            walletAddress: '',
            createdAt: now,
            expiresAt: now + PRESENCE_TTL,
            connectionStatus: 'disconnected',
          })
        }
      }
    }
  } catch {
    // Ignore malformed messages
  }
}

function _handleDiscoveryMessage(topic: string, data: Uint8Array): void {
  try {
    const text = new TextDecoder().decode(data)
    const message = JSON.parse(text)

    console.log(`[P2P Plugin] Received discovery message on ${topic}:`, {
      type: message.protocol || message.type || 'unknown',
      peerId: message.peerInfo?.peerId || message.peerId,
    })

    if (topic === PRESENCE_TOPIC || message.protocol === PRESENCE_PROTOCOL) {
      _handlePresenceMessage(data)
    }
  } catch {
    // Ignore malformed messages
  }
}

async function _subscribeToDiscoveryTopics(): Promise<void> {
  if (!coordinator) return

  const discoveryTopics = [
    'lotus/discovery/musig2',
    PRESENCE_TOPIC,
    BOOTSTRAP_PEERS_TOPIC,
  ]

  console.log('[P2P Plugin] Subscribing to discovery topics:', discoveryTopics)

  for (const topic of discoveryTopics) {
    try {
      if (topic === BOOTSTRAP_PEERS_TOPIC) {
        await coordinator.subscribeToTopic(topic, _handleBootstrapPeerList)
      } else {
        await coordinator.subscribeToTopic(topic, (data: Uint8Array) => {
          _handleDiscoveryMessage(topic, data)
        })
      }
      console.log(`[P2P Plugin] Subscribed to ${topic}`)
    } catch (err) {
      console.log(`[P2P Plugin] Topic ${topic} subscription result:`, err)
    }
  }
}

// ============================================================================
// Exported Functions
// ============================================================================

/**
 * Initialize the P2P service
 */
export async function initializeP2P(
  options: P2PInitOptions = {},
  callbacks: P2PEventCallbacks = {},
): Promise<{ peerId: string; multiaddrs: string[] }> {
  if (coordinator) {
    console.log('[P2P Plugin] Already initialized')
    return {
      peerId: coordinator.peerId,
      multiaddrs: coordinator.getStats().multiaddrs,
    }
  }

  eventCallbacks = callbacks

  const { P2PCoordinator } = XpiP2P

  const privateKey = await getOrCreatePrivateKey()

  coordinator = new P2PCoordinator({
    privateKey,
    bootstrapPeers: options.bootstrapNodes,
    enableDHT: options.enableDHT ?? true,
    enableGossipSub: true,
    enableRelay: true,
    enableAutoNAT: true,
    enableDCUTR: true,
  })

  _setupEventHandlers()

  await coordinator.start()

  const peerId = coordinator.peerId
  const multiaddrs = coordinator.getStats().multiaddrs

  console.log(`[P2P Plugin] Started with peerId: ${peerId}`)
  console.log(`[P2P Plugin] Listening on:`)
  multiaddrs.forEach(addr => {
    const type = addr.includes('/webrtc')
      ? '🌐 WebRTC'
      : addr.includes('/p2p-circuit')
      ? '🔀 Relay'
      : addr.includes('/ws')
      ? '🔌 WebSocket'
      : '📡 Other'
    console.log(`  ${type}: ${addr}`)
  })

  return { peerId, multiaddrs }
}

/**
 * Stop the P2P service
 */
export async function stopP2P(): Promise<void> {
  if (presenceConfig) {
    await stopPresenceAdvertising()
  }

  if (coordinator) {
    await coordinator.stop()
    coordinator = null
    presenceConfig = null
    console.log('[P2P Plugin] Stopped')
  }
}

/**
 * Get current connection state
 */
export function getConnectionState(): P2PConnectionState {
  if (!coordinator) {
    return 'disconnected' as P2PConnectionState
  }
  return coordinator.connectionState as unknown as P2PConnectionState
}

/**
 * Get our peer ID
 */
export function getPeerId(): string {
  if (!coordinator) return ''
  return coordinator.peerId
}

/**
 * Get our multiaddresses
 */
export function getMultiaddrs(): string[] {
  if (!coordinator) return []
  return coordinator.getStats().multiaddrs
}

/**
 * Get connected peers
 */
export function getConnectedPeers(): UIPeerInfo[] {
  if (!coordinator) return []

  const peers = coordinator.getConnectedPeers()
  return peers.map(peer => ({
    peerId: peer.peerId,
    multiaddrs: peer.multiaddrs || [],
    nickname: undefined,
    lastSeen: peer.lastSeen || Date.now(),
  }))
}

/**
 * Connect to a peer by multiaddr
 */
export async function connectToPeer(multiaddr: string): Promise<void> {
  if (!coordinator) {
    throw new Error('P2P not initialized')
  }
  await coordinator.connectToPeer(multiaddr)
}

/**
 * Disconnect from a peer
 */
export async function disconnectFromPeer(peerId: string): Promise<void> {
  if (!coordinator) {
    throw new Error('P2P not initialized')
  }
  await coordinator.disconnectFromPeer(peerId)
}

/**
 * Connect to a discovered peer using their relay address
 */
export async function connectToDiscoveredPeer(
  presence: UIPresenceAdvertisement,
): Promise<PeerConnectionResult> {
  if (!coordinator) {
    return {
      success: false,
      connectionType: 'relay',
      error: 'P2P not initialized',
    }
  }

  const connections = coordinator.libp2pNode.getConnections()
  const existingConn = connections.find(
    conn => conn.remotePeer.toString() === presence.peerId,
  )
  if (existingConn) {
    const connType = _determineConnectionType(
      existingConn.remoteAddr.toString(),
    )
    console.log(
      `[P2P Plugin] Already connected to ${presence.peerId} via ${connType}`,
    )
    return { success: true, connectionType: connType }
  }

  const relayAddrs = presence.relayAddrs || []

  const coordinatorWithRelay = coordinator as typeof coordinator & {
    connectToPeerViaRelay(
      peerId: string,
      relayAddr?: string,
    ): Promise<{
      success: boolean
      connectionType: string
      error?: string
    }>
  }

  if (relayAddrs.length === 0) {
    console.log(
      `[P2P Plugin] No relay addresses for ${presence.peerId}, using bootstrap relay`,
    )
    try {
      const result = await coordinatorWithRelay.connectToPeerViaRelay(
        presence.peerId,
      )
      return {
        success: result.success,
        connectionType: result.connectionType as 'webrtc' | 'relay' | 'direct',
        error: result.error,
      }
    } catch (error) {
      return {
        success: false,
        connectionType: 'relay',
        error: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  }

  for (const relayAddr of relayAddrs) {
    console.log(
      `[P2P Plugin] Attempting connection to ${presence.peerId} via ${relayAddr}`,
    )

    try {
      const result = await coordinatorWithRelay.connectToPeerViaRelay(
        presence.peerId,
        relayAddr,
      )
      if (result.success) {
        return {
          success: true,
          connectionType: result.connectionType as
            | 'webrtc'
            | 'relay'
            | 'direct',
        }
      }
    } catch (error) {
      console.warn(
        `[P2P Plugin] Failed to connect via ${relayAddr}:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  return {
    success: false,
    connectionType: 'relay',
    error: 'All relay addresses failed',
  }
}

/**
 * Connect to peer with exponential backoff retry
 */
export async function connectWithRetry(
  presence: UIPresenceAdvertisement,
  options: {
    maxRetries?: number
    initialDelayMs?: number
    maxDelayMs?: number
  } = {},
): Promise<PeerConnectionResult & { attempts: number }> {
  const { maxRetries = 3, initialDelayMs = 1000, maxDelayMs = 10000 } = options

  let attempts = 0
  let delay = initialDelayMs

  while (attempts < maxRetries) {
    attempts++

    const result = await connectToDiscoveredPeer(presence)
    if (result.success) {
      return { ...result, attempts }
    }

    if (attempts < maxRetries) {
      console.log(
        `[P2P Plugin] Connection attempt ${attempts} failed, retrying in ${delay}ms`,
      )
      await _sleep(delay)
      delay = Math.min(delay * 2, maxDelayMs)
    }
  }

  return {
    success: false,
    connectionType: 'relay',
    attempts,
    error: `Failed after ${attempts} attempts`,
  }
}

/**
 * Subscribe to peer list broadcasts from bootstrap server
 */
export async function subscribeToBootstrapPeerList(): Promise<void> {
  if (!coordinator) return

  try {
    await coordinator.subscribeToTopic(
      BOOTSTRAP_PEERS_TOPIC,
      _handleBootstrapPeerList,
    )
    console.log('[P2P Plugin] Subscribed to bootstrap peer list topic')
  } catch (error) {
    console.warn('[P2P Plugin] Failed to subscribe to peer list topic:', error)
  }
}

/**
 * Get our WebRTC-dialable address
 */
export function getWebRTCAddress(): string | null {
  if (!coordinator) return null

  const multiaddrs = coordinator.getStats().multiaddrs

  const webrtcAddr = multiaddrs.find(addr => addr.includes('/webrtc'))
  if (webrtcAddr) return webrtcAddr

  const relayAddr = multiaddrs.find(
    addr => addr.includes('/p2p-circuit') && !addr.includes('/webrtc'),
  )
  if (relayAddr) {
    return `${relayAddr}/webrtc`
  }

  return null
}

/**
 * Connect to a peer via WebRTC using their relay address
 */
export async function connectViaBrowserP2P(
  peerWebRTCAddr: string,
): Promise<{ connectionType: 'webrtc' | 'relay' | 'unknown' }> {
  if (!coordinator) {
    throw new Error('P2P not initialized')
  }

  console.log(`[P2P Plugin] Connecting to peer via WebRTC: ${peerWebRTCAddr}`)

  await coordinator.connectToPeer(peerWebRTCAddr)

  const connections = coordinator.libp2pNode.getConnections()
  const targetPeerId = peerWebRTCAddr.split('/p2p/').pop()

  const peerConnection = connections.find(
    conn => conn.remotePeer.toString() === targetPeerId,
  )

  let connectionType: 'webrtc' | 'relay' | 'unknown' = 'unknown'
  if (peerConnection) {
    const addr = peerConnection.remoteAddr.toString()
    if (addr.includes('/webrtc')) {
      connectionType = 'webrtc'
      console.log(`[P2P Plugin] ✅ Direct WebRTC connection established`)
    } else if (addr.includes('/p2p-circuit')) {
      connectionType = 'relay'
      console.log(
        `[P2P Plugin] 🔀 Connected via relay (WebRTC upgrade pending)`,
      )
    }
  }

  return { connectionType }
}

/**
 * Check if a peer connection is direct WebRTC or via relay
 */
export function getConnectionType(
  peerId: string,
): 'webrtc' | 'relay' | 'direct' | 'none' {
  if (!coordinator) return 'none'

  const connections = coordinator.libp2pNode.getConnections()
  const peerConnection = connections.find(
    conn => conn.remotePeer.toString() === peerId,
  )

  if (!peerConnection) return 'none'

  const addr = peerConnection.remoteAddr.toString()
  if (addr.includes('/webrtc')) return 'webrtc'
  if (addr.includes('/p2p-circuit')) return 'relay'
  return 'direct'
}

/**
 * Check if DHT is ready
 */
export function isDHTReady(): boolean {
  if (!coordinator) return false
  return coordinator.getDHTStats().isReady
}

/**
 * Get DHT routing table size
 */
export function getRoutingTableSize(): number {
  if (!coordinator) return 0
  return coordinator.getDHTStats().routingTableSize
}

/**
 * Get full DHT stats
 */
export function getDHTStats(): {
  enabled: boolean
  mode: string
  routingTableSize: number
  isReady: boolean
} {
  if (!coordinator) {
    return {
      enabled: false,
      mode: 'disabled',
      routingTableSize: 0,
      isReady: false,
    }
  }
  return coordinator.getDHTStats()
}

/**
 * Start advertising presence
 */
export async function startPresenceAdvertising(
  config: PresenceConfig,
): Promise<void> {
  console.log('[P2P Plugin] startPresenceAdvertising() called with:', {
    walletAddress: config.walletAddress?.substring(0, 20) + '...',
    nickname: config.nickname,
  })

  if (!coordinator) {
    console.error(
      '[P2P Plugin] startPresenceAdvertising() failed: P2P not initialized',
    )
    throw new Error('P2P not initialized')
  }

  const dhtStats = coordinator.getDHTStats()
  console.log('[P2P Plugin] DHT status before presence advertising:', {
    isReady: dhtStats.isReady,
    routingTableSize: dhtStats.routingTableSize,
    mode: dhtStats.mode,
  })

  const now = Date.now()
  const peerId = coordinator.peerId
  const advertisementId = `presence-${peerId}`

  const stats = coordinator.getStats() as {
    multiaddrs: string[]
    relayAddresses?: string[]
  }
  const relayAddresses = stats.relayAddresses || []

  const advertisement = {
    id: advertisementId,
    protocol: PRESENCE_PROTOCOL,
    peerInfo: {
      peerId,
      multiaddrs: stats.multiaddrs,
      relayAddrs: relayAddresses,
    },
    capabilities: ['wallet-presence'],
    createdAt: now,
    expiresAt: now + PRESENCE_TTL,
    reputation: 50,
    walletAddress: config.walletAddress,
    nickname: config.nickname,
    avatar: config.avatar,
  }

  console.log('[P2P Plugin] Presence advertisement relay addresses:', {
    count: relayAddresses.length,
    addresses: relayAddresses.slice(0, 2),
  })

  await _subscribeToDiscoveryTopics()

  console.log('[P2P Plugin] Announcing presence to DHT...')
  await coordinator.announceResource(
    PRESENCE_RESOURCE_TYPE,
    advertisementId,
    advertisement,
    {
      ttl: PRESENCE_TTL,
      expiresAt: advertisement.expiresAt,
    },
  )

  console.log('[P2P Plugin] Publishing presence to GossipSub...')
  await coordinator.publishToTopic(PRESENCE_TOPIC, advertisement)

  await coordinator.subscribeToTopic(PRESENCE_TOPIC, _handlePresenceMessage)

  presenceConfig = config

  console.log('[P2P Plugin] Started presence advertising successfully')
}

/**
 * Stop advertising presence
 */
export async function stopPresenceAdvertising(): Promise<void> {
  if (!coordinator) return

  await coordinator.unsubscribeFromTopic(PRESENCE_TOPIC)

  presenceConfig = null
  console.log('[P2P Plugin] Stopped presence advertising')
}

/**
 * Discover online peers from local cache
 */
export function discoverPeers(): UIPresenceAdvertisement[] {
  if (!coordinator) return []

  const resources = coordinator.getLocalResources(PRESENCE_RESOURCE_TYPE)
  const now = Date.now()

  return resources
    .filter(r => !r.expiresAt || r.expiresAt > now)
    .map(r => {
      const data = r.data as Record<string, unknown>
      const peerInfo = data.peerInfo as
        | { peerId?: string; multiaddrs?: string[] }
        | undefined

      return {
        id: r.resourceId,
        peerId: peerInfo?.peerId ?? r.creatorPeerId,
        multiaddrs: peerInfo?.multiaddrs ?? [],
        walletAddress: (data.walletAddress as string) ?? '',
        nickname: data.nickname as string | undefined,
        avatar: data.avatar as string | undefined,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt ?? r.createdAt + PRESENCE_TTL,
      }
    })
}

/**
 * Get current presence config
 */
export function getPresenceConfig(): PresenceConfig | null {
  return presenceConfig
}

/**
 * Check if presence advertising is active
 */
export function isPresenceAdvertising(): boolean {
  return presenceConfig !== null
}

/**
 * Get the P2P coordinator instance (for advanced usage)
 */
export function getCoordinator(): P2PCoordinatorType | null {
  return coordinator
}

/**
 * Check if P2P is initialized
 */
export function isP2PInitialized(): boolean {
  return coordinator !== null
}

/**
 * Get P2P statistics
 */
export function getStats(): {
  peerId: string
  peers: { total: number; connected: number }
  dht: {
    enabled: boolean
    mode: string
    routingTableSize: number
    localRecords: number
  }
  multiaddrs: string[]
} {
  if (!coordinator) {
    return {
      peerId: 'not-started',
      peers: { total: 0, connected: 0 },
      dht: {
        enabled: false,
        mode: 'disabled',
        routingTableSize: 0,
        localRecords: 0,
      },
      multiaddrs: [],
    }
  }
  return coordinator.getStats()
}

/**
 * Subscribe to P2P events
 */
export function subscribeToEvents(callbacks: P2PEventCallbacks): void {
  eventCallbacks = { ...eventCallbacks, ...callbacks }
}

/**
 * Unsubscribe from P2P events
 */
export function unsubscribeFromEvents(): void {
  eventCallbacks = {}
}

/**
 * Update event callbacks
 */
export function setEventCallbacks(callbacks: P2PEventCallbacks): void {
  eventCallbacks = callbacks
}

/**
 * Setup connection state change handlers
 */
export function setupConnectionStateHandlers(
  callbacks: ConnectionStateHandlerCallbacks,
): void {
  if (!coordinator) {
    console.warn(
      '[P2P Plugin] setupConnectionStateHandlers called before P2P initialized',
    )
    connectionStateHandlers.push(callbacks)
    return
  }

  connectionStateHandlers.push(callbacks)
  console.log('[P2P Plugin] Connection state handlers registered')

  const currentState = coordinator.connectionState
  if (currentState === 'dht_ready' || currentState === 'fully_operational') {
    console.log(
      '[P2P Plugin] DHT already ready, triggering onDHTReady callback',
    )
    callbacks.onDHTReady?.()
  } else if (currentState === 'connected') {
    console.log(
      '[P2P Plugin] Already connected, triggering onConnected callback',
    )
    callbacks.onConnected?.()
  }
}

/**
 * Clear all connection state handlers
 */
export function clearConnectionStateHandlers(): void {
  connectionStateHandlers = []
  console.log('[P2P Plugin] Connection state handlers cleared')
}

/**
 * Check the health of the bootstrap node
 */
export async function checkBootstrapHealth(
  healthUrl: string = DEFAULT_BOOTSTRAP_HEALTH_URL,
): Promise<BootstrapHealth> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${healthUrl}/health`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        healthy: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const data = await response.json()

    return {
      healthy: data.status === 'healthy',
      peerId: data.peerId,
      uptime: data.uptime,
      uptimeHuman: data.uptimeHuman,
      connectedPeers: data.connectedPeers,
      subscribedTopics: data.subscribedTopics,
      dht: data.dht,
      forwarding: data.forwarding,
      timestamp: data.timestamp,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('abort')) {
      return {
        healthy: false,
        error: 'Connection timeout - bootstrap node may be offline',
      }
    }

    return {
      healthy: false,
      error: errorMessage,
    }
  }
}

/**
 * Get detailed topic information from the bootstrap node
 */
export async function getBootstrapTopics(
  healthUrl: string = DEFAULT_BOOTSTRAP_HEALTH_URL,
): Promise<{
  topics: Array<{
    topic: string
    subscribers: number
    metrics: {
      received: number
      forwarded: number
      lastMessageAt: number
    }
  }>
} | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${healthUrl}/topics`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

/**
 * Get connected peers from the bootstrap node
 */
export async function getBootstrapPeers(
  healthUrl: string = DEFAULT_BOOTSTRAP_HEALTH_URL,
): Promise<{
  peers: Array<{
    peerId: string
    multiaddrs: string[]
    connectionType: string
    relayAddr: string
  }>
} | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${healthUrl}/peers`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

// ============================================================================
// Nuxt Plugin Definition
// ============================================================================

export default defineNuxtPlugin({
  name: 'p2p',
  setup() {
    console.log('[P2P Plugin] Ready (lazy initialization)')

    return {
      provide: {
        p2p: {
          initialize: initializeP2P,
          stop: stopP2P,
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
          isInitialized: isP2PInitialized,
          getStats,
          subscribeToEvents,
          unsubscribeFromEvents,
          setEventCallbacks,
          setupConnectionStateHandlers,
          clearConnectionStateHandlers,
          checkBootstrapHealth,
          getBootstrapTopics,
          getBootstrapPeers,
        },
      },
    }
  },
})

// ============================================================================
// Type Augmentation
// ============================================================================

declare module '#app' {
  interface NuxtApp {
    $p2p: {
      initialize: typeof initializeP2P
      stop: typeof stopP2P
      getConnectionState: typeof getConnectionState
      getPeerId: typeof getPeerId
      getMultiaddrs: typeof getMultiaddrs
      getConnectedPeers: typeof getConnectedPeers
      connectToPeer: typeof connectToPeer
      disconnectFromPeer: typeof disconnectFromPeer
      connectToDiscoveredPeer: typeof connectToDiscoveredPeer
      connectWithRetry: typeof connectWithRetry
      subscribeToBootstrapPeerList: typeof subscribeToBootstrapPeerList
      getWebRTCAddress: typeof getWebRTCAddress
      connectViaBrowserP2P: typeof connectViaBrowserP2P
      getConnectionType: typeof getConnectionType
      isDHTReady: typeof isDHTReady
      getRoutingTableSize: typeof getRoutingTableSize
      getDHTStats: typeof getDHTStats
      startPresenceAdvertising: typeof startPresenceAdvertising
      stopPresenceAdvertising: typeof stopPresenceAdvertising
      discoverPeers: typeof discoverPeers
      getPresenceConfig: typeof getPresenceConfig
      isPresenceAdvertising: typeof isPresenceAdvertising
      getCoordinator: typeof getCoordinator
      isInitialized: typeof isP2PInitialized
      getStats: typeof getStats
      subscribeToEvents: typeof subscribeToEvents
      unsubscribeFromEvents: typeof unsubscribeFromEvents
      setEventCallbacks: typeof setEventCallbacks
      setupConnectionStateHandlers: typeof setupConnectionStateHandlers
      clearConnectionStateHandlers: typeof clearConnectionStateHandlers
      checkBootstrapHealth: typeof checkBootstrapHealth
      getBootstrapTopics: typeof getBootstrapTopics
      getBootstrapPeers: typeof getBootstrapPeers
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $p2p: {
      initialize: typeof initializeP2P
      stop: typeof stopP2P
      getConnectionState: typeof getConnectionState
      getPeerId: typeof getPeerId
      getMultiaddrs: typeof getMultiaddrs
      getConnectedPeers: typeof getConnectedPeers
      connectToPeer: typeof connectToPeer
      disconnectFromPeer: typeof disconnectFromPeer
      connectToDiscoveredPeer: typeof connectToDiscoveredPeer
      connectWithRetry: typeof connectWithRetry
      subscribeToBootstrapPeerList: typeof subscribeToBootstrapPeerList
      getWebRTCAddress: typeof getWebRTCAddress
      connectViaBrowserP2P: typeof connectViaBrowserP2P
      getConnectionType: typeof getConnectionType
      isDHTReady: typeof isDHTReady
      getRoutingTableSize: typeof getRoutingTableSize
      getDHTStats: typeof getDHTStats
      startPresenceAdvertising: typeof startPresenceAdvertising
      stopPresenceAdvertising: typeof stopPresenceAdvertising
      discoverPeers: typeof discoverPeers
      getPresenceConfig: typeof getPresenceConfig
      isPresenceAdvertising: typeof isPresenceAdvertising
      getCoordinator: typeof getCoordinator
      isInitialized: typeof isP2PInitialized
      getStats: typeof getStats
      subscribeToEvents: typeof subscribeToEvents
      unsubscribeFromEvents: typeof unsubscribeFromEvents
      setEventCallbacks: typeof setEventCallbacks
      setupConnectionStateHandlers: typeof setupConnectionStateHandlers
      clearConnectionStateHandlers: typeof clearConnectionStateHandlers
      checkBootstrapHealth: typeof checkBootstrapHealth
      getBootstrapTopics: typeof getBootstrapTopics
      getBootstrapPeers: typeof getBootstrapPeers
    }
  }
}
