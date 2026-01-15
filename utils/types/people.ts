/**
 * People Types
 *
 * Type definitions for the unified people system.
 */

// ============================================================================
// Relationship Level
// ============================================================================

/**
 * Relationship depth levels:
 * 0 - Address only (can send/receive)
 * 1 - Public key known (can create shared wallets)
 * 2 - P2P connected (real-time presence)
 * 3 - Shared wallets (active collaboration)
 */
export type RelationshipLevel = 0 | 1 | 2 | 3

// ============================================================================
// Person Interface
// ============================================================================

export interface Person {
  // Core identity
  id: string
  name: string
  address: string

  // Cryptographic identity
  publicKeyHex?: string

  // P2P presence
  peerId?: string
  isOnline: boolean
  lastSeenAt?: number

  // Capabilities
  canSign: boolean
  signerCapabilities?: IdentitySignerCapabilities

  // Relationship
  level: RelationshipLevel
  isFavorite: boolean
  tags: string[]
  notes?: string

  // Activity summary
  lastActivityAt?: number
  transactionCount: number
  totalSent: bigint
  totalReceived: bigint

  // Shared wallets
  sharedWalletIds: string[]

  // UI
  avatarUrl?: string

  // Timestamps
  createdAt: number
  updatedAt: number
}

/**
 * Participant in a shared MuSig2 wallet.
 *
 * Represents a single signer in a multi-signature wallet configuration.
 * Each participant contributes their public key to the aggregated Taproot key.
 */
export interface SharedWalletParticipant {
  /**
   * Person ID reference.
   * Use 'self' to indicate the current user/wallet owner.
   */
  personId: string

  /**
   * Compressed public key in hexadecimal format.
   * Required for MuSig2 key aggregation (66 hex chars, starts with 02 or 03).
   */
  publicKeyHex: string

  /**
   * Indicates whether this participant is the current wallet owner.
   * Used to distinguish self from other participants in the wallet.
   */
  isMe: boolean
}

// ============================================================================
// Shared Wallet Interface
// ============================================================================

/**
 * Shared wallet configuration for MuSig2 multi-signature wallets.
 *
 * MuSig2 wallets use Taproot key aggregation where all participants
 * must sign (n-of-n). The aggregated public key creates a single
 * Taproot address that looks identical to a regular single-sig address.
 */
export interface SharedWallet {
  /** Unique identifier for the shared wallet */
  id: string
  /** Human-readable name for the wallet */
  name: string
  /** Optional description of the wallet's purpose */
  description?: string
  /** MuSig2 Taproot address (derived from aggregated public key) */
  address: string
  /** Aggregated MuSig2 public key in hex format */
  aggregatedPublicKeyHex: string
  /** Participants with their public keys for signing */
  participants: SharedWalletParticipant[]
  /** Number of required signers (always equals participants.length for MuSig2) */
  threshold: number
  /** Current wallet balance in satoshis */
  balanceSats: bigint
  /** Timestamp of last transaction activity */
  lastActivityAt?: number
  /** Total number of transactions involving this wallet */
  transactionCount: number
  /** Current wallet status */
  status: 'active' | 'pending' | 'archived'
  /** Timestamp when the wallet was created */
  createdAt: number
  /** Timestamp when the wallet was last updated */
  updatedAt: number
}

// ============================================================================
// People Store State
// ============================================================================

export interface PeopleState {
  people: Map<string, Person>
  sharedWallets: Map<string, SharedWallet>
  searchQuery: string
  sortBy: 'recent' | 'name' | 'favorite'
  initialized: boolean
}

// ============================================================================
// Person Input Types
// ============================================================================

export type PersonInput = Omit<Person, 'id' | 'createdAt' | 'updatedAt'>
export type PersonUpdate = Partial<Omit<Person, 'id' | 'createdAt'>>

export type SharedWalletInput = Omit<
  SharedWallet,
  'id' | 'createdAt' | 'updatedAt'
>
export type SharedWalletUpdate = Partial<Omit<SharedWallet, 'id' | 'createdAt'>>
