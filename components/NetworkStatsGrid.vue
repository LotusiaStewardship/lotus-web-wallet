<script setup lang="ts">
interface StatItem {
  value: string | number
  label: string
  mono?: boolean
}

interface NetworkStatsGridProps {
  stats: StatItem[]
  columns?: 2 | 3 | 4
}

const props = withDefaults(defineProps<NetworkStatsGridProps>(), {
  columns: 4,
})

const gridClasses = computed(() => {
  return `grid-cols-2 md:grid-cols-${props.columns}`
})
</script>

<template>
  <div :class="['grid gap-4', gridClasses]">
    <StatsCard v-for="(stat, index) in stats" :key="index" :value="stat.value" :label="stat.label" :mono="stat.mono" />
  </div>
</template>
