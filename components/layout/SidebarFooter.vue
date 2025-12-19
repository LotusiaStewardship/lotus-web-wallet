<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'

const props = defineProps<{
  collapsed: boolean
  connectionStatus: 'loading' | 'connecting' | 'connected' | 'disconnected'
}>()

const walletStore = useWalletStore()

const statusColor = computed(() => {
  switch (props.connectionStatus) {
    case 'connected':
      return 'success'
    case 'disconnected':
      return 'error'
    default:
      return 'warning'
  }
})

const statusLabel = computed(() => {
  switch (props.connectionStatus) {
    case 'connected':
      return 'Online'
    case 'disconnected':
      return 'Offline'
    case 'connecting':
      return 'Connecting...'
    default:
      return 'Loading...'
  }
})
</script>

<template>
  <div class="p-2 space-y-2">
    <!-- Connection Status -->
    <UBadge :color="statusColor" variant="subtle" size="sm" class="w-full justify-center">
      <template #leading>
        <span class="relative flex h-2 w-2">
          <span v-if="connectionStatus === 'connected'"
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span class="relative inline-flex rounded-full h-2 w-2" :class="{
            'bg-green-500': connectionStatus === 'connected',
            'bg-red-500': connectionStatus === 'disconnected',
            'bg-yellow-500':
              connectionStatus === 'connecting' ||
              connectionStatus === 'loading',
          }" />
        </span>
      </template>
      <span v-if="!collapsed">{{ statusLabel }}</span>
    </UBadge>

    <!-- Phase 6: Balance Preview with semantic colors -->
    <div v-if="!collapsed" class="text-center pt-2 border-t border-default">
      <div class="text-xs text-muted">Balance</div>
      <div class="font-mono font-semibold text-sm">
        {{ walletStore.formattedBalance }} XPI
      </div>
    </div>

    <!-- Phase 6: Command Palette Hint with semantic colors -->
    <div v-if="!collapsed" class="text-center text-xs text-muted">
      Press
      <kbd class="px-1 py-0.5 bg-muted rounded text-xs">⌘K</kbd>
      for quick actions
    </div>
  </div>
</template>
