# Testing and Verification Plan

## Overview

This document outlines the testing strategy for verifying WebRTC connectivity between browser wallets through the relay (bootstrap server).

---

## Test Environment Setup

### Prerequisites

1. **lotus-dht-server** running with circuit relay enabled
2. **Two browser instances** (can be same browser, different tabs/windows)
3. **lotus-sdk** with relay address methods implemented
4. **lotus-web-wallet** with connectivity changes applied

### Bootstrap Server Configuration

Ensure the bootstrap server (`lotus-dht-server/server.ts`) has:

```typescript
// Required configuration
enableRelay: true,
enableRelayServer: true,
enableGossipSub: true,
```

Verify server is running:

```bash
curl https://dht.lotusia.org:6971/health
```

Expected response:

```json
{
  "status": "healthy",
  "peerId": "12D3KooW...",
  "connectedPeers": 2,
  "subscribedTopics": ["lotus/discovery/wallet-presence", ...],
  "dht": { "ready": true }
}
```

---

## Test Cases

### Task 6.1: Test Relay Address Advertisement

**Objective**: Verify that Wallet A includes dialable relay addresses in presence advertisements.

**Steps**:

1. Open Wallet A in browser
2. Enable P2P and presence advertising
3. Check browser console for advertisement details

**Expected Console Output**:

```
[P2P Service] Advertising presence with addresses:
  multiaddrs: 2
  relayAddrs: 1
  webrtcAddr: available
```

**Verification**:

```javascript
// In browser console
const p2pStore = useP2PStore()
const presence = p2pStore.myPresenceConfig
console.log('Relay addresses:', p2pStore.multiaddrs)
```

**Pass Criteria**:

- [ ] `relayAddrs` array has at least 1 entry
- [ ] Relay address contains `/p2p-circuit/p2p/`
- [ ] `webrtcAddr` is not null

---

### Task 6.2: Test WebRTC Connection Establishment

**Objective**: Verify that Wallet B can connect to Wallet A via WebRTC through the relay.

**Steps**:

1. Open Wallet A, enable P2P and presence
2. Open Wallet B, enable P2P and presence
3. Wait for Wallet B to discover Wallet A
4. Trigger connection from Wallet B to Wallet A

**Manual Test**:

```javascript
// In Wallet B's browser console
const p2pStore = useP2PStore()

// Find Wallet A in online peers
const walletA = p2pStore.onlinePeers[0]
console.log('Discovered peer:', walletA.peerId)
console.log('Relay addresses:', walletA.relayAddrs)

// Connect
const result = await p2pStore.connectToPresence(walletA)
console.log('Connection result:', result)
```

**Expected Output**:

```
Connection result: {
  success: true,
  connectionType: 'webrtc'  // or 'relay' initially
}
```

**Pass Criteria**:

- [ ] `result.success` is `true`
- [ ] `result.connectionType` is `'webrtc'` or `'relay'`
- [ ] No console errors during connection

---

### Task 6.3: Test MuSig2 Session with Connected Participants

**Objective**: Verify that a complete MuSig2 signing session works between connected wallets.

**Prerequisites**:

- Two wallets with shared wallet created
- Both wallets connected via WebRTC/relay

**Steps**:

1. Wallet A proposes a spend from shared wallet
2. Wallet B receives session announcement
3. Wallet B joins session
4. Nonce exchange completes
5. Partial signature exchange completes
6. Session finalizes with valid signature

**Manual Test**:

```javascript
// In Wallet A (initiator)
const musig2Store = useMuSig2Store()

const result = await musig2Store.proposeSpend({
  walletId: 'shared-wallet-id',
  recipient: 'lotus_...',
  amountSats: 10000n,
})

console.log('Propose result:', result)
```

**Expected Flow**:

```
[MuSig2 Store] Ensuring 1 participants are connected...
[MuSig2 Service] ✅ 12D3KooW... already connected via webrtc
[MuSig2 Service] All participants connected, proceeding with session creation
[MuSig2 Service] Created session: session-abc123
```

**Pass Criteria**:

- [ ] Session created successfully
- [ ] Wallet B receives session announcement
- [ ] Nonce exchange completes (both wallets)
- [ ] Partial signature exchange completes
- [ ] Final signature is valid

---

### Task 6.4: Test Connection Recovery After Network Interruption

**Objective**: Verify that connections can be re-established after brief network issues.

**Steps**:

1. Establish WebRTC connection between Wallet A and B
2. Simulate network interruption (disable/enable network)
3. Verify connection is restored or can be re-established

**Manual Test**:

```javascript
// Before interruption
const p2pStore = useP2PStore()
console.log('Connected peers:', p2pStore.connectedPeers.length)

// After network restored
setTimeout(() => {
  console.log('Connected peers after recovery:', p2pStore.connectedPeers.length)

  // If disconnected, try reconnecting
  if (p2pStore.connectedPeers.length === 0) {
    const peer = p2pStore.onlinePeers[0]
    p2pStore.connectToPresence(peer).then(console.log)
  }
}, 5000)
```

**Pass Criteria**:

- [ ] Connection status updates to 'disconnected' on interruption
- [ ] Reconnection attempt succeeds
- [ ] Activity feed shows connection events

---

### Task 6.5: Test with Multiple Participants (3+ Wallets)

**Objective**: Verify that MuSig2 sessions work with more than 2 participants.

**Prerequisites**:

- Three browser instances with wallets
- Shared wallet with all three participants

**Steps**:

1. All three wallets connect to P2P network
2. Verify all wallets discover each other
3. Establish connections between all pairs
4. Initiate MuSig2 session from Wallet A
5. Wallets B and C join session
6. Complete signing protocol

**Verification**:

```javascript
// Check all participants connected
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()

console.log('Online peers:', p2pStore.onlinePeers.length)
console.log('Connected peers:', p2pStore.connectedPeers.length)

// Should show 2 other wallets
```

**Pass Criteria**:

- [ ] All 3 wallets discover each other
- [ ] All pairwise connections established
- [ ] Session includes all 3 participants
- [ ] Nonce exchange completes for all 3
- [ ] Partial signatures collected from all 3
- [ ] Final signature valid

---

### Task 6.6: Test Page Reload Preserves Discovery

**Objective**: Verify that reloading a wallet page doesn't break ongoing sessions.

**Steps**:

1. Wallet A and B connected, session in progress
2. Reload Wallet B's page
3. Verify Wallet B can rejoin session or session handles gracefully

**Pass Criteria**:

- [ ] Wallet B reconnects to P2P network after reload
- [ ] Wallet B re-discovers Wallet A
- [ ] Session state is recoverable or fails gracefully

---

## Automated Test Scripts

### Connection Test Script

```typescript
// test/p2p/connection.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('P2P WebRTC Connectivity', () => {
  let walletA: TestWallet
  let walletB: TestWallet

  beforeAll(async () => {
    walletA = await createTestWallet('Wallet A')
    walletB = await createTestWallet('Wallet B')

    await walletA.initializeP2P()
    await walletB.initializeP2P()
  })

  afterAll(async () => {
    await walletA.cleanup()
    await walletB.cleanup()
  })

  it('should advertise with relay addresses', async () => {
    await walletA.advertisePresence()

    const addresses = walletA.getDialableAddresses()
    expect(addresses.relayAddrs.length).toBeGreaterThan(0)
    expect(addresses.relayAddrs[0]).toContain('/p2p-circuit/')
  })

  it('should discover other wallet', async () => {
    await walletA.advertisePresence()

    // Wait for discovery
    const discovered = await walletB.waitForPeerDiscovery(walletA.peerId, 30000)
    expect(discovered).toBeTruthy()
  })

  it('should connect via WebRTC', async () => {
    const presence = walletB.getDiscoveredPeer(walletA.peerId)
    const result = await walletB.connectToPeer(presence)

    expect(result.success).toBe(true)
    expect(['webrtc', 'relay']).toContain(result.connectionType)
  })

  it('should complete MuSig2 session', async () => {
    // Create shared wallet
    const sharedWallet = await createSharedWallet([walletA, walletB])

    // Propose spend
    const sessionResult = await walletA.proposeSpend(sharedWallet.id, 10000n)
    expect(sessionResult.success).toBe(true)

    // Wait for session completion
    const signature = await waitForSessionComplete(
      sessionResult.sessionId,
      60000,
    )
    expect(signature).toBeTruthy()
  })
})
```

### Bootstrap Health Check Script

```typescript
// scripts/check-bootstrap-health.ts

async function checkBootstrapHealth() {
  const response = await fetch('https://dht.lotusia.org:6971/health')
  const health = await response.json()

  console.log('Bootstrap Server Health:')
  console.log('  Status:', health.status)
  console.log('  Peer ID:', health.peerId)
  console.log('  Connected Peers:', health.connectedPeers)
  console.log('  DHT Ready:', health.dht.ready)
  console.log('  Topics:', health.subscribedTopics.join(', '))

  if (health.status !== 'healthy') {
    console.error('❌ Bootstrap server unhealthy!')
    process.exit(1)
  }

  console.log('✅ Bootstrap server healthy')
}

checkBootstrapHealth()
```

---

## Debugging Tools

### Console Commands for Debugging

```javascript
// Get P2P state
const p2pStore = useP2PStore()
console.log({
  initialized: p2pStore.initialized,
  connected: p2pStore.connected,
  peerId: p2pStore.peerId,
  connectionState: p2pStore.connectionState,
  connectedPeers: p2pStore.connectedPeers.length,
  onlinePeers: p2pStore.onlinePeers.length,
})

// Get connection details for a peer
const peerId = '12D3KooW...'
const status = p2pStore.getPeerConnectionStatus(peerId)
console.log('Connection status:', status)

// Get relay addresses
import { getDialableAddresses } from '~/services/p2p'
console.log('Dialable addresses:', getDialableAddresses())

// Check bootstrap server health
import { checkBootstrapHealth } from '~/services/p2p'
const health = await checkBootstrapHealth()
console.log('Bootstrap health:', health)
```

### Network Tab Inspection

Look for:

- WebSocket connection to bootstrap server (`wss://...`)
- WebRTC ICE candidate exchanges
- STUN/TURN server requests (if configured)

### libp2p Debug Logging

Enable verbose logging:

```javascript
localStorage.setItem('debug', 'libp2p:*')
// Reload page
```

---

## Success Metrics

| Metric                     | Target | Measurement                                                  |
| -------------------------- | ------ | ------------------------------------------------------------ |
| Relay address availability | 100%   | Wallets always have relay address after bootstrap connection |
| Peer discovery time        | < 30s  | Time from presence advertisement to discovery                |
| Connection success rate    | > 90%  | Successful connections / attempted connections               |
| WebRTC upgrade rate        | > 80%  | WebRTC connections / total connections                       |
| MuSig2 session completion  | > 95%  | Completed sessions / initiated sessions                      |
| Connection recovery time   | < 10s  | Time to reconnect after brief interruption                   |

---

## Known Limitations

1. **Browser Compatibility**: WebRTC support varies by browser
2. **Firewall Restrictions**: Some corporate networks block WebRTC
3. **Mobile Browsers**: May have limited WebRTC support
4. **Battery Impact**: WebRTC connections consume more power

---

## Troubleshooting Guide

### "No relay addresses available"

**Cause**: Not connected to bootstrap server or bootstrap doesn't support relay

**Fix**:

1. Check bootstrap server health
2. Verify WebSocket connection to bootstrap
3. Wait for DHT ready state before advertising

### "Connection timeout"

**Cause**: Peer unreachable or relay overloaded

**Fix**:

1. Retry connection with exponential backoff
2. Check if peer is still online
3. Verify relay server capacity

### "WebRTC negotiation failed"

**Cause**: ICE candidate exchange failed

**Fix**:

1. Check browser WebRTC support
2. Verify no firewall blocking UDP
3. Consider TURN server fallback (future)

---

_Part of WebRTC Connectivity Remediation Plan_
