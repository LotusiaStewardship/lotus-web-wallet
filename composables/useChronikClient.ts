/**
 * Chronik Client Composable
 *
 * Provides reactive access to the Chronik blockchain client.
 * This composable wraps the plugin-provided functions with reactive state.
 *
 * Usage:
 * ```typescript
 * const chronik = useChronikClient()
 *
 * // Check connection status (reactive)
 * if (chronik.isConnected.value) { ... }
 *
 * // Fetch data
 * const utxos = await chronik.fetchUtxos()
 * ```
 */
import type {
  ChronikClient,
  Utxo as ChronikUtxo,
  Tx as ChronikTx,
} from 'chronik-client'
import type {
  ChronikConnectionOptions,
  ChronikScriptType,
  ChronikSubscription,
} from '~/plugins/02.chronik.client'

export function useChronikClient() {
  const { $chronik } = useNuxtApp()

  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Whether the Chronik client is initialized */
  const isInitialized = computed(() => $chronik.isInitialized())

  /** Whether the WebSocket is connected */
  const isConnected = computed(() => $chronik.isConnected())

  /** Current connection options */
  const connectionOptions = computed(() => $chronik.getConnectionOptions())

  /** Active subscriptions */
  const activeSubscriptions = computed(() => $chronik.getActiveSubscriptions())

  // ============================================================================
  // Methods (delegated to plugin)
  // ============================================================================

  /**
   * Initialize the Chronik client for a specific network
   */
  async function initialize(options: ChronikConnectionOptions): Promise<void> {
    return $chronik.initialize(options)
  }

  /**
   * Connect to Chronik WebSocket for real-time updates
   */
  async function connectWebSocket(): Promise<void> {
    return $chronik.connectWebSocket()
  }

  /**
   * Disconnect from Chronik WebSocket
   */
  function disconnectWebSocket(): void {
    return $chronik.disconnectWebSocket()
  }

  /**
   * Get the raw Chronik client instance (for advanced usage)
   */
  function getClient(): ChronikClient | null {
    return $chronik.getClient()
  }

  /**
   * Fetch UTXOs using stored connection options
   */
  async function fetchUtxos(): Promise<ChronikUtxo[]> {
    return $chronik.fetchUtxos()
  }

  /**
   * Fetch UTXOs for a specific script payload
   */
  async function fetchUtxosForScript(
    scriptType: ChronikScriptType,
    scriptPayload: string,
  ): Promise<ChronikUtxo[]> {
    return $chronik.fetchUtxosForScript(scriptType, scriptPayload)
  }

  /**
   * Fetch transaction history for the current script
   */
  async function fetchTransactionHistory(
    page?: number,
    pageSize?: number,
  ): Promise<{ txs: ChronikTx[]; numPages: number }> {
    return $chronik.fetchTransactionHistory(page, pageSize)
  }

  /**
   * Fetch a specific transaction by txid
   */
  async function fetchTransaction(txid: string): Promise<ChronikTx | null> {
    return $chronik.fetchTransaction(txid)
  }

  /**
   * Broadcast a raw transaction
   */
  async function broadcastTransaction(rawTxHex: string) {
    return $chronik.broadcastTransaction(rawTxHex)
  }

  /**
   * Fetch blockchain info (tip height and hash)
   */
  async function fetchBlockchainInfo() {
    return $chronik.fetchBlockchainInfo()
  }

  /**
   * Fetch a block by height or hash
   */
  async function fetchBlock(hashOrHeight: number | string) {
    return $chronik.fetchBlock(hashOrHeight)
  }

  /**
   * Subscribe to multiple addresses/scripts
   */
  async function subscribeToMultipleScripts(
    subscriptions: ChronikSubscription[],
  ): Promise<void> {
    return $chronik.subscribeToMultipleScripts(subscriptions)
  }

  /**
   * Unsubscribe from current script and subscribe to new one
   */
  async function resubscribeToScript(
    newScriptType: ChronikScriptType,
    newScriptPayload: string,
  ): Promise<void> {
    return $chronik.resubscribeToScript(newScriptType, newScriptPayload)
  }

  /**
   * Update the script payload (e.g., when switching address types)
   */
  function updateScriptOptions(
    scriptType: ChronikScriptType,
    scriptPayload: string,
  ): void {
    return $chronik.updateScriptOptions(scriptType, scriptPayload)
  }

  /**
   * Get the account ID for a given script payload
   */
  function getAccountIdForScript(scriptPayload: string): string | undefined {
    return $chronik.getAccountIdForScript(scriptPayload)
  }

  /**
   * Convert Chronik UTXOs to internal format
   */
  function convertChronikUtxos(
    chronikUtxos: ChronikUtxo[] | null | undefined,
  ): Map<string, { value: string; height: number; isCoinbase: boolean }> {
    return $chronik.convertChronikUtxos(chronikUtxos)
  }

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Reactive state
    isInitialized,
    isConnected,
    connectionOptions,
    activeSubscriptions,

    // Methods
    initialize,
    connectWebSocket,
    disconnectWebSocket,
    getClient,
    fetchUtxos,
    fetchUtxosForScript,
    fetchTransactionHistory,
    fetchTransaction,
    broadcastTransaction,
    fetchBlockchainInfo,
    fetchBlock,
    subscribeToMultipleScripts,
    resubscribeToScript,
    updateScriptOptions,
    getAccountIdForScript,
    convertChronikUtxos,
  }
}
