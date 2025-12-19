<script setup lang="ts">
/**
 * AppErrorState
 *
 * Error state with retry action.
 * Use when an operation fails and user can retry.
 */
defineProps<{
  /** Error title */
  title?: string
  /** Error message */
  message: string
  /** Retry button label */
  retryLabel?: string
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="text-center py-8">
    <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
      <UIcon name="i-lucide-alert-circle" class="w-6 h-6 text-error" />
    </div>
    <h3 v-if="title" class="text-lg font-medium mb-1">{{ title }}</h3>
    <p class="text-sm text-muted mb-4">{{ message }}</p>
    <UButton color="primary" variant="outline" @click="emit('retry')">
      {{ retryLabel || 'Try Again' }}
    </UButton>
  </div>
</template>
