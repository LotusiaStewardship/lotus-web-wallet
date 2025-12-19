<script setup lang="ts">
/**
 * RequestDetailModal
 *
 * Modal for reviewing incoming signing request details.
 * Shows transaction preview, requester info, and accept/reject actions.
 */
import { useContactsStore } from '~/stores/contacts'
import { useMuSig2Store } from '~/stores/musig2'

interface SigningRequest {
  id: string
  sessionId?: string
  fromPeerId: string
  fromNickname?: string
  fromAddress?: string
  toAddress?: string
  walletId?: string
  amount?: string | bigint
  fee?: string | bigint
  message?: string
  transactionType?: string
  timestamp: number
  expiresAt?: number
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
}

const props = defineProps<{
  /** The request to display */
  request: SigningRequest | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  accept: [request: SigningRequest]
  reject: [request: SigningRequest]
}>()

const contactsStore = useContactsStore()
const musig2Store = useMuSig2Store()
const { formatXPI } = useAmount()
const { timeAgo, formatDateTime } = useTime()

// Requester contact lookup
const requesterContact = computed(() => {
  if (!props.request?.fromPeerId) return null
  return contactsStore.contacts.find(c => c.peerId === props.request?.fromPeerId)
})

// Recipient contact lookup
const recipientContact = computed(() => {
  if (!props.request?.toAddress) return null
  return contactsStore.contacts.find(c => c.address === props.request?.toAddress)
})

// Shared wallet (if applicable)
const sharedWallet = computed(() => {
  if (!props.request?.walletId) return null
  return musig2Store.sharedWallets.find(w => w.id === props.request?.walletId)
})

// Expiration countdown
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

// Processing state
const isProcessing = ref(false)

async function handleAccept() {
  if (!props.request || isExpired.value || isProcessing.value) return
  isProcessing.value = true
  try {
    emit('accept', props.request)
    open.value = false
  } finally {
    isProcessing.value = false
  }
}

async function handleReject() {
  if (!props.request || isProcessing.value) return
  isProcessing.value = true
  try {
    emit('reject', props.request)
    open.value = false
  } finally {
    isProcessing.value = false
  }
}

// Format amount
const formattedAmount = computed(() => {
  if (!props.request?.amount) return null
  const amount = typeof props.request.amount === 'string'
    ? BigInt(props.request.amount)
    : props.request.amount
  return formatXPI(amount)
})

const formattedFee = computed(() => {
  if (!props.request?.fee) return null
  const fee = typeof props.request.fee === 'string'
    ? BigInt(props.request.fee)
    : props.request.fee
  return formatXPI(fee)
})
</script>

<template>
  <UModal v-model:open="open">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full flex items-center justify-center"
          :class="isExpired ? 'bg-error-100 dark:bg-error-900/30' : 'bg-warning-100 dark:bg-warning-900/30'">
          <UIcon :name="isExpired ? 'i-lucide-clock' : 'i-lucide-bell'" class="w-5 h-5"
            :class="isExpired ? 'text-error' : 'text-warning'" />
        </div>
        <div>
          <h3 class="font-semibold">Signing Request</h3>
          <p v-if="request" class="text-sm text-muted">
            {{ timeAgo(request.timestamp) }}
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div v-if="request" class="space-y-4">
        <!-- Expired Warning -->
        <UAlert v-if="isExpired" color="error" icon="i-lucide-alert-circle">
          <template #title>Request Expired</template>
          <template #description>
            This signing request has expired and can no longer be accepted.
          </template>
        </UAlert>

        <!-- Requester Info -->
        <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <CommonAvatar :name="requesterContact?.name || request.fromNickname || 'Unknown'" size="md" />
          <div class="flex-1 min-w-0">
            <p class="font-medium">
              {{ requesterContact?.name || request.fromNickname || 'Unknown' }}
            </p>
            <p class="text-sm text-muted">
              is requesting your signature
            </p>
          </div>
        </div>

        <!-- Transaction Details -->
        <div class="space-y-3">
          <!-- From -->
          <div v-if="sharedWallet" class="flex justify-between items-center">
            <span class="text-sm text-muted">From Wallet</span>
            <span class="font-medium">{{ sharedWallet.name }}</span>
          </div>

          <!-- To -->
          <div v-if="request.toAddress" class="flex justify-between items-start">
            <span class="text-sm text-muted">To</span>
            <div class="text-right">
              <p v-if="recipientContact" class="font-medium">{{ recipientContact.name }}</p>
              <p class="text-xs font-mono text-muted truncate max-w-[200px]">
                {{ request.toAddress }}
              </p>
            </div>
          </div>

          <!-- Amount -->
          <div v-if="formattedAmount" class="flex justify-between items-center">
            <span class="text-sm text-muted">Amount</span>
            <span class="font-semibold text-lg">{{ formattedAmount }}</span>
          </div>

          <!-- Fee -->
          <div v-if="formattedFee" class="flex justify-between items-center">
            <span class="text-sm text-muted">Network Fee</span>
            <span class="text-sm">{{ formattedFee }}</span>
          </div>

          <!-- Transaction Type -->
          <div v-if="request.transactionType" class="flex justify-between items-center">
            <span class="text-sm text-muted">Type</span>
            <UBadge color="primary" variant="subtle" size="sm">
              {{ request.transactionType }}
            </UBadge>
          </div>

          <!-- Purpose/Message -->
          <div v-if="request.message" class="pt-2 border-t border-default">
            <p class="text-sm text-muted mb-1">Purpose</p>
            <p class="text-sm">{{ request.message }}</p>
          </div>
        </div>

        <!-- Expiration -->
        <div v-if="expiresIn && !isExpired" class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-timer" class="w-4 h-4" />
          <span>Expires in {{ expiresIn }}</span>
        </div>

        <!-- Timestamp -->
        <div v-if="request.timestamp" class="flex items-center gap-2 text-xs text-muted">
          <UIcon name="i-lucide-calendar" class="w-3 h-3" />
          <span>Requested {{ formatDateTime(request.timestamp) }}</span>
        </div>

        <!-- Warning -->
        <UAlert v-if="!isExpired" color="warning" icon="i-lucide-alert-triangle">
          <template #description>
            By accepting, you authorize this transaction. Only sign requests from
            people you trust. This action cannot be undone once broadcast.
          </template>
        </UAlert>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3">
        <UButton class="flex-1" color="error" variant="soft" :disabled="isProcessing" @click="handleReject">
          <UIcon name="i-lucide-x" class="w-4 h-4 mr-1" />
          Reject
        </UButton>
        <UButton class="flex-1" color="success" :disabled="isExpired || isProcessing" :loading="isProcessing"
          @click="handleAccept">
          <UIcon name="i-lucide-check" class="w-4 h-4 mr-1" />
          Accept & Sign
        </UButton>
      </div>
    </template>
  </UModal>
</template>
