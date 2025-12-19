# Phase 2: Wallet Store Integration

## Overview

Integrate the notification system with the wallet store to trigger notifications for incoming and outgoing transactions.

**Priority**: P1 (High)
**Estimated Effort**: 0.5 days
**Dependencies**: Phase 1 (Settings Page)

---

## Goals

1. Notify users when they receive a transaction
2. Notify users when their sent transaction is confirmed
3. Link notifications to transaction detail pages

---

## 1. Wallet Store Integration

### Update: `stores/wallet.ts`

Add notification triggers when transactions are detected.

```ts
// Add import at top of file
import { useNotificationStore } from './notifications'

// In the action that handles new transactions (e.g., from Chronik WebSocket)
// Add notification trigger after detecting a new incoming transaction:

function handleNewTransaction(tx: WalletTransaction) {
  const notificationStore = useNotificationStore()

  // Determine if this is incoming or outgoing
  const isIncoming = tx.satoshis > 0

  if (isIncoming) {
    // Format amount for display
    const amount = formatAmount(tx.satoshis)

    notificationStore.addTransactionNotification(
      tx.txid,
      amount,
      false, // isSend = false for incoming
    )
  }
}

// For sent transactions, add notification in the broadcast success handler:
function onBroadcastSuccess(txid: string, amount: number) {
  const notificationStore = useNotificationStore()
  const formattedAmount = formatAmount(amount)

  notificationStore.addTransactionNotification(
    txid,
    formattedAmount,
    true, // isSend = true for outgoing
  )
}
```

---

## 2. Chronik WebSocket Integration

The wallet likely uses Chronik's WebSocket for real-time transaction updates. The notification should be triggered when:

1. A new transaction is detected that affects the wallet's addresses
2. The transaction is confirmed (optional - for confirmation notifications)

### Locate the WebSocket Handler

Find where Chronik WebSocket messages are processed (likely in `services/chronik.ts` or within the wallet store) and add the notification trigger there.

```ts
// Example integration point in Chronik service or wallet store

// When a new transaction is received via WebSocket
function onWsMessage(msg: WsMsg) {
  if (msg.type === 'Tx') {
    // Process transaction...

    // After determining it affects our wallet and calculating the delta:
    if (isRelevantToWallet && delta !== 0) {
      const notificationStore = useNotificationStore()
      const isIncoming = delta > 0

      notificationStore.addTransactionNotification(
        msg.txid,
        formatSatoshis(Math.abs(delta)),
        !isIncoming,
      )
    }
  }
}
```

---

## 3. Avoid Duplicate Notifications

Ensure notifications are not duplicated when:

1. The same transaction is seen multiple times (mempool + confirmation)
2. The user initiates a send (don't notify for their own sends immediately)

### Strategy

```ts
// Track recently notified transactions to avoid duplicates
const recentlyNotified = new Set<string>()

function shouldNotify(txid: string): boolean {
  if (recentlyNotified.has(txid)) {
    return false
  }

  recentlyNotified.add(txid)

  // Clean up after 1 minute
  setTimeout(() => {
    recentlyNotified.delete(txid)
  }, 60000)

  return true
}

// Use in notification trigger
if (shouldNotify(tx.txid)) {
  notificationStore.addTransactionNotification(...)
}
```

---

## 4. Format Amount Helper

Ensure a consistent amount formatting function is used:

```ts
// In utils/formatting.ts or similar

export function formatSatoshisForNotification(satoshis: number): string {
  const xpi = satoshis / 1_000_000
  if (xpi >= 1000) {
    return `${(xpi / 1000).toFixed(2)}K XPI`
  }
  if (xpi >= 1) {
    return `${xpi.toFixed(2)} XPI`
  }
  return `${satoshis.toLocaleString()} sats`
}
```

---

## 5. Implementation Checklist

### Wallet Store Updates

- [ ] Import `useNotificationStore` in wallet store
- [ ] Add notification trigger for incoming transactions
- [ ] Add notification trigger for sent transaction confirmations
- [ ] Implement duplicate prevention

### Chronik Integration

- [ ] Locate WebSocket message handler
- [ ] Add notification trigger in appropriate location
- [ ] Test with real incoming transactions

### Testing

- [ ] Send a transaction to the wallet and verify notification appears
- [ ] Send a transaction from the wallet and verify notification appears
- [ ] Verify clicking notification navigates to transaction detail
- [ ] Verify notifications persist after page refresh
- [ ] Verify duplicate notifications are prevented

---

## Notes

- The exact integration point depends on the current wallet store implementation
- Review `stores/wallet.ts` and `services/chronik.ts` to find the best integration points
- Consider adding a "mute" period after sending to avoid immediate self-notifications

---

## Next Phase

Once this phase is complete, proceed to [03_P2P_MUSIG2_INTEGRATION.md](./03_P2P_MUSIG2_INTEGRATION.md) for P2P and MuSig2 notification integration.
