/**
 * MuSig2 Types
 *
 * Type definitions for MuSig2 multi-signature operations.
 */

// ============================================================================
// Signer Types
// ============================================================================

/**
 * Signer capability flags
 */
export interface SignerCapabilities {
  /** Supports standard transactions */
  standardTx: boolean
  /** Supports RANK voting transactions */
  rankVoting: boolean
  /** Supports token transactions */
  tokenTx: boolean
  /** Supports OP_RETURN data */
  opReturn: boolean
}

/**
 * Discovered signer information
 */
export interface DiscoveredSigner {
  /** Unique signer ID */
  id: string
  /** Peer ID of the signer */
  peerId: string
  /** Signer's public key (hex) */
  publicKey: string
  /** Signer's wallet address */
  walletAddress: string
  /** Optional nickname */
  nickname?: string
  /** Optional avatar URL */
  avatar?: string
  /** Signer capabilities */
  capabilities: SignerCapabilities
  /** Discovery timestamp */
  discoveredAt: number
  /** Last seen timestamp */
  lastSeen: number
  /** Whether currently online */
  isOnline: boolean
}

/**
 * Signer advertisement configuration
 */
export interface SignerAdvertisement {
  /** Public key to advertise (hex) */
  publicKey: string
  /** Wallet address */
  walletAddress: string
  /** Optional nickname */
  nickname?: string
  /** Optional avatar URL */
  avatar?: string
  /** Capabilities to advertise */
  capabilities: SignerCapabilities
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * MuSig2 session state
 */
export enum MuSig2SessionState {
  /** Session created, waiting for participants */
  CREATED = 'created',
  /** Key aggregation in progress */
  KEY_AGGREGATION = 'key_aggregation',
  /** Keys aggregated, ready for nonce exchange */
  KEYS_AGGREGATED = 'keys_aggregated',
  /** Nonce exchange in progress */
  NONCE_EXCHANGE = 'nonce_exchange',
  /** Nonces exchanged, ready for signing */
  NONCES_EXCHANGED = 'nonces_exchanged',
  /** Signing in progress */
  SIGNING = 'signing',
  /** Session completed successfully */
  COMPLETED = 'completed',
  /** Session failed */
  FAILED = 'failed',
  /** Session cancelled */
  CANCELLED = 'cancelled',
}

/**
 * MuSig2 session participant
 */
export interface MuSig2Participant {
  /** Peer ID */
  peerId: string
  /** Public key (hex) */
  publicKey: string
  /** Wallet address */
  walletAddress: string
  /** Optional nickname */
  nickname?: string
  /** Whether this participant has provided their nonce */
  hasNonce: boolean
  /** Whether this participant has provided their partial signature */
  hasPartialSig: boolean
}

/**
 * MuSig2 signing session
 */
export interface MuSig2Session {
  /** Unique session ID */
  id: string
  /** Session state */
  state: MuSig2SessionState
  /** Session initiator peer ID */
  initiatorPeerId: string
  /** Session participants */
  participants: MuSig2Participant[]
  /** Aggregated public key (hex, available after key aggregation) */
  aggregatedPubKey?: string
  /** Transaction to sign (hex) */
  transactionHex?: string
  /** Transaction preview for display */
  transactionPreview?: TransactionPreview
  /** Creation timestamp */
  createdAt: number
  /** Last update timestamp */
  updatedAt: number
  /** Expiration timestamp */
  expiresAt: number
  /** Error message if failed */
  error?: string
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Incoming signing request
 */
export interface IncomingSigningRequest {
  /** Unique request ID */
  id: string
  /** Session ID */
  sessionId: string
  /** Requester peer ID */
  requesterPeerId: string
  /** Requester wallet address */
  requesterAddress: string
  /** Requester nickname */
  requesterNickname?: string
  /** Transaction to sign (hex) */
  transactionHex: string
  /** Transaction preview */
  transactionPreview: TransactionPreview
  /** Request timestamp */
  requestedAt: number
  /** Expiration timestamp */
  expiresAt: number
  /** Request status */
  status: 'pending' | 'approved' | 'rejected' | 'expired'
}

/**
 * Transaction preview for signing requests
 */
export interface TransactionPreview {
  /** Total input amount in satoshis */
  inputAmount: bigint
  /** Total output amount in satoshis */
  outputAmount: bigint
  /** Fee in satoshis */
  fee: bigint
  /** Recipients */
  recipients: Array<{
    address: string
    amount: bigint
  }>
  /** Whether includes OP_RETURN */
  hasOpReturn: boolean
  /** OP_RETURN data if present */
  opReturnData?: string
}

/**
 * This interface defines the reactive state managed by the MuSig2 store,
 * which coordinates all multi-signature signing operations in the application.
 *
 * The state tracks:
 * - System initialization status
 * - Discovery of available signers on the P2P network
 * - Active signing sessions and their progress
 * - Incoming signing requests from other peers
 * - Shared wallets created with other participants
 * - Local signer advertisement configuration
 *
 * @example
 * ```typescript
 * const musig2Store = useMuSig2Store()
 *
 * // Check if system is ready
 * if (musig2Store.initialized && musig2Store.discoveredSigners.length > 0) {
 *   // Create a signing session with discovered signers
 * }
 *
 * // Handle incoming requests
 * for (const request of musig2Store.incomingRequests) {
 *   if (request.status === 'pending') {
 *     // Display request to user for approval
 *   }
 * }
 * ```
 *
 * @see {@link MuSig2Session} for session state details
 * @see {@link DiscoveredSigner} for signer information
 * @see {@link IncomingSigningRequest} for request handling
 */
export interface MuSig2State {
  /** Whether the MuSig2 system has been initialized */
  initialized: boolean
  /** List of discovered signers available for multi-signature operations */
  discoveredSigners: DiscoveredSigner[]
  /** Currently active signing sessions */
  activeSessions: MuSig2Session[]
  /** Incoming signing requests from other peers */
  incomingRequests: IncomingSigningRequest[]
  /** Shared wallets managed by this MuSig2 instance */
  sharedWallets: SharedWallet[]
  /** Our signer advertisement configuration (null if not advertising) */
  myAdvertisement: SignerAdvertisement | null
  /** Whether we are currently advertising as an available signer */
  isAdvertising: boolean
  /** Current error message, or null if no error */
  error: string | null
}
