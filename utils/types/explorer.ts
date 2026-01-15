/**
 * Explorer API Types
 *
 * Extended type definitions for the Lotus Explorer API responses.
 * These types extend the base Chronik types with additional fields
 * returned by the Explorer API, such as address encoding and RANK data.
 */
import type { TransactionOutputRANK } from 'xpi-ts/lib/rank'
import type { Block, TxInput, TxOutput, Tx } from 'chronik-client'

// export relevant Chronik types for convenience
export type { TxInput, TxOutput, Tx }

/**
 * Extended transaction input with address information
 * Extends Chronik TxInput with XAddress encoding
 */
export interface ExplorerTxInput extends TxInput {
  /** XAddress-encoded representation of the input address */
  address: string
}

/**
 * Extended transaction output with address and RANK data
 * Extends Chronik TxOutput with optional address and RANK output parsing
 */
export interface ExplorerTxOutput extends TxOutput {
  /** XAddress-encoded representation of the output address (undefined for OP_RETURN) */
  address?: string
  /** Parsed RANK protocol data if this is a RANK output */
  rankOutput?: TransactionOutputRANK
}

/**
 * Extended transaction with Explorer-specific fields
 * Extends Chronik Tx with address-enriched inputs/outputs and burn tracking
 */
export interface ExplorerTx extends Tx {
  /** Transaction inputs with resolved addresses */
  inputs: ExplorerTxInput[]
  /** Transaction outputs with resolved addresses and RANK data */
  outputs: ExplorerTxOutput[]
  /** Total satoshis burned in OP_RETURN outputs */
  sumBurnedSats: string
}

/**
 * Extended block with Explorer-specific fields
 * Extends Chronik Block with miner address and enriched transactions
 */
export interface ExplorerBlock extends Block {
  /** Address of the miner who mined this block (extracted from coinbase) */
  minedBy?: string
  /** Transactions in this block with resolved addresses and RANK data */
  txs: ExplorerTx[]
}

// Transaction type classification for wallet history
export type ExplorerTxType =
  | 'give'
  | 'receive'
  | 'rank'
  | 'burn'
  | 'coinbase'
  | 'self'
  | 'unknown'

/**
 * Parsed transaction with classified type and extracted data
 * Represents a processed transaction ready for display in wallet history
 */
export interface ParsedTransaction {
  /** Transaction ID (hash) */
  txid: string
  /** Classified transaction type */
  type: ExplorerTxType
  /** Unix timestamp of the transaction */
  timestamp: number
  /** Block height (-1 for unconfirmed) */
  blockHeight: number
  /** Amount transferred in satoshis (for give/receive transactions) */
  amount?: string
  /** Address of the counterparty (sender for receive, recipient for give) */
  counterpartyAddress?: string
  /** RANK protocol data (for rank transactions) */
  rankData?: TransactionOutputRANK & { burnedAmount: string }
  /** Amount burned in OP_RETURN outputs (for burn transactions) */
  burnedAmount?: string
  /** Raw Explorer transaction data for advanced view */
  raw: ExplorerTx
}
