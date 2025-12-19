/**
 * Draft Transaction Store (Simplified)
 *
 * Manages the state of a draft transaction:
 * - Recipients (address, amount, sendMax)
 * - Fee rate
 * - Coin control (selected UTXOs)
 * - OP_RETURN data
 * - Locktime
 *
 * Transaction building logic is delegated to useTransactionBuilder composable.
 * This store is the single source of truth for transaction crafting state.
 */
import { defineStore } from 'pinia'
import { useWalletStore } from './wallet'
import { useNetworkStore } from './network'
import { useNotificationStore } from './notifications'
import { getBitcore, isBitcoreLoaded } from '~/plugins/bitcore.client'
import {
  broadcastTransaction,
  isChronikInitialized,
} from '~/plugins/02.chronik.client'
import {
  useTransactionBuilder,
  type UtxoEntry,
  type RecipientData,
  type OpReturnConfig,
  type LocktimeConfig,
  type TransactionBuildContext,
  type TransactionEstimate,
} from '~/composables/useTransactionBuilder'
import type * as BitcoreTypes from 'lotus-sdk/lib/bitcore'
import { DEFAULT_FEE_RATE, USE_CRYPTO_WORKER } from '~/utils/constants'

// ============================================================================
// Types
// ============================================================================

export interface DraftRecipient {
  id: string
  address: string
  amountSats: bigint
  sendMax: boolean
}

export interface DraftState {
  initialized: boolean
  recipients: DraftRecipient[]
  feeRate: number
  /** Selected UTXOs for coin control (empty = auto-select) */
  selectedUtxos: string[]
  opReturn: OpReturnConfig | null
  locktime: LocktimeConfig | null

  // Computed values (updated by _recalculate)
  estimatedFee: number
  availableBalance: bigint
  inputAmount: bigint
  outputAmount: bigint
  changeAmount: bigint
  maxSendable: bigint
  selectedUtxoCount: number
  totalUtxoCount: number
  computedUtxoOutpoints: string[]
  isValid: boolean
  validationError: string | null

  // Send state
  sending: boolean
  sendError: string | null
  lastTxid: string | null
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return crypto.randomUUID()
}

function createInitialState(): DraftState {
  return {
    initialized: false,
    recipients: [],
    feeRate: DEFAULT_FEE_RATE,
    selectedUtxos: [],
    opReturn: null,
    locktime: null,
    estimatedFee: 0,
    availableBalance: 0n,
    inputAmount: 0n,
    outputAmount: 0n,
    changeAmount: 0n,
    maxSendable: 0n,
    selectedUtxoCount: 0,
    totalUtxoCount: 0,
    computedUtxoOutpoints: [],
    isValid: false,
    validationError: null,
    sending: false,
    sendError: null,
    lastTxid: null,
  }
}

// ============================================================================
// Store
// ============================================================================

export const useDraftStore = defineStore('draft', {
  state: (): DraftState => createInitialState(),

  getters: {
    canSend(): boolean {
      return this.isValid && !this.sending && this.recipients.length > 0
    },

    recipientCount(): number {
      return this.recipients.length
    },

    isMultiSend(): boolean {
      return this.recipients.length > 1
    },
  },

  actions: {
    // ========================================================================
    // Initialization
    // ========================================================================

    initialize() {
      Object.assign(this, createInitialState())

      const walletStore = useWalletStore()
      const availableUtxos = this._getAvailableUtxos()
      const availableBalance = availableUtxos.reduce(
        (sum, utxo) => sum + BigInt(utxo.value),
        0n,
      )
      this.availableBalance = availableBalance
      this.totalUtxoCount = availableUtxos.length

      this.recipients = [
        {
          id: generateId(),
          address: '',
          amountSats: 0n,
          sendMax: false,
        },
      ]

      this.initialized = true
    },

    reset() {
      Object.assign(this, createInitialState())
    },

    // ========================================================================
    // Recipient Management
    // ========================================================================

    addRecipient(): string {
      const id = generateId()
      this.recipients.push({
        id,
        address: '',
        amountSats: 0n,
        sendMax: false,
      })
      this._recalculate()
      return id
    },

    removeRecipient(id: string) {
      const index = this.recipients.findIndex(r => r.id === id)
      if (index !== -1 && this.recipients.length > 1) {
        this.recipients.splice(index, 1)
        this._recalculate()
      }
    },

    updateRecipientAddress(id: string, address: string) {
      const recipient = this.recipients.find(r => r.id === id)
      if (recipient) {
        recipient.address = address
        this._recalculate()
      }
    },

    updateRecipientAmount(id: string, amountSats: bigint) {
      const recipient = this.recipients.find(r => r.id === id)
      if (recipient) {
        recipient.amountSats = amountSats
        recipient.sendMax = false
        this._recalculate()
      }
    },

    setRecipientSendMax(id: string, sendMax: boolean) {
      for (const recipient of this.recipients) {
        if (recipient.id !== id) {
          recipient.sendMax = false
        }
      }
      const recipient = this.recipients.find(r => r.id === id)
      if (recipient) {
        recipient.sendMax = sendMax
        if (sendMax) {
          recipient.amountSats = 0n
        }
        this._recalculate()
      }
    },

    clearRecipient(id: string) {
      const recipient = this.recipients.find(r => r.id === id)
      if (recipient) {
        recipient.address = ''
        recipient.amountSats = 0n
        recipient.sendMax = false
        this._recalculate()
      }
    },

    getRecipient(id: string): DraftRecipient | undefined {
      return this.recipients.find(r => r.id === id)
    },

    // ========================================================================
    // Options
    // ========================================================================

    setFeeRate(rate: number) {
      this.feeRate = Math.max(1, Math.floor(rate))
      this._recalculate()
    },

    setSelectedUtxos(utxos: string[]) {
      this.selectedUtxos = utxos
      this._recalculate()
    },

    setOpReturn(opReturn: OpReturnConfig | null) {
      this.opReturn = opReturn
      this._recalculate()
    },

    setLocktime(locktime: LocktimeConfig | null) {
      this.locktime = locktime
      this._recalculate()
    },

    // ========================================================================
    // Internal
    // ========================================================================

    _getAvailableUtxos(): UtxoEntry[] {
      const walletStore = useWalletStore()
      const spendable = walletStore.getSpendableUtxos()

      if (this.selectedUtxos.length > 0) {
        return spendable.filter(utxo =>
          this.selectedUtxos.includes(utxo.outpoint),
        )
      }

      return spendable
    },

    _buildContext(): TransactionBuildContext | null {
      const walletStore = useWalletStore()
      const Bitcore = getBitcore()

      // Use public API instead of private properties
      const txContext = walletStore.getTransactionBuildContext()
      if (!Bitcore || !txContext) return null

      const availableUtxos = this._getAvailableUtxos()

      return {
        availableUtxos,
        recipients: this.recipients.map(r => ({
          address: r.address,
          amountSats: r.amountSats,
          sendMax: r.sendMax,
        })),
        feeRate: this.feeRate,
        changeAddress: txContext.changeAddress,
        script: txContext.script,
        addressType: txContext.addressType,
        internalPubKey: txContext.internalPubKey,
        merkleRoot: txContext.merkleRoot,
        opReturn: this.opReturn,
        locktime: this.locktime,
        selectedUtxoOutpoints:
          this.selectedUtxos.length > 0 ? this.selectedUtxos : undefined,
      }
    },

    _recalculate() {
      const walletStore = useWalletStore()
      const networkStore = useNetworkStore()
      const builder = useTransactionBuilder()

      // Reset validation
      this.isValid = false
      this.validationError = null

      const ctx = this._buildContext()
      if (!ctx) {
        this.validationError = 'Loading wallet...'
        return
      }

      // Get available balance
      const availableUtxos = this._getAvailableUtxos()
      this.availableBalance = availableUtxos.reduce(
        (sum, utxo) => sum + BigInt(utxo.value),
        0n,
      )
      this.totalUtxoCount = availableUtxos.length

      if (availableUtxos.length === 0) {
        if (walletStore.initialized) {
          this.validationError = 'No spendable UTXOs available'
        } else {
          this.validationError = 'Loading balance...'
        }
        this.maxSendable = 0n
        this.outputAmount = 0n
        this.estimatedFee = 0
        this.changeAmount = 0n
        this.inputAmount = 0n
        this.selectedUtxoCount = 0
        this.computedUtxoOutpoints = []
        return
      }

      // Estimate transaction
      const estimate = builder.estimateTransaction(
        ctx,
        networkStore.currentNetwork,
      )

      // Update state from estimate
      this.inputAmount = estimate.inputAmount
      this.outputAmount = estimate.outputAmount
      this.estimatedFee = estimate.estimatedFee
      this.changeAmount = estimate.changeAmount
      this.maxSendable = estimate.maxSendable
      this.selectedUtxoCount = estimate.selectedUtxos.length
      this.computedUtxoOutpoints = estimate.selectedUtxos.map(u => u.outpoint)
      this.isValid = estimate.valid
      this.validationError = estimate.error
    },

    // ========================================================================
    // Sending
    // ========================================================================

    async send(): Promise<string> {
      const walletStore = useWalletStore()
      //const notificationStore = useNotificationStore()
      const builder = useTransactionBuilder()
      const Bitcore = getBitcore()

      if (
        !isChronikInitialized() ||
        !walletStore.isReadyForSigning() ||
        !Bitcore
      ) {
        throw new Error('Wallet not initialized')
      }

      if (!this.isValid) {
        throw new Error(this.validationError || 'Transaction is not valid')
      }

      this.sending = true
      this.sendError = null

      try {
        // Get UTXOs for this transaction
        const utxosToUse: UtxoEntry[] = this.computedUtxoOutpoints
          .map(outpoint => {
            const utxo = walletStore.utxos.get(outpoint)
            return utxo
              ? {
                  outpoint,
                  value: utxo.value,
                  height: utxo.height,
                  isCoinbase: utxo.isCoinbase,
                }
              : null
          })
          .filter((entry): entry is UtxoEntry => entry !== null)

        if (utxosToUse.length === 0) {
          throw new Error('No UTXOs selected for transaction')
        }

        // Build context and transaction
        const ctx = this._buildContext()
        if (!ctx) {
          throw new Error('Failed to build transaction context')
        }

        const tx = builder.buildTransaction(ctx, utxosToUse, this.maxSendable)
        if (!tx) {
          throw new Error('Failed to build transaction')
        }

        // Apply locktime
        builder.applyLocktime(tx, this.locktime)

        // Capture details for history
        const totalOutputAmount = this.outputAmount
        const primaryRecipient = this.recipients.find(
          r => r.address && r.address !== walletStore.address,
        )

        // Sign the transaction
        let signedTxHex: string

        if (USE_CRYPTO_WORKER && typeof Worker !== 'undefined') {
          const { signTransaction } = useCryptoWorker()
          const privateKeyHex = walletStore.getPrivateKeyHex()
          if (!privateKeyHex) throw new Error('Private key not available')

          // Build UTXO data for worker to reconstruct input.output
          const scriptHex = walletStore.getScriptHex()
          if (!scriptHex) throw new Error('Script not available')

          const utxosForSigning = utxosToUse.map(utxo => ({
            outpoint: utxo.outpoint,
            satoshis: Number(utxo.value),
            scriptHex,
          }))

          const signResult = await signTransaction(
            tx.toBuffer().toString('hex'),
            utxosForSigning,
            privateKeyHex,
            walletStore.addressType,
            walletStore.getInternalPubKeyString() ?? undefined,
            walletStore.getMerkleRootHex() ?? undefined,
          )
          signedTxHex = signResult.signedTxHex
        } else {
          signedTxHex = walletStore.signTransactionHex(tx)
        }

        // Broadcast
        const result = await broadcastTransaction(signedTxHex)

        // Update wallet state
        for (const input of tx.inputs) {
          const outpoint = `${input.prevTxId.toString('hex')}_${
            input.outputIndex
          }`
          walletStore.utxos.delete(outpoint)
        }

        const newHistoryItem = {
          txid: result.txid,
          timestamp: Math.floor(Date.now() / 1000).toString(),
          blockHeight: -1,
          isSend: true,
          amount: totalOutputAmount.toString(),
          address: primaryRecipient?.address || '',
          confirmations: 0,
        }
        walletStore.transactionHistory.unshift(newHistoryItem)

        walletStore.recalculateBalance()
        await walletStore.saveWalletState()

        this.lastTxid = result.txid
        this.initialize()

        return result.txid
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Transaction failed'
        this.sendError = message
        throw error
      } finally {
        this.sending = false
      }
    },
  },
})
