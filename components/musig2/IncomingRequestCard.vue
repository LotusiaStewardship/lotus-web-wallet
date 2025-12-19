<script setup lang="ts">
/**
 * IncomingRequestCard
 *
 * Prominent card for displaying incoming signing requests.
 * Used in P2P page and shared wallet detail to highlight pending requests.
 */
import { useContactsStore } from '~/stores/contacts'
import { useMuSig2Store } from '~/stores/musig2'

interface SigningRequest {
  id: string
  fromPeerId: string
  fromNickname?: string
  walletId?: string
  amount?: string | bigint
  message?: string
  transactionType?: string
  timestamp: number
  expiresAt?: number
}

const props = defineProps<{
  /** The request to display */
  request: SigningRequest
  /** Compact mode for inline display */
  compact?: boolean
}>()

const emit = defineEmits<{
  viewDetails: []
  accept: []
  reject: []
}>()

const contactsStore = useContactsStore()
const musig2Store = useMuSig2Store()
const { formatXPI } = useAmount()
const { timeAgo } = useTime()

// Requester contact lookup
const requesterContact = computed(() => {
  if (!props.request.fromPeerId) return null
  return contactsStore.contacts.find(c => c.peerId === props.request.fromPeerId)
})

// Shared wallet lookup
const sharedWallet = computed(() => {
  if (!props.request.walletId) return null
  return musig2Store.sharedWallets.find(w => w.id === props.request.walletId)
})

// Expiration countdown
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

// Format amount
const formattedAmount = computed(() => {
  if (!props.request.amount) return null
  const amount = typeof props.request.amount === 'string'
    ? BigInt(props.request.amount)
    : props.request.amount
  return formatXPI(amount)
})

// Display name
const displayName = computed(() => {
  return requesterContact.value?.name || props.request.fromNickname || 'Someone'
})
</script>

<template>
  <UCard :class="[
    'border-l-4',
    isExpired ? 'border-l-error opacity-60' : 'border-l-warning',
  ]">
    <div class="flex items-start gap-4">
      <!-- Icon -->
      <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        :class="isExpired ? 'bg-error-100 dark:bg-error-900/30' : 'bg-warning-100 dark:bg-warning-900/30'">
        <UIcon name="i-lucide-bell" class="w-5 h-5" :class="isExpired ? 'text-error' : 'text-warning'" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <p class="font-medium">Signing Request</p>
          <span class="text-xs text-muted">
            {{ timeAgo(request.timestamp) }}
          </span>
        </div>

        <p class="text-sm text-muted mb-2">
          {{ displayName }} wants you to co-sign a transaction
        </p>

        <div class="text-sm space-y-1">
          <p v-if="sharedWallet">
            <span class="text-muted">From:</span>
            {{ sharedWallet.name }}
          </p>
          <p v-if="formattedAmount">
            <span class="text-muted">Amount:</span>
            <span class="font-medium">{{ formattedAmount }}</span>
          </p>
          <p v-if="request.message" class="truncate">
            <span class="text-muted">Purpose:</span>
            {{ request.message }}
          </p>
        </div>

        <!-- Expiration -->
        <p v-if="expiresIn" class="text-xs mt-2" :class="isExpired ? 'text-error' : 'text-muted'">
          {{ isExpired ? 'Expired' : `Expires in ${expiresIn}` }}
        </p>
      </div>

      <!-- Full Actions (non-compact) -->
      <div v-if="!compact && !isExpired" class="flex flex-col gap-2 flex-shrink-0">
        <UButton size="sm" variant="ghost" @click="emit('viewDetails')">
          Details
        </UButton>
        <UButton size="sm" color="success" @click="emit('accept')">
          Accept
        </UButton>
        <UButton size="sm" variant="outline" color="error" @click="emit('reject')">
          Reject
        </UButton>
      </div>

      <!-- Compact Actions -->
      <div v-else-if="!isExpired" class="flex gap-2 flex-shrink-0">
        <UButton size="xs" color="success" @click="emit('accept')">
          Accept
        </UButton>
        <UButton size="xs" variant="outline" @click="emit('viewDetails')">
          View
        </UButton>
      </div>

      <!-- Expired indicator -->
      <UBadge v-else color="error" variant="subtle" size="sm">
        Expired
      </UBadge>
    </div>
  </UCard>
</template>
