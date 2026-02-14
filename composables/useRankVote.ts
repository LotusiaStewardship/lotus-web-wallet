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
  // Bitcore and crypto WebWorker plugin instance
  const { $bitcore, $cryptoWorker } = useNuxtApp()
  const walletStore = useWalletStore()
  const { broadcastTransaction } = useChronikClient()
  const { addInputsToTransaction } = useTransactionBuilder()
  const { Script, Transaction } = $bitcore

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
      const rankScriptBuffer = toScriptRANK(
        sentiment,
        platform,
        profileId,
        postId,
      )
      const rankScript = Script.fromBuffer(rankScriptBuffer)

      // --- Get wallet context ---
      const txContext = walletStore.getTransactionBuildContext()
      if (!txContext) {
        throw new Error('Could not get transaction build context')
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
      const tx = new Transaction()
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

      // Add RANK output with burn amount
      // This is a PAID OP_RETURN output - the satoshis are burned
      tx.addOutput(
        new $bitcore.Output({
          satoshis: burnAmountSats,
          script: rankScript,
        }),
      )

      // Set change address for remaining sats
      tx.change(txContext.changeAddress)

      // --- Sign ---
      status.value = 'signing'
      const unsignedHex = tx.toString()

      // Prepare UTXO data for crypto worker
      const scriptHex = walletStore.getScriptHex()
      if (!scriptHex) {
        throw new Error('Script hex not available')
      }

      const utxosForSigning = selectedUtxos.map(utxo => ({
        outpoint: utxo.outpoint,
        satoshis: Number(utxo.value),
        scriptHex,
      }))

      // Get private key from wallet
      const privateKey = walletStore.getPrivateKeyHex()
      if (!privateKey) {
        throw new Error('Private key not available')
      }

      const { signedTxHex } = await $cryptoWorker.signTransaction(
        unsignedHex,
        utxosForSigning,
        privateKey,
        txContext.addressType,
        txContext.internalPubKey?.toString(),
        txContext.merkleRoot?.toString('hex'),
      )

      // --- Broadcast ---
      status.value = 'broadcasting'
      const result = await broadcastTransaction(signedTxHex)
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
