# WebRTC Connectivity Remediation Plan

## Executive Summary

This document provides a comprehensive analysis of WebRTC connectivity issues in the lotus-web-wallet and a remediation plan to enable browser-to-browser P2P connections. The core problem is that **wallets advertising presence via GossipSub cannot be reached by other wallets** because proper WebRTC connection establishment through the relay (bootstrap server) is not implemented.

**Created**: December 18, 2024  
**Scope**: Enable WebRTC-based browser-to-browser connectivity for MuSig2 signing sessions  
**Priority**: P0 (Critical - Shared Wallet Coordination Non-Functional)  
**Estimated Effort**: 5-8 days

---

## Problem Statement

### Current Situation

1. **Wallets advertise presence** via GossipSub through the bootstrap server (`lotus-dht-server`)
2. **Advertisements contain peerId** which is necessary to establish connections
3. **No WebRTC connection path exists** - wallets cannot dial each other despite having peer IDs
4. **MuSig2 signing sessions fail** because participants cannot establish direct communication

### Why This Matters

MuSig2 multi-signature transactions require:

- **Real-time coordination** between N participants
- **Nonce exchange** (Round 1) - each signer shares their public nonce
- **Partial signature exchange** (Round 2) - each signer shares their partial signature
- **Session state synchronization** - all participants must be in sync

Without direct P2P connectivity, shared wallets are **non-functional**.

---

## Root Cause Analysis

### Critical Issue #1: Missing WebRTC Dial Path

**Location**: `services/p2p.ts`, `lotus-sdk/lib/p2p/coordinator.ts`

**Problem**: When a wallet discovers another wallet's presence advertisement, it has the `peerId` but **no way to establish a WebRTC connection**.

**Current Flow (Broken)**:

```
Wallet A                    Bootstrap Server                    Wallet B
   │                              │                                 │
   │──── advertise(peerId) ──────▶│                                 │
   │                              │◀──── subscribe(presence) ───────│
   │                              │                                 │
   │                              │──── presence(A.peerId) ────────▶│
   │                              │                                 │
   │                              │         ❌ NO CONNECTION PATH    │
   │                              │                                 │
```

**What Should Happen**:

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

**Impact**: HIGH - Browser-to-browser connectivity is impossible

---

### Critical Issue #2: Advertisements Missing Relay Addresses

**Location**: `services/p2p.ts` lines 566-581

**Problem**: Presence advertisements include `multiaddrs` from `coordinator.getStats().multiaddrs`, but in browser environments these may not include the **relay circuit address** that other browsers need to dial.

**Current Code**:

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

**Issue**: `getStats().multiaddrs` in browsers typically returns:

- `/p2p-circuit` (generic, not dialable)
- `/webrtc` (generic, not dialable)

What's needed is the **full relay circuit address**:

```
/dns4/bootstrap.lotusia.org/tcp/6970/wss/p2p/BOOTSTRAP_PEER_ID/p2p-circuit/p2p/OUR_PEER_ID
```

**Impact**: HIGH - Other wallets cannot construct a dialable address

---

### Critical Issue #3: No Connection Attempt on Presence Discovery

**Location**: `stores/p2p.ts` lines 529-553

**Problem**: When a presence advertisement is discovered, the wallet only stores it in `onlinePeers` but **never attempts to connect**.

**Current Code**:

```typescript
_handlePresenceDiscovered(presence: UIPresenceAdvertisement) {
  // Skip our own presence
  if (presence.peerId === this.peerId) return

  // Just store in array - NO CONNECTION ATTEMPT
  const existingIndex = this.onlinePeers.findIndex(p => p.peerId === presence.peerId)
  if (existingIndex >= 0) {
    this.onlinePeers[existingIndex] = presence
  } else {
    this.onlinePeers.push(presence)
  }
}
```

**Missing**: Automatic or on-demand connection establishment to discovered peers.

**Impact**: HIGH - Discovery without connectivity is useless

---

### Critical Issue #4: Bootstrap Server Not Providing Relay Addresses

**Location**: `lotus-dht-server/server.ts` lines 721-769

**Problem**: The bootstrap server broadcasts peer lists via `lotus/peers` topic, but wallets may not be subscribed to this topic or may not use the relay addresses provided.

**Current Server Code**:

```typescript
private async broadcastPeerList(): Promise<void> {
  const peerList = connectedPeers.map(peer => ({
    peerId: peer.peerId,
    multiaddrs: peer.multiaddrs || [],
    relayAddr: this.buildRelayAddress(peer.peerId), // ✅ Relay address built
    lastSeen: peer.lastSeen || Date.now(),
  }))

  await this.coordinator.publishToTopic('lotus/peers', message)
}
```

**Issue**: The wallet does not subscribe to `lotus/peers` topic or process these messages.

**Impact**: MEDIUM - Relay address discovery mechanism exists but is unused

---

### Critical Issue #5: WebRTC Signaling Not Implemented

**Location**: `lotus-sdk/lib/p2p/coordinator.ts`

**Problem**: While the SDK configures WebRTC transport, the **signaling flow** for establishing WebRTC connections through the relay is not explicitly handled.

**WebRTC Connection Flow** (should happen automatically via libp2p):

1. Wallet B dials Wallet A's relay address
2. Circuit relay connection established through bootstrap server
3. libp2p's WebRTC transport performs SDP exchange over the relay
4. Direct WebRTC connection established
5. Relay connection can be closed

**Current SDK Config** (appears correct):

```typescript
// Browser environment: Listen via circuit relay AND WebRTC
listenAddrs = ['/p2p-circuit', '/webrtc']

// WebRTC transport added
const { webRTC } = await import('@libp2p/webrtc')
transports.push(webRTC())
```

**Potential Issue**: The SDK may be correctly configured, but the wallet layer doesn't:

1. Construct proper relay+webrtc addresses
2. Attempt to dial discovered peers
3. Handle connection upgrade from relay to WebRTC

**Impact**: HIGH - WebRTC upgrade may not occur even with correct config

---

## Architecture Analysis

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOTUS WEB WALLET                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         P2P LAYER                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │  p2p.ts     │  │  musig2.ts  │  │  stores/    │                  │   │
│  │  │  (service)  │  │  (service)  │  │  p2p.ts     │                  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │   │
│  │         │                │                │                          │   │
│  │         └────────────────┼────────────────┘                          │   │
│  │                          │                                           │   │
│  │  ┌───────────────────────┴───────────────────────┐                  │   │
│  │  │              lotus-sdk P2P Module              │                  │   │
│  │  │  ┌─────────────┐  ┌─────────────┐             │                  │   │
│  │  │  │P2PCoordinator│  │MuSig2Coord │             │                  │   │
│  │  │  └──────┬──────┘  └─────────────┘             │                  │   │
│  │  │         │                                      │                  │   │
│  │  │  ┌──────┴──────┐                              │                  │   │
│  │  │  │   libp2p    │                              │                  │   │
│  │  │  │ ┌─────────┐ │                              │                  │   │
│  │  │  │ │WebSocket│ │  ❌ WebRTC Not Connected     │                  │   │
│  │  │  │ │Transport│ │                              │                  │   │
│  │  │  │ └─────────┘ │                              │                  │   │
│  │  │  └─────────────┘                              │                  │   │
│  │  └───────────────────────────────────────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│                    ┌─────────────────────────────────────┐                 │
│                    │         BOOTSTRAP SERVER            │                 │
│                    │  ┌─────────┐  ┌─────────────────┐   │                 │
│                    │  │GossipSub│  │  Circuit Relay  │   │                 │
│                    │  │  Relay  │  │     Server      │   │                 │
│                    │  └─────────┘  └─────────────────┘   │                 │
│                    └─────────────────────────────────────┘                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOTUS WEB WALLET                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         P2P LAYER                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │  p2p.ts     │  │  musig2.ts  │  │  stores/    │                  │   │
│  │  │  (service)  │  │  (service)  │  │  p2p.ts     │                  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │   │
│  │         │                │                │                          │   │
│  │         └────────────────┼────────────────┘                          │   │
│  │                          │                                           │   │
│  │  ┌───────────────────────┴───────────────────────┐                  │   │
│  │  │              lotus-sdk P2P Module              │                  │   │
│  │  │  ┌─────────────┐  ┌─────────────┐             │                  │   │
│  │  │  │P2PCoordinator│  │MuSig2Coord │             │                  │   │
│  │  │  └──────┬──────┘  └─────────────┘             │                  │   │
│  │  │         │                                      │                  │   │
│  │  │  ┌──────┴──────┐                              │                  │   │
│  │  │  │   libp2p    │                              │                  │   │
│  │  │  │ ┌─────────┐ ┌─────────┐ ┌──────────────┐  │                  │   │
│  │  │  │ │WebSocket│ │ WebRTC  │ │Circuit Relay │  │                  │   │
│  │  │  │ │Transport│ │Transport│ │  Transport   │  │                  │   │
│  │  │  │ └─────────┘ └─────────┘ └──────────────┘  │                  │   │
│  │  │  └─────────────────────────────────────────────┘                  │   │
│  │  └───────────────────────────────────────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                          ┌───────────┴───────────┐                         │
│                          │                       │                         │
│                          ▼                       ▼                         │
│    ┌─────────────────────────────────────┐  ┌─────────────────────────┐   │
│    │         BOOTSTRAP SERVER            │  │     OTHER WALLETS       │   │
│    │  ┌─────────┐  ┌─────────────────┐   │  │  ┌─────────────────┐    │   │
│    │  │GossipSub│  │  Circuit Relay  │   │  │  │ Direct WebRTC   │    │   │
│    │  │  Relay  │  │     Server      │   │  │  │   Connection    │    │   │
│    │  └─────────┘  └─────────────────┘   │  │  └─────────────────┘    │   │
│    └─────────────────────────────────────┘  └─────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Remediation Plan

### Phase 1: SDK Relay Address Discovery (lotus-sdk)

Ensure the SDK properly exposes relay circuit addresses for browser peers.

| Task                                                      | File                     | Priority | Effort |
| --------------------------------------------------------- | ------------------------ | -------- | ------ |
| 1.1 Add `getRelayAddresses()` method to P2PCoordinator    | `lib/p2p/coordinator.ts` | P0       | 2h     |
| 1.2 Build relay addresses from connected relay peers      | `lib/p2p/coordinator.ts` | P0       | 2h     |
| 1.3 Emit event when relay addresses become available      | `lib/p2p/coordinator.ts` | P0       | 1h     |
| 1.4 Add `connectToPeerViaRelay(peerId, relayAddr)` helper | `lib/p2p/coordinator.ts` | P0       | 2h     |

### Phase 2: Wallet Service Layer - Relay Address Handling

Update the P2P service to include proper relay addresses in advertisements.

| Task                                                             | File              | Priority | Effort |
| ---------------------------------------------------------------- | ----------------- | -------- | ------ |
| 2.1 Get relay addresses from SDK when advertising                | `services/p2p.ts` | P0       | 2h     |
| 2.2 Include relay addresses in presence advertisements           | `services/p2p.ts` | P0       | 1h     |
| 2.3 Subscribe to `lotus/peers` topic for relay address discovery | `services/p2p.ts` | P0       | 2h     |
| 2.4 Add `connectToDiscoveredPeer(presence)` function             | `services/p2p.ts` | P0       | 3h     |
| 2.5 Implement connection retry with exponential backoff          | `services/p2p.ts` | P1       | 2h     |

### Phase 3: Wallet Store Layer - Connection Management

Update the P2P store to manage connections to discovered peers.

| Task                                                       | File               | Priority | Effort |
| ---------------------------------------------------------- | ------------------ | -------- | ------ |
| 3.1 Add `connectToOnlinePeer(peerId)` action               | `stores/p2p.ts`    | P0       | 2h     |
| 3.2 Track connection status per discovered peer            | `stores/p2p.ts`    | P0       | 2h     |
| 3.3 Auto-connect to peers when MuSig2 session requires     | `stores/musig2.ts` | P0       | 3h     |
| 3.4 Add connection state to `UIPresenceAdvertisement` type | `types/p2p.ts`     | P0       | 1h     |
| 3.5 Emit events for connection success/failure             | `stores/p2p.ts`    | P1       | 1h     |

### Phase 4: MuSig2 Session Connectivity

Ensure MuSig2 sessions can establish connections to all participants.

| Task                                                          | File                 | Priority | Effort |
| ------------------------------------------------------------- | -------------------- | -------- | ------ |
| 4.1 Connect to all session participants before nonce exchange | `services/musig2.ts` | P0       | 3h     |
| 4.2 Verify connectivity before announcing session             | `services/musig2.ts` | P0       | 2h     |
| 4.3 Handle participant connection failures gracefully         | `services/musig2.ts` | P0       | 2h     |
| 4.4 Add session participant connection status to UI           | `stores/musig2.ts`   | P1       | 2h     |

### Phase 5: UI/UX Improvements

Provide visibility into connection status and enable manual connection actions.

| Task                                                     | File                   | Priority | Effort |
| -------------------------------------------------------- | ---------------------- | -------- | ------ |
| 5.1 Show connection status indicator on discovered peers | `components/p2p/*.vue` | P1       | 2h     |
| 5.2 Add "Connect" button for discovered peers            | `components/p2p/*.vue` | P1       | 2h     |
| 5.3 Show WebRTC vs Relay connection type                 | `components/p2p/*.vue` | P2       | 2h     |
| 5.4 Add connection diagnostics panel                     | `pages/settings/*.vue` | P2       | 3h     |

### Phase 6: Testing & Verification

| Task                                                     | Priority | Effort |
| -------------------------------------------------------- | -------- | ------ |
| 6.1 Test relay address advertisement between two wallets | P0       | 2h     |
| 6.2 Test WebRTC connection establishment via relay       | P0       | 2h     |
| 6.3 Test MuSig2 session with connected participants      | P0       | 3h     |
| 6.4 Test connection recovery after network interruption  | P1       | 2h     |
| 6.5 Test with multiple participants (3+ wallets)         | P1       | 2h     |

---

## Detailed Implementation

See the following documents for detailed implementation:

| Document                                                                 | Focus                                   |
| ------------------------------------------------------------------------ | --------------------------------------- |
| [01_SDK_RELAY_ADDRESSES.md](./01_SDK_RELAY_ADDRESSES.md)                 | SDK-side relay address discovery        |
| [02_SERVICE_CONNECTIVITY.md](./02_SERVICE_CONNECTIVITY.md)               | Wallet service layer connectivity       |
| [03_STORE_CONNECTION_MANAGEMENT.md](./03_STORE_CONNECTION_MANAGEMENT.md) | Store layer connection management       |
| [04_MUSIG2_SESSION_CONNECTIVITY.md](./04_MUSIG2_SESSION_CONNECTIVITY.md) | MuSig2 session participant connectivity |
| [05_TESTING.md](./05_TESTING.md)                                         | Testing and verification plan           |

---

## Key Implementation Details

### Relay Address Construction

The relay address format for browser-to-browser connections:

```
/dns4/bootstrap.lotusia.org/tcp/6970/wss/p2p/{BOOTSTRAP_PEER_ID}/p2p-circuit/p2p/{TARGET_PEER_ID}
```

For WebRTC upgrade:

```
/dns4/bootstrap.lotusia.org/tcp/6970/wss/p2p/{BOOTSTRAP_PEER_ID}/p2p-circuit/webrtc/p2p/{TARGET_PEER_ID}
```

### Connection Flow

```
1. Wallet A connects to bootstrap server via WebSocket
   └── Bootstrap server reserves relay slot for Wallet A

2. Wallet A advertises presence with relay address:
   └── relayAddr: /dns4/.../wss/p2p/BOOTSTRAP/p2p-circuit/p2p/WALLET_A

3. Wallet B discovers Wallet A's presence via GossipSub
   └── Receives peerId and relayAddr

4. Wallet B dials Wallet A's relay address:
   └── coordinator.connectToPeer(walletA.relayAddr)

5. Circuit relay connection established through bootstrap
   └── Bootstrap forwards traffic between A and B

6. libp2p WebRTC transport performs SDP exchange over relay
   └── ICE candidates exchanged, DTLS handshake

7. Direct WebRTC connection established
   └── Relay connection can be closed (optional)

8. MuSig2 protocol messages flow over WebRTC
   └── Nonces, partial signatures, session state
```

### Presence Advertisement Schema Update

```typescript
interface UIPresenceAdvertisement {
  id: string
  peerId: string
  multiaddrs: string[]
  relayAddrs: string[] // NEW: Dialable relay addresses
  webrtcAddr?: string // NEW: WebRTC-specific address
  walletAddress: string
  nickname?: string
  avatar?: string
  createdAt: number
  expiresAt: number
  // Connection state (wallet-side only)
  connectionStatus?: 'disconnected' | 'connecting' | 'connected' | 'failed'
  connectionType?: 'relay' | 'webrtc' | 'direct'
}
```

---

## Success Criteria

- [ ] Wallet A advertises presence with valid relay address
- [ ] Wallet B discovers Wallet A and can see relay address
- [ ] Wallet B successfully connects to Wallet A via relay
- [ ] WebRTC upgrade occurs (connection type changes from 'relay' to 'webrtc')
- [ ] MuSig2 nonce exchange succeeds between connected wallets
- [ ] MuSig2 partial signature exchange succeeds
- [ ] Complete MuSig2 signing session works end-to-end
- [ ] Connection survives brief network interruptions

---

## Risk Assessment

| Risk                            | Impact | Mitigation                                  |
| ------------------------------- | ------ | ------------------------------------------- |
| WebRTC not supported in browser | High   | Feature detection, fallback to relay-only   |
| Relay server overload           | Medium | Connection pooling, rate limiting           |
| NAT traversal failures          | Medium | TURN server fallback (future)               |
| SDK changes break wallet        | High   | Version pinning, comprehensive testing      |
| Bootstrap server downtime       | High   | Multiple bootstrap nodes, health monitoring |

---

## Dependencies

### Required Before Starting

- Access to `lotus-sdk` repository for SDK modifications
- Running `lotus-dht-server` bootstrap node
- Two browser instances for testing
- Understanding of libp2p WebRTC transport

### External Dependencies

- `@libp2p/webrtc` package (already in lotus-sdk)
- `@libp2p/circuit-relay-v2` package (already in lotus-sdk)
- Bootstrap server with circuit relay enabled (already configured)

---

## Compliance with Architecture Guidelines

This plan complies with the architecture documentation in `docs/architecture/`:

1. **Service-Store Separation** (02_STATE_MANAGEMENT.md): Connection logic in services, reactive state in stores
2. **Centralized SDK Provider** (01_CORE_ARCHITECTURE.md): All P2P operations through lotus-sdk
3. **Event-Driven Architecture** (00_OVERVIEW.md): Connection events flow through callbacks
4. **Mobile-First Design** (00_OVERVIEW.md): Connection UI works on mobile

---

_Created: December 18, 2024_  
_Status: Planning_
