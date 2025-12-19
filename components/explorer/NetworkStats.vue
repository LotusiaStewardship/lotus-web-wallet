<script setup lang="ts">
/**
 * ExplorerNetworkStats
 *
 * Grid of network statistics for explorer index.
 */
const props = defineProps<{
  /** Block height */
  blockHeight: number
  /** Network difficulty */
  difficulty?: string
  /** Mempool transaction count */
  mempoolSize: number
  /** Total burned amount */
  totalBurned?: string | bigint
  /** Loading state */
  loading?: boolean
}>()

const { formatXPI } = useAmount()

const burnedDisplay = computed(() => {
  if (!props.totalBurned) return '0'
  const amount = typeof props.totalBurned === 'string'
    ? BigInt(props.totalBurned)
    : props.totalBurned
  return formatXPI(amount, { compact: true })
})

const stats = computed(() => [
  {
    value: props.blockHeight.toLocaleString(),
    label: 'Block Height',
    icon: 'i-lucide-box',
    mono: true,
  },
  {
    value: props.difficulty || 'N/A',
    label: 'Difficulty',
    icon: 'i-lucide-gauge',
  },
  {
    value: props.mempoolSize.toString(),
    label: 'Mempool Txs',
    icon: 'i-lucide-clock',
    mono: true,
  },
  {
    value: burnedDisplay.value,
    label: 'Total Burned',
    icon: 'i-lucide-flame',
  },
])
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <UCard v-for="stat in stats" :key="stat.label">
      <ExplorerStatCard :value="stat.value" :label="stat.label" :icon="stat.icon" :mono="stat.mono"
        :loading="loading" />
    </UCard>
  </div>
</template>
