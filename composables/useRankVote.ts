/**
 * RANK Vote Composable
 *
 * Encapsulates the full voting flow:
 *   User clicks Vote → toScriptRANK() → build tx → sign → broadcast via Chronik
 *
 * Dependencies:
 *   - xpi-ts/lib/rank: toScriptRANK(), ScriptChunkSentimentUTF8, ScriptChunkPlatformUTF8
 *   - xpi-ts/lib/bitcore: Transaction, PrivateKey, Script
 *   - Chronik client (via plugin)
 */

import {
  toScriptRANK,
  type ScriptChunkSentimentUTF8,
  type ScriptChunkPlatformUTF8,
} from 'xpi-ts/lib/rank'
import { useWalletStore } from '~/stores/wallet'

// ============================================================================
// Types
// ============================================================================

export interface VoteParams {
  /** Sentiment: positive (upvote), negative (downvote), or neutral */
  sentiment: ScriptChunkSentimentUTF8
  /** Platform identifier (e.g. 'twitter') */
  platform: ScriptChunkPlatformUTF8
  /** Profile ID on the platform */
  profileId: string
  /** Optional post ID for post-level votes */
  postId?: string
  /** Burn amount in satoshis */
  burnAmountSats: bigint
}

export interface VoteResult {
  /** Whether the vote was successfully broadcast */
  success: boolean
  /** Transaction ID if successful */
  txid?: string
  /** Error message if failed */
  error?: string
}

export type VoteStatus =
  | 'idle'
  | 'building'
  | 'signing'
  | 'broadcasting'
  | 'success'
  | 'error'

// ============================================================================
// Constants
// ============================================================================

/** Minimum burn amount in satoshis (dust threshold) */
const MIN_BURN_SATS = 546n

/** Default burn presets in XPI (displayed to user) mapped to satoshis */
export const BURN_PRESETS = [
  { label: '100', sats: 100_000000n },
  { label: '500', sats: 500_000000n },
  { label: '1K', sats: 1_000_000000n },
  { label: '5K', sats: 5_000_000000n },
]

// ============================================================================
// Composable
// ============================================================================

export function useRankVote() {
  const walletStore = useWalletStore()
  const { broadcastTransaction } = useChronikClient()
  const { addInputsToTransaction } = useTransactionBuilder()

  const status = ref<VoteStatus>('idle')
  const error = ref<string | null>(null)
  const lastTxid = ref<string | null>(null)

  /**
   * Cast a RANK vote by building, signing, and broadcasting a transaction.
   *
   * The transaction structure:
   *   - Input(s): wallet UTXOs covering burn + mining fee
   *   - Output 0: OP_RETURN with RANK script (toScriptRANK)
   *   - Output 1 (change): remaining sats back to wallet
   *
   * The burn amount = total input - change - mining fee.
   * We achieve this by setting tx.fee(burnAmount + miningFee).
   */
  async function castVote(params: VoteParams): Promise<VoteResult> {
    const { sentiment, platform, profileId, postId, burnAmountSats } = params

    // Reset state
    status.value = 'building'
    error.value = null
    lastTxid.value = null

    try {
      // --- Validation ---
      if (!walletStore.isReadyForSigning()) {
        throw new Error('Wallet not initialized')
      }

      if (burnAmountSats < MIN_BURN_SATS) {
        throw new Error(`Burn amount must be at least ${MIN_BURN_SATS} sats`)
      }

      if (!profileId) {
        throw new Error('Profile ID is required')
      }

      // --- Build RANK OP_RETURN script ---
      const rankScript = toScriptRANK(sentiment, platform, profileId, postId)

      // --- Get wallet context ---
      const txContext = walletStore.getTransactionBuildContext()
      if (!txContext) {
        throw new Error('Could not get transaction build context')
      }

      const Bitcore = useNuxtApp().$bitcore
      if (!Bitcore) {
        throw new Error('Bitcore not available')
      }

      // --- Select UTXOs ---
      const spendableUtxos = walletStore.getSpendableUtxos()
      const sortedUtxos = [...spendableUtxos].sort((a, b) =>
        Number(BigInt(b.value) - BigInt(a.value)),
      )

      const selectedUtxos: UtxoEntry[] = []
      let inputTotal = 0n

      // Select enough UTXOs to cover burn + estimated mining fee (~500 sats buffer)
      for (const utxo of sortedUtxos) {
        selectedUtxos.push(utxo)
        inputTotal += BigInt(utxo.value)
        if (inputTotal >= burnAmountSats + 500n) break
      }

      if (inputTotal < burnAmountSats + 300n) {
        throw new Error('Insufficient balance for this vote')
      }

      // --- Construct transaction ---
      const tx = new Bitcore.Transaction()
      tx.feePerByte(DEFAULT_FEE_RATE)

      // Add inputs from selected UTXOs
      addInputsToTransaction(
        tx,
        selectedUtxos,
        txContext.script,
        txContext.addressType,
        txContext.internalPubKey,
        txContext.merkleRoot,
      )

      // Add OP_RETURN output with RANK script
      tx.addData(rankScript)

      // Set change address for remaining sats
      tx.change(txContext.changeAddress)

      // Set fee = burn + mining fee so the burn is consumed as "fee" from the miner's perspective
      // The OP_RETURN marks the tx as a RANK vote; the indexer reads burnAmount from the tx
      const estimatedMiningFee =
        BigInt(tx.toBuffer().length) * BigInt(DEFAULT_FEE_RATE)
      const totalFee = Number(burnAmountSats + estimatedMiningFee)
      tx.fee(totalFee)

      // --- Sign ---
      status.value = 'signing'
      const signedHex = walletStore.signTransactionHex(tx)

      // --- Broadcast ---
      status.value = 'broadcasting'
      const result = await broadcastTransaction(signedHex)
      const txid = typeof result === 'string' ? result : (result as any)?.txid

      if (!txid) {
        throw new Error('Broadcast succeeded but no txid returned')
      }

      // --- Success ---
      status.value = 'success'
      lastTxid.value = txid

      return { success: true, txid }
    } catch (err: any) {
      status.value = 'error'
      const message = err?.message || 'Unknown error casting vote'
      error.value = message
      console.error('[useRankVote] castVote failed:', err)
      return { success: false, error: message }
    }
  }

  /**
   * Reset vote state back to idle
   */
  function reset() {
    status.value = 'idle'
    error.value = null
    lastTxid.value = null
  }

  /**
   * Check if the wallet has enough balance for a given burn amount
   */
  function canAffordVote(burnAmountSats: bigint): boolean {
    const bal = BigInt(walletStore.balance?.total || '0')
    // Need burn + estimated mining fee (~500 sats)
    return bal >= burnAmountSats + 500n
  }

  return {
    // State
    status: readonly(status),
    error: readonly(error),
    lastTxid: readonly(lastTxid),
    // Actions
    castVote,
    reset,
    canAffordVote,
    // Constants
    BURN_PRESETS,
    MIN_BURN_SATS,
  }
}
