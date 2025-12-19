# Phase 7: Testing & Verification

**Priority**: P0  
**Effort**: 1-2 days  
**Dependencies**: All previous phases

---

## Overview

This phase provides comprehensive testing procedures to verify all remediation work. Testing covers WebRTC connectivity, discovery cache persistence, and UI consistency.

---

## Test Environment Setup

### Prerequisites

1. **Two browser instances** (different profiles or browsers)
2. **Running `lotus-dht-server`** bootstrap node
3. **Test wallet seeds** for both instances
4. **Network connectivity** to bootstrap server

### Environment Variables

```bash
# Ensure both wallets connect to same bootstrap
NUXT_PUBLIC_BOOTSTRAP_PEERS=/dns4/bootstrap.lotusia.org/tcp/6970/wss/p2p/12D3KooW...
```

---

## Test Categories

### Category 1: Discovery Cache Persistence

#### Test 1.1: Basic Persistence

**Steps**:

1. Open wallet in browser
2. Wait for P2P initialization
3. Wait for signer discovery (or trigger manually)
4. Open browser console
5. Verify log: `[DiscoveryCache] Loaded X entries` (may be 0 initially)
6. Wait for new signer discovery
7. Verify log: signer added to cache
8. Reload page (F5)
9. Verify log: `[DiscoveryCache] Loaded X entries` (should be > 0)
10. Verify signers appear in UI

**Expected Result**: Signers persist through reload

**Pass Criteria**:

- [ ] Cache loads on startup
- [ ] Signers visible after reload
- [ ] No duplicate entries

#### Test 1.2: Rapid Reload

**Steps**:

1. Discover a signer
2. Immediately reload (within 500ms)
3. Verify signer persists

**Expected Result**: `beforeunload` handler flushes pending saves

**Pass Criteria**:

- [ ] Signer persists despite rapid reload

#### Test 1.3: Browser Close

**Steps**:

1. Discover a signer
2. Close browser tab completely
3. Reopen tab
4. Verify signer persists

**Expected Result**: Data survives browser close

**Pass Criteria**:

- [ ] Signer visible after browser restart

---

### Category 2: WebRTC Connectivity

#### Test 2.1: Relay Address Advertisement

**Steps**:

1. Start Wallet A
2. Wait for bootstrap connection
3. Open console, check P2P stats
4. Verify `relayAddresses` array is populated
5. Verify format: `/dns4/.../wss/p2p/.../p2p-circuit/p2p/...`

**Expected Result**: Relay addresses available after bootstrap connection

**Pass Criteria**:

- [ ] `getStats().relayAddresses` has entries
- [ ] Addresses are in correct format

#### Test 2.2: Presence Discovery with Relay Addresses

**Steps**:

1. Start Wallet A and Wallet B
2. Wait for both to advertise presence
3. In Wallet B, check discovered peers
4. Verify Wallet A's presence includes `relayAddrs`

**Expected Result**: Presence advertisements include relay addresses

**Pass Criteria**:

- [ ] Discovered peer has `relayAddrs` array
- [ ] Addresses are dialable format

#### Test 2.3: Peer Connection via Relay

**Steps**:

1. Start Wallet A and Wallet B
2. Wait for mutual discovery
3. In Wallet B, trigger connection to Wallet A
4. Check console for connection logs
5. Verify connection established

**Expected Result**: WebRTC or relay connection established

**Pass Criteria**:

- [ ] Connection succeeds
- [ ] Connection type logged (webrtc/relay)
- [ ] Both wallets show connected status

#### Test 2.4: Connection Status Tracking

**Steps**:

1. Connect Wallet A to Wallet B
2. Verify UI shows "Connected" status
3. Close Wallet A
4. Verify Wallet B UI updates to "Offline"

**Expected Result**: Connection status tracked in real-time

**Pass Criteria**:

- [ ] Status updates on connect
- [ ] Status updates on disconnect

---

### Category 3: MuSig2 Session Connectivity

#### Test 3.1: Pre-flight Connectivity Check

**Steps**:

1. Create shared wallet with Wallet A and Wallet B
2. Ensure both wallets online
3. In Wallet A, initiate signing session
4. Check console for pre-flight logs
5. Verify all participants connected before session starts

**Expected Result**: Pre-flight check runs and passes

**Pass Criteria**:

- [ ] Pre-flight check logged
- [ ] All participants connected
- [ ] Session created successfully

#### Test 3.2: Pre-flight Failure Handling

**Steps**:

1. Create shared wallet with Wallet A and Wallet B
2. Close Wallet B
3. In Wallet A, initiate signing session
4. Verify pre-flight fails with clear error

**Expected Result**: Session fails gracefully with helpful message

**Pass Criteria**:

- [ ] Pre-flight fails
- [ ] Error message names disconnected participant
- [ ] No session created

#### Test 3.3: Complete Signing Session

**Steps**:

1. Create shared wallet with Wallet A and Wallet B
2. Fund the shared wallet with test coins
3. Ensure both wallets online and connected
4. In Wallet A, create transaction from shared wallet
5. Wait for nonce exchange
6. Wait for signature exchange
7. Verify transaction broadcast

**Expected Result**: Complete MuSig2 signing flow works

**Pass Criteria**:

- [ ] Nonce exchange succeeds
- [ ] Partial signature exchange succeeds
- [ ] Final signature aggregated
- [ ] Transaction broadcast

#### Test 3.4: Multi-Participant Session (3+)

**Steps**:

1. Create shared wallet with 3 participants
2. Ensure all 3 wallets online
3. Initiate signing session
4. Complete signing flow

**Expected Result**: N-of-N signing works for N > 2

**Pass Criteria**:

- [ ] All 3 participants connected
- [ ] Signing session completes

---

### Category 4: UI Consistency

#### Test 4.1: Empty States

**Steps**:

1. Clear all contacts
2. Navigate to `/people/contacts`
3. Verify `UiAppEmptyState` component used
4. Verify action button works
5. Repeat for `/transact/history` (no transactions)

**Expected Result**: Consistent empty state component

**Pass Criteria**:

- [ ] Uses `UiAppEmptyState`
- [ ] Icon, title, description present
- [ ] Action button functional

#### Test 4.2: SignerCard Consistency

**Steps**:

1. Navigate to `/people/p2p`
2. View available signers
3. Navigate to `/people/shared-wallets/new`
4. View available signers
5. Compare visual appearance

**Expected Result**: Same component used in both contexts

**Pass Criteria**:

- [ ] Avatar rendering identical
- [ ] Badge colors identical
- [ ] Action buttons in same position

#### Test 4.3: Dark Mode

**Steps**:

1. Enable dark mode
2. Navigate through all P2P/MuSig2/Contacts pages
3. Verify all components render correctly

**Expected Result**: No contrast or visibility issues

**Pass Criteria**:

- [ ] All text readable
- [ ] All icons visible
- [ ] No broken backgrounds

#### Test 4.4: Mobile Viewport

**Steps**:

1. Set viewport to 375px width (mobile)
2. Navigate through all affected pages
3. Verify touch targets adequate (44px minimum)
4. Verify no horizontal overflow

**Expected Result**: Mobile-friendly layout

**Pass Criteria**:

- [ ] No horizontal scroll
- [ ] Touch targets adequate
- [ ] Content readable

---

## Regression Testing

### Critical Paths to Verify

1. **Wallet Creation**: Create new wallet, verify addresses generated
2. **Send Transaction**: Send from primary wallet, verify broadcast
3. **Receive Transaction**: Receive to primary wallet, verify balance update
4. **Contact Management**: Add, edit, delete contacts
5. **Shared Wallet Creation**: Create shared wallet, verify address
6. **P2P Connection**: Connect to bootstrap, advertise presence

### Automated Test Commands

```bash
# Run unit tests
npm run test

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

---

## Test Results Template

```markdown
## Test Results - [Date]

### Environment

- Browser: Chrome 120
- OS: macOS 14.2
- Bootstrap: bootstrap.lotusia.org

### Discovery Cache

| Test                  | Result | Notes |
| --------------------- | ------ | ----- |
| 1.1 Basic Persistence | ✅/❌  |       |
| 1.2 Rapid Reload      | ✅/❌  |       |
| 1.3 Browser Close     | ✅/❌  |       |

### WebRTC Connectivity

| Test                              | Result | Notes |
| --------------------------------- | ------ | ----- |
| 2.1 Relay Address Advertisement   | ✅/❌  |       |
| 2.2 Presence with Relay Addresses | ✅/❌  |       |
| 2.3 Peer Connection               | ✅/❌  |       |
| 2.4 Connection Status Tracking    | ✅/❌  |       |

### MuSig2 Sessions

| Test                   | Result | Notes |
| ---------------------- | ------ | ----- |
| 3.1 Pre-flight Check   | ✅/❌  |       |
| 3.2 Pre-flight Failure | ✅/❌  |       |
| 3.3 Complete Signing   | ✅/❌  |       |
| 3.4 Multi-Participant  | ✅/❌  |       |

### UI Consistency

| Test                       | Result | Notes |
| -------------------------- | ------ | ----- |
| 4.1 Empty States           | ✅/❌  |       |
| 4.2 SignerCard Consistency | ✅/❌  |       |
| 4.3 Dark Mode              | ✅/❌  |       |
| 4.4 Mobile Viewport        | ✅/❌  |       |

### Issues Found

1. [Issue description]
2. [Issue description]
```

---

## Success Criteria Summary

### Phase 1: Discovery Cache

- [ ] Signers persist through page reload
- [ ] No data loss during rapid navigation

### Phase 2-4: WebRTC/MuSig2

- [ ] Wallet A advertises with valid relay address
- [ ] Wallet B discovers and can connect to Wallet A
- [ ] WebRTC upgrade occurs
- [ ] MuSig2 nonce exchange succeeds
- [ ] MuSig2 partial signature exchange succeeds
- [ ] Complete signing session works end-to-end

### Phase 5-6: UI

- [ ] Zero duplicate components
- [ ] All empty states use `UiAppEmptyState`
- [ ] Consistent badge colors
- [ ] Consistent avatar rendering
- [ ] No visual regressions

---

## Known Limitations

1. **WebRTC in Safari**: May have limited support, test primarily in Chrome/Firefox
2. **NAT Traversal**: Some network configurations may prevent direct WebRTC
3. **Bootstrap Dependency**: All connectivity depends on bootstrap server availability

---

_Phase 7 of Post-Refactor Remediation Plan_
