<script setup lang="ts">
/**
 * NetworkBadge
 *
 * Badge showing current network (mainnet/testnet).
 */
import { useNetworkStore } from '~/stores/network'

const props = defineProps<{
  /** Override network to display */
  network?: 'livenet' | 'testnet'
  /** Show only on non-production networks */
  hideOnMainnet?: boolean
}>()

const networkStore = useNetworkStore()

const displayNetwork = computed(() => props.network || networkStore.currentNetwork)
const config = computed(() => networkStore.getNetworkConfig(displayNetwork.value))

const shouldShow = computed(() => {
  if (props.hideOnMainnet && displayNetwork.value === 'livenet') {
    return false
  }
  return true
})
</script>

<template>
  <UBadge v-if="shouldShow" :color="config.color" variant="subtle" size="sm">
    {{ config.displayName }}
  </UBadge>
</template>
