# Phase 2: Signing Request Flow

## Overview

This phase implements the complete end-to-end signing request flow, from initiating a request to a signer through to completion. This is the core functionality that makes P2P useful.

**Priority**: P0 (Critical)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 1 Page Structure

---

## Current State

### What Exists

- `SigningRequestModal.vue` - Modal for creating signing requests
- `IncomingRequests.vue` - Display incoming requests
- `IncomingSigningRequest.vue` - Individual request card
- `SigningSessionProgress.vue` - Session progress display
- MuSig2 service with SDK integration

### What's Broken

From `P2P_UX_COMPREHENSIVE_ANALYSIS.md`:

```typescript
// Current implementation in pages/p2p.vue (old)
const handleSigningRequest = (request: SigningRequest) => {
  // TODO: Implement actual signing request via P2P store
  console.log('Signing request submitted:', request)
  toast.add({
    title: 'Request Sent',
    description: `Signing request sent to ${selectedSigner.value?.nickname || 'Anonymous'}`,
    ...
  })
}
```

**Problems**:

- Request is "sent" but nothing actually happens
- No feedback on whether signer received it
- No way to track request status
- No timeout or retry logic

---

## Target Flow

### Outgoing Request Flow

```
User clicks "Request Signature"
         ↓
SigningRequestModal opens
         ↓
User fills in transaction details
         ↓
User clicks "Send Request"
         ↓
Request sent via MuSig2 service
         ↓
Request appears in "My Requests" with "Pending" status
         ↓
Signer accepts/rejects
         ↓
Status updates to "Accepted" or "Rejected"
         ↓
If accepted → Signing session begins
         ↓
Session progress shown in Sessions tab
         ↓
Signature aggregated → Transaction broadcast
         ↓
Success notification
```

### Incoming Request Flow

```
Signing request received via P2P
         ↓
Notification badge appears on Requests tab
         ↓
Request banner appears at top of P2P page
         ↓
User clicks "View Details"
         ↓
RequestDetailModal shows transaction preview
         ↓
User clicks "Accept" or "Reject"
         ↓
If accepted → Signing session begins
         ↓
Session progress shown
         ↓
Partial signature sent to initiator
         ↓
Success notification
```

---

## Implementation

### Task 2.1: Create Request Detail Modal

**File**: `components/p2p/RequestDetailModal.vue`

```vue
<script setup lang="ts">
import type { UISigningRequest } from '~/types/musig2'

const props = defineProps<{
  request: UISigningRequest | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  accept: [request: UISigningRequest]
  reject: [request: UISigningRequest]
}>()

const { formatXPI } = useAmount()

// Transaction preview data
const txPreview = computed(() => {
  if (!props.request) return null
  return {
    to: props.request.toAddress,
    amount: props.request.amount,
    fee: props.request.fee,
    total: props.request.amount + props.request.fee,
    type: props.request.transactionType,
    message: props.request.message,
  }
})

// Time since request
const timeAgo = computed(() => {
  if (!props.request) return ''
  const diff = Date.now() - props.request.timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
})

function handleAccept() {
  if (props.request) {
    emit('accept', props.request)
    open.value = false
  }
}

function handleReject() {
  if (props.request) {
    emit('reject', props.request)
    open.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center"
        >
          <UIcon name="i-lucide-pen-tool" class="w-5 h-5 text-warning-600" />
        </div>
        <div>
          <h3 class="font-semibold">Signing Request</h3>
          <p class="text-sm text-muted">{{ timeAgo }}</p>
        </div>
      </div>
    </template>

    <div v-if="request" class="space-y-6 p-4">
      <!-- From -->
      <div>
        <label class="text-sm font-medium text-muted">From</label>
        <div class="flex items-center gap-2 mt-1">
          <ContactAvatar :name="request.fromNickname" size="sm" />
          <span class="font-medium">{{
            request.fromNickname || 'Anonymous'
          }}</span>
          <span class="text-sm text-muted font-mono">
            {{ request.fromPeerId?.slice(0, 12) }}...
          </span>
        </div>
      </div>

      <!-- Transaction Preview -->
      <UiAppCard title="Transaction Preview" icon="i-lucide-file-text">
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-muted">Type</span>
            <UBadge color="primary" variant="subtle">
              {{ txPreview?.type || 'Spend' }}
            </UBadge>
          </div>

          <div class="flex justify-between">
            <span class="text-muted">To</span>
            <span class="font-mono text-sm truncate max-w-[200px]">
              {{ txPreview?.to }}
            </span>
          </div>

          <div class="flex justify-between">
            <span class="text-muted">Amount</span>
            <span class="font-semibold">{{
              formatXPI(txPreview?.amount || 0)
            }}</span>
          </div>

          <div class="flex justify-between">
            <span class="text-muted">Network Fee</span>
            <span>{{ formatXPI(txPreview?.fee || 0) }}</span>
          </div>

          <div class="border-t pt-3 flex justify-between">
            <span class="font-medium">Total</span>
            <span class="font-bold text-lg">{{
              formatXPI(txPreview?.total || 0)
            }}</span>
          </div>
        </div>
      </UiAppCard>

      <!-- Message -->
      <div v-if="txPreview?.message">
        <label class="text-sm font-medium text-muted">Message</label>
        <p class="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {{ txPreview.message }}
        </p>
      </div>

      <!-- Warning -->
      <UAlert color="warning" icon="i-lucide-alert-triangle" variant="subtle">
        <template #title>Review Carefully</template>
        <template #description>
          By accepting, you authorize this transaction. Only sign requests from
          people you trust.
        </template>
      </UAlert>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton color="error" variant="soft" @click="handleReject">
          <UIcon name="i-lucide-x" class="w-4 h-4 mr-2" />
          Reject
        </UButton>
        <UButton color="success" @click="handleAccept">
          <UIcon name="i-lucide-check" class="w-4 h-4 mr-2" />
          Accept & Sign
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

### Task 2.2: Create Transaction Preview Component

**File**: `components/p2p/TransactionPreview.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  to: string
  amount: number
  fee: number
  type?: string
  inputs?: Array<{ txid: string; vout: number; value: number }>
  outputs?: Array<{ address: string; value: number }>
}>()

const { formatXPI } = useAmount()

const total = computed(() => props.amount + props.fee)

// Truncate address for display
function truncateAddress(addr: string): string {
  if (!addr) return ''
  if (addr.length <= 20) return addr
  return `${addr.slice(0, 12)}...${addr.slice(-8)}`
}
</script>

<template>
  <div class="border rounded-lg overflow-hidden">
    <!-- Header -->
    <div class="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b">
      <div class="flex items-center justify-between">
        <span class="font-medium">Transaction Preview</span>
        <UBadge v-if="type" color="primary" variant="subtle" size="xs">
          {{ type }}
        </UBadge>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4 space-y-4">
      <!-- Simple View -->
      <div v-if="!inputs" class="space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-muted">Recipient</span>
          <span class="font-mono text-sm">{{ truncateAddress(to) }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-muted">Amount</span>
          <span class="font-semibold text-primary">{{
            formatXPI(amount)
          }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-muted">Fee</span>
          <span>{{ formatXPI(fee) }}</span>
        </div>
        <div class="border-t pt-3 flex justify-between items-center">
          <span class="font-medium">Total</span>
          <span class="font-bold text-lg">{{ formatXPI(total) }}</span>
        </div>
      </div>

      <!-- Detailed View (with inputs/outputs) -->
      <template v-else>
        <!-- Inputs -->
        <div>
          <h4 class="text-sm font-medium text-muted mb-2">Inputs</h4>
          <div class="space-y-2">
            <div
              v-for="(input, i) in inputs"
              :key="i"
              class="flex justify-between text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded"
            >
              <span class="font-mono text-xs"
                >{{ input.txid.slice(0, 8) }}...#{{ input.vout }}</span
              >
              <span>{{ formatXPI(input.value) }}</span>
            </div>
          </div>
        </div>

        <!-- Arrow -->
        <div class="flex justify-center">
          <UIcon name="i-lucide-arrow-down" class="w-6 h-6 text-muted" />
        </div>

        <!-- Outputs -->
        <div>
          <h4 class="text-sm font-medium text-muted mb-2">Outputs</h4>
          <div class="space-y-2">
            <div
              v-for="(output, i) in outputs"
              :key="i"
              class="flex justify-between text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded"
            >
              <span class="font-mono text-xs">{{
                truncateAddress(output.address)
              }}</span>
              <span>{{ formatXPI(output.value) }}</span>
            </div>
          </div>
        </div>

        <!-- Fee -->
        <div class="border-t pt-3 flex justify-between items-center text-sm">
          <span class="text-muted">Network Fee</span>
          <span>{{ formatXPI(fee) }}</span>
        </div>
      </template>
    </div>
  </div>
</template>
```

### Task 2.3: Wire Up Signing Request Submission

Update the page to handle signing request submission:

```typescript
// In pages/people/p2p.vue

import { useNotifications } from '~/composables/useNotifications'

const { success, error } = useNotifications()

// Modal state
const signingRequestModalOpen = ref(false)
const selectedSigner = ref<any>(null)
const requestDetailModalOpen = ref(false)
const selectedRequest = ref<any>(null)

// Open signing request modal
function handleRequestSign(signer: any) {
  selectedSigner.value = signer
  signingRequestModalOpen.value = true
}

// Submit signing request
async function handleSubmitSigningRequest(requestData: any) {
  if (!selectedSigner.value) return

  try {
    await musig2Store.sendSigningRequest(selectedSigner.value.peerId, {
      transactionType: requestData.type,
      amount: requestData.amount,
      toAddress: requestData.toAddress,
      message: requestData.message,
    })

    success(
      'Request Sent',
      `Signing request sent to ${selectedSigner.value.nickname || 'signer'}`,
    )
    signingRequestModalOpen.value = false
    selectedSigner.value = null

    // Switch to requests tab to show pending request
    activeTab.value = 'requests'
  } catch (err) {
    error(
      'Request Failed',
      err instanceof Error ? err.message : 'Failed to send request',
    )
  }
}

// View request details
function handleViewRequestDetails(request: any) {
  selectedRequest.value = request
  requestDetailModalOpen.value = true
}

// Accept request
async function handleAcceptRequest(request: any) {
  try {
    await musig2Store.acceptRequest(request.id)
    success('Request Accepted', 'You have joined the signing session')
    requestDetailModalOpen.value = false

    // Switch to sessions tab
    activeTab.value = 'sessions'
  } catch (err) {
    error(
      'Accept Failed',
      err instanceof Error ? err.message : 'Failed to accept request',
    )
  }
}

// Reject request
async function handleRejectRequest(request: any) {
  try {
    await musig2Store.rejectRequest(request.id)
    success('Request Rejected', 'The signing request has been declined')
    requestDetailModalOpen.value = false
  } catch (err) {
    error(
      'Reject Failed',
      err instanceof Error ? err.message : 'Failed to reject request',
    )
  }
}
```

### Task 2.4: Update MuSig2 Store Methods

Ensure the MuSig2 store has the required methods:

```typescript
// In stores/musig2.ts

actions: {
  // Send a signing request to a signer
  async sendSigningRequest(peerId: string, data: SigningRequestData) {
    const request = await serviceSendSigningRequest(peerId, data)
    this.outgoingRequests.push({
      id: request.id,
      toPeerId: peerId,
      status: 'pending',
      ...data,
      timestamp: Date.now(),
    })
    return request
  },

  // Accept an incoming signing request
  async acceptRequest(requestId: string) {
    const request = this.incomingRequests.find(r => r.id === requestId)
    if (!request) throw new Error('Request not found')

    await serviceAcceptRequest(requestId)

    // Remove from incoming, session will be created by service
    this.incomingRequests = this.incomingRequests.filter(r => r.id !== requestId)
  },

  // Reject an incoming signing request
  async rejectRequest(requestId: string) {
    await serviceRejectRequest(requestId)
    this.incomingRequests = this.incomingRequests.filter(r => r.id !== requestId)
  },

  // Cancel an outgoing request
  async cancelRequest(requestId: string) {
    await serviceCancelRequest(requestId)
    this.outgoingRequests = this.outgoingRequests.filter(r => r.id !== requestId)
  },
}
```

### Task 2.5: Add Request Status Tracking

Update the `RequestList` component to show request status:

```vue
<!-- In components/p2p/RequestList.vue -->

<script setup lang="ts">
const props = defineProps<{
  incoming: UISigningRequest[]
  outgoing: UISigningRequest[]
}>()

const emit = defineEmits<{
  accept: [request: UISigningRequest]
  reject: [request: UISigningRequest]
  cancel: [request: UISigningRequest]
  viewDetails: [request: UISigningRequest]
}>()

// Status colors
const statusColors: Record<string, string> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'error',
  expired: 'neutral',
  signing: 'primary',
}

// Status labels
const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
  signing: 'Signing...',
}
</script>

<template>
  <div class="space-y-6">
    <!-- Incoming Requests -->
    <UiAppCard title="Incoming Requests" icon="i-lucide-inbox">
      <template v-if="incoming.length > 0">
        <div class="divide-y">
          <div
            v-for="request in incoming"
            :key="request.id"
            class="py-4 first:pt-0 last:pb-0"
          >
            <div class="flex items-start gap-4">
              <ContactAvatar :name="request.fromNickname" size="md" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{
                    request.fromNickname || 'Anonymous'
                  }}</span>
                  <UBadge
                    :color="statusColors[request.status]"
                    variant="subtle"
                    size="xs"
                  >
                    {{ statusLabels[request.status] }}
                  </UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  {{ request.transactionType }} •
                  {{ formatXPI(request.amount) }}
                </p>
              </div>
              <div class="flex gap-2">
                <UButton
                  v-if="request.status === 'pending'"
                  color="success"
                  size="sm"
                  @click="emit('accept', request)"
                >
                  Accept
                </UButton>
                <UButton
                  v-if="request.status === 'pending'"
                  color="error"
                  variant="soft"
                  size="sm"
                  @click="emit('reject', request)"
                >
                  Reject
                </UButton>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="emit('viewDetails', request)"
                >
                  Details
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
      <UiAppEmptyState
        v-else
        icon="i-lucide-inbox"
        title="No incoming requests"
        description="Signing requests from other wallets will appear here"
      />
    </UiAppCard>

    <!-- Outgoing Requests -->
    <UiAppCard title="My Requests" icon="i-lucide-send">
      <template v-if="outgoing.length > 0">
        <div class="divide-y">
          <div
            v-for="request in outgoing"
            :key="request.id"
            class="py-4 first:pt-0 last:pb-0"
          >
            <div class="flex items-start gap-4">
              <div
                class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <UIcon name="i-lucide-send" class="w-5 h-5 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium"
                    >To: {{ request.toNickname || 'Signer' }}</span
                  >
                  <UBadge
                    :color="statusColors[request.status]"
                    variant="subtle"
                    size="xs"
                  >
                    {{ statusLabels[request.status] }}
                  </UBadge>
                </div>
                <p class="text-sm text-muted mt-1">
                  {{ request.transactionType }} •
                  {{ formatXPI(request.amount) }}
                </p>
              </div>
              <div class="flex gap-2">
                <UButton
                  v-if="request.status === 'pending'"
                  color="error"
                  variant="soft"
                  size="sm"
                  @click="emit('cancel', request)"
                >
                  Cancel
                </UButton>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="emit('viewDetails', request)"
                >
                  Details
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
      <UiAppEmptyState
        v-else
        icon="i-lucide-send"
        title="No outgoing requests"
        description="Requests you send to signers will appear here"
      />
    </UiAppCard>
  </div>
</template>
```

---

## Checklist

### Components

- [ ] Create `RequestDetailModal.vue`
- [ ] Create `TransactionPreview.vue`
- [ ] Update `RequestList.vue` with status tracking
- [ ] Update `SigningRequestModal.vue` if needed

### Page Integration

- [ ] Add modal state variables
- [ ] Wire up `handleRequestSign` to open modal
- [ ] Wire up `handleSubmitSigningRequest` to service
- [ ] Wire up `handleAcceptRequest` to service
- [ ] Wire up `handleRejectRequest` to service
- [ ] Wire up `handleCancelRequest` to service
- [ ] Add modals to template

### Store Updates

- [ ] Verify `sendSigningRequest` method
- [ ] Verify `acceptRequest` method
- [ ] Verify `rejectRequest` method
- [ ] Verify `cancelRequest` method
- [ ] Add `outgoingRequests` state if missing

### Testing

- [ ] Can open signing request modal
- [ ] Can submit signing request
- [ ] Request appears in outgoing list
- [ ] Incoming requests display correctly
- [ ] Can accept incoming request
- [ ] Can reject incoming request
- [ ] Can cancel outgoing request
- [ ] Status updates correctly

---

_Previous: [01_PAGE_STRUCTURE.md](./01_PAGE_STRUCTURE.md)_
_Next: [03_SESSION_MANAGEMENT.md](./03_SESSION_MANAGEMENT.md)_
