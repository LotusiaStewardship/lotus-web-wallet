<script setup lang="ts">
/**
 * P2PSignerList
 *
 * List of available signers with filtering.
 *
 * Phase 7.2.1 Enhancements:
 * - Visual feedback during discovery
 * - Contextual empty state descriptions
 * - Discovery status banner
 *
 * Phase 9.6.1 Enhancements:
 * - Subscription status indicator
 * - Enhanced discovery state feedback
 */
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'

const props = defineProps<{
  /** Available signers */
  signers: Array<{
    id: string
    peerId: string
    publicKeyHex: string
    nickname?: string
    reputation?: number
    transactionTypes: string[]
    fee?: number | string
    responseTime?: number
  }>
  /** Loading state */
  loading: boolean
}>()

const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()

/**
 * Phase 9.6.1: Check if actively subscribed to signers
 */
const isSubscribed = computed(() => !!musig2Store.signerSubscriptionId)

/**
 * Phase 9.6.1: Discovery status for header info
 */
type BadgeColor = 'neutral' | 'warning' | 'success' | 'error' | 'primary' | 'info' | 'secondary'
const discoveryStatus = computed((): { color: BadgeColor; text: string } => {
  if (!p2pStore.connected) return { color: 'neutral', text: 'Disconnected' }
  if (!p2pStore.dhtReady) return { color: 'warning', text: 'DHT Initializing' }
  if (!musig2Store.initialized) return { color: 'warning', text: 'MuSig2 Not Ready' }
  if (!isSubscribed.value) return { color: 'warning', text: 'Not Subscribed' }
  return { color: 'success', text: 'Active' }
})

/**
 * Phase 7.2.1 + 9.6.1: Contextual empty state description
 * Provides helpful information based on current network state
 */
const emptyStateDescription = computed(() => {
  if (!p2pStore.connected) {
    return 'Connect to the P2P network to discover signers'
  }
  if (!p2pStore.dhtReady) {
    return 'Waiting for DHT to initialize...'
  }
  if (!musig2Store.initialized) {
    return 'MuSig2 service is initializing...'
  }
  if (!isSubscribed.value) {
    return 'Not subscribed to signer updates. Try refreshing.'
  }
  return 'No signers are currently advertising. Try refreshing or check back later.'
})

const emit = defineEmits<{
  requestSign: [signer: any]
  saveContact: [signer: any]
  viewDetails: [signer: any]
  refresh: []
}>()

// Filter state
const selectedTxType = ref<string | null>(null)

const txTypeOptions = [
  { label: 'All Types', value: null },
  { label: 'Spend', value: 'spend' },
  { label: 'CoinJoin', value: 'coinjoin' },
  { label: 'Escrow', value: 'escrow' },
  { label: 'Swap', value: 'swap' },
]

const filteredSigners = computed(() => {
  if (!selectedTxType.value) return props.signers
  return props.signers.filter(s =>
    s.transactionTypes.some(t => t.toLowerCase() === selectedTxType.value),
  )
})
</script>

<template>
  <UiAppCard title="Available Signers" icon="i-lucide-pen-tool">
    <template #header-badge>
      <div class="flex items-center gap-2">
        <!-- Phase 9.6.1: Discovery status badge -->
        <UBadge :color="discoveryStatus.color" variant="subtle" size="sm">
          {{ discoveryStatus.text }}
        </UBadge>
        <UBadge color="neutral" variant="subtle" size="sm">
          {{ filteredSigners.length }}
        </UBadge>
      </div>
    </template>

    <template #header-action>
      <div class="flex items-center gap-2">
        <USelect v-model="selectedTxType" :options="txTypeOptions" option-attribute="label" value-attribute="value"
          size="xs" class="w-32" />
        <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-refresh-cw" :loading="loading"
          @click="emit('refresh')" />
      </div>
    </template>

    <!-- Phase 7.2.1: Discovery Status Banner -->
    <div v-if="loading" class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4 -mt-2">
      <div class="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
        <UIcon name="i-lucide-loader-2" class="animate-spin w-4 h-4" />
        <span>Discovering signers on the network...</span>
      </div>
    </div>

    <!-- Phase 7.2.1: DHT Initializing Banner -->
    <div v-else-if="!p2pStore.dhtReady && p2pStore.connected"
      class="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg mb-4 -mt-2">
      <div class="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
        <UIcon name="i-lucide-radio" class="w-4 h-4" />
        <span>DHT initializing - discovery will start shortly...</span>
      </div>
    </div>

    <!-- Signers List -->
    <div v-if="filteredSigners.length" class="divide-y divide-default -mx-4">
      <CommonSignerCard v-for="signer in filteredSigners" :key="signer.id" :signer="signer" :primary-action="{
        label: 'Request',
        icon: 'i-lucide-pen-tool',
        event: 'request',
      }" variant="list" @request="emit('requestSign', signer)" @save-contact="emit('saveContact', signer)"
        @view-details="emit('viewDetails', signer)" />
    </div>

    <!-- Loading (full state when no signers yet) -->
    <UiAppLoadingState v-else-if="loading" message="Discovering signers..." />

    <!-- Empty -->
    <UiAppEmptyState v-else icon="i-lucide-users" title="No signers found" :description="emptyStateDescription">
      <template #actions>
        <div class="flex gap-2">
          <UButton color="neutral" variant="soft" icon="i-lucide-refresh-cw" size="sm" @click="emit('refresh')">
            Refresh
          </UButton>
          <UButton color="primary" variant="soft" icon="i-lucide-user-plus" size="sm" to="/settings/advertise">
            Become a Signer
          </UButton>
        </div>
      </template>
    </UiAppEmptyState>
  </UiAppCard>
</template>
