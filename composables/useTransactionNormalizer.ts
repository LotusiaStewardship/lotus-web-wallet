/**
 * Transaction Normalizer Composable
 *
 * Phase 5: Provides normalization functions to convert different transaction
 * formats into a unified NormalizedTransaction interface for the common TxItem component.
 */
import type { TransactionHistoryItem } from '~/stores/wallet'

/**
 * Normalized transaction format for unified display
 */
export interface NormalizedTransaction {
  txid: string
  timestamp: number
  blockHeight?: number
  confirmations: number
  direction: 'incoming' | 'outgoing' | 'self'
  isCoinbase?: boolean
  amount: bigint
  fee?: bigint
  counterpartyAddress?: string
  type: 'transfer' | 'coinbase' | 'rank' | 'burn'
  burnAmount?: bigint
  inputCount?: number
  outputCount?: number
  totalOutput?: bigint
  isRank?: boolean
  opReturn?: string
}

/**
 * History transaction format (from history page)
 */
export interface HistoryTransaction {
  txid: string
  timestamp: number
  blockHeight?: number
  direction: 'incoming' | 'outgoing' | 'self'
  amount: string
  fee?: string
  counterparty?: string
  counterpartyName?: string
  confirmations: number
  isCoinbase?: boolean
  opReturn?: string
}

/**
 * Explorer transaction format (from explorer API)
 */
export interface ExplorerTransaction {
  txid: string
  timestamp?: number
  blockHeight?: number
  isCoinbase?: boolean
  isRank?: boolean
  burnAmount?: string | bigint
  totalOutput?: string | bigint
  inputs?: Array<{ address?: string; value?: string | bigint }>
  outputs?: Array<{ address?: string; value?: string | bigint }>
}

export function useTransactionNormalizer() {
  /**
   * Normalize a wallet TransactionHistoryItem
   */
  function normalizeWalletTx(
    tx: TransactionHistoryItem,
  ): NormalizedTransaction {
    const amount = BigInt(tx.amount || '0')
    const isSend = tx.isSend

    return {
      txid: tx.txid,
      timestamp: Number(tx.timestamp),
      blockHeight: tx.blockHeight,
      confirmations: tx.blockHeight ? 1 : 0, // Simplified - would need tipHeight for accurate count
      direction: isSend ? 'outgoing' : 'incoming',
      isCoinbase: false,
      amount,
      counterpartyAddress: tx.address,
      type: 'transfer',
    }
  }

  /**
   * Normalize a history page transaction
   */
  function normalizeHistoryTx(tx: HistoryTransaction): NormalizedTransaction {
    const amount = BigInt(tx.amount)
    const fee = tx.fee ? BigInt(tx.fee) : undefined

    let type: NormalizedTransaction['type'] = 'transfer'
    if (tx.isCoinbase) type = 'coinbase'

    return {
      txid: tx.txid,
      timestamp: tx.timestamp,
      blockHeight: tx.blockHeight,
      confirmations: tx.confirmations,
      direction: tx.direction,
      isCoinbase: tx.isCoinbase,
      amount,
      fee,
      counterpartyAddress: tx.counterparty,
      type,
      opReturn: tx.opReturn,
    }
  }

  /**
   * Normalize an explorer transaction
   */
  function normalizeExplorerTx(tx: ExplorerTransaction): NormalizedTransaction {
    const burnAmount = tx.burnAmount
      ? typeof tx.burnAmount === 'string'
        ? BigInt(tx.burnAmount)
        : tx.burnAmount
      : undefined

    const totalOutput = tx.totalOutput
      ? typeof tx.totalOutput === 'string'
        ? BigInt(tx.totalOutput)
        : tx.totalOutput
      : 0n

    let type: NormalizedTransaction['type'] = 'transfer'
    if (tx.isCoinbase) type = 'coinbase'
    else if (tx.isRank) type = 'rank'
    else if (burnAmount && burnAmount > 0n) type = 'burn'

    return {
      txid: tx.txid,
      timestamp: tx.timestamp || 0,
      blockHeight: tx.blockHeight,
      confirmations: tx.blockHeight ? 1 : 0,
      direction: 'self', // Explorer doesn't know direction without wallet context
      isCoinbase: tx.isCoinbase,
      amount: totalOutput,
      type,
      burnAmount,
      inputCount: tx.inputs?.length,
      outputCount: tx.outputs?.length,
      totalOutput,
      isRank: tx.isRank,
    }
  }

  return {
    normalizeWalletTx,
    normalizeHistoryTx,
    normalizeExplorerTx,
  }
}
