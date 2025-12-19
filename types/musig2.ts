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

// ============================================================================
// Shared Wallet Types
// ============================================================================

/**
 * Shared wallet configuration
 */
export interface SharedWallet {
  /** Unique wallet ID */
  id: string
  /** Wallet name */
  name: string
  /** Aggregated public key (hex) */
  aggregatedPubKey: string
  /** Wallet address */
  address: string
  /** Required signers (M of N) */
  requiredSigners: number
  /** Total signers */
  totalSigners: number
  /** Participant public keys */
  participantPubKeys: string[]
  /** Participant peer IDs (if known) */
  participantPeerIds?: string[]
  /** Creation timestamp */
  createdAt: number
  /** Last used timestamp */
  lastUsedAt?: number
}

// ============================================================================
// MuSig2 State Types
// ============================================================================

/**
 * MuSig2 store state
 */
export interface MuSig2State {
  /** Whether the MuSig2 system has been initialized */
  initialized: boolean
  /** Discovered signers */
  discoveredSigners: DiscoveredSigner[]
  /** Active signing sessions */
  activeSessions: MuSig2Session[]
  /** Incoming signing requests */
  incomingRequests: IncomingSigningRequest[]
  /** Shared wallets */
  sharedWallets: SharedWallet[]
  /** Our signer advertisement (if advertising) */
  myAdvertisement: SignerAdvertisement | null
  /** Whether we are advertising as a signer */
  isAdvertising: boolean
  /** Error message if any */
  error: string | null
}

// ============================================================================
// Constants
// ============================================================================

/** Storage key for signer configuration */
export const STORAGE_KEY_SIGNER_CONFIG = 'musig2-signer-config'

/** Storage key for shared wallets */
export const STORAGE_KEY_SHARED_WALLETS = 'musig2-shared-wallets'

/** Default session timeout (5 minutes) */
export const SESSION_TIMEOUT = 5 * 60 * 1000

/** Default request timeout (2 minutes) */
export const REQUEST_TIMEOUT = 2 * 60 * 1000

/** Maximum concurrent sessions */
export const MAX_CONCURRENT_SESSIONS = 5

/** Signer discovery topic */
export const SIGNER_DISCOVERY_TOPIC = 'lotus/discovery/musig2-signer'
