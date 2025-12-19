# 07: Signing Requests

## Overview

This document details the handling of incoming signing requests. When another participant proposes a transaction from a shared wallet, the user must be notified and given the opportunity to review and approve or reject the request.

---

## Incoming Request Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     INCOMING SIGNING REQUEST FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

Another participant proposes a spend
         │
         ▼
┌─────────────────────┐
│ Notification        │
│ • Toast alert       │
│ • Badge on nav      │
│ • Sound (optional)  │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Request Card        │
│ • Show in P2P page  │
│ • Show in wallet    │
│ • Quick actions     │
└─────────────────────┘
         │
         ├─────────────────────────┐
         ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐
│ View Details        │   │ Quick Reject        │
│ • Full tx preview   │   │ • Optional reason   │
│ • Participant info  │   │ • Notify requester  │
│ • Approve/Reject    │   └─────────────────────┘
└─────────────────────┘
         │
         ├─────────────────────────┐
         ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐
│ Approve             │   │ Reject              │
│ • Join session      │   │ • Optional reason   │
│ • Share nonce       │   │ • Notify requester  │
│ • Share partial sig │   └─────────────────────┘
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Signing Progress    │
│ • Same as initiator │
│ • Wait for others   │
│ • See completion    │
└─────────────────────┘
```

---

## UI Components

### Incoming Request Card (Compact)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔔 Signing Request                                              2 min ago  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Alice wants you to co-sign a transaction                                   │
│                                                                             │
│  From: Family Treasury (2-of-2)                                            │
│  Amount: 1,000.00 XPI → Bob                                                │
│  Purpose: Birthday gift                                                     │
│                                                                             │
│                              [View Details]  [Approve]  [Reject]            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request Detail Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 Signing Request Details                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Alice is requesting your signature                                         │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Transaction Details                                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ From: Family Treasury                                                │   │
│  │       lotus_16PSJKqoPbvGLWdNhKCrCkP5KrPi9... (shared)               │   │
│  │                                                                       │   │
│  │ To: Bob                                                              │   │
│  │     lotus_16PSJKqoPbvGLWdNhKCrCkP5KrPi9...                          │   │
│  │                                                                       │   │
│  │ Amount: 1,000.00 XPI                                                 │   │
│  │ Fee: 0.001 XPI                                                       │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Total: 1,000.001 XPI                                                 │   │
│  │                                                                       │   │
│  │ Purpose: Birthday gift for Bob                                       │   │
│  │                                                                       │   │
│  │ Requested by: Alice                                                  │   │
│  │ Requested at: Dec 10, 2024 3:45 PM                                  │   │
│  │ Expires in: 4:32                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Participants (2)                                                           │
│                                                                             │
│  ✅ Alice (requester)                                          ● Online     │
│  ⏳ You                                                        ● Online     │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⚠️ By approving, you agree to sign this transaction. This action          │
│     cannot be undone once the transaction is broadcast.                     │
│                                                                             │
│                                              [Reject]  [Approve & Sign]     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Reject Confirmation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Reject Signing Request?                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Are you sure you want to reject this request?                              │
│                                                                             │
│  Transaction: 1,000.00 XPI to Bob                                          │
│  Requested by: Alice                                                        │
│                                                                             │
│  Reason (optional):                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [                                                                  ] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Alice will be notified of your rejection.                                  │
│                                                                             │
│                                              [Cancel]  [Reject Request]     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Implementation

### File: `components/musig2/IncomingRequestCard.vue`

```vue
<script setup lang="ts">
import type { WalletSigningSession } from '~/services/musig2'

const props = defineProps<{
  session: WalletSigningSession
  compact?: boolean
}>()

const emit = defineEmits<{
  viewDetails: []
  approve: []
  reject: []
}>()

const musig2Store = useMuSig2Store()
const contactStore = useContactStore()
const { formatXPI } = useAmount()
const { timeAgo } = useTime()

// Get the shared wallet for this session
const wallet = computed(() => {
  // Find wallet by matching participants or session metadata
  return musig2Store.sharedWallets.find(w =>
    w.participants.some(p => p.peerId === props.session.coordinatorPeerId),
  )
})

// Get requester info
const requester = computed(() => {
  const peerId = props.session.coordinatorPeerId
  // Try to find in contacts
  const contact = contactStore.contactList.find(c => c.peerId === peerId)
  return contact?.name || 'Unknown'
})

// Parse session metadata for transaction details
const txDetails = computed(() => {
  // In real implementation, this would come from session metadata
  return {
    amount: '0', // Would be parsed from session
    recipient: '',
    purpose: '',
  }
})

// Time remaining
const expiresIn = computed(() => {
  const remaining = props.session.expiresAt - Date.now()
  if (remaining <= 0) return 'Expired'

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const isExpired = computed(() => props.session.expiresAt <= Date.now())
</script>

<template>
  <UCard
    :class="[
      'border-l-4',
      isExpired ? 'border-l-red-500 opacity-50' : 'border-l-warning-500',
    ]"
  >
    <div class="flex items-start gap-4">
      <!-- Icon -->
      <div
        class="w-10 h-10 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center flex-shrink-0"
      >
        <UIcon name="i-lucide-bell" class="w-5 h-5 text-warning-600" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <p class="font-medium">Signing Request</p>
          <span class="text-xs text-muted">{{
            timeAgo(session.createdAt)
          }}</span>
        </div>

        <p class="text-sm text-muted mb-2">
          {{ requester }} wants you to co-sign a transaction
        </p>

        <div v-if="wallet" class="text-sm space-y-1">
          <p>
            <span class="text-muted">From:</span>
            {{ wallet.name }} ({{ wallet.participants.length }}-of-{{
              wallet.participants.length
            }})
          </p>
          <p v-if="txDetails.amount">
            <span class="text-muted">Amount:</span>
            {{ formatXPI(BigInt(txDetails.amount)) }}
          </p>
          <p v-if="txDetails.purpose">
            <span class="text-muted">Purpose:</span>
            {{ txDetails.purpose }}
          </p>
        </div>

        <!-- Expiration warning -->
        <p v-if="!isExpired" class="text-xs text-muted mt-2">
          Expires in {{ expiresIn }}
        </p>
        <p v-else class="text-xs text-red-500 mt-2">This request has expired</p>
      </div>

      <!-- Actions -->
      <div
        v-if="!compact && !isExpired"
        class="flex flex-col gap-2 flex-shrink-0"
      >
        <UButton size="sm" variant="ghost" @click="emit('viewDetails')">
          View Details
        </UButton>
        <UButton size="sm" color="primary" @click="emit('approve')">
          Approve
        </UButton>
        <UButton
          size="sm"
          variant="outline"
          color="red"
          @click="emit('reject')"
        >
          Reject
        </UButton>
      </div>

      <!-- Compact actions -->
      <div v-else-if="!isExpired" class="flex gap-2 flex-shrink-0">
        <UButton size="xs" color="primary" @click="emit('approve')">
          Approve
        </UButton>
        <UButton size="xs" variant="outline" @click="emit('viewDetails')">
          View
        </UButton>
      </div>
    </div>
  </UCard>
</template>
```

### File: `components/musig2/RequestDetailModal.vue`

```vue
<script setup lang="ts">
import type { WalletSigningSession } from '~/services/musig2'

const props = defineProps<{
  session: WalletSigningSession | null
}>()

const open = defineModel<boolean>('open')

const emit = defineEmits<{
  approve: []
  reject: [reason?: string]
}>()

const musig2Store = useMuSig2Store()
const contactStore = useContactStore()
const p2pStore = useP2PStore()
const { formatXPI } = useAmount()
const { formatDate } = useTime()

// State
const showRejectConfirm = ref(false)
const rejectReason = ref('')
const approving = ref(false)

// Get wallet
const wallet = computed(() => {
  if (!props.session) return null
  return musig2Store.sharedWallets.find(w =>
    w.participants.some(p => p.peerId === props.session?.coordinatorPeerId),
  )
})

// Get requester
const requester = computed(() => {
  if (!props.session) return null
  const peerId = props.session.coordinatorPeerId
  return contactStore.contactList.find(c => c.peerId === peerId)
})

// Transaction details (would come from session metadata)
const txDetails = computed(() => ({
  amount: BigInt(0),
  recipient: '',
  recipientContact: null as any,
  fee: BigInt(1000),
  purpose: '',
}))

// Participants with status
const participants = computed(() => {
  if (!props.session) return []
  return props.session.participants.map(p => ({
    ...p,
    isRequester: p.peerId === props.session?.coordinatorPeerId,
    isMe: p.peerId === p2pStore.peerId,
    isOnline: p2pStore.isPeerOnline(p.peerId),
    contact: contactStore.contactList.find(c => c.publicKey === p.publicKeyHex),
  }))
})

// Expiration
const expiresIn = computed(() => {
  if (!props.session) return ''
  const remaining = props.session.expiresAt - Date.now()
  if (remaining <= 0) return 'Expired'

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// Actions
async function handleApprove() {
  if (!props.session) return

  approving.value = true
  try {
    emit('approve')
    open.value = false
  } finally {
    approving.value = false
  }
}

function handleReject() {
  showRejectConfirm.value = true
}

function confirmReject() {
  emit('reject', rejectReason.value || undefined)
  showRejectConfirm.value = false
  rejectReason.value = ''
  open.value = false
}

function cancelReject() {
  showRejectConfirm.value = false
  rejectReason.value = ''
}

// Reset on close
watch(open, isOpen => {
  if (!isOpen) {
    showRejectConfirm.value = false
    rejectReason.value = ''
    approving.value = false
  }
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-lg' }">
    <template #content>
      <UCard v-if="session && !showRejectConfirm">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
            <span class="font-semibold">Signing Request Details</span>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Requester info -->
          <div class="flex items-center gap-3">
            <ContactAvatar v-if="requester" :contact="requester" size="md" />
            <div
              v-else
              class="w-12 h-12 rounded-full bg-muted flex items-center justify-center"
            >
              <UIcon name="i-lucide-user" class="w-6 h-6 text-muted" />
            </div>
            <div>
              <p class="font-medium">
                {{ requester?.name || 'Unknown' }} is requesting your signature
              </p>
              <p class="text-sm text-muted">
                {{ formatDate(session.createdAt) }}
              </p>
            </div>
          </div>

          <!-- Transaction details -->
          <UCard>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted">From</span>
                <div class="text-right">
                  <p class="font-medium">
                    {{ wallet?.name || 'Shared Wallet' }}
                  </p>
                  <code class="text-xs text-muted"
                    >{{ wallet?.sharedAddress?.slice(0, 20) }}...</code
                  >
                </div>
              </div>

              <div class="flex justify-between">
                <span class="text-muted">To</span>
                <div class="text-right">
                  <p v-if="txDetails.recipientContact" class="font-medium">
                    {{ txDetails.recipientContact.name }}
                  </p>
                  <code class="text-xs text-muted">{{
                    txDetails.recipient || 'Unknown'
                  }}</code>
                </div>
              </div>

              <div class="flex justify-between">
                <span class="text-muted">Amount</span>
                <span class="font-medium">{{
                  formatXPI(txDetails.amount)
                }}</span>
              </div>

              <div class="flex justify-between">
                <span class="text-muted">Fee</span>
                <span>{{ formatXPI(txDetails.fee) }}</span>
              </div>

              <div class="border-t pt-2 flex justify-between font-medium">
                <span>Total</span>
                <span>{{ formatXPI(txDetails.amount + txDetails.fee) }}</span>
              </div>

              <div v-if="txDetails.purpose" class="border-t pt-2">
                <span class="text-muted">Purpose:</span>
                <p>{{ txDetails.purpose }}</p>
              </div>

              <div class="border-t pt-2 flex justify-between">
                <span class="text-muted">Expires in</span>
                <span :class="expiresIn === 'Expired' && 'text-red-500'">
                  {{ expiresIn }}
                </span>
              </div>
            </div>
          </UCard>

          <!-- Participants -->
          <div>
            <p class="text-sm font-medium mb-2">
              Participants ({{ participants.length }})
            </p>
            <div class="space-y-2">
              <div
                v-for="p in participants"
                :key="p.peerId"
                class="flex items-center justify-between p-2 rounded-lg bg-muted/30"
              >
                <div class="flex items-center gap-2">
                  <UIcon
                    :name="
                      p.isRequester ? 'i-lucide-check-circle' : 'i-lucide-clock'
                    "
                    :class="p.isRequester ? 'text-green-500' : 'text-muted'"
                    class="w-4 h-4"
                  />
                  <span>
                    {{ p.isMe ? 'You' : p.contact?.name || 'Unknown' }}
                    <span v-if="p.isRequester" class="text-xs text-muted"
                      >(requester)</span
                    >
                  </span>
                </div>
                <UBadge
                  :color="p.isOnline ? 'green' : 'neutral'"
                  variant="subtle"
                  size="xs"
                >
                  {{ p.isOnline ? 'Online' : 'Offline' }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Warning -->
          <UAlert color="warning" icon="i-lucide-alert-triangle">
            <template #description>
              By approving, you agree to sign this transaction. This action
              cannot be undone once the transaction is broadcast.
            </template>
          </UAlert>
        </div>

        <template #footer>
          <div class="flex gap-3">
            <UButton
              class="flex-1"
              variant="outline"
              color="red"
              @click="handleReject"
            >
              Reject
            </UButton>
            <UButton
              class="flex-1"
              color="primary"
              :loading="approving"
              @click="handleApprove"
            >
              Approve & Sign
            </UButton>
          </div>
        </template>
      </UCard>

      <!-- Reject confirmation -->
      <UCard v-else-if="showRejectConfirm">
        <template #header>
          <span class="font-semibold">Reject Signing Request?</span>
        </template>

        <div class="space-y-4">
          <p>Are you sure you want to reject this request?</p>

          <div class="text-sm">
            <p>
              <span class="text-muted">Transaction:</span>
              {{ formatXPI(txDetails.amount) }} to
              {{ txDetails.recipientContact?.name || 'Unknown' }}
            </p>
            <p>
              <span class="text-muted">Requested by:</span>
              {{ requester?.name || 'Unknown' }}
            </p>
          </div>

          <UFormField label="Reason (optional)">
            <UTextarea
              v-model="rejectReason"
              placeholder="Why are you rejecting this request?"
              :rows="2"
            />
          </UFormField>

          <p class="text-sm text-muted">
            {{ requester?.name || 'The requester' }} will be notified of your
            rejection.
          </p>
        </div>

        <template #footer>
          <div class="flex gap-3">
            <UButton class="flex-1" variant="outline" @click="cancelReject">
              Cancel
            </UButton>
            <UButton class="flex-1" color="red" @click="confirmReject">
              Reject Request
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
```

---

## Integration Points

### P2P Page Integration

Add incoming requests section to the P2P page:

```vue
<!-- In pages/people/p2p.vue -->
<template>
  <div class="space-y-6">
    <!-- Incoming Requests (Prominent) -->
    <UCard v-if="pendingSessions.length > 0">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-bell" class="w-5 h-5 text-warning" />
          <span class="font-semibold">Incoming Signing Requests</span>
          <UBadge color="warning">{{ pendingSessions.length }}</UBadge>
        </div>
      </template>

      <div class="space-y-3">
        <Musig2IncomingRequestCard
          v-for="session in pendingSessions"
          :key="session.id"
          :session="session"
          @view-details="openRequestDetail(session)"
          @approve="approveRequest(session)"
          @reject="rejectRequest(session)"
        />
      </div>
    </UCard>

    <!-- Rest of P2P page... -->
  </div>
</template>

<script setup lang="ts">
const musig2Store = useMuSig2Store()

const pendingSessions = computed(() =>
  musig2Store.activeSessions.filter(
    s => s.state === 'created' && !s.isInitiator,
  ),
)

const selectedSession = ref(null)
const showDetailModal = ref(false)

function openRequestDetail(session) {
  selectedSession.value = session
  showDetailModal.value = true
}

async function approveRequest(session) {
  // Join the session and start signing
  await musig2Store.joinSession(session.id)
}

async function rejectRequest(session, reason?: string) {
  await musig2Store.abortSession(session.id, reason || 'Rejected by user')
}
</script>
```

### Notification on Request Received

```typescript
// In stores/musig2.ts - Event handler
function handleSessionDiscovered(session: WalletSigningSession) {
  // Add to active sessions
  activeSessions.value.push(session)

  // Show notification
  const { warning } = useNotifications()
  warning('Signing Request', `Someone wants you to co-sign a transaction`, {
    actions: [
      {
        label: 'View',
        click: () => navigateTo('/people/p2p'),
      },
    ],
  })
}
```

---

## Implementation Checklist

### Components

- [ ] `IncomingRequestCard.vue` - Compact request display
- [ ] `RequestDetailModal.vue` - Full request details
- [ ] Reject confirmation dialog

### Integration

- [ ] Add requests section to P2P page
- [ ] Add requests badge to navigation
- [ ] Show notification on new request
- [ ] Handle approve action (join session)
- [ ] Handle reject action (abort session)

### Session Handling

- [ ] Join session on approve
- [ ] Share nonce automatically
- [ ] Share partial signature
- [ ] Show signing progress
- [ ] Handle completion/failure

---

## Files to Create/Modify

| File                                        | Action | Description                   |
| ------------------------------------------- | ------ | ----------------------------- |
| `components/musig2/IncomingRequestCard.vue` | Create | Compact request card          |
| `components/musig2/RequestDetailModal.vue`  | Create | Full request detail modal     |
| `pages/people/p2p.vue`                      | Modify | Add incoming requests section |
| `stores/musig2.ts`                          | Modify | Add notification on request   |

---

_Next: [08_SESSION_MANAGEMENT.md](./08_SESSION_MANAGEMENT.md)_
