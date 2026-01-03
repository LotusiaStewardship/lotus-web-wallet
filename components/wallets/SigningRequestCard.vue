<script setup lang="ts">
/**
 * Signing Request Card Component
 *
 * Displays a pending signing request with approve/reject actions.
 */
import { formatXPI, formatRelativeTime } from '~/utils/formatting'

interface SigningRequest {
  id: string
  sessionId: string
  walletId: string
  walletName: string
  amount: string
  recipient: string
  initiator: string
  createdAt: number
  expiresAt?: number
  signaturesCollected: number
  signaturesRequired: number
}

const props = defineProps<{
  request: SigningRequest
}>()

const emit = defineEmits<{
  (e: 'approve', request: SigningRequest): void
  (e: 'reject', request: SigningRequest): void
  (e: 'view', request: SigningRequest): void
}>()

const isExpired = computed(() => {
  if (!props.request.expiresAt) return false
  return Date.now() > props.request.expiresAt
})

const timeRemaining = computed(() => {
  if (!props.request.expiresAt) return null
  const remaining = props.request.expiresAt - Date.now()
  if (remaining <= 0) return 'Expired'

  const minutes = Math.floor(remaining / 60000)
  if (minutes < 60) return `${minutes}m remaining`
  const hours = Math.floor(minutes / 60)
  return `${hours}h remaining`
})

function truncateAddress(address: string): string {
  if (!address || address.length <= 16) return address
  return `${address.slice(0, 10)}...${address.slice(-6)}`
}
</script>

<template>
  <div class="p-4 rounded-xl border transition-all" :class="isExpired
    ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60'
    : 'bg-white dark:bg-gray-900 border-warning/30 hover:border-warning/50 hover:shadow-md cursor-pointer'"
    @click="emit('view', request)">
    <div class="flex items-start gap-3">
      <!-- Icon -->
      <div class="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
        <UIcon name="i-lucide-pen-tool" class="w-5 h-5 text-warning" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-semibold truncate">{{ request.walletName }}</h3>
          <span v-if="timeRemaining" class="text-xs text-gray-500">
            {{ timeRemaining }}
          </span>
        </div>

        <p class="text-sm text-gray-500 mt-0.5">
          {{ request.initiator }} wants to send
        </p>

        <!-- Amount -->
        <div class="mt-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-500">Amount</span>
            <span class="font-mono font-medium">
              {{ formatXPI(request.amount, { showSymbol: true }) }}
            </span>
          </div>
          <div class="flex justify-between items-center mt-1">
            <span class="text-sm text-gray-500">To</span>
            <code class="text-xs">{{ truncateAddress(request.recipient) }}</code>
          </div>
        </div>

        <!-- Signature Progress -->
        <div class="mt-2 flex items-center gap-2">
          <div class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-warning rounded-full transition-all"
              :style="{ width: `${(request.signaturesCollected / request.signaturesRequired) * 100}%` }" />
          </div>
          <span class="text-xs text-gray-500">
            {{ request.signaturesCollected }}/{{ request.signaturesRequired }}
          </span>
        </div>

        <!-- Actions -->
        <div v-if="!isExpired" class="mt-3 flex gap-2">
          <UButton color="primary" size="sm" class="flex-1" @click.stop="emit('approve', request)">
            Approve
          </UButton>
          <UButton variant="outline" size="sm" class="flex-1" @click.stop="emit('reject', request)">
            Reject
          </UButton>
        </div>

        <p v-else class="mt-2 text-sm text-gray-500 text-center">
          This request has expired
        </p>
      </div>
    </div>
  </div>
</template>
