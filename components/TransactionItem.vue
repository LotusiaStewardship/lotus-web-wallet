<script setup lang="ts">
import { useAddressFormat } from '~/composables/useUtils'

interface TransactionItemProps {
  txid: string
  type: 'send' | 'receive'
  amount: string | number
  address?: string
  timestamp: number
  confirmations?: number
  compact?: boolean
  showExplorer?: boolean
  explorerUrl?: string
}

const props = withDefaults(defineProps<TransactionItemProps>(), {
  compact: false,
  showExplorer: false,
})

const { truncateAddress } = useAddressFormat()

// Format amount with sign
const formatNumber = (num: string | number) => {
  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

// Format date
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString()
}

// Format detailed date/time
const formatDateTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

// Get confirmation status
const getConfirmationStatus = (confirmations: number) => {
  if (confirmations === 0) return { label: 'Pending', color: 'warning' as const }
  if (confirmations < 6) return { label: `${confirmations} conf`, color: 'info' as const }
  return { label: 'Confirmed', color: 'success' as const }
}

// Truncate txid for display
const truncatedTxid = computed(() => {
  if (!props.showExplorer || !props.txid) return ''
  return `${props.txid.slice(0, 16)}...${props.txid.slice(-8)}`
})
</script>

<template>
  <div class="flex items-center justify-between py-3">
    <div class="flex items-center gap-3">
      <!-- Icon -->
      <div class="w-10 h-10 rounded-full flex items-center justify-center"
        :class="type === 'receive' ? 'bg-success-100 dark:bg-success-900/20' : 'bg-error-100 dark:bg-error-900/20'">
        <UIcon :name="type === 'receive' ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right'" class="w-5 h-5"
          :class="type === 'receive' ? 'text-success-500' : 'text-error-500'" />
      </div>

      <!-- Details -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 mb-1">
          <p class="font-medium">{{ type === 'receive' ? 'Received' : 'Sent' }}</p>
          <UBadge v-if="confirmations !== undefined" :color="getConfirmationStatus(confirmations).color"
            variant="subtle" size="xs">
            {{ getConfirmationStatus(confirmations).label }}
          </UBadge>
        </div>

        <p v-if="address" class="text-sm text-muted font-mono truncate max-w-[200px]">{{ truncateAddress(address) }}</p>

        <p v-if="!compact" class="text-sm text-muted">
          {{ formatDateTime(timestamp) }}
        </p>

        <NuxtLink v-if="showExplorer && explorerUrl" :to="`/explorer/tx/${txid}`"
          class="text-xs text-primary hover:underline font-mono truncate block mt-1">
          {{ truncatedTxid }}
        </NuxtLink>
      </div>
    </div>

    <!-- Amount -->
    <div class="text-right shrink-0">
      <p class="font-mono font-medium" :class="type === 'receive' ? 'text-success-500' : 'text-error-500'">
        {{ type === 'receive' ? '+' : '-' }}{{ formatNumber(amount) }} XPI
      </p>
      <p v-if="compact" class="text-sm text-muted">
        {{ formatDate(timestamp) }}
      </p>
    </div>
  </div>
</template>
