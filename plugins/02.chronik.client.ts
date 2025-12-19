/**
 * Chronik Client Plugin
 *
 * Provides the Chronik blockchain client for real-time blockchain interactions.
 * This plugin initializes lazily - the client is created when first needed
 * with a specific network configuration.
 *
 * Pattern:
 * - Plugin provides factory function and getter
 * - Composable (useChronikClient) provides reactive wrapper
 * - Stores use the composable for blockchain operations
 *
 * The `.client.ts` suffix ensures this only runs in the browser (SPA mode).
 */
import type {
  ChronikClient,
  WsEndpoint,
  Utxo as ChronikUtxo,
  Tx as ChronikTx,
} from 'chronik-client'
import type { NetworkConfig } from '~/types/network'

// ============================================================================
// Types
// ============================================================================

/**
 * Script type for Chronik subscriptions
 * - 'p2pkh': Pay-to-Public-Key-Hash (legacy)
 * - 'p2tr-commitment': Pay-to-Taproot with commitment (key-path only)
 */
export type ChronikScriptType = 'p2pkh' | 'p2tr-commitment'

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
// Module-level State (Singleton)
// ============================================================================

let chronikClient: ChronikClient | null = null
let wsEndpoint: WsEndpoint | null = null
let currentOptions: ChronikConnectionOptions | null = null
let activeSubscriptions: ChronikSubscription[] = []

// ============================================================================
// Exported Functions (for use by composable and stores)
// ============================================================================

/**
 * Initialize the Chronik client for a specific network
 */
export async function initializeChronik(
  options: ChronikConnectionOptions,
): Promise<void> {
  // Clean up existing connection
  if (wsEndpoint) {
    wsEndpoint.close()
    wsEndpoint = null
  }

  currentOptions = options

  // Dynamically import Chronik client
  const { ChronikClient } = await import('chronik-client')
  chronikClient = new ChronikClient(options.network.chronikUrl)

  console.log(
    `[Chronik Plugin] Initialized client for ${options.network.displayName}`,
  )
}

/**
 * Connect to Chronik WebSocket for real-time updates
 */
export async function connectWebSocket(): Promise<void> {
  if (!chronikClient || !currentOptions) {
    throw new Error('Chronik client not initialized')
  }

  const { scriptPayload, onTransaction, onConnectionChange, onBlock } =
    currentOptions

  // Create WebSocket endpoint
  wsEndpoint = chronikClient.ws({
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

  // Subscribe to real-time websocket events
  const { scriptType } = currentOptions
  wsEndpoint.subscribe(scriptType, scriptPayload)

  console.log(
    `[Chronik Plugin] Subscribed to ${scriptType} script: ${scriptPayload}`,
  )
}

/**
 * Disconnect from Chronik WebSocket
 */
export function disconnectWebSocket(): void {
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
export function getChronikClient(): ChronikClient | null {
  return chronikClient
}

/**
 * Check if Chronik client is initialized
 */
export function isChronikInitialized(): boolean {
  return chronikClient !== null
}

/**
 * Check if WebSocket is connected
 */
export function isWebSocketConnected(): boolean {
  return wsEndpoint?.ws?.readyState === WebSocket.OPEN
}

/**
 * Get the current connection options
 */
export function getConnectionOptions(): ChronikConnectionOptions | null {
  return currentOptions
}

/**
 * Fetch UTXOs for a specific script payload
 */
export async function fetchUtxosForScript(
  scriptType: ChronikScriptType,
  scriptPayload: string,
): Promise<ChronikUtxo[]> {
  if (!chronikClient) {
    throw new Error('Chronik client not initialized')
  }

  const endpoint = chronikClient.script(scriptType, scriptPayload)
  const result = await endpoint.utxos()

  if (!result || result.length === 0 || !result[0]?.utxos) {
    return []
  }

  return result[0].utxos
}

/**
 * Fetch UTXOs using stored connection options
 */
export async function fetchUtxos(): Promise<ChronikUtxo[]> {
  if (!chronikClient || !currentOptions) {
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
export async function fetchTransactionHistory(
  page: number = 0,
  pageSize: number = 25,
): Promise<{ txs: ChronikTx[]; numPages: number }> {
  if (!chronikClient || !currentOptions) {
    throw new Error('Chronik client not initialized')
  }

  const endpoint = chronikClient.script(
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
export async function fetchTransaction(
  txid: string,
): Promise<ChronikTx | null> {
  if (!chronikClient) {
    throw new Error('Chronik client not initialized')
  }

  try {
    const result = await chronikClient.tx(txid)
    return result ?? null
  } catch (error) {
    console.warn(`[Chronik Plugin] Failed to fetch transaction ${txid}:`, error)
    return null
  }
}

/**
 * Broadcast a raw transaction
 */
export async function broadcastTransaction(
  rawTxHex: string,
): Promise<BroadcastTxResult> {
  if (!chronikClient) {
    throw new Error('Chronik client not initialized')
  }

  const txBytes = Buffer.from(rawTxHex, 'hex')
  return await chronikClient.broadcastTx(txBytes)
}

/**
 * Fetch blockchain info (tip height and hash)
 */
export async function fetchBlockchainInfo(): Promise<Awaited<BlockchainInfoResult> | null> {
  if (!chronikClient) {
    throw new Error('Chronik client not initialized')
  }

  try {
    return await chronikClient.blockchainInfo()
  } catch (error) {
    console.warn('[Chronik Plugin] Failed to fetch blockchain info:', error)
    return null
  }
}

/**
 * Fetch a block by height or hash
 */
export async function fetchBlock(
  hashOrHeight: number | string,
): Promise<unknown | null> {
  if (!chronikClient) {
    throw new Error('Chronik client not initialized')
  }

  try {
    return await chronikClient.block(hashOrHeight)
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
export function updateScriptOptions(
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
export async function resubscribeToScript(
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
export async function subscribeToMultipleScripts(
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
export function getAccountIdForScript(
  scriptPayload: string,
): string | undefined {
  const sub = activeSubscriptions.find(s => s.scriptPayload === scriptPayload)
  return sub?.accountId
}

/**
 * Get all active subscriptions
 */
export function getActiveSubscriptions(): ChronikSubscription[] {
  return [...activeSubscriptions]
}

/**
 * Convert Chronik UTXOs to internal format
 */
export function convertChronikUtxos(
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

// ============================================================================
// Nuxt Plugin Definition
// ============================================================================

export default defineNuxtPlugin({
  name: 'chronik',
  // Note: Plugin ordering is handled by filename prefix (02.)
  // Bitcore plugin runs first as it has no prefix
  setup() {
    // Chronik is initialized lazily when wallet connects to a network
    // We just provide the functions here
    console.log('[Chronik Plugin] Ready (lazy initialization)')

    return {
      provide: {
        chronik: {
          initialize: initializeChronik,
          connectWebSocket,
          disconnectWebSocket,
          getClient: getChronikClient,
          isInitialized: isChronikInitialized,
          isConnected: isWebSocketConnected,
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
        },
      },
    }
  },
})

// ============================================================================
// Type Augmentation
// ============================================================================

declare module '#app' {
  interface NuxtApp {
    $chronik: {
      initialize: typeof initializeChronik
      connectWebSocket: typeof connectWebSocket
      disconnectWebSocket: typeof disconnectWebSocket
      getClient: typeof getChronikClient
      isInitialized: typeof isChronikInitialized
      isConnected: typeof isWebSocketConnected
      fetchUtxos: typeof fetchUtxos
      fetchUtxosForScript: typeof fetchUtxosForScript
      fetchTransactionHistory: typeof fetchTransactionHistory
      fetchTransaction: typeof fetchTransaction
      broadcastTransaction: typeof broadcastTransaction
      fetchBlockchainInfo: typeof fetchBlockchainInfo
      fetchBlock: typeof fetchBlock
      subscribeToMultipleScripts: typeof subscribeToMultipleScripts
      resubscribeToScript: typeof resubscribeToScript
      updateScriptOptions: typeof updateScriptOptions
      getConnectionOptions: typeof getConnectionOptions
      getAccountIdForScript: typeof getAccountIdForScript
      getActiveSubscriptions: typeof getActiveSubscriptions
      convertChronikUtxos: typeof convertChronikUtxos
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $chronik: {
      initialize: typeof initializeChronik
      connectWebSocket: typeof connectWebSocket
      disconnectWebSocket: typeof disconnectWebSocket
      getClient: typeof getChronikClient
      isInitialized: typeof isChronikInitialized
      isConnected: typeof isWebSocketConnected
      fetchUtxos: typeof fetchUtxos
      fetchUtxosForScript: typeof fetchUtxosForScript
      fetchTransactionHistory: typeof fetchTransactionHistory
      fetchTransaction: typeof fetchTransaction
      broadcastTransaction: typeof broadcastTransaction
      fetchBlockchainInfo: typeof fetchBlockchainInfo
      fetchBlock: typeof fetchBlock
      subscribeToMultipleScripts: typeof subscribeToMultipleScripts
      resubscribeToScript: typeof resubscribeToScript
      updateScriptOptions: typeof updateScriptOptions
      getConnectionOptions: typeof getConnectionOptions
      getAccountIdForScript: typeof getAccountIdForScript
      getActiveSubscriptions: typeof getActiveSubscriptions
      convertChronikUtxos: typeof convertChronikUtxos
    }
  }
}
