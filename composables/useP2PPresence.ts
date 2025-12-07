/**
 * useP2PPresence Composable
 *
 * Provides reactive access to P2P wallet presence functionality.
 * Manages online/offline status and peer visibility.
 */
import {
  useP2PStore,
  type UIPresenceAdvertisement,
  type UIPeerInfo,
} from '~/stores/p2p'
import { useWalletStore } from '~/stores/wallet'

export interface PresenceOptions {
  nickname?: string
  avatar?: string
}

export function useP2PPresence() {
  const p2pStore = useP2PStore()
  const walletStore = useWalletStore()

  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Whether the P2P network is online */
  const isOnline = computed(() => p2pStore.isOnline)

  /** Whether we are advertising our presence */
  const isAdvertisingPresence = computed(() => p2pStore.isAdvertisingPresence)

  /** List of online peers (with presence advertisements) */
  const onlinePeers = computed(() => p2pStore.onlinePeers)

  /** Number of online peers */
  const onlinePeerCount = computed(() => p2pStore.onlinePeerCount)

  /** List of directly connected peers */
  const connectedPeers = computed(() => p2pStore.connectedPeers)

  /** Number of connected peers */
  const connectedPeerCount = computed(() => p2pStore.peerCount)

  /** Our current presence configuration */
  const myPresenceConfig = computed(() => p2pStore.myPresenceConfig)

  /** Our peer ID */
  const myPeerId = computed(() => p2pStore.peerId)

  // ============================================================================
  // Presence Management
  // ============================================================================

  /**
   * Go online - advertise wallet presence
   */
  const goOnline = async (options?: PresenceOptions) => {
    if (!walletStore.address) {
      throw new Error('Wallet not initialized')
    }

    await p2pStore.advertisePresence({
      walletAddress: walletStore.address,
      nickname: options?.nickname,
      avatar: options?.avatar,
    })
  }

  /**
   * Go offline - withdraw presence advertisement
   */
  const goOffline = async () => {
    await p2pStore.withdrawPresence()
  }

  /**
   * Toggle presence on/off
   */
  const togglePresence = async (options?: PresenceOptions) => {
    if (isAdvertisingPresence.value) {
      await goOffline()
    } else {
      await goOnline(options)
    }
  }

  /**
   * Update presence with new options (re-advertise)
   */
  const updatePresence = async (options: PresenceOptions) => {
    if (!walletStore.address) {
      throw new Error('Wallet not initialized')
    }

    await p2pStore.advertisePresence({
      walletAddress: walletStore.address,
      nickname: options.nickname,
      avatar: options.avatar,
    })
  }

  // ============================================================================
  // Peer Queries
  // ============================================================================

  /**
   * Get a peer by their peer ID
   */
  const getPeerById = (peerId: string): UIPresenceAdvertisement | undefined => {
    return onlinePeers.value.find(p => p.peerId === peerId)
  }

  /**
   * Get a peer by their wallet address
   */
  const getPeerByAddress = (
    address: string,
  ): UIPresenceAdvertisement | undefined => {
    return onlinePeers.value.find(p => p.walletAddress === address)
  }

  /**
   * Check if a peer is online
   */
  const isPeerOnline = (peerId: string): boolean => {
    return onlinePeers.value.some(p => p.peerId === peerId)
  }

  /**
   * Check if we are connected to a peer
   */
  const isConnectedTo = (peerId: string): boolean => {
    return connectedPeers.value.some(p => p.peerId === peerId)
  }

  /**
   * Search peers by nickname
   */
  const searchPeers = (query: string): UIPresenceAdvertisement[] => {
    const lowerQuery = query.toLowerCase()
    return onlinePeers.value.filter(
      p =>
        p.nickname?.toLowerCase().includes(lowerQuery) ||
        p.peerId.toLowerCase().includes(lowerQuery) ||
        p.walletAddress.toLowerCase().includes(lowerQuery),
    )
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to a specific peer
   */
  const connectToPeer = async (multiaddr: string) => {
    await p2pStore.connectToPeer(multiaddr)
  }

  /**
   * Disconnect from a peer
   */
  const disconnectFromPeer = async (peerId: string) => {
    await p2pStore.disconnectFromPeer(peerId)
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Format peer display name
   */
  const formatPeerName = (
    peer: UIPresenceAdvertisement | UIPeerInfo,
  ): string => {
    if ('nickname' in peer && peer.nickname) {
      return peer.nickname
    }
    return `${peer.peerId.slice(0, 8)}...${peer.peerId.slice(-4)}`
  }

  /**
   * Get peer's last seen time as relative string
   */
  const getLastSeenRelative = (peer: UIPeerInfo): string => {
    if (!peer.lastSeen) return 'Unknown'

    const now = Date.now()
    const diff = now - peer.lastSeen

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return {
    // State
    isOnline,
    isAdvertisingPresence,
    onlinePeers,
    onlinePeerCount,
    connectedPeers,
    connectedPeerCount,
    myPresenceConfig,
    myPeerId,

    // Presence Management
    goOnline,
    goOffline,
    togglePresence,
    updatePresence,

    // Peer Queries
    getPeerById,
    getPeerByAddress,
    isPeerOnline,
    isConnectedTo,
    searchPeers,

    // Connection Management
    connectToPeer,
    disconnectFromPeer,

    // Utilities
    formatPeerName,
    getLastSeenRelative,
  }
}
