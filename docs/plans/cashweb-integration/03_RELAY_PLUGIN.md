# Phase 3: Relay Plugin

## Objective

Create a Nuxt plugin for RelayClient HTTP operations, providing main-thread access to relay server communication for message sending, profile management, and message retrieval.

**Estimated Effort**: 2 days
**Priority**: P0 (Blocking)

---

## Source Files

| Source | Purpose |
|--------|---------|
| `stamp/src/cashweb/relay/index.ts` | RelayClient class (HTTP methods only) |
| `stamp/src/cashweb/relay/encode-entry.ts` | Entry encoding for messages |
| `stamp/src/cashweb/relay/extension.ts` | Message parsing and authentication |

---

## Architecture

The RelayClient has two distinct operation modes:

1. **HTTP Operations** - Stateless, suitable for main thread plugin
2. **WebSocket Operations** - Stateful, requires service worker (Phase 4)

This phase focuses on HTTP operations only.

---

## Plugin Structure

```
plugins/
└── relay.client.ts
    ├── RelayClient class (HTTP methods)
    ├── Message construction helpers
    └── Profile management methods
```

---

## Implementation Steps

### Step 1: Create Plugin File

Create `plugins/relay.client.ts`:

```typescript
/**
 * Relay Client Plugin
 *
 * Provides HTTP-based communication with CashWeb relay servers.
 * WebSocket operations are handled by service worker module.
 *
 * Access Patterns:
 * - Components: useRelayClient() composable
 * - Stores: Import getter functions directly
 * - Workers: Not available (use static imports)
 *
 * Dependencies:
 * - chronik plugin (for transaction broadcasting)
 * - cryptoWorker plugin (for encryption)
 * - wallet store (for UTXOs and keys)
 */
export default defineNuxtPlugin({
  name: 'relay',
  dependsOn: ['chronik', 'crypto-worker', 'bitcore'],
  setup() {
    // Module-level state
    let relayUrl: string | null = null
    let relayToken: string | null = null

    // ... implementation
  }
})
```

### Step 2: Implement HTTP Methods

```typescript
// Profile methods
async function getProfile(address: string): Promise<ProfileMetadata | null> {
  const response = await $fetch(`${relayUrl}/v1/profile/${address}`)
  return parseProfileMetadata(response)
}

async function putProfile(
  address: string,
  metadata: ProfileMetadata,
  signature: Buffer,
): Promise<void> {
  await $fetch(`${relayUrl}/v1/profile/${address}`, {
    method: 'PUT',
    body: serializeSignedPayload(metadata, signature),
  })
}

// Message methods
async function getMessages(
  address: string,
  options?: { startTime?: number; endTime?: number },
): Promise<MessageSet> {
  const params = new URLSearchParams()
  if (options?.startTime) params.set('start_time', String(options.startTime))
  if (options?.endTime) params.set('end_time', String(options.endTime))
  
  const response = await $fetch(`${relayUrl}/v1/messages/${address}?${params}`)
  return parseMessageSet(response)
}

async function pushMessages(
  destinationAddress: string,
  messageSet: MessageSet,
): Promise<void> {
  await $fetch(`${relayUrl}/v1/messages/${destinationAddress}`, {
    method: 'PUT',
    body: serializeMessageSet(messageSet),
    headers: {
      'Authorization': `Bearer ${relayToken}`,
    },
  })
}

// Relay URL discovery
async function getRelayUrl(address: string): Promise<string | null> {
  // Query registry for relay URL (see Phase 5)
  const registryHandler = useNuxtApp().$registry
  return registryHandler?.getRelayUrl(address)
}
```

### Step 3: Implement Message Construction

```typescript
// utils/cashweb/constructors.ts

export async function constructMessage(
  wallet: WalletStore,
  cryptoWorker: CryptoWorkerPlugin,
  items: MessageItem[],
  destinationAddress: string,
  stampAmount: number,
): Promise<{
  messageSet: MessageSet
  transactions: Transaction[]
  payloadDigest: Buffer
}> {
  // 1. Get destination public key from profile
  const profile = await getProfile(destinationAddress)
  const destinationPublicKey = profile?.publicKey
  
  // 2. Derive stamp keys via crypto worker
  const { stampAddress, stampPrivateKey } = await cryptoWorker.deriveStampKeys(
    wallet.getPrivateKey(),
    destinationPublicKey,
    payloadDigest,
  )
  
  // 3. Construct transactions
  const transactions = await constructStampTransactions(
    wallet,
    stampAddress,
    stampAmount,
  )
  
  // 4. Encrypt payload via crypto worker
  const payload = constructPayload(items)
  const { data: encryptedPayload, iv, hmac } = await cryptoWorker.encryptPayload(
    payload,
    sharedKey,
  )
  
  // 5. Construct message
  const message: Message = {
    sourceAddress: wallet.getAddress(),
    destinationAddress,
    payloadDigest,
    payloadSignature: signPayload(payloadDigest, wallet.getPrivateKey()),
    stampAmount,
    stampImages: [],
  }
  
  return { messageSet: { messages: [message] }, transactions, payloadDigest }
}
```

### Step 4: Create Composable

Create `composables/useRelayClient.ts`:

```typescript
export function useRelayClient() {
  const { $relay } = useNuxtApp()
  const walletStore = useWalletStore()
  
  async function sendMessage(
    destinationAddress: string,
    items: MessageItem[],
    stampAmount: number = 1000,
  ): Promise<string> {
    // Implementation using plugin methods
  }
  
  async function fetchMessages(): Promise<Message[]> {
    // Implementation using plugin methods
  }
  
  async function updateProfile(metadata: ProfileMetadata): Promise<void> {
    // Implementation using plugin methods
  }
  
  return {
    sendMessage,
    fetchMessages,
    updateProfile,
    isConnected: computed(() => $relay.isConnected()),
    relayUrl: computed(() => $relay.getRelayUrl()),
  }
}
```

---

## Type Definitions

### MessageItem Types

```typescript
// utils/types/cashweb/messages.ts

export type MessageItem =
  | TextItem
  | ImageItem
  | StealthItem
  | ReplyItem
  | P2PKHItem

export interface TextItem {
  type: 'text'
  text: string
}

export interface ImageItem {
  type: 'image'
  image: ImageData
}

export interface StealthItem {
  type: 'stealth'
  amount: number
}

export interface ReplyItem {
  type: 'reply'
  payloadDigest: string
}

export interface P2PKHItem {
  type: 'p2pkh'
  address: string
  amount: number
}
```

### Profile Metadata Types

```typescript
// utils/types/cashweb/profile.ts

export interface ProfileMetadata {
  publicKey: string
  relayUrl?: string
  displayName?: string
  avatar?: string
  bio?: string
}
```

---

## Integration Points

### Wallet Store

The relay plugin depends on `stores/wallet.ts` for:

- Private key access for signing
- UTXO selection for stamp transactions
- Address generation

### Crypto Worker

The relay plugin depends on `plugins/crypto-worker.client.ts` for:

- Payload encryption/decryption
- Stamp key derivation
- Shared key derivation

### Chronik Plugin

The relay plugin depends on `plugins/chronik.client.ts` for:

- Transaction broadcasting
- UTXO confirmation checking

---

## Error Handling

```typescript
// Error types
export class RelayError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'INVALID_RESPONSE' | 'PAYMENT_REQUIRED',
  ) {
    super(message)
  }
}

// Retry logic for transient failures
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error | null = null
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err as Error
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)))
      }
    }
  }
  throw lastError
}
```

---

## Verification

### Unit Tests

1. **Profile Fetch**: Mock HTTP response, verify profile parsing
2. **Message Fetch**: Mock HTTP response, verify message parsing
3. **Message Construction**: Verify message structure matches stamp implementation

### Integration Tests

1. **Send Message**: Full flow from message construction to HTTP push
2. **Profile Update**: Full flow from metadata creation to HTTP put

---

## Dependencies

- `ofetch`: For HTTP requests (Nuxt built-in)
- `xpi-ts`: For cryptographic operations (already available)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Relay server unavailable | Implement retry with exponential backoff |
| Token expiration | Refresh token before expiry, handle 401 responses |
| CORS issues | Ensure relay server has proper CORS headers |

---

## Completion Criteria

- [ ] Plugin file created at `plugins/relay.client.ts`
- [ ] HTTP methods implemented (getProfile, putProfile, getMessages, pushMessages)
- [ ] Message construction helpers created in `utils/cashweb/constructors.ts`
- [ ] Composable created at `composables/useRelayClient.ts`
- [ ] Type definitions created in `utils/types/cashweb/`
- [ ] Unit tests pass
- [ ] Integration with wallet store verified
