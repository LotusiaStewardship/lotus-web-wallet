<script setup lang="ts">
/**
 * OfflineIndicator - Network status indicator
 *
 * Shows when the user is offline or has limited connectivity.
 */
const isOnline = useOnline()
</script>

<template>
  <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-300"
    leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-2">
    <div v-if="!isOnline" class="fixed bottom-20 md:bottom-4 left-4 z-50">
      <UBadge color="warning" variant="solid" size="lg" class="shadow-lg">
        <UIcon name="i-lucide-wifi-off" class="w-4 h-4 mr-1.5" />
        Offline
      </UBadge>
    </div>
  </Transition>
</template>
