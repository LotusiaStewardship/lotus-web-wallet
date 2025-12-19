/**
 * useCryptoWorker - Crypto worker interface composable
 *
 * Provides an interface to offload cryptographic operations to a web worker.
 * This improves UI responsiveness during heavy crypto operations like:
 * - Mnemonic generation and validation
 * - HD key derivation
 * - Transaction signing (ECDSA and Schnorr)
 * - Message signing and verification
 *
 * This is behind a feature flag (USE_CRYPTO_WORKER) and should be tested
 * before enabling in production.
 */

import type {
  CryptoWorkerRequest,
  CryptoWorkerResponse,
  CryptoWorkerStatus,
  AddressType,
  ResponseTypeMap,
  UtxoForSigning,
} from '~/types/crypto-worker'
import { USE_CRYPTO_WORKER } from '~/utils/constants'

type RequestType = CryptoWorkerRequest['type']

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

// Module-level worker instance (shared across all composable uses)
let workerInstance: Worker | null = null
let workerReady = false
let workerStatus: CryptoWorkerStatus | null = null
const pendingRequests = new Map<string, PendingRequest>()

const REQUEST_TIMEOUT = 30000 // 30 seconds

/**
 * Initialize the crypto worker (module-level singleton)
 */
function initWorker(): Worker | null {
  if (workerInstance) return workerInstance

  if (!USE_CRYPTO_WORKER) {
    console.log('[CryptoWorker] Feature flag disabled, skipping initialization')
    return null
  }

  try {
    workerInstance = new Worker(
      new URL('../workers/crypto.worker.ts', import.meta.url),
      { type: 'module' },
    )

    workerInstance.onmessage = handleWorkerMessage
    workerInstance.onerror = handleWorkerError

    console.log('[CryptoWorker] Worker initialized')
    return workerInstance
  } catch (error) {
    console.error('[CryptoWorker] Failed to initialize:', error)
    return null
  }
}

/**
 * Handle messages from the worker
 */
function handleWorkerMessage(event: MessageEvent<CryptoWorkerResponse>): void {
  const data = event.data

  // Handle worker ready message
  if (data.type === 'WORKER_READY') {
    workerReady = data.payload.ready
    workerStatus = data.payload
    console.log('[CryptoWorker] Worker ready:', data.payload)
    return
  }

  // Handle response messages
  const requestId = data.requestId
  const pendingRequest = pendingRequests.get(requestId)

  if (!pendingRequest) {
    console.warn(
      '[CryptoWorker] Received response for unknown request:',
      requestId,
    )
    return
  }

  // Clear timeout
  clearTimeout(pendingRequest.timeout)

  // Handle error responses
  if (data.type === 'ERROR') {
    pendingRequest.reject(new Error(data.payload.message))
  } else {
    pendingRequest.resolve(data.payload)
  }

  pendingRequests.delete(requestId)
}

/**
 * Handle worker errors
 */
function handleWorkerError(error: ErrorEvent): void {
  console.error('[CryptoWorker] Worker error:', error)

  // Reject all pending requests
  for (const [requestId, pendingRequest] of pendingRequests) {
    clearTimeout(pendingRequest.timeout)
    pendingRequest.reject(new Error('Worker error'))
    pendingRequests.delete(requestId)
  }
}

/**
 * Send a request to the worker and wait for response
 */
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
    // Set timeout
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId)
      reject(new Error('Crypto operation timed out'))
    }, REQUEST_TIMEOUT)

    // Store pending request
    pendingRequests.set(requestId, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout,
    })

    // Send message to worker
    worker.postMessage({
      type,
      payload,
      requestId,
    })
  })
}

export function useCryptoWorker() {
  const isReady = computed(() => workerReady)
  const status = computed(() => workerStatus)
  const isSupported = computed(() => typeof Worker !== 'undefined')

  /**
   * Initialize the crypto worker
   */
  function init(): void {
    initWorker()
  }

  /**
   * Generate a new mnemonic seed phrase
   * @param strength - Mnemonic strength in bits (128=12 words, 256=24 words)
   */
  async function generateMnemonic(
    strength?: 128 | 160 | 192 | 224 | 256,
  ): Promise<string> {
    const result = await sendRequest('GENERATE_MNEMONIC', { strength })
    return result.mnemonic
  }

  /**
   * Validate a mnemonic seed phrase
   */
  async function validateMnemonic(mnemonic: string): Promise<boolean> {
    const result = await sendRequest('VALIDATE_MNEMONIC', { mnemonic })
    return result.valid
  }

  /**
   * Derive keys from mnemonic
   * Returns address, public key, and private key
   * @param mnemonic - Seed phrase
   * @param addressType - Address type (p2pkh or p2tr)
   * @param network - Network name
   * @param accountIndex - BIP44 account index (0 = PRIMARY, 1 = MUSIG2, etc.)
   * @param addressIndex - Address index within the account chain
   * @param isChange - Whether this is a change address
   */
  async function deriveKeys(
    mnemonic: string,
    addressType: AddressType,
    network: string,
    accountIndex: number = 0,
    addressIndex: number = 0,
    isChange: boolean = false,
  ): Promise<ResponseTypeMap['DERIVE_KEYS']> {
    return sendRequest('DERIVE_KEYS', {
      mnemonic,
      addressType,
      network,
      accountIndex,
      addressIndex,
      isChange,
    })
  }

  /**
   * Sign a transaction
   * @param txHex - Serialized unsigned transaction (hex)
   * @param utxos - UTXOs being spent (required to set input.output for signing)
   * @param privateKey - Private key (hex or WIF)
   * @param addressType - Address type determines signing method
   * @param internalPubKeyHex - For Taproot: internal public key (hex)
   * @param merkleRootHex - For Taproot: merkle root (hex)
   */
  async function signTransaction(
    txHex: string,
    utxos: UtxoForSigning[],
    privateKey: string,
    addressType: AddressType,
    internalPubKeyHex?: string,
    merkleRootHex?: string,
  ): Promise<ResponseTypeMap['SIGN_TRANSACTION']> {
    return sendRequest('SIGN_TRANSACTION', {
      txHex,
      utxos,
      privateKey,
      addressType,
      internalPubKeyHex,
      merkleRootHex,
    })
  }

  /**
   * Sign a message
   */
  async function signMessage(
    message: string,
    privateKey: string,
  ): Promise<string> {
    const result = await sendRequest('SIGN_MESSAGE', { message, privateKey })
    return result.signature
  }

  /**
   * Verify a signed message
   */
  async function verifyMessage(
    message: string,
    address: string,
    signature: string,
  ): Promise<boolean> {
    const result = await sendRequest('VERIFY_MESSAGE', {
      message,
      address,
      signature,
    })
    return result.valid
  }

  /**
   * Hash data using specified algorithm
   */
  async function hashData(
    data: string,
    algorithm: 'sha256' | 'ripemd160' | 'hash160' | 'sha256d',
  ): Promise<string> {
    const result = await sendRequest('HASH_DATA', { data, algorithm })
    return result.hash
  }

  /**
   * Low-level request method for advanced usage
   */
  async function request<T extends RequestType>(
    type: T,
    payload: Extract<CryptoWorkerRequest, { type: T }>['payload'],
  ): Promise<ResponseTypeMap[T]> {
    // Type assertion needed due to TypeScript's limitations with discriminated unions
    return sendRequest(type, payload as any)
  }

  /**
   * Terminate the worker
   */
  function terminate(): void {
    if (workerInstance) {
      // Reject all pending requests
      for (const [requestId, pendingRequest] of pendingRequests) {
        clearTimeout(pendingRequest.timeout)
        pendingRequest.reject(new Error('Worker terminated'))
        pendingRequests.delete(requestId)
      }

      workerInstance.terminate()
      workerInstance = null
      workerReady = false
      workerStatus = null
      console.log('[CryptoWorker] Worker terminated')
    }
  }

  // Note: No onUnmounted hook here because:
  // 1. The worker is a module-level singleton shared across all uses
  // 2. This composable may be called from Pinia stores which are not Vue components
  // 3. Terminating the worker on component unmount would break other components

  return {
    // State
    isReady,
    status,
    isSupported,
    isEnabled: USE_CRYPTO_WORKER,

    // Lifecycle
    init,
    terminate,

    // Convenience methods
    generateMnemonic,
    validateMnemonic,
    deriveKeys,
    signTransaction,
    signMessage,
    verifyMessage,
    hashData,

    // Low-level access
    request,
  }
}
