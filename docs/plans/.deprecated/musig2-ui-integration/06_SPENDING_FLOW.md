# 06: Spending Flow

## Overview

This document details the flow for spending from a shared wallet. Unlike funding (which is a standard transaction), spending requires coordination with all participants through the MuSig2 signing protocol.

---

## Spending Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SPEND FROM SHARED WALLET FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Spend" on shared wallet
         │
         ▼
┌─────────────────────┐
│ Step 1: Build Tx    │
│ • Enter recipient   │
│ • Enter amount      │
│ • Add purpose/note  │
│ • Review fees       │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 2: Preview     │
│ • Show full tx      │
│ • Show all signers  │
│ • Confirm details   │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 3: Initiate    │
│ Signing Session     │
│ • Create session    │
│ • Notify peers      │
│ • Wait for joins    │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 4: Signing     │
│ Progress            │
│ • Nonce exchange    │
│ • Partial sigs      │
│ • Aggregation       │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Step 5: Broadcast   │
│ • Submit to network │
│ • Show success      │
│ • Update balance    │
└─────────────────────┘
```

---

## Modal Design

### Step 1: Transaction Details

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 Spend from Family Treasury                                    Step 1/2  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Available Balance: 10,000.00 XPI                                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Recipient *                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ lotus_16PSJ...                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  👤 Bob (from contacts)                                                    │
│                                                                             │
│  Amount *                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [1,000.00                                              ] XPI        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Purpose (helps other signers understand)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Birthday gift for Bob                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Network Fee: ~0.001 XPI                                                    │
│  Total: 1,000.001 XPI                                                      │
│  Remaining: 8,999.999 XPI                                                  │
│                                                                             │
│                                              [Cancel]  [Next: Review]       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 2: Review & Confirm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 Spend from Family Treasury                                    Step 2/2  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Review Transaction                                                         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ From: Family Treasury (2-of-2)                                       │   │
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
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⚠️ Required Signatures (2)                                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ☑ You                                                     ● Online   │   │
│  │ ☐ Alice                                                   ● Online   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Alice will be notified and must approve this transaction.                  │
│                                                                             │
│                                    [Back]  [Propose Transaction]            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 3: Signing Progress

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔐 Signing in Progress                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Transaction: 1,000.00 XPI to Bob                                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Progress                                                                   │
│                                                                             │
│  ✅ Session created                                                         │
│  ✅ Waiting for participants (2/2 joined)                                   │
│  🔄 Nonce exchange (1/2 complete)                                          │
│  ⏳ Partial signatures                                                      │
│  ⏳ Signature aggregation                                                   │
│  ⏳ Broadcast                                                               │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Participants                                                               │
│                                                                             │
│  👤 You                                    ✅ Nonce shared                  │
│  👤 Alice                                  🔄 Waiting for nonce...          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⏱️ Session expires in 4:32                                                 │
│                                                                             │
│                                              [Cancel Session]               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Success State

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✅ Transaction Complete!                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────┐                                 │
│                         │       ✓         │                                 │
│                         └─────────────────┘                                 │
│                                                                             │
│                    1,000.00 XPI sent to Bob                                 │
│                    from Family Treasury                                     │
│                                                                             │
│  Transaction ID:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ abc123...def456                                            [Copy]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Signed by: You, Alice                                                     │
│  New balance: 8,999.999 XPI                                                │
│                                                                             │
│                                    [View Transaction]  [Done]               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Implementation

### File: `components/musig2/ProposeSpendModal.vue`

```vue
<script setup lang="ts">
import type { SharedWallet } from '~/types/musig2'

const props = defineProps<{
  wallet: SharedWallet | null
}>()

const open = defineModel<boolean>('open')

const emit = defineEmits<{
  proposed: [sessionId: string]
  completed: [txid: string]
}>()

const musig2Store = useMuSig2Store()
const contactStore = useContactStore()
const p2pStore = useP2PStore()
const { formatXPI, xpiToSats, satsToXpi } = useAmount()
const { isValidAddress } = useAddress()
const { success, error: showError } = useNotifications()

// State
type Step = 'input' | 'review' | 'signing' | 'success' | 'failed'
const currentStep = ref<Step>('input')

// Form state
const recipient = ref('')
const amountInput = ref('')
const purpose = ref('')

// Session state
const sessionId = ref('')
const txid = ref('')
const errorMessage = ref('')

// Computed
const balance = computed(() => BigInt(props.wallet?.balanceSats || '0'))

const amountSats = computed(() => {
  if (!amountInput.value) return 0n
  try {
    return xpiToSats(amountInput.value)
  } catch {
    return 0n
  }
})

const estimatedFeeSats = computed(() => 1000n)
const totalSendSats = computed(() => amountSats.value + estimatedFeeSats.value)
const remainingBalance = computed(() => {
  if (balance.value < totalSendSats.value) return 0n
  return balance.value - totalSendSats.value
})

const recipientContact = computed(() =>
  contactStore.findByAddress(recipient.value),
)

const isValidInput = computed(() => {
  if (!isValidAddress(recipient.value)) return false
  if (amountSats.value <= 0n) return false
  if (totalSendSats.value > balance.value) return false
  return true
})

// Participant status
const participants = computed(() => {
  if (!props.wallet) return []
  return props.wallet.participants.map(p => ({
    ...p,
    isOnline: p.isMe || (p.peerId && p2pStore.isPeerOnline(p.peerId)),
    contact: p.isMe
      ? null
      : contactStore.contactList.find(c => c.publicKey === p.publicKeyHex),
  }))
})

const allParticipantsOnline = computed(() =>
  participants.value.every(p => p.isOnline),
)

const participantCount = computed(() => participants.value.length)

// Current session from store
const currentSession = computed(() => {
  if (!sessionId.value) return null
  return musig2Store.activeSessions.find(s => s.id === sessionId.value)
})

// Actions
function nextStep() {
  if (currentStep.value === 'input' && isValidInput.value) {
    currentStep.value = 'review'
  }
}

function prevStep() {
  if (currentStep.value === 'review') {
    currentStep.value = 'input'
  }
}

async function proposeTransaction() {
  if (!props.wallet || !isValidInput.value) return

  currentStep.value = 'signing'

  try {
    // Create the signing session via the service
    // This will:
    // 1. Build the unsigned transaction
    // 2. Create a MuSig2 session
    // 3. Announce to other participants
    // 4. Start the signing protocol

    // For now, we'll use a simplified flow
    // The actual implementation would use the musig2 service

    const newSessionId = await createSigningSession()
    sessionId.value = newSessionId

    emit('proposed', newSessionId)

    // Watch for session completion
    watchSessionProgress()
  } catch (e) {
    errorMessage.value =
      e instanceof Error ? e.message : 'Failed to create signing session'
    currentStep.value = 'failed'
  }
}

async function createSigningSession(): Promise<string> {
  // This would call the musig2 service to create a session
  // For now, simulate the process

  // In real implementation:
  // 1. Build transaction using shared wallet UTXOs
  // 2. Create session with transaction hash
  // 3. Announce to participants

  return `session_${Date.now()}`
}

function watchSessionProgress() {
  // Watch the session state and update UI accordingly
  const unwatch = watch(
    () => currentSession.value?.state,
    state => {
      if (state === 'completed') {
        // Get txid from session
        txid.value = currentSession.value?.txid || ''
        currentStep.value = 'success'
        success('Transaction Complete', 'Your transaction has been broadcast')
        emit('completed', txid.value)
        unwatch()
      } else if (state === 'failed' || state === 'aborted') {
        errorMessage.value = 'Signing session failed or was cancelled'
        currentStep.value = 'failed'
        unwatch()
      }
    },
    { immediate: true },
  )

  // Cleanup on modal close
  onUnmounted(() => unwatch())
}

async function cancelSession() {
  if (sessionId.value) {
    try {
      await musig2Store.abortSession(sessionId.value, 'Cancelled by user')
    } catch (e) {
      console.error('Failed to cancel session:', e)
    }
  }
  resetForm()
  open.value = false
}

function copyTxid() {
  navigator.clipboard.writeText(txid.value)
  success('Copied', 'Transaction ID copied to clipboard')
}

function viewTransaction() {
  navigateTo(`/explore/explorer/tx/${txid.value}`)
  handleDone()
}

function handleDone() {
  resetForm()
  open.value = false
}

function handleRetry() {
  errorMessage.value = ''
  currentStep.value = 'review'
}

function resetForm() {
  currentStep.value = 'input'
  recipient.value = ''
  amountInput.value = ''
  purpose.value = ''
  sessionId.value = ''
  txid.value = ''
  errorMessage.value = ''
}

// Reset on close
watch(open, isOpen => {
  if (!isOpen) {
    setTimeout(resetForm, 300)
  }
})

// Helper to truncate address
function truncateAddress(addr: string): string {
  if (addr.length <= 20) return addr
  return `${addr.slice(0, 10)}...${addr.slice(-10)}`
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-lg' }">
    <template #content>
      <UCard v-if="wallet">
        <!-- Header -->
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon
                :name="
                  currentStep === 'success'
                    ? 'i-lucide-check-circle'
                    : 'i-lucide-send'
                "
                class="w-5 h-5"
                :class="
                  currentStep === 'success' ? 'text-green-500' : 'text-primary'
                "
              />
              <span class="font-semibold">
                {{
                  currentStep === 'success'
                    ? 'Transaction Complete!'
                    : `Spend from ${wallet.name}`
                }}
              </span>
            </div>
            <span
              v-if="currentStep === 'input' || currentStep === 'review'"
              class="text-sm text-muted"
            >
              Step {{ currentStep === 'input' ? 1 : 2 }}/2
            </span>
          </div>
        </template>

        <!-- Step 1: Input -->
        <div v-if="currentStep === 'input'" class="space-y-4">
          <!-- Balance -->
          <div class="p-3 bg-muted/50 rounded-lg text-center">
            <p class="text-xs text-muted">Available Balance</p>
            <p class="text-xl font-bold">{{ formatXPI(balance) }}</p>
          </div>

          <!-- Recipient -->
          <UFormField label="Recipient" required>
            <UInput v-model="recipient" placeholder="lotus_..." autofocus />
            <div v-if="recipientContact" class="flex items-center gap-2 mt-2">
              <ContactAvatar :contact="recipientContact" size="xs" />
              <span class="text-sm">{{ recipientContact.name }}</span>
            </div>
          </UFormField>

          <!-- Amount -->
          <UFormField
            label="Amount"
            required
            :hint="`Max: ${formatXPI(balance)}`"
          >
            <UInput v-model="amountInput" type="number" placeholder="0.00">
              <template #trailing>
                <span class="text-muted">XPI</span>
              </template>
            </UInput>
          </UFormField>

          <!-- Purpose -->
          <UFormField
            label="Purpose"
            hint="Helps other signers understand the transaction"
          >
            <UTextarea
              v-model="purpose"
              placeholder="What is this payment for?"
              :rows="2"
            />
          </UFormField>

          <!-- Fee breakdown -->
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">Network Fee</span>
              <span>~{{ formatXPI(estimatedFeeSats) }}</span>
            </div>
            <div class="flex justify-between font-medium">
              <span>Total</span>
              <span>{{ formatXPI(totalSendSats) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Remaining</span>
              <span>{{ formatXPI(remainingBalance) }}</span>
            </div>
          </div>

          <!-- Validation errors -->
          <UAlert
            v-if="recipient && !isValidAddress(recipient)"
            color="red"
            icon="i-lucide-alert-circle"
          >
            <template #description>Invalid address format</template>
          </UAlert>

          <UAlert
            v-if="amountSats > 0n && totalSendSats > balance"
            color="red"
            icon="i-lucide-alert-circle"
          >
            <template #description>Insufficient balance</template>
          </UAlert>
        </div>

        <!-- Step 2: Review -->
        <div v-else-if="currentStep === 'review'" class="space-y-4">
          <p class="text-muted">Review Transaction</p>

          <!-- Transaction summary -->
          <UCard>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-muted">From</span>
                <span class="font-medium"
                  >{{ wallet.name }} ({{ participantCount }}-of-{{
                    participantCount
                  }})</span
                >
              </div>
              <div class="flex justify-between items-start">
                <span class="text-muted">To</span>
                <div class="text-right">
                  <p v-if="recipientContact" class="font-medium">
                    {{ recipientContact.name }}
                  </p>
                  <code class="text-xs">{{ truncateAddress(recipient) }}</code>
                </div>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Amount</span>
                <span class="font-medium">{{ formatXPI(amountSats) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Fee</span>
                <span>{{ formatXPI(estimatedFeeSats) }}</span>
              </div>
              <div class="border-t pt-2 flex justify-between font-medium">
                <span>Total</span>
                <span>{{ formatXPI(totalSendSats) }}</span>
              </div>
              <div v-if="purpose" class="border-t pt-2">
                <span class="text-muted">Purpose:</span>
                <p>{{ purpose }}</p>
              </div>
            </div>
          </UCard>

          <!-- Required signatures -->
          <div>
            <p class="text-sm font-medium mb-2 flex items-center gap-2">
              <UIcon name="i-lucide-users" class="w-4 h-4" />
              Required Signatures ({{ participantCount }})
            </p>
            <div class="space-y-2">
              <div
                v-for="p in participants"
                :key="p.publicKeyHex"
                class="flex items-center justify-between p-2 rounded-lg bg-muted/30"
              >
                <div class="flex items-center gap-2">
                  <UCheckbox :model-value="p.isMe" disabled />
                  <span>{{
                    p.isMe ? 'You' : p.contact?.name || 'Unknown'
                  }}</span>
                </div>
                <UBadge
                  :color="p.isOnline ? 'green' : 'red'"
                  variant="subtle"
                  size="xs"
                >
                  {{ p.isOnline ? 'Online' : 'Offline' }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Warning if not all online -->
          <UAlert
            v-if="!allParticipantsOnline"
            color="warning"
            icon="i-lucide-alert-triangle"
          >
            <template #description>
              Not all participants are online. The transaction cannot complete
              until all {{ participantCount }} participants are available to
              sign.
            </template>
          </UAlert>

          <p v-else class="text-sm text-muted">
            All participants will be notified and must approve this transaction.
          </p>
        </div>

        <!-- Step 3: Signing Progress -->
        <div v-else-if="currentStep === 'signing'" class="space-y-4">
          <div class="text-center mb-4">
            <p class="font-medium">
              {{ formatXPI(amountSats) }} to
              {{ recipientContact?.name || truncateAddress(recipient) }}
            </p>
          </div>

          <!-- Progress steps -->
          <Musig2SigningProgress
            v-if="currentSession"
            :session="currentSession"
          />

          <!-- Fallback progress display -->
          <div v-else class="space-y-3">
            <div class="flex items-center gap-3">
              <UIcon
                name="i-lucide-loader-2"
                class="w-5 h-5 animate-spin text-primary"
              />
              <span>Creating signing session...</span>
            </div>
          </div>

          <!-- Participants status -->
          <div class="border-t pt-4">
            <p class="text-sm font-medium mb-2">Participants</p>
            <div class="space-y-2">
              <div
                v-for="p in participants"
                :key="p.publicKeyHex"
                class="flex items-center justify-between text-sm"
              >
                <span>{{ p.isMe ? 'You' : p.contact?.name || 'Unknown' }}</span>
                <span class="text-muted">Waiting...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Success State -->
        <div
          v-else-if="currentStep === 'success'"
          class="space-y-4 text-center"
        >
          <UIcon
            name="i-lucide-check-circle"
            class="w-16 h-16 text-green-500 mx-auto"
          />

          <div>
            <p class="text-xl font-bold">{{ formatXPI(amountSats) }}</p>
            <p class="text-muted">
              sent to {{ recipientContact?.name || truncateAddress(recipient) }}
            </p>
            <p class="text-sm text-muted">from {{ wallet.name }}</p>
          </div>

          <div>
            <p class="text-sm text-muted mb-1">Transaction ID</p>
            <div class="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <code class="text-xs flex-1 truncate">{{ txid }}</code>
              <UButton
                variant="ghost"
                size="xs"
                icon="i-lucide-copy"
                @click="copyTxid"
              />
            </div>
          </div>

          <p class="text-sm">
            Signed by:
            {{
              participants
                .map(p => (p.isMe ? 'You' : p.contact?.name || 'Unknown'))
                .join(', ')
            }}
          </p>

          <p class="text-sm">
            New balance: <strong>{{ formatXPI(remainingBalance) }}</strong>
          </p>
        </div>

        <!-- Failed State -->
        <div v-else-if="currentStep === 'failed'" class="space-y-4 text-center">
          <UIcon
            name="i-lucide-x-circle"
            class="w-16 h-16 text-red-500 mx-auto"
          />

          <div>
            <p class="text-xl font-bold">Transaction Failed</p>
            <p class="text-muted">{{ errorMessage }}</p>
          </div>
        </div>

        <!-- Footer -->
        <template #footer>
          <div class="flex gap-3">
            <!-- Input step -->
            <template v-if="currentStep === 'input'">
              <UButton class="flex-1" variant="outline" @click="open = false">
                Cancel
              </UButton>
              <UButton
                class="flex-1"
                color="primary"
                :disabled="!isValidInput"
                @click="nextStep"
              >
                Next: Review
              </UButton>
            </template>

            <!-- Review step -->
            <template v-else-if="currentStep === 'review'">
              <UButton class="flex-1" variant="outline" @click="prevStep">
                Back
              </UButton>
              <UButton
                class="flex-1"
                color="primary"
                :disabled="!allParticipantsOnline"
                @click="proposeTransaction"
              >
                Propose Transaction
              </UButton>
            </template>

            <!-- Signing step -->
            <template v-else-if="currentStep === 'signing'">
              <UButton variant="outline" color="red" @click="cancelSession">
                Cancel Session
              </UButton>
            </template>

            <!-- Success step -->
            <template v-else-if="currentStep === 'success'">
              <UButton variant="outline" @click="viewTransaction">
                View Transaction
              </UButton>
              <UButton color="primary" @click="handleDone"> Done </UButton>
            </template>

            <!-- Failed step -->
            <template v-else-if="currentStep === 'failed'">
              <UButton variant="outline" @click="handleDone"> Close </UButton>
              <UButton color="primary" @click="handleRetry">
                Try Again
              </UButton>
            </template>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
```

---

## SigningProgress Component

### File: `components/musig2/SigningProgress.vue`

```vue
<script setup lang="ts">
import type { WalletSigningSession } from '~/services/musig2'

const props = defineProps<{
  session: WalletSigningSession
}>()

const emit = defineEmits<{
  cancel: []
}>()

// Progress steps
const steps = computed(() => [
  {
    id: 'created',
    label: 'Session created',
    status: getStepStatus('created'),
  },
  {
    id: 'participants',
    label: `Participants joined (${props.session.participants.length}/${props.session.participants.length})`,
    status: getStepStatus('participants'),
  },
  {
    id: 'nonces',
    label: 'Nonce exchange',
    status: getStepStatus('nonces'),
  },
  {
    id: 'signatures',
    label: 'Partial signatures',
    status: getStepStatus('signatures'),
  },
  {
    id: 'aggregation',
    label: 'Signature aggregation',
    status: getStepStatus('aggregation'),
  },
  {
    id: 'broadcast',
    label: 'Broadcast',
    status: getStepStatus('broadcast'),
  },
])

function getStepStatus(step: string): 'complete' | 'current' | 'pending' {
  const state = props.session.state

  const stateOrder = ['created', 'nonce_exchange', 'signing', 'completed']
  const stepMap: Record<string, string[]> = {
    created: ['created'],
    participants: ['created'],
    nonces: ['nonce_exchange'],
    signatures: ['signing'],
    aggregation: ['signing'],
    broadcast: ['completed'],
  }

  const currentIndex = stateOrder.indexOf(state)
  const stepStates = stepMap[step] || []

  if (state === 'completed' || state === 'failed') {
    return state === 'completed' ? 'complete' : 'pending'
  }

  if (stepStates.includes(state)) {
    return 'current'
  }

  const stepIndex = stateOrder.findIndex(s => stepStates.includes(s))
  return stepIndex < currentIndex ? 'complete' : 'pending'
}

// Expiration countdown
const expiresIn = computed(() => {
  const remaining = props.session.expiresAt - Date.now()
  if (remaining <= 0) return 'Expired'

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})
</script>

<template>
  <div class="space-y-4">
    <!-- Progress steps -->
    <div class="space-y-2">
      <div v-for="step in steps" :key="step.id" class="flex items-center gap-3">
        <!-- Status icon -->
        <div class="flex-shrink-0">
          <UIcon
            v-if="step.status === 'complete'"
            name="i-lucide-check-circle"
            class="w-5 h-5 text-green-500"
          />
          <UIcon
            v-else-if="step.status === 'current'"
            name="i-lucide-loader-2"
            class="w-5 h-5 text-primary animate-spin"
          />
          <UIcon v-else name="i-lucide-circle" class="w-5 h-5 text-muted" />
        </div>

        <!-- Label -->
        <span
          :class="[
            step.status === 'complete' && 'text-green-600 dark:text-green-400',
            step.status === 'current' && 'font-medium',
            step.status === 'pending' && 'text-muted',
          ]"
        >
          {{ step.label }}
        </span>
      </div>
    </div>

    <!-- Expiration timer -->
    <div class="flex items-center justify-between text-sm text-muted">
      <span class="flex items-center gap-1">
        <UIcon name="i-lucide-clock" class="w-4 h-4" />
        Session expires in {{ expiresIn }}
      </span>
    </div>
  </div>
</template>
```

---

## Implementation Checklist

### Modal Steps

- [ ] Step 1: Transaction input (recipient, amount, purpose)
- [ ] Step 2: Review with participant status
- [ ] Step 3: Signing progress display
- [ ] Success state with txid
- [ ] Failed state with retry option

### Validation

- [ ] Valid recipient address
- [ ] Amount within balance
- [ ] All participants online check

### Signing Integration

- [ ] Create signing session via service
- [ ] Watch session progress
- [ ] Handle session completion
- [ ] Handle session failure/timeout
- [ ] Cancel session support

### Progress Display

- [ ] Show signing steps
- [ ] Show participant status
- [ ] Show expiration countdown

---

## Files to Create/Modify

| File                                      | Action | Description        |
| ----------------------------------------- | ------ | ------------------ |
| `components/musig2/ProposeSpendModal.vue` | Modify | Full spending flow |
| `components/musig2/SigningProgress.vue`   | Modify | Progress indicator |

---

_Next: [07_SIGNING_REQUESTS.md](./07_SIGNING_REQUESTS.md)_
