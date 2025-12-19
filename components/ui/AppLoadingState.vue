<script setup lang="ts">
/**
 * AppLoadingState
 *
 * Loading state with spinner and optional message.
 * Use when content is being fetched or processed.
 */
const props = defineProps<{
  /** Loading message to display */
  message?: string
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg'
}>()

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

const spinnerClass = computed(() => sizeClasses[props.size || 'md'])
</script>

<template>
  <div class="flex flex-col items-center justify-center py-8">
    <UIcon name="i-lucide-loader-2" :class="[spinnerClass, 'animate-spin text-primary']" />
    <p v-if="message" class="text-sm text-muted mt-2">{{ message }}</p>
  </div>
</template>
