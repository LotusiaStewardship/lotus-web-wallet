/**
 * CashWeb Keypair Orchestration Composable
 *
 * Coordinates multi-step key operations for CashWeb messaging:
 * - Identity key retrieval from wallet store
 * - Ephemeral key generation per message
 * - Shared key derivation via crypto worker
 * - Payload encryption/decryption via crypto worker
 * - Stamp/stealth key derivation via crypto worker
 *
 * This composable is the single entry point for all CashWeb key operations.
 * Components, stores, and services should use this instead of calling the
 * crypto worker directly for messaging operations.
 */
import type {
  StampKeysDerivedResponse,
  StampPublicKeyDerivedResponse,
  StealthPublicKeyDerivedResponse,
  StealthPrivateKeyDerivedResponse,
} from '~/utils/types/crypto-worker'

export function useCashWebKeys() {
  const walletStore = useWalletStore()
  const { $cryptoWorker } = useNuxtApp()

  /**
   * Get the identity private key hex.
   * Returns null if wallet not initialized or identity key not derived.
   */
  function getIdentityPrivateKey(): string | null {
    return walletStore.getIdentityPrivateKeyHex()
  }

  /**
   * Get the identity public key hex.
   * Used for including in profile metadata so recipients can encrypt to us.
   */
  function getIdentityPublicKey(): string | null {
    return walletStore.getIdentityPublicKeyHex()
  }

  /**
   * Get the identity address (XAddress format).
   */
  function getIdentityAddress(): string | null {
    return walletStore.getIdentityAddress()
  }

  /**
   * Derive a shared symmetric key via ECDH.
   *
   * @param sourcePrivateKey - Our identity private key (hex)
   * @param destinationPublicKey - Recipient's identity public key (hex)
   * @param salt - Optional salt for key derivation (hex)
   * @returns Shared key (hex) for AES-CBC encryption
   */
  async function deriveSharedKey(
    sourcePrivateKey: string,
    destinationPublicKey: string,
    salt: string = '',
  ): Promise<string> {
    return $cryptoWorker.deriveSharedKey(
      sourcePrivateKey,
      destinationPublicKey,
      salt,
    )
  }

  /**
   * Encrypt a payload using AES-CBC with a shared key.
   *
   * @param data - Plaintext data (hex string)
   * @param sharedKey - Shared key from deriveSharedKey (hex string)
   * @returns Encrypted data (hex string)
   */
  async function encryptPayload(
    data: string,
    sharedKey: string,
  ): Promise<string> {
    return $cryptoWorker.encryptPayload(data, sharedKey)
  }

  /**
   * Decrypt a payload using AES-CBC with a shared key.
   *
   * @param data - Ciphertext data (hex string)
   * @param sharedKey - Shared key from deriveSharedKey (hex string)
   * @returns Decrypted data (hex string)
   */
  async function decryptPayload(
    data: string,
    sharedKey: string,
  ): Promise<string> {
    return $cryptoWorker.decryptPayload(data, sharedKey)
  }

  /**
   * Derive stamp keys for a message transaction.
   *
   * @param payloadDigest - SHA256 hash of the payload (hex)
   * @param destinationPrivateKey - Private key for stamp derivation (hex)
   *   Sender passes their identity key; receiver passes theirs.
   * @returns Stamp private key, public key, and address
   */
  async function deriveStampKeys(
    payloadDigest: string,
    destinationPrivateKey: string,
  ): Promise<StampKeysDerivedResponse['payload']> {
    return $cryptoWorker.deriveStampKeys(payloadDigest, destinationPrivateKey)
  }

  /**
   * Derive stamp public key for a message transaction.
   *
   * @param payloadDigest - SHA256 hash of the payload (hex)
   * @param destinationPublicKey - Recipient's identity public key (hex)
   *   Sender passes their identity key; receiver passes theirs.
   * @returns Stamp public key and address
   */
  async function deriveStampPublicKey(
    payloadDigest: string,
    destinationPublicKey: string,
  ): Promise<StampPublicKeyDerivedResponse['payload']> {
    return $cryptoWorker.deriveStampPublicKey(
      payloadDigest,
      destinationPublicKey,
    )
  }

  /**
   * Construct payload HMAC for message transaction.
   *
   * @param sharedKey - Shared key to use for HMAC (hex)
   * @param payloadDigest - SHA256 hash of the payload (hex)
   * @returns HMAC of sharedKey and payloadDigest (hex)
   */
  async function constructPayloadHmac(
    sharedKey: string,
    payloadDigest: string,
  ): Promise<string> {
    // Payload HMAC: sha256hmac(sharedKey, payloadDigest)
    return $cryptoWorker.sha256Hmac(sharedKey, payloadDigest)
  }

  /**
   * Derive stealth public key for a stealth payment.
   *
   * @param ephemeralPrivateKey - Fresh ephemeral private key (hex)
   * @param destinationPublicKey - Recipient's identity public key (hex)
   * @returns Stealth public key and digest
   */
  async function deriveStealthPublicKey(
    ephemeralPrivateKey: string,
    destinationPublicKey: string,
  ): Promise<StealthPublicKeyDerivedResponse['payload']> {
    return $cryptoWorker.deriveStealthPublicKey(
      ephemeralPrivateKey,
      destinationPublicKey,
    )
  }

  /**
   * Derive stealth private key for receiving a stealth payment.
   *
   * @param ephemeralPublicKey - Sender's ephemeral public key from the message (hex)
   * @param destinationPrivateKey - Our identity private key (hex)
   * @returns Stealth private key and digest
   */
  async function deriveStealthPrivateKey(
    ephemeralPublicKey: string,
    destinationPrivateKey: string,
  ): Promise<StealthPrivateKeyDerivedResponse['payload']> {
    return $cryptoWorker.deriveStealthPrivateKey(
      ephemeralPublicKey,
      destinationPrivateKey,
    )
  }

  /**
   * Full message encryption flow matching stamp/relay/constructors.ts:constructMessage.
   *
   * 1. Get identity private key
   * 2. Derive per-message salt: SHA256-HMAC(SHA256(plaintext), sourcePrivateKey)
   * 3. Derive shared key with recipient's public key + salt
   * 4. Encrypt payload
   *
   * @param plaintextHex - Plaintext payload data (hex)
   * @param recipientPublicKey - Recipient's identity public key (hex)
   * @returns Encrypted payload (hex), shared key (hex), and salt (hex) for message construction
   */
  async function encryptMessagePayload(
    plaintextHex: string,
    recipientPublicKey: string,
  ): Promise<{ encryptedHex: string; sharedKey: string; salt: string }> {
    const identityPrivKey = getIdentityPrivateKey()
    if (!identityPrivKey) {
      throw new Error('Identity key not available — wallet not initialized')
    }

    // Derive per-message salt: sha256hmac(plainPayloadDigest, sourcePrivateKey)
    const plainPayloadDigest = await $cryptoWorker.hashData(
      plaintextHex,
      'sha256',
    )
    const salt = await $cryptoWorker.sha256Hmac(
      plainPayloadDigest,
      identityPrivKey,
    )

    const sharedKey = await deriveSharedKey(
      identityPrivKey,
      recipientPublicKey,
      salt,
    )
    const encryptedHex = await encryptPayload(plaintextHex, sharedKey)

    return { encryptedHex, sharedKey, salt }
  }

  /**
   * Full message decryption flow.
   *
   * 1. Get identity private key
   * 2. Derive shared key with sender's public key + salt from message
   * 3. Decrypt payload
   *
   * @param ciphertextHex - Encrypted payload data (hex)
   * @param senderPublicKey - Sender's identity public key (hex)
   * @param salt - Salt from the received message (hex)
   * @returns Decrypted payload (hex)
   */
  async function decryptMessagePayload(
    ciphertextHex: string,
    senderPublicKey: string,
    salt: string,
  ): Promise<string> {
    const identityPrivKey = getIdentityPrivateKey()
    if (!identityPrivKey) {
      throw new Error('Identity key not available — wallet not initialized')
    }

    const sharedKey = await deriveSharedKey(
      identityPrivKey,
      senderPublicKey,
      salt,
    )
    return decryptPayload(ciphertextHex, sharedKey)
  }

  return {
    // Identity key access
    getIdentityPrivateKey,
    getIdentityPublicKey,
    getIdentityAddress,

    // Individual operations
    deriveSharedKey,
    encryptPayload,
    decryptPayload,
    deriveStampKeys,
    deriveStampPublicKey,
    constructPayloadHmac,
    deriveStealthPublicKey,
    deriveStealthPrivateKey,

    // Composite flows
    encryptMessagePayload,
    decryptMessagePayload,
  }
}
