<script setup lang="ts">
/**
 * ExplorerBlockItem
 *
 * List item for displaying a block in the explorer.
 */
const props = defineProps<{
  /** Block data */
  block: {
    hash: string
    height: number
    timestamp: string | number
    numTxs: string | number
    size?: number
    burnedAmount?: string | bigint
    minerAddress?: string
  }
  /** Compact display mode */
  compact?: boolean
}>()

// Normalize values that may come as strings from API
const timestamp = computed(() => {
  const ts = props.block.timestamp
  return typeof ts === 'string' ? parseInt(ts, 10) : ts
})

const numTxs = computed(() => {
  const n = props.block.numTxs
  return typeof n === 'string' ? parseInt(n, 10) : n
})

const { timeAgo } = useTime()
const { formatXPI } = useAmount()

const burnedAmount = computed(() => {
  if (!props.block.burnedAmount) return 0n
  return typeof props.block.burnedAmount === 'string'
    ? BigInt(props.block.burnedAmount)
    : props.block.burnedAmount
})

const hasBurn = computed(() => burnedAmount.value > 0n)
</script>

<template>
  <NuxtLink :to="`/explore/explorer/block/${block.height}`"
    class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
    <!-- Icon -->
    <div
      class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
      <UIcon name="i-lucide-box" class="w-5 h-5 text-primary" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="font-medium">
        Block {{ block.height.toLocaleString() }}
      </p>
      <p class="text-sm text-muted">
        {{ numTxs }} transaction{{ numTxs !== 1 ? 's' : '' }}
        <span v-if="hasBurn" class="text-error">
          • {{ formatXPI(burnedAmount) }} burned
        </span>
        <span v-if="!compact && block.size" class="hidden sm:inline">
          • {{ (block.size / 1024).toFixed(1) }} KB
        </span>
      </p>
    </div>

    <!-- Time -->
    <div class="text-right flex-shrink-0">
      <p class="text-sm text-muted">{{ timeAgo(timestamp) }}</p>
    </div>

    <!-- Chevron -->
    <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted flex-shrink-0 hidden sm:block" />
  </NuxtLink>
</template>
