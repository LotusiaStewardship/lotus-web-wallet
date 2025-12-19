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
 * Status response from service worker
 */
export interface SWStatusResponse {
  registered: boolean
  active: boolean
  version: string
  networkMonitorActive?: boolean
}

/**
 * Network monitor configuration for START_MONITORING message
 */
export interface NetworkMonitorConfig {
  chronikUrl: string
  pollingInterval: number
  addresses: string[]
  scriptType: 'p2pkh' | 'p2tr-commitment'
  scriptPayload: string
}

// ============================================================================
// Event Payloads
// ============================================================================

/**
 * Balance change event payload
 */
export interface BalanceChangedPayload {
  address: string
  oldBalance: string
  newBalance: string
  difference: string
}

/**
 * Transaction detected event payload
 */
export interface TransactionDetectedPayload {
  txid: string
  amount: string
  isSend: boolean
  confirmations: number
}

/**
 * Session expiring event payload
 */
export interface SessionExpiringPayload {
  sessionId: string
  expiresAt: number
  minutesRemaining: number
}

/**
 * Signing request event payload
 */
export interface SigningRequestPayload {
  requestId: string
  fromPeerId: string
  fromName?: string
  amount?: string
}

// ============================================================================
// Push Notification Types
// ============================================================================

/**
 * Notification event types for push notifications
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
