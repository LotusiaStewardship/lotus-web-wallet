# 33: Core P2P Services Integration

## Overview

This phase corrects the P2P service and store implementations to properly use the lotus-sdk `P2PCoordinator` API. The current implementations have scaffolded APIs that don't match the actual SDK interface.

---

## Problem Analysis

### Current Service Issues (`services/p2p.ts`)

The current service assumes APIs that don't exist or have different signatures:

| Current Service Method                       | SDK Reality                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `coordinator.getConnectionState()`           | ❌ Use `coordinator.connectionState` property                           |
| `coordinator.getPeerId()`                    | ❌ Use `coordinator.peerId` property                                    |
| `coordinator.getMultiaddrs()`                | ❌ Use `coordinator.getStats().multiaddrs`                              |
| `coordinator.isDHTReady()`                   | ❌ Use `coordinator.getDHTStats().isReady`                              |
| `coordinator.getRoutingTableSize()`          | ❌ Use `coordinator.getDHTStats().routingTableSize`                     |
| `coordinator.advertisePresence(config)`      | ❌ Use `announceResource()` + `publishToTopic()` + `subscribeToTopic()` |
| `coordinator.stopPresenceAdvertising(topic)` | ❌ Use `unsubscribeFromTopic()`                                         |
| `coordinator.discoverPeers(topic)`           | ❌ Use `getLocalResources()` or subscribe to topic                      |

### Current Store Issues (`stores/p2p.ts`)

1. **Direct SDK Access**: Store directly manages SDK coordinator instead of using service
2. **Duplicate Code**: Identity management, presence logic duplicated between service and store
3. **Event Handling**: Store sets up event handlers directly on coordinator
4. **No Service Layer**: Store bypasses service entirely for all operations

---

## SDK P2PCoordinator API Reference

### Properties

```typescript
// Peer identity
coordinator.peerId: string                    // Our peer ID
coordinator.connectionState: P2PConnectionState // Current connection state

// Libp2p access (advanced)
coordinator.libp2pNode: Libp2p               // Raw libp2p node
```

### Lifecycle Methods

```typescript
async start(): Promise<void>
async stop(): Promise<void>
async shutdown(): Promise<void>
```

### Connection Methods

```typescript
async connectToPeer(peerAddr: string | Multiaddr): Promise<void>
async disconnectFromPeer(peerId: string): Promise<void>
isConnected(peerId: string): boolean
getConnectedPeers(): PeerInfo[]
getPeer(peerId: string): PeerInfo | undefined
```

### Statistics

```typescript
getStats(): P2PStats                          // Overall stats
getDHTStats(): DHTStats                       // DHT-specific stats
getConnectionStats(): { totalConnections, connectedPeers }
```

### DHT/Resource Operations

```typescript
async announceResource<T>(resourceType, resourceId, data, options?): Promise<void>
async discoverResource(resourceType, resourceId, timeoutMs?): Promise<ResourceAnnouncement | null>
getLocalResources(resourceType, filters?): ResourceAnnouncement[]
getResource(resourceType, resourceId): ResourceAnnouncement | null
```

### GossipSub Pub/Sub

```typescript
async subscribeToTopic(topic, handler): Promise<void>
async unsubscribeFromTopic(topic): Promise<void>
async publishToTopic(topic, message): Promise<void>
getTopicPeers(topic): string[]
```

### Events

```typescript
// Connection events
'peer:connect': [{ peerId, multiaddrs, timestamp }]
'peer:disconnect': [{ peerId, timestamp }]
'peer:discovery': [{ peerInfo, timestamp }]
'peer:update': [PeerInfo]
'connection:state-changed': [{ previousState, currentState, timestamp, error? }]

// Relay events
'relay:addresses-available': [{ peerId, reachableAddresses, relayAddresses, timestamp }]

// Resource events
'resource:announced': [ResourceAnnouncement]

// Error events
'error': [{ message, code?, error?, timestamp }]
```

---

## Implementation Plan

### Task 1: Refactor Service to Match SDK API

The service should provide wallet-meaningful wrappers around the SDK:

```typescript
// services/p2p.ts

// Initialization
export async function initializeP2P(
  options?: P2PInitOptions,
  callbacks?: P2PEventCallbacks,
): Promise<{ peerId: string; multiaddrs: string[] }>

export async function stopP2P(): Promise<void>

// Connection State (use SDK properties)
export function getConnectionState(): P2PConnectionState
export function getPeerId(): string
export function getMultiaddrs(): string[]
export function getConnectedPeers(): UIPeerInfo[]

// DHT (use SDK methods correctly)
export function isDHTReady(): boolean
export function getRoutingTableSize(): number

// Presence (use SDK's announceResource + GossipSub)
export async function startPresenceAdvertising(
  config: PresenceConfig,
): Promise<void>
export async function stopPresenceAdvertising(): Promise<void>
export async function discoverPeers(): Promise<UIPresenceAdvertisement[]>

// Coordinator Access
export function getCoordinator(): P2PCoordinatorType | null
export function isP2PInitialized(): boolean

// Event Subscription
export function subscribeToEvents(callbacks: P2PEventCallbacks): void
export function unsubscribeFromEvents(): void
```

### Task 2: Fix SDK Method Calls

**Connection State:**

```typescript
// WRONG
return coordinator.getConnectionState()

// CORRECT
return coordinator.connectionState
```

**Peer ID:**

```typescript
// WRONG
return coordinator.getPeerId()

// CORRECT
return coordinator.peerId
```

**Multiaddrs:**

```typescript
// WRONG
return coordinator.getMultiaddrs()

// CORRECT
return coordinator.getStats().multiaddrs
```

**DHT Ready:**

```typescript
// WRONG
return coordinator.isDHTReady()

// CORRECT
return coordinator.getDHTStats().isReady
```

**Presence Advertising:**

```typescript
// WRONG
await coordinator.advertisePresence({ topic, protocol, ttl, data })

// CORRECT
await coordinator.announceResource(
  'discovery:advertisement',
  `presence-${coordinator.peerId}`,
  presenceData,
  { ttl, expiresAt },
)
await coordinator.publishToTopic(PRESENCE_TOPIC, presenceData)
await coordinator.subscribeToTopic(PRESENCE_TOPIC, handlePresenceMessage)
```

### Task 3: Refactor Store to Use Service

The store should:

1. Call service functions instead of direct SDK access
2. React to service events to update state
3. Manage wallet-specific concerns (persistence, UI state)

```typescript
// stores/p2p.ts

actions: {
  async initialize(config?: Record<string, unknown>) {
    // Use service instead of direct SDK
    const { peerId, multiaddrs } = await initializeP2P(
      { bootstrapNodes: config?.bootstrapPeers },
      {
        onConnectionStateChange: (state) => {
          this.connectionState = state
        },
        onPeerConnected: (peer) => this._handlePeerConnected(peer),
        onPeerDisconnected: (peerId) => this._handlePeerDisconnected(peerId),
        onPresenceDiscovered: (presence) => this._handlePresenceDiscovered(presence),
        onError: (error) => this._handleError(error),
      }
    )

    this.peerId = peerId
    this.multiaddrs = multiaddrs
    this.initialized = true
  },

  async advertisePresence(config: PresenceConfig) {
    await startPresenceAdvertising(config)
    this.myPresenceConfig = config
  },

  // ... etc
}
```

### Task 4: Remove Duplicate Code

After integration, remove from store:

- `getOrCreateP2PPrivateKey()` function (moved to service)
- `sdk: SDKInstances` object
- Direct coordinator event handler setup
- Direct SDK import and instantiation

---

## Files to Modify

| File              | Changes                                              |
| ----------------- | ---------------------------------------------------- |
| `services/p2p.ts` | Fix SDK method calls, add proper event forwarding    |
| `stores/p2p.ts`   | Use service instead of direct SDK, remove duplicates |
| `types/p2p.ts`    | Ensure types align with SDK types                    |

---

## Testing Checklist

After implementation, verify:

- [ ] P2P service initializes correctly
- [ ] Connection state updates via service events
- [ ] Peer connect/disconnect events propagate
- [ ] Presence advertising works via announceResource + GossipSub
- [ ] Presence discovery works via topic subscription
- [ ] DHT stats are accessible
- [ ] Store state updates reactively from service events
- [ ] No duplicate SDK instances
- [ ] Identity persistence works

---

## Migration Notes

1. **Service is Source of Truth**: All SDK access goes through service
2. **Store is Reactive State**: Store manages UI state, calls service for operations
3. **Event-Driven Updates**: Service emits events, store listens and updates state
4. **No Breaking Changes**: Store interface remains similar, implementation changes

---

_Previous: [32_MUSIG2_SERVICES_INTEGRATION.md](./32_MUSIG2_SERVICES_INTEGRATION.md)_
_Next: [29_DEPRECATE_USEUTILS.md](./29_DEPRECATE_USEUTILS.md)_
