<script setup lang="ts">
/**
 * ProposeSpendModal
 *
 * Modal for proposing a spend from a shared wallet.
 * Features a multi-step wizard: Details → Preview → Progress
 */
import { useContactsStore } from '~/stores/contacts'
import { useMuSig2Store } from '~/stores/musig2'
import { useP2PStore } from '~/stores/p2p'
import { useNotificationStore } from '~/stores/notifications'

const props = defineProps<{
  /** Whether modal is open */
  open: boolean
  /** Wallet to spend from */
  wallet: {
    id: string
    name: string
    sharedAddress?: string
    participants: Array<{
      peerId: string
      publicKeyHex: string
      nickname?: string
      isMe: boolean
    }>
    balanceSats: string
  } | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  propose: [proposal: {
    recipient: string
    amount: bigint
    purpose?: string
  }]
  proposed: [sessionId: string]
}>()

const contactsStore = useContactsStore()
const musig2Store = useMuSig2Store()
const p2pStore = useP2PStore()
const notificationStore = useNotificationStore()
const toast = useToast()
const { formatXPI, xpiToSats, satsToXPI } = useAmount()
const { isValidAddress } = useAddress()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

// Wizard step
const step = ref<'details' | 'preview' | 'progress'>('details')

// Form state
const recipient = ref('')
const amountInput = ref('')
const purpose = ref('')
const isSubmitting = ref(false)
const sessionId = ref<string | null>(null)

// Convert wallet balance to bigint
const walletBalance = computed(() => {
  if (!props.wallet) return 0n
  return BigInt(props.wallet.balanceSats)
})

// Threshold is participants.length for n-of-n MuSig2
const threshold = computed(() => props.wallet?.participants.length ?? 0)

// Convert amount input to satoshis
const amountSats = computed(() => {
  if (!amountInput.value) return 0n
  try {
    return xpiToSats(amountInput.value)
  } catch {
    return 0n
  }
})

// Estimated fee (simplified)
const estimatedFee = computed(() => 1000n) // 0.00001 XPI

// Total including fee
const total = computed(() => amountSats.value + estimatedFee.value)

// Find contact for recipient
const recipientContact = computed(() =>
  contactsStore.contacts.find(c => c.address === recipient.value),
)

// Validation
const recipientError = computed(() => {
  if (!recipient.value) return null
  if (!isValidAddress(recipient.value)) return 'Invalid address'
  return null
})

const amountError = computed(() => {
  if (!amountInput.value) return null
  if (amountSats.value <= 0n) return 'Amount must be greater than 0'
  if (total.value > walletBalance.value) return 'Insufficient balance'
  return null
})

const canProceed = computed(() => {
  if (!props.wallet) return false
  if (!recipient.value || recipientError.value) return false
  if (amountSats.value <= 0n || amountError.value) return false
  return true
})

// Get current session for progress display
const currentSession = computed(() => {
  if (!sessionId.value) return null
  return musig2Store.activeSessions.find(s => s.id === sessionId.value)
})

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

/**
 * Phase 9.7.1: Submit proposal via store
 * Creates actual MuSig2 signing session
 */
async function submitProposal() {
  if (!canProceed.value || !props.wallet) return

  isSubmitting.value = true
  try {
    // Create actual MuSig2 signing session via store
    const result = await musig2Store.proposeSpend({
      walletId: props.wallet.id,
      recipient: recipient.value,
      amount: amountSats.value,
      fee: estimatedFee.value,
      purpose: purpose.value.trim() || undefined,
    })

    // Store the session ID for progress tracking
    sessionId.value = result.sessionId

    // Move to progress step
    step.value = 'progress'

    toast.add({
      title: 'Proposal Sent',
      description: 'Waiting for other participants to approve',
      color: 'success',
      icon: 'i-lucide-check',
    })

    // Emit event for parent component
    emit('proposed', result.sessionId)
  } catch (err) {
    toast.add({
      title: 'Proposal Failed',
      description: err instanceof Error ? err.message : 'Failed to propose spend',
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  } finally {
    isSubmitting.value = false
  }
}

function setMaxAmount() {
  if (!props.wallet) return
  const maxAmount = walletBalance.value - estimatedFee.value
  if (maxAmount > 0n) {
    amountInput.value = satsToXPI(maxAmount).toString()
  }
}

function resetForm() {
  step.value = 'details'
  recipient.value = ''
  amountInput.value = ''
  purpose.value = ''
  sessionId.value = null
  isSubmitting.value = false
}

function handleClose() {
  isOpen.value = false
}

// Abort session handler
async function handleAbortSession() {
  if (sessionId.value) {
    await musig2Store.abortSession(sessionId.value, 'User cancelled')
  }
  handleClose()
}

// Reset on close
watch(isOpen, open => {
  if (!open) {
    resetForm()
  }
})
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <UIcon name="i-lucide-send" class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 class="font-semibold">Propose Spend</h3>
          <p class="text-sm text-muted">{{ wallet?.name }}</p>
        </div>
      </div>
    </template>

    <template #body>
      <div v-if="wallet" class="space-y-4">
        <!-- Step 1: Details -->
        <template v-if="step === 'details'">
          <!-- Balance -->
          <div class="p-3 bg-muted/30 rounded-lg flex justify-between items-center">
            <span class="text-sm text-muted">Available Balance</span>
            <span class="font-semibold">{{ formatXPI(walletBalance) }}</span>
          </div>

          <!-- Recipient -->
          <UFormField label="Recipient" :error="recipientError || undefined" required>
            <UInput v-model="recipient" placeholder="lotus_..." :color="recipientError ? 'error' : undefined" />
            <template v-if="recipientContact" #help>
              <span class="text-primary">{{ recipientContact.name }}</span>
            </template>
          </UFormField>

          <!-- Amount -->
          <UFormField label="Amount" :error="amountError || undefined" required>
            <UInput v-model="amountInput" type="number" inputmode="decimal" placeholder="0.00"
              :color="amountError ? 'error' : undefined">
              <template #trailing>
                <div class="flex items-center gap-2">
                  <span class="text-muted">XPI</span>
                  <UButton color="neutral" variant="ghost" size="xs" @click="setMaxAmount">
                    Max
                  </UButton>
                </div>
              </template>
            </UInput>
          </UFormField>

          <!-- Purpose -->
          <UFormField label="Purpose" hint="Optional - helps participants understand the transaction">
            <UTextarea v-model="purpose" placeholder="What is this payment for?" :rows="2" />
          </UFormField>

          <!-- Threshold Alert -->
          <UAlert color="primary" icon="i-lucide-info">
            <template #description>
              All {{ threshold }} participants must approve this transaction.
            </template>
          </UAlert>
        </template>

        <!-- Step 2: Preview -->
        <template v-else-if="step === 'preview'">
          <!-- Transaction Preview -->
          <Musig2TransactionPreview :transaction="{
            recipient: recipient,
            amount: amountSats,
            fee: estimatedFee,
            purpose: purpose || undefined,
            walletName: wallet.name,
          }" />

          <!-- Participants -->
          <div class="p-3 bg-muted/30 rounded-lg">
            <p class="text-sm font-medium mb-2">Requires approval from:</p>
            <div class="flex flex-wrap gap-2">
              <UBadge v-for="p in wallet.participants" :key="p.publicKeyHex" color="neutral" variant="subtle">
                {{ p.nickname || (p.isMe ? 'You' : 'Participant') }}
                <UIcon v-if="p.isMe" name="i-lucide-check" class="w-3 h-3 ml-1" />
              </UBadge>
            </div>
          </div>

          <!-- Purpose -->
          <div v-if="purpose" class="p-3 bg-muted/30 rounded-lg">
            <p class="text-sm text-muted mb-1">Purpose</p>
            <p class="text-sm">{{ purpose }}</p>
          </div>

          <!-- Warning -->
          <UAlert color="warning" icon="i-lucide-alert-triangle">
            <template #description>
              Once submitted, other participants will be notified and asked to approve.
              The transaction will be broadcast when all signatures are collected.
            </template>
          </UAlert>
        </template>

        <!-- Step 3: Progress -->
        <template v-else-if="step === 'progress'">
          <div v-if="currentSession" class="space-y-4">
            <SharedSigningProgress :participants="wallet.participants.map(p => ({
              publicKey: p.publicKeyHex,
              name: p.nickname || (p.isMe ? 'You' : 'Participant'),
              status: 'pending' as const,
            }))" :current-step="'waiting'" :timeout-at="Date.now() + 300000" @abort="handleAbortSession" />
          </div>
          <div v-else class="text-center py-8">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p class="text-muted">Waiting for participants to respond...</p>
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between">
        <!-- Back button (preview step) -->
        <UButton v-if="step === 'preview'" variant="ghost" @click="goBack">
          Back
        </UButton>
        <div v-else />

        <div class="flex gap-2">
          <!-- Cancel button (details/preview) -->
          <UButton v-if="step !== 'progress'" variant="ghost" @click="handleClose">
            Cancel
          </UButton>

          <!-- Review button (details step) -->
          <UButton v-if="step === 'details'" color="primary" :disabled="!canProceed" @click="goToPreview">
            Review
          </UButton>

          <!-- Submit button (preview step) -->
          <UButton v-else-if="step === 'preview'" color="primary" :loading="isSubmitting" @click="submitProposal">
            Submit Proposal
          </UButton>

          <!-- Done button (progress step) -->
          <UButton v-else color="primary" @click="handleClose">
            Done
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
