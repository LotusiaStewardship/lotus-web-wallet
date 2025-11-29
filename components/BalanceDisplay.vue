<script setup lang="ts">
interface BalanceDisplayProps {
  balance: string | number
  spendable?: string | number
  showSpendable?: boolean
}

const props = withDefaults(defineProps<BalanceDisplayProps>(), {
  showSpendable: true,
})

// Format large numbers
const formatNumber = (num: string | number) => {
  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}
</script>

<template>
  <div class="text-center py-8">
    <p class="text-sm text-muted mb-2">Total Balance</p>
    <h1 class="text-5xl font-bold font-mono mb-2">
      {{ formatNumber(balance) }}
      <span class="text-2xl text-muted">XPI</span>
    </h1>
    <p v-if="showSpendable && spendable !== undefined" class="text-sm text-muted">
      Spendable: {{ formatNumber(spendable) }} XPI
    </p>
    <slot name="extra" />
  </div>
</template>
