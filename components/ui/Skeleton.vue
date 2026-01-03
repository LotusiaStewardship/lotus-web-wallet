<script setup lang="ts">
/**
 * Skeleton Loading Component
 *
 * Base skeleton component for loading states.
 */
withDefaults(
  defineProps<{
    width?: string
    height?: string
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  }>(),
  {
    width: '100%',
    height: '1rem',
    rounded: 'md',
  },
)

const roundedClasses = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded',
  lg: 'rounded-lg',
  full: 'rounded-full',
}
</script>

<template>
  <div class="animate-pulse bg-gray-200 dark:bg-gray-800" :class="roundedClasses[rounded]" :style="{ width, height }" />
</template>
