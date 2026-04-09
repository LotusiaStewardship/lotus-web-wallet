/**
 * Crypto Worker Types
 *
 * Type definitions for messages between the main thread
 * and the crypto web worker.
 *
 * The crypto worker offloads CPU-intensive cryptographic operations
 * from the main thread to prevent UI blocking.
 */
import type { NetworkName } from 'xpi-ts/lib/bitcore/networks'
import type { AddressType } from '~/utils/types/wallet'

// ============================================================================
// Address Types
// ============================================================================

// ============================================================================
// Request Messages (Main → Worker)
// ============================================================================

export interface GenerateMnemonicRequest {
  type: 'GENERATE_MNEMONIC'
  payload: {
    /** Mnemonic strength in bits: 128 (12 words), 160 (15), 192 (18), 224 (21), 256 (24) */
    strength?: 128 | 160 | 192 | 224 | 256
  }
  requestId: string
}

export interface ValidateMnemonicRequest {
  type: 'VALIDATE_MNEMONIC'
  payload: {
    mnemonic: string
  }
  requestId: string
}

export interface DeriveP2TRCommitmentRequest {
  type: 'DERIVE_P2TR_COMMITMENT'
  payload: {
    internalPubKeyHex: string
    merkleRootHex?: string
  }
  requestId: string
}

export interface DeriveKeysRequest {
  type: 'DERIVE_KEYS'
  payload: {
    mnemonic: string
    addressType: AddressType
    network: NetworkName
    /** BIP44 account index (0 = PRIMARY, 1 = MUSIG2, etc.) */
    accountIndex?: number
    /** Address index within the account chain */
    addressIndex?: number
    /** Whether this is a change address (internal chain) */
    isChange?: boolean
  }
  requestId: string
}

/** UTXO data needed to reconstruct input.output for signing */
export interface UtxoForSigning {
  /** txid:vout format */
  outpoint: string
  /** Satoshi value */
  satoshis: number
  /** Output script (hex) */
  scriptHex: string
}

export interface SignTransactionRequest {
  type: 'SIGN_TRANSACTION'
  payload: {
    /** Serialized unsigned transaction (hex) */
    txHex: string
    /** UTXOs being spent - required to set input.output for signing */
    utxos: UtxoForSigning[]
    /** Private key (hex or WIF) */
    privateKey: string
    /** Address type determines signing method */
    addressType: AddressType
    /** For Taproot: internal public key (hex) */
    internalPubKeyHex?: string
    /** For Taproot: merkle root (hex) */
    merkleRootHex?: string
  }
  requestId: string
}

export interface SignMessageRequest {
  type: 'SIGN_MESSAGE'
  payload: {
    message: string
    /** Private key (hex or WIF) */
    privateKey: string
  }
  requestId: string
}

export interface VerifyMessageRequest {
  type: 'VERIFY_MESSAGE'
  payload: {
    message: string
    address: string
    signature: string
  }
  requestId: string
}

export interface HashDataRequest {
  type: 'HASH_DATA'
  payload: {
    /** Data to hash (hex string) */
    data: string
    algorithm: 'sha256' | 'ripemd160' | 'hash160' | 'sha256d'
  }
  requestId: string
}

// ============================================================================
// CashWeb Request Messages (Main → Worker)
// ============================================================================

export interface EncryptPayloadRequest {
  type: 'ENCRYPT_PAYLOAD'
  payload: {
    /** Plaintext data (hex string) */
    data: string
    /** Shared key for encryption (hex string, first 16 bytes used as IV) */
    sharedKey: string
  }
  requestId: string
}

export interface DecryptPayloadRequest {
  type: 'DECRYPT_PAYLOAD'
  payload: {
    /** Ciphertext data (hex string) */
    data: string
    /** Shared key for decryption (hex string, first 16 bytes used as IV) */
    sharedKey: string
  }
  requestId: string
}

export interface DeriveSharedKeyRequest {
  type: 'DERIVE_SHARED_KEY'
  payload: {
    /** Source private key (hex string) */
    sourcePrivateKey: string
    /** Destination public key (hex string) */
    destinationPublicKey: string
    /** Salt for key derivation (hex string) */
    salt: string
  }
  requestId: string
}

export interface DeriveStampKeysRequest {
  type: 'DERIVE_STAMP_KEYS'
  payload: {
    /** Payload digest (hex string, 32 bytes) */
    payloadDigest: string
    /** Destination private key (hex string) */
    destinationPrivateKey: string
  }
  requestId: string
}

export interface DeriveStampPublicKeyRequest {
  type: 'DERIVE_STAMP_PUBLIC_KEY'
  payload: {
    payloadDigest: string
    destinationPublicKey: string
  }
  requestId: string
}

export interface Sha256HmacRequest {
  type: 'SHA256_HMAC'
  payload: {
    data: string
    key: string
  }
  requestId: string
}

export interface DeriveStealthPublicKeyRequest {
  type: 'DERIVE_STEALTH_PUBLIC_KEY'
  payload: {
    /** Ephemeral private key (hex string) */
    ephemeralPrivateKey: string
    /** Destination public key (hex string) */
    destinationPublicKey: string
  }
  requestId: string
}

export interface DeriveStealthPrivateKeyRequest {
  type: 'DERIVE_STEALTH_PRIVATE_KEY'
  payload: {
    /** Ephemeral public key (hex string) */
    ephemeralPublicKey: string
    /** Destination private key (hex string) */
    destinationPrivateKey: string
  }
  requestId: string
}

export type CryptoWorkerRequest =
  | GenerateMnemonicRequest
  | ValidateMnemonicRequest
  | DeriveP2TRCommitmentRequest
  | DeriveKeysRequest
  | SignTransactionRequest
  | SignMessageRequest
  | VerifyMessageRequest
  | HashDataRequest
  | EncryptPayloadRequest
  | DecryptPayloadRequest
  | DeriveSharedKeyRequest
  | DeriveStampKeysRequest
  | DeriveStampPublicKeyRequest
  | Sha256HmacRequest
  | DeriveStealthPublicKeyRequest
  | DeriveStealthPrivateKeyRequest

// ============================================================================
// Response Messages (Worker → Main)
// ============================================================================

export interface MnemonicGeneratedResponse {
  type: 'MNEMONIC_GENERATED'
  payload: { mnemonic: string }
  requestId: string
}

export interface MnemonicValidatedResponse {
  type: 'MNEMONIC_VALIDATED'
  payload: { valid: boolean }
  requestId: string
}

export interface KeysDerivedResponse {
  type: 'KEYS_DERIVED'
  payload: {
    /** Wallet address (XAddress format) */
    address: string
    /** Script payload (hex) */
    scriptPayload: string
    /** Public key (hex) */
    publicKeyHex: string
    /** Private key (hex) - returned for main thread storage */
    privateKeyHex: string
    /** For Taproot: internal public key before tweaking (hex) */
    internalPubKeyHex?: string
    /** For Taproot: merkle root (hex) */
    merkleRootHex?: string
    /** BIP44 derivation path used */
    derivationPath: string
    /** Account index used */
    accountIndex: number
    /** Address index used */
    addressIndex: number
    /** Whether this is a change address */
    isChange: boolean
  }
  requestId: string
}

export interface P2TRCommitmentDerivedResponse {
  type: 'P2TR_COMMITMENT_DERIVED'
  payload: {
    /** Taproot commitment (hex) */
    commitmentHex: string
  }
  requestId: string
}

export interface TransactionSignedResponse {
  type: 'TRANSACTION_SIGNED'
  payload: {
    /** Signed transaction (hex) */
    signedTxHex: string
    /** Transaction ID */
    txid: string
  }
  requestId: string
}

export interface MessageSignedResponse {
  type: 'MESSAGE_SIGNED'
  payload: { signature: string }
  requestId: string
}

export interface MessageVerifiedResponse {
  type: 'MESSAGE_VERIFIED'
  payload: { valid: boolean }
  requestId: string
}

export interface DataHashedResponse {
  type: 'DATA_HASHED'
  payload: { hash: string }
  requestId: string
}

// ============================================================================
// CashWeb Response Messages (Worker → Main)
// ============================================================================

export interface PayloadEncryptedResponse {
  type: 'PAYLOAD_ENCRYPTED'
  payload: {
    /** Encrypted data (hex string) */
    data: string
  }
  requestId: string
}

export interface PayloadDecryptedResponse {
  type: 'PAYLOAD_DECRYPTED'
  payload: {
    /** Decrypted data (hex string) */
    data: string
  }
  requestId: string
}

export interface SharedKeyDerivedResponse {
  type: 'SHARED_KEY_DERIVED'
  payload: {
    /** Derived shared key (hex string) */
    sharedKey: string
  }
  requestId: string
}

export interface StampKeysDerivedResponse {
  type: 'STAMP_KEYS_DERIVED'
  payload: {
    /** Stamp private key (hex string) */
    stampPrivateKey: string
    /** Stamp public key (hex string) */
    stampPublicKey: string
    /** Stamp address string */
    stampAddress: string
  }
  requestId: string
}

/**
 * Response for deriving the stamp public key and its corresponding address.
 */
export interface StampPublicKeyDerivedResponse {
  /** Type of the response. */
  type: 'STAMP_PUBLIC_KEY_DERIVED'
  /** Payload containing the derived stamp public key and address. */
  payload: {
    /** Stamp public key (hex string). */
    stampPublicKey: string
    /** Stamp address string. */
    stampAddress: string
  }
  /** Unique identifier for correlating request/response. */
  requestId: string
}

/**
 * Response for computing the SHA256 HMAC of a data and key.
 */
export interface Sha256HmacResponse {
  /** Type of the response. */
  type: 'SHA256_HMAC_RESULT'
  /** Payload containing the result of the SHA256 HMAC computation. */
  payload: {
    /** Result of the SHA256 HMAC computation (hex string). */
    result: string
  }
  /** Unique identifier for correlating request/response. */
  requestId: string
}

export interface StealthPublicKeyDerivedResponse {
  type: 'STEALTH_PUBLIC_KEY_DERIVED'
  payload: {
    /** Derived stealth public key (hex string) */
    stealthPublicKey: string
    /** Digest used in derivation (hex string) */
    digest: string
  }
  requestId: string
}

export interface StealthPrivateKeyDerivedResponse {
  type: 'STEALTH_PRIVATE_KEY_DERIVED'
  payload: {
    /** Derived stealth private key (hex string) */
    stealthPrivateKey: string
    /** Digest used in derivation (hex string) */
    digest: string
  }
  requestId: string
}

export interface ErrorResponse {
  type: 'ERROR'
  payload: {
    message: string
    code?: string
  }
  requestId: string
}

export interface WorkerReadyResponse {
  type: 'WORKER_READY'
  payload: CryptoWorkerStatus
}

export type CryptoWorkerResponse =
  | MnemonicGeneratedResponse
  | MnemonicValidatedResponse
  | KeysDerivedResponse
  | P2TRCommitmentDerivedResponse
  | TransactionSignedResponse
  | MessageSignedResponse
  | MessageVerifiedResponse
  | DataHashedResponse
  | PayloadEncryptedResponse
  | PayloadDecryptedResponse
  | SharedKeyDerivedResponse
  | StampKeysDerivedResponse
  | StampPublicKeyDerivedResponse
  | Sha256HmacResponse
  | StealthPublicKeyDerivedResponse
  | StealthPrivateKeyDerivedResponse
  | ErrorResponse
  | WorkerReadyResponse

// ============================================================================
// Worker Status
// ============================================================================

export interface CryptoWorkerStatus {
  ready: boolean
  version: string
  supportedOperations: CryptoWorkerRequest['type'][]
}

// ============================================================================
// Response Type Mapping (for type-safe request/response)
// ============================================================================

export type ResponseTypeMap = {
  GENERATE_MNEMONIC: MnemonicGeneratedResponse['payload']
  VALIDATE_MNEMONIC: MnemonicValidatedResponse['payload']
  DERIVE_P2TR_COMMITMENT: P2TRCommitmentDerivedResponse['payload']
  DERIVE_KEYS: KeysDerivedResponse['payload']
  SIGN_TRANSACTION: TransactionSignedResponse['payload']
  SIGN_MESSAGE: MessageSignedResponse['payload']
  VERIFY_MESSAGE: MessageVerifiedResponse['payload']
  HASH_DATA: DataHashedResponse['payload']
  ENCRYPT_PAYLOAD: PayloadEncryptedResponse['payload']
  DECRYPT_PAYLOAD: PayloadDecryptedResponse['payload']
  DERIVE_SHARED_KEY: SharedKeyDerivedResponse['payload']
  DERIVE_STAMP_KEYS: StampKeysDerivedResponse['payload']
  DERIVE_STAMP_PUBLIC_KEY: StampPublicKeyDerivedResponse['payload']
  SHA256_HMAC: Sha256HmacResponse['payload']
  DERIVE_STEALTH_PUBLIC_KEY: StealthPublicKeyDerivedResponse['payload']
  DERIVE_STEALTH_PRIVATE_KEY: StealthPrivateKeyDerivedResponse['payload']
}
