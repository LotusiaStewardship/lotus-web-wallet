# SDK Relay Address Discovery

## Overview

This document details the SDK-side changes required to properly expose relay circuit addresses for browser peers. The core issue is that browsers cannot bind to ports directly and must use relay addresses for incoming connections.

---

## Current State

### P2PCoordinator Address Methods

```typescript
// Current: Returns raw multiaddrs from libp2p
getMultiaddrs(): string[] {
  return this.node?.getMultiaddrs().map(ma => ma.toString()) ?? []
}

// Current: getStats() includes multiaddrs
getStats(): P2PStats {
  return {
    // ...
    multiaddrs: this.node?.getMultiaddrs().map(ma => ma.toString()) ?? [],
  }
}
```

### Problem

In browser environments, `getMultiaddrs()` returns:

- `/p2p-circuit` - Generic, not dialable by other peers
- `/webrtc` - Generic, not dialable by other peers

What's needed is the **full relay circuit address**:

```
/dns4/bootstrap.lotusia.org/tcp/6970/wss/p2p/12D3KooW.../p2p-circuit/p2p/OUR_PEER_ID
```

---

## Implementation

### Task 1.1: Add `getRelayAddresses()` Method

**File**: `lotus-sdk/lib/p2p/coordinator.ts`

```typescript
/**
 * Get dialable relay addresses for this peer
 *
 * In browser environments, peers cannot bind to ports directly.
 * Other peers must dial through a relay using circuit relay addresses.
 *
 * Returns addresses in format:
 *   /dns4/.../wss/p2p/RELAY_PEER_ID/p2p-circuit/p2p/OUR_PEER_ID
 *
 * @returns Array of dialable relay addresses
 */
getRelayAddresses(): string[] {
  if (!this.node) return []

  const relayAddresses: string[] = []
  const ourPeerId = this.node.peerId.toString()

  // Get all connections to find relay peers
  const connections = this.node.getConnections()

  for (const conn of connections) {
    const remoteAddr = conn.remoteAddr.toString()
    const remotePeerId = conn.remotePeer.toString()

    // Check if this connection is to a relay-capable peer
    // Relay peers typically have public addresses (not /p2p-circuit)
    if (!remoteAddr.includes('/p2p-circuit')) {
      // Build relay address through this peer
      // Format: {remote_addr}/p2p/{remote_peer_id}/p2p-circuit/p2p/{our_peer_id}
      const relayAddr = `${remoteAddr}/p2p-circuit/p2p/${ourPeerId}`
      relayAddresses.push(relayAddr)
    }
  }

  return relayAddresses
}
```

### Task 1.2: Build Relay Addresses from Bootstrap Peers

**File**: `lotus-sdk/lib/p2p/coordinator.ts`

```typescript
/**
 * Get relay addresses through known bootstrap peers
 *
 * This is more reliable than scanning connections because bootstrap
 * peers are known to support circuit relay.
 *
 * @returns Array of relay addresses through bootstrap peers
 */
getBootstrapRelayAddresses(): string[] {
  if (!this.node) return []

  const relayAddresses: string[] = []
  const ourPeerId = this.node.peerId.toString()
  const bootstrapPeers = this.config.bootstrapPeers || []

  for (const bootstrapAddr of bootstrapPeers) {
    // Check if we're connected to this bootstrap peer
    const bootstrapPeerId = this._extractPeerIdFromMultiaddr(bootstrapAddr)
    if (!bootstrapPeerId) continue

    const connections = this.node.getConnections(peerIdFromString(bootstrapPeerId))
    if (connections.length === 0) continue

    // Build relay address through this bootstrap peer
    // Use the original bootstrap address (which is publicly reachable)
    const relayAddr = `${bootstrapAddr}/p2p-circuit/p2p/${ourPeerId}`
    relayAddresses.push(relayAddr)
  }

  return relayAddresses
}

/**
 * Extract peer ID from a multiaddr string
 */
private _extractPeerIdFromMultiaddr(addr: string): string | null {
  const match = addr.match(/\/p2p\/([a-zA-Z0-9]+)$/)
  return match ? match[1] : null
}
```

### Task 1.3: Emit Event When Relay Addresses Available

**File**: `lotus-sdk/lib/p2p/coordinator.ts`

Add to the connection event handling:

```typescript
// In _setupEventHandlers() or connection handling
private _onPeerConnected(peerId: PeerId, connection: Connection): void {
  // ... existing handling ...

  // Check if this is a bootstrap/relay peer
  const bootstrapPeers = this.config.bootstrapPeers || []
  const peerIdStr = peerId.toString()

  const isBootstrapPeer = bootstrapPeers.some(addr => addr.includes(peerIdStr))

  if (isBootstrapPeer) {
    // Emit relay addresses available event
    const relayAddrs = this.getBootstrapRelayAddresses()
    if (relayAddrs.length > 0) {
      this.emit(RelayEvent.ADDRESSES_AVAILABLE, {
        relayAddresses: relayAddrs,
        timestamp: Date.now(),
      })
    }
  }
}
```

Add to `types.ts`:

```typescript
export enum RelayEvent {
  // ... existing events ...
  ADDRESSES_AVAILABLE = 'relay:addresses-available',
}

export interface RelayAddressesAvailableData {
  relayAddresses: string[]
  timestamp: number
}
```

### Task 1.4: Add `connectToPeerViaRelay()` Helper

**File**: `lotus-sdk/lib/p2p/coordinator.ts`

```typescript
/**
 * Connect to a peer via circuit relay
 *
 * This is the primary method for browser-to-browser connections.
 *
 * @param peerId - Target peer ID
 * @param relayAddr - Full relay address (or just relay peer address)
 * @returns Connection result with type information
 */
async connectToPeerViaRelay(
  peerId: string,
  relayAddr?: string
): Promise<{
  success: boolean
  connectionType: 'webrtc' | 'relay' | 'direct'
  error?: string
}> {
  if (!this.node) {
    return { success: false, connectionType: 'relay', error: 'Node not started' }
  }

  try {
    let targetAddr: string

    if (relayAddr) {
      // Use provided relay address
      targetAddr = relayAddr
    } else {
      // Build relay address through first connected bootstrap peer
      const bootstrapRelayAddrs = this.getBootstrapRelayAddresses()
      if (bootstrapRelayAddrs.length === 0) {
        return {
          success: false,
          connectionType: 'relay',
          error: 'No relay peers available'
        }
      }

      // Replace our peer ID with target peer ID
      const ourPeerId = this.node.peerId.toString()
      targetAddr = bootstrapRelayAddrs[0].replace(
        `/p2p/${ourPeerId}`,
        `/p2p/${peerId}`
      )
    }

    // Append /webrtc for WebRTC upgrade
    if (!targetAddr.includes('/webrtc')) {
      targetAddr = targetAddr.replace('/p2p-circuit/p2p/', '/p2p-circuit/webrtc/p2p/')
    }

    console.log(`[P2P] Connecting to peer via relay: ${targetAddr}`)

    // Dial the peer
    await this.node.dial(multiaddr(targetAddr))

    // Check connection type
    const connections = this.node.getConnections(peerIdFromString(peerId))
    if (connections.length === 0) {
      return { success: false, connectionType: 'relay', error: 'Connection failed' }
    }

    const conn = connections[0]
    const connAddr = conn.remoteAddr.toString()

    let connectionType: 'webrtc' | 'relay' | 'direct' = 'relay'
    if (connAddr.includes('/webrtc')) {
      connectionType = 'webrtc'
    } else if (!connAddr.includes('/p2p-circuit')) {
      connectionType = 'direct'
    }

    console.log(`[P2P] Connected to ${peerId} via ${connectionType}`)

    return { success: true, connectionType }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[P2P] Failed to connect via relay:`, error)
    return { success: false, connectionType: 'relay', error: errorMsg }
  }
}
```

---

## Updated P2PStats Interface

```typescript
export interface P2PStats {
  peerId: string
  peers: {
    total: number
    connected: number
  }
  dht: {
    enabled: boolean
    mode: string
    routingTableSize: number
    localRecords: number
  }
  multiaddrs: string[]
  relayAddresses: string[] // NEW: Dialable relay addresses
}
```

Update `getStats()`:

```typescript
getStats(): P2PStats {
  return {
    peerId: this.node?.peerId.toString() ?? 'not-started',
    peers: {
      total: this.peerInfo.size,
      connected: this.node?.getPeers().length ?? 0,
    },
    dht: {
      enabled: this.config.enableDHT !== false,
      mode: this._getDHTMode(),
      routingTableSize: this._getRoutingTableSize(),
      localRecords: this.dhtValues.size,
    },
    multiaddrs: this.node?.getMultiaddrs().map(ma => ma.toString()) ?? [],
    relayAddresses: this.getBootstrapRelayAddresses(),  // NEW
  }
}
```

---

## Testing

### Unit Tests

```typescript
describe('P2PCoordinator Relay Addresses', () => {
  it('should return empty array when not connected', () => {
    const coordinator = new P2PCoordinator({
      /* config */
    })
    expect(coordinator.getRelayAddresses()).toEqual([])
  })

  it('should return relay addresses when connected to bootstrap', async () => {
    const coordinator = new P2PCoordinator({
      bootstrapPeers: [
        '/dns4/bootstrap.example.com/tcp/6970/wss/p2p/12D3KooW...',
      ],
    })
    await coordinator.start()

    // Wait for bootstrap connection
    await waitForEvent(coordinator, ConnectionEvent.CONNECTED)

    const relayAddrs = coordinator.getBootstrapRelayAddresses()
    expect(relayAddrs.length).toBeGreaterThan(0)
    expect(relayAddrs[0]).toContain('/p2p-circuit/p2p/')
  })

  it('should emit relay addresses available event', async () => {
    const coordinator = new P2PCoordinator({
      bootstrapPeers: [
        '/dns4/bootstrap.example.com/tcp/6970/wss/p2p/12D3KooW...',
      ],
    })

    const relayPromise = waitForEvent(
      coordinator,
      RelayEvent.ADDRESSES_AVAILABLE,
    )
    await coordinator.start()

    const event = await relayPromise
    expect(event.relayAddresses.length).toBeGreaterThan(0)
  })
})
```

---

## Migration Notes

These changes are **additive** and do not break existing functionality:

1. `getMultiaddrs()` continues to work as before
2. `getStats()` gains a new `relayAddresses` field
3. New methods `getRelayAddresses()`, `getBootstrapRelayAddresses()`, `connectToPeerViaRelay()` are added
4. New event `RelayEvent.ADDRESSES_AVAILABLE` is emitted

Wallet code can adopt these new APIs incrementally.

---

_Part of WebRTC Connectivity Remediation Plan_
