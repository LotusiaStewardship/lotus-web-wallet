# 32: MuSig2 Services Integration

## Overview

This phase corrects the MuSig2 service and store implementations to properly use the lotus-sdk `MuSig2P2PCoordinator` API. The current implementations have scaffolded APIs that don't match the actual SDK interface.

---

## Problem Analysis

### Current Service Issues (`services/musig2.ts`)

The current service assumes an API that doesn't exist in the SDK:

| Current Service Method                                | SDK Reality                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `musig2Coordinator.advertise()`                       | ❌ Doesn't exist - Discovery is via `MuSig2Discovery.advertiseSigner()`  |
| `musig2Coordinator.stop()`                            | ❌ Should be `cleanup()`                                                 |
| `musig2Coordinator.discoverSigners()`                 | ❌ Doesn't exist - Use `MuSig2Discovery.discoverSigners()`               |
| `musig2Coordinator.createSession(participantPubKeys)` | ❌ Wrong signature - Requires `(signers, privateKey, message, metadata)` |
| `musig2Coordinator.joinSession(sessionId)`            | ❌ Wrong signature - Requires `(announcement, privateKey)`               |
| `musig2Coordinator.requestSignatures()`               | ❌ Doesn't exist - Use `shareNonces()` + `sharePartialSignature()`       |
| `musig2Coordinator.approveRequest()`                  | ❌ Doesn't exist - Sessions are event-driven                             |
| `musig2Coordinator.rejectRequest()`                   | ❌ Doesn't exist                                                         |
| `musig2Coordinator.aggregatePublicKeys()`             | ❌ Doesn't exist on coordinator                                          |

### Current Store Issues (`stores/musig2.ts`)

1. **Type Misalignment**: Store defines its own types that don't match SDK types
2. **Missing SDK Integration**: All actions have `TODO: Implement via SDK` comments
3. **No Event Handling**: Doesn't subscribe to SDK events
4. **No Private Key Access**: Can't call SDK methods that require private keys

---

## SDK Architecture Understanding

### MuSig2P2PCoordinator

The `MuSig2P2PCoordinator` is a **session coordinator**, not a discovery layer:

```typescript
// Constructor - takes an existing P2PCoordinator
new MuSig2P2PCoordinator(
  coordinator: P2PCoordinator,
  musig2Config?: MuSig2P2PConfig,
  securityConfig?: MuSig2SecurityConfig,
  discoveryConfig?: MuSig2DiscoveryConfig
)

// Lifecycle
async initialize(): Promise<void>
async cleanup(): Promise<void>

// Session Management
async createSession(
  signers: PublicKey[],
  myPrivateKey: PrivateKey,
  message: Buffer,
  metadata?: Record<string, unknown>
): Promise<string>

async announceSession(sessionId: string): Promise<void>

async joinSession(
  announcement: SessionAnnouncement,
  myPrivateKey: PrivateKey
): Promise<string>

// MuSig2 Protocol
async shareNonces(sessionId: string, privateKey: PrivateKey): Promise<void>
async sharePartialSignature(sessionId: string, privateKey: PrivateKey): Promise<void>
async finalizeSession(sessionId: string): Promise<Buffer>
async abortSession(sessionId: string, reason: string): Promise<void>

// Queries
getSession(sessionId: string): MuSig2P2PSession | undefined
getAllSessions(): MuSig2P2PSession[]
canFinalizeSession(sessionId: string): boolean
```

### MuSig2Discovery (via `getDiscovery()`)

Discovery is a **separate layer** accessed via the coordinator:

```typescript
// Signer Advertisement
async advertiseSigner(
  publicKey: PublicKey,
  transactionTypes: TransactionType[],
  options?: { amountRange?, metadata?, ttl? }
): Promise<string>

async withdrawSigner(): Promise<void>

// Signer Discovery
async discoverSigners(
  criteria?: Partial<MuSig2SignerCriteria>,
  options?: DiscoveryOptions
): Promise<MuSig2SignerAdvertisement[]>

// Real-time Subscriptions
async subscribeToSigners(
  criteria: Partial<MuSig2SignerCriteria>,
  callback: (signer: MuSig2SignerAdvertisement) => void
): Promise<string>

async subscribeToSigningRequests(
  criteria: Partial<MuSig2SigningRequestCriteria>,
  callback: (request: MuSig2SigningRequestAdvertisement) => void
): Promise<string>

async unsubscribe(subscriptionId: string): Promise<void>

// Signing Requests
async createSigningRequest(
  requiredPublicKeys: PublicKey[],
  messageHash: string,
  options?: { metadata?, ttl?, creatorSignature? }
): Promise<string>

async withdrawSigningRequest(requestId: string): Promise<void>
async discoverSigningRequests(criteria?, options?): Promise<MuSig2SigningRequestAdvertisement[]>
async joinSigningRequest(requestId: string, publicKey: PublicKey): Promise<void>
```

### Events

The coordinator emits events for session lifecycle:

```typescript
enum MuSig2Event {
  SESSION_DISCOVERED = 'musig2:session-discovered',
  SESSION_CREATED = 'musig2:session-created',
  PARTICIPANT_JOINED = 'musig2:participant-joined',
  SESSION_READY = 'musig2:session-ready',
  NONCE_RECEIVED = 'musig2:nonce-received',
  NONCES_COMPLETE = 'musig2:nonces-complete',
  PARTIAL_SIG_RECEIVED = 'musig2:partial-sig-received',
  PARTIAL_SIGS_COMPLETE = 'musig2:partial-sigs-complete',
  SESSION_COMPLETE = 'musig2:session-complete',
  SESSION_ABORTED = 'musig2:session-aborted',
  SESSION_TIMEOUT = 'musig2:session-timeout',
  SIGNER_ADVERTISED = 'musig2:signer-advertised',
  SIGNER_DISCOVERED = 'musig2:signer-discovered',
  SIGNING_REQUEST_CREATED = 'musig2:signing-request-created',
  SIGNING_REQUEST_RECEIVED = 'musig2:signing-request-received',
}
```

---

## Implementation Plan

### Task 1: Refactor Service Types

Create wallet-meaningful types that map to SDK types:

```typescript
// types/musig2.ts - Update to align with SDK
export interface WalletSigner {
  id: string
  peerId: string
  publicKeyHex: string
  nickname?: string
  transactionTypes: TransactionType[]
  amountRange?: { min?: number; max?: number }
  lastSeen: number
  isOnline: boolean
}

export interface WalletSigningSession {
  id: string
  state:
    | 'created'
    | 'announced'
    | 'joining'
    | 'nonce_exchange'
    | 'signing'
    | 'complete'
    | 'aborted'
  isInitiator: boolean
  participants: WalletSessionParticipant[]
  messageHex: string
  createdAt: number
  updatedAt: number
}

export interface WalletSessionParticipant {
  peerId: string
  publicKeyHex: string
  nickname?: string
  hasNonce: boolean
  hasPartialSig: boolean
}
```

### Task 2: Refactor Service API

The service should provide wallet-meaningful operations:

```typescript
// services/musig2.ts

// Initialization (requires P2P coordinator from p2p service)
export async function initializeMuSig2(
  p2pCoordinator: P2PCoordinator,
  config?: MuSig2P2PConfig,
  discoveryConfig?: MuSig2DiscoveryConfig,
): Promise<void>

export async function cleanupMuSig2(): Promise<void>

// Signer Advertisement
export async function startSignerAdvertising(
  publicKey: PublicKey,
  transactionTypes: TransactionType[],
  options?: SignerAdvertisingOptions,
): Promise<string>

export async function stopSignerAdvertising(): Promise<void>

// Signer Discovery
export async function discoverSigners(
  criteria?: SignerSearchCriteria,
): Promise<WalletSigner[]>

export async function subscribeToSigners(
  criteria: SignerSearchCriteria,
  onSignerDiscovered: (signer: WalletSigner) => void,
): Promise<string>

export async function unsubscribeFromSigners(
  subscriptionId: string,
): Promise<void>

// Session Management
export async function createSigningSession(
  signerPublicKeys: PublicKey[],
  myPrivateKey: PrivateKey,
  message: Buffer,
  metadata?: SessionMetadata,
): Promise<string>

export async function announceSession(sessionId: string): Promise<void>

export async function joinSession(
  announcement: SessionAnnouncement,
  myPrivateKey: PrivateKey,
): Promise<string>

// MuSig2 Protocol Steps
export async function shareNonces(
  sessionId: string,
  privateKey: PrivateKey,
): Promise<void>

export async function sharePartialSignature(
  sessionId: string,
  privateKey: PrivateKey,
): Promise<void>

export async function finalizeSession(sessionId: string): Promise<Buffer>

export async function abortSession(
  sessionId: string,
  reason: string,
): Promise<void>

// Queries
export function getSession(sessionId: string): WalletSigningSession | null
export function getAllSessions(): WalletSigningSession[]
export function canFinalize(sessionId: string): boolean
export function isMuSig2Initialized(): boolean

// Event Subscriptions
export function onSessionEvent(
  event: MuSig2Event,
  handler: (...args: any[]) => void,
): () => void
```

### Task 3: Refactor Store to Use Service

The store should:

1. Call service functions instead of direct SDK access
2. React to service events to update state
3. Manage wallet-specific concerns (persistence, UI state)

```typescript
// stores/musig2.ts

actions: {
  async initialize() {
    const p2pStore = useP2PStore()
    const coordinator = p2pStore.getCoordinator()

    await initializeMuSig2(coordinator, config, discoveryConfig)

    // Subscribe to events
    this._setupEventHandlers()

    this.initialized = true
  },

  async advertiseSigner(config: SignerConfig) {
    const walletStore = useWalletStore()
    const publicKey = walletStore.getPublicKey()

    await startSignerAdvertising(publicKey, config.transactionTypes, {
      nickname: config.nickname,
      amountRange: config.amountRange,
    })

    this.signerEnabled = true
    this.signerConfig = config
  },

  async discoverSigners() {
    const signers = await discoverSigners(this.searchCriteria)
    this.discoveredSigners = signers
  },

  // ... etc
}
```

### Task 4: Handle Private Key Access

The SDK requires private keys for signing operations. The service needs access:

```typescript
// Option 1: Pass private key from wallet store
const walletStore = useWalletStore()
const privateKey = walletStore.getPrivateKey()
await shareNonces(sessionId, privateKey)

// Option 2: Service requests key via callback
await shareNonces(sessionId, () => walletStore.getPrivateKey())
```

---

## Files to Modify

| File                 | Changes                                         |
| -------------------- | ----------------------------------------------- |
| `types/musig2.ts`    | Align types with SDK, add wallet-specific types |
| `services/musig2.ts` | Complete rewrite to use correct SDK APIs        |
| `stores/musig2.ts`   | Refactor to use service, add event handling     |
| `services/p2p.ts`    | Ensure P2PCoordinator is accessible             |

---

## Testing Checklist

After implementation, verify:

- [ ] MuSig2 service initializes with P2P coordinator
- [ ] Signer advertising works via discovery layer
- [ ] Signer discovery returns valid results
- [ ] Session creation works with correct parameters
- [ ] Session announcement publishes to GossipSub
- [ ] Nonce sharing works (MuSig2 Round 1)
- [ ] Partial signature sharing works (MuSig2 Round 2)
- [ ] Session finalization produces valid signature
- [ ] Session abort notifies participants
- [ ] Events propagate from service to store
- [ ] Store state updates reactively

---

## Migration Notes

1. **Breaking Changes**: The service API is completely different
2. **Store Compatibility**: Store interface can remain similar, implementation changes
3. **Type Updates**: Some type renames for clarity

---

_Previous: [31_SERVICES_INTEGRATION.md](./31_SERVICES_INTEGRATION.md)_
_Next: [29_DEPRECATE_USEUTILS.md](./29_DEPRECATE_USEUTILS.md)_
