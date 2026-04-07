# Phase 2: Crypto Integration

## Objective

Integrate `PayloadConstructor` cryptographic operations into the existing crypto worker for offloading encryption/decryption from the main thread.

**Estimated Effort**: 2-3 days
**Priority**: P0 (Blocking)

---

## Source Files

| Source | Purpose |
|--------|---------|
| `stamp/src/cashweb/relay/crypto.ts` | PayloadConstructor class with encrypt/decrypt |
| `stamp/src/cashweb/relay/constructors.ts` | MessageConstructor for stamp/stealth addresses |

---

## Current Architecture

The `lotus-web-wallet` already has a crypto worker at `workers/crypto.worker.ts` that handles:

- Mnemonic generation/validation
- HD key derivation
- Transaction signing (ECDSA/Schnorr)
- Message signing/verification
- Hash operations

---

## New Operations Required

### Encryption/Decryption

```typescript
interface CryptoWorkerRequest {
  type: 'ENCRYPT_PAYLOAD' | 'DECRYPT_PAYLOAD'
  payload: {
    data: string  // hex-encoded
    key: string   // hex-encoded shared key
    iv?: string   // hex-encoded IV (optional, generated if not provided)
  }
  requestId: string
}

interface CryptoWorkerResponse {
  type: 'ENCRYPT_PAYLOAD' | 'DECRYPT_PAYLOAD'
  requestId: string
  payload: {
    data: string      // hex-encoded encrypted/decrypted data
    iv?: string       // hex-encoded IV (for encryption)
    hmac: string      // hex-encoded HMAC
  }
}
```

### Key Derivation

```typescript
interface CryptoWorkerRequest {
  type: 'DERIVE_STAMP_KEYS' | 'DERIVE_STEALTH_KEYS'
  payload: {
    sourcePrivateKey: string
    destinationPublicKey: string
    payloadDigest: string
  }
  requestId: string
}

interface CryptoWorkerResponse {
  type: 'DERIVE_STAMP_KEYS' | 'DERIVE_STEALTH_KEYS'
  requestId: string
  payload: {
    stampAddress: string
    stampPrivateKey?: string  // only for sender
    stealthPublicKey?: string
    digest?: string
  }
}
```

### Shared Key Derivation

```typescript
interface CryptoWorkerRequest {
  type: 'DERIVE_SHARED_KEY'
  payload: {
    privateKey: string
    publicKey: string
  }
  requestId: string
}

interface CryptoWorkerResponse {
  type: 'DERIVE_SHARED_KEY'
  requestId: string
  payload: {
    sharedKey: string  // hex-encoded
  }
}
```

---

## Implementation Steps

### Step 1: Extend Type Definitions

Update `utils/types/crypto-worker.ts`:

```typescript
export type CryptoWorkerRequestType =
  | 'GENERATE_MNEMONIC'
  | 'VALIDATE_MNEMONIC'
  | 'DERIVE_KEYS'
  | 'DERIVE_P2TR_COMMITMENT'
  | 'SIGN_TRANSACTION'
  | 'SIGN_MESSAGE'
  | 'VERIFY_MESSAGE'
  | 'HASH_DATA'
  // New CashWeb operations
  | 'ENCRYPT_PAYLOAD'
  | 'DECRYPT_PAYLOAD'
  | 'DERIVE_STAMP_KEYS'
  | 'DERIVE_STEALTH_KEYS'
  | 'DERIVE_SHARED_KEY'
  | 'DERIVE_HD_STEALTH_KEY'
```

### Step 2: Add Crypto Operations to Worker

Update `workers/crypto.worker.ts`:

```typescript
// Add new imports
import { crypto as bitcoreCrypto } from 'xpi-ts/lib/bitcore'

// Add AES-CBC encryption (from stamp/crypto.ts)
function encryptPayload(data: Buffer, key: Buffer): {
  ciphertext: Buffer
  iv: Buffer
  hmac: Buffer
} {
  const iv = Buffer.from(bitcoreCrypto.Random.getRandomBytes(16))
  const cipher = bitcoreCrypto.CipherAES_CBC(data, key, iv, true)
  
  // HMAC for authentication
  const hmacKey = bitcoreCrypto.Hash.sha256hmac(key, Buffer.from('hmac'))
  const hmac = bitcoreCrypto.Hash.sha256hmac(Buffer.concat([iv, cipher]), hmacKey)
  
  return { ciphertext: cipher, iv, hmac }
}

// Add decryption
function decryptPayload(ciphertext: Buffer, key: Buffer, iv: Buffer): Buffer {
  return bitcoreCrypto.CipherAES_CBC(ciphertext, key, iv, false)
}

// Add stamp key derivation (from stamp/crypto.ts)
function deriveStampKeys(
  sourcePrivateKey: PrivateKey,
  destinationPublicKey: PublicKey,
  payloadDigest: Buffer,
): { stampAddress: string; stampPrivateKey: PrivateKey } {
  const sharedKey = deriveSharedKey(sourcePrivateKey, destinationPublicKey)
  const stampPrivateKey = deriveStampPrivateKey(sharedKey, payloadDigest)
  const stampAddress = stampPrivateKey.toPublicKey().toAddress().toString()
  return { stampAddress, stampPrivateKey }
}

// Add stealth key derivation (from stamp/crypto.ts)
function deriveStealthPublicKey(
  ephemeralPrivateKey: PrivateKey,
  destinationPublicKey: PublicKey,
): { stealthPublicKey: PublicKey; digest: Buffer } {
  const dhKeyPoint = destinationPublicKey.point.mul(ephemeralPrivateKey.bn)
  const dhKeyPointRaw = bitcoreCrypto.Point.pointToCompressed(dhKeyPoint)
  const digest = bitcoreCrypto.Hash.sha256(dhKeyPointRaw)
  const digestPrivateKey = PrivateKey.fromBuffer(digest)
  const stealthPublicKey = PublicKey.fromPoint(
    digestPrivateKey.toPublicKey().point.add(destinationPublicKey.point)
  )
  return { stealthPublicKey, digest }
}
```

### Step 3: Update Message Handler

Add cases for new operation types in the worker's message handler.

### Step 4: Update Plugin

Update `plugins/crypto-worker.client.ts` to expose new operations:

```typescript
async function encryptPayload(data: string, key: string): Promise<{
  data: string
  iv: string
  hmac: string
}> {
  return await sendRequest('ENCRYPT_PAYLOAD', { data, key })
}

async function decryptPayload(data: string, key: string, iv: string): Promise<string> {
  const result = await sendRequest('DECRYPT_PAYLOAD', { data, key, iv })
  return result.data
}
```

---

## Key Derivation Paths

Stamp uses specific derivation paths that must be preserved:

### Stamp Address Derivation

```
shared_key = ECDH(source_priv_key, dest_pub_key)
stamp_priv_key = HMAC-SHA256(shared_key, payload_digest)
stamp_address = P2PKH(stamp_priv_key.pub_key)
```

### Stealth Address Derivation

```
dh_point = dest_pub_key * ephemeral_priv_key
digest = SHA256(compress(dh_point))
stealth_pub_key = digest_pub_key + dest_pub_key
```

### HD Stealth Key Derivation (for receiver)

```
m/44'/145'/{account}/{change}/{index}
```

---

## Integration Points

### Relay Plugin

The relay plugin will use crypto worker for:

1. Encrypting outgoing message payloads
2. Decrypting incoming message payloads
3. Deriving stamp addresses for transactions

### Service Worker

The service worker will use crypto worker for:

1. Decrypting received messages
2. Verifying message signatures

---

## Verification

### Unit Tests

1. **Encryption Round-trip**: Encrypt then decrypt produces original data
2. **Stamp Key Derivation**: Derived address matches stamp implementation
3. **Stealth Key Derivation**: Derived stealth address matches stamp implementation
4. **Shared Key Derivation**: ECDH produces same key for both parties

### Performance Test

Verify encryption of 1KB payload completes in <50ms without blocking main thread.

---

## Dependencies

- Uses existing `xpi-ts/lib/bitcore` crypto primitives
- No new external dependencies required

---

## Risks

| Risk | Mitigation |
|------|------------|
| Crypto operation timeout | Increase REQUEST_TIMEOUT for large payloads |
| Key derivation mismatch | Test against stamp reference vectors |
| Memory pressure from large payloads | Add payload size limits |

---

## Completion Criteria

- [ ] Type definitions extended in `utils/types/crypto-worker.ts`
- [ ] Encrypt/decrypt operations added to crypto worker
- [ ] Stamp key derivation added to crypto worker
- [ ] Stealth key derivation added to crypto worker
- [ ] Plugin updated with new operation methods
- [ ] Unit tests pass for all new operations
- [ ] Performance test confirms no main thread blocking
