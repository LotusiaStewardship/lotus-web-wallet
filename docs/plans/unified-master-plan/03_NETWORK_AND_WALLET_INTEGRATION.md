# Phase 3: Network and Wallet Integration

## Overview

This phase implements background network monitoring and wallet notification integration. The service worker gains the ability to detect transactions in the background, and the wallet store triggers notifications for incoming/outgoing transactions.

**Priority**: P0 (Critical Path)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 1 (Infrastructure Foundation)

---

## Source Phases

| Source Plan               | Phase | Component          |
| ------------------------- | ----- | ------------------ |
| background-service-worker | 2     | Network Monitor    |
| notification-system       | 2     | Wallet Integration |

---

## Tasks

### 3.1 Network Monitor (Service Worker)

**Source**: background-service-worker/02_NETWORK_MONITOR.md
**Effort**: 1-2 days

#### Chronik REST Polling

- [ ] Add Chronik polling to service worker

  ```typescript
  // service-worker/modules/network-monitor.ts
  interface NetworkMonitorConfig {
    chronikUrl: string
    pollingInterval: number // ms
    addresses: string[]
  }

  class NetworkMonitor {
    private config: NetworkMonitorConfig
    private lastKnownUtxos: Map<string, string[]> = new Map()
    private pollingTimer: number | null = null

    async startPolling() {
      this.pollingTimer = setInterval(
        () => this.checkForChanges(),
        this.config.pollingInterval,
      )
    }

    async checkForChanges() {
      for (const address of this.config.addresses) {
        const utxos = await this.fetchUtxos(address)
        const previous = this.lastKnownUtxos.get(address) || []

        if (this.hasChanges(previous, utxos)) {
          this.notifyClients({ type: 'BALANCE_CHANGED', address, utxos })
          this.lastKnownUtxos.set(
            address,
            utxos.map(u => u.txid),
          )
        }
      }
    }

    private async fetchUtxos(address: string) {
      const response = await fetch(
        `${this.config.chronikUrl}/script/p2pkh/${address}/utxos`,
      )
      return response.json()
    }
  }
  ```

#### Transaction Detection

- [ ] Implement new transaction detection
  ```typescript
  async detectNewTransactions(address: string, utxos: Utxo[]) {
    const newUtxos = utxos.filter(
      u => !this.lastKnownUtxos.get(address)?.includes(u.txid)
    )

    for (const utxo of newUtxos) {
      const tx = await this.fetchTransaction(utxo.txid)
      this.notifyClients({
        type: 'TRANSACTION_DETECTED',
        payload: {
          txid: utxo.txid,
          address,
          amount: utxo.value,
          isIncoming: this.isIncoming(tx, address),
          timestamp: Date.now(),
        }
      })
    }
  }
  ```

#### Adaptive Polling

- [ ] Implement adaptive polling intervals

  ```typescript
  // Poll more frequently when:
  // - User recently sent a transaction (waiting for confirmation)
  // - There's a pending signing session
  // - Tab was just backgrounded (catch up period)

  private getPollingInterval(): number {
    if (this.hasPendingTransactions) return 10_000  // 10s
    if (this.hasActiveSigningSessions) return 15_000 // 15s
    if (this.recentlyBackgrounded) return 20_000    // 20s
    return 60_000 // 1 minute default
  }
  ```

#### Service Worker Integration

- [ ] Update `service-worker/sw.ts` to include network monitor

  ```typescript
  import { NetworkMonitor } from './modules/network-monitor'

  const networkMonitor = new NetworkMonitor()

  self.addEventListener('message', async event => {
    switch (event.data?.type) {
      case 'START_MONITORING':
        await networkMonitor.configure(event.data.payload)
        await networkMonitor.startPolling()
        break
      case 'STOP_MONITORING':
        networkMonitor.stopPolling()
        break
      case 'UPDATE_ADDRESSES':
        networkMonitor.updateAddresses(event.data.payload.addresses)
        break
    }
  })
  ```

---

### 3.2 Wallet Store Integration

**Source**: notification-system/02_WALLET_INTEGRATION.md
**Effort**: 1 day

#### Store Updates

- [ ] Import notification store in `stores/wallet.ts`

  ```typescript
  import { useNotificationStore } from './notifications'
  ```

- [ ] Add notification trigger for incoming transactions

  ```typescript
  // In the Chronik WebSocket handler or UTXO refresh
  function handleNewTransaction(tx: Transaction, isIncoming: boolean) {
    const notificationStore = useNotificationStore()

    if (isIncoming) {
      notificationStore.addNotification({
        type: 'transaction',
        title: 'Received Lotus',
        message: `You received ${formatAmount(tx.amount)} XPI`,
        data: { txid: tx.txid },
        persistent: true,
      })
    }
  }
  ```

- [ ] Add notification trigger for sent transaction confirmations
  ```typescript
  function handleTransactionConfirmed(tx: Transaction) {
    const notificationStore = useNotificationStore()

    // Only notify for transactions we sent
    if (tx.sentByUser) {
      notificationStore.addNotification({
        type: 'transaction',
        title: 'Transaction Confirmed',
        message: `Your transaction of ${formatAmount(
          tx.amount,
        )} XPI was confirmed`,
        data: { txid: tx.txid },
        persistent: false, // Ephemeral for confirmations
      })
    }
  }
  ```

#### Duplicate Prevention

- [ ] Implement duplicate notification prevention

  ```typescript
  // In notification store or wallet store
  const recentNotifications = new Set<string>()
  const NOTIFICATION_DEDUP_WINDOW = 60_000 // 1 minute

  function shouldNotify(txid: string): boolean {
    if (recentNotifications.has(txid)) return false

    recentNotifications.add(txid)
    setTimeout(
      () => recentNotifications.delete(txid),
      NOTIFICATION_DEDUP_WINDOW,
    )

    return true
  }
  ```

#### Service Worker Message Handling

- [ ] Handle SW messages in wallet store or composable

  ```typescript
  // In app.vue or a plugin
  const { onMessage } = useServiceWorker()

  onMessage(event => {
    const walletStore = useWalletStore()
    const notificationStore = useNotificationStore()

    switch (event.data?.type) {
      case 'TRANSACTION_DETECTED':
        walletStore.handleBackgroundTransaction(event.data.payload)
        break
      case 'BALANCE_CHANGED':
        walletStore.refreshBalance()
        break
    }
  })
  ```

#### Chronik WebSocket Enhancement

- [ ] Locate and update Chronik WebSocket handler
  ```typescript
  // In services/chronik.ts or stores/wallet.ts
  chronik.ws.on('tx', tx => {
    // Existing handling...

    // Add notification
    if (isRelevantToWallet(tx)) {
      handleNewTransaction(tx, isIncoming(tx))
    }
  })
  ```

---

### 3.3 Client-SW Synchronization

**Effort**: 0.5 days

#### Initialize Monitoring on Wallet Load

- [ ] Start SW monitoring when wallet is loaded
  ```typescript
  // In wallet store init or app startup
  async function initializeBackgroundMonitoring() {
    const { postMessage, isReady } = useServiceWorker()

    if (!isReady.value) return

    postMessage({
      type: 'START_MONITORING',
      payload: {
        chronikUrl: config.chronikUrl,
        addresses: walletStore.allAddresses,
        pollingInterval: 60_000,
      },
    })
  }
  ```

#### Update Addresses on Change

- [ ] Notify SW when addresses change
  ```typescript
  // Watch for address changes
  watch(
    () => walletStore.allAddresses,
    addresses => {
      const { postMessage } = useServiceWorker()
      postMessage({
        type: 'UPDATE_ADDRESSES',
        payload: { addresses },
      })
    },
  )
  ```

#### Handle Tab Visibility

- [ ] Coordinate with existing visibility handler

  ```typescript
  // Existing handler in stores/wallet.ts (lines 572-584)
  // Enhance to work with SW

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Tab became visible - sync with SW state
      syncWithServiceWorker()
      refreshUtxos() // Existing behavior
    } else {
      // Tab going to background - ensure SW is monitoring
      ensureBackgroundMonitoring()
    }
  })
  ```

---

## File Changes Summary

### New Files

| File                                        | Purpose               |
| ------------------------------------------- | --------------------- |
| `service-worker/modules/network-monitor.ts` | Chronik polling in SW |

### Modified Files

| File                              | Changes                                   |
| --------------------------------- | ----------------------------------------- |
| `service-worker/sw.ts`            | Import and use network monitor            |
| `stores/wallet.ts`                | Add notification triggers, SW integration |
| `services/chronik.ts`             | Add notification on WebSocket events      |
| `app.vue` or plugin               | Handle SW messages                        |
| `composables/useServiceWorker.ts` | Add message handling utilities            |

---

## Message Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TRANSACTION DETECTION FLOW                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TAB ACTIVE (Foreground)                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Chronik WebSocket ──► wallet.ts ──► notification.ts ──► UI Toast   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  TAB INACTIVE (Background)                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Service Worker                                                      │   │
│  │  ┌─────────────────┐     ┌─────────────────┐                        │   │
│  │  │ Network Monitor │────►│ Chronik REST    │                        │   │
│  │  │ (polling)       │     │ API             │                        │   │
│  │  └────────┬────────┘     └─────────────────┘                        │   │
│  │           │                                                          │   │
│  │           ▼                                                          │   │
│  │  ┌─────────────────┐     ┌─────────────────┐                        │   │
│  │  │ Change Detected │────►│ postMessage to  │                        │   │
│  │  │                 │     │ all clients     │                        │   │
│  │  └─────────────────┘     └────────┬────────┘                        │   │
│  └───────────────────────────────────┼──────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  TAB BECOMES VISIBLE                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Client receives message ──► wallet.ts ──► notification.ts ──► UI   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Verification Checklist

### Network Monitor (SW)

- [ ] SW polls Chronik at configured interval
- [ ] New UTXOs are detected
- [ ] Messages are sent to clients on changes
- [ ] Polling stops when requested
- [ ] Adaptive polling adjusts interval correctly

### Wallet Notifications

- [ ] Incoming transaction triggers notification
- [ ] Notification shows correct amount
- [ ] Notification links to transaction detail
- [ ] Duplicate transactions don't create duplicate notifications
- [ ] Sent transaction confirmation triggers notification

### Client-SW Sync

- [ ] Monitoring starts when wallet loads
- [ ] Address changes are communicated to SW
- [ ] Tab visibility changes handled correctly
- [ ] State syncs when tab becomes visible

---

## Notes

- Network monitor uses REST polling as fallback when WebSocket unavailable
- Adaptive polling reduces battery/data usage when not needed
- Duplicate prevention uses txid-based deduplication
- Existing visibility handler is enhanced, not replaced

---

## Next Phase

After completing Phase 3, proceed to:

- **Phase 4**: P2P Core Integration
- **Phase 8**: Push and Browser Notifications (depends on this phase)

---

_Source: background-service-worker/02_NETWORK_MONITOR.md, notification-system/02_WALLET_INTEGRATION.md_
