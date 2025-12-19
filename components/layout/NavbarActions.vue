<script setup lang="ts">
import { useNetworkStore } from '~/stores/network'
import { useWalletStore } from '~/stores/wallet'

defineProps<{
  connectionStatus: 'loading' | 'connecting' | 'connected' | 'disconnected'
}>()

const emit = defineEmits<{
  openCommandPalette: []
}>()

const networkStore = useNetworkStore()
const walletStore = useWalletStore()
const colorMode = useColorMode()
const route = useRoute()

const networkSettingsUrl = computed(() => {
  if (route.path.startsWith('/settings')) {
    return '/settings/network'
  }
  return `/settings/network?from=${route.path}`
})
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Command Palette Button -->
    <UTooltip text="Quick actions (⌘K)">
      <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-search" @click="emit('openCommandPalette')" />
    </UTooltip>

    <!-- Network Indicator -->
    <UTooltip :text="connectionStatus === 'connecting'
      ? 'Connecting to network...'
      : `${networkStore.displayName} - Click to change`
      ">
      <UButton :color="networkStore.isProduction ? 'neutral' : networkStore.color"
        :variant="networkStore.isProduction ? 'ghost' : 'soft'" size="sm" :to="networkSettingsUrl" class="gap-1.5">
        <UIcon v-if="connectionStatus === 'connecting'" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
        <UIcon v-else :name="walletStore.connected ? 'i-lucide-wifi' : 'i-lucide-wifi-off'" class="w-4 h-4" />
        <UBadge v-if="!networkStore.isProduction" :color="networkStore.color" variant="solid" size="xs">
          {{ networkStore.displayName }}
        </UBadge>
      </UButton>
    </UTooltip>

    <!-- Color Mode Toggle -->
    <UButton color="neutral" variant="ghost" size="sm"
      :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
      @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'" />

    <!-- Notification Center -->
    <LayoutNotificationCenter />
  </div>
</template>
