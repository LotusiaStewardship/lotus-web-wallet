<script setup lang="ts">
import { useAddressFormat } from '~/composables/useUtils'
import { useNetworkStore } from '~/stores/network'

interface AddressDisplayProps {
  address: string
  label?: string
  showCopy?: boolean
  showQr?: boolean
  qrLink?: string
  /** Always show full address (no truncation) */
  showFull?: boolean
  /** Show network badge */
  showNetworkBadge?: boolean
  /** Show address type badge (Modern/Classic) */
  showTypeBadge?: boolean
}

const props = withDefaults(defineProps<AddressDisplayProps>(), {
  showCopy: true,
  showQr: false,
  showFull: false,
  showNetworkBadge: true,
  showTypeBadge: true,
})

const toast = useToast()
const networkStore = useNetworkStore()
const { truncateAddress, formatFingerprint, getNetworkName, getAddressTypeLabel } = useAddressFormat()

// Get network info for the address
const addressNetwork = computed(() => getNetworkName(props.address))
const isCurrentNetwork = computed(() => addressNetwork.value === networkStore.currentNetwork)
const networkBadgeColor = computed(() => {
  switch (addressNetwork.value) {
    case 'testnet':
      return 'warning'
    case 'regtest':
      return 'info'
    default:
      return 'primary'
  }
})
const networkBadgeLabel = computed(() => {
  switch (addressNetwork.value) {
    case 'testnet':
      return 'TESTNET'
    case 'regtest':
      return 'REGTEST'
    default:
      return ''
  }
})

// Toggle between truncated and full display
const showFullAddress = ref(props.showFull)

// Computed display value
const displayAddress = computed(() => {
  if (showFullAddress.value) return props.address
  return truncateAddress(props.address)
})

// Fingerprint for quick identification badge
const fingerprint = computed(() => formatFingerprint(props.address))

// Address type info for badge
const addressTypeInfo = computed(() => getAddressTypeLabel(props.address))

// Copy address to clipboard (always copies full address)
const copyAddress = async () => {
  try {
    await navigator.clipboard.writeText(props.address)
    toast.add({
      title: 'Address Copied',
      description: 'Full address has been copied to clipboard',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (err) {
    toast.add({
      title: 'Copy Failed',
      description: 'Failed to copy address to clipboard',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }
}

// Toggle full address display
const toggleFullAddress = () => {
  showFullAddress.value = !showFullAddress.value
}
</script>

<template>
  <div>
    <p v-if="label" class="text-sm text-muted mb-2">{{ label }}</p>
    <div class="flex items-center gap-2">
      <div class="flex-1 relative">
        <UInput :model-value="displayAddress" readonly class="font-mono text-sm pr-10"
          :class="{ 'cursor-pointer': !showFull }" @click="!showFull && toggleFullAddress()" />
        <!-- Expand/collapse button inside input -->
        <button v-if="!showFull" type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/50 transition-colors"
          :title="showFullAddress ? 'Show truncated' : 'Show full address'" @click.stop="toggleFullAddress">
          <UIcon :name="showFullAddress ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
            class="w-4 h-4 text-muted hover:text-default" />
        </button>
      </div>
      <UTooltip v-if="showCopy" text="Copy Full Address">
        <UButton color="neutral" variant="outline" icon="i-lucide-copy" @click="copyAddress" />
      </UTooltip>
      <UTooltip v-if="showQr" text="Show QR Code">
        <UButton color="neutral" variant="outline" icon="i-lucide-qr-code" :to="qrLink" />
      </UTooltip>
    </div>
    <!-- Fingerprint, address type, and network badges -->
    <div v-if="(fingerprint && !showFullAddress) || showTypeBadge || (showNetworkBadge && networkBadgeLabel)"
      class="mt-1.5 flex items-center gap-1.5 flex-wrap">
      <template v-if="fingerprint && !showFullAddress">
        <span class="text-xs text-muted">ID:</span>
        <UBadge color="neutral" variant="subtle" size="xs" class="font-mono">
          {{ fingerprint }}
        </UBadge>
      </template>
      <!-- Address type badge -->
      <UTooltip v-if="showTypeBadge" :text="addressTypeInfo.full">
        <UBadge :color="addressTypeInfo.color as any" variant="subtle" size="sm" class="gap-1">
          <UIcon :name="addressTypeInfo.icon" class="w-3 h-3" />
          {{ addressTypeInfo.short }}
        </UBadge>
      </UTooltip>
      <UBadge v-if="showNetworkBadge && networkBadgeLabel" :color="networkBadgeColor" variant="subtle" size="xs">
        {{ networkBadgeLabel }}
      </UBadge>
      <UBadge v-if="showNetworkBadge && !isCurrentNetwork && addressNetwork !== 'unknown'" color="error"
        variant="subtle" size="xs">
        Wrong Network
      </UBadge>
    </div>
  </div>
</template>
