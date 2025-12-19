# Phase 3: Wallet Connectivity Layer

**Priority**: P0  
**Effort**: 2-3 days  
**Dependencies**: Phase 2 (SDK Relay Addresses)

---

## Overview

This phase updates the wallet's P2P service and store layers to properly include relay addresses in advertisements and establish connections to discovered peers.

---

## Problem Statement

### Current Issues

1. **Advertisements missing relay addresses**: Presence advertisements include `multiaddrs` from `coordinator.getStats().multiaddrs`, but these may not include dialable relay addresses
2. **No connection attempt on discovery**: When a presence is discovered, the wallet only stores it - never attempts to connect
3. **No subscription to `lotus/peers` topic**: The bootstrap server broadcasts peer lists with relay addresses, but the wallet doesn't use them

### Current Flow (Broken)

```
Wallet A                    Bootstrap Server                    Wallet B
   │                              │                                 │
   │──── advertise(peerId) ──────▶│                                 │
   │                              │◀──── subscribe(presence) ───────│
   │                              │                                 │
   │                              │──── presence(A.peerId) ────────▶│
   │                              │                                 │
   │                              │         ❌ NO CONNECTION PATH    │
```

### Target Flow

```
Wallet A                    Bootstrap Server                    Wallet B
   │                              │                                 │
   │──── advertise(peerId, ──────▶│                                 │
   │     relayAddr)               │◀──── subscribe(presence) ───────│
   │                              │                                 │
   │                              │──── presence(A.peerId, ────────▶│
   │                              │     A.relayAddr)                │
   │                              │                                 │
   │◀─────────────────────────────│◀──── dial(A.relayAddr) ─────────│
   │                              │      via circuit relay          │
   │                              │                                 │
   │◀═══════════════════════════════════════════════════════════════│
   │                    WebRTC Connection Established               │
```

---

## Implementation

### Task 3.1: Include Relay Addresses in Presence Advertisements

**File**: `services/p2p.ts`

**Current Code** (around line 566-581):

```typescript
const advertisement = {
  id: advertisementId,
  peerInfo: {
    peerId,
    multiaddrs: coordinator.getStats().multiaddrs, // May be empty or local-only
  },
  // ...
}
```

**Updated Code**:

```typescript
// Get relay addresses from SDK
const stats = coordinator.getStats()
const relayAddresses = stats.relayAddresses || []

const advertisement = {
  id: advertisementId,
  peerInfo: {
    peerId,
    multiaddrs: stats.multiaddrs,
    relayAddrs: relayAddresses, // NEW: Dialable relay addresses
  },
  walletAddress: walletStore.address,
  nickname: settingsStore.nickname,
  // ...
}
```

---

### Task 3.2: Subscribe to `lotus/peers` Topic

**File**: `services/p2p.ts`

Add subscription to peer list topic:

```typescript
/**
 * Subscribe to peer list broadcasts from bootstrap server
 */
async function subscribeToBootstrapPeerList(): Promise<void> {
  const coordinator = getP2PCoordinator()
  if (!coordinator) return

  await coordinator.subscribeToTopic('lotus/peers', message => {
    try {
      const peerList = JSON.parse(message.data.toString())

      if (Array.isArray(peerList)) {
        for (const peer of peerList) {
          // Update our peer info with relay addresses from bootstrap
          if (peer.peerId && peer.relayAddr) {
            updatePeerRelayAddress(peer.peerId, peer.relayAddr)
          }
        }
      }
    } catch (error) {
      console.warn('[P2P] Failed to parse peer list:', error)
    }
  })
}

/**
 * Update stored peer info with relay address
 */
function updatePeerRelayAddress(peerId: string, relayAddr: string): void {
  const p2pStore = useP2PStore()

  const existingPeer = p2pStore.onlinePeers.find(p => p.peerId === peerId)
  if (existingPeer) {
    // Add relay address if not already present
    if (!existingPeer.relayAddrs) {
      existingPeer.relayAddrs = []
    }
    if (!existingPeer.relayAddrs.includes(relayAddr)) {
      existingPeer.relayAddrs.push(relayAddr)
    }
  }
}
```

---

### Task 3.3: Add `connectToDiscoveredPeer()` Function

**File**: `services/p2p.ts`

```typescript
/**
 * Connect to a discovered peer using their relay address
 *
 * @param presence - The discovered peer's presence advertisement
 * @returns Connection result
 */
export async function connectToDiscoveredPeer(
  presence: UIPresenceAdvertisement,
): Promise<{
  success: boolean
  connectionType: 'webrtc' | 'relay' | 'direct'
  error?: string
}> {
  const coordinator = getP2PCoordinator()
  if (!coordinator) {
    return {
      success: false,
      connectionType: 'relay',
      error: 'P2P not initialized',
    }
  }

  // Check if already connected
  const connections = coordinator.getConnections(presence.peerId)
  if (connections.length > 0) {
    const connType = determineConnectionType(connections[0])
    return { success: true, connectionType: connType }
  }

  // Try relay addresses in order
  const relayAddrs = presence.relayAddrs || []

  if (relayAddrs.length === 0) {
    // No relay addresses - try to construct one through bootstrap
    console.log(
      `[P2P] No relay addresses for ${presence.peerId}, using bootstrap relay`,
    )
    return coordinator.connectToPeerViaRelay(presence.peerId)
  }

  // Try each relay address
  for (const relayAddr of relayAddrs) {
    console.log(
      `[P2P] Attempting connection to ${presence.peerId} via ${relayAddr}`,
    )

    const result = await coordinator.connectToPeerViaRelay(
      presence.peerId,
      relayAddr,
    )
    if (result.success) {
      return result
    }
  }

  return {
    success: false,
    connectionType: 'relay',
    error: 'All relay addresses failed',
  }
}

/**
 * Determine connection type from connection object
 */
function determineConnectionType(
  connection: Connection,
): 'webrtc' | 'relay' | 'direct' {
  const addr = connection.remoteAddr.toString()
  if (addr.includes('/webrtc')) return 'webrtc'
  if (addr.includes('/p2p-circuit')) return 'relay'
  return 'direct'
}
```

---

### Task 3.4: Implement Connection Retry with Backoff

**File**: `services/p2p.ts`

```typescript
/**
 * Connect to peer with exponential backoff retry
 */
export async function connectWithRetry(
  presence: UIPresenceAdvertisement,
  options: {
    maxRetries?: number
    initialDelayMs?: number
    maxDelayMs?: number
  } = {},
): Promise<{
  success: boolean
  connectionType: 'webrtc' | 'relay' | 'direct'
  attempts: number
  error?: string
}> {
  const { maxRetries = 3, initialDelayMs = 1000, maxDelayMs = 10000 } = options

  let attempts = 0
  let delay = initialDelayMs

  while (attempts < maxRetries) {
    attempts++

    const result = await connectToDiscoveredPeer(presence)
    if (result.success) {
      return { ...result, attempts }
    }

    if (attempts < maxRetries) {
      console.log(
        `[P2P] Connection attempt ${attempts} failed, retrying in ${delay}ms`,
      )
      await sleep(delay)
      delay = Math.min(delay * 2, maxDelayMs)
    }
  }

  return {
    success: false,
    connectionType: 'relay',
    attempts,
    error: `Failed after ${attempts} attempts`,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

---

### Task 3.5: Add `connectToOnlinePeer()` Store Action

**File**: `stores/p2p.ts`

```typescript
/**
 * Connect to an online peer by their peerId
 */
async connectToOnlinePeer(peerId: string): Promise<boolean> {
  const presence = this.onlinePeers.find(p => p.peerId === peerId)
  if (!presence) {
    console.warn(`[P2P Store] Peer ${peerId} not found in online peers`)
    return false
  }

  // Update connection status
  this._updatePeerConnectionStatus(peerId, 'connecting')

  try {
    const { connectWithRetry } = await import('~/services/p2p')
    const result = await connectWithRetry(presence)

    if (result.success) {
      this._updatePeerConnectionStatus(peerId, 'connected', result.connectionType)
      return true
    } else {
      this._updatePeerConnectionStatus(peerId, 'failed')
      return false
    }
  } catch (error) {
    console.error(`[P2P Store] Failed to connect to ${peerId}:`, error)
    this._updatePeerConnectionStatus(peerId, 'failed')
    return false
  }
},

/**
 * Update connection status for a peer
 */
_updatePeerConnectionStatus(
  peerId: string,
  status: 'disconnected' | 'connecting' | 'connected' | 'failed',
  connectionType?: 'webrtc' | 'relay' | 'direct'
): void {
  const peerIndex = this.onlinePeers.findIndex(p => p.peerId === peerId)
  if (peerIndex >= 0) {
    this.onlinePeers[peerIndex] = {
      ...this.onlinePeers[peerIndex],
      connectionStatus: status,
      connectionType: connectionType,
    }
  }
}
```

---

### Task 3.6: Track Connection Status Per Peer

**File**: `stores/p2p.ts`

Update `_handlePresenceDiscovered`:

```typescript
_handlePresenceDiscovered(presence: UIPresenceAdvertisement) {
  // Skip our own presence
  if (presence.peerId === this.peerId) return

  // Initialize connection status
  const presenceWithStatus: UIPresenceAdvertisement = {
    ...presence,
    connectionStatus: 'disconnected',
    connectionType: undefined,
  }

  const existingIndex = this.onlinePeers.findIndex(p => p.peerId === presence.peerId)
  if (existingIndex >= 0) {
    // Preserve existing connection status if connected
    const existing = this.onlinePeers[existingIndex]
    if (existing.connectionStatus === 'connected') {
      presenceWithStatus.connectionStatus = existing.connectionStatus
      presenceWithStatus.connectionType = existing.connectionType
    }
    this.onlinePeers[existingIndex] = presenceWithStatus
  } else {
    this.onlinePeers.push(presenceWithStatus)
  }
}
```

---

### Task 3.7: Update `UIPresenceAdvertisement` Type

**File**: `types/p2p.ts`

```typescript
export interface UIPresenceAdvertisement {
  id: string
  peerId: string
  multiaddrs: string[]
  relayAddrs?: string[] // NEW: Dialable relay addresses
  webrtcAddr?: string // NEW: WebRTC-specific address
  walletAddress: string
  nickname?: string
  avatar?: string
  createdAt: number
  expiresAt: number

  // Connection state (wallet-side only, not transmitted)
  connectionStatus?: 'disconnected' | 'connecting' | 'connected' | 'failed'
  connectionType?: 'relay' | 'webrtc' | 'direct'
}
```

---

## Testing Checklist

### Relay Address Advertisement

1. Start wallet A
2. Wait for bootstrap connection
3. Verify presence advertisement includes `relayAddrs`
4. Check console for relay address format

### Peer Connection

1. Start wallet A and wallet B
2. Wait for both to discover each other
3. In wallet B, trigger connection to wallet A
4. Verify connection established
5. Check connection type (relay or webrtc)

### Connection Status Tracking

1. Connect to a peer
2. Verify UI shows "Connected" status
3. Disconnect (close other wallet)
4. Verify UI updates to show disconnected

---

## Files Summary

| File              | Change                                           | Lines Changed |
| ----------------- | ------------------------------------------------ | ------------- |
| `services/p2p.ts` | Add relay addresses to ads, connection functions | ~100 lines    |
| `stores/p2p.ts`   | Add connection actions, status tracking          | ~50 lines     |
| `types/p2p.ts`    | Update `UIPresenceAdvertisement`                 | ~10 lines     |

---

## Success Criteria

- [ ] Presence advertisements include relay addresses
- [ ] Wallet can connect to discovered peers via relay
- [ ] Connection status tracked per peer
- [ ] Connection retry with backoff works
- [ ] `lotus/peers` topic subscription works

---

_Phase 3 of Post-Refactor Remediation Plan_
