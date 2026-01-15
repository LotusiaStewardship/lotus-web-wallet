/**
 * Transaction Types
 *
 * Type definitions for transaction building, drafts, and display.
 *
 * 1/10/26: This file is completely unused
 */

// ============================================================================
// Draft Transaction Types
// ============================================================================

/**
 * Recipient for draft transaction
 */
export interface DraftRecipient {
  /** Unique ID for UI tracking */
  id: string
  /** Recipient address (Lotus format) */
  address: string
  /** Amount in satoshis */
  amountSats: bigint
  /** Whether this is a "send max" recipient (gets remaining balance after fees) */
  sendMax: boolean
}

/**
 * OP_RETURN data configuration
 */
export interface DraftOpReturn {
  /** Raw data to include */
  data: string
  /** Encoding of the data */
  encoding: 'utf8' | 'hex'
}

/**
 * Locktime configuration
 */
export interface DraftLocktime {
  /** Type of locktime */
  type: 'block' | 'time'
  /** Value (block height or unix timestamp) */
  value: number
}

/**
 * Draft transaction state - managed by draft store
 * This represents the transaction being built in the UI
 */
export interface DraftTransactionState {
  /** Whether the draft transaction has been initialized */
  initialized: boolean
  /** Recipients list */
  recipients: DraftRecipient[]
  /** Fee rate in sat/byte */
  feeRate: number
  /** Selected UTXOs for coin control (empty = auto-select all) */
  selectedUtxos: string[]
  /** OP_RETURN data (optional) */
  opReturn: DraftOpReturn | null
  /** Locktime (optional) */
  locktime: DraftLocktime | null
  /** Computed: estimated fee in satoshis */
  estimatedFee: number
  /** Computed: total input amount in satoshis (available balance) */
  inputAmount: bigint
  /** Computed: total output amount (excluding change) in satoshis */
  outputAmount: bigint
  /** Computed: change amount in satoshis */
  changeAmount: bigint
  /** Computed: max sendable for a single recipient (no change output) */
  maxSendable: bigint
  /** Computed: whether the transaction is valid and ready to send */
  isValid: boolean
  /** Computed: validation error message if not valid */
  validationError: string | null
}

// ============================================================================
// Transaction Input/Output Types
// ============================================================================

/**
 * Transaction input for display
 */
export interface TxInput {
  /** Previous transaction ID */
  prevTxid: string
  /** Previous output index */
  prevVout: number
  /** Input value in satoshis */
  value: bigint
  /** Address that signed this input */
  address: string
  /** Sequence number */
  sequence: number
}

/**
 * Transaction output for display
 */
export interface TxOutput {
  /** Output index */
  vout: number
  /** Output value in satoshis */
  value: bigint
  /** Recipient address (null for OP_RETURN) */
  address: string | null
  /** Script type (p2pkh, p2tr, op_return, etc.) */
  scriptType: string
  /** OP_RETURN data if applicable */
  opReturnData?: string
}

// ============================================================================
// Parsed Transaction Types
// ============================================================================

/**
 * Fully parsed transaction for display
 */
export interface ParsedTransaction {
  /** Transaction ID */
  txid: string
  /** Block hash (null if unconfirmed) */
  blockHash: string | null
  /** Block height (0 if unconfirmed) */
  blockHeight: number
  /** Unix timestamp */
  timestamp: number
  /** Transaction version */
  version: number
  /** Transaction size in bytes */
  size: number
  /** Transaction fee in satoshis */
  fee: bigint
  /** Locktime */
  locktime: number
  /** Number of confirmations */
  confirmations: number
  /** Parsed inputs */
  inputs: TxInput[]
  /** Parsed outputs */
  outputs: TxOutput[]
  /** Whether this is a coinbase transaction */
  isCoinbase: boolean
}

// ============================================================================
// Transaction Building Types
// ============================================================================

/**
 * Options for building a transaction
 */
export interface BuildTransactionOptions {
  /** Recipients with amounts */
  recipients: DraftRecipient[]
  /** UTXOs to use as inputs */
  utxos: Array<{
    txid: string
    vout: number
    value: bigint
    script: string
  }>
  /** Change address */
  changeAddress: string
  /** Fee rate in sat/byte */
  feeRate: number
  /** Optional OP_RETURN data */
  opReturn?: DraftOpReturn
  /** Optional locktime */
  locktime?: DraftLocktime
}

/**
 * Result of building a transaction
 */
export interface BuildTransactionResult {
  /** Serialized transaction hex */
  txHex: string
  /** Transaction ID */
  txid: string
  /** Actual fee paid */
  fee: bigint
  /** Change amount (0 if no change output) */
  change: bigint
}

// ============================================================================
// Broadcast Types
// ============================================================================

/**
 * Result of broadcasting a transaction
 */
export interface BroadcastResult {
  /** Whether broadcast was successful */
  success: boolean
  /** Transaction ID if successful */
  txid?: string
  /** Error message if failed */
  error?: string
}

// ============================================================================
// Fee Estimation Types
// ============================================================================

/**
 * Fee estimation result
 */
export interface FeeEstimate {
  /** Estimated fee in satoshis */
  fee: bigint
  /** Fee rate used (sat/byte) */
  feeRate: number
  /** Estimated transaction size in bytes */
  estimatedSize: number
}

// ============================================================================
// Constants
// ============================================================================

/** Default fee rate in sat/byte */
export const DEFAULT_FEE_RATE = 1

/** Minimum fee rate in sat/byte */
export const MIN_FEE_RATE = 1

/** Maximum fee rate in sat/byte */
export const MAX_FEE_RATE = 1000

/** Estimated size of a P2PKH input in bytes */
export const P2PKH_INPUT_SIZE = 148

/** Estimated size of a P2PKH output in bytes */
export const P2PKH_OUTPUT_SIZE = 34

/** Estimated size of a P2TR input in bytes */
export const P2TR_INPUT_SIZE = 58

/** Estimated size of a P2TR output in bytes */
export const P2TR_OUTPUT_SIZE = 43

/** Transaction overhead in bytes */
export const TX_OVERHEAD = 10
