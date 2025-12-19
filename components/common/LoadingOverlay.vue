<script setup lang="ts">
/**
 * LoadingOverlay - Full-screen loading overlay
 *
 * Displays a centered loading indicator with optional message.
 * Used for blocking operations that require user to wait.
 */
interface Props {
  message?: string
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  message: 'Loading...',
  show: true,
})
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
      enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200" leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <UCard class="w-64 text-center">
          <div class="flex flex-col items-center gap-4 py-2">
            <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary" />
            <p class="text-sm text-muted">{{ message }}</p>
          </div>
        </UCard>
      </div>
    </Transition>
  </Teleport>
</template>
