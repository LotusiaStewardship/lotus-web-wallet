<script setup lang="ts">
/**
 * AppStatCard
 *
 * Compact stat display for dashboards and summaries.
 * Use inside a grid for multiple stats.
 */
defineProps<{
  /** Stat value to display */
  value: string | number
  /** Label describing the stat */
  label: string
  /** Optional icon */
  icon?: string
  /** Trend indicator */
  trend?: 'up' | 'down' | 'neutral'
  /** Use monospace font for value */
  mono?: boolean
}>()
</script>

<template>
  <div class="text-center">
    <div class="flex items-center justify-center gap-1 mb-1">
      <UIcon v-if="icon" :name="icon" class="w-4 h-4 text-muted" />
      <span class="text-xl font-semibold" :class="{ 'font-mono': mono }">
        {{ value }}
      </span>
      <UIcon v-if="trend === 'up'" name="i-lucide-trending-up" class="w-4 h-4 text-success" />
      <UIcon v-if="trend === 'down'" name="i-lucide-trending-down" class="w-4 h-4 text-error" />
    </div>
    <p class="text-xs text-muted">{{ label }}</p>
  </div>
</template>
