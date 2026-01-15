/**
 * Persistent wallet state for offline support and quick restoration
 *
 * 1/10/26: Unused, pending IndexedDB caching support
 *
 * TODO: Once we have true caching support in IndexedDB, this can be utilized
 *       to store and maintain wallet state in the service worker.
 */
export interface CachedWalletState {
  /** Current balance information */
  balance: {
    /** Total balance in satoshis */
    total: string
    /** Spendable balance in satoshis */
    spendable: string
  }
  /** Current blockchain tip height */
  tipHeight: number
  /** Current blockchain tip hash */
  tipHash: string
  /** Timestamp when this state was last updated (Unix ms) */
  lastUpdated: number
  /** Cached transaction history items */
  transactionHistory?: TransactionHistoryItem[]
  /** Timestamp when transaction history was last updated (Unix ms) */
  historyLastUpdated?: number
  /** Number of history pages currently cached */
  historyPagesCached?: number
}

/**
 * Cached state of a MuSig2 signing session for persistence
 *
 * 1/10/26: Unused, needs to be integrated into IndexedDB caching
 */
export interface MuSig2SessionCache {
  /** Unique session identifier */
  sessionId: string
  /** Current status of the signing session */
  status: 'pending' | 'signing' | 'completed' | 'failed'
  /** List of participant peer IDs or public keys */
  participants: string[]
  /** Timestamp when session was created (Unix ms) */
  createdAt: number
  /** Timestamp when session expires (Unix ms) */
  expiresAt: number
  /** Additional session-specific metadata */
  metadata?: Record<string, unknown>
}
