/**
 * Draft Transaction Store
 *
 * Simplified store for managing draft transactions in the new SendModal flow.
 * Designed for single-recipient transactions with optional advanced features.
 *
 * Primary API (for SendModal):
 * - setAddress(address) - Set recipient address
 * - setAmount(sats) - Set amount in satoshis
 * - setSendMax(enabled) - Enable/disable send max
 * - send() - Build, sign, and broadcast transaction
 * - reset() - Clear draft state
 *
 * Advanced API (for power users):
 * - setFeeRate(rate) - Custom fee rate
 * - setSelectedUtxos(outpoints) - Coin control
 * - setOpReturn(config) - OP_RETURN data
 * - setLocktime(config) - Locktime
 */
import { defineStore } from 'pinia'

// ============================================================================
// Types
// ============================================================================

export interface DraftState {
  // Core transaction data
  address: string
  amountSats: bigint
  sendMax: boolean

  // Advanced options
  feeRate: number
  selectedUtxos: string[]
  opReturn: OpReturnConfig | null
  locktime: LocktimeConfig | null

  // Computed values (updated by recalculate)
  estimatedFee: number
  availableBalance: bigint
  maxSendable: bigint
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

function createInitialState(): DraftState {
  return {
    address: '',
    amountSats: 0n,
    sendMax: false,
    feeRate: DEFAULT_FEE_RATE,
    selectedUtxos: [],
    opReturn: null,
    locktime: null,
    estimatedFee: 0,
    availableBalance: 0n,
    maxSendable: 0n,
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

export const useDraftStore = defineStore('draft', () => {
  const { $bitcore, $chronik } = useNuxtApp()
  // === STATE ===
  const address = ref('')
  const amountSats = ref(0n)
  const sendMax = ref(false)
  const feeRate = ref(DEFAULT_FEE_RATE)
  const selectedUtxos = ref<string[]>([])
  const opReturn = ref<OpReturnConfig | null>(null)
  const locktime = ref<LocktimeConfig | null>(null)
  const estimatedFee = ref(0)
  const availableBalance = ref(0n)
  const maxSendable = ref(0n)
  const isValid = ref(false)
  const validationError = ref<string | null>(null)
  const sending = ref(false)
  const sendError = ref<string | null>(null)
  const lastTxid = ref<string | null>(null)

  // === GETTERS ===
  const canSend = computed(() => isValid.value && !sending.value)
  const hasAddress = computed(() => address.value.length > 0)
  const hasAmount = computed(() => amountSats.value > 0n || sendMax.value)

  // === INTERNAL HELPERS ===
  function _getAvailableUtxos(): UtxoEntry[] {
    const walletStore = useWalletStore()
    const spendable = walletStore.getSpendableUtxos()

    if (selectedUtxos.value.length > 0) {
      return spendable.filter(utxo =>
        selectedUtxos.value.includes(utxo.outpoint),
      )
    }

    return spendable
  }

  function _buildContext(): TransactionBuildContext | null {
    const walletStore = useWalletStore()

    const txContext = walletStore.getTransactionBuildContext()
    if (!$bitcore || !txContext) return null

    const availableUtxosList = _getAvailableUtxos()

    // Build single recipient for transaction builder
    const recipients = [
      {
        address: address.value,
        amountSats: amountSats.value,
        sendMax: sendMax.value,
      },
    ]

    return {
      availableUtxos: availableUtxosList,
      recipients,
      feeRate: feeRate.value,
      changeAddress: txContext.changeAddress,
      script: txContext.script,
      addressType: txContext.addressType,
      internalPubKey: txContext.internalPubKey,
      merkleRoot: txContext.merkleRoot,
      opReturn: opReturn.value,
      locktime: locktime.value,
      selectedUtxoOutpoints:
        selectedUtxos.value.length > 0 ? selectedUtxos.value : undefined,
    }
  }

  function _recalculate() {
    const walletStore = useWalletStore()
    const networkStore = useNetworkStore()
    const builder = useTransactionBuilder()

    // Reset validation
    isValid.value = false
    validationError.value = null

    // Get available balance
    const availableUtxosList = _getAvailableUtxos()
    availableBalance.value = availableUtxosList.reduce(
      (sum, utxo) => sum + BigInt(utxo.value),
      0n,
    )

    if (availableUtxosList.length === 0) {
      if (walletStore.initialized) {
        validationError.value = 'No spendable UTXOs available'
      } else {
        validationError.value = 'Loading balance...'
      }
      maxSendable.value = 0n
      estimatedFee.value = 0
      return
    }

    const ctx = _buildContext()
    if (!ctx) {
      validationError.value = 'Loading wallet...'
      return
    }

    // Estimate transaction
    const estimate = builder.estimateTransaction(
      ctx,
      networkStore.currentNetwork,
    )

    // Update state from estimate
    estimatedFee.value = estimate.estimatedFee
    maxSendable.value = estimate.maxSendable
    isValid.value = estimate.valid
    validationError.value = estimate.error
  }

  // === ACTIONS ===
  // ========================================================================
  // Primary API
  // ========================================================================

  /**
   * Set the recipient address and recalculate.
   */
  function setAddress(newAddress: string) {
    address.value = newAddress
    _recalculate()
  }

  /**
   * Set the amount in satoshis and recalculate.
   * Automatically disables sendMax.
   */
  function setAmount(newAmountSats: bigint) {
    amountSats.value = newAmountSats
    sendMax.value = false
    _recalculate()
  }

  /**
   * Enable or disable send max mode.
   * When enabled, the amount will be calculated to send all available balance.
   */
  function setSendMax(enabled: boolean) {
    sendMax.value = enabled
    if (enabled) {
      amountSats.value = 0n
    }
    _recalculate()
  }

  /**
   * Reset the draft to initial state.
   */
  function reset() {
    address.value = ''
    amountSats.value = 0n
    sendMax.value = false
    feeRate.value = DEFAULT_FEE_RATE
    selectedUtxos.value = []
    opReturn.value = null
    locktime.value = null
    estimatedFee.value = 0
    availableBalance.value = 0n
    maxSendable.value = 0n
    isValid.value = false
    validationError.value = null
    sending.value = false
    sendError.value = null
    lastTxid.value = null
  }

  // ========================================================================
  // Advanced API
  // ========================================================================

  /**
   * Set custom fee rate (sat/byte).
   */
  function setFeeRate(rate: number) {
    feeRate.value = Math.max(1, Math.floor(rate))
    _recalculate()
  }

  /**
   * Set selected UTXOs for coin control.
   * Pass empty array to disable coin control (auto-select).
   */
  function setSelectedUtxos(outpoints: string[]) {
    selectedUtxos.value = outpoints
    _recalculate()
  }

  /**
   * Set OP_RETURN data configuration.
   */
  function setOpReturn(config: OpReturnConfig | null) {
    opReturn.value = config
    _recalculate()
  }

  /**
   * Set locktime configuration.
   */
  function setLocktime(config: LocktimeConfig | null) {
    locktime.value = config
    _recalculate()
  }

  // ========================================================================
  // Send
  // ========================================================================

  async function send(): Promise<string> {
    const walletStore = useWalletStore()
    const networkStore = useNetworkStore()
    const builder = useTransactionBuilder()

    if (
      !$chronik.isInitialized() ||
      !walletStore.isReadyForSigning() ||
      !$bitcore
    ) {
      throw new Error('Wallet not initialized')
    }

    if (!isValid.value) {
      throw new Error(validationError.value || 'Transaction is not valid')
    }

    sending.value = true
    sendError.value = null

    try {
      const ctx = _buildContext()
      if (!ctx) {
        throw new Error('Failed to build transaction context')
      }

      // Estimate to get selected UTXOs
      const estimate = builder.estimateTransaction(
        ctx,
        networkStore.currentNetwork,
      )

      if (!estimate.valid) {
        throw new Error(estimate.error || 'Transaction estimation failed')
      }

      // Get UTXOs for this transaction
      const utxosToUse: UtxoEntry[] = estimate.selectedUtxos
        .map(utxo => {
          const walletUtxo = walletStore.utxos.get(utxo.outpoint)
          return walletUtxo
            ? {
                outpoint: utxo.outpoint,
                value: walletUtxo.value,
                blockHeight: walletUtxo.blockHeight,
                isCoinbase: walletUtxo.isCoinbase,
              }
            : null
        })
        .filter((entry): entry is UtxoEntry => entry !== null)

      if (utxosToUse.length === 0) {
        throw new Error('No UTXOs selected for transaction')
      }

      // Build transaction
      const tx = builder.buildTransaction(ctx, utxosToUse, estimate.maxSendable)
      if (!tx) {
        throw new Error('Failed to build transaction')
      }

      // Apply locktime if configured
      if (locktime.value) {
        builder.applyLocktime(tx, locktime.value)
      }

      // Capture details for history
      const totalOutputAmount = sendMax.value
        ? estimate.maxSendable
        : amountSats.value

      // Sign the transaction
      let signedTxHex: string

      // If enabled, crypto worker is initialized in app.vue before wallet store
      if (USE_CRYPTO_WORKER) {
        const { $cryptoWorker } = useNuxtApp()
        console.log('Signing transaction via crypto worker')
        const privateKeyHex = walletStore.getPrivateKeyHex()
        if (!privateKeyHex) throw new Error('Private key not available')

        const scriptHex = walletStore.getScriptHex()
        if (!scriptHex) throw new Error('Script not available')

        const utxosForSigning = utxosToUse.map(utxo => ({
          outpoint: utxo.outpoint,
          satoshis: Number(utxo.value),
          scriptHex,
        }))

        const signResult = await $cryptoWorker.signTransaction(
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
      const result = await $chronik.broadcastTransaction(signedTxHex)

      // Update wallet state - remove spent UTXOs
      for (const input of tx.inputs) {
        const outpoint = `${input.prevTxId.toString('hex')}_${
          input.outputIndex
        }`
        walletStore.utxos.delete(outpoint)
      }

      // Add to transaction history
      const newHistoryItem = {
        txid: result.txid,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        blockHeight: -1,
        isSend: true,
        amount: totalOutputAmount.toString(),
        address: address.value,
        confirmations: 0,
      }
      walletStore.transactionHistory.unshift(newHistoryItem)

      walletStore.recalculateBalance()
      await walletStore.saveWalletState()

      lastTxid.value = result.txid

      return result.txid
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Transaction failed'
      sendError.value = message
      throw error
    } finally {
      sending.value = false
    }
  }

  // === RETURN ===
  return {
    // State
    address,
    amountSats,
    sendMax,
    feeRate,
    selectedUtxos,
    opReturn,
    locktime,
    estimatedFee,
    availableBalance,
    maxSendable,
    isValid,
    validationError,
    sending,
    sendError,
    lastTxid,
    // Getters
    canSend,
    hasAddress,
    hasAmount,
    // Actions
    setAddress,
    setAmount,
    setSendMax,
    reset,
    setFeeRate,
    setSelectedUtxos,
    setOpReturn,
    setLocktime,
    send,
  }
})
