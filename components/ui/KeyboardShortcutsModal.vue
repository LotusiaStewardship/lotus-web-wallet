<script setup lang="ts">
/**
 * Keyboard Shortcuts Modal
 *
 * Displays available keyboard shortcuts in a modal.
 */
const emit = defineEmits<{
  (e: 'close'): void
}>()

function close() {
  emit('close')
}
</script>

<template>
  <UModal :open="true">
    <template #content>
      <div class="p-6">
        <h2 class="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>

        <div class="space-y-6">
          <!-- Navigation -->
          <div>
            <h3 class="text-sm font-medium text-gray-500 mb-3">Navigation</h3>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm">Go to Home</span>
                <kbd class="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">H</kbd>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm">Go to People</span>
                <kbd class="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">P</kbd>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm">Go to Activity</span>
                <kbd class="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">A</kbd>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm">Go to Settings</span>
                <kbd class="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">S</kbd>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm">Go to Explorer</span>
                <kbd class="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">E</kbd>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div>
            <h3 class="text-sm font-medium text-gray-500 mb-3">Actions</h3>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm">Quick actions</span>
                <kbd class="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">⌥⇧A</kbd>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm">Focus search</span>
                <kbd class="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">/</kbd>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm">Show shortcuts</span>
                <kbd class="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">?</kbd>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <UButton variant="outline" class="w-full" @click="close">
            Close
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
