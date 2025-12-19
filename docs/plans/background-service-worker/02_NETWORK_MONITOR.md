# Phase 2: Network Monitor

## Overview

This phase implements the network monitoring capabilities of the service worker, focusing on Chronik polling for transaction detection and balance updates when the main tab is inactive.

**Priority**: P0 (Critical)
**Estimated Effort**: 1-2 days
**Dependencies**: Phase 1 (Service Worker Foundation)

---

## Objectives

1. Implement Chronik REST API polling from service worker
2. Detect incoming transactions while tab is backgrounded
3. Track balance changes and notify client
4. Handle block confirmations for pending transactions

---

## Current State Analysis

### Existing Implementation

The current `services/chronik.ts` uses:

- WebSocket for real-time updates (disconnects when tab is inactive)
- REST API for fetching UTXOs and transaction history
- Visibility change handler as a workaround (lines 572-584 in `stores/wallet.ts`)

### Gap

WebSocket connections are unreliable when:

- Tab is in background (browser throttles/suspends)
- Mobile browser puts app to sleep
- Network briefly disconnects

---

## 1. Chronik Polling in Service Worker

### Update: `public/sw.js`

Add Chronik polling implementation.

```js
// ============================================================================
// Network Monitoring Implementation
// ============================================================================

// State for network monitoring
let lastKnownUtxos = new Map() // outpoint -> { value, height }
let lastKnownBalance = '0'
let lastKnownTipHeight = 0
let pendingTxids = new Set() // Track pending transactions for confirmation

async function checkForUpdates() {
  if (!config) return

  try {
    // Fetch current UTXOs
    const utxos = await fetchUtxos()

    // Detect changes
    const changes = detectUtxoChanges(utxos)

    if (changes.added.length > 0 || changes.removed.length > 0) {
      // Calculate new balance
      const newBalance = calculateBalance(utxos)

      // Notify about new transactions
      for (const added of changes.added) {
        // Fetch transaction details
        const tx = await fetchTransaction(added.txid)

        broadcastToClients({
          type: 'TRANSACTION_DETECTED',
          payload: {
            txid: added.txid,
            isIncoming: true,
            amount: added.value,
            timestamp: Date.now(),
          },
        })

        // Show notification for incoming transactions
        if (added.value !== '0') {
          const amountXPI = formatXPI(added.value)
          showNotification('Transaction Received', {
            body: `Received ${amountXPI} XPI`,
            tag: `tx-${added.txid}`,
            data: {
              url: `/explore/explorer/tx/${added.txid}`,
              notificationId: `tx-${added.txid}`,
            },
          })
        }
      }

      // Update balance notification
      if (newBalance !== lastKnownBalance) {
        broadcastToClients({
          type: 'BALANCE_UPDATED',
          payload: {
            total: newBalance,
            spendable: newBalance, // Simplified - full impl would check coinbase maturity
            utxoCount: utxos.length,
          },
        })
        lastKnownBalance = newBalance
      }

      // Update known UTXOs
      lastKnownUtxos = new Map(
        utxos.map(u => [`${u.outpoint.txid}:${u.outpoint.outIdx}`, u]),
      )
    }

    // Check blockchain info for tip height
    await checkBlockchainInfo()
  } catch (error) {
    console.error('[SW] Network check failed:', error)
    broadcastToClients({
      type: 'ERROR',
      payload: {
        code: 'NETWORK_CHECK_FAILED',
        message: error.message,
        context: 'checkForUpdates',
      },
    })
  }
}

/**
 * Fetch UTXOs from Chronik REST API
 */
async function fetchUtxos() {
  const url = `${config.chronikUrl}/script/${config.scriptType}/${config.scriptPayload}/utxos`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Chronik API error: ${response.status}`)
  }

  const data = await response.json()
  // Chronik returns array of script UTXOs, we want the first one's utxos
  return data[0]?.utxos || []
}

/**
 * Fetch a specific transaction
 */
async function fetchTransaction(txid) {
  const url = `${config.chronikUrl}/tx/${txid}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch tx ${txid}: ${response.status}`)
  }

  return await response.json()
}

/**
 * Fetch blockchain info
 */
async function fetchBlockchainInfo() {
  const url = `${config.chronikUrl}/blockchain-info`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch blockchain info: ${response.status}`)
  }

  return await response.json()
}

/**
 * Check blockchain info for new blocks
 */
async function checkBlockchainInfo() {
  try {
    const info = await fetchBlockchainInfo()

    if (info.tipHeight > lastKnownTipHeight) {
      lastKnownTipHeight = info.tipHeight

      // Check pending transactions for confirmations
      for (const txid of pendingTxids) {
        try {
          const tx = await fetchTransaction(txid)
          if (tx.block) {
            // Transaction confirmed
            pendingTxids.delete(txid)
            broadcastToClients({
              type: 'TRANSACTION_CONFIRMED',
              payload: {
                txid,
                blockHeight: tx.block.height,
                confirmations: lastKnownTipHeight - tx.block.height + 1,
              },
            })
          }
        } catch (e) {
          // Transaction may have been dropped
          console.warn(`[SW] Failed to check tx ${txid}:`, e)
        }
      }
    }
  } catch (error) {
    console.error('[SW] Failed to check blockchain info:', error)
  }
}

/**
 * Detect changes between old and new UTXO sets
 */
function detectUtxoChanges(newUtxos) {
  const newMap = new Map(
    newUtxos.map(u => [`${u.outpoint.txid}:${u.outpoint.outIdx}`, u]),
  )

  const added = []
  const removed = []

  // Find added UTXOs
  for (const [outpoint, utxo] of newMap) {
    if (!lastKnownUtxos.has(outpoint)) {
      added.push({
        outpoint,
        txid: utxo.outpoint.txid,
        outIdx: utxo.outpoint.outIdx,
        value: utxo.value,
        height: utxo.blockHeight,
      })
    }
  }

  // Find removed UTXOs
  for (const [outpoint, utxo] of lastKnownUtxos) {
    if (!newMap.has(outpoint)) {
      removed.push({
        outpoint,
        txid: utxo.outpoint?.txid || outpoint.split(':')[0],
        value: utxo.value,
      })
    }
  }

  return { added, removed }
}

/**
 * Calculate total balance from UTXOs
 */
function calculateBalance(utxos) {
  let total = BigInt(0)
  for (const utxo of utxos) {
    total += BigInt(utxo.value)
  }
  return total.toString()
}

/**
 * Format satoshis as XPI string
 */
function formatXPI(sats) {
  const num = Number(sats) / 1_000_000
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}
```

---

## 2. Track Pending Transactions

### Add Message Type: `types/service-worker.ts`

```ts
export interface SWTrackTransactionMessage {
  type: 'TRACK_TRANSACTION'
  payload: {
    txid: string
  }
}

export interface SWUntrackTransactionMessage {
  type: 'UNTRACK_TRANSACTION'
  payload: {
    txid: string
  }
}

export interface SWTransactionConfirmedMessage {
  type: 'TRANSACTION_CONFIRMED'
  payload: {
    txid: string
    blockHeight: number
    confirmations: number
  }
}

// Add to ClientToSWMessage union
export type ClientToSWMessage =
  | SWConfigureMessage
  | SWStartMonitoringMessage
  | SWStopMonitoringMessage
  | SWRegisterSessionMessage
  | SWUnregisterSessionMessage
  | SWUpdatePresenceMessage
  | SWTrackTransactionMessage
  | SWUntrackTransactionMessage

// Add to SWToClientMessage union
export type SWToClientMessage =
  | SWTransactionDetectedMessage
  | SWSessionExpiringMessage
  | SWBalanceUpdatedMessage
  | SWNotificationClickMessage
  | SWPresenceRefreshedMessage
  | SWTransactionConfirmedMessage
  | SWErrorMessage
```

### Update: `public/sw.js`

Add handlers for tracking transactions.

```js
// In message handler switch statement:

case 'TRACK_TRANSACTION':
  pendingTxids.add(message.payload.txid)
  console.log(`[SW] Tracking transaction: ${message.payload.txid}`)
  break

case 'UNTRACK_TRANSACTION':
  pendingTxids.delete(message.payload.txid)
  console.log(`[SW] Untracking transaction: ${message.payload.txid}`)
  break
```

---

## 3. Update Composable

### Update: `composables/useServiceWorker.ts`

Add transaction tracking methods.

```ts
/**
 * Track a pending transaction for confirmation
 */
function trackTransaction(txid: string) {
  postMessage({
    type: 'TRACK_TRANSACTION',
    payload: { txid },
  })
}

/**
 * Stop tracking a transaction
 */
function untrackTransaction(txid: string) {
  postMessage({
    type: 'UNTRACK_TRANSACTION',
    payload: { txid },
  })
}

// Add to return object
return {
  // ... existing
  trackTransaction,
  untrackTransaction,
}
```

---

## 4. Integration with Wallet Store

### Update: `stores/wallet.ts`

Integrate service worker events with wallet state.

```ts
// In initializeChronik(), add event listeners:

// Listen for SW balance updates
if (typeof window !== 'undefined') {
  window.addEventListener('sw-balance-updated', ((event: CustomEvent) => {
    const { total, spendable, utxoCount } = event.detail
    // Only update if different (avoid unnecessary reactivity)
    if (this.balance.total !== total) {
      this.balance = { total, spendable }
      this.saveWalletState()
    }
  }) as EventListener)

  window.addEventListener('sw-transaction-detected', ((event: CustomEvent) => {
    const { txid, isIncoming, amount } = event.detail
    // Refresh full state to get complete transaction details
    this.refreshUtxos()
    this.fetchTransactionHistory()

    // Add notification
    const notificationStore = useNotificationStore()
    notificationStore.addTransactionNotification(
      txid,
      formatXPI(amount),
      !isIncoming,
    )
  }) as EventListener)

  window.addEventListener('sw-transaction-confirmed', ((event: CustomEvent) => {
    const { txid, confirmations } = event.detail
    // Update transaction in history
    const tx = this.transactionHistory.find(t => t.txid === txid)
    if (tx) {
      tx.confirmations = confirmations
    }
  }) as EventListener)
}
```

### Track Sent Transactions

When broadcasting a transaction, track it for confirmation:

```ts
// In sendTransaction() or similar method:

async sendTransaction(rawTxHex: string): Promise<string> {
  const result = await broadcastTransaction(rawTxHex)
  const txid = result.txid

  // Track for confirmation in service worker
  if (typeof window !== 'undefined') {
    const { trackTransaction } = useServiceWorker()
    trackTransaction(txid)
  }

  return txid
}
```

---

## 5. Adaptive Polling Strategy

Implement smart polling that adjusts based on activity.

### Update: `public/sw.js`

```js
// Polling configuration
const POLL_INTERVAL_ACTIVE = 15000 // 15s when recent activity
const POLL_INTERVAL_IDLE = 60000 // 60s when idle
const POLL_INTERVAL_BACKGROUND = 120000 // 2min when no clients
const ACTIVITY_TIMEOUT = 300000 // 5min to consider idle

let lastActivityTime = Date.now()
let currentPollInterval = POLL_INTERVAL_ACTIVE

function handleStartMonitoring(payload) {
  if (!config) {
    broadcastToClients({
      type: 'ERROR',
      payload: {
        code: 'NOT_CONFIGURED',
        message: 'Service worker not configured',
        context: 'START_MONITORING',
      },
    })
    return
  }

  if (monitoringActive) {
    return
  }

  monitoringActive = true
  lastActivityTime = Date.now()

  // Start with active polling
  scheduleNextPoll(POLL_INTERVAL_ACTIVE)

  // Initial check
  checkForUpdates()

  console.log('[SW] Monitoring started with adaptive polling')
}

function scheduleNextPoll(interval) {
  if (monitoringInterval) {
    clearTimeout(monitoringInterval)
  }

  currentPollInterval = interval
  monitoringInterval = setTimeout(async () => {
    if (!monitoringActive) return

    await checkForUpdates()

    // Determine next interval based on activity
    const timeSinceActivity = Date.now() - lastActivityTime
    const hasClients =
      (await self.clients.matchAll({ type: 'window' })).length > 0

    let nextInterval
    if (!hasClients) {
      nextInterval = POLL_INTERVAL_BACKGROUND
    } else if (timeSinceActivity > ACTIVITY_TIMEOUT) {
      nextInterval = POLL_INTERVAL_IDLE
    } else {
      nextInterval = POLL_INTERVAL_ACTIVE
    }

    scheduleNextPoll(nextInterval)
  }, interval)
}

// Reset activity timer when changes detected
function detectUtxoChanges(newUtxos) {
  // ... existing implementation ...

  // If changes detected, reset activity timer
  if (added.length > 0 || removed.length > 0) {
    lastActivityTime = Date.now()
  }

  return { added, removed }
}
```

---

## 6. Implementation Checklist

### Service Worker Updates

- [ ] Implement `fetchUtxos()` REST API call
- [ ] Implement `fetchTransaction()` REST API call
- [ ] Implement `fetchBlockchainInfo()` REST API call
- [ ] Implement `detectUtxoChanges()` comparison logic
- [ ] Implement `calculateBalance()` from UTXOs
- [ ] Add pending transaction tracking
- [ ] Implement adaptive polling strategy

### Message Types

- [ ] Add `TRACK_TRANSACTION` message type
- [ ] Add `UNTRACK_TRANSACTION` message type
- [ ] Add `TRANSACTION_CONFIRMED` message type
- [ ] Update type unions

### Composable Updates

- [ ] Add `trackTransaction()` method
- [ ] Add `untrackTransaction()` method

### Wallet Store Integration

- [ ] Add SW event listeners in `initializeChronik()`
- [ ] Handle `sw-balance-updated` event
- [ ] Handle `sw-transaction-detected` event
- [ ] Handle `sw-transaction-confirmed` event
- [ ] Track sent transactions for confirmation

### Testing

- [ ] Test transaction detection with tab in background
- [ ] Test balance updates sync correctly
- [ ] Test pending transaction confirmation tracking
- [ ] Test adaptive polling intervals
- [ ] Test notification appears for incoming transactions
- [ ] Test error handling when Chronik is unavailable

---

## Notes

- Service worker fetch requests are not subject to CORS when same-origin
- Chronik REST API is used instead of WebSocket (SW can't maintain WS)
- Polling is more battery-intensive than WebSocket - use adaptive intervals
- Consider implementing exponential backoff on errors

---

## Next Phase

Once this phase is complete, proceed to [03_SESSION_MONITOR.md](./03_SESSION_MONITOR.md) for MuSig2 session timeout monitoring.
