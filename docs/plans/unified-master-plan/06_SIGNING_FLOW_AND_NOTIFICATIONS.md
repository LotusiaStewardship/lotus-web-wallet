# Phase 6: Signing Flow and Notifications

## Overview

This phase implements the unified signing flow for both P2P and shared wallet contexts, along with P2P/MuSig2 notification integration. Users will be able to initiate, receive, and complete signing requests with full notification support.

**Priority**: P0 (Critical Path)
**Estimated Effort**: 3-4 days
**Dependencies**: Phase 5 (MuSig2 Core and Session Monitor)

---

## Source Phases

| Source Plan           | Phase | Component              |
| --------------------- | ----- | ---------------------- |
| unified-p2p-musig2-ui | 4     | Unified Signing Flow   |
| notification-system   | 3     | P2P/MuSig2 Integration |

---

## Tasks

### 6.1 Signing Request Components

**Source**: unified-p2p-musig2-ui/04_SIGNING_FLOW.md
**Effort**: 1.5 days

#### ProposeSpendModal Update

- [ ] Update `components/musig2/ProposeSpendModal.vue` with full flow

  ```vue
  <script setup lang="ts">
  interface Props {
    modelValue: boolean
    wallet: SharedWallet
  }

  const step = ref<'recipient' | 'amount' | 'review' | 'signing'>('recipient')

  // Step 1: Recipient
  const recipient = ref('')
  const recipientContact = computed(() =>
    contactsStore.findByAddress(recipient.value),
  )

  // Step 2: Amount
  const amount = ref(0)
  const fee = ref(0)

  // Step 3: Review & Sign
  async function proposeSpend() {
    step.value = 'signing'
    await musig2Store.proposeSpend({
      walletId: props.wallet.id,
      recipient: recipient.value,
      amount: amount.value,
      fee: fee.value,
    })
  }
  </script>
  ```

  Steps:

  1. **Recipient**: Address input or contact selection
  2. **Amount**: Amount input with balance validation
  3. **Review**: Transaction preview with fee
  4. **Signing**: Progress indicator while collecting signatures

#### RequestDetailModal

- [ ] Create `components/musig2/RequestDetailModal.vue`

  ```vue
  <script setup lang="ts">
  interface Props {
    modelValue: boolean
    request: SigningRequest | null
  }

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'accept': [request: SigningRequest]
    'reject': [request: SigningRequest]
  }>()
  </script>
  ```

  Features:

  - Request details (from, wallet, amount)
  - Transaction preview
  - Accept/Reject buttons
  - Expiry countdown
  - Requester info (contact name if known)

#### IncomingRequestCard

- [ ] Create `components/musig2/IncomingRequestCard.vue`
  ```vue
  <template>
    <UCard class="border-l-4 border-yellow-500">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium">Signing Request</p>
          <p class="text-sm text-gray-500">
            {{ request.fromName || truncate(request.fromPeerId) }} wants you to
            sign
          </p>
          <p class="text-lg font-semibold">
            <AmountDisplay :sats="request.amount" />
          </p>
        </div>
        <div class="flex gap-2">
          <UButton color="red" variant="soft" @click="$emit('reject')">
            Reject
          </UButton>
          <UButton color="green" @click="$emit('accept')"> Review </UButton>
        </div>
      </div>
      <p class="text-xs text-gray-400 mt-2">
        Expires in {{ formatTimeRemaining(request.expiresAt) }}
      </p>
    </UCard>
  </template>
  ```

#### SigningRequestModal Update

- [ ] Update `components/p2p/SigningRequestModal.vue` for P2P requests
  - Select signer(s) to request from
  - Transaction details input
  - Message/note field
  - Send request button

#### RequestList Update

- [ ] Update `components/p2p/RequestList.vue` with status tracking
  - Incoming requests section
  - Outgoing requests section
  - Status indicators (pending, accepted, rejected, expired)
  - Action buttons per status

---

### 6.2 Store Methods Verification

**Effort**: 0.5 days

#### MuSig2 Store Actions

- [ ] Verify `proposeSpend` action

  ```typescript
  async proposeSpend(params: {
    walletId: string
    recipient: string
    amount: number
    fee: number
  }) {
    // Create transaction
    // Start signing session
    // Send requests to participants
    // Return session ID
  }
  ```

- [ ] Verify `acceptRequest` action

  ```typescript
  async acceptRequest(requestId: string) {
    // Get request details
    // Join signing session
    // Provide commitment/signature
    // Update request status
  }
  ```

- [ ] Verify `rejectRequest` action
- [ ] Verify `cancelRequest` action (for outgoing)
- [ ] Verify `abortSession` action

---

### 6.3 P2P/MuSig2 Notification Integration

**Source**: notification-system/03_P2P_MUSIG2_INTEGRATION.md
**Effort**: 1 day

#### MuSig2 Store Notifications

- [ ] Import notification store in `stores/musig2.ts`

  ```typescript
  import { useNotificationStore } from './notifications'
  ```

- [ ] Add notification for incoming signing requests

  ```typescript
  function handleIncomingRequest(request: SigningRequest) {
    const notificationStore = useNotificationStore()
    const contactsStore = useContactsStore()

    const fromContact = contactsStore.findByPeerId(request.fromPeerId)

    notificationStore.addNotification({
      type: 'signing_request',
      title: 'Signing Request',
      message: `${
        fromContact?.name || 'Someone'
      } wants you to sign a transaction`,
      data: { requestId: request.id },
      persistent: true,
      actions: [
        { label: 'Review', action: 'review_request' },
        { label: 'Reject', action: 'reject_request' },
      ],
    })
  }
  ```

- [ ] Add notification for completed signing requests

  ```typescript
  function handleSessionComplete(session: SigningSession) {
    const notificationStore = useNotificationStore()

    notificationStore.addNotification({
      type: 'signing_complete',
      title: 'Signing Complete',
      message: `Transaction signed and broadcast`,
      data: { sessionId: session.id, txid: session.txid },
      persistent: false,
    })
  }
  ```

- [ ] Add notification for rejected signing requests
- [ ] Add notification for shared wallet creation
- [ ] Add notification for shared wallet funding
- [ ] Add notification for spend proposals

#### P2P Store Notifications

- [ ] Import notification store in `stores/p2p.ts`

- [ ] Add notification for contact coming online (optional, preference-controlled)
  ```typescript
  function handlePeerOnline(peerId: string) {
    const notificationStore = useNotificationStore()
    const contactsStore = useContactsStore()

    const contact = contactsStore.findByPeerId(peerId)
    if (!contact) return // Only notify for contacts

    if (notificationStore.preferences.peerOnline) {
      notificationStore.addNotification({
        type: 'peer_online',
        title: 'Contact Online',
        message: `${contact.name} is now online`,
        persistent: false,
      })
    }
  }
  ```

---

### 6.4 Integration Wiring

**Effort**: 1 day

#### P2P Page Request Handlers

- [ ] Wire up request handlers in `pages/people/p2p.vue`

  ```typescript
  async function handleAcceptRequest(request: SigningRequest) {
    showRequestDetail.value = false
    await musig2Store.acceptRequest(request.id)
  }

  async function handleRejectRequest(request: SigningRequest) {
    showRequestDetail.value = false
    await musig2Store.rejectRequest(request.id)
  }
  ```

#### Shared Wallet Spend Handlers

- [ ] Wire up spend handlers in shared wallet detail
  ```typescript
  async function handleProposeSpend(params: SpendParams) {
    showSpendModal.value = false
    const sessionId = await musig2Store.proposeSpend(params)
    // Navigate to session or show progress
  }
  ```

#### Request Notifications

- [ ] Add notification click handling
  ```typescript
  // In notification center or handler
  function handleNotificationClick(notification: Notification) {
    switch (notification.type) {
      case 'signing_request':
        navigateTo('/people/p2p?tab=requests')
        break
      case 'signing_complete':
        navigateTo(`/explore/explorer/tx/${notification.data.txid}`)
        break
    }
  }
  ```

#### Session Progress Tracking

- [ ] Add session progress to UI
  ```vue
  <!-- In P2P page or shared wallet detail -->
  <SigningProgress
    v-if="activeSession"
    :participants="activeSession.participants"
    :current-step="activeSession.step"
    :timeout-at="activeSession.expiresAt"
  />
  ```

---

## File Changes Summary

### New Files

| File                                        | Purpose                   |
| ------------------------------------------- | ------------------------- |
| `components/musig2/RequestDetailModal.vue`  | Incoming request detail   |
| `components/musig2/IncomingRequestCard.vue` | Prominent request display |

### Modified Files

| File                                      | Changes                  |
| ----------------------------------------- | ------------------------ |
| `components/musig2/ProposeSpendModal.vue` | Full wizard flow         |
| `components/p2p/SigningRequestModal.vue`  | P2P request flow         |
| `components/p2p/RequestList.vue`          | Status tracking          |
| `stores/musig2.ts`                        | Notification integration |
| `stores/p2p.ts`                           | Notification integration |
| `pages/people/p2p.vue`                    | Request handlers         |
| `pages/people/shared-wallets/[id].vue`    | Spend handlers           |

---

## Signing Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UNIFIED SIGNING FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ENTRY POINTS                                                               │
│  ┌─────────────────────┐  ┌─────────────────────┐                          │
│  │ Shared Wallet       │  │ P2P Page            │                          │
│  │ "Spend" button      │  │ "Request Signature" │                          │
│  └──────────┬──────────┘  └──────────┬──────────┘                          │
│             │                        │                                      │
│             └────────────┬───────────┘                                      │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PROPOSE TRANSACTION                                                 │   │
│  │  • Select recipient                                                  │   │
│  │  • Enter amount                                                      │   │
│  │  • Review transaction                                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SEND REQUESTS                                                       │   │
│  │  • Create signing session                                            │   │
│  │  • Send to participants via P2P                                      │   │
│  │  • Register session with SW                                          │   │
│  │  • Add notification for each participant                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  COLLECT SIGNATURES                                                  │   │
│  │  • Show progress indicator                                           │   │
│  │  • Update as participants respond                                    │   │
│  │  • Handle timeouts (SW monitors)                                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  BROADCAST                                                           │   │
│  │  • Aggregate signatures                                              │   │
│  │  • Broadcast transaction                                             │   │
│  │  • Add completion notification                                       │   │
│  │  • Navigate to transaction detail                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Notification Types

| Event                    | Type               | Persistent | Actions          |
| ------------------------ | ------------------ | ---------- | ---------------- |
| Incoming signing request | `signing_request`  | Yes        | Review, Reject   |
| Request accepted         | `request_accepted` | No         | -                |
| Request rejected         | `request_rejected` | No         | -                |
| Signing complete         | `signing_complete` | No         | View Transaction |
| Session timeout          | `session_timeout`  | Yes        | -                |
| Shared wallet created    | `wallet_created`   | No         | View Wallet      |
| Wallet funded            | `wallet_funded`    | No         | View Wallet      |
| Spend proposed           | `spend_proposed`   | Yes        | Review           |

---

## Verification Checklist

### Signing Request Components

- [ ] ProposeSpendModal wizard works end-to-end
- [ ] RequestDetailModal shows all request info
- [ ] IncomingRequestCard displays prominently
- [ ] RequestList shows correct status for each request

### Store Methods

- [ ] proposeSpend creates session and sends requests
- [ ] acceptRequest joins session correctly
- [ ] rejectRequest updates status
- [ ] cancelRequest works for outgoing
- [ ] abortSession cleans up properly

### Notifications

- [ ] Incoming request triggers notification
- [ ] Notification click navigates correctly
- [ ] Completed signing triggers notification
- [ ] Rejected request triggers notification
- [ ] Notifications respect user preferences

### Integration

- [ ] P2P page handlers work correctly
- [ ] Shared wallet spend handlers work
- [ ] Session progress updates in real-time
- [ ] Timeout warnings appear (from SW)

---

## Notes

- Signing flow is unified regardless of entry point
- Notifications provide awareness without requiring active tab
- Session monitor (SW) ensures timeouts are handled
- All notifications link to relevant pages

---

## Next Phase

After completing Phase 6, proceed to:

- **Phase 7**: Explorer and Social (can start in parallel)
- **Phase 8**: Push and Browser Notifications

---

_Source: unified-p2p-musig2-ui/04_SIGNING_FLOW.md, notification-system/03_P2P_MUSIG2_INTEGRATION.md_
