/**
 * Composable for computing transaction details from raw explorer data
 * @param tx - Reactive reference to the explorer transaction
 * @param tipHeight - Reactive reference to the current chain tip height
 * @returns Computed transaction details including confirmations, values, and fees
 */
export const useTransactionDetails = (
  tx: Ref<ExplorerTx | null>,
  tipHeight: Ref<number>,
) => {
  /**
   * Number of confirmations for the transaction
   * Returns 0 for unconfirmed (mempool) transactions
   */
  const confirmations = computed(() => {
    if (!tx.value) return 0
    if (!tx.value.block) return 0
    return tipHeight.value - tx.value.block.height + 1
  })

  /**
   * Total value of all inputs in satoshis
   */
  const totalInputValue = computed(() => {
    if (!tx.value) return 0
    return tx.value.inputs.reduce(
      (sum, input) => sum + parseInt(input.value || '0'),
      0,
    )
  })

  /**
   * Total value of all outputs in satoshis
   */
  const totalOutputValue = computed(() => {
    if (!tx.value) return 0
    return tx.value.outputs.reduce(
      (sum, output) => sum + parseInt(output.value || '0'),
      0,
    )
  })

  /**
   * Transaction fee in satoshis
   * Returns 0 for coinbase transactions (which have no fee)
   */
  const fee = computed(() => {
    if (!tx.value || tx.value.isCoinbase) return 0
    return totalInputValue.value - totalOutputValue.value
  })

  return {
    confirmations,
    totalInputValue,
    totalOutputValue,
    fee,
  }
}
