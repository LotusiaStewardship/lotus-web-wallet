/**
 * People Types
 *
 * Type definitions for the unified people system.
 */

import type { IdentitySignerCapabilities } from './identity'

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

// ============================================================================
// Shared Wallet Participant
// ============================================================================

export interface SharedWalletParticipant {
  /** Person ID (or 'self' for current user) */
  personId: string
  /** Public key hex (required for MuSig2) */
  publicKeyHex: string
  /** Whether this is the current user */
  isMe: boolean
}

// ============================================================================
// Shared Wallet Interface
// ============================================================================

export interface SharedWallet {
  id: string
  name: string
  description?: string

  // MuSig2 Taproot address (computed from aggregated public key)
  address: string

  // MuSig2 cryptographic data
  aggregatedPublicKeyHex: string

  // Participants with their public keys
  participants: SharedWalletParticipant[]

  // MuSig2 is always n-of-n, but we store threshold for future flexibility
  threshold: number

  // Balance
  balanceSats: bigint

  // Activity
  lastActivityAt?: number
  transactionCount: number

  // Status
  status: 'active' | 'pending' | 'archived'

  // Timestamps
  createdAt: number
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

// ============================================================================
// Constants
// ============================================================================

export const PEOPLE_STORAGE_KEY = 'lotus:people'
export const SHARED_WALLETS_STORAGE_KEY = 'lotus:shared-wallets'
