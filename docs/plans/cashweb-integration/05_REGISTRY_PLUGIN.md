# Phase 5: Registry Plugin

## Objective

Create a Nuxt plugin for RegistryHandler operations, enabling profile metadata management and relay URL discovery from CashWeb registries.

**Estimated Effort**: 1-2 days
**Priority**: P1 (High)

---

## Source Files

| Source | Purpose |
|--------|---------|
| `stamp/src/cashweb/registry/index.ts` | RegistryHandler class |
| `stamp/src/cashweb/registry/proto/metadata.proto` | Profile metadata protobuf |

---

## Architecture

The registry system provides:

1. **Address Metadata** - Profile information stored at a registry URL
2. **Relay URL Discovery** - Find a user's preferred relay server
3. **Broadcast Messages** - Forum-style posts with burn voting (future phase)

---

## Plugin Structure

```
plugins/
└── registry.client.ts
    ├── RegistryHandler class
    ├── Metadata fetch/put methods
    └── Relay URL discovery
```

---

## Implementation Steps

### Step 1: Create Plugin File

Create `plugins/registry.client.ts`:

```typescript
/**
 * Registry Plugin
 *
 * Provides access to CashWeb registries for profile metadata
 * and relay URL discovery.
 *
 * Access Patterns:
 * - Components: useRegistry() composable
 * - Stores: Import getter functions directly
 * - Workers: Not available
 *
 * Dependencies:
 * - bitcore plugin (for signing)
 * - crypto-worker plugin (for payload construction)
 */
export default defineNuxtPlugin({
  name: 'registry',
  dependsOn: ['bitcore', 'crypto-worker'],
  setup() {
    // Module-level state
    let registryUrl: string | null = null
    const metadataCache = new Map<string, CachedMetadata>()

    // ... implementation
  }
})
```

### Step 2: Implement Core Methods

```typescript
/**
 * Set the registry URL
 */
function setRegistryUrl(url: string): void {
  registryUrl = url
}

/**
 * Fetch metadata for an address
 */
async function getMetadata(address: string): Promise<ProfileMetadata | null> {
  // Check cache first
  const cached = metadataCache.get(address)
  if (cached && !isExpired(cached)) {
    return cached.metadata
  }

  if (!registryUrl) {
    throw new Error('Registry URL not configured')
  }

  try {
    const response = await $fetch(`${registryUrl}/v1/metadata/${address}`)
    const metadata = parseMetadataResponse(response)
    
    // Cache the result
    metadataCache.set(address, {
      metadata,
      timestamp: Date.now(),
      ttl: 3600000, // 1 hour
    })
    
    return metadata
  } catch (error) {
    if ((error as any).statusCode === 404) {
      return null // No metadata exists
    }
    throw error
  }
}

/**
 * Update metadata for an address
 */
async function putMetadata(
  address: string,
  metadata: ProfileMetadata,
  privateKey: PrivateKey,
): Promise<void> {
  if (!registryUrl) {
    throw new Error('Registry URL not configured')
  }

  // Construct signed payload
  const payload = serializeMetadata(metadata)
  const signature = signPayload(payload, privateKey)
  
  const signedPayload: SignedPayload = {
    payload,
    signature,
    publicKey: privateKey.toPublicKey().toBuffer(),
  }

  // Check if payment required (402)
  const response = await $fetch.raw(`${registryUrl}/v1/metadata/${address}`, {
    method: 'PUT',
    body: serializeSignedPayload(signedPayload),
  })

  if (response.status === 402) {
    // Payment required - handle via PoP plugin (Phase 6)
    const paymentRequest = parsePaymentRequest(response.headers)
    await handlePaymentRequest(paymentRequest)
  }
}

/**
 * Get relay URL for an address
 */
async function getRelayUrl(address: string): Promise<string | null> {
  const metadata = await getMetadata(address)
  return metadata?.relayUrl || null
}

/**
 * Get public key for an address (for encryption)
 */
async function getPublicKey(address: string): Promise<PublicKey | null> {
  const metadata = await getMetadata(address)
  if (!metadata?.publicKey) return null
  
  return PublicKey.fromBuffer(Buffer.from(metadata.publicKey, 'hex'))
}
```

### Step 3: Create Composable

Create `composables/useRegistry.ts`:

```typescript
export function useRegistry() {
  const { $registry } = useNuxtApp()
  const walletStore = useWalletStore()
  
  async function fetchProfile(address: string): Promise<ProfileMetadata | null> {
    return $registry.getMetadata(address)
  }
  
  async function updateProfile(updates: Partial<ProfileMetadata>): Promise<void> {
    const address = walletStore.address
    const existing = await $registry.getMetadata(address) || {}
    
    const updated: ProfileMetadata = {
      ...existing,
      ...updates,
      publicKey: walletStore.getPublicKey().toBuffer().toString('hex'),
    }
    
    await $registry.putMetadata(
      address,
      updated,
      walletStore.getPrivateKey(),
    )
  }
  
  async function setRelayUrl(relayUrl: string): Promise<void> {
    await updateProfile({ relayUrl })
  }
  
  async function getRecipientPublicKey(address: string): Promise<PublicKey | null> {
    return $registry.getPublicKey(address)
  }
  
  return {
    fetchProfile,
    updateProfile,
    setRelayUrl,
    getRecipientPublicKey,
    registryUrl: computed(() => $registry.getRegistryUrl()),
  }
}
```

---

## Type Definitions

```typescript
// utils/types/cashweb/registry.ts

export interface ProfileMetadata {
  publicKey: string
  relayUrl?: string
  displayName?: string
  avatar?: string
  bio?: string
  customFields?: Record<string, string>
}

export interface CachedMetadata {
  metadata: ProfileMetadata
  timestamp: number
  ttl: number
}

export interface MetadataResponse {
  payload: Uint8Array
  signature: Uint8Array
  publicKey: Uint8Array
  timestamp: number
}
```

---

## Integration Points

### Relay Plugin

The relay plugin uses the registry for:

- Relay URL discovery before connecting
- Public key retrieval for encryption

### Messages Store

The messages store uses the registry for:

- Display name resolution for senders
- Avatar URL retrieval

### Contacts Store

The contacts store uses the registry for:

- Contact profile caching
- Profile refresh on demand

---

## Error Handling

```typescript
// Handle 402 Payment Required
async function handlePaymentRequired(
  response: FetchResponse,
  metadata: ProfileMetadata,
  privateKey: PrivateKey,
): Promise<void> {
  const paymentRequest = parsePaymentRequest(response)
  
  // Use PoP plugin (Phase 6)
  const pop = useNuxtApp().$pop
  await pop.sendPayment(paymentRequest)
  
  // Retry the metadata put
  await putMetadata(address, metadata, privateKey)
}
```

---

## Verification

### Unit Tests

1. **Metadata Fetch**: Mock HTTP response, verify parsing
2. **Metadata Put**: Verify signed payload construction
3. **Relay URL Discovery**: Verify URL extraction from metadata
4. **Caching**: Verify cache hit/miss behavior

### Integration Tests

1. **Profile Update Flow**: Update profile, verify changes reflected
2. **Cross-User Discovery**: Fetch another user's profile for messaging

---

## Dependencies

- `ofetch`: For HTTP requests (Nuxt built-in)
- `xpi-ts`: For signing operations

---

## Risks

| Risk | Mitigation |
|------|------------|
| Registry unavailable | Cache metadata locally, show cached version |
| Payment required for update | Integrate with PoP plugin (Phase 6) |
| Metadata size limits | Validate size before upload, compress if needed |

---

## Completion Criteria

- [ ] Plugin file created at `plugins/registry.client.ts`
- [ ] Metadata fetch/put methods implemented
- [ ] Relay URL discovery implemented
- [ ] Caching implemented with TTL
- [ ] Composable created at `composables/useRegistry.ts`
- [ ] Type definitions created
- [ ] Unit tests pass
- [ ] Integration with relay plugin verified
