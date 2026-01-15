/**
 * Chronik Client Plugin
 *
 * Provides the Chronik blockchain client for real-time blockchain interactions.
 * This plugin initializes lazily - the client is created when first needed
 * with a specific network configuration.
 *
 * Access Patterns:
 * - Components: useChronikClient() composable
 * - Stores: Import getter functions directly from this plugin
 * - Workers: Not available (use static imports in worker)
 *
 * Dependencies:
 * - None (independent blockchain client)
 *
 * The `.client.ts` suffix ensures this only runs in the browser (SPA mode).
 */
import type {
  WsEndpoint,
  Utxo as ChronikUtxo,
  Tx as ChronikTx,
  ScriptType as ChronikScriptType,
  Block,
} from 'chronik-client'
import { ChronikClient } from 'chronik-client'

// ============================================================================
// Types
// ============================================================================

/**
 * Chronik connection options
 */
export interface ChronikConnectionOptions {
  /** Network configuration */
  network: NetworkConfig
  /** Script payload for subscriptions */
  scriptPayload: string
  /** Script type for subscriptions */
  scriptType: ChronikScriptType
  /** Callback for new transactions */
  onTransaction?: (txid: string) => void
  /** Callback for connection state changes */
  onConnectionChange?: (connected: boolean) => void
  /** Callback for block updates */
  onBlock?: (blockHeight: number, blockHash: string) => void
  /** Callback for transaction confirmation */
  onConfirmed?: (txid: string) => void
  /** Callback for transaction removed from mempool */
  onRemovedFromMempool?: (txid: string) => void
}

/**
 * Subscription info for a single script
 */
export interface ChronikSubscription {
  scriptType: ChronikScriptType
  scriptPayload: string
  /** Account purpose identifier for routing callbacks */
  accountId?: string
}

export type BroadcastTxResult = ReturnType<ChronikClient['broadcastTx']>
export type BlockchainInfoResult = ReturnType<ChronikClient['blockchainInfo']>

// ============================================================================
// Nuxt Plugin Definition
// ============================================================================

export default defineNuxtPlugin({
  name: 'chronik',
  // Note: Plugin ordering is handled by filename prefix (02.)
  // Bitcore plugin runs first as it has no prefix
  setup() {
    // ============================================================================
    // Module-level State
    // ============================================================================
    // Connect to the Chronik API endpoint for the current network
    let client: ChronikClient | null = null
    let wsEndpoint: WsEndpoint | null = null
    let currentOptions: ChronikConnectionOptions | null = null
    let activeSubscriptions: ChronikSubscription[] = []

    // ============================================================================
    // Exported Functions
    // ============================================================================

    function setNetwork(config: NetworkConfig): void {
      client = new ChronikClient(config.chronikUrl)
    }

    /**
     * Used by stores (particulary wallet.ts) to set the Chronik connection options
     * during store initialization
     */
    function setOptions(options: ChronikConnectionOptions): void {
      initialize(options)
    }

    /**
     * Initialize the Chronik client for a specific network
     */
    function initialize(options: ChronikConnectionOptions): void {
      currentOptions = options

      console.log(
        `[Chronik Plugin] Initialized client for ${options.network.displayName}`,
      )
    }

    /**
     * Connect to Chronik WebSocket for real-time updates
     */
    async function connectWebSocket(): Promise<void> {
      if (!currentOptions) {
        throw new Error('Chronik client not initialized')
      }

      // Clean up existing connection
      if (wsEndpoint) {
        wsEndpoint.close()
        wsEndpoint = null
      }

      const { onTransaction, onConnectionChange, onBlock } = currentOptions

      // Create WebSocket endpoint
      if (!client) {
        throw new Error('Chronik client not initialized')
      }
      wsEndpoint = client.ws({
        onMessage: msg => {
          if (msg.type === 'AddedToMempool' && onTransaction) {
            onTransaction(msg.txid)
          } else if (
            msg.type === 'RemovedFromMempool' &&
            currentOptions?.onRemovedFromMempool
          ) {
            currentOptions.onRemovedFromMempool(msg.txid)
          } else if (msg.type === 'Confirmed' && currentOptions?.onConfirmed) {
            currentOptions.onConfirmed(msg.txid)
          } else if (msg.type === 'BlockConnected' && onBlock) {
            const blockMsg = msg as unknown as {
              blockHash: string
              blockHeight: number
            }
            onBlock(blockMsg.blockHeight, blockMsg.blockHash)
          }
        },
        onConnect: () => {
          console.log('[Chronik Plugin] WebSocket connected')
          onConnectionChange?.(true)
        },
        onReconnect: () => {
          console.log('[Chronik Plugin] WebSocket reconnecting...')
        },
        onEnd: () => {
          console.log('[Chronik Plugin] WebSocket disconnected')
          onConnectionChange?.(false)
        },
        onError: error => {
          console.error('[Chronik Plugin] WebSocket error:', error)
        },
      })

      // Wait for connection
      await wsEndpoint.waitForOpen()

      // Do not subscribe to any scripts here
      // stores/wallet.ts will handle subscriptions via subscribeToMultipleScripts
      // function defined below
    }

    /**
     * Disconnect from Chronik WebSocket
     */
    function disconnectWebSocket(): void {
      if (wsEndpoint) {
        wsEndpoint.close()
        wsEndpoint = null
      }
      console.log('[Chronik Plugin] WebSocket disconnected')
    }

    /**
     * Get the Chronik client instance synchronously
     * Returns null if not yet initialized
     */
    function getClient(): ChronikClient | null {
      return client
    }

    /**
     * Check if Chronik client is initialized
     */
    function isInitialized(): boolean {
      return client !== null
    }

    /**
     * Check if WebSocket is connected
     */
    function isConnected(): boolean {
      return wsEndpoint?.ws?.readyState === WebSocket.OPEN
    }

    /**
     * Get the current connection options
     */
    function getConnectionOptions(): ChronikConnectionOptions | null {
      return currentOptions
    }

    /**
     * Fetch UTXOs for a specific script payload
     */
    async function fetchUtxosForScript(
      scriptType: ChronikScriptType,
      scriptPayload: string,
    ): Promise<ChronikUtxo[]> {
      if (!client) {
        throw new Error('Chronik client not initialized')
      }

      const endpoint = client.script(scriptType, scriptPayload)
      const result = await endpoint.utxos()

      if (!result || result.length === 0 || !result[0]?.utxos) {
        return []
      }

      return result[0].utxos
    }

    /**
     * Fetch UTXOs using stored connection options
     */
    async function fetchUtxos(): Promise<ChronikUtxo[]> {
      if (!client || !currentOptions) {
        console.warn(
          '[Chronik Plugin] Client not initialized, returning empty UTXOs',
        )
        return []
      }

      try {
        return await fetchUtxosForScript(
          currentOptions.scriptType,
          currentOptions.scriptPayload,
        )
      } catch (error) {
        console.warn('[Chronik Plugin] Failed to fetch UTXOs:', error)
        return []
      }
    }

    /**
     * Fetch transaction history for the current script
     */
    async function fetchTransactionHistory(
      page: number = 0,
      pageSize: number = 25,
    ): Promise<{ txs: ChronikTx[]; numPages: number }> {
      if (!client || !currentOptions) {
        throw new Error('Chronik client not initialized')
      }

      const endpoint = client.script(
        currentOptions.scriptType,
        currentOptions.scriptPayload,
      )
      const result = await endpoint.history(page, pageSize)

      return {
        txs: result?.txs ?? [],
        numPages: result?.numPages ?? 0,
      }
    }

    /**
     * Fetch a specific transaction by txid
     */
    async function fetchTransaction(txid: string): Promise<ChronikTx | null> {
      if (!client) {
        throw new Error('Chronik client not initialized')
      }

      try {
        const result = await client.tx(txid)
        return result ?? null
      } catch (error) {
        console.warn(
          `[Chronik Plugin] Failed to fetch transaction ${txid}:`,
          error,
        )
        return null
      }
    }

    /**
     * Broadcast a raw transaction
     */
    async function broadcastTransaction(
      rawTxHex: string,
    ): Promise<BroadcastTxResult> {
      if (!client) {
        throw new Error('Chronik client not initialized')
      }

      const txBytes = Buffer.from(rawTxHex, 'hex')
      return await client.broadcastTx(txBytes)
    }

    /**
     * Fetch blockchain info (tip height and hash)
     */
    async function fetchBlockchainInfo(): Promise<Awaited<BlockchainInfoResult> | null> {
      if (!client) {
        throw new Error('Chronik client not initialized')
      }

      try {
        return await client.blockchainInfo()
      } catch (error) {
        console.warn('[Chronik Plugin] Failed to fetch blockchain info:', error)
        return null
      }
    }

    /**
     * Fetch a block by height or hash
     */
    async function fetchBlock(
      hashOrHeight: number | string,
    ): Promise<Block | null> {
      if (!client) {
        throw new Error('Chronik client not initialized')
      }

      try {
        return await client.block(hashOrHeight)
      } catch (error) {
        console.warn(
          `[Chronik Plugin] Failed to fetch block ${hashOrHeight}:`,
          error,
        )
        return null
      }
    }

    /**
     * Update the script payload (e.g., when switching address types)
     */
    function updateScriptOptions(
      scriptType: ChronikScriptType,
      scriptPayload: string,
    ): void {
      if (!currentOptions) {
        throw new Error('Chronik client not initialized')
      }
      currentOptions.scriptType = scriptType
      currentOptions.scriptPayload = scriptPayload
    }

    /**
     * Unsubscribe from current script and subscribe to new one
     */
    async function resubscribeToScript(
      newScriptType: ChronikScriptType,
      newScriptPayload: string,
    ): Promise<void> {
      if (!wsEndpoint || !currentOptions) {
        throw new Error('WebSocket not initialized')
      }

      wsEndpoint.unsubscribe(
        currentOptions.scriptType,
        currentOptions.scriptPayload,
      )

      currentOptions.scriptType = newScriptType
      currentOptions.scriptPayload = newScriptPayload

      wsEndpoint.subscribe(newScriptType, newScriptPayload)

      console.log(
        `[Chronik Plugin] Resubscribed to ${newScriptType} script: ${newScriptPayload}`,
      )
    }

    /**
     * Subscribe to multiple addresses/scripts
     */
    async function subscribeToMultipleScripts(
      subscriptions: ChronikSubscription[],
    ): Promise<void> {
      if (!wsEndpoint) {
        throw new Error('WebSocket not initialized')
      }

      // Unsubscribe from all existing subscriptions
      for (const sub of activeSubscriptions) {
        try {
          wsEndpoint.unsubscribe(sub.scriptType, sub.scriptPayload)
        } catch {
          // Ignore errors from already-unsubscribed scripts
        }
      }

      // Subscribe to all new scripts
      activeSubscriptions = []
      for (const sub of subscriptions) {
        wsEndpoint.subscribe(sub.scriptType, sub.scriptPayload)
        activeSubscriptions.push(sub)
        console.log(
          `[Chronik Plugin] Subscribed to ${sub.scriptType} script: ${
            sub.scriptPayload
          }${sub.accountId ? ` (${sub.accountId})` : ''}`,
        )
      }
    }

    /**
     * Get the account ID for a given script payload
     */
    function getAccountIdForScript(scriptPayload: string): string | undefined {
      const sub = activeSubscriptions.find(
        s => s.scriptPayload === scriptPayload,
      )
      return sub?.accountId
    }

    /**
     * Get all active subscriptions
     */
    function getActiveSubscriptions(): ChronikSubscription[] {
      return [...activeSubscriptions]
    }

    /**
     * Convert Chronik UTXOs to internal format
     */
    function convertChronikUtxos(
      chronikUtxos: ChronikUtxo[] | null | undefined,
    ): Map<string, { value: string; height: number; isCoinbase: boolean }> {
      const utxoMap = new Map<
        string,
        { value: string; height: number; isCoinbase: boolean }
      >()

      if (!chronikUtxos || !Array.isArray(chronikUtxos)) {
        return utxoMap
      }

      for (const utxo of chronikUtxos) {
        if (!utxo?.outpoint) continue
        const outpoint = `${utxo.outpoint.txid}:${utxo.outpoint.outIdx}`
        utxoMap.set(outpoint, {
          value: utxo.value ?? '0',
          height: utxo.blockHeight ?? 0,
          isCoinbase: utxo.isCoinbase ?? false,
        })
      }

      return utxoMap
    }
    // Chronik is initialized lazily when wallet connects to a network
    // We just provide the functions here
    console.log('[Chronik Plugin] Ready (lazy initialization)')

    return {
      provide: {
        chronik: {
          initialize,
          connectWebSocket,
          disconnectWebSocket,
          getClient,
          isInitialized,
          isConnected,
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
          getConnectionOptions,
          getAccountIdForScript,
          getActiveSubscriptions,
          convertChronikUtxos,
          setNetwork,
        },
      },
    }
  },
})
