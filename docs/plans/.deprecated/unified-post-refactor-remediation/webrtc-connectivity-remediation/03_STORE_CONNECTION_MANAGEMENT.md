# Store Layer Connection Management

## Overview

This document details the Pinia store layer changes required to manage connections to discovered peers and track connection status.

---

## Current State

### P2P Store (stores/p2p.ts)

```typescript
// Current: Presence discovery only stores, doesn't connect
_handlePresenceDiscovered(presence: UIPresenceAdvertisement) {
  if (presence.peerId === this.peerId) return

  const existingIndex = this.onlinePeers.findIndex(p => p.peerId === presence.peerId)
  if (existingIndex >= 0) {
    this.onlinePeers[existingIndex] = presence
  } else {
    this.onlinePeers.push(presence)
  }
}
```

### MuSig2 Store (stores/musig2.ts)

```typescript
// Current: Assumes peers are already connected for sessions
async proposeSpend(params: SpendProposalParams) {
  // ... builds session but doesn't verify connectivity
}
```

---

## Implementation

### Task 3.1: Add `connectToOnlinePeer()` Action

**File**: `stores/p2p.ts`

```typescript
import {
  connectToDiscoveredPeer,
  connectToDiscoveredPeerWithRetry,
} from '~/services/p2p'

// Add to actions
actions: {
  // ... existing actions ...

  /**
   * Connect to an online peer by peer ID
   *
   * @param peerId - The peer ID to connect to
   * @returns Connection result
   */
  async connectToOnlinePeer(peerId: string): Promise<{
    success: boolean
    connectionType: 'webrtc' | 'relay' | 'direct' | 'none'
    error?: string
  }> {
    // Find the peer in online peers
    const presence = this.onlinePeers.find(p => p.peerId === peerId)
    if (!presence) {
      return {
        success: false,
        connectionType: 'none',
        error: 'Peer not found in online peers'
      }
    }

    return await this.connectToPresence(presence)
  },

  /**
   * Connect to a peer using their presence advertisement
   *
   * @param presence - The peer's presence advertisement
   * @returns Connection result
   */
  async connectToPresence(presence: UIPresenceAdvertisement): Promise<{
    success: boolean
    connectionType: 'webrtc' | 'relay' | 'direct' | 'none'
    error?: string
  }> {
    const { peerId } = presence

    // Update connection status to 'connecting'
    this._updatePeerConnectionStatus(peerId, 'connecting')

    try {
      const result = await connectToDiscoveredPeerWithRetry(presence, 3, 1000)

      if (result.success) {
        this._updatePeerConnectionStatus(peerId, 'connected', result.connectionType)
        this._addActivityEvent({
          type: 'peer_joined',
          peerId,
          message: `Connected to ${presence.nickname || peerId.slice(0, 12)}... via ${result.connectionType}`,
        })
      } else {
        this._updatePeerConnectionStatus(peerId, 'failed')
        this._addActivityEvent({
          type: 'error',
          peerId,
          message: `Failed to connect to ${presence.nickname || peerId.slice(0, 12)}...: ${result.error}`,
        })
      }

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      this._updatePeerConnectionStatus(peerId, 'failed')
      return { success: false, connectionType: 'none', error: errorMsg }
    }
  },

  /**
   * Connect to multiple peers in parallel
   *
   * @param peerIds - Array of peer IDs to connect to
   * @returns Map of peer ID to connection result
   */
  async connectToMultiplePeers(peerIds: string[]): Promise<Map<string, {
    success: boolean
    connectionType: 'webrtc' | 'relay' | 'direct' | 'none'
    error?: string
  }>> {
    const results = new Map()

    // Connect in parallel with concurrency limit
    const CONCURRENCY = 3
    for (let i = 0; i < peerIds.length; i += CONCURRENCY) {
      const batch = peerIds.slice(i, i + CONCURRENCY)
      const batchResults = await Promise.all(
        batch.map(peerId => this.connectToOnlinePeer(peerId))
      )
      batch.forEach((peerId, idx) => {
        results.set(peerId, batchResults[idx])
      })
    }

    return results
  },
}
```

### Task 3.2: Track Connection Status Per Discovered Peer

**File**: `stores/p2p.ts`

Add connection status tracking:

```typescript
// Add to state
state: (): P2PState => ({
  // ... existing state ...

  /** Connection status per peer */
  peerConnectionStatus: new Map<string, {
    status: 'disconnected' | 'connecting' | 'connected' | 'failed'
    connectionType?: 'webrtc' | 'relay' | 'direct'
    lastAttempt?: number
    error?: string
  }>(),
}),

// Add to actions
actions: {
  // ... existing actions ...

  /**
   * Update connection status for a peer
   */
  _updatePeerConnectionStatus(
    peerId: string,
    status: 'disconnected' | 'connecting' | 'connected' | 'failed',
    connectionType?: 'webrtc' | 'relay' | 'direct',
    error?: string
  ) {
    this.peerConnectionStatus.set(peerId, {
      status,
      connectionType,
      lastAttempt: Date.now(),
      error,
    })

    // Also update the presence object if it exists
    const presenceIdx = this.onlinePeers.findIndex(p => p.peerId === peerId)
    if (presenceIdx >= 0) {
      this.onlinePeers[presenceIdx] = {
        ...this.onlinePeers[presenceIdx],
        connectionStatus: status,
        connectionType,
        lastConnectionAttempt: Date.now(),
      }
    }
  },

  /**
   * Get connection status for a peer
   */
  getPeerConnectionStatus(peerId: string): {
    status: 'disconnected' | 'connecting' | 'connected' | 'failed'
    connectionType?: 'webrtc' | 'relay' | 'direct'
  } {
    const cached = this.peerConnectionStatus.get(peerId)
    if (cached) return cached

    // Check if actually connected via libp2p
    if (this.connectedPeers.some(p => p.peerId === peerId)) {
      return { status: 'connected' }
    }

    return { status: 'disconnected' }
  },

  /**
   * Check if a peer is connected
   */
  isPeerConnected(peerId: string): boolean {
    return this.getPeerConnectionStatus(peerId).status === 'connected'
  },
}

// Add to getters
getters: {
  // ... existing getters ...

  /**
   * Get all connected online peers
   */
  connectedOnlinePeers: (state): UIPresenceAdvertisement[] => {
    return state.onlinePeers.filter(p =>
      p.connectionStatus === 'connected' ||
      state.connectedPeers.some(cp => cp.peerId === p.peerId)
    )
  },

  /**
   * Get count of connected online peers
   */
  connectedOnlinePeerCount: (state): number => {
    return state.onlinePeers.filter(p =>
      p.connectionStatus === 'connected' ||
      state.connectedPeers.some(cp => cp.peerId === p.peerId)
    ).length
  },
}
```

### Task 3.3: Auto-Connect When MuSig2 Session Requires

**File**: `stores/musig2.ts`

```typescript
import { useP2PStore } from './p2p'

// Add to actions
actions: {
  // ... existing actions ...

  /**
   * Ensure all session participants are connected
   *
   * @param participantPeerIds - Array of participant peer IDs
   * @returns Connection results
   */
  async ensureParticipantsConnected(participantPeerIds: string[]): Promise<{
    allConnected: boolean
    results: Map<string, { success: boolean; error?: string }>
  }> {
    const p2pStore = useP2PStore()
    const results = new Map<string, { success: boolean; error?: string }>()

    // Filter out our own peer ID
    const otherParticipants = participantPeerIds.filter(
      id => id !== p2pStore.peerId
    )

    // Check which participants need connection
    const needConnection = otherParticipants.filter(
      peerId => !p2pStore.isPeerConnected(peerId)
    )

    if (needConnection.length === 0) {
      // All already connected
      otherParticipants.forEach(id => results.set(id, { success: true }))
      return { allConnected: true, results }
    }

    console.log(`[MuSig2 Store] Connecting to ${needConnection.length} participants...`)

    // Connect to each participant
    const connectionResults = await p2pStore.connectToMultiplePeers(needConnection)

    // Merge results
    let allConnected = true
    for (const peerId of otherParticipants) {
      if (p2pStore.isPeerConnected(peerId)) {
        results.set(peerId, { success: true })
      } else {
        const connResult = connectionResults.get(peerId)
        results.set(peerId, {
          success: false,
          error: connResult?.error || 'Connection failed'
        })
        allConnected = false
      }
    }

    return { allConnected, results }
  },

  /**
   * Propose a spend from a shared wallet
   * Enhanced to ensure participant connectivity first
   */
  async proposeSpend(params: SpendProposalParams): Promise<{
    success: boolean
    sessionId?: string
    error?: string
  }> {
    // Get shared wallet
    const wallet = this.sharedWallets.find(w => w.id === params.walletId)
    if (!wallet) {
      return { success: false, error: 'Shared wallet not found' }
    }

    // Get participant peer IDs
    const participantPeerIds = wallet.participants
      .map(p => p.peerId)
      .filter((id): id is string => !!id)

    // Ensure all participants are connected
    const { allConnected, results } = await this.ensureParticipantsConnected(
      participantPeerIds
    )

    if (!allConnected) {
      const disconnected = Array.from(results.entries())
        .filter(([_, r]) => !r.success)
        .map(([id]) => id.slice(0, 12) + '...')

      return {
        success: false,
        error: `Cannot reach participants: ${disconnected.join(', ')}`
      }
    }

    // Proceed with session creation
    // ... existing session creation logic ...
  },
}
```

### Task 3.4: Add Connection State to UIPresenceAdvertisement Type

**File**: `types/p2p.ts`

```typescript
/**
 * UI-friendly wallet presence representation
 */
export interface UIPresenceAdvertisement {
  id: string
  peerId: string
  multiaddrs: string[]
  relayAddrs: string[]
  webrtcAddr: string | null
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

/**
 * Connection status for a peer
 */
export interface PeerConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'failed'
  connectionType?: 'webrtc' | 'relay' | 'direct'
  lastAttempt?: number
  error?: string
}
```

### Task 3.5: Emit Events for Connection Success/Failure

**File**: `stores/p2p.ts`

Add event emission:

```typescript
// Add to actions
actions: {
  // ... existing actions ...

  /**
   * Connect to a peer and emit appropriate events
   */
  async connectToPresence(presence: UIPresenceAdvertisement): Promise<{
    success: boolean
    connectionType: 'webrtc' | 'relay' | 'direct' | 'none'
    error?: string
  }> {
    const { peerId } = presence

    // Update connection status to 'connecting'
    this._updatePeerConnectionStatus(peerId, 'connecting')

    // Emit connecting event
    this._emitConnectionEvent('connecting', peerId, presence)

    try {
      const result = await connectToDiscoveredPeerWithRetry(presence, 3, 1000)

      if (result.success) {
        this._updatePeerConnectionStatus(peerId, 'connected', result.connectionType)
        this._emitConnectionEvent('connected', peerId, presence, result.connectionType)

        // Update contacts store with last seen
        const contactsStore = useContactsStore()
        contactsStore.updateLastSeen(peerId)
      } else {
        this._updatePeerConnectionStatus(peerId, 'failed', undefined, result.error)
        this._emitConnectionEvent('failed', peerId, presence, undefined, result.error)
      }

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      this._updatePeerConnectionStatus(peerId, 'failed', undefined, errorMsg)
      this._emitConnectionEvent('failed', peerId, presence, undefined, errorMsg)
      return { success: false, connectionType: 'none', error: errorMsg }
    }
  },

  /**
   * Emit a connection event
   */
  _emitConnectionEvent(
    event: 'connecting' | 'connected' | 'failed',
    peerId: string,
    presence: UIPresenceAdvertisement,
    connectionType?: 'webrtc' | 'relay' | 'direct',
    error?: string
  ) {
    // Add to activity feed
    switch (event) {
      case 'connecting':
        this._addActivityEvent({
          type: 'info',
          peerId,
          message: `Connecting to ${presence.nickname || peerId.slice(0, 12)}...`,
        })
        break
      case 'connected':
        this._addActivityEvent({
          type: 'peer_joined',
          peerId,
          message: `Connected to ${presence.nickname || peerId.slice(0, 12)}... via ${connectionType}`,
        })
        break
      case 'failed':
        this._addActivityEvent({
          type: 'error',
          peerId,
          message: `Failed to connect to ${presence.nickname || peerId.slice(0, 12)}...: ${error}`,
        })
        break
    }

    // Could also emit to a global event bus if needed for other components
  },
}
```

---

## Updated State Interface

```typescript
export interface P2PState {
  initialized: boolean
  connected: boolean
  connectionState: P2PConnectionState
  peerId: string
  multiaddrs: string[]
  connectedPeers: UIPeerInfo[]
  onlinePeers: UIPresenceAdvertisement[]
  myPresenceConfig: PresenceConfig | null
  activityEvents: P2PActivityEvent[]
  dhtReady: boolean
  routingTableSize: number
  error: string | null
  settings: P2PSettings
  settingsLoaded: boolean

  // NEW: Connection status tracking
  peerConnectionStatus: Map<string, PeerConnectionStatus>
}
```

---

## Usage Examples

### Connect to a Discovered Peer

```typescript
const p2pStore = useP2PStore()

// Connect by peer ID
const result = await p2pStore.connectToOnlinePeer('12D3KooW...')
if (result.success) {
  console.log(`Connected via ${result.connectionType}`)
}

// Connect using presence object
const presence = p2pStore.onlinePeers[0]
const result = await p2pStore.connectToPresence(presence)
```

### Check Connection Status

```typescript
const p2pStore = useP2PStore()

// Check if connected
if (p2pStore.isPeerConnected('12D3KooW...')) {
  console.log('Peer is connected')
}

// Get detailed status
const status = p2pStore.getPeerConnectionStatus('12D3KooW...')
console.log(`Status: ${status.status}, Type: ${status.connectionType}`)
```

### MuSig2 Session with Connectivity Check

```typescript
const musig2Store = useMuSig2Store()

const result = await musig2Store.proposeSpend({
  walletId: 'shared-wallet-1',
  recipient: 'lotus_...',
  amountSats: 100000n,
})

if (!result.success) {
  // May fail due to connectivity issues
  console.error(result.error) // "Cannot reach participants: 12D3K..."
}
```

---

_Part of WebRTC Connectivity Remediation Plan_
