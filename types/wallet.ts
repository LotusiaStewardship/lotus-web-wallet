/**
 * Wallet Types
 *
 * Core type definitions for wallet state and operations.
 * These types are used across stores, services, and components.
 */

// ============================================================================
// Address Types
// ============================================================================

/**
 * Address type for wallet generation
 * - 'p2pkh': Pay-to-Public-Key-Hash (legacy, smaller addresses)
 * - 'p2tr': Pay-to-Taproot (modern, enhanced privacy and script capabilities)
 */
export type AddressType = 'p2pkh' | 'p2tr'

// ============================================================================
// Balance Types
// ============================================================================

/**
 * Wallet balance breakdown
 */
export interface WalletBalance {
  /** Total balance including unconfirmed (in satoshis as string) */
  total: string
  /** Spendable balance (confirmed only, in satoshis as string) */
  spendable: string
}

// ============================================================================
// UTXO Types
// ============================================================================

/**
 * UTXO data stored in wallet state
 */
export interface UtxoData {
  /** Value in satoshis as string */
  value: string
  /** Block height (0 if unconfirmed) */
  height: number
  /** Whether this is a coinbase output */
  isCoinbase: boolean
}

/**
 * Full UTXO reference with outpoint
 */
export interface Utxo extends UtxoData {
  /** Transaction ID */
  txid: string
  /** Output index */
  vout: number
}

// ============================================================================
// Transaction History Types
// ============================================================================

/**
 * Transaction history item for display
 */
export interface TransactionHistoryItem {
  /** Transaction ID */
  txid: string
  /** ISO timestamp string */
  timestamp: string
  /** Block height (0 if unconfirmed) */
  blockHeight: number
  /** Whether this is an outgoing transaction */
  isSend: boolean
  /** Amount in satoshis as string */
  amount: string
  /** Counterparty address */
  address: string
  /** Number of confirmations */
  confirmations: number
}

// ============================================================================
// Wallet State Types
// ============================================================================

/**
 * Core wallet state
 */
export interface WalletState {
  /** Whether the wallet has been initialized */
  initialized: boolean
  /** SDK is loaded and wallet can be used locally */
  sdkReady: boolean
  /** Loading state for async operations */
  loading: boolean
  /** Loading message for UI feedback */
  loadingMessage: string
  /** Seed phrase (encrypted in production) */
  seedPhrase: string
  /** Current wallet address */
  address: string
  /** The type of address currently in use */
  addressType: AddressType
  /** Script payload for Chronik subscriptions */
  scriptPayload: string
  /** Current balance */
  balance: WalletBalance
  /** UTXO set (outpoint -> data) */
  utxos: Map<string, UtxoData>
  /** Current chain tip height */
  tipHeight: number
  /** Current chain tip hash */
  tipHash: string
  /** Whether connected to Chronik */
  connected: boolean
  /** Transaction history */
  transactionHistory: TransactionHistoryItem[]
  /** Whether history is loading */
  historyLoading: boolean
}

// ============================================================================
// Wallet Configuration
// ============================================================================

/**
 * Wallet configuration options
 */
export interface WalletConfig {
  /** Default address type for new wallets */
  defaultAddressType: AddressType
  /** Auto-connect to Chronik on initialization */
  autoConnect: boolean
  /** Enable transaction history caching */
  cacheHistory: boolean
}

// ============================================================================
// Constants
// ============================================================================

/** BIP44 purpose for HD derivation */
export const BIP44_PURPOSE = 44

/** BIP44 coin type for Lotus */
export const BIP44_COINTYPE = 10605

/** Number of decimal places for Lotus */
export const LOTUS_DECIMALS = 6

/** Satoshis per XPI */
export const SATS_PER_XPI = 1_000_000

/** Maximum transaction size in bytes */
export const MAX_TX_SIZE = 100_000

/** Dust threshold in satoshis */
export const DUST_THRESHOLD = 546n
