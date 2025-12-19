<script setup lang="ts">
/**
 * P2PPresenceToggle
 *
 * Toggle switch for presence advertising on the P2P network.
 * When enabled, advertises the wallet as available for signing.
 */
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
import { useWalletStore } from '~/stores/wallet'

const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const walletStore = useWalletStore()
const toast = useToast()

const isLoading = ref(false)

// Check if currently advertising
const isAdvertising = computed(() => p2pStore.isAdvertisingPresence || musig2Store.signerEnabled)

// Toggle presence advertising
async function togglePresence() {
  if (isLoading.value) return

  isLoading.value = true

  try {
    if (isAdvertising.value) {
      // Stop advertising
      await p2pStore.withdrawPresence()
      if (musig2Store.signerEnabled) {
        await musig2Store.withdrawSigner()
      }
      toast.add({
        title: 'Presence Disabled',
        description: 'You are no longer visible to other peers',
        color: 'neutral',
      })
    } else {
      // Start advertising
      const address = walletStore.address
      if (!address) {
        throw new Error('Wallet address not available')
      }

      await p2pStore.advertisePresence({
        walletAddress: address,
      })

      toast.add({
        title: 'Presence Enabled',
        description: 'You are now visible to other peers',
        color: 'success',
      })
    }
  } catch (err) {
    console.error('Failed to toggle presence:', err)
    toast.add({
      title: 'Error',
      description: err instanceof Error ? err.message : 'Failed to toggle presence',
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UCard class="w-auto">
    <div class="flex items-center gap-3">
      <div class="flex-1">
        <p class="text-sm font-medium">Presence</p>
        <p class="text-xs text-muted">
          {{ isAdvertising ? 'Visible to peers' : 'Hidden' }}
        </p>
      </div>
      <UTooltip :text="isAdvertising ? 'Stop advertising your presence' : 'Advertise your presence to other peers'">
        <USwitch v-model="isAdvertising" :loading="isLoading" :disabled="isLoading" color="primary"
          @update:model-value="togglePresence" />
      </UTooltip>
    </div>
  </UCard>
</template>
