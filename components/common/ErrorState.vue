<script setup lang="ts">
/**
 * ErrorState - Error display component
 *
 * Shows user-friendly error messages with optional retry functionality.
 */
interface Props {
  title?: string
  message?: string
  retryable?: boolean
  icon?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Something went wrong',
  message: 'An unexpected error occurred. Please try again.',
  retryable: true,
  icon: 'i-lucide-alert-triangle',
})

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <!-- Phase 6: Semantic color classes -->
  <div class="text-center py-8 px-4">
    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
      <UIcon :name="icon" class="w-8 h-8 text-error" />
    </div>

    <h3 class="text-lg font-medium mb-2">
      {{ title }}
    </h3>

    <p class="text-sm text-muted mb-6 max-w-sm mx-auto">
      {{ message }}
    </p>

    <UButton v-if="retryable" color="primary" variant="soft" @click="emit('retry')">
      <UIcon name="i-lucide-refresh-cw" class="w-4 h-4 mr-2" />
      Try Again
    </UButton>
  </div>
</template>
