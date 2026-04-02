# Service Worker AGENTS.md

A coding agent guide for the `service-worker/` directory in the Lotus Web Wallet project.

## Purpose

The service worker enables background wallet monitoring when the main app is backgrounded or tabs are closed. It provides:

- **Background UTXO polling** via Chronik REST API (WebSockets suspended in background)
- **MuSig2 session tracking** with expiry warnings and signing request notifications
- **Push notifications** for transactions, signing requests, and session events
- **State caching** via IndexedDB for offline support and cross-tab synchronization

## Architecture Overview

```
service-worker/
├── sw.ts                          # Main entry point, message router, module initialization
└── modules/
    ├── network-monitor.ts         # UTXO polling, balance checks, transaction detection
    ├── session-monitor.ts         # MuSig2 session tracking, expiry warnings, signing requests
    ├── push-notifications.ts      # Notification templates, display, click handling, badge
    └── state-sync.ts              # IndexedDB caching, UTXO cache, cross-tab sync
```

### Key Design Patterns

- **Module-based architecture**: Each module is a class with clear responsibilities, instantiated in `sw.ts`
- **Message-passing communication**: App ↔ SW via `postMessage` API (no shared state)
- **Adaptive polling**: Network monitor adjusts intervals based on activity state
- **UTXO diff detection**: Compares current vs cached UTXO sets to detect changes
- **Singleton pattern**: `state-sync.ts` exports a singleton instance

### Workbox Integration

- Built with Workbox using `injectManifest` strategy
- `precacheAndRoute(self.__WB_MANIFEST)` handles static asset caching
- `cleanupOutdatedCaches()` removes stale caches on updates
- Service worker version tracked via `SW_VERSION` constant

## Module Responsibilities

### NetworkMonitor (`modules/network-monitor.ts`)

Monitors wallet addresses for UTXO changes using Chronik REST API polling.

**Lifecycle:**
- `configure(config)` — Set Chronik URL, addresses, script type/payload, polling interval
- `startPolling()` — Begin polling loop with adaptive intervals
- `stopPolling()` — Clear polling timer
- `updateAddresses(addresses)` — Update monitored addresses
- `updateScriptPayload(scriptPayload, scriptType)` — Update script (clears UTXO cache)

**State flags (affect polling frequency):**
- `setPendingTransactions(bool)` — Pending tx → 10s interval
- `setActiveSigningSessions(bool)` — Active sessions → 15s interval
- `markRecentlyBackgrounded()` — Recently backgrounded → 20s for 2 minutes

**Polling intervals:**

| Condition | Interval |
|-----------|----------|
| Pending transactions | 10s |
| Active signing sessions | 15s |
| Recently backgrounded (< 2min) | 20s |
| Default | 60s (configurable) |

**Change detection:**
- Fetches UTXOs via `chronik.script(scriptType, scriptPayload).utxos()`
- Compares `txid_outIdx` sets against cached `lastKnownUtxos`
- Emits `BALANCE_CHANGED` for any UTXO set change
- Emits `TRANSACTION_DETECTED` for each new UTXO (incoming)
- Shows push notification for incoming transactions when app is backgrounded

**Retry logic:**
- Uses `MAX_RETRY_ATTEMPTS`, `REQUEST_TIMEOUT_MS`, `RETRY_DELAY_MS` from `~/utils/constants`
- AbortController-based timeout per request
- Returns empty array on exhaustion (non-failing)

### SessionMonitor (`modules/session-monitor.ts`)

Tracks MuSig2 signing sessions and P2P presence sessions with expiry monitoring.

**Lifecycle:**
- `addSession(session)` — Register session with `id`, `type`, `expiresAt`, `warningAt`
- `removeSession(id)` — Unregister session; stops monitoring if nothing left
- `addSigningRequest(request)` — Track incoming signing request; notifies clients
- `updateSigningRequestStatus(requestId, status)` — Update status; auto-removes non-pending after 5s
- `getPendingRequests()` — Returns all pending signing requests

**Presence refresh:**
- `startPresenceRefresh(intervalMs?)` — Periodic `REFRESH_PRESENCE` broadcasts (default 30s)
- `stopPresenceRefresh()` — Stop presence refresh loop

**Monitoring loop:**
- Runs every 5s (`CHECK_INTERVAL_MS`)
- Sends `SESSION_EXPIRING` warning at `warningAt` (once per session)
- Sends `SESSION_EXPIRED` at `expiresAt` and removes session
- Expires pending signing requests at `expiresAt`
- Auto-stops when no sessions or requests remain

### PushNotificationManager (`modules/push-notifications.ts`)

Handles browser push notification display, templates, and click routing.

**Notification templates:**

| Event Type | Title | Actions |
|------------|-------|---------|
| `transaction_received` | "Lotus Received" | View transaction |
| `transaction_sent` | "Transaction Sent" | View |
| `signing_request` | "Signing Request" | Review, Reject |
| `session_expiring` | "Session Expiring" | Extend |
| `session_expired` | "Session Expired" | — |
| `vote_received` | "Vote on Your Profile" | View |
| `vote_confirmed` | "Vote Confirmed" | — |
| `profile_linked` | "Profile Linked" | — |
| `system` | "Lotusia" (customizable) | — |

**Features:**
- Template-based notification generation with customizable title/body overrides
- Badge count management via `navigator.setAppBadge` / `clearAppBadge`
- Click handler routes to appropriate app URLs based on action and event data
- Safari compatibility: conditionally adds actions only when supported
- Notification close decrements badge count

**URL routing (click actions):**
- `view` + txid → `/explore/explorer/tx/{txid}`
- `review` / `reject` → `/people/p2p?tab=requests`
- `extend` + walletId → `/people/shared-wallets/{walletId}`
- Social events → `/explore/social/{platform}/{profileId}`

### StateSync (`modules/state-sync.ts`)

IndexedDB-based state caching for offline support and cross-tab synchronization.

**Database schema:**

| Store | Key | Purpose |
|-------|-----|---------|
| `state` | `key` | General key-value state (balance, sessions, timestamps) |
| `utxos` | `outpoint` | Cached UTXOs indexed by `scriptPayload` |
| `sessions` | `id` | MuSig2 session data |

**Operations:**
- `cacheState(state)` — Write key-value pairs with timestamps
- `getState<T>(key)` — Read a single cached value
- `getAllState()` — Read all cached state
- `clearState()` — Clear all state entries
- `cacheUtxos(scriptPayload, utxos)` — Replace UTXOs for a script (clears existing first)
- `getUtxos(scriptPayload)` — Get cached UTXOs for a script
- `broadcastState()` — Push all cached state to all open clients

**Initialization:**
- Lazy-initialized via `init()` with deduplicated `initPromise`
- Schema upgrade handled in `onupgradeneeded`

## Message Type Conventions

All messages follow the `{ type: string, payload?: unknown }` envelope.

### App → Service Worker

| Message Type | Module | Payload |
|--------------|--------|---------|
| `SKIP_WAITING` | SW core | — |
| `GET_STATUS` | SW core | — (returns via MessageChannel) |
| `START_MONITORING` | NetworkMonitor | `NetworkMonitorConfig` |
| `STOP_MONITORING` | NetworkMonitor | — |
| `UPDATE_ADDRESSES` | NetworkMonitor | `{ addresses: string[] }` |
| `UPDATE_SCRIPT` | NetworkMonitor | `{ scriptPayload, scriptType }` |
| `SET_PENDING_TRANSACTIONS` | NetworkMonitor | `{ hasPending: boolean }` |
| `SET_ACTIVE_SIGNING_SESSIONS` | NetworkMonitor | `{ hasActive: boolean }` |
| `TAB_BACKGROUNDED` | NetworkMonitor | — |
| `INIT_UTXO_CACHE` | NetworkMonitor | `{ scriptPayload, utxoIds }` |
| `REGISTER_SESSION` | SessionMonitor | `SessionInfo` |
| `UNREGISTER_SESSION` | SessionMonitor | `{ id: string }` |
| `REGISTER_SIGNING_REQUEST` | SessionMonitor | `SigningRequest` |
| `UPDATE_SIGNING_REQUEST_STATUS` | SessionMonitor | `{ requestId, status }` |
| `START_PRESENCE_REFRESH` | SessionMonitor | `{ intervalMs? }` |
| `STOP_PRESENCE_REFRESH` | SessionMonitor | — |
| `GET_PENDING_REQUESTS` | SessionMonitor | — (returns via MessageChannel) |
| `SHOW_NOTIFICATION` | PushNotifications | `PushNotificationEventData` |
| `CLEAR_BADGE` | PushNotifications | — |
| `CACHE_STATE` | StateSync | `Partial<CachedState>` |
| `GET_CACHED_STATE` | StateSync | — (returns via MessageChannel) |
| `CLEAR_CACHED_STATE` | StateSync | — |
| `CACHE_UTXOS` | StateSync | `{ scriptPayload, utxos }` |
| `GET_CACHED_UTXOS` | StateSync | `{ scriptPayload }` (returns via MessageChannel) |

### Service Worker → App

| Message Type | Module | Payload |
|--------------|--------|---------|
| `BALANCE_CHANGED` | NetworkMonitor | `BalanceChangedPayload` |
| `TRANSACTION_DETECTED` | NetworkMonitor | `TransactionDetectedPayload` |
| `SESSION_EXPIRING` | SessionMonitor | `SessionExpiringPayload` |
| `SESSION_EXPIRED` | SessionMonitor | `SessionExpiredPayload` |
| `SIGNING_REQUEST_RECEIVED` | SessionMonitor | `SigningRequest` |
| `SIGNING_REQUEST_EXPIRED` | SessionMonitor | `{ requestId }` |
| `REFRESH_PRESENCE` | SessionMonitor | `{ timestamp }` |
| `CACHED_STATE` | StateSync | `Partial<CachedState>` |
| `CACHED_UTXOS` | StateSync | `{ utxos }` |

### MessageChannel Usage

For request-response patterns, the app uses `MessageChannel`:

```typescript
const channel = new MessageChannel()
navigator.serviceWorker.controller?.postMessage(
  { type: 'GET_STATUS' },
  [channel.port2],
)
channel.port1.onmessage = (event) => {
  // Handle response
}
```

## Polling and Monitoring Patterns

### Adaptive Polling Strategy

The NetworkMonitor uses a priority-based interval selection:

```
pending transactions (10s) > active sessions (15s) > recently backgrounded (20s) > default (60s)
```

When state flags change, the polling timer is restarted with the new interval via `updatePollingInterval()`.

### UTXO Change Detection

```
fetch UTXOs → build Set<txid_outIdx> → diff against lastKnownUtxos → emit events → update cache
```

- New UTXO IDs = incoming transactions
- Removed UTXO IDs = spent UTXOs (outgoing transactions)
- Cache keyed by `scriptPayload` to support multiple scripts

### Session Expiry Monitoring

```
addSession(session) → startMonitoring() → checkSessions() every 5s
  → warningAt reached? → send SESSION_EXPIRING (once)
  → expiresAt reached? → send SESSION_EXPIRED → remove session
```

Auto-stops when all sessions and requests are cleared.

## Best Practices

1. **Always use typed message payloads** — Define types in `~/utils/types/sw.ts`
2. **Handle MessageChannel ports safely** — Use optional chaining: `ev.ports[0]?.postMessage(...)`
3. **Clean up timers on removal** — SessionMonitor auto-stops when empty; NetworkMonitor clears on `stopPolling()`
4. **Use IndexedDB transactions properly** — Always await transaction completion via `oncomplete`/`onerror`
5. **Graceful degradation** — Badge API and notification actions may not be available; check before use
6. **Retry with backoff** — NetworkMonitor uses configurable retry with timeout and delay constants
7. **Clear caches on script change** — `updateScriptPayload()` clears `lastKnownUtxos` to avoid stale diffs
8. **Log with module prefix** — Use `[ModuleName]` prefix for all console logs

## Anti-Patterns to Avoid

1. **Do not use WebSocket in service worker** — Connections are suspended; use REST polling only
2. **Do not share mutable state between modules** — Communicate via `postMessage` or explicit method calls
3. **Do not block the install/activate events** — Use `event.waitUntil()` for async work
4. **Do not assume Notification API availability** — Safari and some browsers have limitations
5. **Do not store sensitive data in IndexedDB unencrypted** — Cache only non-sensitive state (UTXO IDs, timestamps)
6. **Do not create multiple polling timers** — Use `stopPolling()` before `startPolling()` to prevent leaks
7. **Do not ignore MessageChannel responses** — Always handle the `onmessage` callback
8. **Do not hardcode URLs or intervals** — Use config objects and constants from `~/utils/constants`

## Related Documentation

- `06_SERVICE_WORKER.md` — Detailed service worker architecture and design decisions
- `01_CORE_ARCHITECTURE.md` — SW plugin integration with the main app
- `~/utils/types/sw.ts` — All message types, payloads, and interfaces
- `~/utils/constants.ts` — Retry attempts, timeouts, and delay constants
- `~/utils/formatting.ts` — `formatXPI` and `truncateTxid` used in notification templates
- `nuxt.config.ts` — Vite PWA plugin configuration (`injectManifest` strategy)

## Type Definitions Reference

Key types are defined in `~/utils/types/sw.ts`:

- `SWClientMessageType` — All app → SW message types
- `SWBroadcastMessageType` — All SW → app message types
- `NetworkMonitorConfig` — Configuration for network monitoring
- `SessionInfo` — Session tracking data structure
- `SigningRequest` — Incoming signing request structure
- `PushNotificationConfig` — Notification display configuration
- `PushNotificationEventType` — Union of all notification event types
- `CachedState` — Offline cacheable state structure
- `NetworkMonitorUtxoInfo` — Simplified UTXO info for SW context
