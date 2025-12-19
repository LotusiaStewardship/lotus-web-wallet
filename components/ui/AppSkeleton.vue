<script setup lang="ts">
/**
 * AppSkeleton
 *
 * Loading skeleton placeholder.
 * Use while content is loading to prevent layout shift.
 */
defineProps<{
  /** Skeleton variant */
  variant?: 'text' | 'circle' | 'rect' | 'card'
  /** Width (Tailwind class or CSS value) */
  width?: string
  /** Height (Tailwind class or CSS value) */
  height?: string
  /** Number of lines (for text variant) */
  lines?: number
}>()
</script>

<template>
  <!-- Text skeleton -->
  <div v-if="variant === 'text' || !variant" class="animate-pulse space-y-2">
    <div v-for="i in (lines || 1)" :key="i" class="h-4 bg-muted/50 rounded"
      :class="width || (i === lines ? 'w-2/3' : 'w-full')" :style="height ? { height } : undefined" />
  </div>

  <!-- Circle skeleton -->
  <div v-else-if="variant === 'circle'" class="animate-pulse rounded-full bg-muted/50"
    :class="[width || 'w-10', height || 'h-10']" />

  <!-- Rectangle skeleton -->
  <div v-else-if="variant === 'rect'" class="animate-pulse rounded bg-muted/50"
    :class="[width || 'w-full', height || 'h-20']" />

  <!-- Card skeleton -->
  <div v-else-if="variant === 'card'" class="animate-pulse">
    <div class="bg-muted/50 rounded-lg p-4 space-y-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-muted/70" />
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-muted/70 rounded w-3/4" />
          <div class="h-3 bg-muted/70 rounded w-1/2" />
        </div>
      </div>
    </div>
  </div>
</template>
