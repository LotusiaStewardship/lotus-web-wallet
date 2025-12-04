<script setup lang="ts">
/**
 * WalletRequired Component
 * 
 * Wraps content that requires wallet connectivity.
 * Shows a loading state while waiting for the wallet to connect.
 * 
 * Usage:
 *   <WalletRequired>
 *     <YourWalletDependentContent />
 *   </WalletRequired>
 * 
 * Props:
 *   - requireConnection: If true, waits for network connection (default: true)
 *   - requireSdk: If true, waits for SDK to be ready (default: true)
 */
import { useWalletStore } from '~/stores/wallet'

interface WalletRequiredProps {
  /** Require network connection (WebSocket connected) */
  requireConnection?: boolean
  /** Require SDK to be loaded (wallet usable locally) */
  requireSdk?: boolean
  /** Custom loading message */
  loadingMessage?: string
}

const props = withDefaults(defineProps<WalletRequiredProps>(), {
  requireConnection: true,
  requireSdk: true,
  loadingMessage: 'Connecting to network...',
})

const walletStore = useWalletStore()

// Determine if we're ready to show content
const isReady = computed(() => {
  // If SDK is required and not ready, not ready
  if (props.requireSdk && !walletStore.sdkReady) return false
  // If connection is required and not connected, not ready
  if (props.requireConnection && !walletStore.connected) return false
  return true
})

// Determine the loading message to show
const displayMessage = computed(() => {
  if (!walletStore.sdkReady) return 'Loading wallet...'
  if (props.requireConnection && !walletStore.connected) return props.loadingMessage
  return ''
})
</script>

<template>
  <div v-if="!isReady" class="flex flex-col items-center justify-center py-12 gap-4">
    <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary" />
    <p class="text-muted">{{ displayMessage }}</p>
  </div>
  <slot v-else />
</template>
