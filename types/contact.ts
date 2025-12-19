/**
 * Contact Types
 *
 * Type definitions for contact management.
 */

import type { NetworkType } from './network'
import type { Identity, IdentitySignerCapabilities } from './identity'
import { IdentityLevel } from './identity'

// ============================================================================
// Contact Address Types
// ============================================================================

/**
 * Network-specific addresses for a contact
 */
export interface ContactAddresses {
  /** Mainnet address */
  livenet?: string
  /** Testnet address */
  testnet?: string
  /** Regtest address (future) */
  regtest?: string
}

// ============================================================================
// Contact Types
// ============================================================================

/**
 * Contact record
 */
/**
 * Signer capabilities for MuSig2
 */
export interface SignerCapabilities {
  /** Supports MuSig2 signing */
  musig2: boolean
  /** Threshold for multi-sig (optional) */
  threshold?: number
}

export interface Contact {
  // === IDENTIFICATION ===
  /** Unique contact ID */
  id: string
  /** Display name */
  name: string

  // === IDENTITY LINK ===
  /**
   * Reference to unified identity (publicKeyHex).
   * When set, identity properties come from the Identity store.
   */
  identityId?: string

  // === ADDRESS ===
  /**
   * Lotus address for this contact.
   * - If identityId is set: derived from identity's publicKey
   * - If identityId is not set: stored directly (legacy contact)
   */
  address: string
  /** Network-specific addresses */
  addresses?: ContactAddresses

  // === RELATIONSHIP METADATA ===
  /** Optional notes */
  notes?: string
  /** Optional avatar URL or base64 */
  avatar?: string
  /** Optional tags for categorization */
  tags?: string[]
  /** Favorite/starred contact for quick access */
  isFavorite?: boolean
  /** Group ID for contact organization */
  groupId?: string

  // === P2P CONNECTIVITY (legacy - prefer identityId) ===
  /**
   * P2P peer ID for discovered services
   * @deprecated Use identityId to link to Identity with peerId
   */
  peerId?: string
  /** Optional service type from P2P discovery */
  serviceType?: string
  /**
   * Public key hex for MuSig2 shared wallets
   * @deprecated Use identityId to link to Identity with publicKeyHex
   */
  publicKey?: string
  /**
   * Signer capabilities for MuSig2
   * @deprecated Use identityId to link to Identity with signerCapabilities
   */
  signerCapabilities?: SignerCapabilities
  /**
   * Last seen online timestamp
   * @deprecated Use identityId to link to Identity with lastSeenAt
   */
  lastSeenOnline?: number

  // === ACTIVITY TRACKING ===
  /** Last transaction timestamp with this contact */
  lastTransactionAt?: number
  /** Total amount sent to this contact (in sats) */
  totalSent?: bigint
  /** Total amount received from this contact (in sats) */
  totalReceived?: bigint
  /** Number of transactions with this contact */
  transactionCount?: number

  // === TIMESTAMPS ===
  /** Creation timestamp */
  createdAt: number
  /** Last update timestamp */
  updatedAt: number
}

/**
 * Contact creation input (without auto-generated fields)
 */
export type ContactInput = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Contact update input (partial, without immutable fields)
 */
export type ContactUpdate = Partial<Omit<Contact, 'id' | 'createdAt'>>

/**
 * Online status for a contact
 */
export type OnlineStatus = 'online' | 'recently_online' | 'offline' | 'unknown'

/**
 * Contact with resolved identity information.
 * Used for UI display where identity data is needed.
 */
export interface ContactWithIdentity extends Contact {
  /** Resolved identity from Identity store (if identityId is set) */
  identity?: Identity
  /** Current online status (computed from multiple signals) */
  onlineStatus: OnlineStatus
  /** Whether this contact is currently online */
  isOnline: boolean
  /** Whether this contact can participate in MuSig2 */
  canMuSig2: boolean
  /** Identity relationship level */
  level: IdentityLevel
}

// ============================================================================
// Contact Group Types
// ============================================================================

/**
 * Contact group for organization
 */
export interface ContactGroup {
  /** Unique group ID */
  id: string
  /** Group name */
  name: string
  /** Group color for UI */
  color?: string
  /** Group icon */
  icon?: string
  /** Contact IDs in this group */
  contactIds: string[]
  /** Creation timestamp */
  createdAt: number
  /** Last update timestamp */
  updatedAt: number
}

// ============================================================================
// Contact State Types
// ============================================================================

/**
 * Contacts store state
 */
export interface ContactsState {
  /** All contacts */
  contacts: Contact[]
  /** Contact groups */
  groups: ContactGroup[]
  /** Whether the store has been initialized */
  initialized: boolean
}

// ============================================================================
// Contact Search Types
// ============================================================================

/**
 * Contact search options
 */
export interface ContactSearchOptions {
  /** Search query */
  query: string
  /** Filter by tags */
  tags?: string[]
  /** Filter by group ID */
  groupId?: string
  /** Filter by network */
  network?: NetworkType
  /** Include only favorites */
  favoritesOnly?: boolean
  /** Maximum results */
  limit?: number
}

/**
 * Contact search result
 */
export interface ContactSearchResult {
  /** Matching contacts */
  contacts: Contact[]
  /** Total count (before limit) */
  totalCount: number
}

// ============================================================================
// Contact Import/Export Types
// ============================================================================

/**
 * Contact export format
 */
export interface ContactExport {
  /** Export version for compatibility */
  version: number
  /** Export timestamp */
  exportedAt: number
  /** Exported contacts (without internal IDs) */
  contacts: Array<Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>>
}

/**
 * Contact import options
 */
export interface ContactImportOptions {
  /** Merge with existing contacts (true) or replace all (false) */
  merge: boolean
  /** Skip contacts with duplicate addresses */
  skipDuplicates: boolean
}

/**
 * Contact import result
 */
export interface ContactImportResult {
  /** Number of contacts imported */
  imported: number
  /** Number of contacts skipped (duplicates) */
  skipped: number
  /** Errors encountered */
  errors: string[]
}

// ============================================================================
// Constants
// ============================================================================

/** Storage key for contacts */
export const CONTACTS_STORAGE_KEY = 'lotus-wallet-contacts'

/** Current export format version */
export const CONTACTS_EXPORT_VERSION = 1

/** Maximum contacts allowed */
export const MAX_CONTACTS = 1000

/** Maximum tags per contact */
export const MAX_TAGS_PER_CONTACT = 10

/** Maximum tag length */
export const MAX_TAG_LENGTH = 32
