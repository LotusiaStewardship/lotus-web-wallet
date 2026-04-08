# Phase 2.5: Keypair Management

## Objective

Establish the keypair management foundation for CashWeb messaging operations. This phase bridges the gap between the crypto worker primitives (Phase 2) and the relay plugin (Phase 3) by ensuring all required keys are derivable, accessible, and properly orchestrated.

**Estimated Effort**: 1-2 days
**Priority**: P0 (Blocking — Phase 3+ cannot function without identity key access)

---

## Problem Statement

Phase 2 implemented the cryptographic primitives (encrypt, decrypt, derive shared key, derive stamp keys, derive stealth keys) in the crypto worker. However, **no component manages the keypairs these primitives operate on**. Specifically:

1. **No Identity Key** — The wallet derives keys at `m/44'/10605'/...` (Lotus coin type 10605). CashWeb messaging requires an identity key at `m/44'/899'/0'/0/0` (CashWeb coin type 899). This derivation path does not exist.
2. **No Identity Key Accessor** — No method exists to retrieve the identity private/public key for message signing, stamp derivation, or payload decryption.
3. **No Ephemeral Key Generation** — No utility generates fresh keypairs per message for ECDH-based encryption.
4. **No Orchestration Layer** — No composable coordinates the multi-step key operations: "get identity key → generate ephemeral → derive shared key → encrypt → derive stamp keys."

Without this phase, Phase 3's `constructMessage` has no identity key to sign with, and Phase 4's service worker has no key to decrypt received payloads.

---

## Key Types and Lifecycles

CashWeb messaging uses **four distinct keypair types**, each with different lifecycles:

| Key Type | Purpose | Derivation Path | Lifecycle | Persisted? |
|---|---|---|---|---|
| **Identity Key** | Long-term identity for signing messages, profiles, ECDH with recipients | `m/44'/899'/0'/0/0` | Wallet lifetime | ✅ Derived from seed at runtime |
| **Ephemeral Key** | Per-message temporary keypair for ECDH (sender side) | N/A — `new PrivateKey()` | Per-message | ❌ Generated fresh each time |
| **Stamp Key** | Per-message stamp output keypair | `stampPrivKey = SHA256(payloadDigest) + identityPrivKey mod N` | Per-message | ❌ Derived on demand |
| **Stealth Key** | Per-stealth-payment output keypair | `stealthPrivKey = H(ebG) + destPrivKey mod N` | Per-payment | ❌ Derived on demand |

### Key Lifecycle Strategy

The strategy follows the existing wallet pattern: **derive from seed at runtime, never persist raw keys**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        KEY DERIVATION FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Seed Phrase (localStorage)                                                 │
│       │                                                                     │
│       ▼                                                                     │
│  buildWalletFromMnemonic()                                                   │
│       │                                                                     │
│       ├──► m/44'/10605'/0'/0/0  → PRIMARY account (existing)               │
│       ├──► m/44'/10605'/1'/0/0  → MUSIG2 account (existing)                │
│       └──► m/44'/899'/0'/0/0    → CASHWEB identity key (NEW)               │
│                                                                             │
│  Identity Key (runtime only, markRaw)                                       │
│       │                                                                     │
│       ├──► getIdentityPrivateKey()  → message signing, stamp derivation     │
│       └──► getIdentityPublicKey()   → profile metadata, recipient ECDH      │
│                                                                             │
│  Per-Message Operations (orchestrated by useCashWebKeys)                    │
│       │                                                                     │
│       ├──► generateEphemeralKey()  → fresh keypair per message              │
│       ├──► deriveSharedKey()       → ECDH(identity, recipient_pubkey)       │
│       ├──► encryptPayload()        → AES-CBC with shared key               │
│       ├──► deriveStampKeys()       → stamp output for transaction           │
│       └──► deriveStealthKeys()     → stealth output for payments            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Not a Separate Account Purpose?

The existing `AccountPurpose` enum uses coin type 10605 (Lotus). The CashWeb identity key uses coin type 899. Rather than adding a new `AccountPurpose` value (which implies a Lotus account), we derive the CashWeb identity key **separately** during `buildWalletFromMnemonic()` using a dedicated derivation function. This keeps the concerns cleanly separated:

- `AccountPurpose` → Lotus blockchain accounts (spending, signing, swaps)
- CashWeb identity → Messaging identity (separate coin type, separate purpose)

---

## Implementation Steps

### Step 1: Add CashWeb Coin Type Constant

Add to `utils/constants.ts`:

```typescript
/** BIP44 coin type for CashWeb messaging (SLP-899) */
export const CASHWEB_COINTYPE = 899

/** BIP44 derivation path for CashWeb identity key */
export const CASHWEB_IDENTITY_PATH = "m/44'/899'/0'/0/0"
```

### Step 2: Add Identity Key Derivation to Wallet Store

Add to `stores/wallet.ts`:

```typescript
// Runtime storage for CashWeb identity key (not persisted, not reactive)
let _cashwebIdentityKey: RuntimeKeyData | null = null

// Derive CashWeb identity key during buildWalletFromMnemonic
async function _deriveCashWebIdentityKey(
  phrase: string,
  networkName: NetworkType,
): Promise<void> {
  const { HDPrivateKey, PrivateKey, PublicKey, Mnemonic, Networks } = $bitcore
  const network = Networks.get(networkName)
  if (!network) throw new Error(`Unknown network: ${networkName}`)

  const mnemonic = new Mnemonic(phrase)
  const hdPrivkey = HDPrivateKey.fromSeed(mnemonic.toSeed())

  // Derive: m/44'/899'/0'/0/0
  const identityPrivKey = hdPrivkey
    .deriveChild(44, true)
    .deriveChild(CASHWEB_COINTYPE, true)
    .deriveChild(0, true)
    .deriveChild(0)
    .deriveChild(0).privateKey

  _cashwebIdentityKey = {
    privateKey: markRaw(identityPrivKey),
    publicKey: markRaw(identityPrivKey.publicKey),
    script: markRaw($bitcore.Script.fromAddress(identityPrivKey.toAddress(network))),
  }
}

// Public accessors
function getIdentityPrivateKeyHex(): string | null {
  return _cashwebIdentityKey?.privateKey.toString() ?? null
}

function getIdentityPublicKeyHex(): string | null {
  return _cashwebIdentityKey?.publicKey.toString() ?? null
}

function getIdentityAddress(): string | null {
  if (!_cashwebIdentityKey?.publicKey) return null
  const { Networks } = $bitcore
  const network = Networks.get(getCurrentNetwork())
  return $bitcore.Address.fromPublicKey(_cashwebIdentityKey.publicKey, network).toXAddress()
}
```

**Integration point**: Call `_deriveCashWebIdentityKey()` from `buildWalletFromMnemonic()` after deriving all `AccountPurpose` accounts.

### Step 3: Add Ephemeral Key Generator Utility

Create `utils/cashweb/keys.ts`:

```typescript
/**
 * CashWeb Keypair Utilities
 *
 * Pure functions for generating and managing CashWeb messaging keys.
 * These are framework-agnostic and can be used from any layer.
 */
import { PrivateKey, PublicKey } from 'xpi-ts/lib/bitcore'

/**
 * Generate a fresh ephemeral keypair for a single message.
 * Ephemeral keys are used for ECDH with the recipient's public key
 * to derive a shared symmetric encryption key.
 */
export function generateEphemeralKey(): {
  privateKey: PrivateKey
  publicKey: PublicKey
} {
  const privateKey = new PrivateKey()
  return {
    privateKey,
    publicKey: privateKey.toPublicKey(),
  }
}

/**
 * Generate an ephemeral keypair from a specific hex string.
 * Useful for deterministic testing or reconstructing a key from stored data.
 */
export function ephemeralKeyFromHex(hex: string): {
  privateKey: PrivateKey
  publicKey: PublicKey
} {
  const privateKey = new PrivateKey(hex)
  return {
    privateKey,
    publicKey: privateKey.toPublicKey(),
  }
}
```

### Step 4: Create Keypair Orchestration Composable

Create `composables/useCashWebKeys.ts`:

```typescript
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
 * Components and stores should use this instead of calling the crypto worker directly.
 */
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
   * @param destinationPrivateKey - Recipient's identity private key (for receiver-side derivation)
   *   OR sender passes their own identity private key for sender-side derivation
   * @returns Stamp private key, public key, and address
   */
  async function deriveStampKeys(
    payloadDigest: string,
    destinationPrivateKey: string,
  ): Promise<StampKeysDerivedResponse['payload']> {
    return $cryptoWorker.deriveStampKeys(
      payloadDigest,
      destinationPrivateKey,
    )
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
   * Full message encryption flow.
   *
   * 1. Get identity private key
   * 2. Derive shared key with recipient's public key
   * 3. Encrypt payload
   *
   * @param plaintextHex - Plaintext payload data (hex)
   * @param recipientPublicKey - Recipient's identity public key (hex)
   * @returns Encrypted payload (hex) and shared key (hex) for stamp derivation
   */
  async function encryptMessagePayload(
    plaintextHex: string,
    recipientPublicKey: string,
  ): Promise<{ encryptedHex: string; sharedKey: string }> {
    const identityPrivKey = getIdentityPrivateKey()
    if (!identityPrivKey) {
      throw new Error('Identity key not available — wallet not initialized')
    }

    const sharedKey = await deriveSharedKey(identityPrivKey, recipientPublicKey)
    const encryptedHex = await encryptPayload(plaintextHex, sharedKey)

    return { encryptedHex, sharedKey }
  }

  /**
   * Full message decryption flow.
   *
   * 1. Get identity private key
   * 2. Derive shared key with sender's public key
   * 3. Decrypt payload
   *
   * @param ciphertextHex - Encrypted payload data (hex)
   * @param senderPublicKey - Sender's identity public key (hex)
   * @returns Decrypted payload (hex)
   */
  async function decryptMessagePayload(
    ciphertextHex: string,
    senderPublicKey: string,
  ): Promise<string> {
    const identityPrivKey = getIdentityPrivateKey()
    if (!identityPrivKey) {
      throw new Error('Identity key not available — wallet not initialized')
    }

    const sharedKey = await deriveSharedKey(identityPrivKey, senderPublicKey)
    return decryptPayload(ciphertextHex, sharedKey)
  }

  return {
    // Identity key access
    getIdentityPrivateKey,
    getIdentityPublicKey,

    // Individual operations
    deriveSharedKey,
    encryptPayload,
    decryptPayload,
    deriveStampKeys,
    deriveStealthPublicKey,
    deriveStealthPrivateKey,

    // Composite flows
    encryptMessagePayload,
    decryptMessagePayload,
  }
}
```

### Step 5: Update Wallet Store Return API

Add to the return object in `stores/wallet.ts`:

```typescript
return {
  // ... existing returns ...

  // CashWeb identity key accessors
  getIdentityPrivateKeyHex,
  getIdentityPublicKeyHex,
  getIdentityAddress,
}
```

### Step 6: Update Crypto Worker Plugin (if needed)

Verify that `plugins/crypto-worker.client.ts` exposes all 6 CashWeb operations with correct method signatures. The Phase 2 implementation should already have these, but confirm the API matches what `useCashWebKeys` expects.

---

## Integration Points

### Wallet Store

The wallet store is the **source of truth** for the identity key. It derives the key from the seed phrase during `buildWalletFromMnemonic()` and provides accessor methods.

### Crypto Worker

The crypto worker performs the **heavy operations** (ECDH, AES-CBC, stamp/stealth derivation). The `useCashWebKeys` composable orchestrates calls to the worker.

### Relay Plugin (Phase 3)

The relay plugin will use `useCashWebKeys` for:
- Getting the identity public key to include in profile metadata
- Encrypting outgoing message payloads
- Deriving stamp keys for message transactions

### Service Worker (Phase 4)

The service worker will use `useCashWebKeys` (via main thread delegation) for:
- Decrypting received message payloads
- Deriving stealth private keys for stealth payments

### Messages Store (Phase 7)

The messages store will use `useCashWebKeys` for:
- Decrypting messages on demand when the user opens a conversation
- Verifying message signatures

---

## Security Considerations

### Identity Key Protection

- The identity private key is stored in a **module-scoped private variable** (`_cashwebIdentityKey`) with `markRaw()` — never reactive, never exposed to Vue's reactivity system
- The key is **never persisted** — it is re-derived from the seed phrase on every wallet load
- Access is through **hex string accessors only** — no raw key objects leave the store
- The seed phrase itself is stored in localStorage (existing security model — unchanged by this phase)

### Ephemeral Key Safety

- Ephemeral keys are generated fresh per message and **never stored**
- They exist only in memory during the message construction/decryption flow
- After the operation completes, the key is eligible for garbage collection

### No New Attack Surface

This phase does not introduce new persistent storage for keys. It follows the existing pattern:
- Seed phrase → localStorage (existing)
- All derived keys → runtime-only, `markRaw()`, module-scoped (existing pattern)

---

## Verification

### Unit Tests

1. **Identity Key Derivation**: Derive identity key from known seed, verify path `m/44'/899'/0'/0/0`
2. **Identity Key Consistency**: Same seed always produces same identity key
3. **Ephemeral Key Generation**: Each call to `generateEphemeralKey()` produces a unique keypair
4. **Shared Key Symmetry**: ECDH(A_priv, B_pub) == ECDH(B_priv, A_pub)
5. **Encrypt/Decrypt Round-trip**: encrypt then decrypt produces original data
6. **Stamp Key Derivation**: Both sender and receiver derive the same stamp address

### Integration Tests

1. **Full Message Flow**: Identity key → shared key → encrypt → decrypt → verify
2. **Wallet Rebuild**: After `buildWalletFromMnemonic()`, identity key is available
3. **Composable Orchestration**: `encryptMessagePayload()` and `decryptMessagePayload()` work end-to-end

---

## Dependencies

- **Phase 2 (Crypto Integration)**: All 6 CashWeb crypto worker operations must be implemented
- **Wallet Store**: Existing `buildWalletFromMnemonic()` function
- **xpi-ts**: `PrivateKey`, `PublicKey`, `HDPrivateKey`, `Mnemonic`, `Address`, `Script`
- **No new external dependencies**

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Coin type 899 not supported by xpi-ts networks | High | Derive manually via HD path (not via network config) — HDPrivateKey.deriveChild works with any coin type |
| Identity key derivation path mismatch with stamp | High | Test against stamp reference vectors with known seed phrase |
| Identity key not derived before Phase 3 starts | High | Add assertion in relay plugin that checks identity key availability |
| Memory leak from ephemeral keys | Low | Ephemeral keys are local variables, automatically GC'd |

---

## Completion Criteria

- [ ] `CASHWEB_COINTYPE` and `CASHWEB_IDENTITY_PATH` constants added to `utils/constants.ts`
- [ ] `_cashwebIdentityKey` runtime storage added to `stores/wallet.ts`
- [ ] `_deriveCashWebIdentityKey()` function implemented in wallet store
- [ ] Identity key derived during `buildWalletFromMnemonic()`
- [ ] `getIdentityPrivateKeyHex()`, `getIdentityPublicKeyHex()`, `getIdentityAddress()` accessors added to wallet store
- [ ] `generateEphemeralKey()` utility created in `utils/cashweb/keys.ts`
- [ ] `useCashWebKeys()` composable created with all orchestration methods
- [ ] Wallet store return object updated with identity key accessors
- [ ] Unit tests pass for identity key derivation and ephemeral key generation
- [ ] Integration test confirms encrypt/decrypt round-trip via composable
