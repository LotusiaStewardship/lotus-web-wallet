<script setup lang="ts">
/**
 * Offline Indicator Component
 *
 * Displays a floating banner when the user is offline.
 */
const isOnline = ref(true)

onMounted(() => {
  isOnline.value = navigator.onLine

  window.addEventListener('online', () => {
    isOnline.value = true
  })

  window.addEventListener('offline', () => {
    isOnline.value = false
  })
})
</script>

<template>
  <Transition enter-active-class="transition-opacity duration-300" enter-from-class="opacity-0"
    enter-to-class="opacity-100" leave-active-class="transition-opacity duration-300" leave-from-class="opacity-100"
    leave-to-class="opacity-0">
    <div v-if="!isOnline" class="fixed bottom-20 inset-x-4 z-40">
      <div class="bg-warning text-warning-foreground rounded-lg p-3 shadow-lg flex items-center gap-3">
        <UIcon name="i-lucide-wifi-off" class="w-5 h-5" />
        <div class="flex-1">
          <p class="font-medium text-sm">You're offline</p>
          <p class="text-xs opacity-80">Some features may be unavailable</p>
        </div>
      </div>
    </div>
  </Transition>
</template>
