# Phase 3: P2P and MuSig2 Integration

## Overview

Integrate the notification system with P2P and MuSig2 stores to notify users of peer events and signing requests.

**Priority**: P2 (Medium)
**Estimated Effort**: 0.5 days
**Dependencies**: Phase 1 (Settings Page)
**Coordination**: Should be done alongside `unified-p2p-musig2-ui` plan

---

## Goals

1. Notify users when they receive a signing request
2. Notify users when a signing request is approved/rejected
3. Notify users of peer connection events (optional)
4. Link notifications to relevant P2P/MuSig2 pages

---

## 1. MuSig2 Store Integration

### Update: `stores/musig2.ts`

Add notification triggers for signing request events.

```ts
// Add import at top of file
import { useNotificationStore } from './notifications'

// When a new signing request is received
function onSigningRequestReceived(request: SigningRequest) {
  const notificationStore = useNotificationStore()

  // Get peer name from contacts if available, otherwise use truncated ID
  const fromName = getPeerDisplayName(request.fromPeerId)

  notificationStore.addSigningRequestNotification(request.id, fromName)
}

// When a signing request is approved by all parties
function onSigningRequestCompleted(request: SigningRequest) {
  const notificationStore = useNotificationStore()

  notificationStore.addNotification({
    type: 'signing_request',
    title: 'Transaction Signed',
    message: 'Multi-signature transaction has been completed',
    actionUrl: `/explore/explorer/tx/${request.txid}`,
    actionLabel: 'View Transaction',
    data: { requestId: request.id, txid: request.txid },
  })
}

// When a signing request is rejected
function onSigningRequestRejected(request: SigningRequest, rejectedBy: string) {
  const notificationStore = useNotificationStore()

  notificationStore.addNotification({
    type: 'signing_request',
    title: 'Signing Request Rejected',
    message: `${rejectedBy} rejected the signing request`,
    actionUrl: '/people/p2p',
    actionLabel: 'View Details',
    data: { requestId: request.id },
  })
}
```

---

## 2. P2P Store Integration

### Update: `stores/p2p.ts`

Add notification triggers for peer connection events.

```ts
// Add import at top of file
import { useNotificationStore } from './notifications'

// When a new peer connects (optional - may be too noisy)
function onPeerConnected(peerId: string) {
  const notificationStore = useNotificationStore()

  // Only notify for known contacts, not random peers
  const contact = getContactByPeerId(peerId)
  if (contact) {
    notificationStore.addNotification({
      type: 'social',
      title: 'Contact Online',
      message: `${contact.name} is now online`,
      actionUrl: '/people/p2p',
      actionLabel: 'View',
      data: { peerId, contactId: contact.id },
    })
  }
}

// When receiving a message from a peer
function onPeerMessage(peerId: string, message: P2PMessage) {
  const notificationStore = useNotificationStore()

  // Handle different message types
  if (message.type === 'signing_request') {
    // Handled by MuSig2 store
    return
  }

  // For other message types (future: chat, file sharing, etc.)
  const contact = getContactByPeerId(peerId)
  const fromName = contact?.name || truncatePeerId(peerId)

  notificationStore.addNotification({
    type: 'social',
    title: 'New Message',
    message: `${fromName} sent you a message`,
    actionUrl: '/people/p2p',
    actionLabel: 'View',
    data: { peerId, messageType: message.type },
  })
}
```

---

## 3. Shared Wallet Events

### Update: `stores/musig2.ts`

Add notifications for shared wallet events.

```ts
// When a shared wallet is created
function onSharedWalletCreated(wallet: SharedWallet) {
  const notificationStore = useNotificationStore()

  notificationStore.addNotification({
    type: 'system',
    title: 'Shared Wallet Created',
    message: `"${wallet.name}" is ready to use`,
    actionUrl: `/people/p2p?wallet=${wallet.id}`,
    actionLabel: 'View Wallet',
    data: { walletId: wallet.id },
  })
}

// When funds are received in a shared wallet
function onSharedWalletFunded(wallet: SharedWallet, amount: number) {
  const notificationStore = useNotificationStore()

  notificationStore.addNotification({
    type: 'transaction',
    title: 'Shared Wallet Funded',
    message: `${formatAmount(amount)} received in "${wallet.name}"`,
    actionUrl: `/people/p2p?wallet=${wallet.id}`,
    actionLabel: 'View Wallet',
    data: { walletId: wallet.id, amount },
  })
}

// When someone proposes a spend from shared wallet
function onSpendProposed(wallet: SharedWallet, proposer: string) {
  const notificationStore = useNotificationStore()

  notificationStore.addNotification({
    type: 'signing_request',
    title: 'Spend Proposed',
    message: `${proposer} wants to spend from "${wallet.name}"`,
    actionUrl: `/people/p2p?wallet=${wallet.id}`,
    actionLabel: 'Review',
    data: { walletId: wallet.id },
  })
}
```

---

## 4. Helper Functions

### Get Peer Display Name

```ts
// In stores/musig2.ts or a shared utility

function getPeerDisplayName(peerId: string): string {
  // Try to get contact name
  const contactsStore = useContactsStore()
  const contact = contactsStore.contacts.find(c => c.peerId === peerId)

  if (contact) {
    return contact.name
  }

  // Fallback to truncated peer ID
  return `${peerId.slice(0, 8)}...`
}
```

---

## 5. Implementation Checklist

### MuSig2 Store Updates

- [ ] Import `useNotificationStore` in musig2 store
- [ ] Add notification for incoming signing requests
- [ ] Add notification for completed signing requests
- [ ] Add notification for rejected signing requests
- [ ] Add notification for shared wallet creation
- [ ] Add notification for shared wallet funding
- [ ] Add notification for spend proposals

### P2P Store Updates

- [ ] Import `useNotificationStore` in p2p store
- [ ] Add notification for contact coming online (optional)
- [ ] Add notification for incoming messages (future)

### Testing

- [ ] Test signing request notification appears
- [ ] Test clicking notification navigates to P2P page
- [ ] Test notification preferences are respected
- [ ] Verify notifications persist after page refresh

---

## Notes

- Peer connection notifications may be too noisy - consider making them opt-in
- This phase should be coordinated with the `unified-p2p-musig2-ui` plan
- The exact integration points depend on the current P2P/MuSig2 store implementations

---

## Next Phase

Once this phase is complete, proceed to [04_BROWSER_NOTIFICATIONS.md](./04_BROWSER_NOTIFICATIONS.md) for native browser notification support.
