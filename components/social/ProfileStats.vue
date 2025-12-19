<script setup lang="ts">
/**
 * SocialProfileStats
 *
 * Stats grid for a social profile.
 */
const props = defineProps<{
  /** Total votes count */
  totalVotes: number
  /** Positive votes amount */
  positiveVotes: bigint | string
  /** Negative votes amount */
  negativeVotes: bigint | string
  /** Loading state */
  loading?: boolean
}>()

const { formatXPI } = useAmount()

// Calculate positive percentage
const positivePercent = computed(() => {
  const positive = typeof props.positiveVotes === 'string'
    ? BigInt(props.positiveVotes)
    : props.positiveVotes
  const negative = typeof props.negativeVotes === 'string'
    ? BigInt(props.negativeVotes)
    : props.negativeVotes
  const total = positive + negative
  if (total === 0n) return 0
  return Number((positive * 100n) / total)
})

const positiveDisplay = computed(() => {
  const amount = typeof props.positiveVotes === 'string'
    ? BigInt(props.positiveVotes)
    : props.positiveVotes
  return formatXPI(amount, { compact: true })
})

const negativeDisplay = computed(() => {
  const amount = typeof props.negativeVotes === 'string'
    ? BigInt(props.negativeVotes)
    : props.negativeVotes
  return formatXPI(amount, { compact: true })
})

const stats = computed(() => [
  {
    value: props.totalVotes.toLocaleString(),
    label: 'Total Votes',
    icon: 'i-lucide-vote',
  },
  {
    value: positiveDisplay.value,
    label: 'Upvotes',
    icon: 'i-lucide-thumbs-up',
  },
  {
    value: negativeDisplay.value,
    label: 'Downvotes',
    icon: 'i-lucide-thumbs-down',
  },
  {
    value: `${positivePercent.value}%`,
    label: 'Positive',
    icon: 'i-lucide-percent',
    trend: (positivePercent.value >= 50 ? 'up' : 'down') as 'up' | 'down',
  },
])
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <UCard v-for="stat in stats" :key="stat.label">
      <ExplorerStatCard :value="stat.value" :label="stat.label" :icon="stat.icon" :trend="stat.trend"
        :loading="loading" />
    </UCard>
  </div>
</template>
