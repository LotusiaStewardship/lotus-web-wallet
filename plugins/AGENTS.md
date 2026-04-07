# AGENTS.md — Plugins

## Purpose

The `plugins/` directory contains Nuxt 3 client-side plugins that initialize core services at app startup. All plugins are client-only (`.client.ts` suffix) because the app runs in SPA mode (`ssr: false`).

Plugins provide blockchain connectivity, cryptographic operations, SDK access, service worker integration, and keyboard shortcuts. They are the foundation that composables, stores, and components depend on.

---

## Plugin Patterns and Conventions

### File Naming

- All plugins use the `.client.ts` suffix — they only run in the browser
- Name plugins after their domain: `chronik.client.ts`, `crypto-worker.client.ts`
- No `.server.ts` plugins exist in this codebase

### Plugin Definition

```typescript
export default defineNuxtPlugin({
  name: 'plugin-name',       // Required: unique identifier
  dependsOn: ['bitcore'],    // Optional: plugin dependency ordering
  setup() {
    // Plugin logic here

    return {
      provide: {
        pluginName: { /* exposed API */ },
      },
    }
  },
})
```

### Accessing Provided Values

```typescript
// Inside composables, components, or other plugins
const { $bitcore, $chronik, $cryptoWorker } = useNuxtApp()

// Or via auto-injected properties in components
this.$bitcore
this.$chronik
```

### Module-level State

Use module-level variables for plugin-scoped state that persists across the app lifetime:

```typescript
export default defineNuxtPlugin({
  name: 'my-plugin',
  setup() {
    let client: SomeClient | null = null
    const isReady = ref(false)

    // Functions that close over module state
    function initialize() { /* ... */ }

    return { provide: { myPlugin: { initialize, isReady } } }
  },
})
```

### Lazy vs Eager Initialization

- **Eager**: Plugin initializes during app startup (bitcore, service-worker)
- **Lazy**: Plugin provides functions, initialization happens when first called (chronik, crypto-worker)

Prefer lazy initialization for heavy operations to avoid blocking app startup.

---

## Initialization Order

Plugins initialize in dependency order. Use `dependsOn` to enforce ordering:

```
1. bitcore.client.ts        → Loads xpi-ts SDK (no dependencies)
2. chronik.client.ts        → Blockchain indexer (dependsOn: ['bitcore'])
3. crypto-worker.client.ts  → Web worker for crypto ops (no dependencies)
4. crypto-init.client.ts    → Warms crypto worker (dependsOn: ['crypto-worker'])
5. explorer.client.ts       → Explorer API (dependsOn: ['bitcore', 'chronik'])
6. service-worker.client.ts → PWA service worker connection (no dependencies)
7. shortcuts.client.ts      → Keyboard shortcuts (no dependencies)
```

**Critical**: `bitcore.client.ts` must load first — all other plugins that use cryptographic functions depend on it.

---

## Key Plugins

### bitcore.client.ts

Loads the xpi-ts (Lotus Bitcore) SDK and provides it globally.

**Provides**: `$bitcore` — the Bitcore SDK instance

**Exports**:
- `getBitcore()` — synchronous access to SDK
- `isBitcoreLoaded()` — always returns `true` (static import)
- `ensureBitcore()` — async guarantee of SDK availability

**Pattern**: Static import, no lazy loading. SDK is available before any component renders.

### chronik.client.ts

Blockchain indexer client for real-time blockchain data.

**Provides**: `$chronik` — object with methods for UTXOs, transactions, WebSocket, subscriptions

**Key Methods**:
- `initialize(options)` — set up client with network config
- `connectWebSocket()` / `disconnectWebSocket()` — real-time updates
- `fetchUtxos()` / `fetchUtxosForScript()` — get unspent outputs
- `fetchTransaction(txid)` / `fetchTransactionHistory()` — transaction data
- `broadcastTransaction(rawTxHex)` — send signed transactions
- `subscribeToMultipleScripts(subscriptions)` — multi-address WebSocket subscriptions
- `convertChronikUtxos()` — convert to internal format

**Pattern**: Lazy initialization. Client is created when `initialize()` is called, typically by `stores/wallet.ts`.

### crypto-worker.client.ts

Web worker for CPU-intensive cryptographic operations.

**Provides**: `$cryptoWorker` — reactive state and crypto operations

**Reactive State**:
- `isReady` — whether worker is initialized
- `status` — worker status info
- `lastError` — last error encountered

**Crypto Operations**:
- `generateMnemonic(strength?)` — create new mnemonic phrase
- `validateMnemonic(mnemonic)` — verify mnemonic validity
- `deriveKeys(mnemonic, addressType, network, ...)` — HD key derivation
- `deriveP2TRCommitment(internalPubKeyHex, merkleRootHex?)` — Taproot commitment
- `signTransaction(txHex, utxos, privateKey, addressType, ...)` — sign transactions
- `signMessage(message, privateKey)` / `verifyMessage(message, address, signature)` — message signing
- `hashData(data, algorithm)` — SHA256, RIPEMD160, etc.

**Pattern**: Request/response with UUID tracking, 3-second timeout, automatic cleanup on worker error.

### crypto-init.client.ts

Warms the crypto worker during app startup.

**Depends on**: `crypto-worker`

**Pattern**: Calls `$cryptoWorker.init()` if not already ready. Idempotent, non-blocking.

### explorer.client.ts

Explorer API for transaction parsing, address resolution, and blockchain queries.

**Depends on**: `bitcore`, `chronik`

**Provides**: `$explorer` — transaction parsing, script/address conversion, data fetching

**Key Methods**:
- `parseExplorerTx(tx, filterAddress?)` — classify transactions (coinbase, rank, burn, self, give, receive)
- `getScriptFromAddress(address)` — extract script payload and type
- `getAddressFromScript(script)` — resolve address from script
- `convertToExplorerTx(tx)` — convert Chronik tx to Explorer format
- `fetchAddressHistory(address, page, pageSize)` — paginated transaction history
- `fetchAddressBalance(address)` — total balance for address
- `fetchTransactionBatch({ txids, filterAddress, batchSize })` — batch fetch with parsing
- `fetchBlock(hashOrHeight)` / `fetchBlocks(startHeight, endHeight)` — block data

**Pattern**: Depends on both bitcore (for script operations) and chronik (for blockchain data).

### service-worker.client.ts

Initializes the PWA service worker connection and sets up message handlers.

**Provides**: Nothing directly — uses `useServiceWorker()` composable

**Pattern**: Non-blocking initialization. Sets up global message listener for SW events:
- `BALANCE_CHANGED` — UTXO changes detected
- `TRANSACTION_DETECTED` — new transaction
- `SESSION_EXPIRING` — session expiry warning
- `SIGNING_REQUEST` — P2P signing request

### shortcuts.client.ts

Registers global keyboard shortcuts for navigation.

**Provides**: Nothing directly — uses `useKeyboardShortcuts()` composable

**Shortcuts**:
| Key | Action |
|-----|--------|
| `h` | Home |
| `p` | People |
| `a` | Activity |
| `s` | Settings |
| `e` | Explore |
| `shift+/` | Keyboard shortcuts modal |
| `/` | Focus search |
| `alt+shift+a` | Quick actions |
| `esc` | Blur active element |

---

## Type Augmentation

Plugins augment NuxtApp and Vue ComponentCustomProperties for type-safe access:

```typescript
// In the plugin file or a shared types file
declare module '#app' {
  interface NuxtApp {
    $bitcore: typeof BitcoreTypes
    $chronik: {
      initialize: (options: ChronikConnectionOptions) => void
      connectWebSocket: () => Promise<void>
      // ... other methods
    }
    $cryptoWorker: {
      isReady: Readonly<Ref<boolean>>
      init: () => Promise<CryptoWorkerStatus | null>
      // ... other methods
    }
    $explorer: {
      parseExplorerTx: (tx: ExplorerTx, filterAddress?: string) => ParsedTransaction
      // ... other methods
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $bitcore: typeof BitcoreTypes
    $chronik: NuxtApp['$chronik']
    $cryptoWorker: NuxtApp['$cryptoWorker']
    $explorer: NuxtApp['$explorer']
  }
}
```

Check `types/` directory for shared type definitions used across plugins.

---

## Error Handling

### Plugin Failures

- Plugins should log errors with a consistent prefix: `[PluginName] error message`
- Non-critical failures should use `console.warn` and allow the app to continue
- Critical failures (bitcore SDK) should throw and be caught by the wallet store

### Chronik Plugin

- Returns `null` or empty arrays on fetch failures
- Throws only for operations that require an initialized client
- WebSocket errors are logged but don't crash the app

### Crypto Worker Plugin

- 3-second timeout on all worker requests
- Rejects all pending requests on worker error/termination
- Falls back gracefully if worker is unavailable

### Service Worker Plugin

- Initialization failures are caught and logged as warnings
- Message handler has a default case for unknown message types
- App remains functional without service worker

---

## Anti-patterns to Avoid

1. **Do not use dynamic imports in bitcore.client.ts** — the SDK must be available synchronously before any component renders

2. **Do not access `$bitcore` before the bitcore plugin runs** — use `dependsOn: ['bitcore']` if your plugin needs it

3. **Do not initialize Chronik in the plugin setup** — it uses lazy initialization; stores call `initialize()` when needed

4. **Do not bypass the crypto worker for heavy operations** — use `$cryptoWorker` methods to keep the main thread responsive

5. **Do not mutate module-level state directly from outside the plugin** — use the provided API functions

6. **Do not await service worker initialization** — it's non-blocking; the app should work without it

7. **Do not register duplicate keyboard shortcuts** — check existing shortcuts before registering new ones

8. **Do not forget to clean up WebSocket connections** — call `disconnectWebSocket()` before reconnecting or on network switch

---

## Related Documentation

- `docs/architecture/01_CORE_ARCHITECTURE.md` — Plugin system details, initialization sequence, bootstrap process
- `docs/architecture/06_SERVICE_WORKER.md` — Service worker integration, message types, modules
- `~/workers/crypto.worker.ts` — Crypto worker implementation
- `~/composables/useServiceWorker.ts` — Service worker composable
- `~/composables/useChronikClient.ts` — Chronik client composable
- `~/stores/wallet.ts` — Primary plugin consumer (Chronik initialization, subscriptions)
