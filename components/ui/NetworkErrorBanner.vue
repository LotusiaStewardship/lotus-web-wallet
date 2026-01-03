<script setup lang="ts">
/**
 * Network Error Banner
 *
 * Displays a banner at the top of the screen when offline.
 */
const isConnected = ref(true)

onMounted(() => {
  isConnected.value = navigator.onLine

  window.addEventListener('online', () => {
    isConnected.value = true
  })

  window.addEventListener('offline', () => {
    isConnected.value = false
  })
})
</script>

<template>
  <Transition enter-active-class="transition-all duration-300" enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100" leave-active-class="transition-all duration-300"
    leave-from-class="translate-y-0 opacity-100" leave-to-class="-translate-y-full opacity-0">
    <div v-if="!isConnected" class="fixed top-0 inset-x-0 z-50 bg-error text-white px-4 py-2 text-center text-sm">
      <div class="flex items-center justify-center gap-2">
        <UIcon name="i-lucide-wifi-off" class="w-4 h-4" />
        <span>No internet connection</span>
      </div>
    </div>
  </Transition>
</template>
