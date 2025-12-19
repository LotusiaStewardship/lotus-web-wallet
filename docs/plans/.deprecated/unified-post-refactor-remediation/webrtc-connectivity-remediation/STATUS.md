# WebRTC Connectivity Remediation - Status

## Current Status: **Planning**

**Last Updated**: December 18, 2024

---

## Progress Tracker

### Phase 1: SDK Relay Address Discovery (lotus-sdk)

| Task                                           | Status         | Notes |
| ---------------------------------------------- | -------------- | ----- |
| 1.1 Add `getRelayAddresses()` method           | ⬜ Not Started |       |
| 1.2 Build relay addresses from bootstrap peers | ⬜ Not Started |       |
| 1.3 Emit event when relay addresses available  | ⬜ Not Started |       |
| 1.4 Add `connectToPeerViaRelay()` helper       | ⬜ Not Started |       |

### Phase 2: Wallet Service Layer - Relay Address Handling

| Task                                                   | Status         | Notes |
| ------------------------------------------------------ | -------------- | ----- |
| 2.1 Get relay addresses from SDK when advertising      | ⬜ Not Started |       |
| 2.2 Include relay addresses in presence advertisements | ⬜ Not Started |       |
| 2.3 Subscribe to `lotus/peers` topic                   | ⬜ Not Started |       |
| 2.4 Add `connectToDiscoveredPeer()` function           | ⬜ Not Started |       |
| 2.5 Implement connection retry with backoff            | ⬜ Not Started |       |

### Phase 3: Wallet Store Layer - Connection Management

| Task                                   | Status         | Notes |
| -------------------------------------- | -------------- | ----- |
| 3.1 Add `connectToOnlinePeer()` action | ⬜ Not Started |       |
| 3.2 Track connection status per peer   | ⬜ Not Started |       |
| 3.3 Auto-connect for MuSig2 sessions   | ⬜ Not Started |       |
| 3.4 Add connection state to types      | ⬜ Not Started |       |
| 3.5 Emit connection events             | ⬜ Not Started |       |

### Phase 4: MuSig2 Session Connectivity

| Task                                              | Status         | Notes |
| ------------------------------------------------- | -------------- | ----- |
| 4.1 Connect to participants before nonce exchange | ⬜ Not Started |       |
| 4.2 Verify connectivity before announcing session | ⬜ Not Started |       |
| 4.3 Handle connection failures gracefully         | ⬜ Not Started |       |
| 4.4 Add participant connection status to UI       | ⬜ Not Started |       |

### Phase 5: UI/UX Improvements

| Task                                           | Status         | Notes |
| ---------------------------------------------- | -------------- | ----- |
| 5.1 Show connection status on discovered peers | ⬜ Not Started |       |
| 5.2 Add "Connect" button for peers             | ⬜ Not Started |       |
| 5.3 Show WebRTC vs Relay connection type       | ⬜ Not Started |       |
| 5.4 Add connection diagnostics panel           | ⬜ Not Started |       |

### Phase 6: Testing & Verification

| Task                                                | Status         | Notes |
| --------------------------------------------------- | -------------- | ----- |
| 6.1 Test relay address advertisement                | ⬜ Not Started |       |
| 6.2 Test WebRTC connection establishment            | ⬜ Not Started |       |
| 6.3 Test MuSig2 session with connected participants | ⬜ Not Started |       |
| 6.4 Test connection recovery                        | ⬜ Not Started |       |
| 6.5 Test with 3+ participants                       | ⬜ Not Started |       |
| 6.6 Test page reload behavior                       | ⬜ Not Started |       |

---

## Blockers

None currently identified.

---

## Dependencies

| Dependency               | Status       | Notes                        |
| ------------------------ | ------------ | ---------------------------- |
| lotus-sdk access         | ✅ Available | SDK modifications required   |
| lotus-dht-server running | ✅ Available | Bootstrap server operational |
| @libp2p/webrtc package   | ✅ Available | Already in lotus-sdk         |

---

## Next Steps

1. Begin Phase 1 implementation in lotus-sdk
2. Test relay address generation with bootstrap server
3. Proceed to Phase 2 wallet service changes

---

## Legend

- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked
- ⏸️ On Hold
