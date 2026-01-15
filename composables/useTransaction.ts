/**
 * Transaction Composable
 *
 * Transaction parsing, formatting, and utility functions.
 *
 * 1/12/26: Unused; consider refactoring for UI actions
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Transaction direction
 */
export type TxDirection = 'incoming' | 'outgoing' | 'self'

/**
 * Transaction status
 */
export type TxStatus = 'pending' | 'confirmed' | 'failed'

/**
 * Formatted transaction for display
 */
export interface FormattedTransaction {
  /** Transaction ID */
  txid: string
  /** Direction */
  direction: TxDirection
  /** Status */
  status: TxStatus
  /** Amount in satoshis */
  amountSats: bigint
  /** Formatted amount */
  amountDisplay: string
  /** Amount color class */
  amountColor: string
  /** Fee in satoshis (if outgoing) */
  feeSats?: bigint
  /** Formatted fee */
  feeDisplay?: string
  /** Counterparty address */
  address?: string
  /** Truncated address */
  addressDisplay?: string
  /** Timestamp */
  timestamp: number
  /** Formatted time */
  timeDisplay: string
  /** Block height (0 if unconfirmed) */
  blockHeight: number
  /** Confirmations */
  confirmations: number
  /** Whether coinbase */
  isCoinbase: boolean
  /** OP_RETURN data if present */
  opReturn?: string
}

/**
 * Transaction input/output for detailed view
 */
export interface TxIO {
  /** Address */
  address: string
  /** Amount in satoshis */
  amountSats: bigint
  /** Whether this is ours */
  isMine: boolean
  /** Script type */
  scriptType?: string
}

// ============================================================================
// Composable
// ============================================================================

export function useTransaction() {
  const { formatXPI, formatSignedAmount, getAmountColor } = useAmount()
  const { timeAgo } = useTime()
  const { truncateAddress } = useAddress()

  /**
   * Determine transaction direction
   * @param inputAmount - Total input amount from our addresses
   * @param outputAmount - Total output amount to our addresses
   * @returns Transaction direction
   */
  function getDirection(
    inputAmount: bigint,
    outputAmount: bigint,
  ): TxDirection {
    if (inputAmount === 0n && outputAmount > 0n) return 'incoming'
    if (inputAmount > 0n && outputAmount === 0n) return 'outgoing'
    if (inputAmount > 0n && outputAmount > 0n) {
      // Self-send or change
      if (inputAmount === outputAmount) return 'self'
      return inputAmount > outputAmount ? 'outgoing' : 'incoming'
    }
    return 'self'
  }

  /**
   * Get transaction status from confirmations
   * @param confirmations - Number of confirmations
   * @returns Transaction status
   */
  function getStatus(confirmations: number): TxStatus {
    if (confirmations === 0) return 'pending'
    return 'confirmed'
  }

  /**
   * Get status badge color
   * @param status - Transaction status
   * @returns Color name for badge
   */
  function getStatusColor(status: TxStatus): string {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'confirmed':
        return 'success'
      case 'failed':
        return 'error'
      default:
        return 'neutral'
    }
  }

  /**
   * Get status icon
   * @param status - Transaction status
   * @returns Icon name
   */
  function getStatusIcon(status: TxStatus): string {
    switch (status) {
      case 'pending':
        return 'i-lucide-clock'
      case 'confirmed':
        return 'i-lucide-check-circle'
      case 'failed':
        return 'i-lucide-x-circle'
      default:
        return 'i-lucide-circle'
    }
  }

  /**
   * Get direction icon
   * @param direction - Transaction direction
   * @returns Icon name
   */
  function getDirectionIcon(direction: TxDirection): string {
    switch (direction) {
      case 'incoming':
        return 'i-lucide-arrow-down-left'
      case 'outgoing':
        return 'i-lucide-arrow-up-right'
      case 'self':
        return 'i-lucide-repeat'
      default:
        return 'i-lucide-circle'
    }
  }

  /**
   * Get direction color
   * @param direction - Transaction direction
   * @returns Color class
   */
  function getDirectionColor(direction: TxDirection): string {
    switch (direction) {
      case 'incoming':
        return 'text-success'
      case 'outgoing':
        return 'text-error'
      case 'self':
        return 'text-muted'
      default:
        return 'text-muted'
    }
  }

  /**
   * Get direction label
   * @param direction - Transaction direction
   * @returns Human readable label
   */
  function getDirectionLabel(direction: TxDirection): string {
    switch (direction) {
      case 'incoming':
        return 'Received'
      case 'outgoing':
        return 'Sent'
      case 'self':
        return 'Self'
      default:
        return 'Unknown'
    }
  }

  /**
   * Format a transaction for display
   * @param tx - Raw transaction data
   * @param myAddress - User's address for direction detection
   * @param tipHeight - Current chain tip height
   * @returns Formatted transaction
   */
  function formatTransaction(
    tx: {
      txid: string
      timestamp?: number
      blockHeight?: number
      inputs: Array<{ address?: string; value: string | bigint }>
      outputs: Array<{ address?: string; value: string | bigint }>
      isCoinbase?: boolean
    },
    myAddress: string,
    tipHeight: number,
  ): FormattedTransaction {
    // Calculate amounts
    let inputAmount = 0n
    let outputAmount = 0n
    let counterpartyAddress: string | undefined

    for (const input of tx.inputs) {
      if (input.address === myAddress) {
        inputAmount += BigInt(input.value)
      }
    }

    for (const output of tx.outputs) {
      if (output.address === myAddress) {
        outputAmount += BigInt(output.value)
      } else if (!counterpartyAddress && output.address) {
        counterpartyAddress = output.address
      }
    }

    const direction = getDirection(inputAmount, outputAmount)
    const blockHeight = tx.blockHeight ?? 0
    const confirmations = blockHeight > 0 ? tipHeight - blockHeight + 1 : 0
    const status = getStatus(confirmations)

    // Calculate net amount
    let netAmount: bigint
    if (direction === 'incoming') {
      netAmount = outputAmount
    } else if (direction === 'outgoing') {
      netAmount = inputAmount - outputAmount
    } else {
      netAmount = 0n
    }

    const isIncoming = direction === 'incoming'

    return {
      txid: tx.txid,
      direction,
      status,
      amountSats: netAmount,
      amountDisplay: formatSignedAmount(netAmount, isIncoming),
      amountColor: getAmountColor(netAmount, isIncoming),
      address: counterpartyAddress,
      addressDisplay: counterpartyAddress
        ? truncateAddress(counterpartyAddress, 10, 6)
        : undefined,
      timestamp: tx.timestamp ?? Date.now() / 1000,
      timeDisplay: timeAgo(tx.timestamp ?? Date.now() / 1000),
      blockHeight,
      confirmations,
      isCoinbase: tx.isCoinbase ?? false,
    }
  }

  /**
   * Truncate transaction ID for display
   * @param txid - Full transaction ID
   * @param startChars - Characters at start
   * @param endChars - Characters at end
   * @returns Truncated txid
   */
  function truncateTxid(
    txid: string,
    startChars: number = 16,
    endChars: number = 6,
  ): string {
    if (!txid || txid.length <= startChars + endChars + 3) return txid
    return `${txid.slice(0, startChars)}...${txid.slice(-endChars)}`
  }

  /**
   * Get explorer URL for transaction
   * @param txid - Transaction ID
   * @returns Explorer URL
   */
  function getExplorerUrl(txid: string): string {
    return `/explorer/tx/${txid}`
  }

  /**
   * Check if txid is valid format
   * @param txid - Transaction ID to check
   * @returns Whether valid
   */
  function isValidTxid(txid: string): boolean {
    return /^[a-f0-9]{64}$/i.test(txid)
  }

  /**
   * Parse OP_RETURN data
   * @param hex - Hex string of OP_RETURN data
   * @returns Decoded string or null
   */
  function parseOpReturn(hex: string): string | null {
    if (!hex) return null
    try {
      return Buffer.from(hex, 'hex').toString('utf8')
    } catch {
      return null
    }
  }

  return {
    // Direction
    getDirection,
    getDirectionIcon,
    getDirectionColor,
    getDirectionLabel,

    // Status
    getStatus,
    getStatusColor,
    getStatusIcon,

    // Formatting
    formatTransaction,
    truncateTxid,

    // Utilities
    getExplorerUrl,
    isValidTxid,
    parseOpReturn,
  }
}
