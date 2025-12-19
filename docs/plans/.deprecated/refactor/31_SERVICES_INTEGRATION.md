# 31: Services Integration

## Overview

This phase integrates the services architecture (created in Phase 1) into the application's stores. The services were scaffolded but never connected to the stores at runtime. This phase completes the architectural refactor by:

1. **Replacing direct SDK/API calls** in stores with service layer calls
2. **Removing duplicate code** that exists in both services and stores
3. **Establishing clean data flow**: Pages → Stores → Services → SDK

---

## Current State

### Services (Created in Phase 1)

| Service               | Purpose                        | Status                     |
| --------------------- | ------------------------------ | -------------------------- |
| `services/chronik.ts` | Chronik client wrapper         | ✅ Created, not integrated |
| `services/storage.ts` | localStorage/IndexedDB wrapper | ✅ Created, not integrated |
| `services/p2p.ts`     | P2P coordinator wrapper        | ✅ Created, not integrated |
| `services/musig2.ts`  | MuSig2 coordinator wrapper     | ✅ Created, not integrated |

### Stores (Current Implementation)

| Store                | Current Pattern                             | Target Pattern                 |
| -------------------- | ------------------------------------------- | ------------------------------ |
| `stores/wallet.ts`   | Direct Chronik client, direct localStorage  | Use chronik + storage services |
| `stores/p2p.ts`      | Direct SDK coordinator, direct localStorage | Use p2p + storage services     |
| `stores/musig2.ts`   | Direct SDK coordinator                      | Use musig2 service             |
| `stores/network.ts`  | Direct localStorage                         | Use storage service            |
| `stores/contacts.ts` | Direct localStorage                         | Use storage service            |

---

## Integration Tasks

### Task 1: Wallet Store → Chronik Service

**Current** (`stores/wallet.ts`):

```typescript
// Direct Chronik client management
let ChronikClient: typeof ChronikClientType
let chronikLoaded = false

const loadChronik = async () => {
  if (!chronikLoaded) {
    const chronikModule = await import('chronik-client')
    ChronikClient = chronikModule.ChronikClient
    chronikLoaded = true
  }
  return ChronikClient
}

// In actions:
this._chronik = markRaw(new ChronikClient(chronikUrl))
this._scriptEndpoint = markRaw(
  this._chronik.script(scriptType, this.scriptPayload),
)
```

**Target**:

```typescript
import {
  initializeChronik,
  connectWebSocket,
  fetchUtxos,
  fetchTransactionHistory,
  broadcastTransaction,
  fetchBlockchainInfo,
  isChronikInitialized,
} from '~/services/chronik'

// In actions:
await initializeChronik({
  network: networkStore.config,
  scriptPayload: this.scriptPayload,
  onTransaction: tx => this.handleNewTransaction(tx),
  onConnectionChange: connected => {
    this.connected = connected
  },
  onBlock: (height, hash) => this.handleBlockConnected(hash),
})
await connectWebSocket()
```

### Task 2: Wallet Store → Storage Service

**Current**:

```typescript
// Direct localStorage
localStorage.setItem('lotus-wallet-state', JSON.stringify(state))
const savedState = localStorage.getItem('lotus-wallet-state')
```

**Target**:

```typescript
import { setItem, getItem, STORAGE_KEYS } from '~/services/storage'

// In actions:
setItem(STORAGE_KEYS.WALLET_SEED, state)
const savedState = getItem(STORAGE_KEYS.WALLET_SEED, null)
```

### Task 3: P2P Store → P2P Service

**Current** (`stores/p2p.ts`):

```typescript
// Direct SDK coordinator management
const sdk: SDKInstances = {
  coordinator: null,
  sdkModule: null,
}

// In actions:
sdk.coordinator = new sdkModule.P2P.P2PCoordinator(p2pConfig)
await sdk.coordinator.start()
```

**Target**:

```typescript
import {
  initializeP2P,
  stopP2P,
  getConnectionState,
  getPeerId,
  getMultiaddrs,
  getConnectedPeers,
  startPresenceAdvertising,
  stopPresenceAdvertising,
  discoverPeers,
  getCoordinator,
} from '~/services/p2p'

// In actions:
const { peerId, multiaddrs } = await initializeP2P(config, {
  onConnectionStateChange: state => {
    this.connectionState = state
  },
  onPeerConnected: peer => this._handlePeerConnected(peer),
  onPeerDisconnected: peerId => this._handlePeerDisconnected(peerId),
})
```

### Task 4: MuSig2 Store → MuSig2 Service

**Current** (`stores/musig2.ts`):

```typescript
// Direct SDK coordinator (via p2p store)
const coordinator = p2pStore.getCoordinator()
// ... direct SDK calls
```

**Target**:

```typescript
import {
  initializeMuSig2,
  stopMuSig2,
  startSignerAdvertising,
  stopSignerAdvertising,
  discoverSigners,
  createSession,
  requestSignatures,
  approveRequest,
  rejectRequest,
} from '~/services/musig2'

// In actions:
await initializeMuSig2({
  onSignerDiscovered: signer => this._handleSignerDiscovered(signer),
  onIncomingRequest: request => this._handleIncomingRequest(request),
})
```

### Task 5: Network Store → Storage Service

**Current** (`stores/network.ts`):

```typescript
localStorage.setItem(
  STORAGE_KEY,
  JSON.stringify({ network: this.currentNetwork }),
)
const saved = localStorage.getItem(STORAGE_KEY)
```

**Target**:

```typescript
import { setItem, getItem, STORAGE_KEYS } from '~/services/storage'

setItem(STORAGE_KEYS.NETWORK, { network: this.currentNetwork })
const saved = getItem(STORAGE_KEYS.NETWORK, null)
```

### Task 6: Contacts Store → Storage Service

**Current** (`stores/contacts.ts`):

```typescript
localStorage.setItem('lotus-wallet-contacts', JSON.stringify(this.contacts))
const saved = localStorage.getItem('lotus-wallet-contacts')
```

**Target**:

```typescript
import { setItem, getItem, STORAGE_KEYS } from '~/services/storage'

setItem(STORAGE_KEYS.CONTACTS, this.contacts)
const saved = getItem(STORAGE_KEYS.CONTACTS, [])
```

---

## Code Removal

After integration, the following code should be removed from stores:

### From `wallet.ts`:

- `let ChronikClient` and `loadChronik()` function
- `this._chronik`, `this._ws`, `this._scriptEndpoint` private state
- Direct WebSocket setup code in `initializeChronik()`
- Direct UTXO fetching code

### From `p2p.ts`:

- `const sdk: SDKInstances` object
- `getOrCreateP2PPrivateKey()` function (moved to service)
- Direct coordinator event handler setup

### From `network.ts`:

- `const STORAGE_KEY` constant (use service constant)

### From `contacts.ts`:

- Direct localStorage calls

---

## Migration Strategy

1. **Additive First**: Add service imports and calls alongside existing code
2. **Verify Functionality**: Test that service-based code works correctly
3. **Remove Old Code**: Delete the deprecated direct implementations
4. **Final Cleanup**: Remove any unused imports and dead code

---

## Testing Checklist

After integration, verify:

- [ ] Wallet initializes correctly on app load
- [ ] Balance updates in real-time via WebSocket
- [ ] Transactions can be sent and broadcast
- [ ] Transaction history loads correctly
- [ ] Network switching works and persists
- [ ] Contacts save and load correctly
- [ ] P2P connects and discovers peers
- [ ] Presence advertising works
- [ ] MuSig2 signer discovery works
- [ ] All localStorage data persists across page reloads

---

## Files Modified

| File                  | Changes                        |
| --------------------- | ------------------------------ |
| `stores/wallet.ts`    | Use chronik + storage services |
| `stores/p2p.ts`       | Use p2p + storage services     |
| `stores/musig2.ts`    | Use musig2 service             |
| `stores/network.ts`   | Use storage service            |
| `stores/contacts.ts`  | Use storage service            |
| `services/chronik.ts` | Minor fixes for API alignment  |
| `services/storage.ts` | Add any missing storage keys   |
| `services/p2p.ts`     | Minor fixes for API alignment  |
| `services/musig2.ts`  | Minor fixes for API alignment  |

---

_Next: [29_DEPRECATE_USEUTILS.md](./29_DEPRECATE_USEUTILS.md)_
