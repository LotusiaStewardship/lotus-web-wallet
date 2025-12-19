<script setup lang="ts">
/**
 * ExplorerStatCard
 *
 * Stat display card for explorer network stats.
 */
const props = defineProps<{
  /** Stat value */
  value: string | number
  /** Stat label */
  label: string
  /** Icon name */
  icon?: string
  /** Use monospace font for value */
  mono?: boolean
  /** Loading state */
  loading?: boolean
  /** Trend indicator */
  trend?: 'up' | 'down' | null
  /** Trend value */
  trendValue?: string
}>()

const trendColor = computed(() => {
  if (props.trend === 'up') return 'text-success'
  if (props.trend === 'down') return 'text-error'
  return 'text-muted'
})

const trendIcon = computed(() => {
  if (props.trend === 'up') return 'i-lucide-trending-up'
  if (props.trend === 'down') return 'i-lucide-trending-down'
  return null
})
</script>

<template>
  <div class="text-center p-4">
    <!-- Icon -->
    <div v-if="icon" class="mb-2">
      <UIcon :name="icon" class="w-5 h-5 text-muted mx-auto" />
    </div>

    <!-- Value -->
    <div v-if="loading" class="h-8 flex items-center justify-center">
      <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin text-muted" />
    </div>
    <p v-else :class="[
      'text-xl font-semibold',
      mono && 'font-mono',
    ]">
      {{ value }}
    </p>

    <!-- Label -->
    <p class="text-sm text-muted mt-1">{{ label }}</p>

    <!-- Trend -->
    <div v-if="trend && trendValue" class="flex items-center justify-center gap-1 mt-1">
      <UIcon v-if="trendIcon" :name="trendIcon" :class="['w-3 h-3', trendColor]" />
      <span :class="['text-xs', trendColor]">{{ trendValue }}</span>
    </div>
  </div>
</template>
