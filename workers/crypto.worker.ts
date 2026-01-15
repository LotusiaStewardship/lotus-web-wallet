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
 * Access Pattern:
 * - Uses STATIC IMPORTS only (workers cannot access Nuxt plugins)
 * - Self-contained SDK access via direct import from xpi-ts
 * - Communicates with main thread via postMessage
 *
 * The Bitcore SDK is loaded once in the worker and reused for all operations.
 *
 * Note: This worker is behind a feature flag (USE_CRYPTO_WORKER) and
 * should be thoroughly tested before enabling in production.
 */

/// <reference lib="webworker" />
import { BIP44_PURPOSE, BIP44_COINTYPE } from '~/utils/constants'
import {
  Mnemonic,
  HDPrivateKey,
  Networks,
  Address,
  Script,
  Transaction,
  PrivateKey,
  PublicKey,
  tweakPublicKey,
  buildPayToTaproot,
  Message,
  Hash,
} from 'xpi-ts/lib/bitcore'
import type { NetworkName } from 'xpi-ts/lib/bitcore/networks'
import type { AddressType } from '~/utils/types/wallet'
import type {
  CryptoWorkerRequest,
  CryptoWorkerResponse,
  KeysDerivedResponse,
  P2TRCommitmentDerivedResponse,
  TransactionSignedResponse,
  MessageSignedResponse,
  CryptoWorkerStatus,
} from '~/utils/types/crypto-worker'

// This should be incremented when the worker's behavior or supported
// operations change
const WORKER_VERSION = '2.0.0'

// ============================================================================
// Worker Initialization
// ============================================================================

// Initialize SDK and signal ready
;(async () => {
  try {
    const status: CryptoWorkerStatus = {
      ready: true,
      version: WORKER_VERSION,
      supportedOperations: [
        'GENERATE_MNEMONIC',
        'VALIDATE_MNEMONIC',
        'DERIVE_KEYS',
        'DERIVE_P2TR_COMMITMENT',
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
    switch (type) {
      case 'GENERATE_MNEMONIC':
        await handleGenerateMnemonic(requestId, request.payload.strength)
        break

      case 'VALIDATE_MNEMONIC':
        await handleValidateMnemonic(requestId, request.payload.mnemonic)
        break

      case 'DERIVE_P2TR_COMMITMENT':
        await handleGenerateP2TRCommitment(
          requestId,
          request.payload.internalPubKeyHex,
        )
        break

      case 'DERIVE_KEYS':
        await handleDeriveKeys(
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
          requestId,
          request.payload.message,
          request.payload.privateKey,
        )
        break

      case 'VERIFY_MESSAGE':
        await handleVerifyMessage(
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

/**
 * Generate a P2TR (Pay-to-Taproot) commitment from an internal public key.
 * Uses an empty merkle root for key-path-only spending.
 *
 * @param requestId - Unique identifier for correlating request/response
 * @param internalPubKeyHex - Internal public key as hex string
 */
async function handleGenerateP2TRCommitment(
  requestId: string,
  internalPubKeyHex: string,
): Promise<void> {
  const internalPubKey = new PublicKey(internalPubKeyHex)
  const merkleRoot = Buffer.alloc(32)
  const commitment = tweakPublicKey(internalPubKey, merkleRoot)

  const payload: P2TRCommitmentDerivedResponse['payload'] = {
    commitmentHex: commitment.toString(),
  }

  const response: CryptoWorkerResponse = {
    type: 'P2TR_COMMITMENT_DERIVED',
    payload,
    requestId,
  }
  self.postMessage(response)
}

async function handleGenerateMnemonic(
  requestId: string,
  strength?: 128 | 160 | 192 | 224 | 256,
): Promise<void> {
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
  requestId: string,
  mnemonic: string,
): Promise<void> {
  const valid = Mnemonic.isValid(mnemonic)

  const response: CryptoWorkerResponse = {
    type: 'MNEMONIC_VALIDATED',
    payload: { valid },
    requestId,
  }
  self.postMessage(response)
}

async function handleDeriveKeys(
  requestId: string,
  mnemonicPhrase: string,
  addressType: AddressType,
  networkName: NetworkName,
  accountIndex: number = 0,
  addressIndex: number = 0,
  isChange: boolean = false,
): Promise<void> {
  const network = Networks.get(networkName)
  if (!network) {
    throw new Error(`Unknown network: ${networkName}`)
  }
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

  if (addressType === 'p2tr-commitment') {
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
  requestId: string,
  txHex: string,
  utxos: Array<{ outpoint: string; satoshis: number; scriptHex: string }>,
  privateKeyStr: string,
  addressType: AddressType,
  internalPubKeyHex?: string,
  merkleRootHex?: string,
): Promise<void> {
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

  if (addressType === 'p2tr-commitment') {
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
  requestId: string,
  messageText: string,
  privateKeyStr: string,
): Promise<void> {
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
  requestId: string,
  messageText: string,
  address: string,
  signature: string,
): Promise<void> {
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
