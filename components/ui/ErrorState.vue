<script setup lang="ts">
/**
 * Error State Component
 *
 * Displays error messages with optional retry and dismiss actions.
 */
const props = withDefaults(
  defineProps<{
    title?: string
    message?: string
    icon?: string
    retryable?: boolean
    dismissable?: boolean
    details?: string
  }>(),
  {
    title: 'Something went wrong',
    message: 'An error occurred. Please try again.',
    icon: 'i-lucide-alert-circle',
    retryable: true,
    dismissable: false,
  },
)

const emit = defineEmits<{
  retry: []
  dismiss: []
}>()

const retrying = ref(false)

async function handleRetry() {
  retrying.value = true
  emit('retry')
  setTimeout(() => {
    retrying.value = false
  }, 2000)
}
</script>

<template>
  <div class="text-center py-8">
    <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
      <UIcon :name="icon" class="w-8 h-8 text-error" />
    </div>

    <h3 class="text-lg font-semibold mb-1">{{ title }}</h3>
    <p class="text-gray-500 text-sm mb-4 max-w-xs mx-auto">{{ message }}</p>

    <div class="flex justify-center gap-2">
      <UButton v-if="retryable" color="primary" :loading="retrying" @click="handleRetry">
        Try Again
      </UButton>
      <UButton v-if="dismissable" variant="ghost" @click="emit('dismiss')">
        Dismiss
      </UButton>
    </div>

    <details v-if="details" class="mt-4 text-left max-w-sm mx-auto">
      <summary class="text-xs text-gray-500 cursor-pointer hover:text-primary">
        Technical details
      </summary>
      <pre class="mt-2 p-2 rounded bg-gray-100 dark:bg-gray-800 text-xs overflow-auto">{{ details }}</pre>
    </details>
  </div>
</template>
