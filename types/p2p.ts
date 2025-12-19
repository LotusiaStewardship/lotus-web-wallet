/**
 * P2P Types
 *
 * Type definitions for P2P connectivity and presence.
 */

// ============================================================================
// Connection State Types
// ============================================================================

/**
 * P2P connection state
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

// ============================================================================
// Peer Types
// ============================================================================

/**
 * UI-friendly peer information
 */
export interface UIPeerInfo {
  /** Peer ID string */
  peerId: string
  /** Multiaddresses for this peer */
  multiaddrs: string[]
  /** Optional nickname */
  nickname?: string
  /** Last seen timestamp */
  lastSeen?: number
}

/**
 * Peer connection status
 */
export type PeerConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'failed'

/**
 * Peer connection type
 */
export type PeerConnectionType = 'relay' | 'webrtc' | 'direct'

/**
 * UI-friendly wallet presence representation
 */
export interface UIPresenceAdvertisement {
  /** Unique advertisement ID */
  id: string
  /** Peer ID of the advertiser */
  peerId: string
  /** Multiaddresses */
  multiaddrs: string[]
  /** Dialable relay addresses (for browser-to-browser connections) */
  relayAddrs?: string[]
  /** WebRTC-specific address */
  webrtcAddr?: string
  /** Wallet address */
  walletAddress: string
  /** Optional nickname */
  nickname?: string
  /** Optional avatar URL */
  avatar?: string
  /** Creation timestamp */
  createdAt: number
  /** Expiration timestamp */
  expiresAt: number

  /** Connection status (wallet-side only, not transmitted) */
  connectionStatus?: PeerConnectionStatus
  /** Connection type (wallet-side only, not transmitted) */
  connectionType?: PeerConnectionType
}

// ============================================================================
// Activity Types
// ============================================================================

/**
 * P2P activity event types
 */
export type P2PActivityEventType =
  | 'peer_joined'
  | 'peer_left'
  | 'info'
  | 'error'

/**
 * P2P activity event for the activity feed
 */
export interface P2PActivityEvent {
  /** Unique event ID */
  id: string
  /** Event type */
  type: P2PActivityEventType
  /** Peer ID involved */
  peerId: string
  /** Optional nickname */
  nickname?: string
  /** Optional protocol */
  protocol?: string
  /** Event timestamp */
  timestamp: number
  /** Human-readable message */
  message: string
}

// ============================================================================
// Presence Types
// ============================================================================

/**
 * Presence advertisement configuration
 */
export interface PresenceConfig {
  /** Wallet address to advertise */
  walletAddress: string
  /** Optional nickname */
  nickname?: string
  /** Optional avatar URL */
  avatar?: string
}

// ============================================================================
// P2P State Types
// ============================================================================

/**
 * P2P store state
 */
export interface P2PState {
  /** Whether the P2P system has been initialized */
  initialized: boolean
  /** Whether connected to the P2P network */
  connected: boolean
  /** Current connection state */
  connectionState: P2PConnectionState
  /** Our peer ID */
  peerId: string
  /** Our multiaddresses */
  multiaddrs: string[]
  /** Connected peers */
  connectedPeers: UIPeerInfo[]
  /** Online peers (presence advertisements) */
  onlinePeers: UIPresenceAdvertisement[]
  /** Our presence configuration */
  myPresenceConfig: PresenceConfig | null
  /** Activity events */
  activityEvents: P2PActivityEvent[]
  /** Whether DHT is ready */
  dhtReady: boolean
  /** DHT routing table size */
  routingTableSize: number
  /** Error message if any */
  error: string | null
}

// ============================================================================
// P2P Configuration Types
// ============================================================================

/**
 * P2P initialization options
 */
export interface P2PInitOptions {
  /** Bootstrap nodes to connect to */
  bootstrapNodes?: string[]
  /** Enable DHT */
  enableDHT?: boolean
  /** Enable presence advertising */
  enablePresence?: boolean
  /** Presence TTL in milliseconds */
  presenceTTL?: number
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum activity events to keep */
export const MAX_ACTIVITY_EVENTS = 50

/** Storage key for presence configuration */
export const STORAGE_KEY_PRESENCE_CONFIG = 'p2p-presence-config'

/** Storage key for P2P private key */
export const STORAGE_KEY_P2P_PRIVATE_KEY = 'p2p-private-key'

/** Presence topic format */
export const PRESENCE_TOPIC = 'lotus/discovery/wallet-presence'

/** Presence resource type */
export const PRESENCE_RESOURCE_TYPE = 'discovery:advertisement'

/** Presence protocol identifier */
export const PRESENCE_PROTOCOL = 'wallet-presence'

/** Default presence TTL (1 hour) */
export const PRESENCE_TTL = 60 * 60 * 1000
