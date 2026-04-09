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
  Message,
  Hash,
  BN,
  Point,
  BufferUtil,
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
  PayloadEncryptedResponse,
  PayloadDecryptedResponse,
  SharedKeyDerivedResponse,
  StampKeysDerivedResponse,
  StampPublicKeyDerivedResponse,
  Sha256HmacResponse,
  StealthPublicKeyDerivedResponse,
  StealthPrivateKeyDerivedResponse,
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
        'ENCRYPT_PAYLOAD',
        'DECRYPT_PAYLOAD',
        'DERIVE_SHARED_KEY',
        'DERIVE_STAMP_KEYS',
        'DERIVE_STAMP_PUBLIC_KEY',
        'SHA256_HMAC',
        'DERIVE_STEALTH_PUBLIC_KEY',
        'DERIVE_STEALTH_PRIVATE_KEY',
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

      case 'ENCRYPT_PAYLOAD':
        await handleEncryptPayload(
          requestId,
          request.payload.data,
          request.payload.sharedKey,
        )
        break

      case 'DECRYPT_PAYLOAD':
        await handleDecryptPayload(
          requestId,
          request.payload.data,
          request.payload.sharedKey,
        )
        break

      case 'DERIVE_SHARED_KEY':
        await handleDeriveSharedKey(
          requestId,
          request.payload.sourcePrivateKey,
          request.payload.destinationPublicKey,
          request.payload.salt,
        )
        break

      case 'DERIVE_STAMP_KEYS':
        await handleDeriveStampKeys(
          requestId,
          request.payload.payloadDigest,
          request.payload.destinationPrivateKey,
        )
        break

      case 'DERIVE_STAMP_PUBLIC_KEY':
        await handleDeriveStampPublicKey(
          requestId,
          request.payload.payloadDigest,
          request.payload.destinationPublicKey,
        )
        break

      case 'SHA256_HMAC':
        await handleSha256Hmac(
          requestId,
          request.payload.data,
          request.payload.key,
        )
        break

      case 'DERIVE_STEALTH_PUBLIC_KEY':
        await handleDeriveStealthPublicKey(
          requestId,
          request.payload.ephemeralPrivateKey,
          request.payload.destinationPublicKey,
        )
        break

      case 'DERIVE_STEALTH_PRIVATE_KEY':
        await handleDeriveStealthPrivateKey(
          requestId,
          request.payload.ephemeralPublicKey,
          request.payload.destinationPrivateKey,
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
  const merkleRoot = BufferUtil.alloc(32)
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
    const merkleRoot = BufferUtil.alloc(32) // Empty merkle root for key-path-only
    const commitment = tweakPublicKey(internalPubKey, merkleRoot)
    address = Address.fromTaprootCommitment(commitment, network)
    script = Script.buildTaprootOut(commitment)
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

/**
 * Sign a transaction with the provided private key.
 * Supports both legacy (P2PKH) and Taproot (P2TR) address types.
 *
 * For P2PKH inputs, standard ECDSA signatures are generated.
 * For Taproot inputs, Schnorr signatures are used with key-path spending,
 * requiring the internal public key and merkle root for proper tweak computation.
 *
 * The transaction is rebuilt from the hex representation to ensure proper
 * input types are created via tx.from(), which is necessary for the signing
 * logic to correctly identify Taproot vs legacy inputs.
 *
 * @param requestId - Unique identifier for correlating request/response
 * @param txHex - Serialized unsigned transaction as hex string
 * @param utxos - Array of UTXOs being spent, each containing:
 *   - outpoint: Transaction ID and output index as "txid_vout"
 *   - satoshis: Value of the UTXO in satoshis
 *   - scriptHex: Locking script of the UTXO as hex
 * @param privateKeyStr - Private key as hex string for signing
 * @param addressType - Type of address ('p2pkh' or 'p2tr-commitment')
 * @param internalPubKeyHex - Internal public key hex for Taproot signing (required for p2tr-commitment)
 * @param merkleRootHex - Merkle root hex for Taproot script tree (required for p2tr-commitment, typically all zeros for key-path-only)
 */
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
    ? BufferUtil.from(merkleRootHex, 'hex')
    : undefined

  // Add inputs using tx.from() which creates the correct input type (TaprootInput, etc.)
  for (const utxo of utxos) {
    const [txid, voutStr] = utxo.outpoint.split('_')
    const vout = parseInt(voutStr, 10)

    tx.from({
      txid,
      outputIndex: vout,
      script: Script.fromBuffer(BufferUtil.from(utxo.scriptHex, 'hex')),
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

/**
 * Sign a message using a private key.
 * Uses the Bitcoin message signing standard (BIP-137 compatible).
 *
 * @param requestId - Unique identifier for correlating request/response
 * @param messageText - The message to sign
 * @param privateKeyStr - Private key as hex string or WIF format
 */
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

/**
 * Verify a signed message against an address.
 * Uses the Bitcoin message signing standard (BIP-137 compatible).
 *
 * @param requestId - Unique identifier for correlating request/response
 * @param messageText - The original message that was signed
 * @param address - The address that allegedly signed the message
 * @param signature - The signature to verify
 */
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

/**
 * Hash data using various algorithms.
 * Supports SHA-256, RIPEMD-160, HASH160 (SHA-256 + RIPEMD-160), and double SHA-256.
 *
 * @param requestId - Unique identifier for correlating request/response
 * @param data - Data to hash as hex string
 * @param algorithm - Hash algorithm to use
 */
async function handleHashData(
  requestId: string,
  data: string,
  algorithm: 'sha256' | 'ripemd160' | 'hash160' | 'sha256d',
): Promise<void> {
  let hash: string

  // Convert hex string to Buffer
  const dataBuffer = BufferUtil.from(data, 'hex')

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
// CashWeb Operation Handlers
// ============================================================================

/**
 * Encrypt payload data using AES-CBC via Web Crypto API.
 * Shared key is split: first 16 bytes = IV, remaining bytes = encryption key.
 *
 * @param requestId - Unique identifier for correlating request/response
 * @param dataHex - Plaintext data as hex string
 * @param sharedKeyHex - Shared key as hex string (first 16 bytes used as IV)
 */
async function handleEncryptPayload(
  requestId: string,
  dataHex: string,
  sharedKeyHex: string,
): Promise<void> {
  const dataBuffer = BufferUtil.from(dataHex, 'hex')
  const sharedKeyBuffer = BufferUtil.from(sharedKeyHex, 'hex')

  const iv = sharedKeyBuffer.slice(0, 16)
  const keyBytes = sharedKeyBuffer.slice(16)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['encrypt'],
  )

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    dataBuffer,
  )

  const payload: PayloadEncryptedResponse['payload'] = {
    data: BufferUtil.from(encrypted).toString('hex'),
  }

  const response: CryptoWorkerResponse = {
    type: 'PAYLOAD_ENCRYPTED',
    payload,
    requestId,
  }
  self.postMessage(response)
}

/**
 * Decrypt payload data using AES-CBC via Web Crypto API.
 * Shared key is split: first 16 bytes = IV, remaining bytes = encryption key.
 *
 * @param requestId - Unique identifier for correlating request/response
 * @param dataHex - Ciphertext data as hex string
 * @param sharedKeyHex - Shared key as hex string (first 16 bytes used as IV)
 */
async function handleDecryptPayload(
  requestId: string,
  dataHex: string,
  sharedKeyHex: string,
): Promise<void> {
  const dataBuffer = BufferUtil.from(dataHex, 'hex')
  const sharedKeyBuffer = BufferUtil.from(sharedKeyHex, 'hex')

  const iv = sharedKeyBuffer.slice(0, 16)
  const keyBytes = sharedKeyBuffer.slice(16)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['decrypt'],
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    dataBuffer,
  )

  const payload: PayloadDecryptedResponse['payload'] = {
    data: BufferUtil.from(decrypted).toString('hex'),
  }

  const response: CryptoWorkerResponse = {
    type: 'PAYLOAD_DECRYPTED',
    payload,
    requestId,
  }
  self.postMessage(response)
}

/**
 * Derive shared key for payload encryption using ECDH + SHA256-HMAC.
 * Computes mergedKey = publicKey * privateKey, then sharedKey = SHA256-HMAC(salt, mergedKey).
 *
 * @param requestId - Unique identifier for correlating request/response
 * @param sourcePrivateKeyHex - Source private key as hex string
 * @param destinationPublicKeyHex - Destination public key as hex string
 * @param saltHex - Salt for key derivation as hex string
 */
async function handleDeriveSharedKey(
  requestId: string,
  sourcePrivateKeyHex: string,
  destinationPublicKeyHex: string,
  saltHex: string,
): Promise<void> {
  const sourcePrivateKey = new PrivateKey(sourcePrivateKeyHex)
  const destinationPublicKey = new PublicKey(destinationPublicKeyHex)
  const salt = BufferUtil.from(saltHex, 'hex')

  // ECDH: mergedKey = destinationPublicKey.point * sourcePrivateKey.bn
  const mergedKey = PublicKey.fromPoint(
    destinationPublicKey.point.mul(sourcePrivateKey.toBigNumber()),
  )
  const rawMergedKey = mergedKey.toBuffer()

  // sharedKey = SHA256-HMAC(salt, mergedKey)
  const sharedKey = Hash.sha256hmac(salt, rawMergedKey)

  const payload: SharedKeyDerivedResponse['payload'] = {
    sharedKey: sharedKey.toString('hex'),
  }

  const response: CryptoWorkerResponse = {
    type: 'SHARED_KEY_DERIVED',
    payload,
    requestId,
  }
  self.postMessage(response)
}

/**
 * Derive stamp keys from payload digest and destination private key.
 * stampPrivateKey = BN(payloadDigest) + destinationPrivateKey mod N
 *
 * @param requestId - Unique identifier for correlating request/response
 * @param payloadDigestHex - Payload digest as hex string (32 bytes)
 * @param destinationPrivateKeyHex - Destination private key as hex string
 */
async function handleDeriveStampKeys(
  requestId: string,
  payloadDigestHex: string,
  destinationPrivateKeyHex: string,
): Promise<void> {
  const payloadDigest = BufferUtil.from(payloadDigestHex, 'hex')
  const destinationPrivateKey = new PrivateKey(destinationPrivateKeyHex)

  // payloadDigest is already a SHA256 hash — use it directly as BN
  // (matches stamp/relay/crypto.ts:149: BN.fromBuffer(Buffer.from(payloadDigest)))
  const digestBn = BN.fromBuffer(payloadDigest)
  const stampPrivBn = digestBn
    .add(destinationPrivateKey.toBigNumber())
    .mod(Point.getN())
  const stampPrivateKey = new PrivateKey(stampPrivBn)
  const stampPublicKey = stampPrivateKey.toPublicKey()

  const payload: StampKeysDerivedResponse['payload'] = {
    stampPrivateKey: stampPrivateKey.toString(),
    stampPublicKey: stampPublicKey.toString(),
    stampAddress: stampPrivateKey.toAddress().toString(),
  }

  const response: CryptoWorkerResponse = {
    type: 'STAMP_KEYS_DERIVED',
    payload,
    requestId,
  }
  self.postMessage(response)
}

/**
 * Derive stamp public key from payload digest and destination public key.
 * Used by sender to construct stamp address when only the recipient's public key is known.
 * stampPublicKey = PrivateKey(payloadDigest).toPublicKey() + destinationPublicKey
 *
 * @param requestId - Unique identifier for correlating request/response
 * @param payloadDigestHex - Payload digest as hex string (32 bytes)
 * @param destinationPublicKeyHex - Destination public key as hex string
 */
async function handleDeriveStampPublicKey(
  requestId: string,
  payloadDigestHex: string,
  destinationPublicKeyHex: string,
): Promise<void> {
  const payloadDigest = BufferUtil.from(payloadDigestHex, 'hex')
  const destinationPublicKey = new PublicKey(destinationPublicKeyHex)

  const digestPrivateKey = PrivateKey.fromBuffer(payloadDigest)
  const digestPublicKey = digestPrivateKey.toPublicKey()
  const stampPoint = digestPublicKey.point.add(destinationPublicKey.point)
  const stampPublicKey = PublicKey.fromPoint(stampPoint)

  const payload: StampPublicKeyDerivedResponse['payload'] = {
    stampPublicKey: stampPublicKey.toString(),
    stampAddress: Address.fromPublicKey(stampPublicKey).toString(),
  }

  const response: CryptoWorkerResponse = {
    type: 'STAMP_PUBLIC_KEY_DERIVED',
    payload,
    requestId,
  }
  self.postMessage(response)
}

/**
 * Compute SHA256-HMAC(data, key).
 * General-purpose HMAC primitive used for payload HMAC and salt derivation.
 *
 * @param requestId - Unique identifier for correlating request/response
 * @param dataHex - Data as hex string
 * @param keyHex - Key as hex string
 */
async function handleSha256Hmac(
  requestId: string,
  dataHex: string,
  keyHex: string,
): Promise<void> {
  const data = BufferUtil.from(dataHex, 'hex')
  const key = BufferUtil.from(keyHex, 'hex')

  const result = Hash.sha256hmac(data, key)

  const payload: Sha256HmacResponse['payload'] = {
    result: result.toString('hex'),
  }

  const response: CryptoWorkerResponse = {
    type: 'SHA256_HMAC_RESULT',
    payload,
    requestId,
  }
  self.postMessage(response)
}

/**
 * Derive stealth public key from ephemeral private key and destination public key.
 * stealthPublicKey = H(ebG)G + destinationPublicKey, where ebG = destinationPublicKey * ephemeralPrivateKey
 *
 * @param requestId - Unique identifier for correlating request/response
 * @param ephemeralPrivateKeyHex - Ephemeral private key as hex string
 * @param destinationPublicKeyHex - Destination public key as hex string
 */
async function handleDeriveStealthPublicKey(
  requestId: string,
  ephemeralPrivateKeyHex: string,
  destinationPublicKeyHex: string,
): Promise<void> {
  const ephemeralPrivateKey = new PrivateKey(ephemeralPrivateKeyHex)
  const destinationPublicKey = new PublicKey(destinationPublicKeyHex)

  // ebG = destinationPublicKey * ephemeralPrivateKey
  const dhKeyPoint = destinationPublicKey.point.mul(ephemeralPrivateKey.bn)
  const dhKeyPointRaw = Point.pointToCompressed(dhKeyPoint)

  // H(ebG)
  const digest = Hash.sha256(dhKeyPointRaw)
  const digestPublicKey = PrivateKey.fromBuffer(digest).toPublicKey()

  // stealthPublicKey = H(ebG)G + destinationPublicKey
  const stealthPublicKey = PublicKey.fromPoint(
    digestPublicKey.point.add(destinationPublicKey.point),
  )

  const payload: StealthPublicKeyDerivedResponse['payload'] = {
    stealthPublicKey: stealthPublicKey.toString(),
    digest: digest.toString('hex'),
  }

  const response: CryptoWorkerResponse = {
    type: 'STEALTH_PUBLIC_KEY_DERIVED',
    payload,
    requestId,
  }
  self.postMessage(response)
}

/**
 * Derive stealth private key from ephemeral public key and destination private key.
 * stealthPrivateKey = H(ebG) + destinationPrivateKey mod N
 *
 * @param requestId - Unique identifier for correlating request/response
 * @param ephemeralPublicKeyHex - Ephemeral public key as hex string
 * @param destinationPrivateKeyHex - Destination private key as hex string
 */
async function handleDeriveStealthPrivateKey(
  requestId: string,
  ephemeralPublicKeyHex: string,
  destinationPrivateKeyHex: string,
): Promise<void> {
  const ephemeralPublicKey = new PublicKey(ephemeralPublicKeyHex)
  const destinationPrivateKey = new PrivateKey(destinationPrivateKeyHex)

  // ebG = ephemeralPublicKey * destinationPrivateKey
  const dhKeyPoint = ephemeralPublicKey.point.mul(destinationPrivateKey.bn)
  const dhKeyPointRaw = Point.pointToCompressed(dhKeyPoint)

  // H(ebG)
  const digest = Hash.sha256(dhKeyPointRaw)
  const digestBn = BN.fromBuffer(digest)

  // stealthPrivateKey = H(ebG) + destinationPrivateKey mod N
  const stealthPrivBn = digestBn.add(destinationPrivateKey.bn).mod(Point.getN())
  const stealthPrivateKey = new PrivateKey(stealthPrivBn)

  const payload: StealthPrivateKeyDerivedResponse['payload'] = {
    stealthPrivateKey: stealthPrivateKey.toString(),
    digest: digest.toString('hex'),
  }

  const response: CryptoWorkerResponse = {
    type: 'STEALTH_PRIVATE_KEY_DERIVED',
    payload,
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
