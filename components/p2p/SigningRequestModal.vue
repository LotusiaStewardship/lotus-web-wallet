<script setup lang="ts">
/**
 * SigningRequestModal Component
 *
 * Modal for initiating a MuSig2 signing request with a discovered signer.
 * Allows the user to specify transaction type, amount, and purpose.
 */
import { useP2PStore, type UISignerAdvertisement } from '~/stores/p2p'

// Transaction type constants (matching SDK's TransactionType enum values)
const TransactionType = {
  SPEND: 'spend',
  SWAP: 'swap',
  COINJOIN: 'coinjoin',
  CUSTODY: 'custody',
  ESCROW: 'escrow',
  CHANNEL: 'channel',
} as const

type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType]

const props = defineProps<{
  signer: UISignerAdvertisement
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  submit: [request: SigningRequest]
  cancel: []
}>()

export interface SigningRequest {
  signerId: string
  signerPeerId: string
  transactionType: TransactionTypeValue
  amount: number
  purpose?: string
}

const p2pStore = useP2PStore()
const toast = useToast()

// ============================================================================
// State
// ============================================================================

const requesting = ref(false)
const selectedTxType = ref<TransactionTypeValue | undefined>(undefined)
const amount = ref<number | undefined>(undefined)
const purpose = ref('')

// ============================================================================
// Computed
// ============================================================================

// Filter transaction types to only those the signer supports
const availableTxTypes = computed(() => {
  const signerTypes = props.signer.transactionTypes || []
  return Object.entries(TransactionType)
    .filter(([_, value]) => signerTypes.includes(value))
    .map(([key, value]) => ({
      label: key.charAt(0) + key.slice(1).toLowerCase(),
      value: value as TransactionTypeValue,
      icon: getTxTypeIcon(value),
    }))
})

// Validate form
const canSubmit = computed(() => {
  if (requesting.value) return false
  if (!selectedTxType.value) return false
  if (!amount.value || amount.value <= 0) return false

  // Check amount range if specified
  const min = props.signer.amountRange?.min ?? 0
  const max = props.signer.amountRange?.max ?? Infinity
  if (amount.value < min || amount.value > max) return false

  return true
})

// Amount range hint
const amountHint = computed(() => {
  const min = props.signer.amountRange?.min
  const max = props.signer.amountRange?.max

  if (min && max) return `Range: ${min} - ${max} XPI`
  if (min) return `Minimum: ${min} XPI`
  if (max) return `Maximum: ${max} XPI`
  return 'Any amount'
})

// Display name
const displayName = computed(() => {
  return props.signer.nickname || 'Anonymous'
})

// Fee display
const feeDisplay = computed(() => {
  const fee = props.signer.fee
  return fee ? `${fee} XPI` : 'Free'
})

// ============================================================================
// Helpers
// ============================================================================

function getTxTypeIcon(txType: string): string {
  switch (txType) {
    case TransactionType.SPEND:
      return 'i-lucide-send'
    case TransactionType.SWAP:
      return 'i-lucide-repeat'
    case TransactionType.COINJOIN:
      return 'i-lucide-shuffle'
    case TransactionType.CUSTODY:
      return 'i-lucide-shield'
    case TransactionType.ESCROW:
      return 'i-lucide-lock'
    case TransactionType.CHANNEL:
      return 'i-lucide-git-branch'
    default:
      return 'i-lucide-pen-tool'
  }
}

// ============================================================================
// Actions
// ============================================================================

const sendRequest = async () => {
  if (!canSubmit.value || !selectedTxType.value || !amount.value) return

  requesting.value = true

  try {
    const request: SigningRequest = {
      signerId: props.signer.id,
      signerPeerId: props.signer.peerId,
      transactionType: selectedTxType.value,
      amount: amount.value,
      purpose: purpose.value || undefined,
    }

    // TODO: Implement actual signing request via P2P store
    // For now, emit the request for parent component to handle
    emit('submit', request)

    toast.add({
      title: 'Request Sent',
      description: `Signing request sent to ${displayName.value}`,
      color: 'success',
      icon: 'i-lucide-check',
    })

    // Reset form and close
    resetForm()
    open.value = false
  } catch (err) {
    toast.add({
      title: 'Request Failed',
      description: err instanceof Error ? err.message : 'Failed to send request',
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  } finally {
    requesting.value = false
  }
}

const cancel = () => {
  resetForm()
  emit('cancel')
  open.value = false
}

const resetForm = () => {
  selectedTxType.value = undefined
  amount.value = undefined
  purpose.value = ''
}

// Auto-select first available transaction type
watch(
  () => props.signer,
  () => {
    if (availableTxTypes.value.length > 0 && !selectedTxType.value) {
      selectedTxType.value = availableTxTypes.value[0].value
    }
  },
  { immediate: true },
)
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-pen-tool" class="w-5 h-5 text-success-500" />
              <span class="font-semibold">Request Signature</span>
            </div>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" @click="cancel" />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Signer Info -->
          <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div
              class="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/20 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-user" class="w-6 h-6 text-success-500" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium truncate">{{ displayName }}</p>
              <div class="flex items-center gap-2 text-sm text-muted">
                <span>Fee: {{ feeDisplay }}</span>
                <span v-if="signer.reputation > 0">• ⭐ {{ signer.reputation }}</span>
              </div>
            </div>
          </div>

          <!-- Transaction Type -->
          <UFormField label="Transaction Type" required>
            <USelectMenu v-model="selectedTxType" :items="availableTxTypes" value-key="value" placeholder="Select type"
              class="w-full">
              <template #leading="{ modelValue }">
                <UIcon v-if="modelValue" :name="getTxTypeIcon(modelValue)" class="w-4 h-4" />
              </template>
            </USelectMenu>
          </UFormField>

          <!-- Amount -->
          <UFormField label="Amount (XPI)" required :hint="amountHint">
            <UInput v-model.number="amount" type="number" placeholder="0.00" min="0" step="0.01" class="w-full">
              <template #trailing>
                <span class="text-muted text-sm">XPI</span>
              </template>
            </UInput>
          </UFormField>

          <!-- Purpose -->
          <UFormField label="Purpose" hint="Optional description for the signer">
            <UTextarea v-model="purpose" placeholder="What is this signature for?" :rows="2" class="w-full" />
          </UFormField>

          <!-- Fee Notice -->
          <UAlert v-if="signer.fee" color="info" variant="subtle" icon="i-lucide-info">
            <template #description>
              This signer charges a fee of <strong>{{ signer.fee }} XPI</strong> per signature.
            </template>
          </UAlert>
        </div>

        <template #footer>
          <div class="flex gap-2 justify-end">
            <UButton color="neutral" variant="outline" @click="cancel">
              Cancel
            </UButton>
            <UButton color="success" :loading="requesting" :disabled="!canSubmit" icon="i-lucide-send"
              @click="sendRequest">
              Send Request
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
