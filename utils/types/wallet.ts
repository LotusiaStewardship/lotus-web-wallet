import type { Utxo } from 'chronik-client'
import type * as Bitcore from 'xpi-ts/lib/bitcore'

/**
 * Wallet Types
 *
 * Core type definitions for wallet state and operations.
 * These types are used across stores, services, and components.
 */
export type UtxoData = Pick<Utxo, 'blockHeight' | 'isCoinbase' | 'value'>

/**
 * UTXO entry with outpoint identifier
 * Used in draft.ts store for transaction building and coin control
 */
export interface UtxoEntry extends UtxoData {
  /** Transaction outpoint in format "txid_vout" */
  outpoint: string
}
/**
 * Per-account UTXO and balance state
 */
export interface AccountUtxoState {
  utxos: Map<string, UtxoData>
  balance: WalletBalance
}
/**
 * Context needed to build a transaction without exposing internal private properties.
 * This is the public API for transaction building.
 */
export interface WalletTransactionBuildContext {
  script: Bitcore.Script
  addressType: AddressType
  changeAddress: string
  internalPubKey?: Bitcore.PublicKey
  merkleRoot?: Buffer
}

/**
 * Address type for wallet generation
 * - 'p2pkh': Pay-to-Public-Key-Hash (legacy, smaller addresses)
 * - 'p2tr-commitment': Pay-to-Taproot (modern, enhanced privacy and script capabilities)
 */
export type AddressType = 'p2pkh' | 'p2tr-commitment'

/**
 * Wallet balance breakdown
 */
export interface WalletBalance {
  /** Total balance including unconfirmed (in satoshis as string) */
  total: string
  /** Spendable/Mature balance (confirmed only, in satoshis as string) */
  spendable: string
  /** Total number of UTXOs that sum to total balance */
  utxoCount: number
}

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

export interface WalletState {
  /** Whether the wallet has been initialized */
  initialized: boolean
  /** Whether the wallet is currently loading */
  loading: boolean
  /** Message to display during loading operations */
  loadingMessage: string
  /** The wallet's seed phrase (BIP39 mnemonic) */
  seedPhrase: string
  /** The type of address currently in use */
  addressType: AddressType
  /** Current blockchain tip height */
  tipHeight: number
  /** Current blockchain tip hash */
  tipHash: string
  /** Whether the wallet is connected to the network (used for layout connection indicator) */
  connected: boolean
  /** Transaction history items for display */
  transactionHistory: TransactionHistoryItem[]
  /** Whether transaction history is currently loading */
  historyLoading: boolean

  // Multi-account state
  /** Account states keyed by AccountPurpose */
  accounts: Map<AccountPurpose, AccountState>
  /** Per-account UTXO and balance state */
  accountUtxos: Map<AccountPurpose, AccountUtxoState>

  // Legacy compatibility (derived from PRIMARY account)
  /** @deprecated Use getAddress(AccountPurpose.PRIMARY) instead */
  address: string
  /** @deprecated Use accounts.get(PRIMARY).primaryAddress.scriptPayload instead */
  scriptPayload: string
  /** @deprecated Use getAccountBalance(AccountPurpose.PRIMARY) instead */
  balance: WalletBalance
  /** @deprecated Use accountUtxos.get(PRIMARY).utxos instead */
  utxos: Map<string, UtxoData>
}

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
