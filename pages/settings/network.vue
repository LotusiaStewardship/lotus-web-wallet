<script setup lang="ts">
/**
 * Network Settings Page
 *
 * Switch between networks and configure address type.
 */
import { useWalletStore } from '~/stores/wallet'
import { useNetworkStore, NETWORK_CONFIGS, type NetworkType } from '~/stores/network'

definePageMeta({
  title: 'Network',
})

const walletStore = useWalletStore()
const networkStore = useNetworkStore()
const toast = useToast()

// Switching state
const switching = ref(false)

// Network options
const networks = computed(() => {
  return Object.entries(NETWORK_CONFIGS).map(([key, config]) => ({
    value: key as NetworkType,
    label: config.displayName,
    description: config.chronikUrl,
    color: config.color,
    icon: key === 'livenet' ? 'i-lucide-globe' : key === 'testnet' ? 'i-lucide-flask-conical' : 'i-lucide-server',
  }))
})

// Address type options
const addressTypes = [
  {
    value: 'p2tr' as const,
    label: 'Modern (Taproot)',
    description: 'Enhanced privacy and script capabilities',
    icon: 'i-lucide-sparkles',
  },
  {
    value: 'p2pkh' as const,
    label: 'Classic (P2PKH)',
    description: 'Traditional address format',
    icon: 'i-lucide-landmark',
  },
]

// Switch network
async function switchNetwork(network: NetworkType) {
  if (network === networkStore.currentNetwork) return

  switching.value = true
  try {
    await walletStore.switchNetwork(network)
    toast.add({
      title: 'Network Changed',
      description: `Switched to ${NETWORK_CONFIGS[network].displayName}`,
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (error) {
    toast.add({
      title: 'Failed to switch network',
      description: error instanceof Error ? error.message : 'Unknown error',
      color: 'error',
    })
  } finally {
    switching.value = false
  }
}

// Switch address type
async function switchAddressType(type: 'p2pkh' | 'p2tr') {
  if (type === walletStore.addressType) return

  switching.value = true
  try {
    await walletStore.switchAddressType(type)
    toast.add({
      title: 'Address Type Changed',
      description: `Switched to ${type === 'p2tr' ? 'Modern (Taproot)' : 'Classic (P2PKH)'} address`,
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (error) {
    toast.add({
      title: 'Failed to switch address type',
      description: error instanceof Error ? error.message : 'Unknown error',
      color: 'error',
    })
  } finally {
    switching.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Current Network -->
    <UiAppCard>
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-full flex items-center justify-center"
          :class="`bg-${networkStore.color}-100 dark:bg-${networkStore.color}-900/30`">
          <UIcon name="i-lucide-network" class="w-5 h-5" :class="`text-${networkStore.color}-600`" />
        </div>
        <div>
          <div class="font-semibold">{{ networkStore.displayName }}</div>
          <div class="text-xs text-muted font-mono">{{ networkStore.chronikUrl }}</div>
        </div>
      </div>

      <UAlert v-if="!networkStore.isProduction" :color="networkStore.color" icon="i-lucide-info">
        <template #description>
          You are on a test network. Coins have no real value.
        </template>
      </UAlert>
    </UiAppCard>

    <!-- Network Selection -->
    <UiAppCard title="Select Network" icon="i-lucide-globe">
      <div class="space-y-2">
        <button v-for="network in networks" :key="network.value" :disabled="switching"
          class="w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left" :class="[
            networkStore.currentNetwork === network.value
              ? `border-${network.color}-500 bg-${network.color}-50 dark:bg-${network.color}-900/20`
              : 'border-default hover:border-primary/50'
          ]" @click="switchNetwork(network.value)">
          <div class="w-10 h-10 rounded-full flex items-center justify-center"
            :class="`bg-${network.color}-100 dark:bg-${network.color}-900/30`">
            <UIcon :name="network.icon" class="w-5 h-5" :class="`text-${network.color}-600`" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium">{{ network.label }}</div>
            <div class="text-xs text-muted truncate">{{ network.description }}</div>
          </div>
          <UIcon v-if="networkStore.currentNetwork === network.value" name="i-lucide-check-circle"
            class="w-5 h-5 text-success shrink-0" />
        </button>
      </div>
    </UiAppCard>

    <!-- Address Type -->
    <UiAppCard title="Address Type" icon="i-lucide-wallet">
      <p class="text-sm text-muted mb-4">
        Choose your preferred address format. Changing this will generate a new address from the same seed phrase.
      </p>

      <div class="space-y-2">
        <button v-for="type in addressTypes" :key="type.value" :disabled="switching"
          class="w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left" :class="[
            walletStore.addressType === type.value
              ? 'border-primary bg-primary/5'
              : 'border-default hover:border-primary/50'
          ]" @click="switchAddressType(type.value)">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon :name="type.icon" class="w-5 h-5 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium">{{ type.label }}</div>
            <div class="text-xs text-muted">{{ type.description }}</div>
          </div>
          <UIcon v-if="walletStore.addressType === type.value" name="i-lucide-check-circle"
            class="w-5 h-5 text-success shrink-0" />
        </button>
      </div>

      <UAlert color="info" icon="i-lucide-info" class="mt-4">
        <template #description>
          Your current address: <span class="font-mono text-xs break-all">{{ walletStore.address }}</span>
        </template>
      </UAlert>
    </UiAppCard>

    <!-- Loading Overlay -->
    <div v-if="switching" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-900 rounded-xl p-6 text-center">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
        <p class="font-medium">Switching...</p>
        <p class="text-sm text-muted">Please wait while we update your wallet</p>
      </div>
    </div>
  </div>
</template>
