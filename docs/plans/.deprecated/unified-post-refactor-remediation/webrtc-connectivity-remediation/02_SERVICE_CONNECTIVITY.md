# Wallet Service Layer Connectivity

## Overview

This document details the wallet service layer changes required to properly handle relay addresses and establish connections to discovered peers.

---

## Current State

### Presence Advertisement (services/p2p.ts)

```typescript
// Current: Uses getStats().multiaddrs which may not include dialable addresses
const advertisement = {
  id: advertisementId,
  protocol: PRESENCE_PROTOCOL,
  peerInfo: {
    peerId,
    multiaddrs: coordinator.getStats().multiaddrs, // Problem: Not dialable
  },
  // ...
}
```

### Connection Helpers (services/p2p.ts)

```typescript
// Current: Basic connection helper exists but doesn't handle relay
export async function connectViaBrowserP2P(peerWebRTCAddr: string): Promise<{
  connectionType: 'webrtc' | 'relay' | 'unknown'
}> {
  await coordinator.connectToPeer(peerWebRTCAddr)
  // ...
}
```

---

## Implementation

### Task 2.1: Get Relay Addresses from SDK When Advertising

**File**: `services/p2p.ts`

```typescript
/**
 * Get dialable addresses for presence advertising
 *
 * In browser environments, we need relay addresses that other browsers can dial.
 * Falls back to regular multiaddrs if relay addresses aren't available.
 */
function getDialableAddresses(): {
  multiaddrs: string[]
  relayAddrs: string[]
  webrtcAddr: string | null
} {
  if (!coordinator) {
    return { multiaddrs: [], relayAddrs: [], webrtcAddr: null }
  }

  const stats = coordinator.getStats()
  const multiaddrs = stats.multiaddrs

  // Get relay addresses (new SDK method)
  let relayAddrs: string[] = []
  if (typeof coordinator.getBootstrapRelayAddresses === 'function') {
    relayAddrs = coordinator.getBootstrapRelayAddresses()
  }

  // Build WebRTC address from relay address
  let webrtcAddr: string | null = null
  if (relayAddrs.length > 0) {
    // Convert relay address to WebRTC address
    // /...../p2p-circuit/p2p/PEER_ID -> /...../p2p-circuit/webrtc/p2p/PEER_ID
    webrtcAddr = relayAddrs[0].replace(
      '/p2p-circuit/p2p/',
      '/p2p-circuit/webrtc/p2p/',
    )
  }

  return { multiaddrs, relayAddrs, webrtcAddr }
}
```

### Task 2.2: Include Relay Addresses in Presence Advertisements

**File**: `services/p2p.ts`

Update `startPresenceAdvertising()`:

```typescript
export async function startPresenceAdvertising(
  config: PresenceConfig,
): Promise<void> {
  if (!coordinator) {
    throw new Error('P2P not initialized')
  }

  const now = Date.now()
  const peerId = coordinator.peerId
  const advertisementId = `presence-${peerId}`

  // Get dialable addresses including relay addresses
  const { multiaddrs, relayAddrs, webrtcAddr } = getDialableAddresses()

  // Create advertisement with relay addresses
  const advertisement = {
    id: advertisementId,
    protocol: PRESENCE_PROTOCOL,
    peerInfo: {
      peerId,
      multiaddrs,
    },
    // NEW: Include relay addresses for browser-to-browser connectivity
    relayAddrs,
    webrtcAddr,
    capabilities: ['wallet-presence'],
    createdAt: now,
    expiresAt: now + PRESENCE_TTL,
    reputation: 50,
    walletAddress: config.walletAddress,
    nickname: config.nickname,
    avatar: config.avatar,
  }

  console.log('[P2P Service] Advertising presence with addresses:', {
    multiaddrs: multiaddrs.length,
    relayAddrs: relayAddrs.length,
    webrtcAddr: webrtcAddr ? 'available' : 'none',
  })

  // ... rest of advertising logic
}
```

### Task 2.3: Subscribe to `lotus/peers` Topic

**File**: `services/p2p.ts`

Add peer exchange subscription:

```typescript
/**
 * Subscribe to peer exchange topic from bootstrap server
 *
 * The bootstrap server broadcasts connected peer lists with relay addresses.
 * This enables discovery of dialable addresses for other wallets.
 */
async function subscribeToPeerExchange(): Promise<void> {
  if (!coordinator) return

  const PEER_EXCHANGE_TOPIC = 'lotus/peers'

  try {
    await coordinator.subscribeToTopic(
      PEER_EXCHANGE_TOPIC,
      (data: Uint8Array) => {
        _handlePeerExchangeMessage(data)
      },
    )
    console.log('[P2P Service] Subscribed to peer exchange topic')
  } catch (err) {
    console.warn('[P2P Service] Failed to subscribe to peer exchange:', err)
  }
}

/**
 * Handle peer exchange message from bootstrap server
 */
function _handlePeerExchangeMessage(data: Uint8Array): void {
  try {
    const text = new TextDecoder().decode(data)
    const message = JSON.parse(text)

    if (message.type !== 'peer-exchange') return

    const peers = message.peers as Array<{
      peerId: string
      multiaddrs: string[]
      relayAddr: string
      lastSeen: number
    }>

    // Update relay address cache
    for (const peer of peers) {
      if (peer.peerId === coordinator?.peerId) continue // Skip self

      // Store relay address for this peer
      peerRelayAddressCache.set(peer.peerId, {
        relayAddr: peer.relayAddr,
        multiaddrs: peer.multiaddrs,
        lastSeen: peer.lastSeen,
        receivedAt: Date.now(),
      })
    }

    console.log(`[P2P Service] Received peer exchange: ${peers.length} peers`)
  } catch {
    // Ignore malformed messages
  }
}

// Cache for peer relay addresses
const peerRelayAddressCache = new Map<
  string,
  {
    relayAddr: string
    multiaddrs: string[]
    lastSeen: number
    receivedAt: number
  }
>()

/**
 * Get cached relay address for a peer
 */
export function getCachedRelayAddress(peerId: string): string | null {
  const cached = peerRelayAddressCache.get(peerId)
  if (!cached) return null

  // Expire after 5 minutes
  if (Date.now() - cached.receivedAt > 5 * 60 * 1000) {
    peerRelayAddressCache.delete(peerId)
    return null
  }

  return cached.relayAddr
}
```

Update `initializeP2P()` to subscribe:

```typescript
export async function initializeP2P(
  options: P2PInitOptions = {},
  callbacks: P2PEventCallbacks = {},
): Promise<{ peerId: string; multiaddrs: string[] }> {
  // ... existing initialization ...

  // Subscribe to peer exchange for relay address discovery
  await subscribeToPeerExchange()

  return { peerId, multiaddrs }
}
```

### Task 2.4: Add `connectToDiscoveredPeer()` Function

**File**: `services/p2p.ts`

```typescript
/**
 * Connect to a discovered peer using their relay address
 *
 * This is the primary method for establishing browser-to-browser connections.
 *
 * @param presence - The discovered peer's presence advertisement
 * @returns Connection result
 */
export async function connectToDiscoveredPeer(
  presence: UIPresenceAdvertisement,
): Promise<{
  success: boolean
  connectionType: 'webrtc' | 'relay' | 'direct' | 'none'
  error?: string
}> {
  if (!coordinator) {
    return {
      success: false,
      connectionType: 'none',
      error: 'P2P not initialized',
    }
  }

  const { peerId, relayAddrs, webrtcAddr, multiaddrs } = presence

  // Check if already connected
  const existingConnections = coordinator.libp2pNode.getConnections()
  const alreadyConnected = existingConnections.some(
    conn => conn.remotePeer.toString() === peerId,
  )

  if (alreadyConnected) {
    const connType = getConnectionType(peerId)
    console.log(`[P2P Service] Already connected to ${peerId} via ${connType}`)
    return {
      success: true,
      connectionType: connType as 'webrtc' | 'relay' | 'direct',
    }
  }

  console.log(`[P2P Service] Connecting to discovered peer: ${peerId}`)

  // Try connection methods in order of preference
  const connectionAttempts = [
    // 1. Try WebRTC address (best for browser-to-browser)
    async () => {
      if (webrtcAddr) {
        console.log(`[P2P Service] Trying WebRTC address: ${webrtcAddr}`)
        await coordinator!.connectToPeer(webrtcAddr)
        return 'webrtc' as const
      }
      throw new Error('No WebRTC address')
    },

    // 2. Try relay addresses
    async () => {
      if (relayAddrs && relayAddrs.length > 0) {
        for (const relayAddr of relayAddrs) {
          console.log(`[P2P Service] Trying relay address: ${relayAddr}`)
          try {
            await coordinator!.connectToPeer(relayAddr)
            return 'relay' as const
          } catch {
            continue
          }
        }
      }
      throw new Error('No relay addresses or all failed')
    },

    // 3. Try cached relay address from peer exchange
    async () => {
      const cachedRelay = getCachedRelayAddress(peerId)
      if (cachedRelay) {
        console.log(`[P2P Service] Trying cached relay address: ${cachedRelay}`)
        await coordinator!.connectToPeer(cachedRelay)
        return 'relay' as const
      }
      throw new Error('No cached relay address')
    },

    // 4. Try SDK's connectToPeerViaRelay helper
    async () => {
      if (typeof coordinator!.connectToPeerViaRelay === 'function') {
        console.log(`[P2P Service] Trying SDK relay connection`)
        const result = await coordinator!.connectToPeerViaRelay(peerId)
        if (result.success) {
          return result.connectionType
        }
        throw new Error(result.error || 'SDK relay connection failed')
      }
      throw new Error('SDK relay method not available')
    },

    // 5. Try direct multiaddrs (unlikely to work for browsers)
    async () => {
      if (multiaddrs && multiaddrs.length > 0) {
        for (const addr of multiaddrs) {
          if (addr.includes('/p2p-circuit') || addr.includes('/webrtc')) {
            console.log(`[P2P Service] Trying multiaddr: ${addr}`)
            try {
              await coordinator!.connectToPeer(addr)
              return 'direct' as const
            } catch {
              continue
            }
          }
        }
      }
      throw new Error('No dialable multiaddrs')
    },
  ]

  // Try each connection method
  for (const attempt of connectionAttempts) {
    try {
      const connectionType = await attempt()
      console.log(
        `[P2P Service] ✅ Connected to ${peerId} via ${connectionType}`,
      )
      return { success: true, connectionType }
    } catch {
      // Try next method
      continue
    }
  }

  console.error(`[P2P Service] ❌ Failed to connect to ${peerId}`)
  return {
    success: false,
    connectionType: 'none',
    error: 'All connection methods failed',
  }
}
```

### Task 2.5: Implement Connection Retry with Exponential Backoff

**File**: `services/p2p.ts`

```typescript
/**
 * Connect to a peer with retry logic
 *
 * @param presence - Peer presence advertisement
 * @param maxRetries - Maximum number of retry attempts
 * @param baseDelayMs - Base delay between retries (exponential backoff)
 */
export async function connectToDiscoveredPeerWithRetry(
  presence: UIPresenceAdvertisement,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<{
  success: boolean
  connectionType: 'webrtc' | 'relay' | 'direct' | 'none'
  attempts: number
  error?: string
}> {
  let lastError: string | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(
      `[P2P Service] Connection attempt ${attempt}/${maxRetries} to ${presence.peerId}`,
    )

    const result = await connectToDiscoveredPeer(presence)

    if (result.success) {
      return { ...result, attempts: attempt }
    }

    lastError = result.error

    if (attempt < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s, ...
      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      console.log(`[P2P Service] Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return {
    success: false,
    connectionType: 'none',
    attempts: maxRetries,
    error: lastError || 'Max retries exceeded',
  }
}
```

---

## Updated Presence Message Handler

Update `_handlePresenceMessage()` to extract relay addresses:

```typescript
function _handlePresenceMessage(data: Uint8Array): void {
  try {
    const text = new TextDecoder().decode(data)
    const presence = JSON.parse(text)

    // Skip if not a wallet-presence advertisement
    if (presence.protocol && presence.protocol !== PRESENCE_PROTOCOL) {
      return
    }

    // Extract peer info
    const peerId = presence.peerInfo?.peerId ?? presence.peerId ?? ''
    const multiaddrs =
      presence.peerInfo?.multiaddrs ?? presence.multiaddrs ?? []

    // NEW: Extract relay addresses
    const relayAddrs = presence.relayAddrs ?? []
    const webrtcAddr = presence.webrtcAddr ?? null

    // Skip our own presence
    if (coordinator && peerId === coordinator.peerId) {
      return
    }

    const now = Date.now()
    const uiPresence: UIPresenceAdvertisement = {
      id: presence.id ?? `${peerId}-presence`,
      peerId,
      multiaddrs,
      relayAddrs, // NEW
      webrtcAddr, // NEW
      walletAddress: presence.walletAddress ?? '',
      nickname: presence.nickname,
      avatar: presence.avatar,
      createdAt: presence.createdAt ?? now,
      expiresAt: presence.expiresAt ?? now + PRESENCE_TTL,
    }

    // Skip expired presence
    if (uiPresence.expiresAt <= now) {
      return
    }

    // Notify callback
    if (eventCallbacks.onPresenceDiscovered) {
      eventCallbacks.onPresenceDiscovered(uiPresence)
    }
  } catch {
    // Ignore malformed messages
  }
}
```

---

## Updated Type Definitions

**File**: `types/p2p.ts`

```typescript
/**
 * UI-friendly wallet presence representation
 */
export interface UIPresenceAdvertisement {
  id: string
  peerId: string
  multiaddrs: string[]
  relayAddrs: string[] // NEW: Dialable relay addresses
  webrtcAddr: string | null // NEW: WebRTC-specific address
  walletAddress: string
  nickname?: string
  avatar?: string
  createdAt: number
  expiresAt: number
  // Connection state (wallet-side tracking)
  connectionStatus?: 'disconnected' | 'connecting' | 'connected' | 'failed'
  connectionType?: 'relay' | 'webrtc' | 'direct'
  lastConnectionAttempt?: number
}
```

---

## Exports

Add new exports to `services/p2p.ts`:

```typescript
export {
  // ... existing exports ...
  connectToDiscoveredPeer,
  connectToDiscoveredPeerWithRetry,
  getCachedRelayAddress,
  getDialableAddresses,
}
```

---

## Testing

### Integration Tests

```typescript
describe('P2P Service Connectivity', () => {
  it('should include relay addresses in presence advertisement', async () => {
    await initializeP2P({ bootstrapNodes: [...] }, {})

    // Wait for bootstrap connection
    await waitForDHTReady()

    const { relayAddrs, webrtcAddr } = getDialableAddresses()
    expect(relayAddrs.length).toBeGreaterThan(0)
    expect(webrtcAddr).toBeTruthy()
  })

  it('should connect to discovered peer via relay', async () => {
    const presence: UIPresenceAdvertisement = {
      peerId: 'target-peer-id',
      relayAddrs: ['/dns4/.../p2p-circuit/p2p/target-peer-id'],
      // ...
    }

    const result = await connectToDiscoveredPeer(presence)
    expect(result.success).toBe(true)
    expect(['webrtc', 'relay']).toContain(result.connectionType)
  })
})
```

---

_Part of WebRTC Connectivity Remediation Plan_
