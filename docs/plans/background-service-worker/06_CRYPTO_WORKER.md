# Phase 6: Cryptographic Operations Worker

## Overview

This phase implements a dedicated Web Worker for CPU-intensive cryptographic operations. Unlike the service worker (which handles background network tasks), this crypto worker runs alongside the main thread to prevent UI blocking during key generation, transaction signing, and address derivation.

**Priority**: P1 (High)
**Estimated Effort**: 1-2 days
**Dependencies**: Phase 1 (Service Worker Foundation)

---

## Why a Separate Web Worker?

### Service Worker vs Web Worker

| Aspect         | Service Worker               | Web Worker                |
| -------------- | ---------------------------- | ------------------------- |
| **Purpose**    | Network proxy, caching, push | CPU-intensive computation |
| **Lifecycle**  | May terminate when idle      | Lives as long as page     |
| **DOM Access** | None                         | None                      |
| **Best For**   | Background network tasks     | Heavy computation         |

### Cryptographic Operations to Offload

| Operation                   | Current Location           | Blocking Time | Priority |
| --------------------------- | -------------------------- | ------------- | -------- |
| **Mnemonic Generation**     | `stores/wallet.ts`         | 50-200ms      | P0       |
| **HD Key Derivation**       | `stores/wallet.ts`         | 100-500ms     | P0       |
| **Transaction Signing**     | `stores/wallet.ts`         | 50-150ms      | P0       |
| **Schnorr Signing (P2TR)**  | `stores/wallet.ts`         | 50-150ms      | P0       |
| **MuSig2 Nonce Generation** | `composables/useMuSig2.ts` | 100-300ms     | P1       |
| **MuSig2 Partial Signing**  | `composables/useMuSig2.ts` | 100-300ms     | P1       |
| **Address Validation**      | `stores/wallet.ts`         | 10-50ms       | P2       |
| **Message Signing**         | `stores/wallet.ts`         | 50-100ms      | P2       |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MAIN THREAD                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐     ┌─────────────────────┐                       │
│  │  stores/wallet.ts   │     │  useMuSig2.ts       │                       │
│  │  ─────────────────  │     │  ─────────────────  │                       │
│  │  • UI state         │     │  • Session state    │                       │
│  │  • Balance display  │     │  • Signer list      │                       │
│  └──────────┬──────────┘     └──────────┬──────────┘                       │
│             │                           │                                   │
│             └───────────┬───────────────┘                                   │
│                         │                                                   │
│                         ▼                                                   │
│             ┌─────────────────────┐                                         │
│             │  useCryptoWorker()  │  ◄── Composable                        │
│             │  ─────────────────  │                                         │
│             │  • postMessage()    │                                         │
│             │  • Promise-based    │                                         │
│             └──────────┬──────────┘                                         │
│                        │                                                    │
└────────────────────────┼────────────────────────────────────────────────────┘
                         │ postMessage / onmessage
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CRYPTO WORKER THREAD                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  workers/crypto.worker.ts                                            │   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  • Bitcore SDK loaded once                                           │   │
│  │  • Mnemonic generation                                               │   │
│  │  • HD key derivation                                                 │   │
│  │  • Transaction building & signing                                    │   │
│  │  • Schnorr signatures                                                │   │
│  │  • MuSig2 operations                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Crypto Worker Message Types

### File: `types/crypto-worker.ts`

```ts
/**
 * Crypto Worker Message Types
 *
 * Defines the contract for communication between
 * the main thread and crypto worker.
 */

// ============================================================================
// Request Messages (Main → Worker)
// ============================================================================

export interface CryptoGenerateMnemonicRequest {
  type: 'GENERATE_MNEMONIC'
  id: string
  payload: {
    strength?: 128 | 160 | 192 | 224 | 256
  }
}

export interface CryptoValidateMnemonicRequest {
  type: 'VALIDATE_MNEMONIC'
  id: string
  payload: {
    mnemonic: string
  }
}

export interface CryptoDeriveKeysRequest {
  type: 'DERIVE_KEYS'
  id: string
  payload: {
    mnemonic: string
    addressType: 'p2pkh' | 'p2tr'
    network: string
  }
}

export interface CryptoSignTransactionRequest {
  type: 'SIGN_TRANSACTION'
  id: string
  payload: {
    /** Serialized transaction (hex) */
    txHex: string
    /** Private key (hex) */
    privateKeyHex: string
    /** Address type determines signing method */
    addressType: 'p2pkh' | 'p2tr'
    /** For Taproot: internal public key */
    internalPubKeyHex?: string
    /** For Taproot: merkle root */
    merkleRootHex?: string
  }
}

export interface CryptoSignMessageRequest {
  type: 'SIGN_MESSAGE'
  id: string
  payload: {
    message: string
    privateKeyHex: string
  }
}

export interface CryptoVerifyMessageRequest {
  type: 'VERIFY_MESSAGE'
  id: string
  payload: {
    message: string
    address: string
    signature: string
  }
}

export interface CryptoMuSig2GenerateNonceRequest {
  type: 'MUSIG2_GENERATE_NONCE'
  id: string
  payload: {
    privateKeyHex: string
    publicKeysHex: string[]
    messageHex: string
  }
}

export interface CryptoMuSig2PartialSignRequest {
  type: 'MUSIG2_PARTIAL_SIGN'
  id: string
  payload: {
    privateKeyHex: string
    publicKeysHex: string[]
    messageHex: string
    aggregatedNonceHex: string
    nonceSecretHex: string
  }
}

export type CryptoWorkerRequest =
  | CryptoGenerateMnemonicRequest
  | CryptoValidateMnemonicRequest
  | CryptoDeriveKeysRequest
  | CryptoSignTransactionRequest
  | CryptoSignMessageRequest
  | CryptoVerifyMessageRequest
  | CryptoMuSig2GenerateNonceRequest
  | CryptoMuSig2PartialSignRequest

// ============================================================================
// Response Messages (Worker → Main)
// ============================================================================

export interface CryptoSuccessResponse<T = unknown> {
  type: 'SUCCESS'
  id: string
  payload: T
}

export interface CryptoErrorResponse {
  type: 'ERROR'
  id: string
  payload: {
    code: string
    message: string
  }
}

export type CryptoWorkerResponse = CryptoSuccessResponse | CryptoErrorResponse

// ============================================================================
// Payload Types
// ============================================================================

export interface DerivedKeysPayload {
  address: string
  scriptPayload: string
  publicKeyHex: string
  /** Private key is NOT returned - kept in worker memory */
}

export interface SignedTransactionPayload {
  signedTxHex: string
  txid: string
}

export interface SignedMessagePayload {
  signature: string
}

export interface MuSig2NoncePayload {
  publicNonceHex: string
  /** Secret nonce kept in worker, returned as reference ID */
  nonceId: string
}

export interface MuSig2PartialSigPayload {
  partialSigHex: string
}
```

---

## 2. Crypto Worker Implementation

### File: `workers/crypto.worker.ts`

```ts
/// <reference lib="webworker" />

/**
 * Crypto Worker
 *
 * Handles CPU-intensive cryptographic operations off the main thread.
 * The Bitcore SDK is loaded once and reused for all operations.
 */

import type {
  CryptoWorkerRequest,
  CryptoWorkerResponse,
  DerivedKeysPayload,
  SignedTransactionPayload,
  SignedMessagePayload,
  MuSig2NoncePayload,
  MuSig2PartialSigPayload,
} from '../types/crypto-worker'

// Declare worker global scope
declare let self: DedicatedWorkerGlobalScope

// ============================================================================
// SDK Loading
// ============================================================================

let Bitcore: typeof import('lotus-sdk').Bitcore | null = null
let sdkLoading: Promise<void> | null = null

async function ensureSDK(): Promise<typeof import('lotus-sdk').Bitcore> {
  if (Bitcore) return Bitcore

  if (!sdkLoading) {
    sdkLoading = (async () => {
      const sdk = await import('lotus-sdk')
      Bitcore = sdk.Bitcore
    })()
  }

  await sdkLoading
  return Bitcore!
}

// ============================================================================
// Secure Key Storage (in-worker memory)
// ============================================================================

// Private keys are stored in worker memory, never sent back to main thread
const privateKeyStore = new Map<
  string,
  InstanceType<typeof import('lotus-sdk').Bitcore.PrivateKey>
>()
const nonceSecretStore = new Map<string, Buffer>()

function storePrivateKey(
  id: string,
  key: InstanceType<typeof import('lotus-sdk').Bitcore.PrivateKey>,
): void {
  privateKeyStore.set(id, key)
}

function getPrivateKey(
  id: string,
): InstanceType<typeof import('lotus-sdk').Bitcore.PrivateKey> | undefined {
  return privateKeyStore.get(id)
}

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = async (event: MessageEvent<CryptoWorkerRequest>) => {
  const request = event.data

  try {
    const result = await handleRequest(request)
    self.postMessage({
      type: 'SUCCESS',
      id: request.id,
      payload: result,
    } as CryptoWorkerResponse)
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      id: request.id,
      payload: {
        code: 'CRYPTO_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    } as CryptoWorkerResponse)
  }
}

async function handleRequest(request: CryptoWorkerRequest): Promise<unknown> {
  const sdk = await ensureSDK()

  switch (request.type) {
    case 'GENERATE_MNEMONIC':
      return handleGenerateMnemonic(sdk, request.payload)

    case 'VALIDATE_MNEMONIC':
      return handleValidateMnemonic(sdk, request.payload)

    case 'DERIVE_KEYS':
      return handleDeriveKeys(sdk, request.payload, request.id)

    case 'SIGN_TRANSACTION':
      return handleSignTransaction(sdk, request.payload)

    case 'SIGN_MESSAGE':
      return handleSignMessage(sdk, request.payload)

    case 'VERIFY_MESSAGE':
      return handleVerifyMessage(sdk, request.payload)

    case 'MUSIG2_GENERATE_NONCE':
      return handleMuSig2GenerateNonce(sdk, request.payload, request.id)

    case 'MUSIG2_PARTIAL_SIGN':
      return handleMuSig2PartialSign(sdk, request.payload)

    default:
      throw new Error(`Unknown request type: ${(request as any).type}`)
  }
}

// ============================================================================
// Operation Handlers
// ============================================================================

function handleGenerateMnemonic(
  sdk: typeof import('lotus-sdk').Bitcore,
  payload: { strength?: number },
): { mnemonic: string } {
  const Mnemonic = sdk.Mnemonic
  const mnemonic = new Mnemonic(payload.strength)
  return { mnemonic: mnemonic.toString() }
}

function handleValidateMnemonic(
  sdk: typeof import('lotus-sdk').Bitcore,
  payload: { mnemonic: string },
): { valid: boolean } {
  const Mnemonic = sdk.Mnemonic
  return { valid: Mnemonic.isValid(payload.mnemonic) }
}

function handleDeriveKeys(
  sdk: typeof import('lotus-sdk').Bitcore,
  payload: { mnemonic: string; addressType: 'p2pkh' | 'p2tr'; network: string },
  requestId: string,
): DerivedKeysPayload {
  const { Mnemonic, HDPrivateKey, Networks, Address, Script } = sdk
  const { getTweakPublicKey, buildPayToTaproot } = sdk

  const BIP44_PURPOSE = 44
  const BIP44_COINTYPE = 10605

  const network = Networks.get(payload.network)
  const mnemonic = new Mnemonic(payload.mnemonic)
  const hdPrivkey = HDPrivateKey.fromSeed(mnemonic.toSeed())

  const signingKey = hdPrivkey
    .deriveChild(BIP44_PURPOSE, true)
    .deriveChild(BIP44_COINTYPE, true)
    .deriveChild(0, true)
    .deriveChild(0)
    .deriveChild(0).privateKey

  let address: InstanceType<typeof Address>
  let script: InstanceType<typeof Script>

  if (payload.addressType === 'p2tr') {
    const internalPubKey = signingKey.publicKey
    const merkleRoot = Buffer.alloc(32)
    const commitment = getTweakPublicKey(internalPubKey, merkleRoot)
    address = Address.fromTaprootCommitment(commitment, network)
    script = buildPayToTaproot(commitment)
  } else {
    address = signingKey.toAddress(network)
    script = Script.fromAddress(address)
  }

  // Store private key in worker memory (never sent to main thread)
  storePrivateKey(requestId, signingKey)

  return {
    address: address.toXAddress(network),
    scriptPayload: script.getData().toString('hex'),
    publicKeyHex: signingKey.publicKey.toString(),
  }
}

function handleSignTransaction(
  sdk: typeof import('lotus-sdk').Bitcore,
  payload: {
    txHex: string
    privateKeyHex: string
    addressType: 'p2pkh' | 'p2tr'
    internalPubKeyHex?: string
    merkleRootHex?: string
  },
): SignedTransactionPayload {
  const { Transaction, PrivateKey } = sdk

  const tx = new Transaction(payload.txHex)
  const privateKey = new PrivateKey(payload.privateKeyHex)

  if (payload.addressType === 'p2tr') {
    tx.signSchnorr(privateKey)
  } else {
    tx.sign(privateKey)
  }

  return {
    signedTxHex: tx.toBuffer().toString('hex'),
    txid: tx.id,
  }
}

function handleSignMessage(
  sdk: typeof import('lotus-sdk').Bitcore,
  payload: { message: string; privateKeyHex: string },
): SignedMessagePayload {
  const { Message, PrivateKey } = sdk

  const message = new Message(payload.message)
  const privateKey = new PrivateKey(payload.privateKeyHex)
  const signature = message.sign(privateKey)

  return { signature }
}

function handleVerifyMessage(
  sdk: typeof import('lotus-sdk').Bitcore,
  payload: { message: string; address: string; signature: string },
): { valid: boolean } {
  const { Message } = sdk

  const message = new Message(payload.message)
  const valid = message.verify(payload.address, payload.signature)

  return { valid }
}

function handleMuSig2GenerateNonce(
  sdk: typeof import('lotus-sdk').Bitcore,
  payload: {
    privateKeyHex: string
    publicKeysHex: string[]
    messageHex: string
  },
  requestId: string,
): MuSig2NoncePayload {
  // MuSig2 nonce generation
  // This is a placeholder - actual implementation depends on lotus-sdk MuSig2 API
  const { PrivateKey, PublicKey } = sdk

  const privateKey = new PrivateKey(payload.privateKeyHex)
  const publicKeys = payload.publicKeysHex.map(hex => new PublicKey(hex))
  const message = Buffer.from(payload.messageHex, 'hex')

  // Generate random nonce secret
  const nonceSecret = Buffer.from(crypto.getRandomValues(new Uint8Array(32)))

  // Store nonce secret for later signing
  const nonceId = `nonce-${requestId}`
  nonceSecretStore.set(nonceId, nonceSecret)

  // Compute public nonce (simplified - actual MuSig2 is more complex)
  // This would use the actual MuSig2 library from lotus-sdk
  const publicNonce = privateKey.publicKey.toBuffer()

  return {
    publicNonceHex: publicNonce.toString('hex'),
    nonceId,
  }
}

function handleMuSig2PartialSign(
  sdk: typeof import('lotus-sdk').Bitcore,
  payload: {
    privateKeyHex: string
    publicKeysHex: string[]
    messageHex: string
    aggregatedNonceHex: string
    nonceSecretHex: string
  },
): MuSig2PartialSigPayload {
  // MuSig2 partial signing
  // This is a placeholder - actual implementation depends on lotus-sdk MuSig2 API
  const { PrivateKey } = sdk

  const privateKey = new PrivateKey(payload.privateKeyHex)

  // Actual MuSig2 partial signing would happen here
  // using the aggregated nonce and nonce secret

  return {
    partialSigHex: '00'.repeat(32), // Placeholder
  }
}

// Signal that worker is ready
self.postMessage({ type: 'READY' })
```

---

## 3. Vite Configuration for Web Worker

### Update: `nuxt.config.ts`

Configure Vite to properly bundle the Web Worker.

```ts
export default defineNuxtConfig({
  // ... existing config ...

  vite: {
    // ... existing vite config ...

    worker: {
      format: 'es',
      plugins: () => [
        // Include same polyfills as main bundle
        nodePolyfills({
          include: ['buffer', 'events', 'process', 'util', 'stream', 'crypto'],
          globals: {
            Buffer: true,
            global: true,
            process: true,
          },
        }),
      ],
    },
  },
})
```

---

## 4. Crypto Worker Composable

### File: `composables/useCryptoWorker.ts`

```ts
/**
 * Crypto Worker Composable
 *
 * Provides a promise-based interface to the crypto worker.
 * Operations are queued and resolved when the worker responds.
 */

import type {
  CryptoWorkerRequest,
  CryptoWorkerResponse,
  DerivedKeysPayload,
  SignedTransactionPayload,
  SignedMessagePayload,
} from '~/types/crypto-worker'

// Module-level worker instance (shared across all composable uses)
let worker: Worker | null = null
let workerReady = false
const pendingRequests = new Map<
  string,
  {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
  }
>()

/**
 * Initialize the crypto worker
 */
function initWorker(): Worker {
  if (worker) return worker

  // Create worker from bundled file
  worker = new Worker(new URL('../workers/crypto.worker.ts', import.meta.url), {
    type: 'module',
  })

  worker.onmessage = (
    event: MessageEvent<CryptoWorkerResponse | { type: 'READY' }>,
  ) => {
    const data = event.data

    if (data.type === 'READY') {
      workerReady = true
      console.log('[CryptoWorker] Ready')
      return
    }

    const pending = pendingRequests.get(data.id)
    if (!pending) {
      console.warn('[CryptoWorker] No pending request for id:', data.id)
      return
    }

    pendingRequests.delete(data.id)

    if (data.type === 'SUCCESS') {
      pending.resolve(data.payload)
    } else {
      pending.reject(new Error(data.payload.message))
    }
  }

  worker.onerror = error => {
    console.error('[CryptoWorker] Error:', error)
    // Reject all pending requests
    for (const [id, pending] of pendingRequests) {
      pending.reject(new Error('Worker error'))
      pendingRequests.delete(id)
    }
  }

  return worker
}

/**
 * Send a request to the worker and wait for response
 */
function sendRequest<T>(request: Omit<CryptoWorkerRequest, 'id'>): Promise<T> {
  const w = initWorker()
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, {
      resolve: resolve as (v: unknown) => void,
      reject,
    })

    w.postMessage({
      ...request,
      id,
    })

    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        reject(new Error('Crypto operation timed out'))
      }
    }, 30000)
  })
}

export function useCryptoWorker() {
  const isSupported = computed(() => typeof Worker !== 'undefined')
  const isReady = computed(() => workerReady)

  /**
   * Generate a new mnemonic seed phrase
   */
  async function generateMnemonic(
    strength?: 128 | 160 | 192 | 224 | 256,
  ): Promise<string> {
    if (!isSupported.value) {
      // Fallback to main thread
      const { Bitcore } = await import('lotus-sdk')
      return new Bitcore.Mnemonic(strength).toString()
    }

    const result = await sendRequest<{ mnemonic: string }>({
      type: 'GENERATE_MNEMONIC',
      payload: { strength },
    })
    return result.mnemonic
  }

  /**
   * Validate a mnemonic seed phrase
   */
  async function validateMnemonic(mnemonic: string): Promise<boolean> {
    if (!isSupported.value) {
      const { Bitcore } = await import('lotus-sdk')
      return Bitcore.Mnemonic.isValid(mnemonic)
    }

    const result = await sendRequest<{ valid: boolean }>({
      type: 'VALIDATE_MNEMONIC',
      payload: { mnemonic },
    })
    return result.valid
  }

  /**
   * Derive keys from mnemonic
   * Returns address and public key, private key stays in worker
   */
  async function deriveKeys(
    mnemonic: string,
    addressType: 'p2pkh' | 'p2tr',
    network: string,
  ): Promise<DerivedKeysPayload> {
    if (!isSupported.value) {
      throw new Error('Web Workers not supported - use main thread derivation')
    }

    return sendRequest<DerivedKeysPayload>({
      type: 'DERIVE_KEYS',
      payload: { mnemonic, addressType, network },
    })
  }

  /**
   * Sign a transaction
   */
  async function signTransaction(
    txHex: string,
    privateKeyHex: string,
    addressType: 'p2pkh' | 'p2tr',
    internalPubKeyHex?: string,
    merkleRootHex?: string,
  ): Promise<SignedTransactionPayload> {
    if (!isSupported.value) {
      throw new Error('Web Workers not supported - use main thread signing')
    }

    return sendRequest<SignedTransactionPayload>({
      type: 'SIGN_TRANSACTION',
      payload: {
        txHex,
        privateKeyHex,
        addressType,
        internalPubKeyHex,
        merkleRootHex,
      },
    })
  }

  /**
   * Sign a message
   */
  async function signMessage(
    message: string,
    privateKeyHex: string,
  ): Promise<string> {
    if (!isSupported.value) {
      const { Bitcore } = await import('lotus-sdk')
      const msg = new Bitcore.Message(message)
      const key = new Bitcore.PrivateKey(privateKeyHex)
      return msg.sign(key)
    }

    const result = await sendRequest<SignedMessagePayload>({
      type: 'SIGN_MESSAGE',
      payload: { message, privateKeyHex },
    })
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
    if (!isSupported.value) {
      const { Bitcore } = await import('lotus-sdk')
      const msg = new Bitcore.Message(message)
      return msg.verify(address, signature)
    }

    const result = await sendRequest<{ valid: boolean }>({
      type: 'VERIFY_MESSAGE',
      payload: { message, address, signature },
    })
    return result.valid
  }

  /**
   * Terminate the worker
   */
  function terminate(): void {
    if (worker) {
      worker.terminate()
      worker = null
      workerReady = false
    }
  }

  return {
    isSupported,
    isReady,
    generateMnemonic,
    validateMnemonic,
    deriveKeys,
    signTransaction,
    signMessage,
    verifyMessage,
    terminate,
  }
}
```

---

## 5. Integration with Wallet Store

### Update: `stores/wallet.ts`

Optionally use the crypto worker for heavy operations.

```ts
// At the top of the file, add flag for worker usage
const USE_CRYPTO_WORKER = true

// In createNewWallet():
async createNewWallet() {
  this.loadingMessage = 'Generating new wallet...'

  let mnemonic: string

  if (USE_CRYPTO_WORKER && typeof Worker !== 'undefined') {
    const { generateMnemonic } = useCryptoWorker()
    mnemonic = await generateMnemonic()
  } else {
    const Mnemonic = getMnemonic()
    mnemonic = new Mnemonic().toString()
  }

  await this.buildWalletFromMnemonic(mnemonic)
  await this.saveWalletState()
}

// In sendDraftTransaction(), optionally offload signing:
async sendDraftTransaction(): Promise<string> {
  // ... existing validation ...

  const tx = this._buildTransaction()
  if (!tx) throw new Error('Failed to build transaction')

  // Sign transaction
  if (USE_CRYPTO_WORKER && typeof Worker !== 'undefined') {
    const { signTransaction } = useCryptoWorker()
    const privateKeyHex = this.getPrivateKeyHex()
    if (!privateKeyHex) throw new Error('Private key not available')

    const result = await signTransaction(
      tx.toBuffer().toString('hex'),
      privateKeyHex,
      this.addressType,
      this._internalPubKey?.toString(),
      this._merkleRoot?.toString('hex')
    )

    // Use signed transaction
    const signedTx = new (getTransaction())(result.signedTxHex)
    const broadcastResult = await broadcastTransaction(result.signedTxHex)
    // ... rest of method
  } else {
    // Existing main-thread signing
    if (this.addressType === 'p2tr') {
      tx.signSchnorr(this._signingKey)
    } else {
      tx.sign(this._signingKey)
    }
    // ... rest of method
  }
}
```

---

## 6. Performance Comparison

### Expected Improvements

| Operation           | Main Thread       | With Worker      | Improvement   |
| ------------------- | ----------------- | ---------------- | ------------- |
| Mnemonic Generation | 100ms (blocks UI) | 100ms (no block) | UI responsive |
| Key Derivation      | 300ms (blocks UI) | 300ms (no block) | UI responsive |
| Transaction Signing | 100ms (blocks UI) | 100ms (no block) | UI responsive |
| Multiple Signatures | 500ms (blocks UI) | 500ms (parallel) | UI responsive |

### When to Use Worker vs Main Thread

**Use Worker:**

- Wallet creation (mnemonic + derivation)
- Transaction signing
- Batch operations
- MuSig2 multi-party signing

**Use Main Thread:**

- Quick validations (< 10ms)
- Single address validation
- Already-cached operations

---

## 7. Implementation Checklist

### Types

- [ ] Create `types/crypto-worker.ts` with message types
- [ ] Define request/response interfaces
- [ ] Define payload types for each operation

### Worker

- [ ] Create `workers/crypto.worker.ts`
- [ ] Implement SDK loading in worker
- [ ] Implement mnemonic generation
- [ ] Implement key derivation
- [ ] Implement transaction signing
- [ ] Implement message signing/verification
- [ ] Add MuSig2 operation stubs

### Composable

- [ ] Create `composables/useCryptoWorker.ts`
- [ ] Implement promise-based request/response
- [ ] Add timeout handling
- [ ] Add fallback for unsupported browsers
- [ ] Add worker termination

### Integration

- [ ] Update `nuxt.config.ts` for worker bundling
- [ ] Optionally integrate with `stores/wallet.ts`
- [ ] Add feature flag for worker usage
- [ ] Test fallback behavior

### Testing

- [ ] Test worker initialization
- [ ] Test mnemonic generation
- [ ] Test key derivation
- [ ] Test transaction signing
- [ ] Test UI responsiveness during operations
- [ ] Test fallback on unsupported browsers

---

## Security Considerations

### Private Key Handling

- Private keys can be kept in worker memory (never sent to main thread)
- Use `storePrivateKey()` pattern for secure storage
- Clear keys when wallet is locked

### Worker Isolation

- Workers run in separate context
- Cannot access DOM or main thread memory
- Communication only via `postMessage`

### Memory Cleanup

- Implement `terminate()` to destroy worker
- Clear sensitive data from worker memory on logout

---

## Notes

- Web Workers are supported in all modern browsers
- Worker code is bundled separately by Vite
- Consider SharedWorker for multi-tab scenarios (future enhancement)
- MuSig2 operations may need actual lotus-sdk MuSig2 API integration

---

## 8. Deprecation Strategy

This section documents the migration path from main-thread cryptographic operations to the Crypto Worker. Functions and modules that will be deprecated are listed here with their replacements.

### Migration Phases

| Phase       | Description                                                  | Timeline       |
| ----------- | ------------------------------------------------------------ | -------------- |
| **Phase A** | Add Crypto Worker alongside existing code                    | This phase     |
| **Phase B** | Mark old functions as `@deprecated`                          | This phase     |
| **Phase C** | Switch default to Crypto Worker (`USE_CRYPTO_WORKER = true`) | After testing  |
| **Phase D** | Remove deprecated code                                       | Future release |

### Deprecated: `plugins/bitcore.client.ts`

The Bitcore plugin currently loads the SDK on the main thread at app startup. This will be deprecated in favor of loading the SDK inside the Crypto Worker.

```ts
// plugins/bitcore.client.ts - TO BE DEPRECATED

/**
 * @deprecated Use `useCryptoWorker()` composable instead.
 * The Bitcore SDK should be loaded in the Crypto Worker to avoid
 * blocking the main thread during cryptographic operations.
 *
 * This plugin will be removed in a future release.
 *
 * Migration:
 * - For mnemonic generation: `useCryptoWorker().generateMnemonic()`
 * - For key derivation: `useCryptoWorker().deriveKeys()`
 * - For transaction signing: `useCryptoWorker().signTransaction()`
 * - For message signing: `useCryptoWorker().signMessage()`
 */
export default defineNuxtPlugin(async () => {
  // ... existing implementation
})

/**
 * @deprecated Use `useCryptoWorker()` composable instead.
 */
export function getBitcore(): typeof BitcoreTypes | null {
  console.warn(
    '[DEPRECATED] getBitcore() is deprecated. Use useCryptoWorker() instead.',
  )
  return sdkInstance
}

/**
 * @deprecated Use `useCryptoWorker().isReady` instead.
 */
export function isBitcoreLoaded(): boolean {
  console.warn(
    '[DEPRECATED] isBitcoreLoaded() is deprecated. Use useCryptoWorker().isReady instead.',
  )
  return sdkInstance !== null
}

/**
 * @deprecated Use `useCryptoWorker()` composable instead.
 */
export async function ensureBitcore(): Promise<typeof BitcoreTypes> {
  console.warn(
    '[DEPRECATED] ensureBitcore() is deprecated. Use useCryptoWorker() instead.',
  )
  return loadBitcoreSDK()
}
```

### Deprecated: `composables/useBitcore.ts`

The useBitcore composable provides reactive access to the SDK on the main thread. This will be deprecated.

```ts
// composables/useBitcore.ts - TO BE DEPRECATED

/**
 * @deprecated Use `useCryptoWorker()` composable instead.
 *
 * This composable loads the Bitcore SDK on the main thread, which blocks
 * the UI during cryptographic operations. The Crypto Worker provides the
 * same functionality without blocking.
 *
 * Migration:
 * - `useBitcore().Mnemonic` → `useCryptoWorker().generateMnemonic()`
 * - `useBitcore().PrivateKey` → Keys derived via `useCryptoWorker().deriveKeys()`
 * - `useBitcore().Transaction` → `useCryptoWorker().signTransaction()`
 * - `useBitcore().Message` → `useCryptoWorker().signMessage()`
 */
export function useBitcore() {
  console.warn(
    '[DEPRECATED] useBitcore() is deprecated. Use useCryptoWorker() instead.',
  )
  // ... existing implementation
}
```

### Deprecated: `stores/wallet.ts` - Getter Functions

The module-level getter functions that access Bitcore classes will be deprecated.

```ts
// stores/wallet.ts - FUNCTIONS TO BE DEPRECATED

/**
 * @deprecated Use `useCryptoWorker().generateMnemonic()` instead.
 */
function getMnemonic() {
  console.warn(
    '[DEPRECATED] getMnemonic() is deprecated. Use useCryptoWorker().generateMnemonic() instead.',
  )
  return getBitcoreSDK()?.Mnemonic
}

/**
 * @deprecated Use `useCryptoWorker().deriveKeys()` instead.
 */
function getHDPrivateKey() {
  console.warn(
    '[DEPRECATED] getHDPrivateKey() is deprecated. Use useCryptoWorker().deriveKeys() instead.',
  )
  return getBitcoreSDK()?.HDPrivateKey
}

/**
 * @deprecated Use `useCryptoWorker().signTransaction()` instead.
 */
function getTransaction() {
  console.warn(
    '[DEPRECATED] getTransaction() is deprecated. Use useCryptoWorker().signTransaction() instead.',
  )
  return getBitcoreSDK()?.Transaction
}

/**
 * @deprecated Use `useCryptoWorker().signMessage()` instead.
 */
function getMessage() {
  console.warn(
    '[DEPRECATED] getMessage() is deprecated. Use useCryptoWorker().signMessage() instead.',
  )
  return getBitcoreSDK()?.Message
}

/**
 * @deprecated Address validation should use useCryptoWorker() or remain on main thread for quick checks.
 */
function getAddress() {
  // Note: Quick validations may remain on main thread
  return getBitcoreSDK()?.Address
}

/**
 * @deprecated Script operations should be handled by the Crypto Worker.
 */
function getScript() {
  console.warn('[DEPRECATED] getScript() is deprecated.')
  return getBitcoreSDK()?.Script
}
```

### Deprecated: `stores/wallet.ts` - Methods

The following wallet store methods perform cryptographic operations on the main thread and will be refactored:

| Method                      | Current Behavior                  | New Behavior               | Deprecation       |
| --------------------------- | --------------------------------- | -------------------------- | ----------------- |
| `createNewWallet()`         | Generates mnemonic on main thread | Delegates to Crypto Worker | Refactor in place |
| `buildWalletFromMnemonic()` | Derives keys on main thread       | Delegates to Crypto Worker | Refactor in place |
| `sendDraftTransaction()`    | Signs on main thread              | Delegates to Crypto Worker | Refactor in place |
| `signMessage()`             | Signs on main thread              | Delegates to Crypto Worker | Mark deprecated   |
| `verifyMessage()`           | Verifies on main thread           | Delegates to Crypto Worker | Mark deprecated   |
| `isValidSeedPhrase()`       | Validates on main thread          | Delegates to Crypto Worker | Mark deprecated   |
| `isValidAddress()`          | Validates on main thread          | Keep (fast operation)      | No change         |

```ts
// stores/wallet.ts - METHODS TO BE DEPRECATED

/**
 * @deprecated Use `useCryptoWorker().signMessage()` instead.
 * This method will be removed in a future release.
 */
signMessage(text: string): string {
  console.warn('[DEPRECATED] walletStore.signMessage() is deprecated. Use useCryptoWorker().signMessage() instead.')
  // ... existing implementation as fallback
}

/**
 * @deprecated Use `useCryptoWorker().verifyMessage()` instead.
 * This method will be removed in a future release.
 */
verifyMessage(text: string, address: string, signature: string): boolean {
  console.warn('[DEPRECATED] walletStore.verifyMessage() is deprecated. Use useCryptoWorker().verifyMessage() instead.')
  // ... existing implementation as fallback
}

/**
 * @deprecated Use `useCryptoWorker().validateMnemonic()` instead.
 * This method will be removed in a future release.
 */
isValidSeedPhrase(seedPhrase: string): boolean {
  console.warn('[DEPRECATED] walletStore.isValidSeedPhrase() is deprecated. Use useCryptoWorker().validateMnemonic() instead.')
  // ... existing implementation as fallback
}
```

### Deprecated: Private Key Storage Pattern

Currently, `stores/wallet.ts` stores the private key in a module-level variable:

```ts
// CURRENT (to be deprecated)
let _signingKey: InstanceType<typeof PrivateKey> | null = null
```

This will be deprecated in favor of keeping private keys in the Crypto Worker memory:

```ts
// NEW PATTERN
// Private keys are stored in the Crypto Worker and never exposed to the main thread.
// The wallet store only holds the public key and address.

interface WalletState {
  // ... existing fields ...

  /**
   * @deprecated Private key storage on main thread is deprecated.
   * Private keys are now stored in the Crypto Worker.
   */
  // _signingKey is removed

  /** Public key hex - safe to store on main thread */
  publicKeyHex: string

  /** Reference ID for the private key in the Crypto Worker */
  privateKeyRef: string | null
}
```

### Migration Checklist

#### Phase A: Add Crypto Worker (This Phase)

- [ ] Create `workers/crypto.worker.ts`
- [ ] Create `composables/useCryptoWorker.ts`
- [ ] Create `types/crypto-worker.ts`
- [ ] Add `USE_CRYPTO_WORKER` feature flag (default: `false`)

#### Phase B: Mark Deprecations (This Phase)

- [ ] Add `@deprecated` JSDoc to `plugins/bitcore.client.ts` exports
- [ ] Add `@deprecated` JSDoc to `composables/useBitcore.ts`
- [ ] Add `@deprecated` JSDoc to getter functions in `stores/wallet.ts`
- [ ] Add `@deprecated` JSDoc to `signMessage()`, `verifyMessage()`, `isValidSeedPhrase()`
- [ ] Add console warnings in deprecated functions (dev mode only)

#### Phase C: Switch Default (After Testing)

- [ ] Set `USE_CRYPTO_WORKER = true`
- [ ] Update documentation to recommend Crypto Worker
- [ ] Monitor for issues in production

#### Phase D: Remove Deprecated Code (Future Release)

- [ ] Remove `plugins/bitcore.client.ts`
- [ ] Remove `composables/useBitcore.ts`
- [ ] Remove getter functions from `stores/wallet.ts`
- [ ] Remove deprecated methods from wallet store
- [ ] Remove `_signingKey` from wallet state
- [ ] Remove `USE_CRYPTO_WORKER` flag (always use worker)

### Console Warning Implementation

To help developers migrate, deprecated functions should emit warnings in development:

```ts
// utils/deprecation.ts

const warned = new Set<string>()

/**
 * Emit a deprecation warning (once per function)
 */
export function deprecationWarning(name: string, replacement: string): void {
  if (process.env.NODE_ENV === 'development' && !warned.has(name)) {
    warned.add(name)
    console.warn(
      `[DEPRECATED] ${name} is deprecated. Use ${replacement} instead. ` +
        `This function will be removed in a future release.`,
    )
  }
}
```

### Backward Compatibility

During the migration period:

1. **Feature Flag**: `USE_CRYPTO_WORKER` controls which implementation is used
2. **Fallback**: If Crypto Worker fails or is unsupported, fall back to main thread
3. **Gradual Migration**: Components can migrate one at a time
4. **No Breaking Changes**: Deprecated functions continue to work

---

## 9. Implementation Checklist (Updated)

### Types

- [ ] Create `types/crypto-worker.ts` with message types
- [ ] Define request/response interfaces
- [ ] Define payload types for each operation

### Worker

- [ ] Create `workers/crypto.worker.ts`
- [ ] Implement SDK loading in worker
- [ ] Implement mnemonic generation
- [ ] Implement key derivation
- [ ] Implement transaction signing
- [ ] Implement message signing/verification
- [ ] Add MuSig2 operation stubs

### Composable

- [ ] Create `composables/useCryptoWorker.ts`
- [ ] Implement promise-based request/response
- [ ] Add timeout handling
- [ ] Add fallback for unsupported browsers
- [ ] Add worker termination

### Integration

- [ ] Update `nuxt.config.ts` for worker bundling
- [ ] Add `USE_CRYPTO_WORKER` feature flag to `stores/wallet.ts`
- [ ] Integrate with `createNewWallet()`
- [ ] Integrate with `buildWalletFromMnemonic()`
- [ ] Integrate with `sendDraftTransaction()`
- [ ] Test fallback behavior

### Deprecation (Phase B)

- [ ] Create `utils/deprecation.ts` helper
- [ ] Add `@deprecated` to `plugins/bitcore.client.ts`
- [ ] Add `@deprecated` to `composables/useBitcore.ts`
- [ ] Add `@deprecated` to getter functions in `stores/wallet.ts`
- [ ] Add `@deprecated` to `signMessage()`, `verifyMessage()`, `isValidSeedPhrase()`
- [ ] Add deprecation warnings (dev mode)

### Testing

- [ ] Test worker initialization
- [ ] Test mnemonic generation
- [ ] Test key derivation
- [ ] Test transaction signing
- [ ] Test UI responsiveness during operations
- [ ] Test fallback on unsupported browsers
- [ ] Test deprecation warnings appear in dev mode

---

## Next Steps

After completing this phase, the background service worker plan is complete. Consider:

1. Performance profiling to measure actual improvements
2. SharedWorker for multi-tab wallet instances
3. WebAssembly for even faster crypto operations
