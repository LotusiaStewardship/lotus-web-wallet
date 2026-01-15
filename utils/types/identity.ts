/**
 * Unified Identity Types
 *
 * The Identity represents a cryptographic entity on the Lotus network.
 * The publicKeyHex is the canonical identifier from which other
 * properties are derived.
 */

/**
 * Transaction types supported by signers
 */
export type TransactionType = 'standard' | 'token' | 'nft' | 'any'

/**
 * Signer capabilities advertised via P2P.
 * Named IdentitySignerCapabilities to avoid conflict with MuSig2 SignerCapabilities.
 */
export interface IdentitySignerCapabilities {
  /** Transaction types this signer supports */
  transactionTypes: TransactionType[]
  /** Amount range the signer accepts */
  amountRange?: { min?: number; max?: number }
  /** Fee the signer charges (in sats) */
  fee?: number
  /** Whether currently accepting signing requests */
  available: boolean
  /** Advertisement expiry timestamp */
  expiresAt?: number
}

/**
 * Unified identity representing a person/entity on the Lotus network.
 */
export interface Identity {
  // === CANONICAL IDENTIFIER ===
  /**
   * Compressed public key in hex format (66 hex chars = 33 bytes).
   * This is the SOURCE OF TRUTH for the identity.
   */
  publicKeyHex: string

  // === DERIVED PROPERTIES ===
  /** Lotus address derived from publicKeyHex */
  address: string

  // === P2P CONNECTIVITY ===
  /** libp2p peer ID (optional - only if P2P connected) */
  peerId?: string
  /** Multiaddresses for direct connection */
  multiaddrs?: string[]

  // === PRESENCE ===
  /** Whether this identity is currently reachable via P2P */
  isOnline: boolean
  /** Last time this identity was seen online */
  lastSeenAt?: number

  // === CAPABILITIES ===
  /** MuSig2 signer capabilities (if advertised) */
  signerCapabilities?: IdentitySignerCapabilities

  // === METADATA ===
  createdAt: number
  updatedAt: number
}

/**
 * Identity relationship levels based on available information.
 */
export enum IdentityLevel {
  /** Only address known (legacy contact) */
  ADDRESS_ONLY = 0,
  /** Public key known (can derive address, eligible for MuSig2) */
  PUBLIC_KEY = 1,
  /** P2P connected (has peerId, can check presence) */
  P2P_CONNECTED = 2,
  /** Active signer (advertising capabilities) */
  ACTIVE_SIGNER = 3,
}

/**
 * Input for creating a new identity (minimal required fields)
 */
export interface IdentityInput {
  publicKeyHex: string
  peerId?: string
  multiaddrs?: string[]
  signerCapabilities?: IdentitySignerCapabilities
}

/**
 * Partial update for an existing identity
 */
export type IdentityUpdate = Partial<
  Omit<Identity, 'publicKeyHex' | 'address' | 'createdAt'>
>
