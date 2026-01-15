/**
 * Service Worker Type Definitions
 *
 * Message types and interfaces for communication between
 * the main app and the service worker.
 */

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message types for SW communication
 * Client -> SW messages
 */
export type SWClientMessageType =
  | 'SKIP_WAITING'
  | 'GET_STATUS'
  | 'START_MONITORING'
  | 'STOP_MONITORING'
  | 'UPDATE_ADDRESSES'
  | 'UPDATE_SCRIPT'
  | 'SET_PENDING_TRANSACTIONS'
  | 'SET_ACTIVE_SIGNING_SESSIONS'
  | 'TAB_BACKGROUNDED'
  | 'INIT_UTXO_CACHE'
  // Session Monitor messages
  | 'REGISTER_SESSION'
  | 'UNREGISTER_SESSION'
  | 'REGISTER_SIGNING_REQUEST'
  | 'UPDATE_SIGNING_REQUEST_STATUS'
  | 'START_PRESENCE_REFRESH'
  | 'STOP_PRESENCE_REFRESH'
  | 'GET_PENDING_REQUESTS'
  // Push Notification messages
  | 'SHOW_NOTIFICATION'
  | 'CLEAR_BADGE'

/**
 * Message types for SW -> Client communication
 */
export type SWBroadcastMessageType =
  | 'BALANCE_CHANGED'
  | 'TRANSACTION_DETECTED'
  | 'SESSION_EXPIRING'
  | 'SESSION_EXPIRED'
  | 'SIGNING_REQUEST'
  | 'SIGNING_REQUEST_RECEIVED'
  | 'SIGNING_REQUEST_EXPIRED'
  | 'REFRESH_PRESENCE'

/**
 * All message types
 */
export type SWMessageType = SWClientMessageType | SWBroadcastMessageType

/**
 * Base message interface
 */
export interface SWMessage {
  type: SWMessageType
  payload?: unknown
}

/**
 * Messages sent from the session monitor to connected clients
 * Used to notify the UI about session state changes
 */
export type SessionClientMessage =
  /** Notification that a session is about to expire */
  | { type: 'SESSION_EXPIRING'; payload: SessionExpiringPayload }
  /** Notification that a session has expired */
  | { type: 'SESSION_EXPIRED'; payload: SessionExpiredPayload }
  /** Notification of a new incoming signing request */
  | { type: 'SIGNING_REQUEST_RECEIVED'; payload: SigningRequest }
  /** Notification that a signing request has expired */
  | { type: 'SIGNING_REQUEST_EXPIRED'; payload: { requestId: string } }
  /** Periodic presence refresh signal for P2P connections */
  | { type: 'REFRESH_PRESENCE'; payload: { timestamp: number } }

/**
 * Messages sent from the network monitor to connected clients
 *
 * Used to notify the UI about balance and transaction changes
 */
export type NetworkClientMessage =
  /** Notification that the balance has changed for an address */
  | { type: 'BALANCE_CHANGED'; payload: BalanceChangedPayload }
  /** Notification that a new transaction was detected */
  | { type: 'TRANSACTION_DETECTED'; payload: TransactionDetectedPayload }

/**
 * Status response from service worker
 */
export interface SWStatusResponse {
  registered: boolean
  active: boolean
  version: string
  networkMonitorActive?: boolean
}

/**
 * Configuration options for the network monitor service worker module
 */
export interface NetworkMonitorConfig {
  /** URL of the Chronik indexer API */
  chronikUrl: string
  /** Polling interval in milliseconds */
  pollingInterval: number
  /** Array of wallet addresses to monitor */
  addresses: string[]
  /** Type of script being monitored */
  scriptType: 'p2pkh' | 'p2tr-commitment'
  /** Hex-encoded script payload for UTXO queries */
  scriptPayload: string
}

// ============================================================================
// Event Payloads
// ============================================================================

/**
 * Payload sent when the balance of an address changes
 */
export interface BalanceChangedPayload {
  /** Address whose balance changed */
  address: string
  /** Current UTXOs for the address */
  utxos: NetworkMonitorUtxoInfo[]
}

/**
 * Payload for incoming signing request notifications
 * Sent when another peer requests participation in a MuSig2 signing session
 */
export interface SigningRequestPayload {
  /** Unique identifier for the signing request */
  requestId: string
  /** Peer ID of the request initiator */
  fromPeerId: string
  /** Display name of the request initiator */
  fromName?: string
  /** Transaction amount in satoshis (if applicable) */
  amount?: string
}

/**
 * Payload sent when a new transaction is detected
 */
export interface TransactionDetectedPayload {
  /** Transaction ID of the detected transaction */
  txid: string
  /** Address involved in the transaction */
  address: string
  /** Transaction amount in satoshis */
  amount: string
  /** Whether this is an incoming (received) transaction */
  isIncoming: boolean
  /** Unix timestamp when the transaction was detected (ms) */
  timestamp: number
}
/**
 * Payload for session expiring notifications
 * Sent when a session is approaching its expiry time
 */
export interface SessionExpiringPayload {
  /** ID of the session that is expiring */
  sessionId: string
  /** Type of the expiring session */
  sessionType: SessionInfo['type']
  /** Time remaining until expiry in milliseconds */
  expiresIn: number
}

/**
 * Payload for session expired notifications
 * Sent when a session has fully expired
 */
export interface SessionExpiredPayload {
  /** ID of the session that expired */
  sessionId: string
  /** Type of the expired session */
  sessionType: SessionInfo['type']
}

export type ServiceWorkerPayload =
  | BalanceChangedPayload
  | TransactionDetectedPayload
  | SessionExpiringPayload
  | SessionExpiredPayload
  | SigningRequestPayload

// ============================================================================
// Push Notification Types
// ============================================================================

/**
 * Configuration for displaying a push notification
 */
export interface PushNotificationConfig {
  /** Title text displayed prominently in the notification */
  title: string
  /** Body text with additional details */
  body: string
  /** URL to the notification icon image */
  icon?: string
  /** URL to the badge icon (small monochrome icon) */
  badge?: string
  /** Tag for grouping/replacing notifications */
  tag?: string
  /** Custom data payload attached to the notification */
  data?: Record<string, unknown>
  /** Action buttons displayed with the notification */
  actions?: Array<{ action: string; title: string; icon?: string }>
  /** Whether the notification should remain until user interaction */
  requireInteraction?: boolean
}

/**
 * Data structure for triggering a notification event
 */
export interface PushNotificationEventData {
  /** Type of notification event to display */
  type: PushNotificationEventType
  /** Optional custom title (overrides template default) */
  title?: string
  /** Optional custom body (overrides template default) */
  body?: string
  /** Additional data to include with the notification */
  data?: Record<string, unknown>
}

/**
 * Types of notification events that can be triggered
 *
 * Used to select the appropriate notification template
 */
export type PushNotificationEventType =
  | 'transaction_received'
  | 'transaction_sent'
  | 'signing_request'
  | 'session_expiring'
  | 'session_expired'
  | 'vote_received'
  | 'vote_confirmed'
  | 'profile_linked'
  | 'system'

/**
 * Payload for SHOW_NOTIFICATION message
 */
export interface ShowNotificationPayload {
  type: PushNotificationEventType
  title?: string
  body?: string
  data?: Record<string, unknown>
}

// ============================================================================
// State Sync Types
// ============================================================================

/**
 * Cached application state for offline support and quick restoration
 */
export interface CachedState {
  /** Current wallet balance in satoshis */
  walletBalance: string
  /** Array of UTXO identifiers (txid:vout format) */
  lastKnownUtxos: string[]
  /** Array of active session identifiers */
  pendingSessions: string[]
  /** Unix timestamp of last successful sync */
  lastSyncTimestamp: number
}

/**
 * Generic state entry for key-value storage
 */
export interface StateEntry {
  /** Unique identifier for the state entry */
  key: string
  /** Stored value (type depends on key) */
  value: unknown
  /** Unix timestamp when the entry was last updated */
  timestamp: number
}

// ============================================================================
// Session Monitor Types
// ============================================================================
/**
 * Session information tracked by the service worker
 * Used for monitoring MuSig2 signing sessions, P2P presence, and signing requests
 */
export interface SessionInfo {
  /** Unique identifier for the session */
  id: string
  /** Type of session being tracked */
  type: 'musig2' | 'p2p_presence' | 'signing_request'
  /** Unix timestamp (ms) when the session expires */
  expiresAt: number
  /** Unix timestamp (ms) when to send expiry warning */
  warningAt: number
  /** Whether the expiry warning has been sent to clients */
  warningSent?: boolean
  /** Additional session-specific data */
  data: Record<string, unknown>
}

/**
 * Signing request from another peer
 * Represents an incoming request to participate in a MuSig2 signing session
 */
export interface SigningRequest {
  /** Unique identifier for the signing request */
  id: string
  /** Peer ID of the requester */
  fromPeerId: string
  /** Optional display name of the requester */
  fromNickname?: string
  /** ID of the shared wallet for the signing session */
  walletId: string
  /** Optional display name of the wallet */
  walletName?: string
  /** Optional transaction amount (as string for precision) */
  amount?: string
  /** Unix timestamp (ms) when the request was received */
  receivedAt: number
  /** Unix timestamp (ms) when the request expires */
  expiresAt: number
  /** Current status of the signing request */
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
}

// ============================================================================
// Network Monitor Types (Service Worker module)
// ============================================================================

/**
 * Information about an unspent transaction output (UTXO)
 */
export interface NetworkMonitorUtxoInfo {
  /** Transaction ID containing this UTXO */
  txid: string
  /** Output index within the transaction */
  outIdx: number
  /** Value of the UTXO in satoshis */
  value: string
}
