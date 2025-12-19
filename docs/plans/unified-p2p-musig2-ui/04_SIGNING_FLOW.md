# Phase 4: Unified Signing Flow

## Overview

This phase implements the unified signing flow that works for both P2P ad-hoc signing requests and MuSig2 shared wallet spending. The signing flow is the core collaborative feature that ties P2P and MuSig2 together.

**Priority**: P0 (Critical)
**Estimated Effort**: 3-4 days
**Dependencies**: Phase 2 P2P Core, Phase 3 MuSig2 Core

---

## Objectives

1. Implement signing request initiation (from P2P signers and shared wallets)
2. Create incoming request handling with transaction preview
3. Build session management and progress tracking
4. Implement transaction approval and rejection flows

---

## Unified Signing Flow

Both P2P signing requests and shared wallet spending use the same underlying flow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED SIGNING FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ENTRY POINTS                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. P2P Page → Request Signature from Signer                                │
│  2. Shared Wallet → Propose Spend                                           │
│  3. Contact Detail → Request Signature                                      │
│                                                                             │
│  INITIATOR FLOW                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. Fill transaction details (recipient, amount, purpose)                   │
│  2. Review transaction preview                                              │
│  3. Submit request → Creates signing session                                │
│  4. Wait for participants to join                                           │
│  5. Exchange nonces → Exchange partial signatures                           │
│  6. Aggregate and broadcast                                                 │
│                                                                             │
│  PARTICIPANT FLOW                                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│  1. Receive notification of incoming request                                │
│  2. Review transaction preview                                              │
│  3. Accept or Reject                                                        │
│  4. If accepted: Join session → Share nonce → Share partial signature       │
│  5. See completion                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Task 4.1: Propose Spend Modal (Shared Wallets)

Update the spend proposal modal for shared wallets.

### File: `components/musig2/ProposeSpendModal.vue` (update)

```vue
<script setup lang="ts">
import type { SharedWallet } from '~/types/musig2'

const props = defineProps<{
  wallet: SharedWallet
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  proposed: [sessionId: string]
}>()

const contactStore = useContactStore()
const musig2Store = useMuSig2Store()
const { formatXPI, xpiToSats, satsToXPI } = useAmount()
const { isValidAddress, toFingerprint } = useAddress()
const { success, error } = useNotifications()

// Form state
const step = ref<'details' | 'preview' | 'progress'>('details')
const recipient = ref('')
const amountInput = ref('')
const purpose = ref('')
const isSubmitting = ref(false)
const sessionId = ref<string | null>(null)

// Amount in sats
const amountSats = computed(() => {
  const parsed = parseFloat(amountInput.value)
  if (isNaN(parsed) || parsed <= 0) return BigInt(0)
  return xpiToSats(parsed)
})

// Fee estimation (simplified)
const estimatedFee = computed(() => BigInt(1000)) // 0.00001 XPI

// Total
const total = computed(() => amountSats.value + estimatedFee.value)

// Validation
const recipientError = computed(() => {
  if (!recipient.value) return null
  if (!isValidAddress(recipient.value)) return 'Invalid address'
  return null
})

const amountError = computed(() => {
  if (!amountInput.value) return null
  if (amountSats.value <= BigInt(0)) return 'Amount must be greater than 0'
  if (total.value > (props.wallet.balance || BigInt(0)))
    return 'Insufficient balance'
  return null
})

const canProceed = computed(() => {
  return (
    recipient.value &&
    !recipientError.value &&
    amountSats.value > BigInt(0) &&
    !amountError.value
  )
})

// Recipient contact lookup
const recipientContact = computed(() => {
  if (!recipient.value || recipientError.value) return null
  return contactStore.findByAddress?.(recipient.value)
})

// Set max amount
function setMaxAmount() {
  const max = (props.wallet.balance || BigInt(0)) - estimatedFee.value
  if (max > BigInt(0)) {
    amountInput.value = satsToXPI(max).toString()
  }
}

// Navigation
function goToPreview() {
  if (canProceed.value) {
    step.value = 'preview'
  }
}

function goBack() {
  if (step.value === 'preview') {
    step.value = 'details'
  }
}

// Submit proposal
async function submitProposal() {
  if (!canProceed.value) return

  isSubmitting.value = true
  try {
    const result = await musig2Store.proposeSpend({
      walletId: props.wallet.id,
      recipient: recipient.value,
      amount: amountSats.value,
      fee: estimatedFee.value,
      purpose: purpose.value.trim() || undefined,
    })

    sessionId.value = result.sessionId
    step.value = 'progress'

    success('Proposal Sent', 'Waiting for other participants to approve')
    emit('proposed', result.sessionId)
  } catch (err) {
    error(
      'Proposal Failed',
      err instanceof Error ? err.message : 'Failed to propose spend',
    )
  } finally {
    isSubmitting.value = false
  }
}

// Get session for progress
const currentSession = computed(() => {
  if (!sessionId.value) return null
  return musig2Store.activeSessions?.get(sessionId.value)
})

// Reset on close
watch(open, isOpen => {
  if (!isOpen) {
    step.value = 'details'
    recipient.value = ''
    amountInput.value = ''
    purpose.value = ''
    sessionId.value = null
  }
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-lg' }">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <UIcon name="i-lucide-send" class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 class="font-semibold">Propose Spend</h3>
          <p class="text-sm text-muted-foreground">{{ wallet.name }}</p>
        </div>
      </div>
    </template>

    <div class="p-4">
      <!-- Step 1: Details -->
      <template v-if="step === 'details'">
        <div class="space-y-4">
          <!-- Balance -->
          <div
            class="p-3 bg-muted/30 rounded-lg flex justify-between items-center"
          >
            <span class="text-sm text-muted-foreground">Available Balance</span>
            <span class="font-semibold">{{
              formatXPI(wallet.balance || BigInt(0))
            }}</span>
          </div>

          <!-- Recipient -->
          <UFormField label="Recipient" :error="recipientError" required>
            <UInput
              v-model="recipient"
              placeholder="lotus_..."
              :error="!!recipientError"
            />
            <template v-if="recipientContact" #help>
              <span class="text-primary">{{ recipientContact.name }}</span>
            </template>
          </UFormField>

          <!-- Amount -->
          <UFormField label="Amount" :error="amountError" required>
            <UInput
              v-model="amountInput"
              type="number"
              placeholder="0.00"
              :error="!!amountError"
            >
              <template #trailing>
                <div class="flex items-center gap-2">
                  <span class="text-muted-foreground">XPI</span>
                  <UButton size="xs" variant="ghost" @click="setMaxAmount"
                    >Max</UButton
                  >
                </div>
              </template>
            </UInput>
          </UFormField>

          <!-- Purpose -->
          <UFormField
            label="Purpose"
            hint="Optional - helps participants understand the transaction"
          >
            <UTextarea
              v-model="purpose"
              placeholder="What is this payment for?"
              :rows="2"
            />
          </UFormField>

          <!-- Threshold warning -->
          <UAlert color="primary" icon="i-lucide-info">
            <template #description>
              All {{ wallet.participants.length }} participants must approve
              this transaction.
            </template>
          </UAlert>
        </div>
      </template>

      <!-- Step 2: Preview -->
      <template v-else-if="step === 'preview'">
        <div class="space-y-4">
          <SharedTransactionPreview
            :from="wallet.sharedAddress"
            :from-label="wallet.name"
            :to="recipient"
            :to-label="recipientContact?.name"
            :amount="amountSats"
            :fee="estimatedFee"
            :purpose="purpose"
          />

          <!-- Participants -->
          <div class="p-3 bg-muted/30 rounded-lg">
            <p class="text-sm font-medium mb-2">Requires approval from:</p>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="p in wallet.participants"
                :key="p.publicKeyHex"
                color="neutral"
                variant="subtle"
              >
                {{
                  contactStore.findByPublicKey(p.publicKeyHex)?.name ||
                  'Unknown'
                }}
              </UBadge>
            </div>
          </div>

          <UAlert color="warning" icon="i-lucide-alert-triangle">
            <template #description>
              Once submitted, other participants will be notified and asked to
              approve. The transaction will be broadcast when all signatures are
              collected.
            </template>
          </UAlert>
        </div>
      </template>

      <!-- Step 3: Progress -->
      <template v-else-if="step === 'progress' && currentSession">
        <SharedSigningProgress
          :state="currentSession.state"
          :participants="
            wallet.participants.map(p => ({
              id: p.peerId,
              name:
                contactStore.findByPublicKey(p.publicKeyHex)?.name || 'Unknown',
              isMe: p.publicKeyHex === walletStore.publicKey,
              hasNonce: currentSession.participants.find(
                sp => sp.peerId === p.peerId,
              )?.hasNonce,
              hasSignature: currentSession.participants.find(
                sp => sp.peerId === p.peerId,
              )?.hasSignature,
              isOnline: p2pStore.isPeerOnline?.(p.peerId) ?? false,
            }))
          "
          :can-abort="true"
          @abort="musig2Store.abortSession(sessionId!)"
        />
      </template>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <UButton v-if="step === 'preview'" variant="ghost" @click="goBack">
          Back
        </UButton>
        <div v-else />

        <div class="flex gap-2">
          <UButton
            v-if="step !== 'progress'"
            variant="ghost"
            @click="open = false"
          >
            Cancel
          </UButton>

          <UButton
            v-if="step === 'details'"
            color="primary"
            :disabled="!canProceed"
            @click="goToPreview"
          >
            Review
          </UButton>

          <UButton
            v-else-if="step === 'preview'"
            color="primary"
            :loading="isSubmitting"
            @click="submitProposal"
          >
            Submit Proposal
          </UButton>

          <UButton v-else color="primary" @click="open = false"> Done </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
```

---

## Task 4.2: Request Detail Modal (Incoming Requests)

Create a unified request detail modal for reviewing incoming signing requests.

### File: `components/p2p/RequestDetailModal.vue`

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

const contactStore = useContactStore()
const musig2Store = useMuSig2Store()
const { formatXPI } = useAmount()
const { timeAgo, formatDateTime } = useTime()
const { toFingerprint } = useAddress()

// Requester info
const requester = computed(() => {
  if (!props.request?.fromPeerId) return null
  return contactStore.findByPeerId(props.request.fromPeerId)
})

// Recipient info
const recipientContact = computed(() => {
  if (!props.request?.toAddress) return null
  return contactStore.findByAddress?.(props.request.toAddress)
})

// Shared wallet (if applicable)
const sharedWallet = computed(() => {
  if (!props.request?.walletId) return null
  return musig2Store.sharedWallets?.find(w => w.id === props.request?.walletId)
})

// Expiration
const expiresIn = computed(() => {
  if (!props.request?.expiresAt) return null
  const remaining = props.request.expiresAt - Date.now()
  if (remaining <= 0) return 'Expired'
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const isExpired = computed(() => {
  if (!props.request?.expiresAt) return false
  return props.request.expiresAt <= Date.now()
})

// Actions
const isProcessing = ref(false)

async function handleAccept() {
  if (!props.request || isExpired.value) return
  isProcessing.value = true
  try {
    emit('accept', props.request)
    open.value = false
  } finally {
    isProcessing.value = false
  }
}

async function handleReject() {
  if (!props.request) return
  emit('reject', props.request)
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-lg' }">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center"
          :class="isExpired ? 'bg-red-500/10' : 'bg-warning/10'"
        >
          <UIcon
            :name="isExpired ? 'i-lucide-clock' : 'i-lucide-bell'"
            class="w-5 h-5"
            :class="isExpired ? 'text-red-500' : 'text-warning'"
          />
        </div>
        <div>
          <h3 class="font-semibold">Signing Request</h3>
          <p class="text-sm text-muted-foreground">
            {{ request?.timestamp ? timeAgo(request.timestamp) : '' }}
          </p>
        </div>
      </div>
    </template>

    <div v-if="request" class="p-4 space-y-4">
      <!-- Expired Warning -->
      <UAlert v-if="isExpired" color="error" icon="i-lucide-alert-circle">
        <template #title>Request Expired</template>
        <template #description>
          This signing request has expired and can no longer be accepted.
        </template>
      </UAlert>

      <!-- Requester -->
      <div class="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
        <ContactsContactAvatar
          v-if="requester"
          :contact="requester"
          size="md"
        />
        <div
          v-else
          class="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
        >
          <UIcon name="i-lucide-user" class="w-5 h-5" />
        </div>
        <div>
          <p class="font-medium">
            {{ requester?.name || request.fromNickname || 'Unknown' }}
          </p>
          <p class="text-sm text-muted-foreground">
            is requesting your signature
          </p>
        </div>
      </div>

      <!-- Transaction Preview -->
      <SharedTransactionPreview
        :from="sharedWallet?.sharedAddress || request.fromAddress"
        :from-label="sharedWallet?.name"
        :to="request.toAddress || ''"
        :to-label="recipientContact?.name"
        :amount="BigInt(request.amount || 0)"
        :fee="BigInt(request.fee || 1000)"
        :purpose="request.message"
      />

      <!-- Additional Info -->
      <div class="space-y-2 text-sm">
        <div v-if="request.transactionType" class="flex justify-between">
          <span class="text-muted-foreground">Type</span>
          <UBadge color="primary" variant="subtle" size="xs">
            {{ request.transactionType }}
          </UBadge>
        </div>
        <div v-if="expiresIn" class="flex justify-between">
          <span class="text-muted-foreground">Expires in</span>
          <span :class="isExpired && 'text-red-500'">{{ expiresIn }}</span>
        </div>
        <div v-if="request.timestamp" class="flex justify-between">
          <span class="text-muted-foreground">Requested at</span>
          <span>{{ formatDateTime(request.timestamp) }}</span>
        </div>
      </div>

      <!-- Warning -->
      <UAlert v-if="!isExpired" color="warning" icon="i-lucide-alert-triangle">
        <template #description>
          By accepting, you authorize this transaction. Only sign requests from
          people you trust. This action cannot be undone once the transaction is
          broadcast.
        </template>
      </UAlert>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          color="error"
          variant="soft"
          :disabled="isProcessing"
          @click="handleReject"
        >
          <UIcon name="i-lucide-x" class="w-4 h-4 mr-2" />
          Reject
        </UButton>
        <UButton
          color="success"
          :disabled="isExpired || isProcessing"
          :loading="isProcessing"
          @click="handleAccept"
        >
          <UIcon name="i-lucide-check" class="w-4 h-4 mr-2" />
          Accept & Sign
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

---

## Task 4.3: Incoming Request Card

Create a prominent card for displaying incoming requests.

### File: `components/musig2/IncomingRequestCard.vue`

```vue
<script setup lang="ts">
import type { UISigningRequest } from '~/types/musig2'

const props = defineProps<{
  request: UISigningRequest
  compact?: boolean
}>()

const emit = defineEmits<{
  viewDetails: []
  accept: []
  reject: []
}>()

const contactStore = useContactStore()
const musig2Store = useMuSig2Store()
const { formatXPI } = useAmount()
const { timeAgo } = useTime()

// Requester info
const requester = computed(() => {
  if (!props.request.fromPeerId) return null
  return contactStore.findByPeerId(props.request.fromPeerId)
})

// Shared wallet
const sharedWallet = computed(() => {
  if (!props.request.walletId) return null
  return musig2Store.sharedWallets?.find(w => w.id === props.request.walletId)
})

// Expiration
const expiresIn = computed(() => {
  if (!props.request.expiresAt) return null
  const remaining = props.request.expiresAt - Date.now()
  if (remaining <= 0) return 'Expired'
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const isExpired = computed(() => {
  if (!props.request.expiresAt) return false
  return props.request.expiresAt <= Date.now()
})
</script>

<template>
  <UCard
    :class="[
      'border-l-4',
      isExpired ? 'border-l-red-500 opacity-60' : 'border-l-warning',
    ]"
  >
    <div class="flex items-start gap-4">
      <!-- Icon -->
      <div
        class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        :class="isExpired ? 'bg-red-500/10' : 'bg-warning/10'"
      >
        <UIcon
          name="i-lucide-bell"
          class="w-5 h-5"
          :class="isExpired ? 'text-red-500' : 'text-warning'"
        />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <p class="font-medium">Signing Request</p>
          <span class="text-xs text-muted-foreground">
            {{ timeAgo(request.timestamp) }}
          </span>
        </div>

        <p class="text-sm text-muted-foreground mb-2">
          {{ requester?.name || request.fromNickname || 'Someone' }}
          wants you to co-sign a transaction
        </p>

        <div class="text-sm space-y-1">
          <p v-if="sharedWallet">
            <span class="text-muted-foreground">From:</span>
            {{ sharedWallet.name }}
          </p>
          <p v-if="request.amount">
            <span class="text-muted-foreground">Amount:</span>
            {{ formatXPI(BigInt(request.amount)) }}
          </p>
          <p v-if="request.message">
            <span class="text-muted-foreground">Purpose:</span>
            {{ request.message }}
          </p>
        </div>

        <!-- Expiration -->
        <p
          v-if="expiresIn"
          class="text-xs mt-2"
          :class="isExpired ? 'text-red-500' : 'text-muted-foreground'"
        >
          {{ isExpired ? 'Expired' : `Expires in ${expiresIn}` }}
        </p>
      </div>

      <!-- Actions -->
      <div
        v-if="!compact && !isExpired"
        class="flex flex-col gap-2 flex-shrink-0"
      >
        <UButton size="sm" variant="ghost" @click="emit('viewDetails')">
          Details
        </UButton>
        <UButton size="sm" color="success" @click="emit('accept')">
          Accept
        </UButton>
        <UButton
          size="sm"
          variant="outline"
          color="error"
          @click="emit('reject')"
        >
          Reject
        </UButton>
      </div>

      <!-- Compact actions -->
      <div v-else-if="!isExpired" class="flex gap-2 flex-shrink-0">
        <UButton size="xs" color="success" @click="emit('accept')">
          Accept
        </UButton>
        <UButton size="xs" variant="outline" @click="emit('viewDetails')">
          View
        </UButton>
      </div>
    </div>
  </UCard>
</template>
```

---

## Task 4.4: Signing Request Modal (P2P)

Update the signing request modal for P2P ad-hoc requests.

### File: `components/p2p/SigningRequestModal.vue` (update)

```vue
<script setup lang="ts">
import type { DiscoveredSigner } from '~/types/musig2'

const props = defineProps<{
  signer: DiscoveredSigner | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  submit: [data: SigningRequestData]
}>()

interface SigningRequestData {
  transactionType: string
  amount: bigint
  toAddress: string
  message?: string
}

const walletStore = useWalletStore()
const { formatXPI, xpiToSats } = useAmount()
const { isValidAddress } = useAddress()

// Form state
const transactionType = ref('spend')
const recipient = ref('')
const amountInput = ref('')
const message = ref('')

// Transaction types
const transactionTypes = [
  { value: 'spend', label: 'Spend' },
  { value: 'coinjoin', label: 'CoinJoin' },
  { value: 'escrow', label: 'Escrow' },
]

// Amount in sats
const amountSats = computed(() => {
  const parsed = parseFloat(amountInput.value)
  if (isNaN(parsed) || parsed <= 0) return BigInt(0)
  return xpiToSats(parsed)
})

// Validation
const recipientError = computed(() => {
  if (!recipient.value) return null
  if (!isValidAddress(recipient.value)) return 'Invalid address'
  return null
})

const canSubmit = computed(() => {
  return (
    recipient.value && !recipientError.value && amountSats.value > BigInt(0)
  )
})

// Submit
function handleSubmit() {
  if (!canSubmit.value) return

  emit('submit', {
    transactionType: transactionType.value,
    amount: amountSats.value,
    toAddress: recipient.value,
    message: message.value.trim() || undefined,
  })

  open.value = false
}

// Reset on close
watch(open, isOpen => {
  if (!isOpen) {
    transactionType.value = 'spend'
    recipient.value = ''
    amountInput.value = ''
    message.value = ''
  }
})
</script>

<template>
  <UModal v-model:open="open">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <UIcon name="i-lucide-pen-tool" class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 class="font-semibold">Request Signature</h3>
          <p v-if="signer" class="text-sm text-muted-foreground">
            From {{ signer.nickname || 'Anonymous Signer' }}
          </p>
        </div>
      </div>
    </template>

    <div class="p-4 space-y-4">
      <!-- Signer Info -->
      <div
        v-if="signer"
        class="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
      >
        <ContactsContactAvatar :name="signer.nickname" size="sm" />
        <div class="flex-1">
          <p class="font-medium">{{ signer.nickname || 'Anonymous' }}</p>
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <span v-if="signer.fee"
              >Fee: {{ formatXPI(BigInt(signer.fee)) }}</span
            >
            <span v-if="signer.reputation">• ⭐ {{ signer.reputation }}</span>
          </div>
        </div>
        <UBadge color="success" variant="subtle" size="sm">Online</UBadge>
      </div>

      <!-- Transaction Type -->
      <UFormField label="Transaction Type">
        <USelect
          v-model="transactionType"
          :options="transactionTypes"
          option-attribute="label"
          value-attribute="value"
        />
      </UFormField>

      <!-- Recipient -->
      <UFormField label="Recipient Address" :error="recipientError" required>
        <UInput
          v-model="recipient"
          placeholder="lotus_..."
          :error="!!recipientError"
        />
      </UFormField>

      <!-- Amount -->
      <UFormField label="Amount" required>
        <UInput v-model="amountInput" type="number" placeholder="0.00">
          <template #trailing>
            <span class="text-muted-foreground">XPI</span>
          </template>
        </UInput>
      </UFormField>

      <!-- Message -->
      <UFormField label="Message" hint="Optional">
        <UTextarea
          v-model="message"
          placeholder="What is this for?"
          :rows="2"
        />
      </UFormField>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton variant="ghost" @click="open = false">Cancel</UButton>
        <UButton color="primary" :disabled="!canSubmit" @click="handleSubmit">
          Send Request
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

---

## Task 4.5: Request List Component

Update the request list to show both incoming and outgoing requests.

### File: `components/p2p/RequestList.vue` (update)

```vue
<script setup lang="ts">
import type { UISigningRequest } from '~/types/musig2'

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

const { formatXPI } = useAmount()
const { timeAgo } = useTime()
const contactStore = useContactStore()

// Status configuration
const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'warning', label: 'Pending' },
  accepted: { color: 'success', label: 'Accepted' },
  rejected: { color: 'error', label: 'Rejected' },
  expired: { color: 'neutral', label: 'Expired' },
  signing: { color: 'primary', label: 'Signing...' },
  completed: { color: 'success', label: 'Completed' },
}

function getStatusConfig(status: string) {
  return statusConfig[status] || { color: 'neutral', label: status }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Incoming Requests -->
    <AppCard title="Incoming Requests" icon="i-lucide-inbox">
      <template v-if="incoming.length > 0">
        <div class="space-y-3">
          <div
            v-for="request in incoming"
            :key="request.id"
            class="flex items-start gap-4 p-3 bg-muted/30 rounded-lg"
          >
            <ContactsContactAvatar
              :name="
                contactStore.findByPeerId(request.fromPeerId)?.name ||
                request.fromNickname
              "
              size="sm"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium truncate">
                  {{
                    contactStore.findByPeerId(request.fromPeerId)?.name ||
                    request.fromNickname ||
                    'Unknown'
                  }}
                </span>
                <UBadge
                  :color="getStatusConfig(request.status).color"
                  variant="subtle"
                  size="xs"
                >
                  {{ getStatusConfig(request.status).label }}
                </UBadge>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ request.transactionType }} •
                {{ formatXPI(BigInt(request.amount || 0)) }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ timeAgo(request.timestamp) }}
              </p>
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <template v-if="request.status === 'pending'">
                <UButton
                  color="success"
                  size="xs"
                  @click="emit('accept', request)"
                >
                  Accept
                </UButton>
                <UButton
                  color="error"
                  variant="soft"
                  size="xs"
                  @click="emit('reject', request)"
                >
                  Reject
                </UButton>
              </template>
              <UButton
                variant="ghost"
                size="xs"
                @click="emit('viewDetails', request)"
              >
                Details
              </UButton>
            </div>
          </div>
        </div>
      </template>
      <AppEmptyState
        v-else
        icon="i-lucide-inbox"
        title="No incoming requests"
        description="Signing requests from others will appear here"
      />
    </AppCard>

    <!-- Outgoing Requests -->
    <AppCard title="My Requests" icon="i-lucide-send">
      <template v-if="outgoing.length > 0">
        <div class="space-y-3">
          <div
            v-for="request in outgoing"
            :key="request.id"
            class="flex items-start gap-4 p-3 bg-muted/30 rounded-lg"
          >
            <div
              class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <UIcon name="i-lucide-send" class="w-4 h-4 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium truncate">
                  To:
                  {{
                    contactStore.findByPeerId(request.toPeerId)?.name ||
                    request.toNickname ||
                    'Signer'
                  }}
                </span>
                <UBadge
                  :color="getStatusConfig(request.status).color"
                  variant="subtle"
                  size="xs"
                >
                  {{ getStatusConfig(request.status).label }}
                </UBadge>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ request.transactionType }} •
                {{ formatXPI(BigInt(request.amount || 0)) }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ timeAgo(request.timestamp) }}
              </p>
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <UButton
                v-if="request.status === 'pending'"
                color="error"
                variant="soft"
                size="xs"
                @click="emit('cancel', request)"
              >
                Cancel
              </UButton>
              <UButton
                variant="ghost"
                size="xs"
                @click="emit('viewDetails', request)"
              >
                Details
              </UButton>
            </div>
          </div>
        </div>
      </template>
      <AppEmptyState
        v-else
        icon="i-lucide-send"
        title="No outgoing requests"
        description="Requests you send to signers will appear here"
      />
    </AppCard>
  </div>
</template>
```

---

## Task 4.6: MuSig2 Store Updates for Signing

Ensure the store has all required signing methods.

### File: `stores/musig2.ts` (additions)

```typescript
actions: {
  // Propose a spend from shared wallet
  async proposeSpend(params: {
    walletId: string
    recipient: string
    amount: bigint
    fee: bigint
    purpose?: string
  }): Promise<{ sessionId: string }> {
    const wallet = this.sharedWallets.find(w => w.id === params.walletId)
    if (!wallet) throw new Error('Wallet not found')

    const session = await serviceCreateSigningSession({
      walletId: params.walletId,
      participants: wallet.participants.map(p => p.publicKeyHex),
      transaction: {
        recipient: params.recipient,
        amount: params.amount,
        fee: params.fee,
        purpose: params.purpose,
      },
    })

    this.activeSessions.set(session.id, session)
    return { sessionId: session.id }
  },

  // Accept an incoming request
  async acceptRequest(requestId: string) {
    const request = this.incomingRequests.find(r => r.id === requestId)
    if (!request) throw new Error('Request not found')

    await serviceAcceptSigningRequest(requestId)

    // Remove from incoming, session will be tracked separately
    this.incomingRequests = this.incomingRequests.filter(r => r.id !== requestId)
  },

  // Reject an incoming request
  async rejectRequest(requestId: string) {
    await serviceRejectSigningRequest(requestId)
    this.incomingRequests = this.incomingRequests.filter(r => r.id !== requestId)
  },

  // Cancel an outgoing request
  async cancelRequest(requestId: string) {
    await serviceCancelSigningRequest(requestId)
    this.outgoingRequests = this.outgoingRequests.filter(r => r.id !== requestId)
  },

  // Abort a signing session
  async abortSession(sessionId: string, reason?: string) {
    await serviceAbortSession(sessionId, reason)
    this.activeSessions.delete(sessionId)
  },
}
```

---

## Implementation Checklist

### Components

- [ ] Update `ProposeSpendModal.vue` with full flow
- [ ] Create `RequestDetailModal.vue` for incoming requests
- [ ] Create `IncomingRequestCard.vue` for prominent display
- [ ] Update `SigningRequestModal.vue` for P2P requests
- [ ] Update `RequestList.vue` with status tracking

### Store Methods

- [ ] Verify `proposeSpend` action
- [ ] Verify `acceptRequest` action
- [ ] Verify `rejectRequest` action
- [ ] Verify `cancelRequest` action
- [ ] Verify `abortSession` action

### Integration

- [ ] Wire up P2P page request handlers
- [ ] Wire up shared wallet spend handlers
- [ ] Add request notifications
- [ ] Add session progress tracking

### Testing

- [ ] Can propose spend from shared wallet
- [ ] Can view transaction preview
- [ ] Can accept incoming request
- [ ] Can reject incoming request
- [ ] Can cancel outgoing request
- [ ] Session progress updates correctly
- [ ] Notifications appear for new requests

---

## Files to Create/Modify

| File                                        | Action | Description             |
| ------------------------------------------- | ------ | ----------------------- |
| `components/musig2/ProposeSpendModal.vue`   | Modify | Full spend flow         |
| `components/p2p/RequestDetailModal.vue`     | Create | Incoming request detail |
| `components/musig2/IncomingRequestCard.vue` | Create | Prominent request card  |
| `components/p2p/SigningRequestModal.vue`    | Modify | P2P request form        |
| `components/p2p/RequestList.vue`            | Modify | Status tracking         |
| `stores/musig2.ts`                          | Modify | Add signing actions     |

---

_Previous: [03_MUSIG2_CORE.md](./03_MUSIG2_CORE.md)_
_Next: [05_CONTACT_INTEGRATION.md](./05_CONTACT_INTEGRATION.md)_
