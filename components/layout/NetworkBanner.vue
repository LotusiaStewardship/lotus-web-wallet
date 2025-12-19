<script setup lang="ts">
import { useNetworkStore } from '~/stores/network'

const networkStore = useNetworkStore()
const route = useRoute()

const networkSettingsUrl = computed(() => {
  if (route.path.startsWith('/settings')) {
    return '/settings/network'
  }
  return `/settings/network?from=${route.path}`
})
</script>

<template>
  <div
    class="px-4 py-2 text-center text-sm font-medium bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300">
    <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 inline mr-1" />
    You are on <strong>{{ networkStore.displayName }}</strong>.
    Coins have no real value.
    <NuxtLink :to="networkSettingsUrl" class="underline ml-1">
      Switch network
    </NuxtLink>
  </div>
</template>
