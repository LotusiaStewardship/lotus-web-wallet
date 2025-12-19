<script setup lang="ts">
/**
 * P2PIncomingRequests
 *
 * Prominent display of incoming signing requests.
 */
const props = defineProps<{
  /** Incoming requests */
  requests: Array<{
    id: string
    fromPeerId: string
    fromNickname?: string
    amount: string | bigint
    transactionType: string
    timestamp: number
  }>
}>()

const emit = defineEmits<{
  accept: [request: any]
  reject: [request: any]
  viewDetails: [request: any]
}>()

const { formatXPI } = useAmount()
const { timeAgo } = useTime()
</script>

<template>
  <div class="space-y-3">
    <UCard v-for="request in requests" :key="request.id"
      class="border-2 border-warning-500 bg-warning-50 dark:bg-warning-900/20">
      <div class="flex items-start gap-4">
        <!-- Icon -->
        <div
          class="w-12 h-12 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-bell-ring" class="w-6 h-6 text-warning animate-pulse" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <p class="font-semibold">Incoming Signing Request</p>
            <UBadge color="warning" variant="subtle" size="xs">
              {{ timeAgo(request.timestamp) }}
            </UBadge>
          </div>

          <p class="text-sm text-muted mb-2">
            <span class="font-medium">{{ request.fromNickname || 'Anonymous' }}</span>
            wants you to co-sign a transaction
          </p>

          <div class="flex items-center gap-4 text-sm">
            <span>
              <strong>Amount:</strong> {{ formatXPI(request.amount) }}
            </span>
            <span>
              <strong>Type:</strong> {{ request.transactionType }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-2 flex-shrink-0">
          <UButton color="success" size="sm" icon="i-lucide-check" @click="emit('accept', request)">
            Accept
          </UButton>
          <UButton color="error" variant="outline" size="sm" icon="i-lucide-x" @click="emit('reject', request)">
            Decline
          </UButton>
          <UButton color="neutral" variant="ghost" size="xs" @click="emit('viewDetails', request)">
            Details
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
