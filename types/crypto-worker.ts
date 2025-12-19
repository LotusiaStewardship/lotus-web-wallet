/**
 * Crypto Worker Types
 *
 * Type definitions for messages between the main thread
 * and the crypto web worker.
 *
 * The crypto worker offloads CPU-intensive cryptographic operations
 * from the main thread to prevent UI blocking.
 */

// ============================================================================
// Address Types
// ============================================================================

export type AddressType = 'p2pkh' | 'p2tr'

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

export interface DeriveKeysRequest {
  type: 'DERIVE_KEYS'
  payload: {
    mnemonic: string
    addressType: AddressType
    network: string
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

export type CryptoWorkerRequest =
  | GenerateMnemonicRequest
  | ValidateMnemonicRequest
  | DeriveKeysRequest
  | SignTransactionRequest
  | SignMessageRequest
  | VerifyMessageRequest
  | HashDataRequest

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
  | TransactionSignedResponse
  | MessageSignedResponse
  | MessageVerifiedResponse
  | DataHashedResponse
  | ErrorResponse
  | WorkerReadyResponse

// ============================================================================
// Worker Status
// ============================================================================

export interface CryptoWorkerStatus {
  ready: boolean
  version: string
  supportedOperations: string[]
}

// ============================================================================
// Response Type Mapping (for type-safe request/response)
// ============================================================================

export type ResponseTypeMap = {
  GENERATE_MNEMONIC: MnemonicGeneratedResponse['payload']
  VALIDATE_MNEMONIC: MnemonicValidatedResponse['payload']
  DERIVE_KEYS: KeysDerivedResponse['payload']
  SIGN_TRANSACTION: TransactionSignedResponse['payload']
  SIGN_MESSAGE: MessageSignedResponse['payload']
  VERIFY_MESSAGE: MessageVerifiedResponse['payload']
  HASH_DATA: DataHashedResponse['payload']
}
