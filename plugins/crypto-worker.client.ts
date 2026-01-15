/**
 * Crypto Worker Plugin
 *
 * Provides a web worker for offloading CPU-intensive cryptographic operations
 * from the main thread to prevent UI blocking. This plugin encapsulates worker
 * lifecycle management, request/response bookkeeping, timeouts, and error handling.
 *
 * Access Patterns:
 * - Components: Use crypto-worker composable (if created)
 * - Stores: Import getter functions directly from this plugin
 * - Workers: Not available (this plugin manages the worker)
 *
 * Dependencies:
 * - None (standalone crypto operations)
 *
 * The `.client.ts` suffix ensures this only runs in the browser (SPA mode).
 */
import type { NetworkName } from 'xpi-ts/lib/bitcore/networks'

type RequestType = CryptoWorkerRequest['type']

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

const REQUEST_TIMEOUT = 3_000 // 3s

export default defineNuxtPlugin({
  name: 'crypto-worker',
  setup() {
    // ============================================================================
    // Module-level State
    // ============================================================================
    let workerInstance: Worker | null = null
    let workerReady = false
    let workerStatus: CryptoWorkerStatus | null = null
    const pendingRequests = new Map<string, PendingRequest>()

    // Reactive state for components
    const isReady = ref<boolean>(false)
    const status = ref<CryptoWorkerStatus | null>(null)
    const lastError = ref<Error | null>(null)

    // ============================================================================
    // Worker Lifecycle Management
    // ============================================================================

    function initWorker(): Worker | null {
      if (workerInstance) return workerInstance

      try {
        workerInstance = new Worker(
          new URL('../workers/crypto.worker.ts', import.meta.url),
          { type: 'module' },
        )

        workerInstance.onmessage = handleWorkerMessage
        workerInstance.onerror = handleWorkerError

        // Worker will post WORKER_READY when it completes initialization
        return workerInstance
      } catch (error) {
        console.error(
          '[Crypto Worker Plugin] Failed to initialize worker:',
          error,
        )
        lastError.value = error as Error
        return null
      }
    }

    function handleWorkerMessage(
      event: MessageEvent<CryptoWorkerResponse>,
    ): void {
      const data = event.data

      if (data.type === 'WORKER_READY') {
        workerReady = data.payload.ready
        workerStatus = data.payload
        isReady.value = data.payload.ready
        status.value = data.payload
        console.log(
          '[Crypto Worker Plugin] Worker ready:',
          data.payload.version,
        )
        return
      }

      const requestId = data.requestId
      const pending = pendingRequests.get(requestId)

      if (!pending) {
        console.warn(
          '[Crypto Worker Plugin] Received response for unknown request:',
          requestId,
        )
        return
      }

      clearTimeout(pending.timeout)

      if (data.type === 'ERROR') {
        lastError.value = new Error(data.payload.message)
        pending.reject(new Error(data.payload.message))
      } else {
        lastError.value = null
        pending.resolve(data.payload)
      }

      pendingRequests.delete(requestId)
    }

    function handleWorkerError(error: ErrorEvent): void {
      console.error('[Crypto Worker Plugin] Worker error:', error)
      lastError.value = new Error('Worker error')

      for (const [id, pending] of pendingRequests) {
        clearTimeout(pending.timeout)
        pending.reject(new Error('Worker error'))
        pendingRequests.delete(id)
      }
    }

    function terminateWorker(): void {
      if (workerInstance) {
        for (const [id, pending] of pendingRequests) {
          clearTimeout(pending.timeout)
          pending.reject(new Error('Worker terminated'))
          pendingRequests.delete(id)
        }

        workerInstance.terminate()
        workerInstance = null
        workerReady = false
        workerStatus = null
        isReady.value = false
        status.value = null
        console.log('[Crypto Worker Plugin] Worker terminated')
      }
    }

    function sendRequest<T extends RequestType>(
      type: T,
      payload: Extract<CryptoWorkerRequest, { type: T }>['payload'],
    ): Promise<ResponseTypeMap[T]> {
      const worker = initWorker()

      if (!worker) {
        return Promise.reject(new Error('Crypto worker not available'))
      }

      const requestId = crypto.randomUUID()

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pendingRequests.delete(requestId)
          lastError.value = new Error('Crypto operation timed out')
          reject(new Error('Crypto operation timed out'))
        }, REQUEST_TIMEOUT)

        pendingRequests.set(requestId, {
          resolve: resolve as (value: unknown) => void,
          reject,
          timeout,
        })

        worker.postMessage({ type, payload, requestId })
      })
    }

    // ============================================================================
    // Public API Functions
    // ============================================================================

    /**
     * Initialize the crypto worker and wait for ready signal
     */
    async function init(): Promise<CryptoWorkerStatus | null> {
      const worker = initWorker()
      if (!worker) return null

      // If the worker already signalled readiness earlier, return status
      if (workerStatus) return workerStatus

      // Wait for a short window for the WORKER_READY message
      return new Promise(resolve => {
        const onReady = (ev: MessageEvent<CryptoWorkerResponse>) => {
          if (ev.data.type === 'WORKER_READY') {
            worker.removeEventListener('message', onReady as EventListener)
            resolve(ev.data.payload)
          }
        }

        worker.addEventListener('message', onReady as EventListener)

        // Fallback timeout
        setTimeout(() => resolve(workerStatus), 2_000)
      })
    }

    /**
     * Check if the worker is ready
     */
    function checkReady(): boolean {
      return workerReady
    }

    /**
     * Get the current worker status
     */
    function getStatus(): CryptoWorkerStatus | null {
      return workerStatus
    }

    /**
     * Terminate the worker and clean up resources
     */
    function terminate(): void {
      terminateWorker()
    }

    // High-level operations ----------------------------------------------------

    /**
     * Generate a new mnemonic phrase
     */
    async function generateMnemonic(
      strength?: 128 | 160 | 192 | 224 | 256,
    ): Promise<string> {
      const result = await sendRequest('GENERATE_MNEMONIC', { strength })
      return result.mnemonic
    }

    /**
     * Validate a mnemonic phrase
     */
    async function validateMnemonic(mnemonic: string): Promise<boolean> {
      const result = await sendRequest('VALIDATE_MNEMONIC', { mnemonic })
      return result.valid
    }

    /**
     * Derive a P2TR commitment for Taproot addresses
     */
    async function deriveP2TRCommitment(
      internalPubKeyHex: string,
      merkleRootHex?: string,
    ) {
      return await sendRequest('DERIVE_P2TR_COMMITMENT', {
        internalPubKeyHex,
        merkleRootHex,
      })
    }

    /**
     * Derive keys from mnemonic for specific address type and network
     */
    async function deriveKeys(
      mnemonic: string,
      addressType: AddressType,
      network: NetworkName,
      accountIndex = 0,
      addressIndex = 0,
      isChange = false,
    ) {
      return await sendRequest('DERIVE_KEYS', {
        mnemonic,
        addressType,
        network,
        accountIndex,
        addressIndex,
        isChange,
      })
    }

    /**
     * Sign a transaction with the provided private key
     */
    async function signTransaction(
      txHex: string,
      utxos: Array<{ outpoint: string; satoshis: number; scriptHex: string }>,
      privateKey: string,
      addressType: AddressType,
      internalPubKeyHex?: string,
      merkleRootHex?: string,
    ) {
      return await sendRequest('SIGN_TRANSACTION', {
        txHex,
        utxos,
        privateKey,
        addressType,
        internalPubKeyHex,
        merkleRootHex,
      })
    }

    /**
     * Sign a message with a private key
     */
    async function signMessage(messageText: string, privateKey: string) {
      const result = await sendRequest('SIGN_MESSAGE', {
        message: messageText,
        privateKey,
      })
      return (result as any).signature
    }

    /**
     * Verify a message signature against an address
     */
    async function verifyMessage(
      messageText: string,
      address: string,
      signature: string,
    ) {
      const result = await sendRequest('VERIFY_MESSAGE', {
        message: messageText,
        address,
        signature,
      })
      return (result as any).valid
    }

    /**
     * Hash data using various algorithms
     */
    async function hashData(
      data: string,
      algorithm: 'sha256' | 'ripemd160' | 'hash160' | 'sha256d',
    ) {
      const result = await sendRequest('HASH_DATA', { data, algorithm })
      return (result as any).hash
    }

    // Initialize plugin
    console.log('[Crypto Worker Plugin] Ready (lazy initialization)')

    return {
      provide: {
        cryptoWorker: {
          // Reactive state
          isReady: readonly(isReady),
          status: readonly(status),
          lastError: readonly(lastError),

          // Lifecycle methods
          init,
          checkReady,
          getStatus,
          terminate,

          // Crypto operations
          generateMnemonic,
          validateMnemonic,
          deriveP2TRCommitment,
          deriveKeys,
          signTransaction,
          signMessage,
          verifyMessage,
          hashData,
        },
      },
    }
  },
})
