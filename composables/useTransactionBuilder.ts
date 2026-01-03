/**
 * useTransactionBuilder - Transaction building composable
 *
 * Extracts transaction building logic from the draft store to provide:
 * - UTXO selection (largest-first algorithm)
 * - Fee estimation using Bitcore's actual transaction building
 * - Transaction construction with proper Taproot/P2PKH support
 * - OP_RETURN data handling
 *
 * This composable is stateless - it operates on provided inputs and returns results.
 * State management remains in the draft store.
 */
import type * as BitcoreTypes from 'xpi-ts/lib/bitcore'
import { DUST_THRESHOLD, MAX_TX_SIZE, MAX_RECIPIENTS } from '~/utils/constants'

// ============================================================================
// Types
// ============================================================================

export interface UtxoEntry {
  outpoint: string
  value: string
  height: number
  isCoinbase: boolean
}

export interface RecipientData {
  address: string
  amountSats: bigint
  sendMax: boolean
}

export interface OpReturnConfig {
  data: string
  encoding: 'utf8' | 'hex'
}

export interface LocktimeConfig {
  type: 'block' | 'time'
  value: number
}

export interface TransactionBuildContext {
  /** Available UTXOs to select from */
  availableUtxos: UtxoEntry[]
  /** Recipients with addresses and amounts */
  recipients: RecipientData[]
  /** Fee rate in sat/byte */
  feeRate: number
  /** Change address */
  changeAddress: string
  /** Script for inputs */
  script: InstanceType<typeof BitcoreTypes.Script>
  /** Address type for signing */
  addressType: AddressType
  /** Internal public key for Taproot (optional) */
  internalPubKey?: InstanceType<typeof BitcoreTypes.PublicKey>
  /** Merkle root for Taproot (optional) */
  merkleRoot?: Buffer
  /** OP_RETURN configuration (optional) */
  opReturn?: OpReturnConfig | null
  /** Locktime configuration (optional) */
  locktime?: LocktimeConfig | null
  /** Manually selected UTXOs for coin control (optional) */
  selectedUtxoOutpoints?: string[]
}

export interface UtxoSelectionResult {
  selectedUtxos: UtxoEntry[]
  fee: number
}

export interface TransactionEstimate {
  /** Whether the transaction can be built */
  valid: boolean
  /** Validation error if not valid */
  error: string | null
  /** Selected UTXOs for this transaction */
  selectedUtxos: UtxoEntry[]
  /** Total input amount in satoshis */
  inputAmount: bigint
  /** Total output amount (excluding change) in satoshis */
  outputAmount: bigint
  /** Estimated fee in satoshis */
  estimatedFee: number
  /** Change amount in satoshis */
  changeAmount: bigint
  /** Max sendable for sendMax recipient */
  maxSendable: bigint
}

export interface BuiltTransaction {
  transaction: InstanceType<typeof BitcoreTypes.Transaction>
  inputAmount: bigint
  outputAmount: bigint
  fee: number
}

// ============================================================================
// Composable
// ============================================================================

export function useTransactionBuilder() {
  /**
   * Get the Bitcore SDK instance
   */
  function getBitcoreSDK(): typeof BitcoreTypes | undefined {
    return useNuxtApp()?.$bitcore
  }

  /**
   * Parse OP_RETURN data from configuration.
   * Returns null if no OP_RETURN or if data is invalid.
   */
  function parseOpReturnData(opReturn: OpReturnConfig | null | undefined): {
    buffer: Buffer | null
    error: string | null
  } {
    if (!opReturn?.data) return { buffer: null, error: null }

    if (opReturn.encoding === 'hex') {
      if (!/^[0-9a-fA-F]*$/.test(opReturn.data)) {
        return { buffer: null, error: 'Invalid hex data for OP_RETURN' }
      }
      if (opReturn.data.length % 2 !== 0) {
        return { buffer: null, error: 'Hex data must have even length' }
      }
      const buffer = Buffer.from(opReturn.data, 'hex')
      if (buffer.length > 220) {
        return { buffer: null, error: 'OP_RETURN data exceeds 220 bytes' }
      }
      return { buffer, error: null }
    }

    const buffer = Buffer.from(opReturn.data, 'utf8')
    if (buffer.length > 220) {
      return { buffer: null, error: 'OP_RETURN data exceeds 220 bytes' }
    }
    return { buffer, error: null }
  }

  /**
   * Add inputs to a transaction with proper Taproot metadata if applicable.
   */
  function addInputsToTransaction(
    tx: InstanceType<typeof BitcoreTypes.Transaction>,
    utxos: UtxoEntry[],
    script: InstanceType<typeof BitcoreTypes.Script>,
    addressType: AddressType,
    internalPubKey?: InstanceType<typeof BitcoreTypes.PublicKey>,
    merkleRoot?: Buffer,
  ): void {
    const Bitcore = getBitcoreSDK()
    if (!Bitcore) return

    for (const utxo of utxos) {
      const [txid, outIdx] = utxo.outpoint.split('_')
      const utxoData: BitcoreTypes.UnspentOutputData = {
        txid,
        outputIndex: Number(outIdx),
        script,
        satoshis: Number(utxo.value),
      }
      if (addressType === 'p2tr-commitment') {
        utxoData.internalPubKey = internalPubKey
        utxoData.merkleRoot = merkleRoot
      }
      tx.from(utxoData)
    }
  }

  /**
   * Select UTXOs to meet a target amount using largest-first selection.
   * Uses Bitcore's built-in fee calculation by building actual transactions.
   */
  function selectUtxosForAmount(
    ctx: TransactionBuildContext,
    targetAmount: bigint,
    validRecipients: Array<{ address: string; amountSats: bigint }>,
    opReturnBuffer: Buffer | null,
  ): UtxoSelectionResult | null {
    const {
      availableUtxos,
      feeRate,
      changeAddress,
      script,
      addressType,
      internalPubKey,
      merkleRoot,
    } = ctx

    if (availableUtxos.length === 0) return null

    const Bitcore = getBitcoreSDK()
    if (!Bitcore || !script) return null

    const Transaction = Bitcore.Transaction
    const normalizedFeeRate = Math.max(1, Math.floor(feeRate))

    if (validRecipients.length + 1 > MAX_RECIPIENTS) {
      return null
    }

    const sortedUtxos = [...availableUtxos].sort((a, b) =>
      Number(BigInt(b.value) - BigInt(a.value)),
    )

    const selectedUtxos: UtxoEntry[] = []
    let inputTotal = 0n

    for (const utxo of sortedUtxos) {
      selectedUtxos.push(utxo)
      inputTotal += BigInt(utxo.value)

      const testTx = new Transaction()
      testTx.feePerByte(normalizedFeeRate)
      testTx.change(changeAddress)

      addInputsToTransaction(
        testTx,
        selectedUtxos,
        script,
        addressType,
        internalPubKey,
        merkleRoot,
      )

      for (const recipient of validRecipients) {
        testTx.to(recipient.address, Number(recipient.amountSats))
      }

      if (opReturnBuffer) {
        testTx.addData(opReturnBuffer)
      }

      const estimatedFee = testTx.getFee()

      const txSize = testTx.toBuffer().length
      if (txSize > MAX_TX_SIZE) {
        if (selectedUtxos.length > 1) {
          selectedUtxos.pop()
          inputTotal -= BigInt(utxo.value)

          const reducedTx = new Transaction()
          reducedTx.feePerByte(normalizedFeeRate)
          reducedTx.change(changeAddress)
          addInputsToTransaction(
            reducedTx,
            selectedUtxos,
            script,
            addressType,
            internalPubKey,
            merkleRoot,
          )
          for (const recipient of validRecipients) {
            reducedTx.to(recipient.address, Number(recipient.amountSats))
          }
          if (opReturnBuffer) {
            reducedTx.addData(opReturnBuffer)
          }

          const reducedFee = reducedTx.getFee()
          if (inputTotal >= targetAmount + BigInt(reducedFee)) {
            return { selectedUtxos, fee: reducedFee }
          }
        }
        return null
      }

      const totalNeeded = targetAmount + BigInt(estimatedFee)
      if (inputTotal >= totalNeeded) {
        return { selectedUtxos, fee: estimatedFee }
      }
    }

    if (selectedUtxos.length > 0) {
      const finalTx = new Transaction()
      finalTx.feePerByte(normalizedFeeRate)
      finalTx.change(changeAddress)
      addInputsToTransaction(
        finalTx,
        selectedUtxos,
        script,
        addressType,
        internalPubKey,
        merkleRoot,
      )
      for (const recipient of validRecipients) {
        finalTx.to(recipient.address, Number(recipient.amountSats))
      }
      if (opReturnBuffer) {
        finalTx.addData(opReturnBuffer)
      }

      const finalFee = finalTx.getFee()
      if (inputTotal >= targetAmount + BigInt(finalFee)) {
        return { selectedUtxos, fee: finalFee }
      }
    }

    return null
  }

  /**
   * Calculate the fee for a sendMax transaction (no change output).
   */
  function calculateSendMaxFee(
    ctx: TransactionBuildContext,
    sendMaxAddress: string,
    regularOutputTotal: bigint,
    regularRecipients: RecipientData[],
    opReturnBuffer: Buffer | null,
  ): number | null {
    const {
      availableUtxos,
      feeRate,
      changeAddress,
      script,
      addressType,
      internalPubKey,
      merkleRoot,
    } = ctx

    const Bitcore = getBitcoreSDK()
    if (!Bitcore || !script) return null

    const Address = Bitcore.Address
    const Transaction = Bitcore.Transaction

    const inputAmount = availableUtxos.reduce(
      (sum, utxo) => sum + BigInt(utxo.value),
      0n,
    )
    const normalizedFeeRate = Math.max(1, Math.floor(feeRate))

    const regularOutputCount = regularRecipients.filter(
      r => r.address && Address.isValid(r.address) && r.amountSats > 0n,
    ).length
    const totalOutputCount = regularOutputCount + 1

    if (totalOutputCount > MAX_RECIPIENTS) {
      return null
    }

    const tx = new Transaction()
    tx.feePerByte(normalizedFeeRate)
    tx.change(changeAddress)

    addInputsToTransaction(
      tx,
      availableUtxos,
      script,
      addressType,
      internalPubKey,
      merkleRoot,
    )

    for (const recipient of regularRecipients) {
      if (
        recipient.address &&
        Address.isValid(recipient.address) &&
        recipient.amountSats > 0n
      ) {
        tx.to(recipient.address, Number(recipient.amountSats))
      }
    }

    const preliminaryMax = inputAmount - regularOutputTotal
    if (preliminaryMax > DUST_THRESHOLD) {
      tx.to(sendMaxAddress, Number(preliminaryMax))
    }

    if (opReturnBuffer) {
      tx.addData(opReturnBuffer)
    }

    const txSize = tx.toBuffer().length
    if (txSize > MAX_TX_SIZE) {
      return null
    }

    return tx.getFee()
  }

  /**
   * Estimate a transaction from the given context.
   * Returns validation status, selected UTXOs, amounts, and fees.
   */
  function estimateTransaction(
    ctx: TransactionBuildContext,
    currentNetwork: BitcoreTypes.NetworkName,
  ): TransactionEstimate {
    const Bitcore = getBitcoreSDK()

    const result: TransactionEstimate = {
      valid: false,
      error: null,
      selectedUtxos: [],
      inputAmount: 0n,
      outputAmount: 0n,
      estimatedFee: 0,
      changeAmount: 0n,
      maxSendable: 0n,
    }

    if (!Bitcore || !ctx.script) {
      result.error = 'Loading wallet...'
      return result
    }

    const Address = Bitcore.Address
    const { availableUtxos, recipients, selectedUtxoOutpoints } = ctx

    const availableBalance = availableUtxos.reduce(
      (sum, utxo) => sum + BigInt(utxo.value),
      0n,
    )

    if (availableUtxos.length === 0) {
      result.error = 'No spendable UTXOs available'
      return result
    }

    const sendMaxRecipient = recipients.find(r => r.sendMax)
    const regularRecipients = recipients.filter(r => !r.sendMax)

    let regularOutputTotal = 0n
    let hasInvalidAddress = false
    let hasNetworkMismatch = false
    let invalidAddressError = ''
    let validOutputCount = 0

    for (const recipient of regularRecipients) {
      if (!recipient.address) continue
      if (!Address.isValid(recipient.address)) {
        hasInvalidAddress = true
        invalidAddressError = `Invalid address: ${recipient.address}`
        continue
      }
      if (!Address.isValid(recipient.address, currentNetwork)) {
        hasNetworkMismatch = true
        invalidAddressError = `Address is for wrong network: ${recipient.address}`
        continue
      }
      if (recipient.amountSats > 0n) {
        regularOutputTotal += recipient.amountSats
        validOutputCount++
      }
    }

    if (sendMaxRecipient?.address) {
      if (!Address.isValid(sendMaxRecipient.address)) {
        hasInvalidAddress = true
        invalidAddressError = `Invalid address: ${sendMaxRecipient.address}`
      } else if (!Address.isValid(sendMaxRecipient.address, currentNetwork)) {
        hasNetworkMismatch = true
        invalidAddressError = `Address is for wrong network: ${sendMaxRecipient.address}`
      } else {
        validOutputCount++
      }
    }

    const { buffer: opReturnBuffer, error: opReturnError } = parseOpReturnData(
      ctx.opReturn,
    )
    if (opReturnError) {
      result.error = opReturnError
      return result
    }

    if (sendMaxRecipient) {
      const sendMaxAddress =
        sendMaxRecipient.address && Address.isValid(sendMaxRecipient.address)
          ? sendMaxRecipient.address
          : ctx.changeAddress

      const sendMaxFee = calculateSendMaxFee(
        ctx,
        sendMaxAddress,
        regularOutputTotal,
        regularRecipients,
        opReturnBuffer,
      )

      if (sendMaxFee === null) {
        result.inputAmount = availableBalance
        result.selectedUtxos = availableUtxos
        result.error =
          'Transaction exceeds size limits. Try sending a smaller amount.'
        return result
      }

      result.inputAmount = availableBalance
      result.selectedUtxos = availableUtxos

      const maxSendableRaw =
        availableBalance - regularOutputTotal - BigInt(sendMaxFee)
      result.maxSendable = maxSendableRaw > DUST_THRESHOLD ? maxSendableRaw : 0n
      result.outputAmount = regularOutputTotal + result.maxSendable
      result.changeAmount = 0n
      result.estimatedFee = sendMaxFee
    } else {
      if (regularOutputTotal === 0n) {
        result.inputAmount = 0n
        result.outputAmount = 0n
        result.estimatedFee = 0
        result.changeAmount = 0n
        // Not an error - just no amount specified yet
        return result
      }

      const coinControlEnabled = (selectedUtxoOutpoints?.length ?? 0) > 0
      let utxosForTx: UtxoEntry[]

      if (coinControlEnabled) {
        utxosForTx = availableUtxos
      } else {
        const validRecipients = regularRecipients
          .filter(
            r =>
              r.address &&
              Address.isValid(r.address) &&
              Address.isValid(r.address, currentNetwork) &&
              r.amountSats > 0n,
          )
          .map(r => ({ address: r.address, amountSats: r.amountSats }))

        const selection = selectUtxosForAmount(
          ctx,
          regularOutputTotal,
          validRecipients,
          opReturnBuffer,
        )

        if (!selection) {
          result.inputAmount = availableBalance
          result.selectedUtxos = availableUtxos
          result.outputAmount = regularOutputTotal
          result.error = 'Insufficient balance for this transaction'
          return result
        }

        utxosForTx = selection.selectedUtxos
      }

      const inputAmount = utxosForTx.reduce(
        (sum, utxo) => sum + BigInt(utxo.value),
        0n,
      )

      // Build a test transaction to get accurate fee
      const Transaction = Bitcore.Transaction
      const testTx = new Transaction()
      testTx.feePerByte(Math.max(1, Math.floor(ctx.feeRate)))
      testTx.change(ctx.changeAddress)
      addInputsToTransaction(
        testTx,
        utxosForTx,
        ctx.script,
        ctx.addressType,
        ctx.internalPubKey,
        ctx.merkleRoot,
      )

      for (const recipient of regularRecipients) {
        if (
          recipient.address &&
          Address.isValid(recipient.address) &&
          recipient.amountSats > 0n
        ) {
          testTx.to(recipient.address, Number(recipient.amountSats))
        }
      }

      if (opReturnBuffer) {
        testTx.addData(opReturnBuffer)
      }

      const txSize = testTx.toBuffer().length
      if (txSize > MAX_TX_SIZE) {
        result.inputAmount = inputAmount
        result.selectedUtxos = utxosForTx
        result.outputAmount = regularOutputTotal
        result.error =
          'Transaction exceeds maximum size (100KB). Select fewer UTXOs or reduce outputs.'
        return result
      }

      const outputCount = validOutputCount + 1
      if (outputCount > MAX_RECIPIENTS) {
        result.inputAmount = inputAmount
        result.selectedUtxos = utxosForTx
        result.outputAmount = regularOutputTotal
        result.error = `Too many outputs (max ${MAX_RECIPIENTS})`
        return result
      }

      const estimatedFee = testTx.getFee()
      const totalNeeded = regularOutputTotal + BigInt(estimatedFee)

      if (inputAmount < totalNeeded) {
        result.inputAmount = inputAmount
        result.selectedUtxos = utxosForTx
        result.outputAmount = regularOutputTotal
        result.estimatedFee = estimatedFee
        result.error = coinControlEnabled
          ? 'Selected UTXOs insufficient for amount + fee'
          : 'Insufficient balance for this transaction'
        return result
      }

      result.inputAmount = inputAmount
      result.selectedUtxos = utxosForTx
      result.outputAmount = regularOutputTotal
      result.estimatedFee = estimatedFee

      const totalSpent = regularOutputTotal + BigInt(estimatedFee)
      result.changeAmount =
        inputAmount > totalSpent ? inputAmount - totalSpent : 0n
    }

    // Final validation
    if (hasInvalidAddress || hasNetworkMismatch) {
      result.error = invalidAddressError
    } else if (recipients.length === 0) {
      result.error = 'No recipients specified'
    } else if (regularOutputTotal === 0n && !sendMaxRecipient) {
      result.error = 'No amount specified'
    } else if (sendMaxRecipient && result.maxSendable === 0n) {
      result.error = 'Insufficient balance for this transaction'
    } else if (sendMaxRecipient && !sendMaxRecipient.address) {
      result.error = 'Enter recipient address'
    } else if (
      regularRecipients.some(
        r => r.address && Address.isValid(r.address) && r.amountSats === 0n,
      )
    ) {
      result.error = 'Enter amount for all recipients'
    } else {
      const allHaveAddresses = recipients.every(
        r => r.address && Address.isValid(r.address),
      )
      if (!allHaveAddresses) {
        result.error = 'Enter address for all recipients'
      } else {
        result.valid = true
      }
    }

    return result
  }

  /**
   * Build a transaction from the given context.
   * Returns the built (unsigned) transaction.
   */
  function buildTransaction(
    ctx: TransactionBuildContext,
    utxosToUse: UtxoEntry[],
    maxSendable: bigint,
  ): InstanceType<typeof BitcoreTypes.Transaction> | null {
    const Bitcore = getBitcoreSDK()
    if (!Bitcore || !ctx.script) return null

    const Address = Bitcore.Address
    const Transaction = Bitcore.Transaction

    if (utxosToUse.length === 0) return null

    const normalizedFeeRate = Math.max(1, Math.floor(ctx.feeRate))
    const sendMaxRecipient = ctx.recipients.find(r => r.sendMax)
    const regularRecipients = ctx.recipients.filter(r => !r.sendMax)

    const tx = new Transaction()
    tx.feePerByte(normalizedFeeRate)
    tx.change(ctx.changeAddress)

    addInputsToTransaction(
      tx,
      utxosToUse,
      ctx.script,
      ctx.addressType,
      ctx.internalPubKey,
      ctx.merkleRoot,
    )

    for (const recipient of regularRecipients) {
      if (
        recipient.address &&
        Address.isValid(recipient.address) &&
        recipient.amountSats > 0n
      ) {
        tx.to(recipient.address, Number(recipient.amountSats))
      }
    }

    if (
      sendMaxRecipient?.address &&
      Address.isValid(sendMaxRecipient.address)
    ) {
      if (maxSendable > 0n) {
        tx.to(sendMaxRecipient.address, Number(maxSendable))
      }
    }

    const { buffer: opReturnBuffer, error: opReturnError } = parseOpReturnData(
      ctx.opReturn,
    )
    if (ctx.opReturn?.data && opReturnError) {
      return null
    }
    if (opReturnBuffer) {
      tx.addData(opReturnBuffer)
    }

    return tx
  }

  /**
   * Apply locktime to a transaction.
   */
  function applyLocktime(
    tx: InstanceType<typeof BitcoreTypes.Transaction>,
    locktime: LocktimeConfig | null | undefined,
  ): void {
    if (!locktime) return

    if (locktime.type === 'block') {
      if (locktime.value >= 500000000) {
        throw new Error('Block height locktime must be less than 500000000')
      }
      tx.lockUntilBlockHeight(locktime.value)
    } else {
      if (locktime.value < 500000000) {
        throw new Error('Unix timestamp locktime must be >= 500000000')
      }
      tx.lockUntilDate(new Date(locktime.value * 1000))
    }
  }

  return {
    parseOpReturnData,
    addInputsToTransaction,
    selectUtxosForAmount,
    calculateSendMaxFee,
    estimateTransaction,
    buildTransaction,
    applyLocktime,
  }
}
