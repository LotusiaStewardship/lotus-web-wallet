<script setup lang="ts">
/**
 * IncomingSigningRequest Component
 *
 * Displays an incoming MuSig2 signing request notification.
 * Allows the signer to accept or reject the request.
 */

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

export interface IncomingRequest {
  id: string
  requesterPeerId: string
  requesterNickname?: string
  transactionType: TransactionTypeValue
  amount: number
  purpose?: string
  fee?: number
  timestamp: number
}

const props = defineProps<{
  request: IncomingRequest
  /** Whether to show in compact mode (for notifications) */
  compact?: boolean
}>()

const emit = defineEmits<{
  accept: [request: IncomingRequest]
  reject: [request: IncomingRequest]
  details: [request: IncomingRequest]
}>()

const toast = useToast()

// ============================================================================
// State
// ============================================================================

const processing = ref(false)

// ============================================================================
// Computed
// ============================================================================

const displayName = computed(() => {
  return props.request.requesterNickname || 'Anonymous'
})

const formattedAmount = computed(() => {
  return `${props.request.amount.toLocaleString()} XPI`
})

const formattedTime = computed(() => {
  const now = Date.now()
  const diff = now - props.request.timestamp

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(props.request.timestamp).toLocaleDateString()
})

const txTypeLabel = computed(() => {
  const type = props.request.transactionType
  return type.charAt(0).toUpperCase() + type.slice(1)
})

const txTypeIcon = computed(() => {
  switch (props.request.transactionType) {
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
})

// ============================================================================
// Actions
// ============================================================================

const accept = async () => {
  if (processing.value) return
  processing.value = true

  try {
    // TODO: Implement actual signing acceptance via P2P store
    emit('accept', props.request)

    toast.add({
      title: 'Request Accepted',
      description: 'Starting signing session...',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (err) {
    toast.add({
      title: 'Failed',
      description: err instanceof Error ? err.message : 'Failed to accept request',
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  } finally {
    processing.value = false
  }
}

const reject = async () => {
  if (processing.value) return
  processing.value = true

  try {
    // TODO: Implement actual rejection via P2P store
    emit('reject', props.request)

    toast.add({
      title: 'Request Rejected',
      description: 'The requester has been notified',
      color: 'neutral',
      icon: 'i-lucide-x',
    })
  } catch (err) {
    toast.add({
      title: 'Failed',
      description: err instanceof Error ? err.message : 'Failed to reject request',
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  } finally {
    processing.value = false
  }
}

const viewDetails = () => {
  emit('details', props.request)
}
</script>

<template>
  <!-- Compact Mode (for notification toasts) -->
  <div v-if="compact"
    class="flex items-center gap-3 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-800">
    <div
      class="w-8 h-8 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center flex-shrink-0">
      <UIcon name="i-lucide-pen-tool" class="w-4 h-4 text-warning-500" />
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium truncate">
        {{ displayName }} wants you to sign
      </p>
      <p class="text-xs text-muted">
        {{ txTypeLabel }} • {{ formattedAmount }}
      </p>
    </div>
    <div class="flex gap-1 flex-shrink-0">
      <UButton color="success" size="xs" icon="i-lucide-check" :loading="processing" @click="accept" />
      <UButton color="error" variant="outline" size="xs" icon="i-lucide-x" :loading="processing" @click="reject" />
    </div>
  </div>

  <!-- Full Mode (for dedicated view) -->
  <UCard v-else class="border-2 border-warning-500">
    <div class="flex items-start gap-4">
      <!-- Icon -->
      <div
        class="w-12 h-12 rounded-full bg-warning-100 dark:bg-warning-900/20 flex items-center justify-center flex-shrink-0">
        <UIcon name="i-lucide-pen-tool" class="w-6 h-6 text-warning-500" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <p class="font-semibold">Signing Request</p>
          <UBadge color="warning" variant="subtle" size="xs">
            {{ formattedTime }}
          </UBadge>
        </div>
        <p class="text-sm text-muted mb-3">
          <strong>{{ displayName }}</strong> wants you to sign a transaction
        </p>

        <!-- Request Details -->
        <div class="space-y-2 text-sm bg-muted/50 rounded-lg p-3 mb-4">
          <div class="flex items-center justify-between">
            <span class="text-muted flex items-center gap-1">
              <UIcon :name="txTypeIcon" class="w-4 h-4" />
              Type
            </span>
            <span class="font-medium">{{ txTypeLabel }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted flex items-center gap-1">
              <UIcon name="i-lucide-coins" class="w-4 h-4" />
              Amount
            </span>
            <span class="font-medium">{{ formattedAmount }}</span>
          </div>
          <div v-if="request.fee" class="flex items-center justify-between">
            <span class="text-muted flex items-center gap-1">
              <UIcon name="i-lucide-receipt" class="w-4 h-4" />
              Your Fee
            </span>
            <span class="font-medium text-success-500">{{ request.fee }} XPI</span>
          </div>
          <div v-if="request.purpose" class="pt-2 border-t border-default">
            <p class="text-muted text-xs mb-1">Purpose</p>
            <p class="text-sm">{{ request.purpose }}</p>
          </div>
        </div>

        <!-- Requester Info -->
        <div class="flex items-center gap-2 text-xs text-muted mb-4">
          <UIcon name="i-lucide-fingerprint" class="w-3 h-3" />
          <code class="truncate">{{ request.requesterPeerId.slice(0, 24) }}...</code>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <UButton color="success" :loading="processing" icon="i-lucide-check" @click="accept">
            Accept & Sign
          </UButton>
          <UButton color="error" variant="outline" :loading="processing" icon="i-lucide-x" @click="reject">
            Reject
          </UButton>
          <UButton color="neutral" variant="ghost" icon="i-lucide-info" @click="viewDetails">
            Details
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
