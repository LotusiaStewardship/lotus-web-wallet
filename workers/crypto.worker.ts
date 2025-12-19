/**
 * Crypto Worker
 *
 * Web Worker for offloading CPU-intensive cryptographic operations from the main thread.
 * This improves UI responsiveness during heavy crypto operations like:
 * - Mnemonic generation and validation
 * - HD key derivation
 * - Transaction signing (ECDSA and Schnorr)
 * - Message signing and verification
 *
 * The Bitcore SDK is loaded once in the worker and reused for all operations.
 *
 * Note: This worker is behind a feature flag (USE_CRYPTO_WORKER) and
 * should be thoroughly tested before enabling in production.
 */

/// <reference lib="webworker" />

import type {
  CryptoWorkerRequest,
  CryptoWorkerResponse,
  AddressType,
  KeysDerivedResponse,
  TransactionSignedResponse,
  MessageSignedResponse,
  CryptoWorkerStatus,
} from '~/types/crypto-worker'

declare let self: DedicatedWorkerGlobalScope

const WORKER_VERSION = '2.0.0'

// ============================================================================
// SDK Loading
// ============================================================================

type BitcoreSDK = typeof import('lotus-sdk').Bitcore
let Bitcore: BitcoreSDK | null = null
let sdkLoading: Promise<BitcoreSDK> | null = null
let sdkReady = false

async function ensureSDK(): Promise<BitcoreSDK> {
  if (Bitcore) return Bitcore

  if (!sdkLoading) {
    sdkLoading = (async () => {
      try {
        const sdk = await import('lotus-sdk')
        Bitcore = sdk.Bitcore as BitcoreSDK
        sdkReady = true
        console.log('[CryptoWorker] SDK loaded successfully')
        return Bitcore
      } catch (error) {
        console.error('[CryptoWorker] Failed to load SDK:', error)
        throw error
      }
    })()
  }

  return sdkLoading
}

// ============================================================================
// Constants
// ============================================================================

const BIP44_PURPOSE = 44
const BIP44_COINTYPE = 10605

// ============================================================================
// Worker Initialization
// ============================================================================

// Initialize SDK and signal ready
;(async () => {
  try {
    await ensureSDK()

    const status: CryptoWorkerStatus = {
      ready: true,
      version: WORKER_VERSION,
      supportedOperations: [
        'GENERATE_MNEMONIC',
        'VALIDATE_MNEMONIC',
        'DERIVE_KEYS',
        'SIGN_TRANSACTION',
        'SIGN_MESSAGE',
        'VERIFY_MESSAGE',
        'HASH_DATA',
      ],
    }

    self.postMessage({
      type: 'WORKER_READY',
      payload: status,
    })
  } catch (error) {
    // SDK failed to load - worker is not ready
    self.postMessage({
      type: 'WORKER_READY',
      payload: {
        ready: false,
        version: WORKER_VERSION,
        supportedOperations: [],
      },
    })
  }
})()

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = async (event: MessageEvent<CryptoWorkerRequest>) => {
  const request = event.data
  const { type, requestId } = request

  try {
    // Ensure SDK is loaded before processing
    const sdk = await ensureSDK()

    switch (type) {
      case 'GENERATE_MNEMONIC':
        await handleGenerateMnemonic(sdk, requestId, request.payload.strength)
        break

      case 'VALIDATE_MNEMONIC':
        await handleValidateMnemonic(sdk, requestId, request.payload.mnemonic)
        break

      case 'DERIVE_KEYS':
        await handleDeriveKeys(
          sdk,
          requestId,
          request.payload.mnemonic,
          request.payload.addressType,
          request.payload.network,
          request.payload.accountIndex ?? 0,
          request.payload.addressIndex ?? 0,
          request.payload.isChange ?? false,
        )
        break

      case 'SIGN_TRANSACTION':
        await handleSignTransaction(
          sdk,
          requestId,
          request.payload.txHex,
          request.payload.utxos,
          request.payload.privateKey,
          request.payload.addressType,
          request.payload.internalPubKeyHex,
          request.payload.merkleRootHex,
        )
        break

      case 'SIGN_MESSAGE':
        await handleSignMessage(
          sdk,
          requestId,
          request.payload.message,
          request.payload.privateKey,
        )
        break

      case 'VERIFY_MESSAGE':
        await handleVerifyMessage(
          sdk,
          requestId,
          request.payload.message,
          request.payload.address,
          request.payload.signature,
        )
        break

      case 'HASH_DATA':
        await handleHashData(
          requestId,
          request.payload.data,
          request.payload.algorithm,
        )
        break

      default:
        sendError(requestId, `Unknown operation type: ${type}`, 'UNKNOWN_TYPE')
    }
  } catch (error) {
    sendError(
      requestId,
      error instanceof Error ? error.message : 'Unknown error',
      'CRYPTO_ERROR',
    )
  }
}

// ============================================================================
// Operation Handlers
// ============================================================================

async function handleGenerateMnemonic(
  sdk: BitcoreSDK,
  requestId: string,
  strength?: 128 | 160 | 192 | 224 | 256,
): Promise<void> {
  const { Mnemonic } = sdk
  const mnemonic = new Mnemonic(strength)

  const response: CryptoWorkerResponse = {
    type: 'MNEMONIC_GENERATED',
    payload: {
      mnemonic: mnemonic.toString(),
    },
    requestId,
  }
  self.postMessage(response)
}

async function handleValidateMnemonic(
  sdk: BitcoreSDK,
  requestId: string,
  mnemonic: string,
): Promise<void> {
  const { Mnemonic } = sdk
  const valid = Mnemonic.isValid(mnemonic)

  const response: CryptoWorkerResponse = {
    type: 'MNEMONIC_VALIDATED',
    payload: { valid },
    requestId,
  }
  self.postMessage(response)
}

async function handleDeriveKeys(
  sdk: BitcoreSDK,
  requestId: string,
  mnemonicPhrase: string,
  addressType: AddressType,
  networkName: string,
  accountIndex: number = 0,
  addressIndex: number = 0,
  isChange: boolean = false,
): Promise<void> {
  const {
    Mnemonic,
    HDPrivateKey,
    Networks,
    Address,
    Script,
    tweakPublicKey,
    buildPayToTaproot,
  } = sdk

  const network = Networks.get(networkName)
  const mnemonic = new Mnemonic(mnemonicPhrase)
  const hdPrivkey = HDPrivateKey.fromSeed(mnemonic.toSeed())

  // Build BIP44 derivation path: m/44'/10605'/account'/change/addressIndex
  const change = isChange ? 1 : 0
  const derivationPath = `m/${BIP44_PURPOSE}'/${BIP44_COINTYPE}'/${accountIndex}'/${change}/${addressIndex}`

  // Derive signing key using full BIP44 path with parameters
  const signingKey = hdPrivkey
    .deriveChild(BIP44_PURPOSE, true)
    .deriveChild(BIP44_COINTYPE, true)
    .deriveChild(accountIndex, true)
    .deriveChild(change)
    .deriveChild(addressIndex).privateKey

  let address: InstanceType<typeof Address>
  let script: InstanceType<typeof Script>
  let internalPubKeyHex: string | undefined
  let merkleRootHex: string | undefined

  if (addressType === 'p2tr') {
    // Taproot (P2TR) address generation
    const internalPubKey = signingKey.publicKey
    const merkleRoot = Buffer.alloc(32) // Empty merkle root for key-path-only
    const commitment = tweakPublicKey(internalPubKey, merkleRoot)
    address = Address.fromTaprootCommitment(commitment, network)
    script = buildPayToTaproot(commitment)
    internalPubKeyHex = internalPubKey.toString()
    merkleRootHex = merkleRoot.toString('hex')
  } else {
    // Legacy P2PKH address
    address = signingKey.toAddress(network)
    script = Script.fromAddress(address)
  }

  const payload: KeysDerivedResponse['payload'] = {
    address: address.toXAddress(network),
    scriptPayload: script.getData().toString('hex'),
    publicKeyHex: signingKey.publicKey.toString(),
    privateKeyHex: signingKey.toString(),
    internalPubKeyHex,
    merkleRootHex,
    derivationPath,
    accountIndex,
    addressIndex,
    isChange,
  }

  const response: CryptoWorkerResponse = {
    type: 'KEYS_DERIVED',
    payload,
    requestId,
  }
  self.postMessage(response)
}

async function handleSignTransaction(
  sdk: BitcoreSDK,
  requestId: string,
  txHex: string,
  utxos: Array<{ outpoint: string; satoshis: number; scriptHex: string }>,
  privateKeyStr: string,
  addressType: AddressType,
  internalPubKeyHex?: string,
  merkleRootHex?: string,
): Promise<void> {
  const { Transaction, PrivateKey, Script, PublicKey } = sdk

  // Deserialize the transaction to get outputs and locktime
  const deserializedTx = new Transaction(txHex)

  // Rebuild the transaction properly using tx.from() to create correct input types
  const tx = new Transaction()
  tx.version = deserializedTx.version
  tx.nLockTime = deserializedTx.nLockTime

  // Reconstruct Taproot metadata if provided
  const internalPubKey = internalPubKeyHex
    ? new PublicKey(internalPubKeyHex)
    : undefined
  const merkleRoot = merkleRootHex
    ? Buffer.from(merkleRootHex, 'hex')
    : undefined

  // Add inputs using tx.from() which creates the correct input type (TaprootInput, etc.)
  for (const utxo of utxos) {
    const [txid, voutStr] = utxo.outpoint.split('_')
    const vout = parseInt(voutStr, 10)

    tx.from({
      txid,
      outputIndex: vout,
      script: new Script(Buffer.from(utxo.scriptHex, 'hex')),
      satoshis: utxo.satoshis,
      internalPubKey,
      merkleRoot,
    })
  }

  // Copy outputs from deserialized transaction
  for (const output of deserializedTx.outputs) {
    tx.addOutput(output)
  }

  const privateKey = new PrivateKey(privateKeyStr)

  if (addressType === 'p2tr') {
    tx.signSchnorr(privateKey)
  } else {
    tx.sign(privateKey)
  }

  const payload: TransactionSignedResponse['payload'] = {
    signedTxHex: tx.toBuffer().toString('hex'),
    txid: tx.id,
  }

  const response: CryptoWorkerResponse = {
    type: 'TRANSACTION_SIGNED',
    payload,
    requestId,
  }
  self.postMessage(response)
}

async function handleSignMessage(
  sdk: BitcoreSDK,
  requestId: string,
  messageText: string,
  privateKeyStr: string,
): Promise<void> {
  const { Message, PrivateKey } = sdk

  const message = new Message(messageText)
  const privateKey = new PrivateKey(privateKeyStr)
  const signature = message.sign(privateKey)

  const payload: MessageSignedResponse['payload'] = { signature }

  const response: CryptoWorkerResponse = {
    type: 'MESSAGE_SIGNED',
    payload,
    requestId,
  }
  self.postMessage(response)
}

async function handleVerifyMessage(
  sdk: BitcoreSDK,
  requestId: string,
  messageText: string,
  address: string,
  signature: string,
): Promise<void> {
  const { Message } = sdk

  const message = new Message(messageText)
  let valid = false

  try {
    valid = message.verify(address, signature)
  } catch {
    // Invalid signature format or verification failed
    valid = false
  }

  const response: CryptoWorkerResponse = {
    type: 'MESSAGE_VERIFIED',
    payload: { valid },
    requestId,
  }
  self.postMessage(response)
}

async function handleHashData(
  requestId: string,
  data: string,
  algorithm: 'sha256' | 'ripemd160' | 'hash160' | 'sha256d',
): Promise<void> {
  let hash: string

  // Convert hex string to Buffer
  const dataBuffer = Buffer.from(data, 'hex')

  // Use SDK's Hash utilities for all algorithms (consistent and reliable)
  if (!Bitcore) {
    throw new Error('SDK not loaded - cannot perform hash operation')
  }

  const { Hash } = Bitcore

  switch (algorithm) {
    case 'sha256': {
      hash = Hash.sha256(dataBuffer).toString('hex')
      break
    }
    case 'sha256d': {
      // Double SHA-256
      hash = Hash.sha256sha256(dataBuffer).toString('hex')
      break
    }
    case 'ripemd160': {
      hash = Hash.ripemd160(dataBuffer).toString('hex')
      break
    }
    case 'hash160': {
      // HASH160 = RIPEMD160(SHA256(data))
      hash = Hash.sha256ripemd160(dataBuffer).toString('hex')
      break
    }
    default:
      throw new Error(`Unknown hash algorithm: ${algorithm}`)
  }

  const response: CryptoWorkerResponse = {
    type: 'DATA_HASHED',
    payload: { hash },
    requestId,
  }
  self.postMessage(response)
}

// ============================================================================
// Utility Functions
// ============================================================================

function sendError(requestId: string, message: string, code?: string): void {
  const response: CryptoWorkerResponse = {
    type: 'ERROR',
    payload: { message, code },
    requestId,
  }
  self.postMessage(response)
}
