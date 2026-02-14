/**
 * RNKC Comment Composable
 *
 * Encapsulates the full comment posting flow:
 *   User writes comment → toScriptRNKC() → build tx → sign → broadcast via Chronik
 *
 * RNKC transactions have multiple OP_RETURN outputs:
 *   - Output 0: RNKC header (LOKAD prefix + platform + profileId + [postId])
 *   - Output 1: Comment data (up to 220 bytes)
 *   - Output 2: Overflow comment data (if >220 bytes, up to 440 total)
 *
 * Dependencies:
 *   - xpi-ts/lib/rank: toScriptRNKC(), ScriptChunkPlatformUTF8
 *   - xpi-ts/utils/constants: RNKC_MIN_FEE_RATE, MAX_OP_RETURN_DATA
 *   - Chronik client (via plugin)
 */

import {
  toScriptRNKC,
  type ScriptChunkPlatformUTF8,
} from 'xpi-ts/lib/rank'
import { RNKC_MIN_FEE_RATE, MAX_OP_RETURN_DATA } from 'xpi-ts/utils/constants'
import { useWalletStore } from '~/stores/wallet'

// ============================================================================
// Types
// ============================================================================

export interface CommentParams {
  /** Platform identifier (e.g. 'twitter') */
  platform: ScriptChunkPlatformUTF8
  /** Profile ID on the platform */
  profileId: string
  /** Optional post ID for post-level comments */
  postId?: string
  /** Comment text (UTF-8) */
  content: string
  /** Burn amount in satoshis */
  burnAmountSats: bigint
}

export interface CommentResult {
  /** Whether the comment was successfully broadcast */
  success: boolean
  /** Transaction ID if successful */
  txid?: string
  /** Error message if failed */
  error?: string
}

export type CommentStatus =
  | 'idle'
  | 'building'
  | 'signing'
  | 'broadcasting'
  | 'success'
  | 'error'

// ============================================================================
// Constants
// ============================================================================

/** Maximum comment length in bytes (2 OP_RETURN outputs × 220 bytes each) */
const MAX_COMMENT_BYTES = MAX_OP_RETURN_DATA * 2

/** Minimum fee rate per byte of comment data (from xpi-ts constants) */
const MIN_FEE_RATE_PER_BYTE = BigInt(RNKC_MIN_FEE_RATE)

/** Burn presets for comments — higher than votes since burn must cover fee rate × comment length */
export const COMMENT_BURN_PRESETS = [
  { label: '100', sats: 100_000000n },
  { label: '500', sats: 500_000000n },
  { label: '1K', sats: 1_000_000000n },
  { label: '5K', sats: 5_000_000000n },
]

// ============================================================================
// Composable
// ============================================================================

export function useRnkcComment() {
  const walletStore = useWalletStore()
  const { broadcastTransaction } = useChronikClient()
  const { addInputsToTransaction } = useTransactionBuilder()

  const status = ref<CommentStatus>('idle')
  const error = ref<string | null>(null)
  const lastTxid = ref<string | null>(null)

  /**
   * Calculate the minimum burn required for a given comment length.
   * RNKC requires: burnedSats >= RNKC_MIN_FEE_RATE × commentLengthInBytes
   */
  function getMinBurnForComment(content: string): bigint {
    const byteLength = BigInt(new TextEncoder().encode(content).length)
    return MIN_FEE_RATE_PER_BYTE * byteLength
  }

  /**
   * Validate comment content before building the transaction.
   */
  function validateComment(content: string): string | null {
    if (!content || content.trim().length === 0) {
      return 'Comment cannot be empty'
    }
    const byteLength = new TextEncoder().encode(content).length
    if (byteLength > MAX_COMMENT_BYTES) {
      return `Comment too long (${byteLength}/${MAX_COMMENT_BYTES} bytes)`
    }
    return null
  }

  /**
   * Get the byte length of a comment string.
   */
  function getCommentByteLength(content: string): number {
    return new TextEncoder().encode(content).length
  }

  /**
   * Post an RNKC comment by building, signing, and broadcasting a transaction.
   *
   * The transaction structure:
   *   - Input(s): wallet UTXOs covering burn + mining fee
   *   - Output 0: OP_RETURN with RNKC header script
   *   - Output 1: OP_RETURN with comment data (first 220 bytes)
   *   - Output 2 (optional): OP_RETURN with overflow comment data
   *   - Output N (change): remaining sats back to wallet
   *
   * The burn amount = total input - change - mining fee.
   */
  async function postComment(params: CommentParams): Promise<CommentResult> {
    const { platform, profileId, postId, content, burnAmountSats } = params

    // Reset state
    status.value = 'building'
    error.value = null
    lastTxid.value = null

    try {
      // --- Validation ---
      if (!walletStore.isReadyForSigning()) {
        throw new Error('Wallet not initialized')
      }

      const validationError = validateComment(content)
      if (validationError) {
        throw new Error(validationError)
      }

      if (!profileId) {
        throw new Error('Profile ID is required')
      }

      const minBurn = getMinBurnForComment(content)
      if (burnAmountSats < minBurn) {
        throw new Error(
          `Burn amount must be at least ${minBurn} sats for this comment length`,
        )
      }

      // --- Build RNKC OP_RETURN scripts ---
      const rnkcScripts = toScriptRNKC({
        platform,
        profileId,
        postId,
        comment: content,
      })

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

      // Select enough UTXOs to cover burn + estimated mining fee (~1000 sats buffer for multi-output tx)
      for (const utxo of sortedUtxos) {
        selectedUtxos.push(utxo)
        inputTotal += BigInt(utxo.value)
        if (inputTotal >= burnAmountSats + 1000n) break
      }

      if (inputTotal < burnAmountSats + 500n) {
        throw new Error('Insufficient balance for this comment')
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

      // Add all OP_RETURN outputs (header + comment data outputs)
      for (const scriptBuf of rnkcScripts) {
        tx.addData(scriptBuf)
      }

      // Set change address for remaining sats
      tx.change(txContext.changeAddress)

      // Set fee = burn + mining fee
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
      const message = err?.message || 'Unknown error posting comment'
      error.value = message
      console.error('[useRnkcComment] postComment failed:', err)
      return { success: false, error: message }
    }
  }

  /**
   * Reset comment state back to idle
   */
  function reset() {
    status.value = 'idle'
    error.value = null
    lastTxid.value = null
  }

  /**
   * Check if the wallet has enough balance for a given burn amount
   */
  function canAffordComment(burnAmountSats: bigint): boolean {
    const bal = BigInt(walletStore.balance?.total || '0')
    // Need burn + estimated mining fee (~1000 sats for multi-output)
    return bal >= burnAmountSats + 1000n
  }

  return {
    // State
    status: readonly(status),
    error: readonly(error),
    lastTxid: readonly(lastTxid),
    // Actions
    postComment,
    reset,
    canAffordComment,
    validateComment,
    getMinBurnForComment,
    getCommentByteLength,
    // Constants
    COMMENT_BURN_PRESETS,
    MAX_COMMENT_BYTES,
  }
}
