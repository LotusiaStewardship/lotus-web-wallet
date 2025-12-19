# 34: Chronik Services Integration

## Overview

This phase integrates the Chronik service (`services/chronik.ts`) into the wallet store (`stores/wallet.ts`). Currently, the wallet store directly manages the Chronik client, WebSocket connections, and all blockchain interactions. This phase refactors the store to delegate these operations to the Chronik service layer, completing the services architecture.

---

## Problem Analysis

### Current Wallet Store Issues

The wallet store directly manages Chronik operations instead of using the service layer:

| Current Pattern (wallet.ts)                    | Target Pattern (via service)              |
| ---------------------------------------------- | ----------------------------------------- |
| `let ChronikClient` + `loadChronik()`          | Service handles client loading            |
| `this._chronik = new ChronikClient(url)`       | `initializeChronik(options)`              |
| `this._ws = this._chronik.ws({...})`           | `connectWebSocket()`                      |
| `this._scriptEndpoint.utxos()`                 | `fetchUtxosForScript(type, payload)`      |
| `this._scriptEndpoint.history(page, pageSize)` | `fetchTransactionHistory(page, pageSize)` |
| `this._chronik.tx(txid)`                       | `fetchTransaction(txid)`                  |
| `this._chronik.broadcastTx(buffer)`            | `broadcastTransaction(rawHex)`            |
| `this._chronik.blockchainInfo()`               | `fetchBlockchainInfo()`                   |
| `this._chronik.block(hashOrHeight)`            | `fetchBlock(hashOrHeight)`                |
| `this._ws.subscribe(type, payload)`            | Service handles subscription              |
| `this._ws.close()`                             | `disconnectWebSocket()`                   |

### Current Service Capabilities

The `services/chronik.ts` already provides:

```typescript
// Initialization
initializeChronik(options: ChronikConnectionOptions): Promise<void>
connectWebSocket(): Promise<void>
disconnectWebSocket(): void

// UTXO Operations
fetchUtxosForScript(scriptType, scriptPayload): Promise<ChronikUtxo[]>

// Transaction Operations
fetchTransactionHistory(page, pageSize): Promise<{ txs, numPages }>
fetchTransaction(txid): Promise<ChronikTx>
broadcastTransaction(rawTxHex): Promise<BroadcastTxResult>

// Block Operations
fetchBlockchainInfo(): Promise<BlockchainInfoResult>
fetchBlock(hashOrHeight): Promise<unknown>

// Utilities
isChronikInitialized(): boolean
isWebSocketConnected(): boolean
getChronikClient(): ChronikClient | null
convertChronikUtxos(chronikUtxos): Map<string, UtxoData>
```

---

## Implementation Plan

### Task 1: Update Service for Taproot Support

The current service hardcodes `'p2pkh'` script type. Update to accept script type parameter:

**Current** (`services/chronik.ts`):

```typescript
export async function connectWebSocket(): Promise<void> {
  // ...
  wsEndpoint.subscribe('p2pkh', scriptPayload)
}

export async function fetchTransactionHistory(...) {
  const endpoint = chronikClient.script('p2pkh', currentOptions.scriptPayload)
  // ...
}
```

**Target**:

```typescript
export interface ChronikConnectionOptions {
  network: NetworkConfig
  scriptPayload: string
  scriptType: 'p2pkh' | 'p2tr-commitment'  // Add script type
  onTransaction?: (txid: string) => void
  onConnectionChange?: (connected: boolean) => void
  onBlock?: (blockHeight: number, blockHash: string) => void
}

export async function connectWebSocket(): Promise<void> {
  // ...
  wsEndpoint.subscribe(currentOptions.scriptType, scriptPayload)
}

export async function fetchTransactionHistory(...) {
  const endpoint = chronikClient.script(currentOptions.scriptType, currentOptions.scriptPayload)
  // ...
}
```

### Task 2: Add Missing Service Functions

Add functions needed by wallet store that don't exist in service:

```typescript
// Fetch UTXOs using stored options (convenience wrapper)
export async function fetchUtxos(): Promise<ChronikUtxo[]>

// Subscribe to script events (uses stored options)
export async function subscribeToScript(): Promise<void>

// Unsubscribe from script events
export async function unsubscribeFromScript(): Promise<void>

// Get current script endpoint for advanced operations
export function getScriptEndpoint(): ScriptEndpoint | null
```

### Task 3: Refactor Wallet Store Initialization

**Current** (`stores/wallet.ts`):

```typescript
async initializeChronik() {
  const networkStore = useNetworkStore()
  const chronikUrl = networkStore.chronikUrl
  const scriptType = this.getChronikScriptType()

  this._chronik = markRaw(new ChronikClient(chronikUrl))
  this._scriptEndpoint = markRaw(
    this._chronik.script(scriptType, this.scriptPayload),
  )

  const blockchainInfo = await this._chronik.blockchainInfo()
  // ... WebSocket setup ...
}
```

**Target**:

```typescript
import {
  initializeChronik,
  connectWebSocket,
  disconnectWebSocket,
  fetchBlockchainInfo,
  fetchUtxosForScript,
  fetchTransactionHistory as serviceFetchHistory,
  fetchTransaction,
  broadcastTransaction,
  isChronikInitialized,
} from '~/services/chronik'

async initializeChronik() {
  const networkStore = useNetworkStore()

  await initializeChronik({
    network: networkStore.config,
    scriptPayload: this.scriptPayload,
    scriptType: this.getChronikScriptType(),
    onTransaction: (txid) => this.handleAddedToMempool(txid),
    onConnectionChange: (connected) => {
      this.connected = connected
    },
    onBlock: (height, hash) => this.handleBlockConnected(hash),
  })

  const blockchainInfo = await fetchBlockchainInfo()
  this.tipHeight = blockchainInfo.tipHeight
  this.tipHash = blockchainInfo.tipHash

  await this.refreshUtxos()
  await this.fetchTransactionHistory()
  await connectWebSocket()

  // Handle mobile browser tab visibility
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isChronikInitialized()) {
        this.refreshUtxos().catch(console.error)
      }
    })
  }
}
```

### Task 4: Refactor UTXO Operations

**Current**:

```typescript
async refreshUtxos() {
  if (!this._scriptEndpoint) return

  this.utxos.clear()
  const result = await this._scriptEndpoint.utxos()
  // ... process UTXOs ...
}
```

**Target**:

```typescript
async refreshUtxos() {
  if (!isChronikInitialized()) return

  this.utxos.clear()
  const scriptType = this.getChronikScriptType()
  const utxos = await fetchUtxosForScript(scriptType, this.scriptPayload)

  for (const utxo of utxos) {
    const outpoint = `${utxo.outpoint.txid}_${utxo.outpoint.outIdx}`
    this.utxos.set(outpoint, {
      value: utxo.value,
      height: utxo.blockHeight,
      isCoinbase: utxo.isCoinbase,
    })
  }

  this.recalculateBalance()
  await this.saveWalletState()

  if (this.draftTx.initialized) {
    this._recalculateDraftMetadata()
  }
}
```

### Task 5: Refactor Transaction History

**Current**:

```typescript
async fetchTransactionHistory(pageSize = 25, page = 0) {
  if (!this._scriptEndpoint || !this._script) return
  const result = await this._scriptEndpoint.history(page, pageSize)
  // ... process history ...
}
```

**Target**:

```typescript
async fetchTransactionHistory(pageSize = 25, page = 0) {
  if (!isChronikInitialized() || !this._script) return

  this.historyLoading = true
  try {
    const { txs, numPages } = await serviceFetchHistory(page, pageSize)
    // ... process history (same logic) ...
  } finally {
    this.historyLoading = false
  }
}
```

### Task 6: Refactor Transaction Broadcast

**Current**:

```typescript
async sendDraftTransaction(): Promise<string> {
  // ...
  const result = await this._chronik.broadcastTx(tx.toBuffer())
  // ...
}
```

**Target**:

```typescript
async sendDraftTransaction(): Promise<string> {
  if (!isChronikInitialized() || !this._signingKey) {
    throw new Error('Wallet not initialized')
  }
  // ...
  const result = await broadcastTransaction(tx.toBuffer().toString('hex'))
  // ...
}
```

### Task 7: Refactor WebSocket Message Handlers

**Current**:

```typescript
async handleAddedToMempool(txid: string) {
  if (!this._chronik || !this._script) return
  const tx = await this._chronik.tx(txid)
  // ...
}

async handleBlockConnected(blockHash: string) {
  if (!this._chronik) return
  const block = await this._chronik.block(blockHash)
  // ...
}
```

**Target**:

```typescript
async handleAddedToMempool(txid: string) {
  if (!isChronikInitialized() || !this._script) return
  const tx = await fetchTransaction(txid)
  // ... same logic ...
}

async handleBlockConnected(blockHash: string) {
  if (!isChronikInitialized()) return
  const block = await fetchBlock(blockHash)
  // ... same logic ...
}
```

### Task 8: Refactor Disconnect/Cleanup

**Current**:

```typescript
async disconnect() {
  if (this._ws) {
    const scriptType = this.getChronikScriptType()
    this._ws.unsubscribe(scriptType, this.scriptPayload)
    this._ws.close()
  }
  this.connected = false
}
```

**Target**:

```typescript
async disconnect() {
  disconnectWebSocket()
  this.connected = false
}
```

---

## Code Removal

After integration, remove from `stores/wallet.ts`:

1. **Chronik client loading** (lines 24-35):

   ```typescript
   // REMOVE
   let ChronikClient: typeof ChronikClientType
   let chronikLoaded = false
   const loadChronik = async () => { ... }
   ```

2. **Private Chronik state** (lines 282-284):

   ```typescript
   // REMOVE (or keep for backward compatibility if needed)
   _chronik: null as any,
   _ws: null as any,
   _scriptEndpoint: null as ScriptEndpoint | null,
   ```

3. **Direct WebSocket setup code** in `initializeChronik()` (lines 585-619)

---

## Files Modified

| File                  | Changes                                              |
| --------------------- | ---------------------------------------------------- |
| `services/chronik.ts` | Add script type support, add missing functions       |
| `stores/wallet.ts`    | Use Chronik service, remove direct client management |

---

## Testing Checklist

After implementation, verify:

- [ ] Wallet initializes correctly on app load
- [ ] Balance displays correctly after initialization
- [ ] Balance updates in real-time via WebSocket
- [ ] Transactions can be sent and broadcast successfully
- [ ] Transaction history loads correctly
- [ ] Transaction history pagination works
- [ ] Network switching works (reconnects to new Chronik URL)
- [ ] Address type switching works (P2PKH ↔ P2TR)
- [ ] Tab visibility refresh works on mobile
- [ ] WebSocket reconnection works after disconnect
- [ ] All localStorage data persists across page reloads

---

## Migration Notes

1. **Backward Compatibility**: The `_chronik` and `_scriptEndpoint` private properties can be removed since all access goes through the service
2. **Event Handling**: WebSocket events are handled via callbacks passed to `initializeChronik()`
3. **Error Handling**: Service throws errors that the store should catch and handle appropriately
4. **No Breaking Changes**: Store interface remains the same, only implementation changes

---

_Previous: [33_P2P_SERVICES_INTEGRATION.md](./33_P2P_SERVICES_INTEGRATION.md)_
_Next: [29_DEPRECATE_USEUTILS.md](./29_DEPRECATE_USEUTILS.md)_
